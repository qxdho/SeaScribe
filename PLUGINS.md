# SeaScribe — 插件开发指南

添加新学科只需 **4 步**：复制模板 → 写配置 → 写逻辑 → 注册加载。

---

## 第一步：复制模板

```
cp -r plugins/_template plugins/你的学科
cp config/_template/config.js config/你的学科/config.js
```

模板已包含完整的接口骨架，直接改即可。

---

## 第二步：写配置文件

`config/你的学科/config.js`：

```js
window.__MY_SUBJECT_CONFIG__ = {
  // 基础
  defaultCount: 10,        // 每次出题数量
  defaultColumns: 3,       // 初始列数 1-6
  defaultFontSize: 100,    // 初始字号 60-200
  defaultLayout: "grid",   // "grid"=网格方阵 / "list"=列表横向

  // 网格模式
  gridColumns: 4,
  gridFontSize: 100,

  // 列表模式
  listColumns: 2,
  listFontSize: 100,

  // 可选：按范围抽题
  defaultRangeStart: 0,
  defaultRangeEnd: 0,      // 0 = 自动设为数据总量

  // 可选：Excel 导入
  promptCol: 0,            // 听写内容列（0=A列）
  answerCol: 1,            // 答案列
  scanURLs: [              // 服务器扫描
    "/api/my-subject-files",
  ],

  // 可选：CSV 数据文件
  dataURL: "data/my-subject/data.csv",
};
```

---

## 第三步：写插件逻辑

`plugins/你的学科/plugin.js`：

```js
const MyPlugin = {
  meta: {
    id: 'my-subject',
    name: '我的学科',
    description: '简短描述',
    icon: '📚'            // emoji 或内联 SVG
  },

  // 默认值（会被配置覆盖）
  defaultCount: 5,
  defaultColumns: 3,
  defaultFontSize: 100,
  defaultLayout: 'grid',
  gridColumns: 4,
  listColumns: 2,
  gridFontSize: 100,
  listFontSize: 100,

  _data: [],

  // 加载配置
  loadConfig() {
    PluginUtils.loadConfig(this, window.__MY_SUBJECT_CONFIG__, {
      defaultRangeStart: '_rangeStart',
      defaultRangeEnd: '_rangeEnd',
      dataURL: '_csvURL',
      promptCol: '_promptCol',
      answerCol: '_answerCol',
    });
  },

  // 返回题目数组 [{prompt, answer}, ...]
  async loadData() {
    // 硬编码数据 或 fetch CSV 或 fetch API
    return this._data;
  },

  // 可选：返回抽题范围 [start, end)
  getRange() {
    return [this._rangeStart, this._rangeEnd];
  },

  // 渲染题目 HTML
  renderPrompt(item) {
    return `<span class="card-word">${SeaScribe.esc(item.prompt)}</span>`;
  },

  // 渲染答案 HTML
  renderAnswer(item) {
    return `<div class="a-line">
      <span class="a-label">答案</span>
      <span class="a-val">${SeaScribe.esc(item.answer)}</span>
    </div>`;
  },

  // 可选：渲染自定义控件
  configUI(container) {
    container.innerHTML = `<button>自定义按钮</button>`;
    CustomSelect.initAll(container);
  },
};
```

---

## 第四步：注册并加载

在 `index.html` 底部添加脚本引用（放在 plugin-utils.js 之后、app.js 之前）：

```html
<script src="config/你的学科/config.js"></script>
<script src="plugins/你的学科/plugin.js"></script>
```

在 `main/js/app.js` 中注册：

```js
SubjectRegistry.register(MyPlugin);
```

刷新页面即可在学科选择页看到新卡片。

---

## 接口参考

### 必需成员

| 成员 | 类型 | 说明 |
|------|------|------|
| `meta` | Object | `{id, name, description, icon}` |
| `defaultCount` | Number | 默认出题数 |
| `defaultColumns` | Number | 默认列数 |
| `defaultFontSize` | Number | 默认字号 60-200 |
| `defaultLayout` | String | `"grid"` 或 `"list"` |
| `gridColumns` | Number | 网格列数 1-6 |
| `listColumns` | Number | 列表列数 1-6 |
| `gridFontSize` | Number | 网格字号 60-200 |
| `listFontSize` | Number | 列表字号 60-200 |
| `loadConfig()` | Function | 从 `window.__XXX_CONFIG__` 读取配置 |
| `loadData()` | Async | 返回 `[{prompt, answer}, ...]` |
| `renderPrompt(item)` | Function | 返回题目 HTML |
| `renderAnswer(item)` | Function | 返回答案 HTML |

### 可选成员

| 成员 | 类型 | 说明 |
|------|------|------|
| `getRange()` | Function | 返回 `[start, end)`，控制抽题范围 |
| `configUI(container)` | Function | 渲染自定义控件到听写页控制栏 |

---

## PluginUtils 工具集

插件可调用 `PluginUtils` 的公共方法（定义在 `main/js/plugin-utils.js`）：

| 方法 | 说明 |
|------|------|
| `loadConfig(plugin, config, extraMap)` | 从配置对象加载标准属性 |
| `scanDir(url, extRegex)` | 扫描服务器目录，返回文件列表 |
| `refreshCount(plugin)` | 根据 `_data` 长度刷新数量上限 |
| `parseCSV(text)` | 解析 CSV 文本为 `[{prompt,answer}]` |

### loadConfig 映射表

`extraMap` 参数将配置键映射到插件内部属性：

```js
PluginUtils.loadConfig(this, window.__MY_CONFIG__, {
  dataURL: '_csvURL',              // config.dataURL → this._csvURL
  defaultRangeStart: '_rangeStart', // config.defaultRangeStart → this._rangeStart
  defaultRangeEnd: '_rangeEnd',
  promptCol: '_promptCol',
  answerCol: '_answerCol',
});
```

未列入 extraMap 的属性从 `std` 标准列表中自动映射（defaultCount、defaultColumns、defaultFontSize、defaultLayout、gridColumns、listColumns、gridFontSize、listFontSize、scanURLs）。

---

## 目录约定

```
config/你的学科/
└── config.js      配置文件（用户可编辑）

plugins/你的学科/
└── plugin.js      插件逻辑（数据+渲染+控件）

data/你的学科/     可选：xlsx/csv 数据文件
```

---

## 服务器文件扫描

`server.py` 内置通用 API：访问 `/api/<学科名>-files` 自动返回 `data/<学科名>/` 下所有文件：

```json
[
  {"name": "unit1.xlsx", "url": "/data/my-subject/unit1.xlsx"},
  {"name": "unit2.csv",  "url": "/data/my-subject/unit2.csv"}
]
```

在 `config.js` 中配置 `scanURLs` 后，插件可调用 `PluginUtils.scanDir()` 获取文件列表。

---

## 答案渲染样式

推荐的答案 HTML 结构：

```html
<div class="a-line">
  <span class="a-label">电子式</span>
  <span class="a-val">答案内容</span>
</div>
```

可用样式类：
- `.a-val.orbital` — 等宽字体 + 背景色，适合化学轨道式
- 用 `em` 单位配合 `--card-font-scale` 自动响应字号变化
