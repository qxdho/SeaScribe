# SeaScribe 更新日志

## v6.1.22

### 修复：调试姓名下拉导致长滚动条
- 弹窗限高 90vh → **78vh**，滚动条不再接近整屏
- 调试姓名下拉展开限高 **160px**（CustomSelect），不再溢出弹窗
  触发长滚动

## v6.1.21

### 修复：点名面板残留结构 + 勾选联动导致界面跳动
- **修复"开始点名"跑到屏幕顶部**：v6.1.20 重构时旧结构残留
  （重复的调试动画区块 + 第二个开始点名按钮，div 多闭合），已清除，
  弹窗结构配平（25=25）
- **勾选"显示随机过程"/"调试"不再让界面跳动**：过程动画模式与
  调试动画行改为**常驻置灰**（未勾选时 disabled），不再显示/隐藏

## v6.1.20

### 点名配置弹窗布局重构
- 面板改为**两栏网格**紧凑布局（班级名单/随机方式、人数/多人动画、
  修饰/过程、记录/调试 四组并排），不再一栏到底杂乱
- **随机方式改为下拉菜单**（替代大 radio 卡片组），大幅缩减高度
- **多人动画选项常驻**：人数=1 时置灰而非隐藏——切换人数时
  弹窗高度不变、页面不再跳动
- 调试动画改为一行（下拉 + 播放按钮）

## v6.1.19

### 占位签名与真实签名明显区分
- 占位签名加 **🌱 图标前缀** + **灰色**（--muted）+ 更低透明度（0.35）
  + 斜体，一眼可辨；真实签名保持正常色与透明度

## v6.1.18

### 紧凑态过渡：缩小与移动同步（L 形路径）
- 不再"先缩后移"：改为 **L 形路径**——0-55% **横向移动的同时缩小**
  （头像向左、名字向右），55-100% 纵向归位
- 横向阶段头像与名字垂直分离（x 相反方向错开），纵向阶段 x 已错开
  ——全程不交叉、不越界、不乱跑

## v6.1.17

### 修复：紧凑态过渡头像"到处乱跑"
- 根因：分离路径中间点把元素推出了卡片（overflow 裁剪），头像闪现位移
- 修复：改为**先原地缩小、再直线平移**——0-40% 原地缩到目标尺寸
  （位置不动），40-100% 直线平移归位；头像/名字/签名同时播放，
  路径清晰稳定不交叉

## v6.1.16

### 修复：紧凑态过渡头像与名字相交
- 根因：线性插值中段头像（尺寸未缩完）与名字路径重叠
- 修复：改为**分离路径关键帧**——头像先上移、名字先下移
  （拉开垂直距离约卡片高 25%），再水平归位；三者**同时播放**，
  路径不再交叉

## v6.1.15

### 多人卡片：紧凑态过渡改为同时移动
- 头像/名字/签名**同步过渡**（去掉 v6.1.13 的依次错开），
  0.8s 慢速平滑缓动下线性路径不交叉，同时归位

## v6.1.14

### 多人卡片：两态尺寸对比更明显 + 出现时更大
- **展示态更大**：头像 `clamp(60px,19%,96px)`、名字 `clamp(1.4rem,2.5vw,2.2rem)`
- **紧凑态更小**：头像 `clamp(32px,9%,44px)`、名字 `clamp(0.9rem,1.5vw,1.3rem)`
  —— 过渡前后对比鲜明
- **出现动画更大**：pop 起始 scale 0.6 → **0.85**，不再显得小
- 卡片高度 14vw→15vw（上限 200px），容纳更大的展示内容

## v6.1.13

### 修复：多人卡片 FLIP 过渡头像名字"撞车"
- 根因：头像与名字同时从中心向各自目标移动，路径交叉视觉相撞
- 修复：过渡**错开 stagger**——名字先让路（0ms）、头像跟上（100ms）、
  签名最后（200ms），移动路径不再交叉

## v6.1.12

### 多人卡片：动画更柔 + 无签名占位
- FLIP 过渡 0.55s → **0.8s**、缓动更柔和（ease-out-quart），
  展示态停顿 1.6s → 1.8s，节奏更从容不生硬
