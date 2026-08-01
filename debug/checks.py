# -*- coding: utf-8 -*-
"""SeaScribe 离线静态检查项（注册式）。

每一项 = (name, fn)，fn(root) -> (ok, detail)。
新增检查：写一个函数并追加到 OFFLINE_CHECKS，引擎自动执行，无需改引擎。
"""

import ast
import json
import os
import re
import subprocess

# 文本扩展名（参与编码/语法扫描）
TEXT_EXTS = {'.py', '.js', '.html', '.css', '.json', '.md', '.txt', '.csv', '.bat', '.sh', '.svg'}
# 排除目录
EXCLUDE_DIRS = {'.git', '__pycache__', '.reasonix', 'avatars', 'english'}
JS_DIRS = ['main', 'config', 'plugins', 'debug']
HTML_FILES = ['index.html', 'main/admin/index.html']

# ════════════════════════════════════════════════════════════════
# 1. 编码检查：UTF-8 可解码 + 无 BOM（发现 BOM 自动修复）
# ════════════════════════════════════════════════════════════════

def check_encoding(root):
    bad = []
    bom_fixed = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if os.path.splitext(fn)[1].lower() not in TEXT_EXTS:
                continue
            fp = os.path.join(dirpath, fn)
            rel = os.path.relpath(fp, root)
            try:
                with open(fp, 'rb') as f:
                    raw = f.read()
            except OSError:
                continue
            # UTF-8 可解码性
            try:
                raw.decode('utf-8')
            except UnicodeDecodeError as e:
                bad.append('%s: 非 UTF-8（%s）' % (rel, e))
                continue
            # BOM 检测并修复
            if raw.startswith(b'\xef\xbb\xbf'):
                try:
                    with open(fp, 'wb') as f:
                        f.write(raw[3:])
                    bom_fixed.append(rel)
                except OSError as e:
                    bad.append('%s: BOM 修复失败（%s）' % (rel, e))
    if bad:
        return False, '发现 %d 个问题: %s' % (len(bad), '; '.join(bad[:5]))
    if bom_fixed:
        return True, '全部 UTF-8 无 BOM；已自动修复 %d 个历史 BOM: %s' % (
            len(bom_fixed), ', '.join(bom_fixed))
    return True, '全部文本文件为 UTF-8 且无 BOM'


# ════════════════════════════════════════════════════════════════
# 2. Python 语法检查（ast）
# ════════════════════════════════════════════════════════════════

def _iter_py_files(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if fn.endswith('.py'):
                yield os.path.join(dirpath, fn)


def check_python_syntax(root):
    errors = []
    n = 0
    for fp in _iter_py_files(root):
        n += 1
        rel = os.path.relpath(fp, root)
        try:
            with open(fp, encoding='utf-8-sig') as f:
                src = f.read()
            ast.parse(src, filename=rel)
        except SyntaxError as e:
            errors.append('%s:%s %s' % (rel, e.lineno, e.msg))
        except Exception as e:
            errors.append('%s: %r' % (rel, e))
    if errors:
        return False, '%d 个文件报语法错误: %s' % (len(errors), '; '.join(errors[:5]))
    return True, '%d 个 .py 文件语法全部通过' % n


# ════════════════════════════════════════════════════════════════
# 3. JS 语法检查（node --check，ESM 自动识别）
# ════════════════════════════════════════════════════════════════

_IMPORT_RE = re.compile(r'\b(import|export)\b')


def check_js_syntax(root):
    errors = []
    n = 0
    for d in JS_DIRS:
        base = os.path.join(root, d)
        if not os.path.isdir(base):
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d2 for d2 in dirnames if d2 not in EXCLUDE_DIRS]
            for fn in filenames:
                if not fn.endswith('.js'):
                    continue
                fp = os.path.join(dirpath, fn)
                rel = os.path.relpath(fp, root)
                n += 1
                try:
                    with open(fp, encoding='utf-8') as f:
                        src = f.read()
                except Exception as e:
                    errors.append('%s: 读取失败 %r' % (rel, e))
                    continue
                is_esm = bool(_IMPORT_RE.search(src))
                cmd = ['node', '--check', '-']
                if is_esm:
                    cmd = ['node', '--input-type=module', '--check', '-']
                try:
                    # 传入 UTF-8 bytes，避免 Windows 下按 GBK 编码 stdin 抛错/卡死
                    p = subprocess.run(cmd, input=src.encode('utf-8'),
                                       capture_output=True, timeout=20)
                except FileNotFoundError:
                    return False, 'node 未安装，无法执行 JS 语法检查'
                except subprocess.TimeoutExpired:
                    errors.append('%s: node 检查超时' % rel)
                    continue
                if p.returncode != 0:
                    raw = (p.stderr or p.stdout) or b''
                    err = raw.decode('utf-8', 'replace').strip().splitlines()
                    errors.append('%s: %s' % (rel, err[-1] if err else 'node 报错'))
    if errors:
        return False, '%d 个文件语法错误: %s' % (len(errors), '; '.join(errors[:5]))
    return True, '%d 个 .js 文件语法全部通过（含 ESM 识别）' % n


