// ================================================================
//  SeaScribe 主配置 — 修改后刷新页面生效
//  struct: window._CONF.main
// ================================================================

window._CONF = window._CONF || {};

window._CONF.main = {

  // 【主题】界面配色方案
  //   "light" — 浅色主题，白底黑字
  //   "dark"  — 深色主题（夜间模式），黑底白字
  //   运行时也可通过顶栏 🌙 按钮切换
  theme: "light"

};

// 向后兼容
window.__SEASCRIBE_CONFIG__ = window._CONF.main;
