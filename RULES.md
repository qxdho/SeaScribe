# SeaScribe 编码规范

> 每次修改代码前阅读本文档，避免重复犯错。

---

## 一、文件操作

### 禁止 PowerShell 写文件

**严禁**使用 PowerShell 写入或修改任何文本文件。`Out-File`、`Set-Content`、`>`、`-replace | Set-Content` 一律禁止。

原因：破坏 UTF-8 编码、添加 BOM、损坏中文等多字节字符。

必须使用 `write_file` / `edit_file` 工具。紧急编码修复用 `[System.IO.File]` .NET 方法并明确指定 UTF8Encoding(false)。

### 路径管理

- 移动文件后必须更新所有 `src`、`href`、`fetch` 路径
- `server.py` 不要 `os.chdir` 到子目录，从根目录提供服务
- 用 `write_file` 重写整个文件后，逐项确认 addEventListener、HTML id/class、src/href 路径一致

### 编码格式

- 所有文本文件 UTF-8 无 BOM
- CSV 文件 UTF-8 无 BOM，服务器 `mimetypes` 带 `charset=utf-8`

---

## 二、版本与 Git

### 语义化版本

| 级别 | 场景 | 示例 |
|------|------|------|
| PATCH `vX.Y.Z` | 修 bug、样式微调 | v4.3.1 → v4.3.2 |
| MINOR `vX.Y.0` | 新功能、新增插件、配置扩展 | v4.3.0 → v4.4.0 |
| MAJOR `vX.0.0` | 架构变更、不兼容 API | v4.0.0 → v5.0.0 |

### 发版流程

1. 改代码
2. 更新 `UPDATE.md`（只写与上一版的区别，面向用户，避免实现细节）
3. `git add -A && git commit -m "<type>: <描述>"`
4. `git tag -a vX.Y.Z -m "..."`
5. `git push && git push --tags`

### Commit 规范

- `feat:` — 新功能
- `fix:` — bug 修复
- `chore:` — 工程化调整
- `docs:` — 仅文档变更

### 不入库文件

- `admin/_store/` — 用户数据、名单、会话
- `data/` — 学科数据、点名时间戳
- `.reasonix/` — AI 工具元数据

---

## 三、配置规范

- JS 中**零硬编码兜底**（不允许 `|| 4`、`|| 12` 等魔法数字）
- 配置项命名 camelCase：`gridColumns` / `listColumns` / `gridFontSize` / `listFontSize`
- 每个模式的列数和字号独立存储和恢复
- 配置文件放 `config/` 目录，按模块分文件夹

---

## 四、架构约定

### 模块结构

**主站 JS**（加载顺序即依赖顺序）：
```
core.js         → SubjectRegistry + SeaScribe.esc() + SeaScribe.delay()
engine.js       → SeaScribe.shuffleAndPick()
theme.js        → SeaScribe.applyTheme()
navigator.js    → SeaScribe.switchToPage()
controls.js     → 字号/列数/布局/数量控件
cards.js        → 学科页渲染 + 卡片 + shuffle + 答案展开
plugin-utils.js → PluginUtils 公共方法
modal.js        → 弹窗关闭绑定
picker/         → random.js → timestamp.js → animation.js → display.js → index.js
markdown.js     → SeaScribe.renderMarkdown()
changelog.js    → 更新日志弹窗
splash.js       → 开屏动画 + 系统日志
about.js        → 关于弹窗
app.js          → 入口：注册插件、绑定菜单
```

**管理后台 JS**：
```
common.js        → Admin API/session/esc/toast/主题切换
custom-select.js → CustomSelect 组件
router.js        → PageRegistry 路由
pages/*.js       → 6 个页面模块（profile/users/roster/records/files/config）
auth.js          → 登录/登出/注册/绑定姓名
app.js           → 入口
```

### 命名约定

- 变量/函数 camelCase，CSS 类 kebab-case
- 每个 JS 文件 IIFE 包裹：`(function() { ... })()`
- DOM 查询优先 ID（`getElementById`），其次 class（`querySelector`）
- 弹窗显隐用 `.hidden` class（opacity + pointer-events 过渡）

### 动画

- 优先 CSS `@keyframes`，不用 JS `element.animate()`
- 可用全局缓动变量：`var(--ease)`、`var(--spring)`、`var(--ease-out)`

---

## 五、安全与数据

### 服务器安全

- 用户输入文件名先 `os.path.basename()` 防路径穿越
- 请求体大小限制：普通 API 1MB，上传 60MB
- `send_json` 包裹 try/except 静默连接中断异常
- 昵称 ≤100 字符，头像 URL ≤2000 字符

### 鉴权

- 密码 PBKDF2-HMAC-SHA256 600k 迭代
- Session 4 小时过期，自动清理
- Cookie（HttpOnly + SameSite=Strict）+ Bearer Header 双通道
- 登录限流：同 IP 5 次/60s

### 数据

- 学生名单 JSON 格式：`[{"name":"姓名","signature":"签名"}, ...]`
- 文件名为班级名：`admin/_store/roster/11班.json`
- 签名双向同步：管理后台 ↔ roster JSON ↔ users.json

---

## 六、表单无障碍

- 每个 `<input>` / `<select>` / `<textarea>` 必须有 `id` 或 `name`
- 每个 `<label>` 必须有 `for` 关联到表单元素 `id`
- 动态生成 HTML 后必须检查上述两条
