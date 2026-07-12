# ⚠️ 编码注意事项

> 每次修改代码前必须阅读本文档，避免重复犯同样的错误。

---

## 1. 路径管理

- 移动文件后**必须**更新所有 `src`、`href`、`fetch` 路径
- `server.py` 不要 `os.chdir` 到子目录，从根目录提供服务
- 部署时用户上传的是目录**内容**，不含外层文件夹名

## 2. 文件重写检查清单

用 `write_file` 重写整个文件后，逐项确认：

- [ ] 所有 `addEventListener` 都在
- [ ] HTML `id` 和 JS `getElementById` 一致
- [ ] `src`/`href` 路径正确

## 3. 配置规则

- JS 中**零硬编码兜底**（不允许 `|| 4`、`|| 2`、`|| 12`）
- 配置项命名规范：`gridColumns`/`listColumns`、`gridFontSize`/`listFontSize`
- 每个模式的列数和字号独立存储和恢复

## 4. 全局替换

- **禁用** PowerShell `-replace` 做全局正则替换（可能破坏注释、合并行、损坏 Unicode）
- 必须用 `edit_file` 做精准替换

## 5. 不执行未知脚本

- 第三方配对/安装脚本需要对应运行时环境
- 不在 SeaScribe 项目中执行与项目无关的命令

## 6. Git 工作流

- 每次改动后提交：`git add -A && git commit -m "<type>: <描述>"`
- commit message 规范：
  - `feat:` 新功能 / 新学科插件
  - `fix:` bug 修复
  - `chore:` 工程化调整（配置、忽略规则等）
  - `docs:` 仅文档变更
- **禁止**提交 `data/` 目录内容（学生名单/词表等隐私数据）
- `.reasonix/` 不入库（已在 `.gitignore` 中）

## 7. 版本号管理

- 遵循语义化版本（SemVer）：`v<MAJOR>.<MINOR>.<PATCH>`
- AI 自行判断改动量，无需询问用户：
  - **PATCH** `v3.0.x`：修 bug、小调整、样式微调
  - **MINOR** `v3.x.0`：新功能、新增学科插件、配置项扩展
  - **MAJOR** `vx.0.0`：重大架构变更、不兼容的 API 改动
- 发版流程：改代码 → 更新 `UPDATE.md` → commit → `git tag -a vX.Y.Z -m "..."` → `git push && git push --tags`
- **更新日志写法**：
  - 保持专业简洁，面向用户，避免内部术语（不写"plugin.js""z-index"等实现细节）
  - 只写与上一版本的区别，不重复描述已有功能
  - 可以提及技术名词（如"CSV 文件""canvas-confetti"），但不过度解释

## 8. GitHub 远程推送

- 远程地址使用 HTTPS（`https://github.com/qxdho/SeaScribe.git`）
- 推送前确认 `data/`、`RULES.md` 等敏感文件不包含在 diff 中
- `.gitignore` 随项目持续维护，新增敏感文件类型时同步更新

## 9. 文件写入规范

- **严禁**使用 PowerShell 写入、修改任何文本文件！包括但不限于：
  - `Out-File`、`Set-Content`、管道 `>`、`>>`
  - `-replace` + `Set-Content`（会破坏 UTF-8 中文编码，导致乱码/语法错误）
  - here-string (`@'...'@`) 管道写入
- 原因：PowerShell 默认操作会破坏 UTF-8 编码、添加 BOM、损坏多字节字符
- **必须**使用 `write_file` 或 `edit_file` 工具修改文本文件
- 紧急编码修复用 `[System.IO.File]` .NET 方法，明确指定 UTF8Encoding(false)
- 教训：2026-07-12 违规使用 `-replace | Set-Content` 导致 server.py 中文 docstring 全部变乱码，费时修复
- CSV 文件必须 UTF-8 无 BOM，服务器 `mimetypes` 必须带 `charset=utf-8`

## 10. CSV / 学生名单规范

- 名单文件放在 `admin/_store/roster/` 下，JSON 格式，UTF-8
- 格式：`[{"name":"姓名","signature":"个性签名"}, ...]`
- 文件名即班级名，如 `11班.json`
- 管理后台「姓名池」页面管理，支持 CSV 批量导入
- 名单通过 `/api/roster/<班级名>` API 获取

## 11. server.py 规范

- 使用 `SimpleHTTPRequestHandler.extensions_map` 覆盖为文本文件添加 `charset=utf-8`
- `/api/<name>-files` 接口自动扫描 `data/<name>/` 目录
- 禁止目录浏览（`list_directory` 返回 404）
- 从根目录提供服务，不 `os.chdir`

## 12. 项目目录结构

- 当前代码在根目录：`index.html`、`server.py`、`start.bat`、`README.md`、`UPDATE.md`、`PLUGINS.md`、`RULES.md`
- 文档：`UPDATE.md`、`PLUGINS.md`、`RULES.md`（根目录）
- 资源：`main/logo.png`、`main/logo.svg`
- 旧版本：`archive/v1.0/`、`archive/v2.0/`
- **不要**在根目录新增零散文件，归类到对应子目录

## 13. 启动日志系统

- `window.__SEASCRIBE_LOG__` 全局数组，存储所有日志
- splash.js 启动时执行 19 项检查，写入 LOG
- console.log/error/warn 被拦截同步写入 LOG
- 顶栏 📋「系统日志」按钮查看完整日志
- 有错误时按钮右上角显示红色数字
- 开屏日志逐行滚动（60ms 间隔），点击或按键关闭

## 14. 点名系统（main/js/picker/）

