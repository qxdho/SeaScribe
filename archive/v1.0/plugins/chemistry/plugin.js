/* ============================================================
   SeaScribe — Chemistry Plugin
   配置：plugins/chemistry/config.js → window.__CHEMISTRY_CONFIG__
   ============================================================ */

const ChemistryPlugin = {
  meta: { id:'chemistry', name:'化学', description:'价层电子式 & 价层轨道式', icon:'⚗️' },

  defaultCount: 12,
  defaultColumns: 3,
  defaultFontSize: 100,
  _rangeStart: 0,
  _rangeEnd: 30,

  /** 内联数据 H~Kr 36 元素 */
  _data: [
    {symbol:"H", name:"氢", electron:"1s¹", orbital:"1s: [↑]"},
    {symbol:"He",name:"氦", electron:"1s²", orbital:"1s: [↑↓]"},
    {symbol:"Li",name:"锂", electron:"2s¹", orbital:"2s: [↑]"},
    {symbol:"Be",name:"铍", electron:"2s²", orbital:"2s: [↑↓]"},
    {symbol:"B", name:"硼", electron:"2s² 2p¹", orbital:"2s: [↑↓]  2p: [↑][ ][ ]"},
    {symbol:"C", name:"碳", electron:"2s² 2p²", orbital:"2s: [↑↓]  2p: [↑][↑][ ]"},
    {symbol:"N", name:"氮", electron:"2s² 2p³", orbital:"2s: [↑↓]  2p: [↑][↑][↑]"},
    {symbol:"O", name:"氧", electron:"2s² 2p⁴", orbital:"2s: [↑↓]  2p: [↑↓][↑][↑]"},
    {symbol:"F", name:"氟", electron:"2s² 2p⁵", orbital:"2s: [↑↓]  2p: [↑↓][↑↓][↑]"},
    {symbol:"Ne",name:"氖", electron:"2s² 2p⁶", orbital:"2s: [↑↓]  2p: [↑↓][↑↓][↑↓]"},
    {symbol:"Na",name:"钠", electron:"3s¹", orbital:"3s: [↑]"},
    {symbol:"Mg",name:"镁", electron:"3s²", orbital:"3s: [↑↓]"},
    {symbol:"Al",name:"铝", electron:"3s² 3p¹", orbital:"3s: [↑↓]  3p: [↑][ ][ ]"},
    {symbol:"Si",name:"硅", electron:"3s² 3p²", orbital:"3s: [↑↓]  3p: [↑][↑][ ]"},
    {symbol:"P", name:"磷", electron:"3s² 3p³", orbital:"3s: [↑↓]  3p: [↑][↑][↑]"},
    {symbol:"S", name:"硫", electron:"3s² 3p⁴", orbital:"3s: [↑↓]  3p: [↑↓][↑][↑]"},
    {symbol:"Cl",name:"氯", electron:"3s² 3p⁵", orbital:"3s: [↑↓]  3p: [↑↓][↑↓][↑]"},
    {symbol:"Ar",name:"氩", electron:"3s² 3p⁶", orbital:"3s: [↑↓]  3p: [↑↓][↑↓][↑↓]"},
    {symbol:"K", name:"钾", electron:"4s¹", orbital:"4s: [↑]"},
    {symbol:"Ca",name:"钙", electron:"4s²", orbital:"4s: [↑↓]"},
    {symbol:"Sc",name:"钪", electron:"3d¹ 4s²", orbital:"3d: [↑][ ][ ][ ][ ]  4s: [↑↓]"},
    {symbol:"Ti",name:"钛", electron:"3d² 4s²", orbital:"3d: [↑][↑][ ][ ][ ]  4s: [↑↓]"},
    {symbol:"V", name:"钒", electron:"3d³ 4s²", orbital:"3d: [↑][↑][↑][ ][ ]  4s: [↑↓]"},
    {symbol:"Cr",name:"铬", electron:"3d⁵ 4s¹", orbital:"3d: [↑][↑][↑][↑][↑]  4s: [↑]"},
    {symbol:"Mn",name:"锰", electron:"3d⁵ 4s²", orbital:"3d: [↑][↑][↑][↑][↑]  4s: [↑↓]"},
    {symbol:"Fe",name:"铁", electron:"3d⁶ 4s²", orbital:"3d: [↑↓][↑][↑][↑][↑]  4s: [↑↓]"},
    {symbol:"Co",name:"钴", electron:"3d⁷ 4s²", orbital:"3d: [↑↓][↑↓][↑][↑][↑]  4s: [↑↓]"},
    {symbol:"Ni",name:"镍", electron:"3d⁸ 4s²", orbital:"3d: [↑↓][↑↓][↑↓][↑][↑]  4s: [↑↓]"},
    {symbol:"Cu",name:"铜", electron:"3d¹⁰ 4s¹",orbital:"3d: [↑↓][↑↓][↑↓][↑↓][↑↓]  4s: [↑]"},
    {symbol:"Zn",name:"锌", electron:"3d¹⁰ 4s²",orbital:"3d: [↑↓][↑↓][↑↓][↑↓][↑↓]  4s: [↑↓]"},
    {symbol:"Ga",name:"镓", electron:"4s² 4p¹", orbital:"4s: [↑↓]  4p: [↑][ ][ ]"},
    {symbol:"Ge",name:"锗", electron:"4s² 4p²", orbital:"4s: [↑↓]  4p: [↑][↑][ ]"},
    {symbol:"As",name:"砷", electron:"4s² 4p³", orbital:"4s: [↑↓]  4p: [↑][↑][↑]"},
    {symbol:"Se",name:"硒", electron:"4s² 4p⁴", orbital:"4s: [↑↓]  4p: [↑↓][↑][↑]"},
    {symbol:"Br",name:"溴", electron:"4s² 4p⁵", orbital:"4s: [↑↓]  4p: [↑↓][↑↓][↑]"},
    {symbol:"Kr",name:"氪", electron:"4s² 4p⁶", orbital:"4s: [↑↓]  4p: [↑↓][↑↓][↑↓]"}
  ],

  loadConfig() {
    const c = window.__CHEMISTRY_CONFIG__;
    if (c) {
      if (c.defaultCount    != null) this.defaultCount    = c.defaultCount;
      if (c.defaultColumns  != null) this.defaultColumns  = c.defaultColumns;
      if (c.defaultFontSize != null) this.defaultFontSize = c.defaultFontSize;
      if (c.defaultRangeStart!=null) this._rangeStart     = c.defaultRangeStart;
      if (c.defaultRangeEnd != null) this._rangeEnd       = c.defaultRangeEnd;
    }
  },

  async loadData() { return this._data; },
  getRange() { return [this._rangeStart, this._rangeEnd]; },

  renderPrompt(item) {
    return `<span class="card-symbol">${esc(item.symbol)}</span>
            <span class="card-cn">${esc(item.name)}</span>`;
  },

  renderAnswer(item) {
    return `<div class="a-line"><span class="a-label">电子式</span><span class="a-val">${this._fmtElectron(item.electron)}</span></div>
            <div class="a-line"><span class="a-label">轨道式</span><span class="a-val orbital">${esc(item.orbital)}</span></div>`;
  },

  configUI(container) {
    const opts = this._data.map((el,i) =>
      `<option value="${i}">${el.symbol} ${el.name}</option>`).join('');
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
      const sv = parseInt(s.value), ev = parseInt(e.value);
      if (sv > ev) { s.value = ev; this._rangeStart = ev; }
      else this._rangeStart = sv;
      if (this._rangeStart >= this._rangeEnd) {
        this._rangeEnd = Math.min(this._rangeStart + 1, this._data.length);
        e.value = this._rangeEnd - 1;
      }
    });
    e.addEventListener('change', () => {
      const sv = parseInt(s.value), ev = parseInt(e.value);
      if (ev < sv) { e.value = sv; this._rangeEnd = sv + 1; }
      else this._rangeEnd = ev + 1;
    });
  },

  _fmtElectron(text) {
    const m = {'¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁰':'0'};
    let o='',s=false;
    for(const c of text){if(m[c]!==undefined){if(!s){o+='<sup>';s=true;}o+=m[c];}else{if(s){o+='</sup>';s=false;}o+=esc(c);}}
    if(s)o+='</sup>';
    return o;
  },
};

function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
