# SeaScribe — 插件扩展指南

---

## 快速开始

添加新学科只需 **4 步**：

1. 复制 `plugins/_template/plugin.js` → 重命名文件夹和文件
2. 复制 `config/_template/config.js` → 放到 `config/你的学科/` 下
3. 修改 `config.js`（默认值）和 `plugin.js`（数据+渲染逻辑）
4. 在 `main/js/app.js` 中注册：

```js
SubjectRegistry.register(YourPlugin);
```

同时在 `index.html` 底部添加脚本引用：

```html
<script src="config/你的学科/config.js"></script>
<script src="plugins/你的学科/plugin.js"></script>
```

---

## 目录结构

```
config/你的学科/
└── config.js   ← 默认配置（修改后刷新页面生效）

plugins/你的学科/
└── plugin.js   ← 插件逻辑（数据 + 渲染 + 自定义控件）

data/你的学科/   ← 可选：xlsx/csv 等数据文件
```

---

## 配置文件

### 主配置 `config/config.js`

```js
window.__SEASCRIBE_CONFIG__ = {
  theme: "light"  // "light"（浅色）或 "dark"（夜间）
};
```

### 学科配置 `config/你的学科/config.js`

```js
window.__MY_SUBJECT_CONFIG__ = {
  // 基础设置
  defaultCount: 10,       // 每次出题数量
  defaultColumns: 3,      // 初始列数（1-6）
  defaultFontSize: 100,   // 初始字号（60-200）
  defaultLayout: "grid",  // 默认布局："grid"=网格，"list"=列表

  // 网格模式（切换到网格时自动应用）
  gridColumns: 4,         // 网格模式列数
  gridFontSize: 100,      // 网格模式字号

  // 列表模式（切换到列表时自动应用）
  listColumns: 2,         // 列表模式列数
  listFontSize: 100,      // 列表模式字号

  // 可选：按范围抽题
  defaultRangeStart: 0,
  defaultRangeEnd: 0,     // 0 = 自动设为数据总量

  // 可选：Excel 导入
  promptCol: 0,           // 听写内容列（0=A列）
  answerCol: 1,           // 答案列
  scanURLs: [             // 服务器扫描地址
    "/api/my-subject-files",
  ],

  // 可选：CSV 数据文件
  dataURL: "data/my-subject/data.csv",  // 默认加载的 CSV
};
```

---

## 接口规范

| 成员 | 必需 | 说明 |
|---|---|---|
| `meta` | ✅ | `{ id, name, description, icon }` |
| `defaultCount` | ✅ | 默认出题数 |
| `defaultColumns` | ✅ | 默认列数（初始布局） |
| `defaultFontSize` | ✅ | 默认字号 60-200 |
| `defaultLayout` | ✅ | 默认布局 `"grid"` 或 `"list"` |
| `gridColumns` | ✅ | 网格模式列数 1-6 |
| `listColumns` | ✅ | 列表模式列数 1-6 |
| `gridFontSize` | ✅ | 网格模式字号 60-200 |
| `listFontSize` | ✅ | 列表模式字号 60-200 |
| `loadConfig()` | ✅ | 从 `window.__XXX_CONFIG__` 读取配置 |
| `loadData()` | ✅ | 返回题目数组 |
| `getRange()` | 可选 | 返回 `[start, end)` |
| `renderPrompt(item, index)` | ✅ | 返回题目 HTML |
| `renderAnswer(item)` | ✅ | 返回答案 HTML |
| `configUI(container)` | 可选 | 渲染自定义控件 |

### `loadConfig()` 模板

```js
loadConfig() {
  const c = window.__MY_SUBJECT_CONFIG__;
  if (c) {
    if (c.defaultCount    != null) this.defaultCount    = c.defaultCount;
    if (c.defaultColumns  != null) this.defaultColumns  = c.defaultColumns;
    if (c.defaultFontSize != null) this.defaultFontSize = c.defaultFontSize;
    if (c.defaultLayout   != null) this.defaultLayout   = c.defaultLayout;
    if (c.gridColumns     != null) this.gridColumns     = c.gridColumns;
    if (c.listColumns     != null) this.listColumns     = c.listColumns;
    if (c.gridFontSize    != null) this.gridFontSize    = c.gridFontSize;
    if (c.listFontSize    != null) this.listFontSize    = c.listFontSize;
    // 可选：范围
    if (c.defaultRangeStart!=null) this._rangeStart     = c.defaultRangeStart;
    if (c.defaultRangeEnd != null) this._rangeEnd       = c.defaultRangeEnd;
    // 可选：xlsx 列
    if (c.promptCol       != null) this._promptCol      = c.promptCol;
    if (c.answerCol       != null) this._answerCol      = c.answerCol;
    // 可选：扫描地址
    if (c.scanURLs        != null) this._scanURLs       = c.scanURLs;
    // 可选：CSV 数据文件
    if (c.dataURL         != null) this._csvURL          = c.dataURL;
  }
  if (this._rangeEnd === 0) this._rangeEnd = this._data.length;
},

/** 可选：从 CSV 解析数据（带表头跳过） */
_parseCSV(text) {
  const lines = text.split(/\r?\n/);
  let start = lines[0] && /^\w+,/.test(lines[0]) ? 1 : 0;
  return lines.slice(start).filter(l => l.trim()).map(l => {
    const c = l.split(',');
    return { prompt: c[0].trim(), answer: c[1].trim() };
  });
},
```