# ════════════════════════════════════════════════════════════════
# 4. HTML/JS 引用完整性：src / href / fetch / import
# ════════════════════════════════════════════════════════════════

_ATTR_RE = re.compile(r'\b(?:src|href)\s*=\s*["\']([^"\']+)["\']', re.I)
_FETCH_RE = re.compile(r'\bfetch\(\s*["\']([^"\']+)["\']')
_IMPORT_RE2 = re.compile(
    r"""\bimport\s+(?:[^'"\n]*\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)""")
_HREF_RE = re.compile(r'\bhref\s*=\s*["\']([^"\']+)["\']', re.I)


def _is_local_ref(ref):
    ref = ref.split('#')[0].split('?')[0]
    return bool(ref) and not ref.startswith(('http://', 'https://', '//', 'data:', 'mailto:', 'tel:'))


def _resolve_ref(base_file, ref, root=None):
    """解析引用为物理路径（相对项目根），返回 (target, orig)；虚拟路径返回 (None, orig) 跳过。

    URL 语义：服务器 translate_path 将 /main/ 映射到 main/client/、/admin/ 映射到
    main/admin/；/api/、/data/、/admin/_store/ 为服务器虚拟路径，静态无法验证。
    """
    ref = ref.split('#')[0].split('?')[0]
    if not ref:
        return None, ref
    if ref.startswith(('/api/', '/data/', '/admin/_store/', '/favicon.ico')):
        return None, ref
    if ref.startswith('/main/'):
        return os.path.normpath('main/client/' + ref[len('/main/'):]), ref
    if ref.startswith('/admin/'):
        return os.path.normpath('main/admin/' + ref[len('/admin/'):]), ref
    if ref.startswith('/'):
        return os.path.normpath(ref.lstrip('/')), ref
    # main/admin/ 下文件引用的 ../main/xxx 按 URL 语义 → /main/xxx → main/client/xxx
    if ref.startswith('../main/'):
        return os.path.normpath('main/client/' + ref[len('../main/'):]), ref
    # 根目录 index.html 中 'main/...' 亦为 URL 路径（→ main/client/）
    if (ref.startswith('main/') and root and
            os.path.normpath(os.path.dirname(base_file)) == os.path.normpath(root)):
        return os.path.normpath('main/client/' + ref[len('main/'):]), ref
    return os.path.normpath(os.path.join(os.path.dirname(base_file), ref)), ref


def check_refs(root):
    missing = []
    checked = 0

    def scan_file(fp):
        nonlocal checked
        rel = os.path.relpath(fp, root)
        try:
            with open(fp, encoding='utf-8') as f:
                src = f.read()
        except Exception:
            return
        refs = set(_ATTR_RE.findall(src)) | set(_FETCH_RE.findall(src))
        for m in _IMPORT_RE2.finditer(src):
            refs.add(m.group(1) or m.group(2))
        for r in refs:
            if not _is_local_ref(r):
                continue
            target, orig = _resolve_ref(fp, r, root)
            if target is None:
                continue  # 服务器虚拟路径，静态无法验证
            checked += 1
            if not (os.path.isfile(target) or os.path.isdir(target)):
                # fetch 等相对引用按“文档根”语义回退：基于项目根再解析一次
                if not r.startswith(('/', '../')):
                    t2 = os.path.normpath(os.path.join(root, r))
                    if os.path.isfile(t2) or os.path.isdir(t2):
                        continue
                missing.append('%s 引用了不存在的 %s' % (rel, orig))

    for hf in HTML_FILES:
        fp = os.path.join(root, hf)
        if os.path.isfile(fp):
            scan_file(fp)
    for d in JS_DIRS:
        base = os.path.join(root, d)
        if not os.path.isdir(base):
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [x for x in dirnames if x not in EXCLUDE_DIRS]
            for fn in filenames:
                if fn.endswith('.js'):
                    scan_file(os.path.join(dirpath, fn))
    if missing:
        return False, '%d 处引用失联: %s' % (len(missing), '; '.join(missing[:6]))
    return True, '%d 处本地引用全部命中目标文件' % checked


