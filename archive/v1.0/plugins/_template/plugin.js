/* ============================================================
   SeaScribe — Plugin Template
   目录：plugins/你的学科/
   文件：config.js（配置）+ plugin.js（本文件）
   ============================================================ */

const MyPlugin = {
  meta: { id:'my-subject', name:'我的学科', description:'简要描述', icon:'📚' },

  defaultCount: 10,
  defaultColumns: 3,
  defaultFontSize: 100,
  _rangeStart: 0,
  _rangeEnd: 0,

  _data: [
    { prompt:'题目1提示', answer:'题目1答案' },
    { prompt:'题目2提示', answer:'题目2答案' },
  ],

  loadConfig() {
    const c = window.__MY_SUBJECT_CONFIG__;
    if (c) {
      if (c.defaultCount    != null) this.defaultCount    = c.defaultCount;
      if (c.defaultColumns  != null) this.defaultColumns  = c.defaultColumns;
      if (c.defaultFontSize != null) this.defaultFontSize = c.defaultFontSize;
      if (c.defaultRangeStart!=null) this._rangeStart     = c.defaultRangeStart;
      if (c.defaultRangeEnd != null) this._rangeEnd       = c.defaultRangeEnd;
    }
    if (this._rangeEnd === 0) this._rangeEnd = this._data.length;
  },

  async loadData() { return this._data; },
  getRange() { return [this._rangeStart, this._rangeEnd]; },

  renderPrompt(item) {
    return `<strong>${esc(item.prompt)}</strong>`;
  },

  renderAnswer(item) {
    return `<div class="a-line"><span class="a-label">答案</span><span class="a-val">${esc(item.answer)}</span></div>`;
  },

  configUI(container) {
    const opts = this._data.map((el,i) =>
      `<option value="${i}">${esc(el.prompt)}</option>`).join('');
    container.innerHTML = `
      <span class="ctrl-label">范围</span>
      <select class="range-select" id="range-start">${opts}</select>
      <span class="range-sep">—</span>
      <select class="range-select" id="range-end">${opts}</select>`;
    const s = container.querySelector('#range-start');
    const e = container.querySelector('#range-end');
    s.value = this._rangeStart;
    e.value  = this._rangeEnd - 1;
    s.addEventListener('change', () => {
      const sv=parseInt(s.value), ev=parseInt(e.value);
      if(sv>ev){s.value=ev;this._rangeStart=ev;}else this._rangeStart=sv;
      if(this._rangeStart>=this._rangeEnd){this._rangeEnd=Math.min(this._rangeStart+1,this._data.length);e.value=this._rangeEnd-1;}
    });
    e.addEventListener('change', () => {
      const sv=parseInt(s.value), ev=parseInt(e.value);
      if(ev<sv){e.value=sv;this._rangeEnd=sv+1;}else this._rangeEnd=ev+1;
    });
  },
};

function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