- **无签名的人显示可爱占位签名**：「这位同学很低调，还没留下签名哦~」
  （斜体淡显，悬浮看全文）

## v6.1.11

### 多人卡片：对称间距 + 签名左对齐 + 精致化设计
- 紧凑态头像/名字不再顶格：卡片统一 `padding: 4%`，**上下间距与左右对称**
- **签名从一开始就左对齐**（展示态与紧凑态统一），不再居中
- 卡片**高级化**：渐变背景、16px 圆角、双层柔和阴影、
  头像双环描边、紧凑态签名区细分隔线——深浅主题自适应

## v6.1.10

### 多人卡片：横版大卡片铺满屏幕
- 卡片改为**横版**：固定矮高度 `clamp(120px,14vw,180px)`，宽度随 grid 铺满
- **铺满屏幕**：容器 96vw、`minmax(300px,1fr)` 分列——宽屏卡片 300px+
  起，均匀铺满不留大空隙
- 头像/名字/签名改用 `clamp()` 相对尺寸，随卡片大小自适应
- 紧凑态签名展开 4 行（展示态 2 行），超长截断悬浮看全文

## v6.1.9

### 多人卡片：网格自适应铺满 + 名字对齐头像 + 签名左对齐
- 卡片改用 **grid 布局**：`repeat(auto-fit, minmax(170px, 1fr))`
  按屏幕宽度自动分列、均匀铺满屏幕；高度 `clamp(150px,16vw,240px)` 随屏自适应
- 紧凑态**名字与头像垂直居中**并紧挨（gap 0.6vw）
- **签名左对齐**（展示态与紧凑态统一），不再居中

## v6.1.8

### 多人卡片：固定容器 + 卡片外观 + 内部元素动画
- 卡片**固定尺寸（19vw×17vw）与位置**：出现后不再移动、不再重排，
  第二行不会再跳到第一行
- 卡片**外观对齐默写插件卡片**：surface 背景、圆角、边框、阴影
- 紧凑态**只有卡片内元素移动**（内部 FLIP）：
  头像缩小左移、名字缩小上移到头像右侧、签名向上展开显示更多
- 签名动态限行：展示态 2 行 / 紧凑态 5 行，超长截断（悬浮看全文）

## v6.1.7

### 多人卡片：签名动态限行 + 紧凑态展开
- 签名**动态限制字数**：展示态限 2 行、紧凑态展开限 5 行
  （响应式行数，超长截断，悬浮卡片可看全文）
- 分区清晰：头像+名字（card-main）与签名（sig）独立分区
- 紧凑态：头像缩小左移、名字缩小上移到头像右侧横排，
  签名区向上展开显示更多文字；FLIP 平滑过渡不跳变

## v6.1.6

### 修复：多人卡片 FLIP 动画乱跳
- 根因：pop 弹出动画结束后移除动画 class，卡片回落到默认
  `transform: scale(0.6) translateY(20px)`（弹出前的隐藏态）——
  所有卡片突然缩小偏移，FLIP 测量也被污染
- 修复：动画结束后卡片固定 `transform: none`；紧凑态 CSS 覆盖
  `transform: none`，FLIP 结束回落自然位置不再跳动

## v6.1.5

### 点名多人卡片：两态布局 + FLIP 过渡动画
- 卡片先以**展示态**呈现（大头像 8vw + 大名字 3.2vw 竖排，签名完整显示）
- 停顿约 1.6s 后，**FLIP 平滑过渡**到紧凑态：头像名字缩小（3.2vw/1.8vw）
  横排一行，给签名留出空间完整展示
- 无签名的人同样过渡到小头像+小名字横排，整体排版整齐
- 逐个定格模式逐卡交错过渡，动效顺滑

## v6.1.4

### 版本号统一管理 + 静态资源缓存自动化
- **版本号单一来源**：新增 `config/config.js` 的 `window._CONF.main.version`，
  开屏动画与顶栏版本号改为**自动读取显示**（此前硬编码 v5.0.0 从未更新）
- **资源缓存自动化**：服务器所有响应加 `Cache-Control: no-cache`
  （文件更新后浏览器自动拉取最新），移除全部手动 `?v=` 版本号——
  以后升级代码不再需要手动改版本号

