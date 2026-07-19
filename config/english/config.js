// ================================================================
//  英语学科配置 — 修改后刷新页面生效
//  struct: window._CONF.english
// ================================================================

window._CONF = window._CONF || {};

window._CONF.english = {

  // 【出题数量】每次随机抽几道，填 1 ~ 导入单词总数
  defaultCount: 20,

  // 【初始列数】刚打开英语时卡片分几列，填 1 ~ 6
  defaultColumns: 2,

  // 【默认布局】"list"=列表横向（推荐） / "grid"=网格方阵
  defaultLayout: "list",

  // 【初始字号】百分比基准，0 ~ 200，100=正常大小
  defaultFontSize: 130,

  // 【网格列数】切换到网格模式后的列数，1 ~ 6
  gridColumns: 4,

  // 【网格字号】切换到网格模式后的字号，0 ~ 200
  gridFontSize: 130,

  // 【列表列数】切换到列表模式后的列数，1 ~ 6
  listColumns: 2,

  // 【列表字号】切换到列表模式后的字号，0 ~ 200
  listFontSize: 130,

  // 【听写内容列】xlsx/csv 中哪列显示在卡片正面，0=A列 1=B列...
  promptCol: 1,

  // 【答案列】xlsx/csv 中哪列作为答案，0=A列 1=B列...
  answerCol: 0,

  // 【服务器扫描】部署后扫描 data/english/ 下所有文件
  scanURLs: [ "/api/english-files" ]

};

// 向后兼容
window.__ENGLISH_CONFIG__ = window._CONF.english;
