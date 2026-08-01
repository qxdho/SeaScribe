# -*- coding: utf-8 -*-
"""点名相关 API：上次点名/点名时间戳读写、点名记录。"""

import os
import re

from .config import PICKER_DIR
from .auth import (
    _read_json, _write_json,
    require_auth, require_role,
)
from .api_common import _safe_filename, _parse_json_body


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


def handle_picker_timestamps_get(path, handler, params):
    if path != '/api/picker-timestamps':
        return False
    list_name = params.get('list', [None])[0]
    if not list_name:
        handler.send_json(400, {'error': '缺少 list 参数'})
        return True
    safe = _safe_filename(list_name.replace('.csv', '') + '.json')
    handler.send_json(200, _read_json(os.path.join(PICKER_DIR, safe)))
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


def handle_admin_records(path, handler, params=None):
    if path != '/api/admin/records':
        return False
    user = require_role(handler, "admin", "teacher")
    if not user: return True
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