## v6.1.3

### 多人卡片：签名完整显示 + 名字水平对齐
- 签名去掉 16vw 单行省略截断，改为 22vw 内自动换行完整显示
- 卡片顶部对齐（flex-start），有/无签名的卡片名字同一水平线
- 签名区固定最小高度，无签名卡片名字位置恒定

## v6.1.2

### 修复：多人卡片 SVG 占位头像源码泄露
- 占位头像的 `data:image/svg+xml` URI 含双引号，在 innerHTML 拼接时
  提前闭合 `src` 属性，SVG 源码（`<svg xmlns=...`）作为游离文本泄露
  到页面（多人卡片显示 `" alt="">` 等乱码）
- 修复：改为 `encodeURIComponent` 编码的 data URI，属性闭合安全，
  源码不再泄露

## v6.1.1

### 修复：静态资源缓存导致新样式不生效
- index.html / 管理后台全部 CSS、JS 引用追加版本号 `?v=6.1.0`
  （浏览器强缓存旧 picker.css 会导致多人卡片失去 flex 布局、
  名字与签名挤在一行），刷新即强制加载最新资源

## v6.1.0

### 随机点名：动画提速 + 显示时序优化 + 点多人
- **动画提速**：姓名滚动间隔 80→65ms、最短滚动时长 2000→1700ms、
  二分/时间加权轮间停顿 1000/1200→800/1000ms，定格弹跳 0.4→0.35s、
  缩小飞入 0.25→0.2s
- **显示时序优化**：头像与个性签名改为与名字定格弹跳**同时出现**
  （原先等弹跳+彩带约 0.7s 才显示）
- **点多人**：点名面板新增「点几人」步进控件（1-10，默认 1）；
  新增「多人动画」模式——**同时定格**（N 人一起弹出，默认）/
  **逐个定格**（滚轮式逐个弹出）；一次点名内**不重复**选人；
  多人时间戳批量记录

## v6.0.2

### 文档同步 + 仓库数据治理
- README/RULES/PLUGINS 全部同步 v6.0.0 架构：后端 api_* 模块结构、
  19 GET + 15 POST、picker ESM 化、插件注册方式、调试工具行为
- **仓库治理**：`data/`（含学生名单/头像等隐私数据）与 `.reasonix/` 历史
  跟踪彻底清理——git filter-repo 重写 175 个提交抹除 data/，force push 生效；
  `.gitignore` 原为 UTF-16 编码导致 git 无法解析、忽略规则长期失效，已修复为 UTF-8

## v6.0.1

### 修复 debug 测试误删花名册班级
- 「花名册保存（原值写回）」用例只备份首个班级，而保存接口会删除
  payload 中不存在的班级文件 → 测试会误删其它班级
- 修复：保存前**全量备份所有班级**，任一班级备份失败则跳过保存，
  不再可能删除数据
- 恢复此前被误删的 `data/roster/12班.json`（自 git 历史找回，50 名学生，
  含签名；如与实际名单有出入请在管理后台核对更新）

## v6.0.0

### 架构：后端模块化重构 + 前端冗余清理

**后端拆分**（routes.py 1034 行 → 8 个模块，API 完全兼容）：
- `api_common.py` 公共辅助（user_to_dict/MIME 统一表/JSON 解析）
- `api_auth.py` 鉴权会话、`api_user.py` 用户管理、`api_roster.py` 花名册、
  `api_picker.py` 点名、`api_config.py` 配置、`api_file.py` 文件头像、`api_log.py` 日志
- `routes.py` 仅保留聚合入口（GET 19 + POST 15），server.py 零改动

**后端审查修复**：
- 日志 action 语义：创建/修改/删除用户、保存名单、保存配置、注册、改密码
  各记正确类型（原全部误记为 profile_update）；配置/注册补记日志
- 头像 mime 查找 bug（jpg 头像 data URL 恒声明为 image/png）已修复
- 死代码清理、send_error 统一为 send_json、config 保存加异常保护、
  头像上传改为先压缩成功再删旧头像

