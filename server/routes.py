# SeaScribe API route handlers
import base64
import json
import os
import re
import secrets
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
)

_safe_filename = os.path.basename


# ═══════════════════════════════════════════
#  GET handlers
# ═══════════════════════════════════════════

def handle_get_files(path, handler, params=None):
    """GET /api/<name>-files"""
    m = re.match(r'^/api/(\w+)-files$', path)
    if not m:
        return False
    name = m.group(1)
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
    m = re.match(r'^/api/admin/users/(\w+)$', path)
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
    user = require_auth(handler)
    if not user: return True
    name = params.get('name', [None])[0]
    if not name:
        handler.send_error(400, 'Missing name param')
        return True
    users = load_users()
    for u in users.get('by_id', {}).values():
        if u.get('displayName', u.get('nickname', u.get('username', ''))) == name:
            handler.send_json(200, {'name': name, 'avatar': u.get('avatar', '')})
            return True
    handler.send_json(200, {'name': name, 'avatar': ''})
    return True


def handle_admin_config_get(path, handler, params=None):
    m = re.match(r'^/api/admin/config/(\w+)$', path)
    if not m:
        return False
    user = require_role(handler, 'admin', 'teacher')
    if not user: return True
    config_map = {
        'main': 'config/config.js', 'chemistry': 'config/chemistry/config.js',
        'english': 'config/english/config.js', 'picker': 'config/picker/config.js',
    }
    if m.group(1) not in config_map:
        handler.send_json(404, {'error': '未知配置'})
        return True
    filepath = os.path.join(ROOT, config_map[m.group(1)])
    if not os.path.isfile(filepath):
        handler.send_json(404, {'error': '配置文件不存在'})
        return True
    with open(filepath, 'r', encoding='utf-8') as f:
        handler.send_json(200, {'name': m.group(1), 'content': f.read()})
    return True


def handle_admin_records(path, handler, params=None):
    if path != '/api/admin/records':
        return False
    user = require_auth(handler)
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
    sessions = {token: make_session(username, uid, nickname, '', '', 'student', '')}
    from .config import SESSIONS_PATH as sp
    _write_json(sp, sessions)
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
    client_ip = handler.client_address[0]
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
    sessions = {k: v for k, v in sessions.items() if v.get('uid') != uid}
    sessions[token] = make_session(
        u['username'], uid, u.get('nickname', ''), u.get('displayName', ''),
        u.get('avatar', ''), u.get('role', 'student'), u.get('signature', ''))
    _write_json(SESSIONS_PATH, sessions)
    handler.send_response(200)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.set_session_cookie(token)
    handler.end_headers()
    resp = {'token': token, 'user': {k: v for k, v in sessions[token].items() if k != 'expires_at'}}
    handler.wfile.write(json.dumps(resp, ensure_ascii=False).encode())
    return True


def handle_admin_logout(path, body, handler):
    if path != '/api/admin/logout':
        return False
    from .auth import _extract_token
    token = _extract_token(handler)
    if token:
        sessions = _read_json(SESSIONS_PATH)
        sessions.pop(token, None)
        _write_json(SESSIONS_PATH, sessions)
    handler.send_json(200, {'ok': True})
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
    if not nu:
        handler.send_json(400, {'error': '用户名不能为空'})
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
        'passwordHash': hash_password(p.get('password', '123456'), salt),
        'salt': salt,
        'nickname': (p.get('nickname', '') or '')[:100],
        'displayName': dn,
        'signature': (p.get('signature', '') or '')[:200],
        'avatar': (p.get('avatar', '') or '')[:2000],
        'role': p.get('role', 'student'),
    }
    users['by_name'][nu] = uid
    save_users(users)
    handler.send_json(200, {'ok': True, 'uid': uid})
    return True


def handle_admin_user_modify(path, body, handler):
    m = re.match(r'^/api/admin/users/(\w+)(/delete)?$', path)
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
    else:
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
    handler.send_json(200, {'ok': True})
    return True


def handle_admin_config_save(path, body, handler):
    m = re.match(r'^/api/admin/config/(\w+)$', path)
    if not m:
        return False
    user = require_role(handler, 'admin', 'teacher')
    if not user: return True
    config_map = {
        'main': 'config/config.js', 'chemistry': 'config/chemistry/config.js',
        'english': 'config/english/config.js', 'picker': 'config/picker/config.js',
    }
    if m.group(1) not in config_map:
        handler.send_json(404, {'error': '未知配置'})
        return True
    p = _parse_json_body(handler, body)
    if p is None: return True
    filepath = os.path.join(ROOT, config_map[m.group(1)])
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
    existing = set()
    if os.path.isdir(ROSTER_DIR):
        for f in os.listdir(ROSTER_DIR):
            if f.endswith('.json'):
                existing.add(f[:-5])
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
    safe = _safe_filename(list_name.replace('.csv', '') + '.json')
    _write_json(os.path.join(PICKER_DIR, safe), p.get('data', {}))
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
    with open(filepath, 'wb') as f:
        f.write(base64.b64decode(content_b64))
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


def handle_avatar_upload(path, body, handler):
    if path != '/api/admin/upload/avatar':
        return False
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
    safe_name = user.get('uid', 'anon') + '_' + secrets.token_hex(4) + ext
    os.makedirs(AVATAR_DIR, exist_ok=True)
    filepath = os.path.join(AVATAR_DIR, safe_name)
    with open(filepath, 'wb') as f:
        f.write(base64.b64decode(content_b64))
    handler.send_json(200, {'ok': True, 'url': '/admin/_store/avatars/' + safe_name})
    return True


# ═══════════════════════════════════════════
#  Handler lists for dispatch
# ═══════════════════════════════════════════

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
    handle_english_upload,
    handle_english_delete,
    handle_avatar_upload,
]
