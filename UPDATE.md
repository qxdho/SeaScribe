# SeaScribe 更新日志

## v4.5.1

### 阻断修复
- **B1 roster.js 数据静默丢失**：`saveRoster()` 未检查 `res.ok`，网络故障时所有非当前班级的名单数据被覆盖为空数组 → 增加 `res.ok` 检查并阻断写入
- **B2 users.js 隐式全局变量**：`va`/`vb` 缺少 `var` 声明 → 泄漏为 `window.va`/`window.vb`，严格模式下排序崩溃
- **B3 roster.js 绑定竞态**：`loadBindMap()` fire-and-forget 无 `await` → 绑定状态列始终为空 → 改 `await loadBindMap()`
- **B4 custom-select.js 全局事件破坏**：捕获阶段 `preventDefault()` + `stopPropagation()` → 下拉框展开时页面所有链接、按钮失效 → 删除两行

### CustomSelect v2
- **捕获阶段拦截点击穿透**：改用 `addEventListener('click', handler, true)` 替代 `fixed` 遮罩层（避开了 `overflow: hidden` 层叠上下文陷阱）
- **Admin 页面导航自动刷新**：hook `PageRegistry.navigate` 替代 `init`（之前切换页面不走 `init`，下拉框回退成原生）
- **`const PageRegistry` 检测修复**：`window.PageRegistry` → `typeof PageRegistry !== 'undefined'`（`const` 不挂 `window`）
- **下拉选项动态刷新**：admin 各页面修改 `<select>` 选项后补调 `_customSelect.refresh()`（共 9 处）

### 后端补路
- **点名记录管理**：新增 `POST /api/admin/picker-timestamps/delete` 和 `/clear` 两个 handler，修复 404

### 滚动条全局统一
- **4px 窄滚动条**：`base.css`（主站+admin）、`custom-select.css`、`picker.css`、`changelog.css` 全覆盖
- 提升 `.changelog-card` 桌面端宽度：460→540px（更新日志）、600→680px（关于）、80→85vw（系统日志）
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
- 滚动条样式统一全局定义（v4.5.0 为 6px，v4.5.1 统一为 4px）
- 原删除 5 处分散样式，v4.5.1 补全 3 个组件区域（changelog / picker / custom-select）

### 性能优化
- 移除所有 `filter: blur()` 动画（19 处）— 低端 GPU 最大瓶颈
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
- 标题/作者/版本：模糊渐显 + 弹性缓动
- 日志行：逐条渐入动画
- 提示文字：持续浮动效果
- 退出动画：缩放 + 模糊消失

**卡片动画**
- 听写卡片：3D 旋转 + 模糊入场
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
- 初始延迟 500ms→100ms，条间间隔 60ms→20ms
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
- 登录限流、路径穿越修复、UUID 用户标识

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

---

## v3.3.0

### 化学数据文件化
- CSV 文件扫描切换、confetti 彩带、关于页面

---

## v3.2.0

### 名单系统重构
- CSV 名单替代 JS 硬编码、启动日志、start.bat

---

## v3.1.0

### 品牌与工程化
- Logo 设计、Git 托管、目录拍平、RULES.md

---

## v3.0.0

### 代码模块化
- CSS/JS 拆分、命名空间、index.html 瘦身

---

## v2.0

### 布局双模式
- 网格/列表切换、配置系统重构、插件增强

---

## v1.0

- 化学+英语插件、随机点名、夜间模式、开屏动画
