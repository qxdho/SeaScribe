"""
SeaScribe 静态服务器 + 插件文件列表 API + 管理后台 API
用法: python server.py 9360

API:
  /api/<name>-files → 列出 data/<name>/ 下所有文件
  /api/picker-timestamps → GET/POST 时间戳读写
  /api/admin/login → POST 登录
  /api/admin/logout → POST 登出
  /api/admin/session → GET 校验会话
  /api/admin/profile → POST 更新个人资料
  /api/admin/users → GET列表 POST创建（admin）
  /api/admin/users/<name> → GET详情 POST更新 POST删除（admin）
  /api/admin/user-avatar → GET 按姓名查头像
  /api/admin/config/<name> → GET/POST 读写配置
  /api/admin/upload/english → POST 上传英语文件
  管理后台: http://host:port/admin/
"""
import http.server
import hashlib
import json
import os
import re
import secrets
import sys
from urllib.parse import urlparse, parse_qs

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9360
ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'data')
PICKER_DIR = os.path.join(DATA, 'picker')
STORE_DIR = os.path.join(ROOT, 'admin', '_store')
ENGLISH_DIR = os.path.join(DATA, 'english')

_TEXT_EXTS = {
    '.html': 'text/html',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.csv':  'text/csv',
    '.md':   'text/markdown',
    '.svg':  'image/svg+xml',
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


def _hash_password(password, salt):
    return hashlib.sha256((salt + password).encode('utf-8')).hexdigest()


def _generate_token():
    return secrets.token_hex(32)


def _get_session(token):
    sessions = _read_json(os.path.join(STORE_DIR, 'sessions.json'))
    return sessions.get(token)


def _require_auth(handler):
    auth = handler.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        handler.send_json(401, {'error': '未登录'})
        return None
    user = _get_session(auth[7:])
    if not user:
        handler.send_json(401, {'error': '会话已过期，请重新登录'})
        return None
    return user


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        **{k: v + '; charset=utf-8' for k, v in _TEXT_EXTS.items()}
    }

    def send_json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode())

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path.startswith('/admin/_store/'):
            self.send_error(403, 'Forbidden')
            return

        # /api/<plugin>-files
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

        # /api/picker-timestamps
        if path == '/api/picker-timestamps':
            list_name = params.get('list', [None])[0]
            if not list_name:
                self.send_error(400, 'Missing list param')
                return
            json_name = list_name.replace('.csv', '') + '.json'
            self.send_json(200, _read_json(os.path.join(PICKER_DIR, json_name)))
            return

        # /api/admin/session
        if path == '/api/admin/session':
            auth = self.headers.get('Authorization', '')
            if not auth.startswith('Bearer '):
                self.send_json(401, {'error': '未登录'})
                return
            user = _get_session(auth[7:])
            if not user:
                self.send_json(401, {'error': '会话已过期'})
                return
            self.send_json(200, user)
            return

        # /api/admin/users (list, admin only)
        if path == '/api/admin/users':
            user = _require_auth(self)
            if not user or user.get('role') != 'admin':
                if user: self.send_json(403, {'error': '无权限'})
                return
            users = _read_json(os.path.join(STORE_DIR, 'users.json'))
            result = [{
                'username': u.get('username', ''),
                'nickname': u.get('nickname', ''),
                'avatar': u.get('avatar', ''),
                'role': u.get('role', 'student'),
            } for u in users.values()]
            self.send_json(200, result)
            return

        # /api/admin/users/<username> (get one)
        m = re.match(r'^/api/admin/users/(\w+)$', path)
        if m:
            user = _require_auth(self)
            if not user or user.get('role') != 'admin':
                if user: self.send_json(403, {'error': '无权限'})
                return
            target = m.group(1)
            users = _read_json(os.path.join(STORE_DIR, 'users.json'))
            u = users.get(target)
            if not u:
                self.send_json(404, {'error': '用户不存在'})
                return
            self.send_json(200, {
                'username': u.get('username', ''),
                'nickname': u.get('nickname', ''),
                'avatar': u.get('avatar', ''),
                'role': u.get('role', 'student'),
            })
            return

        # /api/admin/user-avatar
        if path == '/api/admin/user-avatar':
            name = params.get('name', [None])[0]
            if not name:
                self.send_error(400, 'Missing name param')
                return
            users = _read_json(os.path.join(STORE_DIR, 'users.json'))
            for u in users.values():
                if u.get('nickname', u.get('username', '')) == name:
                    self.send_json(200, {'name': name, 'avatar': u.get('avatar', '')})
                    return
            self.send_json(200, {'name': name, 'avatar': ''})
            return

        # /api/admin/config/<name> (GET)
        m = re.match(r'^/api/admin/config/(\w+)$', path)
        if m:
            user = _require_auth(self)
            if not user: return
            if user.get('role') not in ('admin', 'teacher'):
                self.send_json(403, {'error': '无权限'})
                return
            config_name = m.group(1)
            config_map = {
                'main': 'config/config.js', 'chemistry': 'config/chemistry/config.js',
                'english': 'config/english/config.js', 'picker': 'config/picker/config.js',
            }
            if config_name not in config_map:
                self.send_json(404, {'error': '未知配置'})
                return
            filepath = os.path.join(ROOT, config_map[config_name])
            if not os.path.isfile(filepath):
                self.send_json(404, {'error': '配置文件不存在'})
                return
            with open(filepath, 'r', encoding='utf-8') as f:
                self.send_json(200, {'name': config_name, 'content': f.read()})
            return

        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        cl = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(cl) if cl > 0 else b''

        def parse_body():
            try: return json.loads(body.decode('utf-8'))
            except: return {}

        # /api/picker-timestamps
        if path == '/api/picker-timestamps':
            p = parse_body()
            _write_json(
                os.path.join(PICKER_DIR, p.get('list', '').replace('.csv', '') + '.json'),
                p.get('data', {}))
            self.send_json(200, {'ok': True})
            return

        # /api/admin/login
        if path == '/api/admin/login':
            p = parse_body()
            username = p.get('username', '').strip()
            password = p.get('password', '')
            if not username or not password:
                self.send_json(400, {'error': '请输入用户名和密码'})
                return
            users = _read_json(os.path.join(STORE_DIR, 'users.json'))
            u = users.get(username)
            if not u or _hash_password(password, u.get('salt', '')) != u.get('passwordHash', ''):
                self.send_json(401, {'error': '用户名或密码错误'})
                return
            token = _generate_token()
            sessions = _read_json(os.path.join(STORE_DIR, 'sessions.json'))
            sessions = {k: v for k, v in sessions.items() if v.get('username') != username}
            sessions[token] = {
                'username': u['username'], 'nickname': u.get('nickname', ''),
                'avatar': u.get('avatar', ''), 'role': u.get('role', 'student'),
            }
            _write_json(os.path.join(STORE_DIR, 'sessions.json'), sessions)
            self.send_json(200, {'token': token, 'user': sessions[token]})
            return

        # /api/admin/logout
        if path == '/api/admin/logout':
            auth = self.headers.get('Authorization', '')
            if auth.startswith('Bearer '):
                sessions = _read_json(os.path.join(STORE_DIR, 'sessions.json'))
                sessions.pop(auth[7:], None)
                _write_json(os.path.join(STORE_DIR, 'sessions.json'), sessions)
            self.send_json(200, {'ok': True})
            return

        # /api/admin/profile (update self)
        if path == '/api/admin/profile':
            user = _require_auth(self)
            if not user: return
            p = parse_body()
            username = user['username']
            users = _read_json(os.path.join(STORE_DIR, 'users.json'))
            u = users.get(username, {})
            new_name = p.get('username', '').strip()
            if new_name and new_name != username:
                if new_name in users:
                    self.send_json(400, {'error': '用户名已存在'})
                    return
                users[new_name] = u
                del users[username]
                username = new_name
                u = users[username]
            if 'nickname' in p: u['nickname'] = p['nickname']
            if 'avatar' in p: u['avatar'] = p['avatar']
            if 'oldPassword' in p and 'newPassword' in p:
                if _hash_password(p['oldPassword'], u.get('salt', '')) != u.get('passwordHash', ''):
                    self.send_json(400, {'error': '旧密码错误'})
                    return
                u['salt'] = secrets.token_hex(16)
                u['passwordHash'] = _hash_password(p['newPassword'], u['salt'])
            _write_json(os.path.join(STORE_DIR, 'users.json'), users)
            sessions = _read_json(os.path.join(STORE_DIR, 'sessions.json'))
            for t, s in sessions.items():
                if s.get('username') == user['username']:
                    s['username'] = username
                    s['nickname'] = u.get('nickname', '')
                    s['avatar'] = u.get('avatar', '')
            _write_json(os.path.join(STORE_DIR, 'sessions.json'), sessions)
            self.send_json(200, {'ok': True, 'username': username, 'nickname': u.get('nickname', ''),
                                  'avatar': u.get('avatar', ''), 'role': u.get('role', 'student')})
            return

        # /api/admin/users (POST create, admin only)
        if path == '/api/admin/users':
            user = _require_auth(self)
            if not user or user.get('role') != 'admin':
                if user: self.send_json(403, {'error': '无权限'})
                return
            p = parse_body()
            nu = p.get('username', '').strip()
            if not nu:
                self.send_json(400, {'error': '用户名不能为空'})
                return
            if not re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', nu):
                self.send_json(400, {'error': '用户名需英文字母开头，可含数字、下划线、连字符'})
                return
            users = _read_json(os.path.join(STORE_DIR, 'users.json'))
            if nu in users:
                self.send_json(400, {'error': '用户名已存在'})
                return
            salt = secrets.token_hex(16)
            users[nu] = {
                'username': nu,
                'passwordHash': _hash_password(p.get('password', '123456'), salt),
                'salt': salt,
                'nickname': p.get('nickname', ''),
                'avatar': p.get('avatar', ''),
                'role': p.get('role', 'student'),
            }
            _write_json(os.path.join(STORE_DIR, 'users.json'), users)
            self.send_json(200, {'ok': True})
            return

        # /api/admin/users/<name> or /api/admin/users/<name>/delete
        m = re.match(r'^/api/admin/users/(\w+)(/delete)?$', path)
        if m:
            user = _require_auth(self)
            if not user or user.get('role') != 'admin':
                if user: self.send_json(403, {'error': '无权限'})
                return
            target = m.group(1)
            is_delete = bool(m.group(2))
            users = _read_json(os.path.join(STORE_DIR, 'users.json'))
            if target not in users:
                self.send_json(404, {'error': '用户不存在'})
                return
            if is_delete:
                if target == user['username']:
                    self.send_json(400, {'error': '不能删除自己'})
                    return
                del users[target]
            else:
                p = parse_body()
                u = users[target]
                if 'nickname' in p: u['nickname'] = p['nickname']
                if 'avatar' in p: u['avatar'] = p['avatar']
                if 'role' in p: u['role'] = p['role']
                if 'password' in p and p['password']:
                    u['salt'] = secrets.token_hex(16)
                    u['passwordHash'] = _hash_password(p['password'], u['salt'])
            _write_json(os.path.join(STORE_DIR, 'users.json'), users)
            self.send_json(200, {'ok': True})
            return

        # /api/admin/config/<name> (POST save)
        m = re.match(r'^/api/admin/config/(\w+)$', path)
        if m:
            user = _require_auth(self)
            if not user: return
            if user.get('role') not in ('admin', 'teacher'):
                self.send_json(403, {'error': '无权限'})
                return
            config_map = {
                'main': 'config/config.js', 'chemistry': 'config/chemistry/config.js',
                'english': 'config/english/config.js', 'picker': 'config/picker/config.js',
            }
            if m.group(1) not in config_map:
                self.send_json(404, {'error': '未知配置'})
                return
            p = parse_body()
            filepath = os.path.join(ROOT, config_map[m.group(1)])
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(p.get('content', ''))
            self.send_json(200, {'ok': True})
            return

        # /api/admin/upload/english (POST file upload as base64)
        if path == '/api/admin/upload/english':
            user = _require_auth(self)
            if not user: return
            if user.get('role') not in ('admin', 'teacher'):
                self.send_json(403, {'error': '无权限'})
                return
            p = parse_body()
            filename = p.get('filename', '').strip()
            content_b64 = p.get('content', '')
            if not filename or not content_b64:
                self.send_json(400, {'error': '缺少文件名或文件内容'})
                return
            if not re.match(r'^[\w\u4e00-\u9fff\-. ()（）]+\.(xlsx|csv|xls)$', filename, re.IGNORECASE):
                self.send_json(400, {'error': '文件名不合法，仅支持 .xlsx .csv .xls'})
                return
            import base64
            os.makedirs(ENGLISH_DIR, exist_ok=True)
            filepath = os.path.join(ENGLISH_DIR, filename)
            with open(filepath, 'wb') as f:
                f.write(base64.b64decode(content_b64))
            self.send_json(200, {'ok': True})
            return

        # /api/admin/delete-file/english (POST)
        if path == '/api/admin/delete-file/english':
            user = _require_auth(self)
            if not user: return
            if user.get('role') not in ('admin', 'teacher'):
                self.send_json(403, {'error': '无权限'})
                return
            p = parse_body()
            filename = p.get('filename', '').strip()
            if not filename:
                self.send_json(400, {'error': '缺少文件名'})
                return
            filepath = os.path.join(ENGLISH_DIR, filename)
            if os.path.isfile(filepath):
                os.remove(filepath)
            self.send_json(200, {'ok': True})
            return

        self.send_error(404, 'Not Found')

    def list_directory(self, path):
        self.send_error(404, 'Not Found')


print(f'SeaScribe \u2192 http://localhost:{PORT}')
print(f'  管理后台: http://localhost:{PORT}/admin/')
http.server.HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