**前端模块化与清理**：
- 时间格式化 5 份 → Admin.formatTime 统一（含秒级时间戳兼容）
- 头像 HTML 2 份 → Admin.avatarHTML 统一
- changelog/about 合并为通用 markdown 弹窗模块
- picker 5 个 IIFE 全部迁移为 ESM（window.PickerXxx → import/export）
- 配置页补 enword 配置项；注册昵称截断 20 → 100 与后端统一

**注意**：本版本为内部架构重构，API 路径与行为不变，前端无需改动；
后端代码结构变化，需重启服务器生效。

## v5.2.13

### 修复 start.bat 启动横幅重复输出
- 横幅打印了两遍：start.bat 的 echo + server.py 启动时 print
- 删除 start.bat 中重复的两行 echo，启动后仅由 server.py 输出一遍

## v5.2.12

### 管理员面板可查看 Debug 操作日志
- 后端新增 `GET /api/admin/logs/debug`（admin/teacher 可访问），返回
  `data/logs_debug.json` 最近 200 条
- 管理后台「操作日志」页新增来源切换：**正常日志 / Debug 日志**
- debug 工具用例同步覆盖新接口
- 注意：本版本改动后端，需重启服务器生效

## v5.2.11

### 调试日志结果行降级为测试项子层
- `[通过]` / `[失败]` / `[跳过]` 与请求/响应同层（6 空格缩进），
  作为测试项的子内容，不再与 `· 测试` 同级
- 层级：分组/汇总顶格 → 测试项（2 空格）→ 请求/响应/结果（6 空格）

## v5.2.10

### 调试日志缩进层级统一
- 用例行与结果行同层（2 空格缩进）：`  · 测试` / `  [通过]` / `  [失败]` / `  [跳过]`
- 请求/响应为其子层（6 空格）：`      → 请求` / `      ← 响应`
- 分组标题与汇总信息顶格，层级一目了然

## v5.2.9

### debug.bat：start.bat 前台启动 + 测试完不关服务器
- 服务器未运行时，debug.bat 改为调用 **start.bat 前台窗口**启动
  （不再是最小化直启 python）
- **测试完不再关闭服务器进程**：无论服务器是原本运行还是本次启动，
  debug 结束后都保持运行，由用户自行管理（关闭 start.bat 窗口即可停服）

## v5.2.8

### debug 操作日志与正常操作日志分离
- debug 自检请求携带 `X-Debug-Test` 头，后端将此类操作日志写入独立的
  `data/logs_debug.json`，不再混入管理员界面的操作日志（`data/logs.json`）
- 历史已混入的 24 条 debug 记录迁移到独立文件
- 涉及后端 `config.py`（新增 `LOGS_DEBUG_PATH`）、`auth.py`（append_log 分流），
  服务器已重启生效

## v5.2.7

### 修复测试污染 config/config.js 行尾
- 「保存配置（原值写回）」用例会把配置文件行尾从 CRLF 写成 `\r\r\n`
  （GET 的 content 含 `\r\n`，后端 `open('w')` 又把 `\n` 转 `\r\n`）
- 修复：写回前归一化 `\r\n` → `\n`，后端转回 `\r\n`，文件保持原样
- 已恢复此前被污染的 config/config.js；全量测试后文件零改动

## v5.2.6

### 未提供密码时跳过需要登录的检查
- 无管理员密码（交互回车/空输入/非交互环境）时：仅执行**公开 API 组**，
  跳过 admin 登录态、admin/teacher、学生组等需要登录的用例
- 提供密码时仍执行全量 57 条用例

## v5.2.5

### debug 密码输入体验 + 控制台安全核查
- 输入管理员密码时改为**星号反馈**：每输入一位显示一个 `*`（Windows 控制台
  msvcrt 逐字符无回显），支持退格、Ctrl+C；非交互环境（管道/重定向）自动
  降级为 getpass 黑屏输入
- 核查正常服务器控制台：仅输出启动横幅与请求行（方法+路径），
  不打印任何请求体，登录密码不会出现在服务器日志中

## v5.2.4

### 安全加固：debug 日志敏感字段脱敏
- 请求体、响应、失败详情中的 `password` / `oldPassword` / `newPassword` /
  `token` / `content` / `Authorization` 一律显示为 `***`，不再打印明文
