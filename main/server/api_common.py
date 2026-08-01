# -*- coding: utf-8 -*-
"""API 公共辅助：跨模块共享的工具函数。

- _safe_filename：路径穿越防护
- MIME_MAP：图片 MIME 表（统一带点扩展名）
- user_to_dict：用户对象序列化（消除多处重复）
- _read_text_file：UTF-8/UTF-16 兼容文本读取
- _parse_json_body：请求体解析（失败统一 400）
"""

import json
import os

_safe_filename = os.path.basename

# 统一 MIME 表：key 为带点扩展名（与 os.path.splitext 返回值一致）
MIME_MAP = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp",
}


def user_to_dict(u, uid):
    """用户记录 → 对外 JSON 结构（多处 API 共用）。"""
    return {
        'uid': uid, 'username': u.get('username', ''),
        'nickname': u.get('nickname', ''), 'displayName': u.get('displayName', ''),
        'signature': u.get('signature', ''),
        'avatar': u.get('avatar', ''), 'role': u.get('role', 'student'),
    }


def _read_text_file(filepath):
    """Read a text file, trying UTF-8 first then UTF-16 (Windows Unicode)."""
    with open(filepath, 'rb') as f:
        raw = f.read()
    for enc in ('utf-8-sig', 'utf-16'):
        try:
            return raw.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
    return raw.decode('utf-8', errors='replace')


def _parse_json_body(handler, body):
    try:
        return json.loads(body.decode('utf-8'))
    except Exception:
        handler.send_json(400, {'error': 'JSON 解析失败'})
        return None
