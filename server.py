"""
SeaScribe 静态服务器 + 插件文件列表 API + 管理后台 API
用法: python server.py 9360
"""
import base64
import hashlib
import http.server
import json
import os
import re
import secrets
import sys
import time
from urllib.parse import urlparse, parse_qs

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9360
ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'data')
PICKER_DIR = os.path.join(DATA, 'picker')
STORE_DIR = os.path.join(ROOT, 'admin', '_store')
ENGLISH_DIR = os.path.join(DATA, 'english')
AVATAR_DIR = os.path.join(STORE_DIR, 'avatars')
USERS_PATH = os.path.join(STORE_DIR, 'users.json')
SESSIONS_PATH = os.path.join(STORE_DIR, 'sessions.json')
MAX_BODY = 60 * 1024 * 1024
MAX_BODY_API = 1 * 1024 * 1024

_TEXT_EXTS = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.csv': 'text/csv', '.md': 'text/markdown', '.svg': 'image/svg+xml',
    '.json': 'application/json',
}


def _read_json(filepath):
    if os.path.isfile(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def _write_json(filepath, data):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def _safe_filename(name):
    return os.path.basename(name)

def _load_users():
    return _read_json(USERS_PATH)

def _save_users(data):
    _write_json(USERS_PATH, data)

def _find_user_by_name(username):
    users = _load_users()
    uid = users.get('by_name', {}).get(username)
    if uid:
        return uid, users['by_id'].get(uid)
    return None, None

def _new_uid():
    return secrets.token_hex(8)

def _hash_password(password, salt):
    return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 600000, dklen=32).hex()

def _new_salt():
    return secrets.token_hex(16)

def _generate_token():
    return secrets.token_hex(32)

def _get_session(token):
    sessions = _read_json(SESSIONS_PATH)
    sess = sessions.get(token)
    if not sess:
        return None
    expires = sess.get('expires_at', 0)
    if expires and time.time() > expires:
        sessions.pop(token, None)
        _write_json(SESSIONS_PATH, sessions)
        return None
    return sess

def _clean_expired_sessions():
    sessions = _read_json(SESSIONS_PATH)
    now = time.time()
    changed = False
    for t in list(sessions.keys()):
        if sessions[t].get('expires_at', 0) and now > sessions[t]['expires_at']:
            del sessions[t]
            changed = True
    if changed:
        _write_json(SESSIONS_PATH, sessions)

def _make_session(username, uid, nickname, avatar, role):
    return {
        'username': username, 'uid': uid, 'nickname': nickname,
        'avatar': avatar, 'role': role,
        'expires_at': int(time.time()) + 4 * 3600,
    }

_LOGIN_FAILS = {}

def _check_ratelimit(ip):
    now = time.time()
    entry = _LOGIN_FAILS.get(ip)
    if entry and entry[0] >= 5 and now - entry[1] < 60:
        return False
    return True

def _record_fail(ip):
    now = time.time()
    entry = _LOGIN_FAILS.get(ip)
    if not entry or now - entry[1] > 60:
        _LOGIN_FAILS[ip] = (1, now)
    else:
        _LOGIN_FAILS[ip] = (entry[0] + 1, entry[1])

def _clear_fails(ip):
    _LOGIN_FAILS.pop(ip, None)

def _require_auth(handler):
    token = None
    cookies = handler.headers.get('Cookie', '')
    for c in cookies.split(';'):
        c = c.strip()
        if c.startswith('seascribe_token='):
            token = c.split('=', 1)[1].strip()
            break
    if not token:
        auth = handler.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            token = auth[7:].strip()
    if not token:
        handler.send_json(401, {'error': '\u672a\u767b\u5f55'})
        return None
    user = _get_session(token)
    if not user:
        handler.send_json(401, {'error': '\u4f1a\u8bdd\u5df2\u8fc7\u671f'})
        return None
    return user

