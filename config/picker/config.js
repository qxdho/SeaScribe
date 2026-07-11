/* ============================================================
   SeaScribe — Picker Configuration
   点名插件所有默认配置项，JS 中零硬编码兜底
   ============================================================ */

window.__PICKER_CONFIG__ = {
  /* 随机方式：'pure' | 'binary' | 'fair' */
  defaultMethod: 'pure',

  /* 修饰动画：'scroll'（姓名滚动+彩带） */
  defaultDecorative: 'scroll',

  /* "显示真实随机过程"开关，默认关闭 */
  showProcess: false,

  /* 过程动画模式：'fullscreen' | 'windowed' */
  processMode: 'fullscreen',

  /* 时间戳记录开关，默认开启 */
  timestampEnabled: true,

  /* 时间加权随机法 —— 子集比例（0~1） */
  fairSubsetRatio: 0.3,

  /* 时间加权随机法 —— 每轮最少/最终目标人数 */
  fairTargetSize: 5,

  /* ====== 动画时序 ====== */

  /* 修饰动画最短滚动时长 (ms) */
  decorMinMs: 2500,

  /* 修饰动画滚名字间隔 (ms) */
  decorIntervalMs: 80,

  /* 过程动画结果展示时长 (ms) */
  processResultMs: 800,

  /* 过程动画淡出时长 (ms) */
  processFadeMs: 300,

  /* 二分法每步间隔 (ms) */
  binaryStepDelay: 1000,

  /* 时间加权随机法子集展示后等待 (ms) */
  fairStepDelay: 1200,

  /* 时间加权随机法结果选定后等待 (ms) */
  fairResultDelay: 1000,

  /* confetti 粒子数量 */
  confettiCount: 200,

  /* ====== 可用选项列表（供 Modal 渲染） ====== */

  methods: [
    { id: 'pure',    name: '纯随机',      desc: '经典 Fisher-Yates 洗牌，完全随机抽取一人' },
    { id: 'binary',  name: '二分法',      desc: '名单不断对半分组并淘汰，逐步缩小直到剩一人' },
    { id: 'fair',    name: '时间加权随机法',    desc: '先随机子集，优先从未被点过的人中选，否则选间隔最长者' },
  ],

  decorativeAnimations: [
    { id: 'scroll',  name: '姓名滚动',    desc: '全屏快速滚动姓名后定格（当前效果）' },
  ],

  processModes: [
    { id: 'fullscreen', name: '全屏',     desc: '过程动画铺满整个屏幕' },
    { id: 'windowed',   name: '窗口化',   desc: '过程动画显示在居中卡片内' },
  ],
};
