# SeaScribe 更新日志

## v5.0.1

### 修复
- 修复学生更换头像报「无权限」：`/api/admin/upload/avatar` 原仅限 admin/teacher 角色，
  学生（含注册后绑定姓名的学生）在「我的资料」页上传头像被 403 拒绝。
  现改为任何已登录用户均可上传；文件名以 uid 为前缀、清理逻辑按 uid 隔离，
  用户只能覆盖自己的旧头像，无越权风险。

## v5.0.0

### 架构重构 + 新插件

**ES Module 模块化**
- 全部 JS 从 script 全局变量转为 ES Module import/export
- 目录重组：js/ → core/ ui/ pages/ utils/ picker/
- 入口从 28 个 script 标签缩减为 1 个 type=module + 插件
- 启动日志自动扫描插件和配置

**英语跟读插件**
- 全新 plugins/enword/，30 个高频词库
- 顺序朗读 + 浏览器 TTS 发音（SpeechSynthesis）
- 大字号居中布局，底部固定控制栏
- 从指定单词开始、暂停/继续、间隔调节

**随机算法升级**
- Math.random() 替换为 crypto.getRandomValues()

### 编码 + 死锁 + 代码审查
- 全项目 UTF-16/GBK → UTF-8 统一
- Lock → RLock 修复 session 过期死锁
- do_GET/do_POST 全局异常保护
- 插件注册 typeof 检查、DOM 判空、冗余代码清理
- 操作日志权限隔离 + 用户筛选
- 配置编辑器兼容间接引用格式

## v4.7.0

### 安全加固（全量代码审查修复）

**后端**
- 修复注册时覆盖全部 sessions 的严重 bug（所有已登录用户瞬间被踢出）
- 修复 DELETE 用户路径因 `_parse_json_body` 吞 body 导致删除功能不可用
- `_read_json` / `_write_json` 加 `threading.Lock` 防止高并发数据损坏
- 管理员创建用户不再使用默认弱密码，要求密码至少 6 位
- session 删除增加归属校验：非 admin 只能删除自己的会话
- 登出时发送 `Set-Cookie: Max-Age=0` 清除浏览器端 Cookie
- 操作日志接口改为 admin only
- 文件列表 API 限制子目录白名单（仅 chemistry/english）
- picker-timestamps POST 增加 list_name 校验，拒绝非法字符
- 花名册保存拒绝空 `{}`，防止误清空
- base64 解码加 `try/except` 防止非法输入 500
- 登录限流字典惰性清理过期条目，防止内存泄漏
- 头像缓存加线程锁
- 用户名正则支持 `-` 字符
- 提取重复 `config_map` 为模块常量 `_CONFIG_MAP`
- 修复多处日志乱码

**前端**
- `markdown.js`：修复三条 XSS 路径（原生 HTML 白名单过滤 + 图片属性转义 + 链接协议白名单）
- `app.js`：管理员名使用 `SeaScribe.esc()` 转义，防存储型 XSS
- `cards.js`：插件名/描述使用 `SeaScribe.esc()` 转义
- `chemistry/plugin.js`：CSV 元素名使用 `SeaScribe.esc()` 转义
- picker 动画/显示模块：加超时保护防止 Promise 泄漏和 rAF 永久运行
- `CustomSelect` 添加 `destroy()` 方法
- `cards.js`：用 `DocumentFragment` 批量插入 DOM 减少重排
- `canvas-confetti` CDN 固定版本 1.9.4 并加 SRI 完整性校验
- `common.js`：401 非 JSON 响应仍能触发登出跳转
- `sessions.js`：token 不再渲染到 DOM，改用内存索引
- `users.js`：username 拼入 URL 路径前 `encodeURIComponent`
- 空 catch 块改为 `console.error`

## v4.6.0

### 项目结构重构
- **code/data 分离**：所有代码移入 `main/`，运行时数据统一到 `data/`
  - `main/server.py` — 服务器入口
  - `main/server/` — Python 模块（config.py / auth.py / routes.py）
  - `main/admin/` — 管理后台前端
  - `main/client/` — 主站前端（原 main/）
  - `data/` — 整合原 data/ + admin/_store/
- **translate_path 映射**：HTTP 服务自动路由 `/main/`→`/main/client/`、`/admin/`→`/main/admin/`
- **配置结构化**：config/ 下所有 JS 配置改用统一 `window._CONF.{namespace}` 模式，保留向后兼容变量

