// ================================================================
//  英语跟读配置 — 修改后刷新页面生效
//  struct: window._CONF.enword
// ================================================================

window._CONF = window._CONF || {};

window._CONF.enword = {

  // 【默认词库】data/enword/ 下的文件名
  defaultFile: "hf-00.view-available.txt",

  // 【朗读间隔】每个单词之间的停顿秒数，0.5 ~ 10
  readInterval: 3,

  // 【TTS 语速】0.5 ~ 2.0，浏览器语音合成速率
  ttsRate: 0.8,

  // 【起始序号】默认从第几个单词开始朗读（1-based）
  startIndex: 1,

  // 【显示字号】跟读页面字号百分比（60 ~ 200，100 = 默认）
  defaultFontSize: 100,

};

// 向后兼容
window.__ENWORD_CONFIG__ = window._CONF.enword;
