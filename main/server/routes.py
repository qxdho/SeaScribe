# SeaScribe API route handlers
import base64
import binascii
import json
import os
import re
import secrets
import threading
from urllib.parse import unquote

from .config import (
    ROOT, DATA, PICKER_DIR, ENGLISH_DIR, AVATAR_DIR, ROSTER_DIR,
    USERS_PATH, SESSIONS_PATH, MAX_BODY_API,
)
from .auth import (
    _read_json, _write_json, load_users, save_users,
    find_user_by_name, find_user_by_displayname, new_uid,
    hash_password, new_salt, generate_token,
    clean_expired_sessions, make_session,
    check_ratelimit, record_fail, clear_fails,
    require_auth, require_role,
    get_client_ip,
    get_session, list_sessions_by_uid, delete_session,
    append_log, get_logs,
)

_safe_filename = os.path.basename
# ── name→avatar lookup cache ──
_name_avatar_cache = {}
_name_avatar_cache_users_mtime = 0
_avatar_cache_lock = threading.Lock()

# ── Config file map (shared between GET and POST handlers) ──
_CONFIG_MAP = {
    'main': 'config/config.js', 'chemistry': 'config/chemistry/config.js',
    'english': 'config/english/config.js', 'picker': 'config/picker/config.js',
    'enword': 'config/enword/config.js',
}

def _build_avatar_cache():
    global _name_avatar_cache, _name_avatar_cache_users_mtime
    try:
        mtime = os.path.getmtime(USERS_PATH)
    except OSError:
        mtime = 0
    with _avatar_cache_lock:
        if _name_avatar_cache and mtime == _name_avatar_cache_users_mtime:
            return
        _name_avatar_cache = {}
        users = load_users()
        for u in users.get('by_id', {}).values():
            dn = u.get('displayName') or u.get('nickname') or u.get('username', '')
            if dn:
                _name_avatar_cache[dn] = u.get('avatar', '')
        _name_avatar_cache_users_mtime = mtime




# ═══════════════════════════════════════════
#  GET handlers
# ═══════════════════════════════════════════

def handle_get_files(path, handler, params=None):
    """GET /api/<name>-files"""
    m = re.match(r'^/api/(\w+)-files$', path)
    if not m:
        return False
    name = m.group(1)
    # Restrict to known subdirectories
    allowed = {'chemistry', 'english', 'enword'}
    if name not in allowed:
        handler.send_json(403, {'error': '未知目录'})
        return True
    dirpath = os.path.join(DATA, name)
    files = []
    if os.path.isdir(dirpath):
        for f in sorted(os.listdir(dirpath)):
            if os.path.isfile(os.path.join(dirpath, f)):
                files.append({'name': f, 'url': f'/data/{name}/{f}'})
    handler.send_json(200, files)
    return True


def handle_roster_classes(path, handler, params=None):
    """GET /api/roster/classes"""
    if path != '/api/roster/classes':
        return False
    classes = []
    if os.path.isdir(ROSTER_DIR):
        for f in os.listdir(ROSTER_DIR):
            if f.endswith('.json'):
                classes.append(f[:-5])
    handler.send_json(200, sorted(classes))
    return True


def handle_roster_get(path, handler, params=None):
    """GET /api/roster/<class>"""
    m = re.match(r'^/api/roster/(.+)$', path)
    if not m:
        return False
    cls = unquote(m.group(1))
    fname = os.path.join(ROSTER_DIR, _safe_filename(cls) + '.json')
    # Ensure path stays within ROSTER_DIR
    if os.path.realpath(fname) != os.path.realpath(os.path.join(ROSTER_DIR, os.path.basename(fname))):
        handler.send_json(403, {'error': '非法路径'})
        return True
    handler.send_json(200, _read_json(fname))
    return True


def handle_user_last_pick(path, handler, params=None):
    if path != '/api/user/last-pick':
        return False
    user = require_auth(handler)
    if not user: return True
    dn = user.get('displayName', '')
    if not dn:
        handler.send_json(200, {'time': None})
        return True
    latest = None
    if os.path.isdir(PICKER_DIR):
        for f in os.listdir(PICKER_DIR):
            if f.endswith('.json'):
                ts = _read_json(os.path.join(PICKER_DIR, f))
                if dn in ts:
                    t = ts[dn]
                    if not latest or t > latest:
                        latest = t
    handler.send_json(200, {'time': latest})
    return True


