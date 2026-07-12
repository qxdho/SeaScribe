# SeaScribe authentication helpers
import hashlib
import json
import os
import secrets
import time

from .config import USERS_PATH, SESSIONS_PATH

def _read_json(filepath):
    if os.path.isfile(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def _write_json(filepath, data):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── Users ──

def load_users():
    return _read_json(USERS_PATH)

def save_users(data):
    _write_json(USERS_PATH, data)

def find_user_by_name(username):
    users = load_users()
    uid = users.get('by_name', {}).get(username)
    if uid:
        return uid, users['by_id'].get(uid)
    return None, None

def find_user_by_displayname(displayName):
    if not displayName:
        return None, None
    users = load_users()
    for uid, u in users.get('by_id', {}).items():
        if u.get('displayName', '') == displayName:
            return uid, u
    return None, None

def new_uid():
    return secrets.token_hex(8)


# ── Passwords ──

def hash_password(password, salt):
    return hashlib.pbkdf2_hmac(
        'sha256', password.encode('utf-8'), salt.encode('utf-8'),
        600000, dklen=32
    ).hex()

def new_salt():
    return secrets.token_hex(16)


# ── Sessions ──

def generate_token():
    return secrets.token_hex(32)

def get_session(token):
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

def clean_expired_sessions():
    sessions = _read_json(SESSIONS_PATH)
    now = time.time()
    changed = False
    for t in list(sessions.keys()):
        if sessions[t].get('expires_at', 0) and now > sessions[t]['expires_at']:
            del sessions[t]
            changed = True
    if changed:
        _write_json(SESSIONS_PATH, sessions)

def make_session(username, uid, nickname, displayName, avatar, role, signature):
    return {
        'username': username, 'uid': uid, 'nickname': nickname,
        'displayName': displayName, 'avatar': avatar, 'role': role,
        'signature': signature,
        'expires_at': int(time.time()) + 4 * 3600,
    }


# ── Rate limiting ──

_LOGIN_FAILS = {}

def check_ratelimit(ip):
    now = time.time()
    entry = _LOGIN_FAILS.get(ip)
    if entry and entry[0] >= 5 and now - entry[1] < 60:
        return False
    return True

def record_fail(ip):
    now = time.time()
    entry = _LOGIN_FAILS.get(ip)
    if not entry or now - entry[1] > 60:
        _LOGIN_FAILS[ip] = (1, now)
    else:
        _LOGIN_FAILS[ip] = (entry[0] + 1, entry[1])

def clear_fails(ip):
    _LOGIN_FAILS.pop(ip, None)


# ── Request auth ──

def require_auth(handler):
    token = _extract_token(handler)
    if not token:
        handler.send_json(401, {'error': '未登录'})
        return None
    user = get_session(token)
    if not user:
        handler.send_json(401, {'error': '会话已过期'})
        return None
    return user

def require_role(handler, *roles):
    user = require_auth(handler)
    if not user:
        return None
    if user.get('role') not in roles:
        handler.send_json(403, {'error': '无权限'})
        return None
    return user

def _extract_token(handler):
    cookies = handler.headers.get('Cookie', '')
    for c in cookies.split(';'):
        c = c.strip()
        if c.startswith('seascribe_token='):
            return c.split('=', 1)[1].strip()
    auth = handler.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return auth[7:].strip()
    return None
