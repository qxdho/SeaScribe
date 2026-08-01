# -*- coding: utf-8 -*-
"""SeaScribe 独立调试工具（CLI）。

用法：
  python debug_api.py                      # 离线检查 + 在线全量 API 测试
  python debug_api.py --skip-online        # 只做离线静态检查
  python debug_api.py --safe               # 跳过会改动数据的用例（预留扩展）
  python debug_api.py --list               # 打印全部检查项与 API 用例清单
  python debug_api.py --plain              # 纯文本输出（无 ANSI 颜色）
  python debug_api.py --url http://host:9060 --admin-user x --admin-pass y
  python debug_api.py --strict-warn        # 有 WARN 也视为失败（退出码 2）

设计：引擎在 debug/engine.py，离线检查项在 debug/checks.py，
API 用例注册表在 debug/tests.py。新增检查/用例只改注册表，不改引擎。
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from debug import engine
from debug.engine import Log, Results, HttpClient, run_case, run_offline_check
from debug.checks import OFFLINE_CHECKS
from debug import tests


# ── 密码输入（Windows 控制台显示星号） ──────────────────────────

def _star_input(prompt):
    """逐字符读取，无回显、以 * 显示已输入位数（Windows msvcrt）。"""
    import msvcrt
    sys.stdout.write(prompt)
    sys.stdout.flush()
    chars = []
    while True:
        ch = msvcrt.getwch()
        if ch in ('\r', '\n'):
            break
        if ch == '\b':  # 退格
            if chars:
                chars.pop()
                sys.stdout.write('\b \b')
                sys.stdout.flush()
            continue
        if ch == '\x03':  # Ctrl+C
            raise KeyboardInterrupt
        if ch == '\x00':  # 功能键前缀，丢弃下一字节
            msvcrt.getwch()
            continue
        chars.append(ch)
        sys.stdout.write('*')
        sys.stdout.flush()
    sys.stdout.write('\n')
    sys.stdout.flush()
    return ''.join(chars)


def read_password(prompt):
    """交互式密码输入：Windows 控制台显示星号；非交互环境降级为 getpass（黑屏）。"""
    if sys.stdin.isatty() and sys.stdout.isatty():
        try:
            return _star_input(prompt)
        except Exception:
            pass
    import getpass
    return getpass.getpass(prompt)


# ── 全局兜底清理 ─────────────────────────────────────────────────

def global_cleanup(ctx, log):
    """清理 debugtest_ 残留：临时用户 / picker 名单 / english 文件。"""
    root = ctx.get('_root', '.')
    cleaned = []
    http = ctx.get('_http')

    # 1. 临时用户（通过 API 删除；admin token 仍有效时）
    for uname in ('debugtest_u1', 'debugtest_stu'):
        if ctx.get('_users_created', '').find(uname) >= 0 or True:
            try:
                st, data, _ = http.request('POST', '/api/admin/users/%s/delete' % uname,
                                           body={}, token=http.tokens.get('admin'))
                if st in (200, 404):
                    cleaned.append('用户 ' + uname)
            except Exception:
                pass

    # 2. picker 临时名单
    fp = os.path.join(root, 'data', 'picker', 'debugtest_list.json')
    if os.path.isfile(fp):
        try:
            os.remove(fp)
            cleaned.append('picker 临时名单')
        except OSError:
            pass

    # 3. english 临时文件
    fp = os.path.join(root, 'data', 'english', 'debugtest_upload.csv')
    if os.path.isfile(fp):
        try:
            os.remove(fp)
            cleaned.append('english 临时文件')
        except OSError:
            pass

    if cleaned:
        log.info('全局清理完成：' + '、'.join(cleaned))
    else:
        log.info('全局清理：无残留')


# ── 主流程 ───────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description='SeaScribe 独立调试工具')
    ap.add_argument('--url', default='http://127.0.0.1:9060',
                    help='服务器地址（默认 http://127.0.0.1:9060；勿用 localhost，避免 IPv6 回退 2 秒延迟）')
    ap.add_argument('--admin-user', default='admin', help='管理员用户名（默认 admin）')
    ap.add_argument('--admin-pass', default=None, help='管理员密码（不传则交互式输入）')
    ap.add_argument('--skip-online', action='store_true', help='只做离线静态检查，不调用服务器')
    ap.add_argument('--safe', action='store_true', help='跳过会改动数据的用例（预留）')
    ap.add_argument('--list', action='store_true', help='打印全部检查项与 API 用例后退出')
    ap.add_argument('--plain', action='store_true', help='纯文本输出（无 ANSI 颜色）')
    ap.add_argument('--strict-warn', action='store_true', help='存在 WARN 时退出码为 2')
    args = ap.parse_args()

    log = Log(plain=args.plain)
    results = Results()

    # ── --list ──
    if args.list:
        log.grp('离线静态检查项')
        for name, _ in OFFLINE_CHECKS:
            log.info('  [离线] ' + name)
        log.grp('在线 API 用例（%d 条）' % len(tests.API_CASES))
        for c in tests.API_CASES:
            auth = c.get('auth') or '公开'
            log.info('  [%s] %s %s' % (auth, c['method'], c['path']))
        return 0

    root = os.path.dirname(os.path.abspath(__file__))
    ctx = {
        '_root': root,
        '_http': None,
        'admin_user': args.admin_user,
        'admin_pass': args.admin_pass,
    }

    # ── 离线静态检查 ──
    log.grp('离线静态检查')
    for entry in OFFLINE_CHECKS:
        run_offline_check(entry, root, log, results)

    # ── 自动发现：routes.py 未覆盖路径 ──
    log.grp('自动发现')
    uncovered = []
    if not args.skip_online:
        uncovered = engine.discover_uncovered(
            os.path.join(root, 'main', 'server', 'routes.py'), tests.API_CASES, log)
        if uncovered:
            for p in uncovered:
                results.add('自动发现', p, 'WARN', 'routes.py 中未注册用例的路径')

    # ── 在线 API 测试 ──
    if not args.skip_online:
        if not args.admin_pass:
            try:
                args.admin_pass = read_password('请输入管理员密码（%s）: ' % args.admin_user)
            except (EOFError, KeyboardInterrupt):
                log.bad('未提供管理员密码，跳过在线 API 测试')
                args.skip_online = True
            else:
                if not args.admin_pass:
                    log.bad('密码为空，跳过在线 API 测试')
                    args.skip_online = True
                else:
                    ctx['admin_pass'] = args.admin_pass
    if not args.skip_online:
        http = HttpClient(args.url)
        ctx['_http'] = http
        ctx['_case_total'] = len(tests.API_CASES)
        log.grp('在线 API 测试（%s）' % args.url)
        for case in tests.API_CASES:
            run_case(case, http, ctx, log, results)

    # ── 汇总 ──
    t, fails = engine.print_summary(results, log, uncovered)

    # ── 全局清理 ──
    if not args.skip_online:
        global_cleanup(ctx, log)

    if fails:
        return 1
    if args.strict_warn and (t['warn'] or uncovered):
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
