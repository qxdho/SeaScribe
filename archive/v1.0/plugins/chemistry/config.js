// 化学学科默认配置，修改后刷新页面生效
window.__CHEMISTRY_CONFIG__ = {
  defaultCount: 8,      // 每次出题数量，可选 1-36
  defaultColumns: 4,     // 卡片列数，可选 1-6，投屏建议 3 列
  defaultRangeStart: 0,  // 范围起始索引，0=H(氢)，29=Zn(锌)
  defaultRangeEnd: 30,   // 范围结束索引（不包含），30=到Zn，36=到Kr
  defaultFontSize: 100   // 字号百分比，可选 60-200，100=标准
};