# ════════════════════════════════════════════════════════════════
# 5. data/*.json 健康 + users.json 互指一致性
# ════════════════════════════════════════════════════════════════

def check_data_json(root):
    data_dir = os.path.join(root, 'data')
    bad = []
    n = 0
    if not os.path.isdir(data_dir):
        return False, 'data/ 目录不存在'
    for dirpath, dirnames, filenames in os.walk(data_dir):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if not fn.endswith('.json'):
                continue
            n += 1
            fp = os.path.join(dirpath, fn)
            rel = os.path.relpath(fp, root)
            try:
                with open(fp, encoding='utf-8') as f:
                    json.load(f)
            except (ValueError, UnicodeDecodeError) as e:
                bad.append('%s: %s' % (rel, e))
    if bad:
        return False, '%d/%d 个 JSON 损坏: %s' % (len(bad), n, '; '.join(bad[:5]))
    return True, '%d 个 JSON 文件全部可解析' % n


def check_users_index(root):
    fp = os.path.join(root, 'data', 'users.json')
    if not os.path.isfile(fp):
        return False, 'data/users.json 不存在'
    try:
        with open(fp, encoding='utf-8') as f:
            users = json.load(f)
    except (ValueError, UnicodeDecodeError) as e:
        return False, 'users.json 无法解析: %s' % e
    by_id = users.get('by_id', {})
    by_name = users.get('by_name', {})
    problems = []
    for uid, u in by_id.items():
        uname = u.get('username', '')
        if not uname:
            problems.append('by_id[%s] 缺 username' % uid)
        elif by_name.get(uname) != uid:
            problems.append('by_name[%s]=%s 与 by_id[%s] 不一致' % (uname, by_name.get(uname), uid))
    for uname, uid in by_name.items():
        u = by_id.get(uid)
        if u is None:
            problems.append('by_name[%s] 指向不存在的 uid %s' % (uname, uid))
        elif u.get('username') != uname:
            problems.append('by_name[%s] 与 by_id[%s].username 不一致' % (uname, uid))
    if problems:
        return False, '%d 处索引不一致: %s' % (len(problems), '; '.join(problems[:6]))
    return True, 'users.json by_id/by_name 共 %d 用户，互指一致' % len(by_id)


# ════════════════════════════════════════════════════════════════
# 6. config/ 命名空间 ↔ plugins/ 目录一致性
# ════════════════════════════════════════════════════════════════

def check_config_plugins(root):
    config_dir = os.path.join(root, 'config')
    plugins_dir = os.path.join(root, 'plugins')
    if not os.path.isdir(config_dir) or not os.path.isdir(plugins_dir):
        return False, 'config/ 或 plugins/ 目录缺失'
    config_ns = [d for d in os.listdir(config_dir)
                 if os.path.isdir(os.path.join(config_dir, d))]
    plugin_ns = [d for d in os.listdir(plugins_dir)
                 if os.path.isdir(os.path.join(plugins_dir, d))]
    problems = []
    # config 命名空间 → plugins（picker 为内置点名模块，无插件目录）
    for ns in sorted(config_ns):
        if ns == 'picker':
            continue
        if ns not in plugin_ns:
            problems.append('config/%s 无对应 plugins/%s' % (ns, ns))
        elif not os.path.isfile(os.path.join(plugins_dir, ns, 'plugin.js')):
            problems.append('plugins/%s 缺少 plugin.js' % ns)
    # plugins → config
    for ns in sorted(plugin_ns):
        if ns not in config_ns:
            problems.append('plugins/%s 无对应 config/%s' % (ns, ns))
        elif not os.path.isfile(os.path.join(config_dir, ns, 'config.js')):
            problems.append('config/%s 缺少 config.js' % ns)
    if problems:
        return False, '%d 处不匹配: %s' % (len(problems), '; '.join(problems[:6]))
    return True, 'config(%s) ↔ plugins(%s) 一一对应' % (','.join(config_ns), ','.join(plugin_ns))


# ════════════════════════════════════════════════════════════════
# 注册表：新增检查在此追加一行
# ════════════════════════════════════════════════════════════════

OFFLINE_CHECKS = [
    ('编码检查：全项目 UTF-8 无 BOM', check_encoding),
    ('Python 语法检查（ast）', check_python_syntax),
    ('JS 语法检查（node --check）', check_js_syntax),
    ('引用完整性：src/href/fetch/import', check_refs),
    ('数据健康：data/*.json 可解析', check_data_json),
    ('数据健康：users.json 索引互指', check_users_index),
    ('配置一致性：config ↔ plugins', check_config_plugins),
]