def handle_user_class(path, handler, params=None):
    if path != '/api/user/class':
        return False
    user = require_auth(handler)
    if not user: return True
    dn = user.get('displayName', '')
    if not dn:
        handler.send_json(200, {'className': None})
        return True
    className = None
    if os.path.isdir(ROSTER_DIR):
        for f in os.listdir(ROSTER_DIR):
            if f.endswith('.json'):
                rd = _read_json(os.path.join(ROSTER_DIR, f))
                for s in rd:
                    if s.get('name', '') == dn:
                        className = f[:-5]
                        break
            if className:
                break
    handler.send_json(200, {'className': className})
    return True


def handle_admin_roster(path, handler, params=None):
    if path != '/api/admin/roster':
        return False
    user = require_role(handler, 'admin')
    if not user: return True
    result = {}
    if os.path.isdir(ROSTER_DIR):
        for f in os.listdir(ROSTER_DIR):
            if f.endswith('.json'):
                result[f[:-5]] = _read_json(os.path.join(ROSTER_DIR, f))
    handler.send_json(200, result)
    return True


def handle_user_signatures(path, handler, params):
    if path != '/api/user-signatures':
        return False
    names_str = params.get('names', [''])[0]
    if not names_str:
        handler.send_json(200, {})
        return True
    names = [n.strip() for n in names_str.split(',') if n.strip()]
    users = load_users()
    result = {}
    for u in users.get('by_id', {}).values():
        dn = u.get('displayName', '')
        if dn and dn in names:
            result[dn] = u.get('signature', '')
    for n in names:
        if n not in result:
            result[n] = ''
    handler.send_json(200, result)
    return True


def handle_picker_timestamps_get(path, handler, params):
    if path != '/api/picker-timestamps':
        return False
    list_name = params.get('list', [None])[0]
    if not list_name:
        handler.send_error(400, 'Missing list param')
        return True
    safe = _safe_filename(list_name.replace('.csv', '') + '.json')
    handler.send_json(200, _read_json(os.path.join(PICKER_DIR, safe)))
    return True


def handle_admin_session(path, handler, params=None):
    if path != '/api/admin/session':
        return False
    user = require_auth(handler)
    if not user: return True
    handler.send_json(200, {
        'username': user['username'], 'uid': user.get('uid', ''),
        'nickname': user.get('nickname', ''), 'displayName': user.get('displayName', ''),
        'signature': user.get('signature', ''),
        'avatar': user.get('avatar', ''), 'role': user.get('role', 'student'),
    })
    return True


def handle_admin_users_get(path, handler, params=None):
    if path != '/api/admin/users':
        return False
    user = require_role(handler, 'admin')
    if not user: return True
    users = load_users()
    result = []
    for uid, u in users.get('by_id', {}).items():
        result.append({
            'uid': uid, 'username': u.get('username', ''),
            'nickname': u.get('nickname', ''), 'displayName': u.get('displayName', ''),
            'signature': u.get('signature', ''),
            'avatar': u.get('avatar', ''), 'role': u.get('role', 'student'),
        })
    handler.send_json(200, result)
    return True


def handle_admin_user_get(path, handler, params=None):
    m = re.match(r'^/api/admin/users/([\w-]+)$', path)
    if not m:
        return False
    user = require_role(handler, 'admin')
    if not user: return True
    uid, u = find_user_by_name(m.group(1))
    if not u:
        handler.send_json(404, {'error': '用户不存在'})
        return True
    handler.send_json(200, {
        'uid': uid, 'username': u.get('username', ''),
        'nickname': u.get('nickname', ''), 'displayName': u.get('displayName', ''),
        'signature': u.get('signature', ''),
        'avatar': u.get('avatar', ''), 'role': u.get('role', 'student'),
    })
    return True