def _require_role(handler, *roles):
    user = _require_auth(handler)
    if not user:
        return None
    if user.get('role') not in roles:
        handler.send_json(403, {'error': '\u65e0\u6743\u9650'})
        return None
    return user


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        **{k: v + '; charset=utf-8' for k, v in _TEXT_EXTS.items()}
    }

    def send_json(self, status, data):
        try:
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode())
        except (ConnectionAbortedError, BrokenPipeError, ConnectionResetError):
            pass

    def read_body(self, max_size=MAX_BODY_API):
        cl = int(self.headers.get('Content-Length', 0))
        if cl > max_size:
            self.send_json(413, {'error': '\u8bf7\u6c42\u4f53\u8fc7\u5927'})
            return None
        return self.rfile.read(cl) if cl > 0 else b''

    def set_session_cookie(self, token):
        self.send_header('Set-Cookie',
            f'seascribe_token={token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=14400')

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path.startswith('/admin/_store/') and not path.startswith('/admin/_store/avatars/'):
            self.send_error(403, 'Forbidden')
            return

        # /favicon.ico → /main/logo.png
        if path == '/favicon.ico':
            self.send_response(301)
            self.send_header('Location', '/main/logo.png')
            self.end_headers()
            return

        m = re.match(r'^/api/(\w+)-files$', path)
        if m:
            name = m.group(1)
            dirpath = os.path.join(DATA, name)
            files = []
            if os.path.isdir(dirpath):
                for f in sorted(os.listdir(dirpath)):
                    if os.path.isfile(os.path.join(dirpath, f)):
                        files.append({'name': f, 'url': f'/data/{name}/{f}'})
            self.send_json(200, files)
            return

        if path == '/api/picker-timestamps':
            list_name = params.get('list', [None])[0]
            if not list_name:
                self.send_error(400, 'Missing list param')
                return
            safe = _safe_filename(list_name.replace('.csv', '') + '.json')
            self.send_json(200, _read_json(os.path.join(PICKER_DIR, safe)))
            return

        if path == '/api/admin/session':
            user = _require_auth(self)
            if not user: return
            self.send_json(200, {
                'username': user['username'], 'uid': user.get('uid', ''),
                'nickname': user.get('nickname', ''), 'avatar': user.get('avatar', ''),
                'role': user.get('role', 'student'),
            })
            return

        if path == '/api/admin/users':
            user = _require_role(self, 'admin')
            if not user: return
            users = _load_users()
            result = []
            for uid, u in users.get('by_id', {}).items():
                result.append({
                    'uid': uid, 'username': u.get('username', ''),
                    'nickname': u.get('nickname', ''), 'avatar': u.get('avatar', ''),
                    'role': u.get('role', 'student'),
                })
            self.send_json(200, result)
            return

        m = re.match(r'^/api/admin/users/(\w+)$', path)
        if m:
            user = _require_role(self, 'admin')
            if not user: return
            uid, u = _find_user_by_name(m.group(1))
            if not u:
                self.send_json(404, {'error': '\u7528\u6237\u4e0d\u5b58\u5728'})
                return
            self.send_json(200, {
                'uid': uid, 'username': u.get('username', ''),
                'nickname': u.get('nickname', ''), 'avatar': u.get('avatar', ''),
                'role': u.get('role', 'student'),
            })
            return

        if path == '/api/admin/user-avatar':
            user = _require_auth(self)
            if not user: return
            name = params.get('name', [None])[0]
            if not name:
                self.send_error(400, 'Missing name param')
                return
            users = _load_users()
            for u in users.get('by_id', {}).values():
                if u.get('nickname', u.get('username', '')) == name:
                    self.send_json(200, {'name': name, 'avatar': u.get('avatar', '')})
                    return
            self.send_json(200, {'name': name, 'avatar': ''})
            return

        m = re.match(r'^/api/admin/config/(\w+)$', path)
        if m:
            user = _require_role(self, 'admin', 'teacher')
            if not user: return
            config_map = {
                'main': 'config/config.js', 'chemistry': 'config/chemistry/config.js',
                'english': 'config/english/config.js', 'picker': 'config/picker/config.js',
            }
            if m.group(1) not in config_map:
                self.send_json(404, {'error': '\u672a\u77e5\u914d\u7f6e'})
                return
            filepath = os.path.join(ROOT, config_map[m.group(1)])
            if not os.path.isfile(filepath):
                self.send_json(404, {'error': '\u914d\u7f6e\u6587\u4ef6\u4e0d\u5b58\u5728'})
                return
            with open(filepath, 'r', encoding='utf-8') as f:
                self.send_json(200, {'name': m.group(1), 'content': f.read()})
            return

        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        is_upload = path in ('/api/admin/upload/english', '/api/admin/upload/avatar')
        max_size = MAX_BODY if is_upload else MAX_BODY_API
        body = self.read_body(max_size)
        if body is None and int(self.headers.get('Content-Length', 0)) > 0:
            return
        body = body or b''

        def parse_body():
            try: return json.loads(body.decode('utf-8'))
            except: return {}

        if path == '/api/picker-timestamps':
            p = parse_body()
            safe = _safe_filename(p.get('list', '').replace('.csv', '') + '.json')
            _write_json(os.path.join(PICKER_DIR, safe), p.get('data', {}))
            self.send_json(200, {'ok': True})
            return

        if path == '/api/admin/login':
            client_ip = self.client_address[0]
            if not _check_ratelimit(client_ip):
                self.send_json(429, {'error': '\u5c1d\u8bd5\u6b21\u6570\u8fc7\u591a\uff0c\u8bf7 60 \u79d2\u540e\u518d\u8bd5'})
                return
            p = parse_body()
            username = p.get('username', '').strip()
            pw = p.get('password', '')
            if not username or not pw:
                _record_fail(client_ip)
                self.send_json(400, {'error': '\u8bf7\u8f93\u5165\u7528\u6237\u540d\u548c\u5bc6\u7801'})
                return
            uid, u = _find_user_by_name(username)
            if not u or _hash_password(pw, u.get('salt', '')) != u.get('passwordHash', ''):
                _record_fail(client_ip)
                self.send_json(401, {'error': '\u7528\u6237\u540d\u6216\u5bc6\u7801\u9519\u8bef'})
                return
            _clear_fails(client_ip)
            token = _generate_token()
            _clean_expired_sessions()
            sessions = _read_json(SESSIONS_PATH)
            sessions = {k: v for k, v in sessions.items() if v.get('uid') != uid}
            sessions[token] = _make_session(
                u['username'], uid, u.get('nickname', ''), u.get('avatar', ''),
                u.get('role', 'student'))
            _write_json(SESSIONS_PATH, sessions)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.set_session_cookie(token)
            self.end_headers()
            resp = {'token': token, 'user': {k: v for k, v in sessions[token].items() if k != 'expires_at'}}
            self.wfile.write(json.dumps(resp, ensure_ascii=False).encode())
            return

        if path == '/api/admin/logout':
            token = None
            cookies = self.headers.get('Cookie', '')
            for c in cookies.split(';'):
                c = c.strip()
                if c.startswith('seascribe_token='):
                    token = c.split('=', 1)[1].strip()
                    break
            if not token:
                auth = self.headers.get('Authorization', '')
                if auth.startswith('Bearer '):
                    token = auth[7:].strip()
            if token:
                sessions = _read_json(SESSIONS_PATH)
                sessions.pop(token, None)
                _write_json(SESSIONS_PATH, sessions)
            self.send_json(200, {'ok': True})
            return

        if path == '/api/admin/profile':
            user = _require_auth(self)
            if not user: return
            p = parse_body()
            old_uid = user.get('uid', '')
            old_username = user['username']
            users = _load_users()
            u = users['by_id'].get(old_uid, {})
            if not u:
                self.send_json(400, {'error': '\u7528\u6237\u4e0d\u5b58\u5728'})
                return
            new_name = p.get('username', '').strip()
            if new_name and new_name != old_username:
                if _find_user_by_name(new_name)[1]:
                    self.send_json(400, {'error': '\u7528\u6237\u540d\u5df2\u5b58\u5728'})
                    return
                del users['by_name'][old_username]
                users['by_name'][new_name] = old_uid
                old_username = new_name
                u['username'] = new_name
            if 'nickname' in p:
                u['nickname'] = (p['nickname'] or '')[:100]
            if 'avatar' in p:
                u['avatar'] = (p['avatar'] or '')[:2000]
            if p.get('oldPassword') and p.get('newPassword'):
                if _hash_password(p['oldPassword'], u.get('salt', '')) != u.get('passwordHash', ''):
                    self.send_json(400, {'error': '\u65e7\u5bc6\u7801\u9519\u8bef'})
                    return
                u['salt'] = _new_salt()
                u['passwordHash'] = _hash_password(p['newPassword'], u['salt'])
            _save_users(users)
            sessions = _read_json(SESSIONS_PATH)
            for t, s in sessions.items():
                if s.get('uid') == old_uid:
                    s['username'] = old_username
                    s['nickname'] = u.get('nickname', '')
                    s['avatar'] = u.get('avatar', '')
            _write_json(SESSIONS_PATH, sessions)
            self.send_json(200, {
                'ok': True, 'uid': old_uid, 'username': old_username,
                'nickname': u.get('nickname', ''), 'avatar': u.get('avatar', ''),
                'role': u.get('role', 'student'),
            })
            return

        if path == '/api/admin/users':
            user = _require_role(self, 'admin')
            if not user: return
            p = parse_body()
            nu = p.get('username', '').strip()
            if not nu:
                self.send_json(400, {'error': '\u7528\u6237\u540d\u4e0d\u80fd\u4e3a\u7a7a'})
                return
            if not re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', nu):
                self.send_json(400, {'error': '\u7528\u6237\u540d\u9700\u82f1\u6587\u5b57\u6bcd\u5f00\u5934'})
                return
            if _find_user_by_name(nu)[1]:
                self.send_json(400, {'error': '\u7528\u6237\u540d\u5df2\u5b58\u5728'})
                return
            uid = _new_uid()
            salt = _new_salt()
            users = _load_users()
            users['by_id'][uid] = {
                'username': nu,
                'passwordHash': _hash_password(p.get('password', '123456'), salt),
                'salt': salt,
                'nickname': (p.get('nickname', '') or '')[:100],
                'avatar': (p.get('avatar', '') or '')[:2000],
                'role': p.get('role', 'student'),
            }
            users['by_name'][nu] = uid
            _save_users(users)
            self.send_json(200, {'ok': True, 'uid': uid})
            return

        m = re.match(r'^/api/admin/users/(\w+)(/delete)?$', path)
        if m:
            user = _require_role(self, 'admin')
            if not user: return
            target = m.group(1)
            is_delete = bool(m.group(2))
            users = _load_users()
            uid = users.get('by_name', {}).get(target)
            if not uid or uid not in users.get('by_id', {}):
                self.send_json(404, {'error': '\u7528\u6237\u4e0d\u5b58\u5728'})
                return
            u = users['by_id'][uid]
            if is_delete:
                if uid == user.get('uid'):
                    self.send_json(400, {'error': '\u4e0d\u80fd\u5220\u9664\u81ea\u5df1'})
                    return
                del users['by_id'][uid]
                del users['by_name'][target]
            else:
                p = parse_body()
                if 'nickname' in p: u['nickname'] = (p['nickname'] or '')[:100]
                if 'avatar' in p: u['avatar'] = (p['avatar'] or '')[:2000]
                if 'role' in p: u['role'] = p['role']
                if 'password' in p and p['password']:
                    u['salt'] = _new_salt()
                    u['passwordHash'] = _hash_password(p['password'], u['salt'])
            _save_users(users)
            self.send_json(200, {'ok': True})
            return

        m = re.match(r'^/api/admin/config/(\w+)$', path)
        if m:
            user = _require_role(self, 'admin', 'teacher')
            if not user: return
            config_map = {
                'main': 'config/config.js', 'chemistry': 'config/chemistry/config.js',
                'english': 'config/english/config.js', 'picker': 'config/picker/config.js',
            }
            if m.group(1) not in config_map:
                self.send_json(404, {'error': '\u672a\u77e5\u914d\u7f6e'})
                return
            p = parse_body()
            filepath = os.path.join(ROOT, config_map[m.group(1)])
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(p.get('content', ''))
            self.send_json(200, {'ok': True})
            return

        if path == '/api/admin/upload/english':
            user = _require_role(self, 'admin', 'teacher')
            if not user: return
            try: p = json.loads(body.decode('utf-8'))
            except: self.send_json(400, {'error': 'JSON \u89e3\u6790\u5931\u8d25'}); return
            filename = _safe_filename(p.get('filename', '').strip())
            content_b64 = p.get('content', '')
            if not filename or not content_b64:
                self.send_json(400, {'error': '\u7f3a\u5c11\u6587\u4ef6\u540d\u6216\u6587\u4ef6\u5185\u5bb9'})
                return
            if not re.match(r'^[\w\u4e00-\u9fff\-. ()()]+\.(xlsx|csv|xls)$', filename, re.I):
                self.send_json(400, {'error': '\u6587\u4ef6\u540d\u4e0d\u5408\u6cd5'})
                return
            os.makedirs(ENGLISH_DIR, exist_ok=True)
            filepath = os.path.join(ENGLISH_DIR, filename)
            with open(filepath, 'wb') as f:
                f.write(base64.b64decode(content_b64))
            self.send_json(200, {'ok': True})
            return

        if path == '/api/admin/delete-file/english':
            user = _require_role(self, 'admin', 'teacher')
            if not user: return
            p = parse_body()
            filename = _safe_filename(p.get('filename', '').strip())
            if not filename:
                self.send_json(400, {'error': '\u7f3a\u5c11\u6587\u4ef6\u540d'})
                return
            filepath = os.path.join(ENGLISH_DIR, filename)
            if os.path.isfile(filepath):
                os.remove(filepath)
            self.send_json(200, {'ok': True})
            return

        # /api/admin/upload/avatar
        if path == '/api/admin/upload/avatar':
            user = _require_auth(self)
            if not user: return
            try: p = json.loads(body.decode('utf-8'))
            except: self.send_json(400, {'error': 'JSON parse failed'}); return
            content_b64 = p.get('content', '')
            filename = p.get('filename', 'avatar.png')
            if not content_b64:
                self.send_json(400, {'error': 'missing content'})
                return
            ext = os.path.splitext(_safe_filename(filename))[1].lower()
            if ext not in ('.png', '.jpg', '.jpeg', '.gif', '.webp'):
                ext = '.png'
            safe_name = user.get('uid', 'anon') + '_' + secrets.token_hex(4) + ext
            os.makedirs(AVATAR_DIR, exist_ok=True)
            filepath = os.path.join(AVATAR_DIR, safe_name)
            with open(filepath, 'wb') as f:
                f.write(base64.b64decode(content_b64))
            self.send_json(200, {'ok': True, 'url': '/admin/_store/avatars/' + safe_name})
            return

        self.send_error(404, 'Not Found')

    def list_directory(self, path):
        # /api/admin/upload/avatar
        if path == '/api/admin/upload/avatar':
            user = _require_auth(self)
            if not user: return
            try: p = json.loads(body.decode('utf-8'))
            except: self.send_json(400, {'error': 'JSON parse failed'}); return
            content_b64 = p.get('content', '')
            filename = p.get('filename', 'avatar.png')
            if not content_b64:
                self.send_json(400, {'error': 'missing content'})
                return
            ext = os.path.splitext(_safe_filename(filename))[1].lower()
            if ext not in ('.png', '.jpg', '.jpeg', '.gif', '.webp'):
                ext = '.png'
            safe_name = user.get('uid', 'anon') + '_' + secrets.token_hex(4) + ext
            os.makedirs(AVATAR_DIR, exist_ok=True)
            filepath = os.path.join(AVATAR_DIR, safe_name)
            with open(filepath, 'wb') as f:
                f.write(base64.b64decode(content_b64))
            self.send_json(200, {'ok': True, 'url': '/admin/_store/avatars/' + safe_name})
            return

        self.send_error(404, 'Not Found')

print(f'SeaScribe \u2192 http://localhost:{PORT}')
print(f'  \u7ba1\u7406\u540e\u53f0: http://localhost:{PORT}/admin/')
http.server.HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
