# -*- coding: utf-8 -*-
"""花名册 API：班级列表/详情/读写、用户班级/签名查询。"""

import os
import re
from urllib.parse import unquote

from .config import ROSTER_DIR
from .auth import (
    _read_json, _write_json, load_users, save_users,
    require_auth, require_role, append_log,
)
from .api_common import _safe_filename, _parse_json_body


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
    append_log('roster_save', '保存名单', handler, user)
    handler.send_json(200, {'ok': True})
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
