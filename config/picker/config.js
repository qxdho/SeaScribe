// ================================================================
//  随机点名配置 — 修改后刷新页面生效
//  struct: window._CONF.picker
// ================================================================

window._CONF = window._CONF || {};

window._CONF.picker = {

  // ── 默认值 ──

  defaultMethod: "fair",
  defaultDecorative: "scroll",
  showProcess: false,
  processMode: "fullscreen",
  timestampEnabled: true,

  // ── 点多人 ──

  defaultCount: 1,              // 默认一次点几人（面板可调 1-countMax）
  countMax: 10,                 // 人数上限
  defaultMultiMode: "simultaneous",  // 多人动画模式："simultaneous" 同时定格 / "sequential" 逐个定格

  // ── Fair 算法参数 ──

  fairSubsetRatio: 0.3,
  fairTargetSize: 5,

  // ── 动画时长 (ms) ──

  decorMinMs: 1700,
  decorIntervalMs: 65,
  processResultMs: 800,
  processFadeMs: 300,
  binaryStepDelay: 800,
  fairStepDelay: 1000,
  fairResultDelay: 1000,

  // ── 特效 ──

  confettiCount: 200,

  // ── 选项列表 ──

  methods: [
    { id: "pure",   name: "纯随机",          desc: "Fisher-Yates 洗牌，完全随机" },
    { id: "binary", name: "二分法",          desc: "对半分组逐步淘汰，有戏剧感" },
    { id: "fair",   name: "时间加权随机法",   desc: "优先未点过的，否则选间隔最长者" },
  ],

  decorativeAnimations: [
    { id: "scroll", name: "姓名滚动", desc: "全屏滚动姓名 + confetti 彩带" },
  ],

  processModes: [
    { id: "fullscreen", name: "全屏",     desc: "过程铺满屏幕" },
    { id: "windowed",   name: "窗口化",   desc: "居中卡片显示" },
  ],

};

// 向后兼容
window.__PICKER_CONFIG__ = window._CONF.picker;
