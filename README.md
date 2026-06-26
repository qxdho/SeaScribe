<p align="center"><sub>✍️🌊</sub></p>

# SeaScribe

> 课堂听写投屏系统 — 教师大屏随机出题，学生纸笔作答，一键公布答案
> 
> by **谦虚の海鸥** · v3.0.0 · [GitHub](https://github.com/qxdho/SeaScribe)

---

## 快速开始

```
双击 index.html 即用（纯静态，无需服务器）
```

部署到服务器：

```
python server.py 9360
```

访问 `http://服务器IP:9360`

---

## 功能

- **随机出题**：选中学科，设定数量，点击「随机出题」
- **公布答案**：点击「公布答案」，答案卡片内展开
- **布局切换**：网格模式（卡片方阵）/ 列表模式（横向排列），点击 `☰`/`⊞` 按钮切换
- **随机点名**：选班级，点「点名」，全屏动画滚动后定格
- **夜间模式**：点击 `🌙`/`☀️` 切换深色/浅色主题
- **插件化**：`plugins/` 目录下每学科独立文件夹，复制模板即可添加新学科

### 学科插件

| 学科 | 特点 |
|------|------|
| **化学** | 价层电子式 + 轨道式，H~Kr 36 元素，支持范围选择，默认网格 4 列 |
| **英语** | 服务器扫描 + 本地 xlsx/csv 导入，可调听写列/答案列，默认列表 2 列 |

---

## 目录结构

```
├── index.html              ← 主页面（仅 HTML 骨架）
├── server.py               ← 生产服务器（禁止目录浏览 + 文件列表 API）
├── update.md               ← 更新日志
├── main/
│   ├── css/                ← 样式（9 个文件，按职责拆分）
│   │   ├── theme.css       ← CSS 变量 + 亮/暗主题
│   │   ├── base.css        ← reset + 排版
│   │   ├── topbar.css      ← 顶栏 + 点名选择器
│   │   ├── pages.css       ← 页面切换 + 学科卡片
│   │   ├── controls.css    ← 控件（stepper/slider/按钮）
│   │   ├── cards.css       ← 听写卡片 + 答案展开
│   │   ├── splash.css      ← 开屏动画
│   │   ├── changelog.css   ← 更新日志弹窗
│   │   └── responsive.css  ← 响应式
│   └── js/                 ← 脚本（9 个文件，按职责拆分）
│       ├── core.js         ← SubjectRegistry + DictationEngine
│       ├── theme.js        ← 夜间模式切换
│       ├── navigator.js    ← 页面切换 + hash 路由
│       ├── controls.js     ← 字号/列数/布局/数量控件
│       ├── cards.js        ← 卡片渲染 + 随机出题 + 公布答案
│       ├── picker.js       ← 随机点名全屏动画
│       ├── changelog.js    ← 更新日志弹窗
│       ├── splash.js       ← 开屏动画 + 启动自检
│       └── app.js          ← 入口：注册插件 + 渲染学科页
├── config/
│   ├── config.js           ← 主配置（主题）
│   ├── chemistry/          ← 化学配置
│   └── english/            ← 英语配置
├── plugins/
│   ├── chemistry/          ← 化学插件
│   ├── english/            ← 英语插件
│   └── _template/          ← 插件模板
└── data/
    ├── english/            ← 英语 xlsx/csv 文件
    └── stdlist/            ← 学生名单
```

---

## 配置

所有配置在 `config/` 目录中，修改后刷新页面即可生效。

**主配置** `config/config.js`：
```js
window.__SEASCRIBE_CONFIG__ = {
  theme: "light"  // "light" 或 "dark"
};
```

**学科配置** `config/化学/config.js`、`config/英语/config.js`：
```js
{
  defaultCount: 8,       // 每次出题数量
  defaultColumns: 4,     // 初始列数
  defaultLayout: "grid", // 默认布局
  defaultFontSize: 100,  // 初始字号（%）
  gridColumns: 4,        // 网格模式列数
  gridFontSize: 100,     // 网格模式字号
  listColumns: 2,        // 列表模式列数
  listFontSize: 100,     // 列表模式字号
  // 化学特有
  defaultRangeStart: 0,  // 元素范围起点
  defaultRangeEnd: 30,   // 元素范围终点
  // 英语特有
  promptCol: 1,          // 听写内容列（0=A）
  answerCol: 0,          // 答案列
  scanURLs: ["/api/english-files"]  // 服务器扫描地址
}
```

---

## 添加新学科

参见 **[PLUGINS.md](./PLUGINS.md)**

---

## 投屏建议

| 屏幕分辨率 | 推荐列数 | 推荐字号 | 推荐数量 |
|-----------|---------|---------|---------|
| 1024×768 | 3 | 100% | 12 |
| 1920×1080 | 4 | 120% | 16 |
| ≥2560 | 5 | 140% | 20 |

---

## 技术栈

HTML5 + CSS3 + Vanilla JS · 零框架 · CSS Custom Properties · CSS Grid · CSS Multi-Column

## License

MIT

---

## 版本历史

| 版本 | 架构 | 亮点 |
|------|------|------|
| **v3.0** | 9 CSS + 9 JS 模块化 | SubjectRegistry + DictationEngine，配置分离，插件模板 |
| **v2.0** | CSS/JS 初步拆分 | 网格/列表双布局，config/ 目录，英语服务器扫描 |
| **v1.0** | 单文件 style.css + core.js | 化学轨道式，英语 xlsx 导入，随机点名，插件化架构 |

> 旧版本源码归档在 `archive/` 目录中