---

## 示例：最小插件

```js
const MyPlugin = {
  meta: { id:'my-subject', name:'我的学科', description:'描述', icon:'📚' },

  defaultCount: 5,
  defaultColumns: 3,
  defaultFontSize: 100,
  defaultLayout: 'grid',
  gridColumns: 4,
  listColumns: 2,
  gridFontSize: 100,
  listFontSize: 100,

  _data: [
    { prompt:'题目1', answer:'答案1' },
    { prompt:'题目2', answer:'答案2' },
  ],

  loadConfig() { /* 见上方模板 */ },
  async loadData() { return this._data; },

  renderPrompt(item) {
    return `<span>${esc(item.prompt)}</span>`;
  },
  renderAnswer(item) {
    return `<div class="a-line"><span class="a-label">答案</span><span class="a-val">${esc(item.answer)}</span></div>`;
  },
};
```

---

## 控件说明

| 控件 | 位置 | 操作 |
|---|---|---|
| 数量 | 听写页 | `-` `+` 步进、键盘输入、Enter |
| 列数 | 听写页 | `-` `+` 步进，1-6 |
| 字号 | 听写页 | `A-` `A+` 按钮、滑块 60%-200% |
| 布局 | 听写页 | `☰`/`⊞` 切换网格/列表 |
| 夜间 | 顶栏 | `🌙`/`☀️` 切换 |
| 公布答案 | 听写页 | 展开/收起 |
| 返回 | 听写页 | `←` 或点击 Logo |
| 随机点名 | 顶栏 | 选名单 → 点名 → 全屏动画 |

---

## 服务器文件扫描

`server.py` 内置通用 API：`/api/<学科名>-files` 自动返回 `data/<学科名>/` 下所有文件。

```json
[
  {"name": "unit1.xlsx", "url": "/data/my-subject/unit1.xlsx"},
  {"name": "unit2.csv",  "url": "/data/my-subject/unit2.csv"}
]
```

插件在 `config.js` 中配置 `scanURLs` 即可使用。插件内通过 `_scanDir(url)` 获取文件列表，通过 `_fetchFile(url)` 下载文件。

---

## 答案渲染

```html
<div class="a-line">
  <span class="a-label">标签</span>
  <span class="a-val">答案内容</span>
</div>
```

- `.a-val.orbital` — 等宽字体，适合化学轨道式
- 用 `em` 单位自动响应 `--card-font-scale`

---

## 投屏建议

| 屏幕 | 列数 | 字号 | 数量 |
|---|---|---|---|
| 1024×768 | 3 | 100% | 12 |
| 1920×1080 | 4 | 120% | 16 |
| ≥2560 | 5 | 140% | 20 |

---

## 用户需求记录

1. 网页版听写，多学科，随机出题，显示答案 ✅
2. 全班默写用，不计分；英语 Excel 导入 ✅；化学合并 ✅
3. 命名 SeaScribe，署名 谦虚の海鸥 ✅
4. 双击即用（数据内联）✅
5. 简约单页，答案同卡展开 ✅
6. 范围选择 ✅、字号无极 ✅、夜间模式 ✅
7. 步进器+键盘输入 ✅、字号滑块+按钮 ✅
8. 配置在文件中，无 localStorage ✅
9. 插件化架构 ✅
10. 夜间模式同步加载防闪白 ✅
11. 配置 `.js` 文件，行内注释 ✅
12. 美化下拉框和滚动条 ✅
13. 开屏动画 ✅
14. 标签页 favicon ✅
15. 随机点名：全屏遍历→定格弹跳→缩小飞入右上角 ✅
16. 名单管理 ✅
17. xlsx 导入听写数据，可自定列映射 ✅
18. 服务器文件扫描 API ✅
19. 列表/网格双模式切换 ✅
20. 模式独立列数和字号配置 ✅
21. 答案换行显示 ✅
22. 卡片序号跟随字号缩放 ✅
23. URL hash 路由 ✅
24. 开屏启动检查 ✅
25. 更新日志读取 update.md ✅
26. 代码模块化拆分，CSS/JS 按职责分文件 ✅
27. 化学数据 CSV 化，可编辑可导入 ✅
