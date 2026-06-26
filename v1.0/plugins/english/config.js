// 英语学科默认配置，修改后刷新页面生效
window.__ENGLISH_CONFIG__ = {
  defaultCount: 20,       // 每次出题数量，导入xlsx后自动更新
  defaultColumns: 4,     // 卡片列数，可选 1-6
  defaultFontSize: 130,  // 字号百分比，可选 60-200，100=标准
  promptCol: 1,          // xlsx 听写内容所在列，0=A, 1=B …
  answerCol: 0,          // xlsx 答案所在列，0=A, 1=B …
  scanURLs: [            // 扫描目录列表，部署后可写完整URL
    "/api/english-files",
  ]
};
