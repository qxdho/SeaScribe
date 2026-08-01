# -*- coding: utf-8 -*-
"""SeaScribe 在线 API 测试用例注册表（声明式）。

新增 API 测试：向 API_CASES 追加一条 dict 即可，引擎自动执行、自动汇总。
字段约定见 debug/engine.py 的 run_case 注释：
  group/name/method/path/auth/body/expect/validate/cleanup/skip
临时数据统一使用 debugtest_ 前缀，由全局清理兜底。
"""

# 1x1 红色 PNG（测试头像上传用）
_TINY_PNG = ('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwA'
             'EhQGAhKmMIQAAAABJRU5ErkJggg==')

PREFIX = 'debugtest_'


# ── 辅助回调 ────────────────────────────────────────────────────

def _save_admin_token(status, data, ctx):
    if isinstance(data, dict) and data.get('token'):
        ctx['_http'].tokens['admin'] = data['token']
        return True, '已取得 admin token'
    return False, '登录响应缺少 token: %r' % data


def _save_student_token(status, data, ctx):
    if isinstance(data, dict) and data.get('token'):
        ctx['_http'].tokens['student'] = data['token']
        return True, '已取得 student token'
    return False, '登录响应缺少 token: %r' % data


def _save_classes(status, data, ctx):
    if isinstance(data, list) and data:
        ctx['first_class'] = data[0]
        ctx['roster_classes'] = data
    return True, '班级列表 %d 个' % (len(data) if isinstance(data, list) else 0)


def _save_roster_backup(status, data, ctx):
    ctx['roster_backup'] = {ctx.get('first_class', ''): data} if data else {}
    if isinstance(data, list) and data and isinstance(data[0], dict) and data[0].get('name'):
        ctx['first_student_name'] = data[0]['name']
    return True, '已备份花名册 %s' % ctx.get('first_class', '(空)')


def _profile_backup(status, data, ctx):
    if isinstance(data, dict) and isinstance(data.get('user'), dict):
        ctx['admin_nickname'] = data['user'].get('nickname', '')
        return True, '已备份 nickname'
    return False, 'session 响应缺少 user: %r' % data


def _restore_profile(ctx):
    nick = ctx.get('admin_nickname', '')
    ctx['_http'].request('POST', '/api/admin/profile',
                         body={'nickname': nick or 'debugtest_orig'},
                         token=ctx['_http'].tokens.get('admin'))


def _config_backup(status, data, ctx):
    if isinstance(data, dict) and 'content' in data:
        ctx['config_main'] = data['content']
        return True, '已备份 config/main'
    return False, 'config 响应缺少 content: %r' % data


def _avatar_save_url(status, data, ctx):
    if isinstance(data, dict) and data.get('url'):
        ctx.setdefault('avatar_urls', []).append(data['url'])
        return True, 'url=' + data['url']
    return False, '响应缺少 url: %r' % data


def _avatar_cleanup(ctx):
    for url in ctx.get('avatar_urls', []):
        if ctx.get('_root'):
            import os
            name = os.path.basename(url)
            p = os.path.join(ctx['_root'], 'data', 'avatars', name)
            if os.path.isfile(p):
                os.remove(p)
    ctx.pop('avatar_urls', None)


def _tmp_user_cleanup(ctx):
    """兜底删除临时用户（正常流程已删则无操作）。"""
    if ctx.get('tmp_user'):
        ctx['_http'].request('POST', '/api/admin/users/%s/delete' % ctx['tmp_user'],
                             body={}, token=ctx['_http'].tokens.get('admin'))


def _stu_cleanup(ctx):
    if ctx.get('student_username'):
        ctx['_http'].request('POST', '/api/admin/users/%s/delete' % ctx['student_username'],
                             body={}, token=ctx['_http'].tokens.get('admin'))


# ── 用例注册表 ───────────────────────────────────────────────────