- 模块化架构：random.js（算法）、timestamp.js（时间戳）、animation.js（动画编排）、display.js（展示）、index.js（入口）
- 配置集中管理：`config/picker/config.js`，所有默认值零硬编码兜底
- 三种随机方式：纯随机（Fisher-Yates）、二分法（每轮洗牌后对半随机淘汰）、时间加权随机法（多轮缩小子集至≤5人，优先未点名者+最长间隔）
- 双层动画：修饰动画（始终运行）+ 过程动画（可选，展示算法真实过程）
- 名单来自 `/api/roster/<班级名>` JSON API，包含 name 和 signature 字段
- 签名双向同步：管理后台编辑 → roster JSON + users.json 同步更新
- 时间戳存储：服务端 `data/picker/` JSON 文件，通过 `/api/picker-timestamps` 读写
- 缩小飞入结果位为固定动画，始终执行

## 15. 通用编码约定

- 所有文本文件 UTF-8 无 BOM
- 中文 UI 文本直接写在 HTML/JS 中，不做 i18n
- 变量命名 camelCase，CSS 类名 kebab-case
- 每个 JS 文件用 IIFE 包裹 `(function() { ... })()`
- DOM 查询优先用 ID（`getElementById`），其次 class（`querySelector`）
- 弹窗用 `.hidden` class 控制显隐（opacity + pointer-events 过渡）
- 动画用 CSS `@keyframes`，不用 JS 动画

## 16. 网络与代理

- Git 推送走 v2ray 代理：`git config http.proxy http://127.0.0.1:10808`
- 远程地址：`https://github.com/qxdho/SeaScribe.git`
- `start.bat` 自动启动服务器并打开浏览器

## 17. 管理后台（admin/）

- `admin/` 独立 SPA，顶栏导航，左上角 logo + "SeaScribe" 可点击跳转主站
- 页面通过 `PageRegistry.register()` 自注册（参照主站 SubjectRegistry 模式）
- JS 模块：`common.js`（API/session/esc/主题切换）、`router.js`（PageRegistry 路由）、`auth.js`（登录/登出/绑定）、`app.js`（入口）
- 页面模块在 `admin/js/pages/` 下：`profile.js`、`users.js`、`config.js`、`files.js`、`records.js`、`roster.js`
- CSS 拆分为 7 个文件（含 `../main/css/theme.css` 复用）：`base.css`、`login.css`、`layout.css`、`components.css`、`config.css`、`responsive.css`
- 新增页面只需：创建 `pages/xxx.js` → `PageRegistry.register({...})` → `index.html` 加 `<script>`，导航和路由自动生效
- 所有 API 路径 `/api/admin/*` 统一鉴权（cookie + Bearer header 双通道）
- RBAC 三种角色：admin（全局）、teacher（英语文件+资料）、student（仅资料+绑定姓名）
- 教师和管理员不需要绑定姓名
- 用户密码 PBKDF2-HMAC-SHA256 600k 迭代存储
- session 4 小时过期，登录 5 次/60s 限流
- 登录按钮点击后显示「登录中…」避免空白等待
- 登录/退出登录/操作结果统一使用右上角 toast 弹窗提示（多弹窗堆叠，可手动关闭）
- 顶栏 🌙/☀️ 按钮支持浅色/深色主题切换（localStorage 持久化，反闪烁内联脚本）
- 所有 CSS 使用 CSS 变量，暗色主题通过 `[data-theme="dark"]` 覆盖
- `admin/_store/` 不入库（`.gitignore`），HTTP 直接访问返回 403

## 18. 主站模块架构

- `core.js`：`SubjectRegistry` 插件注册表 + `SeaScribe.esc()` 全局转义（最先加载）
- `engine.js`：`SeaScribe.shuffleAndPick()` 洗牌算法
- `theme.js`：`SeaScribe.applyTheme()` 主题管理（localStorage key `seascribe_theme`）
- `navigator.js`：页面切换动画 `switchToPage()`
- `controls.js`：字号/列数/布局/数量控件 + `getMaxCount()`/`clampCount()`
- `cards.js`：学科页渲染 `renderSubjectPage()`、听写页卡片渲染、`doShuffle()`、答案展开
- `modal.js`：弹窗关闭绑定（✕ + 遮罩点击）
- `markdown.js`：`SeaScribe.renderMarkdown()` 统一 Markdown→HTML 渲染
- `plugin-utils.js`：`PluginUtils.loadConfig()`/`scanDir()`/`refreshCount()`/`parseCSV()` 插件工具
- `changelog.js`/`splash.js`/`about.js`：更新日志弹窗 / 开屏动画 / 关于弹窗
- `app.js`：入口，注册插件，绑定下拉菜单
- `picker/` 子模块：`index.js`（入口）→ `random.js`（算法）→ `animation.js`（编排）→ `display.js`（展示）+ `timestamp.js`（时间戳）

## 19. server.py 安全规范

- 所有用户输入文件名先 `os.path.basename()` 防路径穿越
- 请求体大小限制：普通 API 1MB，上传 60MB
- 昵称 ≤ 100 字符，头像 URL ≤ 2000 字符
- `send_json` 包裹 try/except 静默 ConnectionAbortedError

## 20. 表单元素无障碍

- 每个 `<input>` / `<select>` / `<textarea>` 必须设置 `id` 或 `name` 属性（二者至少有一个）
- 每个 `<label>` 必须通过 `for` 属性关联到对应表单元素的 `id`
- 动态生成表单元素（innerHTML 拼接）后**必须检查**上述两条
- 这是 lint 强制规则，违反会报错
