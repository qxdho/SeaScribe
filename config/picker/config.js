// ================================================================
//  随机点名配置 — 修改后刷新页面生效
// ================================================================

window.__PICKER_CONFIG__ = {

  // 【默认随机方式】弹窗打开时的预选值
  //   'pure'   — 纯随机，Fisher-Yates 洗牌，每人概率均等
  //   'binary' — 二分法，名单不断对半分淘汰直到剩一人
  //   'fair'   — 时间加权随机法，优先选未被点过的人，否则选间隔最长者
  defaultMethod: 'fair',

  // 【默认修饰动画】结果展示时的全屏效果
  //   'scroll' — 姓名滚动 + confetti 彩带
  defaultDecorative: 'scroll',

  // 【显示过程】是否展示中间计算步骤
  //   true  — 展示分组、淘汰等过程
  //   false — 跳过过程，直接出结果
  showProcess: false,

  // 【过程模式】showProcess=true 时的显示风格
  //   'fullscreen' — 全屏铺满
  //   'windowed'   — 居中卡片显示
  processMode: 'fullscreen',

  // 【记录时间戳】点名后保存时间，供 fair 方式使用
  //   true  — 保存到 data/picker/ 下 JSON 文件
  //   false — 不记录
  timestampEnabled: true,

  // 【子集比例】fair 方式先随机取多大比例的候选池，0.1 ~ 1.0
  fairSubsetRatio: 0.3,

  // 【目标人数】fair 方式子集至少保留几人，1 ~ 总人数
  fairTargetSize: 5,

  // 【滚动时长】修饰动画滚名字总时长 (ms)，1000 ~ 8000
  decorMinMs: 2000,

  // 【滚动间隔】两个名字切换间隔 (ms)，30 ~ 300
  decorIntervalMs: 80,

  // 【结果定格】选定后定格时长 (ms)，300 ~ 3000
  processResultMs: 800,

  // 【过程淡出】过程窗口关闭渐变时长 (ms)，100 ~ 1000
  processFadeMs: 300,

  // 【二分步间隔】二分法每轮停顿 (ms)，300 ~ 3000
  binaryStepDelay: 1000,

  // 【fair 子集等待】fair 候选展示后停顿 (ms)，500 ~ 5000
  fairStepDelay: 1200,

  // 【fair 结果等待】fair 选定后停顿 (ms)，500 ~ 3000
  fairResultDelay: 1000,

  // 【彩带数量】confetti 粒子数，0=不放，0 ~ 500
  confettiCount: 200,

  // ====== 弹窗选项列表（可增删调序，不改 id） ======

  methods: [
    { id: 'pure',    name: '纯随机',            desc: 'Fisher-Yates 洗牌，完全随机' },
    { id: 'binary',  name: '二分法',            desc: '对半分组逐步淘汰，有戏剧感' },
    { id: 'fair',    name: '时间加权随机法',     desc: '优先未点过的，否则选间隔最长者' },
  ],

  decorativeAnimations: [
    { id: 'scroll',  name: '姓名滚动',          desc: '全屏滚动姓名 + confetti 彩带' },
  ],

  processModes: [
    { id: 'fullscreen', name: '全屏',           desc: '过程铺满屏幕' },
    { id: 'windowed',   name: '窗口化',         desc: '居中卡片显示' },
  ],
};