### 会话管理（新功能）
- 登录时记录 IP 和 User-Agent，支持多设备同时登录
- 管理后台 → **设备管理**：查看所有活跃会话的设备类型、IP、登录时间
- 支持强制退出指定设备（除当前设备外）
- Session 有效期延长至 30 天

### 操作日志（新功能）
- 记录所有关键操作：登录/退出/注册、修改资料/密码、增删改用户、保存配置/名单、上传头像、强制退出设备
- 管理后台 → **操作日志**：表格展示时间/操作/详情/IP/操作人，可按类型筛选
- 日志自动保留最近 2000 条

### API 扩增
- `GET /api/admin/sessions` — 列出当前账号所有活跃会话
- `POST /api/admin/sessions` — 强制退出指定设备
- `GET /api/admin/logs` — 获取操作日志

### BUG 修复
- **B5 缺少 auth 检查**：`handle_user_last_pick`、`handle_user_class`、`handle_admin_records`、`handle_admin_profile`、`handle_avatar_upload` 五个 handler 缺少 `require_auth` / `require_role`，直接引用未定义变量 `user` 导致 NameError。已全部加回正确位置的 auth 检查。
- `handle_admin_session` 恢复 `require_auth` 调用（此前被误删）

### 文档更新
- README / PLUGINS / RULES / UPDATE 全面更新，反映最新目录结构和功能
- start.sh 修正路径 `server.py` → `main/server.py`

---

## v4.5.1

### 阻断修复
- **B1 roster.js 数据静默丢失**：`saveRoster()` 未检查 `res.ok`，网络故障时所有非当前班级的名单数据被覆盖为空数组 → 增加 `res.ok` 检查并阻断写入
- **B2 users.js 隐式全局变量**：`va`/`vb` 缺少 `var` 声明 → 泄漏为 `window.va`/`window.vb`，严格模式下排序崩溃
- **B3 roster.js 绑定竞态**：`loadBindMap()` fire-and-forget 无 `await` → 绑定状态始终为空 → 改 `await loadBindMap()`
- **B4 custom-select.js 全局事件破坏**：捕获阶段 `preventDefault()` + `stopPropagation()` → 下拉框展开时页面所有链接、按钮失效 → 删除两行

### CustomSelect v2
- **捕获阶段拦截点击穿透**：改用 `addEventListener('click', handler, true)` 替代 `fixed` 遮罩层（避开 `overflow: hidden` 层叠上下文陷阱）
- **Admin 页面导航自动刷新**：hook `PageRegistry.navigate` 替代 `init`（之前切换页面不走 `init`，下拉框回退成原生）
- **`const PageRegistry` 检测修复**：`window.PageRegistry` → `typeof PageRegistry !== 'undefined'`（`const` 不挂 `window`）
- **下拉选项动态刷新**：admin 各页面修改 `<select>` 选项后补调 `_customSelect.refresh()`（共 9 处）

### 后端补路
- **点名记录管理**：新增 `POST /api/admin/picker-timestamps/delete` 和 `/clear` 两个 handler，修复 404

### 滚动条全局统一
- **4px 窄滚动条**：`base.css`（主站+admin）、`custom-select.css`、`picker.css`、`changelog.css` 全覆盖
- 提升 `.changelog-card` 桌面端宽度：460→540px（更新日志）、500→580px（关于）、50→55vw（系统日志）
- 新增 1024px 平板断点 + 修复点名调试模式展开裁剪

### 文档更新
- RULES.md：管理员加载顺序、API 数量同步
- UPDATE.md：本条目

---

## v4.5.0

### 项目模块化
**后端拆分**
- `server.py` 从 809 行单体拆分为 `server/` 包：
  - `config.py` — 常量集中管理
  - `auth.py` — 用户/密码/会话/令牌/限流/鉴权
  - `routes.py` — 15 GET + 14 POST handler 统一分发
  - `server.py` — 精简至 106 行入口
**CSS 去重**
- 全局设计令牌统一到 `theme.css`（圆角 7 级、阴影 4 级、时长 3 级、缓动 4 种）
- CustomSelect 样式提取到 `custom-select.css`，主站和管理后台共享
- 管理后台不再重复定义 `:root` 变量和滚动条

