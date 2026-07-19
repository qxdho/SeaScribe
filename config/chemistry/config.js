// ================================================================
//  化学学科配置 — 修改后刷新页面生效
//  struct: window._CONF.chemistry
// ================================================================

window._CONF = window._CONF || {};

window._CONF.chemistry = {

  // 【出题数量】每次随机抽几道，填 1 ~ 36
  defaultCount: 8,

  // 【初始列数】刚打开化学时卡片分几列，填 1 ~ 6
  defaultColumns: 4,

  // 【默认布局】"grid"=网格方阵 / "list"=列表横向
  defaultLayout: "grid",

  // 【初始字号】百分比基准，0 ~ 200，100=正常大小
  defaultFontSize: 100,

  // 【网格列数】切换到网格模式后的列数，1 ~ 6
  gridColumns: 4,

  // 【网格字号】切换到网格模式后的字号，0 ~ 200
  gridFontSize: 100,

  // 【列表列数】切换到列表模式后的列数，1 ~ 6
  listColumns: 2,

  // 【列表字号】切换到列表模式后的字号，0 ~ 200
  listFontSize: 100,

  // 【起始元素】从第几个元素开始出题，0=H(氢)，29=Zn(锌)
  defaultRangeStart: 0,

  // 【结束元素】出题截止位置（不包含），0=到H(氢)，36=到Kr(氪)
  defaultRangeEnd: 30,

  // 【数据路径】默认加载的 CSV 文件（相对于 index.html）
  dataURL: "data/chemistry/elements.csv",

  // 【服务器扫描】部署后扫描 data/chemistry/ 下所有 CSV 文件
  scanURLs: [ "/api/chemistry-files" ]

};

// 向后兼容
window.__CHEMISTRY_CONFIG__ = window._CONF.chemistry;