- 修复：登录请求曾把管理员密码明文输出到控制台/日志

## v5.2.3

### 调试工具测试用例修复（全量 57/57 全绿）
- 修复「会话信息」用例：`/api/admin/session` 返回扁平字段，原校验误读嵌套 `user` 结构
- 修复「创建/修改/删除临时用户」：创建用例的 cleanup 会立刻删掉刚建的用户，
  导致后续修改/删除 404；改为删除用例负责清理
- 修复「学生注册用户名已存在」：admin 登录成功后预清理上次运行残留的
  `debugtest_` 临时用户，每次测试从干净状态开始
- **防污染加固**：资料备份失败时绝不写入（不再用占位符覆盖原值），
  且保存资料用例在备份缺失时自动跳过——避免测试覆盖真实用户资料

## v5.2.2

### debug.bat 退出与性能优化
- 测试完不再按任意键退出：窗口停留在 `Type "exit" to close`，
  可先复制结果，输入 `exit` 才关闭（含 10 次输入上限，防止重定向死循环）
- **提速 ~20 倍**：默认地址 `localhost` → `127.0.0.1`
  （修复 Windows 上 localhost 先连 IPv6 `::1` 被拒、回退 IPv4 约 2 秒的延迟），
  全量测试从约 100 秒降至约 5 秒
- 在线用例增加 `[n/50]` 进度序号
- JS 语法检查改为 8 并发，缩短离线检查耗时

## v5.2.1

### 调试启动脚本简化为纯 bat（debug.bat）
- 删除 debug_run.py，启动调试只保留一个 `debug.bat`（双击即用）
- 流程：检测 9060 端口 → 未运行则后台启动（最小化窗口）并等待就绪 → 执行
  debug_api.py → 调试结束自动关闭本次启动的服务器（原有服务器不受影响）
- bat 内部提示全英文 + `chcp 65001` + `PYTHONIOENCODING=utf-8`，
  保证中文日志在控制台与重定向下均正常显示

## v5.2.0

### 调试启动脚本（debug_run.py + debug.bat）

新增一键调试入口，双击 `debug.bat` 或运行 `python debug_run.py`：

- 自动探测 9060 端口：**服务器已在运行** → 直接开始调试
- **服务器未运行** → 先后台启动（隐藏窗口）并等待就绪，再执行调试；
  调试结束后自动关闭本次启动的服务器（原本在运行的服务器不受影响）
- 命令行参数原样透传给 debug_api.py（如 `--skip-online` / `--list`）

## v5.1.1

### 文档
- README 增加「给 AI 的提示」：AI 协助本项目前必须先完整阅读 RULES.md

## v5.1.0

### 独立调试工具（debug_api.py + debug/ 包）

新增通用调试框架，零依赖（Python 标准库 + node），可离线可在线：

- **离线静态检查**（无需服务器，`--skip-online` 单独运行）：
  编码 UTF-8 无 BOM（发现 BOM 自动修复）、Python ast / JS node --check 语法、
  引用完整性（src/href/fetch/import，含 /main/→main/client/ URL 映射）、
  data/*.json 可解析、users.json 索引互指、config ↔ plugins 一致性
- **在线 API 测试**：49 条用例四组覆盖全部 18 GET + 15 POST 接口
  （公开 / admin 登录态 / admin+teacher / 学生越权），含负向校验
- **声明式注册表**：新增 API 用例或检查项只改注册表，不改引擎；
  自动解析 routes.py 与实际路由比对，未覆盖路径输出 WARN
- **分级日志**：INFO/PASS/FAIL/WARN/SKIP 彩色输出，分组小计 + 汇总表 + 失败回放，
  退出码 0/1/2；`--plain` 纯文本、`--list` 清单、`--safe` 预留
- 用法：`python debug_api.py`（交互式输入管理员密码）

### 修复
- changelog.js 引用不存在的 `CHANGELOG.md` → 改为 `UPDATE.md`（更新日志弹窗 404）
- 清理 8 个历史 UTF-8 BOM（index.html/README/UPDATE/PLUGINS/RULES/server.py/config.py/routes.py）
- node --check 在 Windows 下按 GBK 编码 stdin 崩溃 → 改传 UTF-8 bytes

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