def handle_admin_avatar(path, handler, params):
    if path != '/api/admin/user-avatar':
        return False
    name = params.get('name', [None])[0]
    if not name:
        handler.send_error(400, 'Missing name param')
        return True
    _build_avatar_cache()
    avatar_url = _name_avatar_cache.get(name, '')
    if avatar_url:
        from urllib.parse import urlparse
        parsed = urlparse(avatar_url)
        if parsed.path:
            avatar_path = os.path.join(AVATAR_DIR, os.path.basename(parsed.path))
            if os.path.isfile(avatar_path):
                with open(avatar_path, 'rb') as f:
                    data = f.read()
                ext = os.path.splitext(avatar_path)[1].lower()
                mime_map = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp"}
                mime = mime_map.get(ext, "image/png")
                avatar_url = "data:" + mime + ";base64," + base64.b64encode(data).decode()
    handler.send_json(200, {'name': name, 'avatar': avatar_url})
    return True


def _read_text_file(filepath):
    """Read a text file, trying UTF-8 first then UTF-16 (Windows Unicode)."""
    with open(filepath, 'rb') as f:
        raw = f.read()
    for enc in ('utf-8-sig', 'utf-16'):
        try:
            return raw.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
    return raw.decode('utf-8', errors='replace')


def handle_admin_config_get(path, handler, params=None):
    m = re.match(r'^/api/admin/config/(\w+)$', path)
    if not m:
        return False
    user = require_role(handler, 'admin', 'teacher')
    if not user: return True
    if m.group(1) not in _CONFIG_MAP:
        handler.send_json(404, {'error': '未知配置'})
        return True
    filepath = os.path.join(ROOT, _CONFIG_MAP[m.group(1)])
    if not os.path.isfile(filepath):
        handler.send_json(404, {'error': '配置文件不存在'})
        return True
    content = _read_text_file(filepath)
    handler.send_json(200, {'name': m.group(1), 'content': content})
    return True


def handle_admin_records(path, handler, params=None):
    if path != '/api/admin/records':
        return False
    user = require_role(handler, "admin", "teacher")
    if not user: return True
    if user.get('role') not in ('admin', 'teacher'):
        handler.send_json(200, [])
        return True
    records = []
    if os.path.isdir(PICKER_DIR):
        for f in os.listdir(PICKER_DIR):
            if f.endswith('.json'):
                ts = _read_json(os.path.join(PICKER_DIR, f))
                for name, t in ts.items():
                    records.append({'className': f[:-5], 'name': name, 'time': t})
    records.sort(key=lambda r: r.get('time', ''), reverse=True)
    handler.send_json(200, records)
    return True


def handle_admin_english_files(path, handler, params=None):
    if path != '/api/admin/english-files':
        return False
    user = require_role(handler, 'admin', 'teacher')
    if not user: return True
    files = []
    if os.path.isdir(ENGLISH_DIR):
        for f in sorted(os.listdir(ENGLISH_DIR)):
            fp = os.path.join(ENGLISH_DIR, f)
            if os.path.isfile(fp):
                files.append({
                    'name': f, 'size': os.path.getsize(fp),
                    'url': f'/data/english/{f}',
                })
    handler.send_json(200, files)
    return True


# ═══════════════════════════════════════════
#  POST handlers
# ═══════════════════════════════════════════

def _parse_json_body(handler, body):
    try:
        return json.loads(body.decode('utf-8'))
    except Exception:
        handler.send_json(400, {'error': 'JSON 解析失败'})
        return None


def handle_admin_register(path, body, handler):
    if path != '/api/admin/register':
        return False
    p = _parse_json_body(handler, body)
    if p is None: return True

    username = p.get('username', '').strip()
    nickname = (p.get('nickname', '') or '')[:100]
    pw = p.get('password', '')

    if not username or not pw:
        handler.send_json(400, {'error': '用户名和密码不能为空'})
        return True
    if not re.match(r'^[a-zA-Z][a-zA-Z0-9_]{2,19}$', username):
        handler.send_json(400, {'error': '用户名需字母开头，3-20位'})
        return True
    if find_user_by_name(username)[1]:
        handler.send_json(400, {'error': '用户名已存在'})
        return True

    uid = new_uid()
    salt = new_salt()
    users = load_users()
    users['by_id'][uid] = {
        'username': username,
        'passwordHash': hash_password(pw, salt),
        'salt': salt,
        'nickname': nickname,
        'displayName': '',
        'signature': '',
        'avatar': '',
        'role': 'student',
    }
    users['by_name'][username] = uid
    save_users(users)
    token = generate_token()
    sessions = _read_json(SESSIONS_PATH)
    sessions[token] = make_session(username, uid, nickname, '', '', 'student', '')
    _write_json(SESSIONS_PATH, sessions)
    handler.send_response(200)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.set_session_cookie(token)
    handler.end_headers()
    handler.wfile.write(json.dumps({
        'token': token,
        'user': {'username': username, 'uid': uid, 'nickname': nickname,
                 'displayName': '', 'avatar': '', 'role': 'student', 'signature': ''}
    }, ensure_ascii=False).encode())
    return True


