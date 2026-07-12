# SeaScribe 编码规范

> 每次修改代码前阅读本文档。

---

## 一、文件操作

### 禁止 PowerShell 写文件

**严禁**使用 PowerShell 写入或修改任何文本文件。

必须使用 `write_file` / `edit_file` 工具。

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

- `admin/_store/` — 用户数据、名单、会话
- `data/` — 学科数据、点名时间戳
- `.reasonix/` — AI 工具元数据

---

## 三、配置规范

- JS 中零硬编码兜底
- 配置项 camelCase，放 `config/` 目录按模块分文件夹
- 每个模式的列数和字号独立存储

---

## 四、架构约定

### 后端 (`server/`)

```
server/config.py   常量 (PORT, 路径, 限制)
server/auth.py     用户/密码/会话/令牌/限流/_require_auth
server/routes.py   API handler (15 GET + 12 POST) + 分发列表
server.py          入口 + Handler 类 + 静态文件服务
```

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
common → custom-select → router → [pages/*] → auth → app
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

### CSS 设计令牌

所有视觉属性使用 `theme.css` 中定义的变量：

| 类别 | 变量 | 值 |
|------|------|-----|
| 圆角 | `--radius-xs/sm/md/lg/xl/2xl` | 3/6/8/10/12/16px |
| 时长 | `--dur-fast/md/slow` | 0.15/0.2/0.3s |
| 缓动 | `--ease/--spring/--ease-out/--bounce` | cubic-bezier |
| 阴影 | `--shadow-sm/md/lg/xl` | 4 级提升 |

### 性能规则

- **禁止** `filter: blur()` — 每帧重绘纹理，低端机卡顿
- **禁止** `backdrop-filter` — 实时模糊背景极耗 GPU
- **避免** `rotateX/Y` 3D 变换 — 触发 3D 渲染管线
- 动画仅用 `opacity` + `transform: translate/scale/rotate`（纯合成属性）
- 全屏元素动画优先用 `will-change` 预提升

---

## 五、安全与数据

### 服务器

- 文件名 `os.path.basename()` 防路径穿越
- 请求体限制：API 1MB / 上传 60MB
- `send_json` 包裹 try/except 静默连接中断
- 昵称 ≤100 字符，头像 URL ≤2000 字符

### 鉴权

- PBKDF2-HMAC-SHA256 600k 迭代
- Session 4h 过期 + Cookie HttpOnly SameSite=Strict + Bearer Header 双通道
- 登录限流：同 IP 5 次/60s

### 数据格式

- 名单：`[{"name":"姓名","signature":"签名"}, ...]`，JSON UTF-8
- 文件名即班级名：`admin/_store/roster/11班.json`

---

## 六、表单无障碍

- `<input>` / `<select>` / `<textarea>` 必须有 `id` 或 `name`
- `<label>` 必须 `for` 关联到表单元素 `id`
- 动态生成 HTML 后必须检查
