# SeaScribe — Plugin Development Guide

4 steps to add a new subject:
copy template → write config → write logic → register loading.

---

## 1. Copy template

```
cp -r plugins/_template plugins/{your-subject}
cp config/_template/config.js config/{your-subject}/config.js
```

---

## 2. Config file

`config/{your-subject}/config.js`:
```js
window._CONF = window._CONF || {};

window._CONF.yourSubject = {
  defaultCount: 10,        // 每次出题数量
  defaultColumns: 3,       // 初始列数 1-6
  defaultFontSize: 100,    // 初始字号 60-200
  defaultLayout: "grid",   // "grid" | "list"

  gridColumns: 4,          // 网格模式列数
  gridFontSize: 100,       // 网格模式字号
  listColumns: 2,          // 列表模式列数
  listFontSize: 100,       // 列表模式字号

  // 可选
  defaultRangeStart: 0,    // 起始索引
  defaultRangeEnd: 0,      // 结束索引（0=自动）
  promptCol: 0,            // 听写列（0=A列）
  answerCol: 1,            // 答案列
  scanURLs: ["/api/my-subject-files"],
  dataURL: "data/my-subject/data.csv",
};
// 向后兼容
window.__MY_SUBJECT_CONFIG__ = window._CONF.yourSubject;
```

---

## 3. Plugin logic

`plugins/{your-subject}/plugin.js`:
```js
const MyPlugin = {
  meta: { id: "my-subject", name: "我的学科", description: "简短描述", icon: "📎" },

  defaultCount: 5, defaultColumns: 3, defaultFontSize: 100,
  defaultLayout: "grid",
  gridColumns: 4, listColumns: 2,
  gridFontSize: 100, listFontSize: 100,

  _data: [],

  loadConfig() {
    // 使用 window._CONF.yourSubject 或向后兼容的旧名
    PluginUtils.loadConfig(this, window.__MY_SUBJECT_CONFIG__, {
      defaultRangeStart: "_rangeStart",
      defaultRangeEnd: "_rangeEnd",
      dataURL: "_csvURL",
      promptCol: "_promptCol",
      answerCol: "_answerCol",
    });
  },

  async loadData() { return this._data; },
  getRange() { return [this._rangeStart, this._rangeEnd]; },

  renderPrompt(item) {
    return `<span class="card-word">${SeaScribe.esc(item.prompt)}</span>`;
  },
  renderAnswer(item) {
    return `<div class="a-line">
      <span class="a-label">答案</span>
      <span class="a-val">${SeaScribe.esc(item.answer)}</span>
    </div>`;
  },

  configUI(container) {
    container.innerHTML = "..."; // 自定义控件
    CustomSelect.initAll(container); // 必须调用
  },
};
```

---

## 4. Register loading

`index.html` 底部添加：
```html
<script src="config/{your-subject}/config.js"></script>
<script src="plugins/{your-subject}/plugin.js"></script>
```

`main/client/js/app.js` 中：
```js
SubjectRegistry.register(MyPlugin);
```

---

## 接口参考

### 必需
| 成员 | 类型 | 说明 |
|------|------|------|
| `meta` | `{id, name, description, icon}` | 插件元信息 |
| `defaultCount/Columns/FontSize/Layout` | Number/String | 默认值 |
| `gridColumns/listColumns` | Number | 1-6 |
| `gridFontSize/listFontSize` | Number | 60-200 |
| `loadConfig()` | Function | 读取 `window._CONF.{subject}` |
| `loadData()` | Async | 返回 `[{prompt, answer}]` |
| `renderPrompt(item)` | Function | 返回题目 HTML |
| `renderAnswer(item)` | Function | 返回答案 HTML |

### 可选
| 成员 | 说明 |
|------|------|
| `getRange()` | 返回 `[start, end)` |
| `configUI(container)` | 渲染自定义控件（**必须**调 `CustomSelect.initAll(container)`） |

---

## PluginUtils

| 方法 | 说明 |
|------|------|
| `loadConfig(plugin, config, extraMap)` | 加载标准属性 + 自定义映射 |
| `scanDir(url, extRegex)` | 扫描服务器目录 |
| `refreshCount(plugin)` | 刷新数量上限 |
| `parseCSV(text)` | CSV → `[{prompt, answer}]` |

---

## 目录约定

```
config/{your-subject}/config.js      用户可编辑
plugins/{your-subject}/plugin.js      插件逻辑
data/{your-subject}/                  数据文件
```

---

## 服务器扫描
`/api/<学科名>-files` → 返回 `data/<学科名>/` 下文件 JSON 列表。