### 调试模式
- 点名弹窗新增「🔧 调试模式」：勾选后从姓名池选人，直接播放完整动画
- 跳过随机算法和时间戳记录，方便调试动画效果

### 全局滚动条
- 滚动条样式统一全局定义（v4.5.0 中 6px，v4.5.1 统一为 4px）
- 原删除 5 处分散样式，v4.5.1 补全 3 个组件区域（changelog / picker / custom-select）

### 性能优化
- 移除所有 `filter: blur()` 动画（9 处）— 低端 GPU 最大瓶颈
- 移除 `backdrop-filter` 毛玻璃效果 — 实时模糊极耗 GPU
- 移除 `rotateX()` 3D 变换 — 简化为 2D translate
- 保留 `spring` 弹性缓动 + `scale`/`translate`/`opacity` 等 GPU 友好属性
- 开屏关闭动画改为纯 opacity 淡出 + `will-change` 预提升（0.5s→0.2s）

### 文档重写
- README / UPDATE / PLUGINS / RULES 全面重构，逻辑清晰，面向维护

---

## v4.4.0

### 全局动画全面升级

**新增缓动体系**
- 新增 `--spring`（弹性）、`--ease-out`（平滑减速）、`--bounce`（弹跳）CSS 缓动变量
- 主站和管理后台统一使用

**开屏动画**
- Logo：旋转弹性入场
- 标题/作者/版本：模糊渐现 + 弹性缓动
- 日志行：逐条渐入动画
- 提示文字：持续浮动效果
- 退出动画：缩放 + 模糊消失

**卡片动画**
- 听写卡片：2D 旋转 + 模糊入场
- 卡片 hover：上浮 + 阴影
- 答案展开：弹性缓动
- 网格切换：缩放弹性

**页面过渡**
- pageIn/pageOut：scale + blur
- 学科卡片 hover：上浮 + 边框高亮 + 阴影增强

**弹窗**
- 遮罩层：backdrop-filter 毛玻璃
- 卡片入场：弹性缓动 + blur
- 关闭按钮 hover：旋转 90°

**点名动画**
- 弹窗/定格/过程步骤：弹性缓动 + blur

**管理后台**
- 卡片/按钮/Toast/导航/表格：弹性缓动 + hover 交互

---

## v4.3.3

### 移动端弹窗适配
- 修复「更新日志」「系统日志」「关于」弹窗在手机/平板端溢出
- 根因：ID 选择器优先级高于响应式类选择器
- 新增对应 ID 选择器的响应式规则

---

## v4.3.2

### 启动界面优化
- 初始延迟 500ms→300ms，条间间隔 60ms→30ms
- 9 阶段 31 项分组检查
- 新增浏览器检测、在线状态、CSS 文件计数

---

## v4.3.1

### 代码质量重构
- 统一版本号、消除重复函数（esc/delay）
- 修复 rAF 竞争条件、CustomSelect 刷新时序
- 修复文件选择下拉框不显示、滚动条缺失、stagger 动画空白

---

## v4.3.0

### 移动端全面适配
- 主站+后台适配手机/平板，两档断点
- 全新 CustomSelect 组件替换原生 select
- 用户管理增强、表格排序、注册系统、登录优化

---

## v4.2.0

### 代码优化
- 统一 HTML 转义、抽取公共模块（markdown / plugin-utils）
- 拆分 core→engine、主题切换主站后台统一
- 修复 server.py 500 错误、注册页 bug、主题不同步
- 新增学生自助注册、hash 路由

---

## v4.1.0

### 界面与用户系统
- 管理后台改为顶栏导航、点名弹窗头像上传
- 新增 displayName 字段、昵称独立、头像本地上传

---

## v4.0.1

### 安全加固
- PBKDF2-HMAC-SHA256 600k 迭代、session 4h 过期
- 登录限流、路径穿越修复、UID 用户标识

---

## v4.0.0

### 管理后台
- 独立 SPA、token 鉴权、三种角色
- 用户 CRUD、配置管理、文件上传

---

## v3.5.0

### 弹窗与顶栏
- 统一 ✕ 关闭、modal.js 公共模块
- 「⋯ 更多」下拉菜单、插件 SVG 图标

---

## v3.4.0

### 点名系统重做
- 模块化架构、三种随机方式、双层动画、时间戳服务端存储
