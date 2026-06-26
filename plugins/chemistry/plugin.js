/* ============================================================
   SeaScribe — Chemistry Plugin
   配置：plugins/chemistry/config.js → window.__CHEMISTRY_CONFIG__
   ============================================================ */

const ChemistryPlugin = {
  meta: { id:'chemistry', name:'化学', description:'价层电子式 & 价层轨道式', icon:'⚗️' },

  defaultCount: 12,
  defaultColumns: 4,
  defaultFontSize: 100,
  _rangeStart: 0,
  _rangeEnd: 30,
  defaultLayout: 'grid',
  gridColumns: 4,
  listColumns: 2,
  gridFontSize: 100,
  listFontSize: 100,

  /** 元素数据从 CSV 加载，见 data/chemistry/elements.csv */
  _data: [],

  loadConfig() {
    const c = window.__CHEMISTRY_CONFIG__;
    if (c) {
      if (c.defaultCount    != null) this.defaultCount    = c.defaultCount;
      if (c.defaultColumns  != null) this.defaultColumns  = c.defaultColumns;
      if (c.defaultFontSize != null) this.defaultFontSize = c.defaultFontSize;
      if (c.defaultRangeStart!=null) this._rangeStart     = c.defaultRangeStart;
      if (c.defaultRangeEnd != null) this._rangeEnd       = c.defaultRangeEnd;
      if (c.defaultLayout   != null) this.defaultLayout   = c.defaultLayout;
      if (c.gridColumns     != null) this.gridColumns     = c.gridColumns;
      if (c.listColumns     != null) this.listColumns     = c.listColumns;
      if (c.gridFontSize    != null) this.gridFontSize    = c.gridFontSize;
      if (c.listFontSize    != null) this.listFontSize    = c.listFontSize;
      if (c.dataURL         != null) this._csvURL          = c.dataURL;
      if (c.scanURLs        != null) this._scanURLs        = c.scanURLs;
    }
  },

  _csvURL: 'data/chemistry/elements.csv',
  _scanURLs: [],

  async loadData() {
    if (this._csvLoaded) return this._data;
    try {
      const resp = await fetch(this._csvURL);
      if (resp.ok) {
        const text = await resp.text();
        const parsed = this._parseCSV(text);
        if (parsed.length) {
          this._data = parsed;
          if (this._rangeEnd === 0) this._rangeEnd = parsed.length;
          console.log(`[Chemistry] 从 ${this._csvURL} 加载了 ${parsed.length} 个元素`);
        }
      }
    } catch (e) {
      console.error('[Chemistry] 无法加载元素数据 (' + e.message + ')');
    }
    this._csvLoaded = true;
    return this._data;
  },

  _parseCSV(text) {
    const lines = text.split(/\r?\n/);
    if (!lines.length) return [];
    // 跳过表头行（如果第一行以 symbol 开头）
    let start = 0;
    if (lines[0] && /^symbol/i.test(lines[0].trim())) start = 1;
    const rows = [];
    for (let i = start; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',');
      if (cols.length < 4) continue;
      rows.push({
        symbol:   (cols[0] || '').trim(),
        name:     (cols[1] || '').trim(),
        electron: (cols[2] || '').trim(),
        orbital:  (cols[3] || '').trim(),
      });
    }
    return rows;
  },
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
    if (container.querySelector('#chemistry-file-select')) return;

    const data = this._data.length ? this._data : [];
    const opts = data.map((el,i) =>
      `<option value="${i}">${el.symbol} ${el.name}</option>`).join('');
    container.innerHTML = `
      <span class="ctrl-label">范围</span>
      <select class="range-select" id="range-start">${opts}</select>
      <span class="range-sep">—</span>
      <select class="range-select" id="range-end">${opts}</select>
      <span class="ctrl-sep"></span>
      <button class="btn btn-dark btn-sm" id="chemistry-scan-btn">🔍 从服务器获取</button>
      <select class="range-select hidden" id="chemistry-file-select" style="max-width:200px">
        <option value="">— 选择文件 —</option>
      </select>
      <label class="btn btn-dark btn-sm import-btn">
        📥 本地 CSV
        <input type="file" id="chemistry-csv-input" accept=".csv" style="display:none">
      </label>
      <span id="chemistry-import-msg" class="import-msg"></span>`;

    this._bindRangeSelects(container);
    this._bindFileImport(container);

    const scanBtn = container.querySelector('#chemistry-scan-btn');
    if (scanBtn) setTimeout(() => scanBtn.click(), 100);
  },

  _bindRangeSelects(container) {
    const s = container.querySelector('#range-start');
    const e = container.querySelector('#range-end');
    if (!s || !e) return;
    s.value = this._rangeStart;
    e.value  = this._rangeEnd - 1;
    s.addEventListener('change', () => {
      const sv = parseInt(s.value), ev = parseInt(e.value);
      if (sv > ev) { s.value = ev; this._rangeStart = ev; }
      else this._rangeStart = sv;
      if (this._rangeStart >= this._rangeEnd) {
        this._rangeEnd = Math.min(this._rangeStart + 1, this._data.length || 36);
        e.value = this._rangeEnd - 1;
      }
    });
    e.addEventListener('change', () => {
      const sv = parseInt(s.value), ev = parseInt(e.value);
      if (ev < sv) { e.value = sv; this._rangeEnd = sv + 1; }
      else this._rangeEnd = ev + 1;
    });
  },

  _refreshRangeOpts(container) {
    const s = container.querySelector('#range-start');
    const e = container.querySelector('#range-end');
    if (!s || !e) return;
    const opts = this._data.map((el,i) =>
      `<option value="${i}">${el.symbol} ${el.name}</option>`).join('');
    s.innerHTML = opts;
    e.innerHTML = opts;
    this._rangeStart = 0;
    this._rangeEnd = this._data.length;
    s.value = 0;
    e.value = this._rangeEnd - 1;
  },

  _bindFileImport(container) {
    const fileInput = container.querySelector('#chemistry-csv-input');
    const scanBtn   = container.querySelector('#chemistry-scan-btn');
    const fileSel   = container.querySelector('#chemistry-file-select');
    const msgEl     = container.querySelector('#chemistry-import-msg');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const parsed = this._parseCSV(text);
      if (parsed.length) {
        this._data = parsed;
        this._csvLoaded = true;
        this._refreshRangeOpts(container);
        this._refreshCount();
        msgEl.textContent = `✅ 已导入 ${parsed.length} 个元素`;
        msgEl.className = 'import-msg success';
      } else {
        msgEl.textContent = '❌ 文件中未找到有效数据';
        msgEl.className = 'import-msg error';
      }
      fileInput.value = '';
    });

    if (scanBtn) {
      scanBtn.addEventListener('click', async () => {
        if (!this._scanURLs || !this._scanURLs.length) {
          msgEl.textContent = '❌ 请在 config.js 中配置 scanURLs';
          msgEl.className = 'import-msg error';
          return;
        }
        msgEl.textContent = '扫描中…';
        msgEl.className = 'import-msg loading';
        try {
          const seen = new Set();
          const allFiles = [];
          for (const url of this._scanURLs) {
            const files = await this._scanDir(url);
            for (const f of files) {
              if (!seen.has(f.url)) { seen.add(f.url); allFiles.push(f); }
            }
          }
          if (!allFiles.length) throw new Error('未找到 .csv 文件');
          fileSel.innerHTML = '<option value="">— 选择文件 —</option>' +
            allFiles.map(f => `<option value="${esc(f.url)}">${esc(f.name)}</option>`).join('');
          fileSel.classList.remove('hidden');
          // 自动选中 elements.csv
          const def = allFiles.find(f => f.name === 'elements.csv') || allFiles[0];
          fileSel.value = def.url;
          fileSel.dispatchEvent(new Event('change'));
          msgEl.textContent = `✅ 找到 ${allFiles.length} 个文件`;
          msgEl.className = 'import-msg success';
        } catch (err) {
          msgEl.textContent = '❌ ' + (err.message || '扫描失败');
          msgEl.className = 'import-msg error';
        }
      });
    }

    if (fileSel) {
      fileSel.addEventListener('change', async () => {
        const url = fileSel.value;
        if (!url) return;
        msgEl.textContent = '加载中…';
        msgEl.className = 'import-msg loading';
        try {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`文件不可达 (${resp.status})`);
          const text = await resp.text();
          const parsed = this._parseCSV(text);
          if (!parsed.length) throw new Error('文件中未找到有效数据');
          this._data = parsed;
          this._csvLoaded = true;
          if (this._rangeEnd === 0) this._rangeEnd = parsed.length;
          this._refreshRangeOpts(container);
          this._refreshCount();
          msgEl.textContent = `✅ 已加载 ${parsed.length} 个元素`;
          msgEl.className = 'import-msg success';
        } catch (err) {
          msgEl.textContent = '❌ ' + (err.message || '加载失败');
          msgEl.className = 'import-msg error';
        }
      });
    }
  },

  async _scanDir(url) {
    const base = new URL(url, location.origin).href;
    let resp;
    try {
      resp = await fetch(base);
    } catch (e) {
      throw new Error('请求被阻止（CORS 或网络问题），请确保通过 HTTP 服务器访问');
    }
    if (!resp.ok) throw new Error(`目录不可达 (${resp.status})`);
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const json = await resp.json();
      return json.filter(f => /\.csv$/i.test(f.name)).map(f => ({
        url: new URL(f.url, base).href, name: f.name
      }));
    }
    const html = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = [];
    doc.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      const name = a.textContent.trim() || href;
      if (/\.csv$/i.test(href)) {
        links.push({ url: new URL(href, base).href, name });
      }
    });
    return links;
  },

  _refreshCount() {
    setTimeout(() => {
      const cntInput = document.getElementById('count-input');
      if (cntInput) {
        cntInput.min = this._data.length ? 1 : 0;
        cntInput.max = this._data.length || 1;
        if (parseInt(cntInput.value) > this._data.length) cntInput.value = this._data.length;
        if (!this._data.length) cntInput.value = 0;
        else if (parseInt(cntInput.value) === 0) cntInput.value = Math.min(this.defaultCount, this._data.length);
      }
    }, 50);
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