def handle_admin_login(path, body, handler):
    if path != '/api/admin/login':
        return False
    client_ip = get_client_ip(handler)
    if not check_ratelimit(client_ip):
        handler.send_json(429, {'error': '尝试次数过多，请60秒后再试'})
        return True

    p = _parse_json_body(handler, body)
    if p is None: return True

    username = p.get('username', '').strip()
    pw = p.get('password', '')
    if not username or not pw:
        record_fail(client_ip)
        handler.send_json(400, {'error': '请输入用户名和密码'})
        return True

    uid, u = find_user_by_name(username)
    if not u or hash_password(pw, u.get('salt', '')) != u.get('passwordHash', ''):
        record_fail(client_ip)
        handler.send_json(400, {'error': '用户名或密码错误'})
        return True

    clear_fails(client_ip)
    token = generate_token()
    clean_expired_sessions()
    sessions = _read_json(SESSIONS_PATH)
    ua = handler.headers.get('User-Agent', '')
    sessions[token] = make_session(
        u['username'], uid, u.get('nickname', ''), u.get('displayName', ''),
        u.get('avatar', ''), u.get('role', 'student'), u.get('signature', ''),
        ip=client_ip, user_agent=ua)
    _write_json(SESSIONS_PATH, sessions)
    append_log('login', '登录成功', handler, sessions[token])
    handler.send_response(200)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.set_session_cookie(token)
    handler.end_headers()
    resp = {'token': token, 'user': {k: v for k, v in sessions[token].items() if k not in ('expires_at', 'ip', 'user_agent')}}
    handler.wfile.write(json.dumps(resp, ensure_ascii=False).encode())
    return True


def handle_admin_logout(path, body, handler):
    if path != '/api/admin/logout':
        return False
    from .auth import _extract_token
    token = _extract_token(handler)
    if token:
        sessions = _read_json(SESSIONS_PATH)
        sess = sessions.pop(token, None)
        _write_json(SESSIONS_PATH, sessions)
        if sess:
            append_log('logout', '退出登录', handler, sess)
    # Clear cookie on client
    handler.send_response(200)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Set-Cookie',
        'seascribe_token=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0')
    handler.end_headers()
    handler.wfile.write(json.dumps({'ok': True}, ensure_ascii=False).encode())
    return True


def handle_admin_profile(path, body, handler):
    if path != '/api/admin/profile':
        return False
    user = require_auth(handler)
    if not user: return True
    p = _parse_json_body(handler, body)
    if p is None: return True

    old_uid = user.get('uid', '')
    old_username = user['username']
    users = load_users()
    u = users['by_id'].get(old_uid, {})
    if not u:
        handler.send_json(400, {'error': '用户不存在'})
        return True

    new_name = p.get('username', '').strip()
    if new_name and new_name != old_username:
        if find_user_by_name(new_name)[1]:
            handler.send_json(400, {'error': '用户名已存在'})
            return True
        del users['by_name'][old_username]
        users['by_name'][new_name] = old_uid
        old_username = new_name
        u['username'] = new_name

    if 'nickname' in p: u['nickname'] = (p['nickname'] or '')[:100]
    if 'displayName' in p:
        dn = (p['displayName'] or '')[:100]
        if dn:
            duid, _ = find_user_by_displayname(dn)
            if duid and duid != old_uid:
                handler.send_json(400, {'error': '该姓名已被其他用户绑定'})
                return True
        u['displayName'] = dn
    if 'signature' in p: u['signature'] = (p['signature'] or '')[:200]
    if 'avatar' in p: u['avatar'] = (p['avatar'] or '')[:2000]

    if p.get('oldPassword') and p.get('newPassword'):
        if hash_password(p['oldPassword'], u.get('salt', '')) != u.get('passwordHash', ''):
            handler.send_json(400, {'error': '旧密码错误'})
            return True
        u['salt'] = new_salt()
        u['passwordHash'] = hash_password(p['newPassword'], u['salt'])

    save_users(users)
    sessions = _read_json(SESSIONS_PATH)
    for t, s in sessions.items():
        if s.get('uid') == old_uid:
            s['username'] = old_username
            s['nickname'] = u.get('nickname', '')
            s['displayName'] = u.get('displayName', '')
            s['signature'] = u.get('signature', '')
            s['avatar'] = u.get('avatar', '')
    _write_json(SESSIONS_PATH, sessions)

    # Sync signature to roster
    dn = u.get('displayName', '')
    if dn and 'signature' in p:
        sig = (p['signature'] or '')[:200]
        if os.path.isdir(ROSTER_DIR):
            for f in os.listdir(ROSTER_DIR):
                if f.endswith('.json'):
                    fp = os.path.join(ROSTER_DIR, f)
                    rd = _read_json(fp)
                    up = False
                    for s in rd:
                        if s.get('name', '') == dn:
                            s['signature'] = sig; up = True
                    if up: _write_json(fp, rd)

    handler.send_json(200, {
        'ok': True, 'uid': old_uid, 'username': old_username,
        'nickname': u.get('nickname', ''), 'displayName': u.get('displayName', ''),
        'signature': u.get('signature', ''),
        'avatar': u.get('avatar', ''), 'role': u.get('role', 'student'),
    })
    return True


