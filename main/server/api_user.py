# -*- coding: utf-8 -*-
"""用户管理 API：用户列表/详情/资料/创建/修改/删除、头像查询。"""

import base64
import os
import re
import secrets
import threading
from urllib.parse import urlparse

from .config import USERS_PATH, AVATAR_DIR, ROSTER_DIR, SESSIONS_PATH
from .auth import (
    _read_json, _write_json, load_users, save_users,
    find_user_by_name, find_user_by_displayname, new_uid,
    hash_password, new_salt,
    require_auth, require_role, append_log,
)
from .api_common import _parse_json_body, user_to_dict, MIME_MAP, _safe_filename


# ── name→avatar lookup cache ──
_name_avatar_cache = {}
_name_avatar_cache_users_mtime = 0
_avatar_cache_lock = threading.Lock()


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


def handle_admin_users_get(path, handler, params=None):
    if path != '/api/admin/users':
        return False
    user = require_role(handler, 'admin')
    if not user: return True
    users = load_users()
    result = [user_to_dict(u, uid) for uid, u in users.get('by_id', {}).items()]
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
    handler.send_json(200, user_to_dict(u, uid))
    return True


def handle_admin_avatar(path, handler, params):
    if path != '/api/admin/user-avatar':
        return False
    name = params.get('name', [None])[0]
    if not name:
        handler.send_json(400, {'error': '缺少 name 参数'})
        return True
    _build_avatar_cache()
    avatar_url = _name_avatar_cache.get(name, '')
    if avatar_url:
        parsed = urlparse(avatar_url)
        if parsed.path:
            avatar_path = os.path.join(AVATAR_DIR, os.path.basename(parsed.path))
            if os.path.isfile(avatar_path):
                with open(avatar_path, 'rb') as f:
                    data = f.read()
                ext = os.path.splitext(avatar_path)[1].lower()
                mime = MIME_MAP.get(ext, 'image/png')
                avatar_url = "data:" + mime + ";base64," + base64.b64encode(data).decode()
    handler.send_json(200, {'name': name, 'avatar': avatar_url})
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

    changed_pw = False
    if p.get('oldPassword') and p.get('newPassword'):
        if hash_password(p['oldPassword'], u.get('salt', '')) != u.get('passwordHash', ''):
            handler.send_json(400, {'error': '旧密码错误'})
            return True
        u['salt'] = new_salt()
        u['passwordHash'] = hash_password(p['newPassword'], u['salt'])
        changed_pw = True

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

    append_log('password_change', '修改密码', handler, user) if changed_pw else \
        append_log('profile_update', '修改资料', handler, user)
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
    append_log('user_create', '创建用户', handler, user)
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
        append_log('user_delete', '删除用户', handler, user)
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
    append_log('user_modify', '修改用户', handler, user)
    handler.send_json(200, {'ok': True})
    return True
