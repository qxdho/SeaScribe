# -*- coding: utf-8 -*-
"""SeaScribe 调试框架核心引擎。

职责：
- 分级日志输出（彩色 / 纯文本两用）
- 测试结果收集（分组小计 + 全局汇总 + 失败回放）
- HTTP 请求薄封装（urllib，Bearer token）
- 声明式 API 用例执行器（注册表驱动，见 debug/tests.py）
- 离线检查执行器（注册函数表，见 debug/checks.py）
- 自动发现：解析 main/server/routes.py 的 handler 路径，与用例注册表比对

设计原则：新增检查 / 新增 API 用例 = 只改注册表，不改引擎。
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

# ════════════════════════════════════════════════════════════════
# 分级日志
# ════════════════════════════════════════════════════════════════

_PREFIX = {
    'INFO': '[信息] ',
    'PASS': '      [通过] ',
    'FAIL': '      [失败] ',
    'WARN': '      [警告] ',
    'SKIP': '      [跳过] ',
    'TEST': '  · 测试  ',
    'REQ':  '      → 请求  ',
    'RESP': '      ← 响应  ',
    'GRP':  '',
}

_COLOR = {
    'INFO': '90', 'PASS': '92', 'FAIL': '91', 'WARN': '93',
    'SKIP': '90', 'TEST': '96', 'REQ': '90', 'RESP': '90', 'GRP': '1;36',
}


class Log:
    """分级日志。plain=True 时输出纯文本（无 ANSI 颜色），供管道/重定向使用。"""

    def __init__(self, plain=False, out=None):
        self.plain = plain
        self.out = out or sys.stdout

    def emit(self, level, msg):
        prefix = _PREFIX.get(level, '')
        if self.plain:
            line = prefix + msg
        else:
            color = _COLOR.get(level, '')
            line = ('\033[%sm%s\033[0m' % (color, prefix + msg)) if color else (prefix + msg)
        self.out.write(line + '\n')
        self.out.flush()

    def grp(self, title):
        n = max(0, 72 - len(title))
        self.emit('GRP', '─' * 2 + ' ' + title + ' ' + '─' * n)

    def info(self, msg):  self.emit('INFO', msg)
    def ok(self, msg):    self.emit('PASS', msg)
    def bad(self, msg):   self.emit('FAIL', msg)
    def warn(self, msg):  self.emit('WARN', msg)
    def skip(self, msg):  self.emit('SKIP', msg)
    def test(self, msg):  self.emit('TEST', msg)
    def req(self, msg):   self.emit('REQ', msg)
    def resp(self, msg):  self.emit('RESP', msg)


# ════════════════════════════════════════════════════════════════
# 结果收集
# ════════════════════════════════════════════════════════════════

class Results:
    """收集所有检查/用例结果，支持分组统计与全局汇总。"""

    def __init__(self):
        self.items = []          # {'group','name','status','detail'}
        self.skipped_groups = set()

    def add(self, group, name, status, detail=''):
        self.items.append({'group': group, 'name': name,
                           'status': status, 'detail': detail})

    def group_counts(self, group):
        g = [i for i in self.items if i['group'] == group]
        return {
            'pass': sum(1 for i in g if i['status'] == 'PASS'),
            'fail': sum(1 for i in g if i['status'] == 'FAIL'),
            'warn': sum(1 for i in g if i['status'] == 'WARN'),
            'skip': sum(1 for i in g if i['status'] == 'SKIP'),
        }

    def totals(self):
        return {
            'pass': sum(1 for i in self.items if i['status'] == 'PASS'),
            'fail': sum(1 for i in self.items if i['status'] == 'FAIL'),
            'warn': sum(1 for i in self.items if i['status'] == 'WARN'),
            'skip': sum(1 for i in self.items if i['status'] == 'SKIP'),
        }

    def failures(self):
        return [i for i in self.items if i['status'] == 'FAIL']

    def group_names(self):
        seen = []
        for i in self.items:
            if i['group'] not in seen:
                seen.append(i['group'])
        return seen


# ════════════════════════════════════════════════════════════════
# HTTP 客户端
# ════════════════════════════════════════════════════════════════

class HttpClient:
    """基于 urllib 的轻量客户端。token 按角色保存，请求时自动带 Bearer 头。"""

    def __init__(self, base, timeout=15):
        self.base = base.rstrip('/')
        self.timeout = timeout
        self.tokens = {}  # role -> token

    def request(self, method, path, body=None, token=None):
        # URL 编码：中文等非 ASCII 字符需 percent-encoding（保留 / ? = & % 已有结构）
        url = self.base + urllib.parse.quote(path, safe="/?=&%{}")
        headers = {
            'Accept': 'application/json',
            # 标记 debug 自检请求：后端将操作日志写入独立文件，不混入正常日志
            'X-Debug-Test': '1',
        }
        data = None
        if body is not None:
            headers['Content-Type'] = 'application/json'
            data = json.dumps(body, ensure_ascii=False).encode('utf-8')
        if token:
            headers['Authorization'] = 'Bearer ' + token
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        t0 = time.time()
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                status = resp.status
                text = resp.read().decode('utf-8', 'replace')
                reached = True
        except urllib.error.HTTPError as e:
            status = e.code
            text = e.read().decode('utf-8', 'replace')
            reached = True
        except Exception as e:  # 连接失败 / 超时等
            return 0, {'_error': str(e)}, time.time() - t0
        try:
            data = json.loads(text)
        except ValueError:
            data = {'_raw': text[:300]}
        return status, data, time.time() - t0


# ════════════════════════════════════════════════════════════════
# 断言辅助
# ════════════════════════════════════════════════════════════════

def _trunc(s, n=120):
    s = str(s)
    return s if len(s) <= n else s[:n] + '…'


# 敏感字段：打印请求/响应时脱敏，避免密码、token、文件内容泄漏到日志
_SENSITIVE_FIELDS = ('password', 'oldPassword', 'newPassword', 'token', 'content', 'Authorization')


def _redact(obj):
    """递归脱敏：命中敏感字段名的值替换为 ***。"""
    if isinstance(obj, dict):
        return {k: ('***' if k in _SENSITIVE_FIELDS else _redact(v)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_redact(v) for v in obj]
    return obj


def check_expect(case, status, data):
    """按 expect 字典校验响应。返回 (ok, detail)。"""
    exp = case.get('expect', {})
    details = []

    if 'status' in exp:
        ok = status == exp['status']
        details.append('状态码 %s (期望 %s)' % ('✔' if ok else '✘', exp['status']))
        if not ok:
            return False, '；'.join(details) + '，实际响应: ' + _trunc(_redact(data))
    elif 'status_in' in exp:
        ok = status in exp['status_in']
        details.append('状态码 %s ∈ %s' % ('✔' if ok else '✘', exp['status_in']))
        if not ok:
            return False, '；'.join(details) + '，实际响应: ' + _trunc(_redact(data))

    if 'ok_field' in exp:
        v = data.get(exp['ok_field']) if isinstance(data, dict) else None
        ok = v is True
        details.append('%s=%s' % (exp['ok_field'], '✔' if ok else ('✘(%r)' % v)))
        if not ok:
            return False, '；'.join(details) + '，实际响应: ' + _trunc(_redact(data))

    if 'json_subset' in exp:
        missing = []
        for k, v in exp['json_subset'].items():
            if not isinstance(data, dict) or data.get(k) != v:
                missing.append('%s=%r' % (k, v))
        ok = not missing
        details.append('字段子集 %s' % ('✔' if ok else '✘ 缺失: ' + ', '.join(missing)))
        if not ok:
            return False, '；'.join(details) + '，实际响应: ' + _trunc(_redact(data))

    if 'text_contains' in exp:
        hay = json.dumps(data, ensure_ascii=False) if not isinstance(data, str) else data
        ok = exp['text_contains'] in hay
        details.append('包含 %r %s' % (exp['text_contains'], '✔' if ok else '✘'))
        if not ok:
            return False, '；'.join(details) + '，实际响应: ' + _trunc(_redact(data))

    return True, '；'.join(details) if details else '状态码 %s' % status


# ════════════════════════════════════════════════════════════════
# 用例执行器
# ════════════════════════════════════════════════════════════════

def run_case(case, http, ctx, log, results):
    """执行单个声明式 API 用例。

    case 字段：
      group    分组名（用于小计）
      name     用例名
      method   GET/POST/...
      path     请求路径，支持 {var} 占位符（从 ctx 取值）
      auth     None / 'admin' / 'teacher' / 'student'（决定带哪个 token）
      body     请求体 dict，或 callable(ctx)->dict/None
      expect   check_expect 支持的期望字典
      validate callable(status, data, ctx)->(ok, detail) 可选自定义校验
      cleanup  callable(ctx) 可选清理回调
      skip     True 时标记 SKIP（不执行）
    """
    name = case['name']
    group = case.get('group', '未分组')
    idx = ctx.get('_case_idx', 0) + 1
    ctx['_case_idx'] = idx
    total = ctx.get('_case_total', 0)
    progress = '[%d/%d] ' % (idx, total) if total else ''
    skip = case.get('skip')
    if callable(skip):
        try:
            skip = skip(ctx)
        except Exception as e:
            skip = True
            log.warn('skip 判断异常（%s）: %r，按跳过处理' % (name, e))
    if skip:
        log.skip('跳过用例：%s' % name)
        results.add(group, name, 'SKIP', case.get('skip_reason', ''))
        return

    path = case['path']
    for k, v in ctx.items():
        path = path.replace('{%s}' % k, str(v))

    body = case.get('body')
    if callable(body):
        try:
            body = body(ctx)
        except Exception as e:
            log.bad('%s → body 构造异常: %r' % (name, e))
            results.add(group, name, 'FAIL', 'body 构造异常: %r' % e)
            return

    token = None
    auth = case.get('auth')
    if auth:
        token = http.tokens.get(auth)
        if not token:
            log.skip('跳过用例（无 %s token）：%s' % (auth, name))
            results.add(group, name, 'SKIP', '缺少 %s 登录态' % auth)
            return

    log.test('%s%s — %s %s' % (progress, name, case['method'], path))
    if body is not None:
        log.req('body: ' + _trunc(json.dumps(_redact(body), ensure_ascii=False), 160))
    status, data, dt = http.request(case['method'], path, body=body, token=token)
    log.resp('HTTP %s  (%.0fms)' % (status, dt * 1000) +
             ('  ' + _trunc(json.dumps(_redact(data), ensure_ascii=False), 160) if data not in (None, {}) else ''))

    ok, detail = check_expect(case, status, data)
    if ok and case.get('validate'):
        try:
            ok, vd = case['validate'](status, data, ctx)
            if not ok:
                detail = vd
        except Exception as e:
            ok, detail = False, 'validate 异常: %r' % e

    if ok:
        log.ok('%s → %s' % (name, detail))
        results.add(group, name, 'PASS', detail)
    else:
        log.bad('%s → %s' % (name, detail))
        results.add(group, name, 'FAIL', detail)

    if case.get('cleanup'):
        try:
            case['cleanup'](ctx)
        except Exception as e:
            log.warn('清理回调异常 (%s): %r' % (name, e))


# ════════════════════════════════════════════════════════════════
# 离线检查执行器
# ════════════════════════════════════════════════════════════════

def run_offline_check(entry, root, log, results):
    """entry = (name, fn)；fn(root) -> (ok, detail)。"""
    name, fn = entry
    log.test(name)
    try:
        ok, detail = fn(root)
    except Exception as e:
        ok, detail = False, '检查函数异常: %r' % e
    if ok:
        log.ok('%s → %s' % (name, detail))
        results.add('离线静态检查', name, 'PASS', detail)
    else:
        log.bad('%s → %s' % (name, detail))
        results.add('离线静态检查', name, 'FAIL', detail)


# ════════════════════════════════════════════════════════════════
# 自动发现：routes.py 路径 ↔ 注册表比对
# ════════════════════════════════════════════════════════════════

def extract_route_paths(server_dir):
    """从 server 包源码提取全部路由路径（/api/... 及 /admin/_store/...）。

    v6.0.0 起 handler 按功能域拆到多个 api_*.py，故扫描目录下全部 .py。
    """
    paths = set()
    py_files = []
    if os.path.isdir(server_dir):
        for fn in os.listdir(server_dir):
            if fn.endswith('.py') and fn != '__init__.py':
                py_files.append(os.path.join(server_dir, fn))
    else:
        py_files = [server_dir]
    for fp in py_files:
        with open(fp, encoding='utf-8-sig') as f:
            src = f.read()
        for m in re.finditer(r"path\s*(?:!=\s*'([^']+)'|==\s*'([^']+)')", src):
            p = m.group(1) or m.group(2)
            if p.startswith('/'):
                paths.add(p)
        # 处理 handle_get_files 这类正则路由：/api/<name>-files
        if re.search(r"re\.match\(r'\^/api/\(\\w\+\)-files", src):
            paths.add('/api/{name}-files')
    return paths


def discover_uncovered(routes_py, api_cases, log):
    """比对注册表与 routes.py 实际路径，输出未覆盖警告。返回未覆盖列表。"""
    covered = set()
    for c in api_cases:
        p = c['path']
        # 归一化：/api/roster/{class} 与 /api/roster/classes 这类动态路径
        covered.add(p)
    try:
        actual = extract_route_paths(routes_py)
    except Exception as e:
        log.warn('自动发现失败（无法解析 routes.py）: %r' % e)
        return []

    def _norm(p):
        n = p.split('?')[0]  # 剥离 query
        n = re.sub(r'^/api/(?:chemistry|english|enword)-files$', '/api/{name}-files', n)
        return re.sub(r'\{[^}]+\}', '{var}', n)

    uncovered = []
    for p in sorted(actual):
        if _norm(p) in covered or _norm(p) in {_norm(c) for c in covered}:
            continue
        uncovered.append(p)
    if uncovered:
        for p in uncovered:
            log.warn('routes.py 中存在但未注册用例的路径：%s' % p)
    else:
        log.info('自动发现：routes.py 全部 %d 个路由路径均有测试用例覆盖' % len(actual))
    return uncovered


# ════════════════════════════════════════════════════════════════
# 汇总输出
# ════════════════════════════════════════════════════════════════

def print_summary(results, log, uncovered):
    log.grp('最终汇总')
    for g in results.group_names():
        c = results.group_counts(g)
        log.info('%-22s 通过 %-3d 失败 %-3d 警告 %-3d 跳过 %-3d' %
                 (g, c['pass'], c['fail'], c['warn'], c['skip']))
    t = results.totals()
    total = t['pass'] + t['fail'] + t['warn'] + t['skip']
    log.info('─' * 60)
    log.info('总计 %-3d 项 | 通过 %-3d | 失败 %-3d | 警告 %-3d | 跳过 %-3d' %
             (total, t['pass'], t['fail'], t['warn'], t['skip']))
    if uncovered:
        log.warn('未覆盖路由 %d 条（见上方 WARN）' % len(uncovered))
    fails = results.failures()
    if fails:
        log.bad('失败项回放（%d 项）：' % len(fails))
        for i, f in enumerate(fails, 1):
            log.bad('  %2d. [%s] %s — %s' % (i, f['group'], f['name'], f['detail']))
    return t, fails