def handle_admin_user_create(path, body, handler):
    if path != '/api/admin/users':
        return False
    user = require_role(handler, 'admin')
    if not user: return True
    p = _parse_json_body(handler, body)
    if p is None: return True

    nu = p.get('username', '').strip()
    pw = p.get('password', '')
    if not nu:
        handler.send_json(400, {'error': '用户名不能为空'})
        return True
    if not pw or len(pw) < 6:
        handler.send_json(400, {'error': '密码不能为空且至少6位'})
        return True
    if not re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', nu):
        handler.send_json(400, {'error': '用户名需英文字母开头'})
        return True
    if find_user_by_name(nu)[1]:
        handler.send_json(400, {'error': '用户名已存在'})
        return True

    dn = (p.get('displayName', '') or '')[:100]
    if dn and find_user_by_displayname(dn)[1]:
        handler.send_json(400, {'error': '该姓名已被其他用户绑定'})
        return True

    uid = new_uid()
    salt = new_salt()
    users = load_users()
    users['by_id'][uid] = {
        'username': nu,
        'passwordHash': hash_password(pw, salt),
        'salt': salt,
        'nickname': (p.get('nickname', '') or '')[:100],
        'displayName': dn,
        'signature': (p.get('signature', '') or '')[:200],
        'avatar': (p.get('avatar', '') or '')[:2000],
        'role': p.get('role', 'student'),
    }
    users['by_name'][nu] = uid
    save_users(users)
    append_log('profile_update', '更新资料', handler, user)
    handler.send_json(200, {'ok': True, 'uid': uid})
    return True


def handle_admin_user_modify(path, body, handler):
    m = re.match(r'^/api/admin/users/([\w-]+)(/delete)?$', path)
    if not m:
        return False
    user = require_role(handler, 'admin')
    if not user: return True

    target = m.group(1)
    is_delete = bool(m.group(2))
    users = load_users()
    uid = users.get('by_name', {}).get(target)
    if not uid or uid not in users.get('by_id', {}):
        handler.send_json(404, {'error': '用户不存在'})
        return True

    u = users['by_id'][uid]
    if is_delete:
        if uid == user.get('uid'):
            handler.send_json(400, {'error': '不能删除自己'})
            return True
        del users['by_id'][uid]
        del users['by_name'][target]
        save_users(users)
        append_log('profile_update', '更新资料', handler, user)
        handler.send_json(200, {'ok': True})
        return True
    p = _parse_json_body(handler, body)
    if p is None: return True
    if 'nickname' in p: u['nickname'] = (p['nickname'] or '')[:100]
    if 'displayName' in p:
        dn = (p['displayName'] or '')[:100]
        if dn:
            duid, _ = find_user_by_displayname(dn)
            if duid and duid != uid:
                handler.send_json(400, {'error': '该姓名已被其他用户绑定'})
                return True
        u['displayName'] = dn
    if 'signature' in p: u['signature'] = (p['signature'] or '')[:200]
    if 'avatar' in p: u['avatar'] = (p['avatar'] or '')[:2000]
    if 'role' in p:
        if uid == user.get('uid') and p['role'] != user.get('role'):
            handler.send_json(400, {'error': '不能修改自己的角色'})
            return True
        u['role'] = p['role']
    if 'password' in p and p['password']:
        u['salt'] = new_salt()
        u['passwordHash'] = hash_password(p['password'], u['salt'])

    save_users(users)
    append_log('profile_update', '更新资料', handler, user)
    handler.send_json(200, {'ok': True})
    return True


