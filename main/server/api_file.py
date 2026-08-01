# -*- coding: utf-8 -*-
"""文件相关 API：学科文件列表、英语文件上传/删除、头像上传/服务。"""

import base64
import binascii
import os
import re
import secrets

from .config import DATA, ENGLISH_DIR, AVATAR_DIR
from .auth import require_auth, require_role, append_log
from .api_common import _safe_filename, _parse_json_body, MIME_MAP


def handle_get_files(path, handler, params=None):
    """GET /api/<name>-files"""
    m = re.match(r'^/api/(\w+)-files$', path)
    if not m:
        return False
    name = m.group(1)
    # Restrict to known subdirectories
    allowed = {'chemistry', 'english', 'enword'}
    if name not in allowed:
        handler.send_json(403, {'error': '未知目录'})
        return True
    dirpath = os.path.join(DATA, name)
    files = []
    if os.path.isdir(dirpath):
        for f in sorted(os.listdir(dirpath)):
            if os.path.isfile(os.path.join(dirpath, f)):
                files.append({'name': f, 'url': f'/data/{name}/{f}'})
    handler.send_json(200, files)
    return True


def handle_admin_english_files(path, handler, params=None):
    if path != '/api/admin/english-files':
        return False
    user = require_role(handler, 'admin', 'teacher')
    if not user: return True
    files = []
    if os.path.isdir(ENGLISH_DIR):
        for f in sorted(os.listdir(ENGLISH_DIR)):
            fp = os.path.join(ENGLISH_DIR, f)
            if os.path.isfile(fp):
                files.append({
                    'name': f, 'size': os.path.getsize(fp),
                    'url': f'/data/english/{f}',
                })
    handler.send_json(200, files)
    return True


def handle_english_upload(path, body, handler):
    if path != '/api/admin/upload/english':
        return False
    user = require_role(handler, 'admin', 'teacher')
    if not user: return True
    p = _parse_json_body(handler, body)
    if p is None: return True
    filename = _safe_filename(p.get('filename', '').strip())
    content_b64 = p.get('content', '')
    if not filename or not content_b64:
        handler.send_json(400, {'error': '缺少文件名或文件内容'})
        return True
    if not re.match(r'^[\w\u4e00-\u9fff\-. ()()]+\.(xlsx|csv|xls)$', filename, re.I):
        handler.send_json(400, {'error': '文件名不合法'})
        return True
    os.makedirs(ENGLISH_DIR, exist_ok=True)
    filepath = os.path.join(ENGLISH_DIR, filename)
    try:
        data = base64.b64decode(content_b64)
    except (binascii.Error, ValueError):
        handler.send_json(400, {'error': '文件内容非法的 Base64 编码'})
        return True
    with open(filepath, 'wb') as f:
        f.write(data)
    handler.send_json(200, {'ok': True})
    return True


def handle_english_delete(path, body, handler):
    if path != '/api/admin/delete-file/english':
        return False
    user = require_role(handler, 'admin', 'teacher')
    if not user: return True
    p = _parse_json_body(handler, body)
    if p is None: return True
    filename = _safe_filename(p.get('filename', '').strip())
    if not filename:
        handler.send_json(400, {'error': '缺少文件名'})
        return True
    filepath = os.path.join(ENGLISH_DIR, filename)
    if os.path.isfile(filepath):
        os.remove(filepath)
    handler.send_json(200, {'ok': True})
    return True


# ══════════════ 头像 ══════════════

AVATAR_MAX_SIZE = 512   # max width/height after resize
AVATAR_JPEG_QUALITY = 80


def _compress_avatar(raw_data):
    """Resize + compress avatar image. Always outputs JPEG for size efficiency."""
    from io import BytesIO
    from PIL import Image
    try:
        img = Image.open(BytesIO(raw_data))
    except Exception:
        return None
    # Convert RGBA/transparent to white-background RGB
    if img.mode in ('RGBA', 'LA', 'P', 'PA'):
        if img.mode == 'P':
            img = img.convert('RGBA')
        bg = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'RGBA':
            bg.paste(img, mask=img.split()[3])
        elif img.mode == 'LA':
            bg.paste(img, mask=img.split()[1])
        else:
            bg.paste(img)
        img = bg
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    # Resize if larger than max
    w, h = img.size
    if w > AVATAR_MAX_SIZE or h > AVATAR_MAX_SIZE:
        ratio = min(AVATAR_MAX_SIZE / w, AVATAR_MAX_SIZE / h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    out = BytesIO()
    img.save(out, format='JPEG', quality=AVATAR_JPEG_QUALITY, optimize=True)
    return out.getvalue()


def _cleanup_old_avatars(uid):
    """Remove all avatar files belonging to uid (free orphan files)."""
    if not uid:
        return
    prefix = uid + '_'
    if not os.path.isdir(AVATAR_DIR):
        return
    for f in os.listdir(AVATAR_DIR):
        if f.startswith(prefix) and os.path.isfile(os.path.join(AVATAR_DIR, f)):
            os.remove(os.path.join(AVATAR_DIR, f))


def handle_avatar_upload(path, body, handler):
    if path != '/api/admin/upload/avatar':
        return False
    # 任何已登录用户（含学生）都可上传自己的头像；文件名以 uid 为前缀，
    # 只能覆盖本人的旧头像，不存在越权
    user = require_auth(handler)
    if not user: return True
    p = _parse_json_body(handler, body)
    if p is None: return True
    content_b64 = p.get('content', '')
    filename = p.get('filename', 'avatar.png')
    if not content_b64:
        handler.send_json(400, {'error': '缺少文件内容'})
        return True
    ext = os.path.splitext(_safe_filename(filename))[1].lower()
    if ext not in ('.png', '.jpg', '.jpeg', '.gif', '.webp'):
        ext = '.png'
    safe_name = user.get('uid', 'anon') + '_' + secrets.token_hex(4) + '.jpg'
    try:
        raw_data = base64.b64decode(content_b64)
    except (binascii.Error, ValueError):
        handler.send_json(400, {'error': '头像内容非法的 Base64 编码'})
        return True
    # 先压缩成功，再清理旧头像并保存（避免新图无效时旧头像已丢失）
    compressed = _compress_avatar(raw_data)
    if compressed is None:
        handler.send_json(400, {'error': '图片无法处理，请上传有效图片文件'})
        return True
    uid = user.get('uid', '')
    _cleanup_old_avatars(uid)
    os.makedirs(AVATAR_DIR, exist_ok=True)
    filepath = os.path.join(AVATAR_DIR, safe_name)
    with open(filepath, 'wb') as f:
        f.write(compressed)
    append_log('avatar_upload', '上传头像', handler, user)
    handler.send_json(200, {'ok': True, 'url': '/admin/_store/avatars/' + safe_name})
    return True


def handle_avatar_file(path, handler, params=None):
    """Serve avatar files from AVATAR_DIR (works with external data dir)."""
    m = re.match(r"^/admin/_store/avatars/(.+)$", path)
    if not m:
        return False
    safe = _safe_filename(m.group(1))
    filepath = os.path.join(AVATAR_DIR, safe)
    if not os.path.isfile(filepath):
        return False
    try:
        with open(filepath, 'rb') as f:
            data = f.read()
        ext = os.path.splitext(filepath)[1].lower()
        ct = MIME_MAP.get(ext, "application/octet-stream")
        handler.send_response(200)
        handler.send_header("Content-Type", ct)
        handler.send_header("Cache-Control", "public, max-age=86400")
        handler.end_headers()
        handler.wfile.write(data)
    except Exception:
        handler.send_error(404, "Not Found")
    return True
