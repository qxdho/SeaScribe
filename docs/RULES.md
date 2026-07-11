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
- `RULES.md`、`.reasonix/` 不入库（已在 `.gitignore` 中）

## 7. 版本号管理

- 遵循语义化版本（SemVer）：`v<MAJOR>.<MINOR>.<PATCH>`
- AI 自行判断改动量，无需询问用户：
  - **PATCH** `v3.0.x`：修 bug、小调整、样式微调
  - **MINOR** `v3.x.0`：新功能、新增学科插件、配置项扩展
  - **MAJOR** `vx.0.0`：重大架构变更、不兼容的 API 改动
- 发版流程：改代码 → 更新 `update.md` → commit → `git tag -a vX.Y.Z -m "..."` → `git push && git push --tags`
- **更新日志写法**：
  - 保持专业简洁，面向用户，避免内部术语（不写"plugin.js""z-index"等实现细节）
  - 只写与上一版本的区别，不重复描述已有功能
  - 可以提及技术名词（如"CSV 文件""canvas-confetti"），但不过度解释

## 8. GitHub 远程推送

- 远程地址使用 HTTPS（`https://github.com/qxdho/SeaScribe.git`）
- 推送前确认 `data/`、`RULES.md` 等敏感文件不包含在 diff 中
- `.gitignore` 随项目持续维护，新增敏感文件类型时同步更新

## 9. 文件写入规范

- **严禁**使用 PowerShell 的 `Out-File`、`Set-Content`、管道 `>` 等写入文本文件
  - 原因：PowerShell 默认会添加 UTF-8 BOM，在浏览器/JS 解析时造成中文乱码
  - 也禁止 PowerShell here-string (`@'...'@`) 管道写入文件
- **必须**使用 `write_file` 工具写入文本文件（自动处理 UTF-8 编码）
- 涉及编码修复时，用 `[System.IO.File]::ReadAllText` / `WriteAllText` 配合 UTF8Encoding 参数
- CSV 文件必须 UTF-8 无 BOM，服务器 `mimetypes` 必须带 `charset=utf-8`

## 10. CSV / 学生名单规范

- 名单文件放在 `data/stdlist/` 下，UTF-8 无 BOM
- 格式：`姓名,头衔`（无表头行）
  - 第 1 列：姓名（必填）
  - 第 2 列：头衔（可选，为空则不显示）
- 文件名即班级名，如 `11班.csv`
- **严禁**给 CSV 加表头行（不要写 "姓名" 行），否则第一个学生会被当作表头跳过
- 所有 CSV 写入操作**必须**用 `write_file` 工具，确保 UTF-8 无 BOM

## 11. server.py 规范

- 使用 `SimpleHTTPRequestHandler.extensions_map` 覆盖为文本文件添加 `charset=utf-8`
- `/api/<name>-files` 接口自动扫描 `data/<name>/` 目录
- 禁止目录浏览（`list_directory` 返回 404）
- 从根目录提供服务，不 `os.chdir`

## 12. 项目目录结构

- 当前代码在根目录：`index.html`、`server.py`、`start.bat`、`README.md`
- 文档：`docs/`（update.md、PLUGINS.md、RULES.md）
- 资源：`main/logo.svg`
- 旧版本：`archive/v1.0/`、`archive/v2.0/`
- **不要**在根目录新增零散文件，归类到对应子目录

## 13. 启动日志系统

- `window.__SEASCRIBE_LOG__` 全局数组，存储所有日志
- splash.js 启动时执行 12 项检查，写入 LOG
- console.log/error/warn 被拦截同步写入 LOG
- 顶栏 📋「系统日志」按钮查看完整日志
- 有错误时按钮右上角显示红色数字
- 开屏日志逐行滚动（60ms 间隔），点击屏幕关闭

## 14. 点名系统（picker.js）

- 纯 JS 解析 CSV（不用 SheetJS），`fetch().text()` 后 `split` 解析
- 启动时自动扫描 `/api/stdlist-files`，选择最后一个班级
- 点名动画：滚动仅姓名 → 定格姓名+头衔 → 缩小仅姓名
- 头衔用独立 DOM 元素 `#pick-overlay-title`，淡入淡出

## 15. 通用编码约定

- 所有文本文件 UTF-8 无 BOM
- 中文 UI 文本直接写在 HTML/JS 中，不做 i18n
- 变量命名 camelCase，CSS 类名 kebab-case
- 每个 JS 文件用 IIFE 包裹 `(function() { ... })()`
- DOM 查询优先用 ID（`getElementById`），其次 class（`querySelector`）
- 弹窗用 `.hidden` class 控制显隐（`display: none`）
- 动画用 CSS `@keyframes`，不用 JS 动画

## 16. 网络与代理

- Git 推送走 v2ray 代理：`git config http.proxy http://127.0.0.1:10808`
- 远程地址：`https://github.com/qxdho/SeaScribe.git`
- `start.bat` 自动启动服务器并打开浏览器