def handle_admin_config_save(path, body, handler):
    m = re.match(r'^/api/admin/config/(\w+)$', path)
    if not m:
        return False
    user = require_role(handler, 'admin', 'teacher')
    if not user: return True
    if m.group(1) not in _CONFIG_MAP:
        handler.send_json(404, {'error': '未知配置'})
        return True
    p = _parse_json_body(handler, body)
    if p is None: return True
    filepath = os.path.join(ROOT, _CONFIG_MAP[m.group(1)])
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(p.get('content', ''))
    handler.send_json(200, {'ok': True})
    return True


def handle_roster_save(path, body, handler):
    if path != '/api/admin/roster':
        return False
    user = require_role(handler, 'admin')
    if not user: return True
    p = _parse_json_body(handler, body)
    if p is None: return True
    # Reject empty payload to prevent accidental mass deletion
    if not p or not isinstance(p, dict):
        handler.send_json(400, {'error': '提交数据为空'})
        return True
    for f in os.listdir(ROSTER_DIR):
        if f.endswith('.json') and f[:-5] not in p:
            os.remove(os.path.join(ROSTER_DIR, f))
    for cls, students in p.items():
        fname = os.path.join(ROSTER_DIR, _safe_filename(cls) + '.json')
        _write_json(fname, students)
    users = load_users()
    for cls, students in p.items():
        for s in students:
            dn = (s.get('name', '') or '').strip()
            sig = (s.get('signature', '') or '')[:200]
            if dn:
                for uid, u in users.get('by_id', {}).items():
                    if u.get('displayName', '') == dn and u.get('role') == 'student':
                        u['signature'] = sig
    save_users(users)
    append_log('profile_update', '更新资料', handler, user)
    handler.send_json(200, {'ok': True})
    return True


def handle_picker_timestamps_post(path, body, handler):
    if path != '/api/picker-timestamps':
        return False
    p = _parse_json_body(handler, body)
    if p is None: return True
    list_name = p.get('list', '')
    if not list_name:
        handler.send_json(400, {'error': '缺少名单名称'})
        return True
    # Validate list_name — only safe characters
    if not re.match(r'^[\w\u4e00-\u9fff\- ]+$', list_name):
        handler.send_json(400, {'error': '名单名称不合法'})
        return True
    safe = _safe_filename(list_name.replace('.csv', '') + '.json')
    _write_json(os.path.join(PICKER_DIR, safe), p.get('data', {}))
    handler.send_json(200, {'ok': True})
    return True


def handle_picker_timestamps_delete(path, body, handler):
    """POST /api/admin/picker-timestamps/delete"""
    if path != '/api/admin/picker-timestamps/delete':
        return False
    user = require_role(handler, 'admin')
    if not user: return True
    p = _parse_json_body(handler, body)
    if p is None: return True
    list_name = p.get('list', '')
    name = p.get('name', '')
    if not list_name or not name:
        handler.send_json(400, {'error': '缺少参数'})
        return True
    safe = _safe_filename(list_name.replace('.csv', '') + '.json')
    filepath = os.path.join(PICKER_DIR, safe)
    data = _read_json(filepath)
    if name in data:
        del data[name]
        _write_json(filepath, data)
    handler.send_json(200, {'ok': True})
    return True


def handle_picker_timestamps_clear(path, body, handler):
    """POST /api/admin/picker-timestamps/clear"""
    if path != '/api/admin/picker-timestamps/clear':
        return False
    user = require_role(handler, 'admin')
    if not user: return True
    p = _parse_json_body(handler, body)
    if p is None: return True
    list_name = p.get('list', '')
    if not list_name:
        handler.send_json(400, {'error': '缺少名单名称'})
        return True
    safe = _safe_filename(list_name.replace('.csv', '') + '.json')
    _write_json(os.path.join(PICKER_DIR, safe), {})
    handler.send_json(200, {'ok': True})
    return True