API_CASES = [
    # ══════════ 公开 API 组 ══════════
    {'group': '公开 API', 'name': '主站首页', 'method': 'GET', 'path': '/',
     'expect': {'status': 200, 'text_contains': 'SeaScribe'}},
    {'group': '公开 API', 'name': '管理后台页', 'method': 'GET', 'path': '/admin/',
     'expect': {'status': 200}},
    {'group': '公开 API', 'name': 'favicon 重定向', 'method': 'GET', 'path': '/favicon.ico',
     'expect': {'status_in': [200, 301]}},
    {'group': '公开 API', 'name': '花名册班级列表', 'method': 'GET', 'path': '/api/roster/classes',
     'expect': {'status': 200}, 'validate': _save_classes},
    {'group': '公开 API', 'name': '花名册详情', 'method': 'GET', 'path': '/api/roster/{first_class}',
     'skip': lambda ctx: not ctx.get('first_class'), 'skip_reason': '无班级数据',
     'expect': {'status': 200}, 'validate': _save_roster_backup},
    {'group': '公开 API', 'name': '用户签名列表', 'method': 'GET', 'path': '/api/user-signatures',
     'expect': {'status': 200}},
    {'group': '公开 API', 'name': '学科文件-化学', 'method': 'GET', 'path': '/api/chemistry-files',
     'expect': {'status': 200}},
    {'group': '公开 API', 'name': '学科文件-英语', 'method': 'GET', 'path': '/api/english-files',
     'expect': {'status': 200}},
    {'group': '公开 API', 'name': '学科文件-跟读', 'method': 'GET', 'path': '/api/enword-files',
     'expect': {'status': 200}},
    {'group': '公开 API', 'name': '非法目录拒绝', 'method': 'GET', 'path': '/api/zzz-files',
     'expect': {'status': 403}},
    {'group': '公开 API', 'name': '未登录访问会话接口', 'method': 'GET', 'path': '/api/admin/session',
     'expect': {'status': 401}},
    {'group': '公开 API', 'name': '未登录访问用户列表', 'method': 'GET', 'path': '/api/admin/users',
     'expect': {'status': 401}},
    {'group': '公开 API', 'name': '用户头像查询', 'method': 'GET', 'path': '/api/admin/user-avatar?name={first_student_name}',
     'skip': lambda ctx: not ctx.get('first_student_name'), 'skip_reason': '无学生姓名数据',
     'expect': {'status': 200},
     'validate': lambda s, d, ctx: (True, '') if isinstance(d, dict) and 'name' in d else (False, '响应缺少 name: %r' % d)},

    # ══════════ admin 登录态组 ══════════
    {'group': 'admin 登录态', 'name': 'admin 登录', 'method': 'POST', 'path': '/api/admin/login',
     'body': lambda ctx: {'username': ctx['admin_user'], 'password': ctx['admin_pass']},
     'expect': {'status': 200}, 'validate': _save_admin_token},
    {'group': 'admin 登录态', 'name': '会话信息', 'method': 'GET', 'path': '/api/admin/session',
     'auth': 'admin', 'expect': {'status': 200}, 'validate': _profile_backup},
    {'group': 'admin 登录态', 'name': '我的会话列表', 'method': 'GET', 'path': '/api/admin/sessions',
     'auth': 'admin', 'expect': {'status': 200}},
    {'group': 'admin 登录态', 'name': '操作日志', 'method': 'GET', 'path': '/api/admin/logs',
     'auth': 'admin', 'expect': {'status': 200}},
    {'group': 'admin 登录态', 'name': '上次点名时间', 'method': 'GET', 'path': '/api/user/last-pick',
     'auth': 'admin', 'expect': {'status': 200}},
    {'group': 'admin 登录态', 'name': '我的班级', 'method': 'GET', 'path': '/api/user/class',
     'auth': 'admin', 'expect': {'status': 200}},
    {'group': 'admin 登录态', 'name': '保存资料（原值恢复）', 'method': 'POST', 'path': '/api/admin/profile',
     'auth': 'admin',
     'body': lambda ctx: {'nickname': 'debugtest_nick'},
     'expect': {'status': 200, 'ok_field': 'ok'},
     'cleanup': _restore_profile},
    {'group': 'admin 登录态', 'name': '上传头像', 'method': 'POST', 'path': '/api/admin/upload/avatar',
     'auth': 'admin',
     'body': lambda ctx: {'filename': 'debugtest.png', 'content': _TINY_PNG},
     'expect': {'status': 200, 'ok_field': 'ok'},
     'validate': _avatar_save_url,
     'cleanup': _avatar_cleanup},
    {'group': 'admin 登录态', 'name': '用户列表', 'method': 'GET', 'path': '/api/admin/users',
     'auth': 'admin', 'expect': {'status': 200}},
    {'group': 'admin 登录态', 'name': '用户详情', 'method': 'GET', 'path': '/api/admin/users/{admin_user}',
     'auth': 'admin', 'expect': {'status': 200}},
    {'group': 'admin 登录态', 'name': '创建临时用户', 'method': 'POST', 'path': '/api/admin/users',
     'auth': 'admin',
     'body': {'username': PREFIX + 'u1', 'password': 'debugtest123', 'role': 'student'},
     'expect': {'status': 200, 'ok_field': 'ok'},
     'validate': lambda s, d, ctx: ctx.update(tmp_user=PREFIX + 'u1') or (True, 'uid=' + d.get('uid', '')),
     'cleanup': _tmp_user_cleanup},
    {'group': 'admin 登录态', 'name': '修改临时用户', 'method': 'POST', 'path': '/api/admin/users/' + PREFIX + 'u1',
     'auth': 'admin',
     'body': {'nickname': 'debugtest_updated'},
     'expect': {'status': 200, 'ok_field': 'ok'}},
    {'group': 'admin 登录态', 'name': '删除临时用户', 'method': 'POST', 'path': '/api/admin/users/' + PREFIX + 'u1' + '/delete',
     'auth': 'admin', 'body': {}, 'expect': {'status': 200, 'ok_field': 'ok'}},
    {'group': 'admin 登录态', 'name': '花名册保存（原值写回）', 'method': 'POST', 'path': '/api/admin/roster',
     'auth': 'admin',
     'skip': lambda ctx: not ctx.get('roster_backup'), 'skip_reason': '无花名册数据',
     'body': lambda ctx: ctx.get('roster_backup', {}),
     'expect': {'status': 200, 'ok_field': 'ok'}},
    {'group': 'admin 登录态', 'name': '花名册空提交拒绝', 'method': 'POST', 'path': '/api/admin/roster',
     'auth': 'admin', 'body': {}, 'expect': {'status': 400}},
    {'group': 'admin 登录态', 'name': '点名时间戳写入', 'method': 'POST', 'path': '/api/picker-timestamps',
     'body': {'list': PREFIX + 'list', 'data': {'debugtest_name': '2026-01-01T00:00:00'}},
     'expect': {'status': 200, 'ok_field': 'ok'}},
    {'group': 'admin 登录态', 'name': '点名时间戳查询', 'method': 'GET', 'path': '/api/picker-timestamps?list=' + PREFIX + 'list',
     'expect': {'status': 200},
     'validate': lambda s, d, ctx: (True, '') if isinstance(d, dict) and 'debugtest_name' in d else (False, '未读到刚写入的数据: %r' % d)},
    {'group': 'admin 登录态', 'name': '点名时间戳删除单条', 'method': 'POST', 'path': '/api/admin/picker-timestamps/delete',
     'auth': 'admin',
     'body': {'list': PREFIX + 'list', 'name': 'debugtest_name'},
     'expect': {'status': 200, 'ok_field': 'ok'}},
    {'group': 'admin 登录态', 'name': '点名时间戳清空', 'method': 'POST', 'path': '/api/admin/picker-timestamps/clear',
     'auth': 'admin', 'body': {'list': PREFIX + 'list'},
     'expect': {'status': 200, 'ok_field': 'ok'}},
    {'group': 'admin 登录态', 'name': 'admin 二次登录（会话清理用）', 'method': 'POST', 'path': '/api/admin/login',
     'body': lambda ctx: {'username': ctx['admin_user'], 'password': ctx['admin_pass']},
     'expect': {'status': 200},
     'validate': lambda s, d, ctx: (ctx.update(admin2_token=d.get('token')) or (True, '已取得 admin2 token'))
                                    if isinstance(d, dict) and d.get('token') else (False, '缺少 token: %r' % d)},
    {'group': 'admin 登录态', 'name': '强制退出会话', 'method': 'POST', 'path': '/api/admin/sessions',
     'auth': 'admin',
     'skip': lambda ctx: not ctx.get('admin2_token'), 'skip_reason': 'admin 二次登录失败',
     'body': lambda ctx: {'token': ctx['admin2_token']},
     'validate': lambda s, d, ctx: (True, '') if s == 200 else (False, '状态码 %s' % s)},

    # ══════════ admin/teacher 组 ══════════
    {'group': 'admin/teacher', 'name': '读取配置', 'method': 'GET', 'path': '/api/admin/config/main',
     'auth': 'admin', 'expect': {'status': 200}, 'validate': _config_backup},
    {'group': 'admin/teacher', 'name': '保存配置（原值写回）', 'method': 'POST', 'path': '/api/admin/config/main',
     'auth': 'admin',
     'body': lambda ctx: {'content': ctx.get('config_main', '')},
     'expect': {'status': 200, 'ok_field': 'ok'}},
    {'group': 'admin/teacher', 'name': '点名记录', 'method': 'GET', 'path': '/api/admin/records',
     'auth': 'admin', 'expect': {'status': 200}},
    {'group': 'admin/teacher', 'name': '英语文件列表', 'method': 'GET', 'path': '/api/admin/english-files',
     'auth': 'admin', 'expect': {'status': 200}},
    {'group': 'admin/teacher', 'name': '英语文件上传', 'method': 'POST', 'path': '/api/admin/upload/english',
     'auth': 'admin',
     'body': {'filename': PREFIX + 'upload.csv', 'content': 'aGVsbG8='},  # base64('hello')
     'expect': {'status': 200, 'ok_field': 'ok'}},
    {'group': 'admin/teacher', 'name': '英语文件删除', 'method': 'POST', 'path': '/api/admin/delete-file/english',
     'auth': 'admin', 'body': {'filename': PREFIX + 'upload.csv'},
     'expect': {'status': 200, 'ok_field': 'ok'}},

    # ══════════ 学生组（含越权） ══════════
    {'group': '学生端', 'name': '学生注册', 'method': 'POST', 'path': '/api/admin/register',
     'body': {'username': PREFIX + 'stu', 'nickname': '调试学生', 'password': 'debugtest123'},
     'expect': {'status': 200},
     'validate': _save_student_token},
    {'group': '学生端', 'name': '学生登录', 'method': 'POST', 'path': '/api/admin/login',
     'body': {'username': PREFIX + 'stu', 'password': 'debugtest123'},
     'expect': {'status': 200}, 'validate': _save_student_token},
    {'group': '学生端', 'name': '学生上传头像', 'method': 'POST', 'path': '/api/admin/upload/avatar',
     'auth': 'student',
     'body': {'filename': 'stu.png', 'content': _TINY_PNG},
     'expect': {'status': 200, 'ok_field': 'ok'},
     'validate': _avatar_save_url,
     'cleanup': _avatar_cleanup},
    {'group': '学生端', 'name': '学生越权-用户列表', 'method': 'GET', 'path': '/api/admin/users',
     'auth': 'student', 'expect': {'status': 403}},
    {'group': '学生端', 'name': '学生越权-读取配置', 'method': 'GET', 'path': '/api/admin/config/main',
     'auth': 'student', 'expect': {'status': 403}},
    {'group': '学生端', 'name': '学生越权-花名册', 'method': 'GET', 'path': '/api/admin/roster',
     'auth': 'student', 'expect': {'status': 403}},
    {'group': '学生端', 'name': '学生越权-英语文件', 'method': 'GET', 'path': '/api/admin/english-files',
     'auth': 'student', 'expect': {'status': 403}},
    {'group': '学生端', 'name': '学生越权-创建用户', 'method': 'POST', 'path': '/api/admin/users',
     'auth': 'student', 'body': {'username': 'hacker', 'password': 'debugtest123'},
     'expect': {'status': 403}},
    {'group': '学生端', 'name': '删除临时学生', 'method': 'POST', 'path': '/api/admin/users/' + PREFIX + 'stu' + '/delete',
     'auth': 'admin', 'body': {}, 'expect': {'status': 200, 'ok_field': 'ok'},
     'cleanup': _stu_cleanup},
    {'group': '学生端', 'name': '退出登录（admin）', 'method': 'POST', 'path': '/api/admin/logout',
     'auth': 'admin', 'body': {}, 'expect': {'status': 200, 'ok_field': 'ok'}},
]
