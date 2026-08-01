# SeaScribe 编码规范

> 每次修改代码前阅读本文档。

---

## 一、文件操作

### 禁止 PowerShell 写文件（最高优先级，违反必究）
- **严禁**使用 PowerShell 写入/修改任何文本文件！`Out-File`、`Set-Content`、`>`、`>>`、`-replace` 管道一律禁止
- 原因：破坏 UTF-8 编码、添加 BOM、损坏中文等多字节字符
- **必须**使用 `write_file` / `edit_file` 工具，或 Python 脚本写文件（仅用于清理类操作）
- 历史教训：
  - 2026-07-12：`-replace | Set-Content` 导致 `server.py` 中文全部乱码
  - 2026-07-20：`-replace | Set-Content` 导致 `debug/tests.py` 乱码 + BOM + 缩进损坏
- 每次动手写文件前先自问：我是不是在用 PowerShell 写文件？如果是，立刻改用工具

### 路径管理
- 移动文件后必须更新所有 `src`、`href`、`fetch` 路径
- 重写文件后逐项确认 addEventListener、HTML id/class、src/href 一致

### 编码格式
- 所有文本文件 UTF-8 无 BOM
- CSV 文件 UTF-8 无 BOM

---

## 二、版本与 Git

| 级别 | 场景 |
|------|------|
| PATCH `vX.Y.Z+1` | 修 bug、样式微调 |
| MINOR `vX+1.Y.0` | 新功能、重构、配置扩展 |
| MAJOR `vX+1.0.0` | 架构变更、不兼容 API |

发版流程：改代码 → 更新 UPDATE.md → commit → tag → push --tags

### 不入库
- `data/` — 所有运行时数据（users/sessions/avatars/roster/picker/学科）
- `.reasonix/` — AI 工具元数据

---

## 三、配置规范
- JS 中零硬编码冗余
- 配置项 camelCase，放 `config/` 目录按模块分文件
- 统一使用 `window._CONF.{namespace}` 结构，保留向后兼容变量名

---

## 四、架构约定

### 后端 (`main/server/`)
```
config.py    常量（PORT, 路径, 限制, MIME）
auth.py      用户/密码/会话/令牌/限流/操作日志/_require_auth
api_common.py  公共辅助（user_to_dict / MIME_MAP / _parse_json_body）
api_auth.py    鉴权与会话 handler（登录/登出/注册/会话）
api_user.py    用户管理 handler（资料/创建/修改/删除/头像查询）
api_roster.py  花名册 handler
api_picker.py  点名时间戳/记录 handler
api_config.py  配置读存 handler
api_file.py    学科文件/英语/头像 handler
api_log.py     操作日志 handler
routes.py      API 聚合入口（19 GET + 15 POST 分发列表）
server.py      入口 + Handler 类 + translate_path + 静态文件服务
```
新增 handler：在对应 api_*.py 实现后，追加到 routes.py 的分发列表。

### 前端 JS

**主站加载顺序**：
```
core → engine → theme → navigator → controls → cards
→ plugin-utils → [plugin configs + plugins]
→ modal → [picker/*] → markdown → changelog → splash → about
→ custom-select → app
```

**管理后台加载顺序**：
```
common → router → custom-select → [pages/*] → auth → app
```

### 前端 CSS

```
theme.css          设计令牌 + 主题色（主站+后台共享）
base.css           重置 + body + 滚动条
custom-select.css  CustomSelect 组件（主站+后台共享）
controls.css       控件/按钮/输入框
cards.css          听写卡片
pages.css          页面过渡 + 学科卡片
changelog.css      弹窗
picker.css         点名系统
topbar.css         顶栏
splash.css         开屏
responsive.css     响应式
```

### 命名约定
- 变量/函数 camelCase，CSS 类 kebab-case
- JS 文件 IIFE 包裹：`(function() { ... })()`
- DOM 查询优先 ID，其次 class
- 弹窗显隐用 `.hidden` class

### 性能规则
- **禁止** `filter: blur()` — 每帧重绘纹理，低端机卡顿
- **禁止** `backdrop-filter` — 实时模糊背景极耗 GPU
- **避免** `rotateX/Y` 3D 变换 — 触发 3D 渲染管线
- 动画仅用 `opacity` + `transform: translate/scale/rotate`
- 全屏元素动画优先用 `will-change` 预提示

---

## 五、安全与数据

### 服务器
- 文件名 `os.path.basename()` 防路径穿越
- 请求体限制：API 1MB / 上传 60MB
- `send_json` 包装 try/except 静默连接中断
- 昵称 ≤200 字符，头像 URL ≤2000 字符

### 鉴权
- PBKDF2-HMAC-SHA256 600k 迭代
- Session 30天过期 + Cookie HttpOnly SameSite=Strict + Bearer Header 双通道
- 登录限流：同 IP 5 次 / 60s
- 所有引用 `user` 的 handler 必须前置 `require_auth` 或 `require_role`

### 数据格式
- 名单：`[{"name":"姓名","signature":"签名"}, ...]`，JSON UTF-8
- 文件名即班级名：`data/roster/11班.json`

---

## 六、无障碍

- `<input>` / `<select>` / `<textarea>` 必须有 `id` 或 `name`
- `<label>` 必须 `for` 关联到表单元素 `id`
- 动态生成 HTML 后必须检查