def handle_english_upload(path, body, handler):
    if path != '/api/admin/upload/english':
        return False
    user = require_role(handler, 'admin', 'teacher')
    if not user: return True
    p = _parse_json_body(handler, body)
    if p is None: return True
    filename = _safe_filename(p.get('filename', '').strip())
    content_b64 = p.get('content', '')
    if not filename or not content_b64:
        handler.send_json(400, {'error': '缺少文件名或文件内容'})
        return True
    if not re.match(r'^[\w\u4e00-\u9fff\-. ()()]+\.(xlsx|csv|xls)$', filename, re.I):
        handler.send_json(400, {'error': '文件名不合法'})
        return True
    os.makedirs(ENGLISH_DIR, exist_ok=True)
    filepath = os.path.join(ENGLISH_DIR, filename)
    try:
        data = base64.b64decode(content_b64)
    except (binascii.Error, ValueError):
        handler.send_json(400, {'error': '文件内容非法的 Base64 编码'})
        return True
    with open(filepath, 'wb') as f:
        f.write(data)
    handler.send_json(200, {'ok': True})
    return True


def handle_english_delete(path, body, handler):
    if path != '/api/admin/delete-file/english':
        return False
    user = require_role(handler, 'admin', 'teacher')
    if not user: return True
    p = _parse_json_body(handler, body)
    if p is None: return True
    filename = _safe_filename(p.get('filename', '').strip())
    if not filename:
        handler.send_json(400, {'error': '缺少文件名'})
        return True
    filepath = os.path.join(ENGLISH_DIR, filename)
    if os.path.isfile(filepath):
        os.remove(filepath)
    handler.send_json(200, {'ok': True})
    return True


AVATAR_MAX_SIZE = 512   # max width/height after resize
AVATAR_JPEG_QUALITY = 80

