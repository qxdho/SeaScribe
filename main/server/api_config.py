# -*- coding: utf-8 -*-
"""配置 API：读取/保存学科配置文件。"""

import os
import re

from .config import ROOT
from .auth import require_role, append_log
from .api_common import _read_text_file, _parse_json_body


# ── Config file map (shared between GET and POST handlers) ──
_CONFIG_MAP = {
    'main': 'config/config.js', 'chemistry': 'config/chemistry/config.js',
    'english': 'config/english/config.js', 'picker': 'config/picker/config.js',
    'enword': 'config/enword/config.js',
}


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
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(p.get('content', ''))
    except OSError as e:
        handler.send_json(500, {'error': '配置文件写入失败'})
        return True
    append_log('config_save', '保存配置', handler, user)
    handler.send_json(200, {'ok': True})
    return True
