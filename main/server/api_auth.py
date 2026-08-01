# -*- coding: utf-8 -*-
"""鉴权与会话 API：登录、登出、会话信息、注册、会话管理。"""

import json
import re

from .config import SESSIONS_PATH
from .auth import (
    _read_json, _write_json, load_users, save_users,
    find_user_by_name, new_uid, hash_password, new_salt, generate_token,
    clean_expired_sessions, make_session,
    check_ratelimit, record_fail, clear_fails,
    require_auth, get_client_ip, _extract_token,
    get_session, list_sessions_by_uid, delete_session,
    append_log,
)
from .api_common import _parse_json_body


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
    append_log('register', '注册', handler, sessions[token])
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