def _compress_avatar(raw_data, ext):
    """Resize + compress avatar image. Always outputs JPEG for size efficiency."""
    from io import BytesIO
    from PIL import Image
    try:
        img = Image.open(BytesIO(raw_data))
    except Exception:
        return None
    # Convert RGBA/transparent to white-background RGB
    if img.mode in ('RGBA', 'LA', 'P', 'PA'):
        if img.mode == 'P':
            img = img.convert('RGBA')
        bg = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'RGBA':
            bg.paste(img, mask=img.split()[3])
        elif img.mode == 'LA':
            bg.paste(img, mask=img.split()[1])
        else:
            bg.paste(img)
        img = bg
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    # Resize if larger than max
    w, h = img.size
    if w > AVATAR_MAX_SIZE or h > AVATAR_MAX_SIZE:
        ratio = min(AVATAR_MAX_SIZE / w, AVATAR_MAX_SIZE / h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    out = BytesIO()
    img.save(out, format='JPEG', quality=AVATAR_JPEG_QUALITY, optimize=True)
    return out.getvalue()


def handle_avatar_upload(path, body, handler):
    if path != '/api/admin/upload/avatar':
        return False
    # 任何已登录用户（含学生）都可上传自己的头像；文件名以 uid 为前缀，
    # 只能覆盖本人的旧头像，不存在越权
    user = require_auth(handler)
    if not user: return True
    p = _parse_json_body(handler, body)
    if p is None: return True
    content_b64 = p.get('content', '')
    filename = p.get('filename', 'avatar.png')
    if not content_b64:
        handler.send_json(400, {'error': '缺少文件内容'})
        return True
    ext = os.path.splitext(_safe_filename(filename))[1].lower()
    if ext not in ('.png', '.jpg', '.jpeg', '.gif', '.webp'):
        ext = '.png'
    safe_name = user.get('uid', 'anon') + '_' + secrets.token_hex(4) + '.jpg'
    os.makedirs(AVATAR_DIR, exist_ok=True)
    filepath = os.path.join(AVATAR_DIR, safe_name)
    try:
        raw_data = base64.b64decode(content_b64)
    except (binascii.Error, ValueError):
        handler.send_json(400, {'error': '头像内容非法的 Base64 编码'})
        return True
    # Delete user's old avatar file before saving new one
    uid = user.get('uid', '')
    _cleanup_old_avatars(uid)
    # Compress
    compressed = _compress_avatar(raw_data, ext)
    if compressed is None:
        handler.send_json(400, {'error': '图片无法处理，请上传有效图片文件'})
        return True
    with open(filepath, 'wb') as f:
        f.write(compressed)
    append_log('avatar_upload', '上传头像', handler, user)
    handler.send_json(200, {'ok': True, 'url': '/admin/_store/avatars/' + safe_name})
    return True


def _cleanup_old_avatars(uid):
    """Remove all avatar files belonging to uid (free orphan files)."""
    if not uid:
        return
    prefix = uid + '_'
    if not os.path.isdir(AVATAR_DIR):
        return
    for f in os.listdir(AVATAR_DIR):
        if f.startswith(prefix) and os.path.isfile(os.path.join(AVATAR_DIR, f)):
            os.remove(os.path.join(AVATAR_DIR, f))


# ═══════════════════════════════════════════


def handle_admin_sessions(path, handler, params=None):
    if path != '/api/admin/sessions':
        return False
    user = require_auth(handler)
    if not user: return True
    sessions = list_sessions_by_uid(user['uid'])
    handler.send_json(200, sessions)
    return True


def handle_admin_sessions_delete(path, body, handler):
    if path != '/api/admin/sessions':
        return False
    user = require_auth(handler)
    if not user: return True
    p = _parse_json_body(handler, body)
    if p is None: return True
    token_to_kill = p.get('token', '')
    if not token_to_kill:
        handler.send_json(400, {'error': '缺少 token 参数'})
        return True
    # Verify token belongs to current user (unless admin)
    if user.get('role') != 'admin':
        sess_data = get_session(token_to_kill)
        if not sess_data or sess_data.get('uid') != user.get('uid'):
            handler.send_json(403, {'error': '无权删除他人会话'})
            return True
    sess = delete_session(token_to_kill)
    if sess:
        append_log('session_logout', '强制退出会话', handler, user)
    handler.send_json(200, {'ok': True})
    return True


def handle_admin_logs(path, handler, params=None):
    if path != '/api/admin/logs':
        return False
    user = require_auth(handler)
    if not user: return True
    logs = get_logs(200)
    # Non-admin users can only see their own log entries
    if user.get('role') != 'admin':
        logs = [l for l in logs if l.get('uid') == user.get('uid')]
    handler.send_json(200, logs)
    return True


#  Handler lists for dispatch
# ═══════════════════════════════════════════


def handle_avatar_file(path, handler, params=None):
    """Serve avatar files from AVATAR_DIR (works with external data dir)."""
    m = re.match(r"^/admin/_store/avatars/(.+)$", path)
    if not m:
        return False
    safe = _safe_filename(m.group(1))
    filepath = os.path.join(AVATAR_DIR, safe)
    if not os.path.isfile(filepath):
        return False
    try:
        with open(filepath, 'rb') as f:
            data = f.read()
        ext = os.path.splitext(filepath)[1].lower()
        mime_map = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                     ".gif": "image/gif", ".webp": "image/webp"}
        ct = mime_map.get(ext, "application/octet-stream")
        handler.send_response(200)
        handler.send_header("Content-Type", ct)
        handler.send_header("Cache-Control", "public, max-age=86400")
        handler.end_headers()
        handler.wfile.write(data)
    except Exception:
        handler.send_error(404, "Not Found")
    return True


GET_HANDLERS = [
    handle_get_files,
    handle_roster_classes,
    handle_roster_get,
    handle_user_last_pick,
    handle_user_class,
    handle_admin_roster,
    handle_user_signatures,
    handle_picker_timestamps_get,
    handle_admin_session,
    handle_admin_users_get,
    handle_admin_user_get,
    handle_admin_avatar,
    handle_avatar_file,
    handle_admin_sessions,
    handle_admin_logs,
    handle_admin_config_get,
    handle_admin_records,
    handle_admin_english_files,
]

POST_HANDLERS = [
    handle_admin_register,
    handle_admin_login,
    handle_admin_logout,
    handle_admin_profile,
    handle_admin_user_create,
    handle_admin_user_modify,
    handle_admin_config_save,
    handle_roster_save,
    handle_picker_timestamps_post,
    handle_picker_timestamps_delete,
    handle_picker_timestamps_clear,
    handle_english_upload,
    handle_english_delete,
    handle_admin_sessions_delete,
    handle_avatar_upload,
]
