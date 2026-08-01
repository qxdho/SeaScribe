# -*- coding: utf-8 -*-
"""操作日志 API：正常日志与 debug 自检日志查询。"""

from .config import LOGS_DEBUG_PATH
from .auth import (
    _read_json,
    require_auth, require_role, get_logs,
)


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


def handle_admin_logs_debug(path, handler, params=None):
    """GET /api/admin/logs/debug — 查看 debug 自检工具的操作日志（admin/teacher）。"""
    if path != '/api/admin/logs/debug':
        return False
    user = require_role(handler, 'admin', 'teacher')
    if not user: return True
    logs = _read_json(LOGS_DEBUG_PATH)
    if not isinstance(logs, list):
        logs = []
    handler.send_json(200, logs[-200:])
    return True
