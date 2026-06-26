/* ============================================================
   SeaScribe — English Plugin
   配置：plugins/english/config.js → window.__ENGLISH_CONFIG__
   支持本地 xlsx 导入 + URL 扫描导入（目录页自动发现文件）
   可自定听写列和答案列，切换列即时生效
   ============================================================ */

const EnglishPlugin = {
  meta: { id:'english', name:'英语', description:'单词/词组听写 · 支持xlsx导入', icon:'📝' },

  defaultCount: 0,
  defaultColumns: 2,
  defaultFontSize: 100,
  defaultLayout: 'list',
  gridColumns: 4,
  listColumns: 2,
  gridFontSize: 100,
  listFontSize: 100,

  /** xlsx 列映射：0=A列, 1=B列 … */
  _promptCol: 0,
  _answerCol: 1,

  /** 扫描地址列表 */
  _scanURLs: [],

  /** 缓存最近一次导入的原始行数据，用于切换列时即时重新解析 */
  _rawRows: null,
  _hasHeader: false,

  /** 词库，通过 xlsx 导入填充 */
  _data: [],

  loadConfig() {
    const c = window.__ENGLISH_CONFIG__;
    if (c) {
      if (c.defaultCount    != null) this.defaultCount    = c.defaultCount;
      if (c.defaultColumns  != null) this.defaultColumns  = c.defaultColumns;
      if (c.defaultFontSize != null) this.defaultFontSize = c.defaultFontSize;
      if (c.promptCol       != null) this._promptCol      = c.promptCol;
      if (c.answerCol       != null) this._answerCol      = c.answerCol;
      if (c.scanURLs        != null) this._scanURLs       = c.scanURLs;
      if (c.defaultLayout   != null) this.defaultLayout   = c.defaultLayout;
      if (c.gridColumns     != null) this.gridColumns     = c.gridColumns;
      if (c.listColumns     != null) this.listColumns     = c.listColumns;
      if (c.gridFontSize    != null) this.gridFontSize    = c.gridFontSize;
      if (c.listFontSize    != null) this.listFontSize    = c.listFontSize;
    }
  },

  async loadData() { return this._data; },

  renderPrompt(item) {
    return `<span class="card-word">${esc(item.prompt)}</span>`;
  },

  renderAnswer(item) {
    return `<div class="a-line"><span class="a-label">答案</span><span class="a-val">${esc(item.answer)}</span></div>`;
  },

  configUI(container) {
    if (container.querySelector('#english-xlsx-input')) return;

    const pc = this._colLetter(this._promptCol);
    const ac = this._colLetter(this._answerCol);

    container.innerHTML = `
      <span class="ctrl-label">听写列</span>
      <div class="stepper">
        <button class="stepper-btn" id="eng-pcol-minus">−</button>
        <span class="stepper-val" id="eng-pcol-disp">${pc}</span>
        <button class="stepper-btn" id="eng-pcol-plus">+</button>
      </div>
      <span class="ctrl-label">答案列</span>
      <div class="stepper">
        <button class="stepper-btn" id="eng-acol-minus">−</button>
        <span class="stepper-val" id="eng-acol-disp">${ac}</span>
        <button class="stepper-btn" id="eng-acol-plus">+</button>
      </div>
      <span class="ctrl-sep"></span>
      <button class="btn btn-dark btn-sm" id="english-scan-btn">🔍 从服务器获取</button>
      <select class="range-select hidden" id="english-file-select" style="max-width:200px">
        <option value="">— 选择文件 —</option>
      </select>
      <label class="btn btn-dark btn-sm import-btn">
        📥 本地文件
        <input type="file" id="english-xlsx-input" accept=".xlsx,.xls,.csv" style="display:none">
      </label>
      <span id="english-import-msg" class="import-msg"></span>`;

    this._bindColSteppers(container);
    this._bindImport(container);
    // 进入插件时自动扫描服务器文件
    const scanBtn = container.querySelector('#english-scan-btn');
    if (scanBtn) setTimeout(() => scanBtn.click(), 100);
  },

  /** 列选择步进器 —— 切换后即时用缓存数据重新解析 */
  _bindColSteppers(container) {
    const pDisp = container.querySelector('#eng-pcol-disp');
    const aDisp = container.querySelector('#eng-acol-disp');

    const update = () => {
      pDisp.textContent = this._colLetter(this._promptCol);
      aDisp.textContent = this._colLetter(this._answerCol);
    };

    const onColChange = () => {
      update();
      if (this._rawRows) {
        this._data = this._parseRows(this._rawRows, this._hasHeader);
        this._refreshCount();
      }
    };

    container.querySelector('#eng-pcol-minus').addEventListener('click', () => {
      if (this._promptCol > 0) { this._promptCol--; onColChange(); }
    });
    container.querySelector('#eng-pcol-plus').addEventListener('click', () => {
      if (this._promptCol < 25) { this._promptCol++; onColChange(); }
    });
    container.querySelector('#eng-acol-minus').addEventListener('click', () => {
      if (this._answerCol > 0) { this._answerCol--; onColChange(); }
    });
    container.querySelector('#eng-acol-plus').addEventListener('click', () => {
      if (this._answerCol < 25) { this._answerCol++; onColChange(); }
    });
  },

  /** 0→"A", 1→"B", … */
  _colLetter(idx) {
    return String.fromCharCode(65 + idx);
  },

  /** 绑定本地文件 + URL扫描导入事件 */
  _bindImport(container) {
    const fileInput = container.querySelector('#english-xlsx-input');
    const scanBtn   = container.querySelector('#english-scan-btn');
    const fileSel   = container.querySelector('#english-file-select');
    const msgEl     = container.querySelector('#english-import-msg');

    // 本地文件
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await this._doImport(msgEl, async () => {
        await this._ensureXLSX();
        const buf = await this._readFileAsBuffer(file);
        return this._parseXLSXBuffer(buf);
      });
      fileInput.value = '';
    });

    // 扫描按钮：遍历 scanURLs，合并去重
    if (scanBtn) {
      scanBtn.addEventListener('click', async () => {
        if (!this._scanURLs || !this._scanURLs.length) {
          msgEl.textContent = '❌ 请在 config.js 中配置 scanURLs';
          msgEl.className   = 'import-msg error';
          return;
        }

        msgEl.textContent = '扫描中…';
        msgEl.className   = 'import-msg loading';

        try {
          const seen = new Set();
          const allFiles = [];

          for (const url of this._scanURLs) {
            const files = await this._scanDir(url);
            for (const f of files) {
              if (!seen.has(f.url)) {
                seen.add(f.url);
                allFiles.push(f);
              }
            }
          }

          if (!allFiles.length) throw new Error('未找到 .xlsx / .csv 文件');

          fileSel.innerHTML = '<option value="">— 选择文件 —</option>' +
            allFiles.map(f => `<option value="${esc(f.url)}">${esc(f.name)}</option>`).join('');
          fileSel.classList.remove('hidden');

          msgEl.textContent = `✅ 找到 ${allFiles.length} 个文件`;
          msgEl.className   = 'import-msg success';
        } catch (err) {
          msgEl.textContent = '❌ ' + (err.message || '扫描失败');
          msgEl.className   = 'import-msg error';
        }
      });
    }

    // 下拉框选择文件 → 自动导入
    if (fileSel) {
      fileSel.addEventListener('change', async () => {
        const url = fileSel.value;
        if (!url) return;
        await this._doImport(msgEl, async () => {
          await this._ensureXLSX();
          const buf = await this._fetchFile(url);
          return this._parseXLSXBuffer(buf);
        });
      });
    }
  },

  /** 扫描目录页面，提取 .xlsx/.csv 链接 */
  async _scanDir(url) {
    // 相对路径补全为完整 URL
    const base = new URL(url, location.origin).href;

    let resp;
    try {
      resp = await fetch(base);
    } catch (e) {
      throw new Error('请求被阻止（CORS 或网络问题），请确保通过 HTTP 服务器访问页面而非 file://');
    }
    if (!resp.ok) throw new Error(`目录不可达 (${resp.status})`);

    const ct = resp.headers.get('content-type') || '';

    // JSON API 格式
    if (ct.includes('application/json')) {
      const json = await resp.json();
      return json.map(f => ({
        url: new URL(f.url, base).href,
        name: f.name
      }));
    }

    // HTML 目录页格式
    const html = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const links = [];
    doc.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      const name = a.textContent.trim() || href;
      if (/\.(xlsx|xls|csv)$/i.test(href)) {
        const full = new URL(href, base).href;
        links.push({ url: full, name });
      }
    });

    return links;
  },

  /** 统一导入流程：show loading → run → update data → show result */
  async _doImport(msgEl, parseFn) {
    msgEl.textContent = '读取中…';
    msgEl.className   = 'import-msg loading';

    try {
      const result = await parseFn();
      if (!result.rows || !result.rows.length) throw new Error('文件中未找到数据');

      this._rawRows   = result.rows;
      this._hasHeader = result.hasHeader;
      this._data      = this._parseRows(result.rows, result.hasHeader);

      msgEl.textContent = `✅ 已导入 ${this._data.length} 条`;
      msgEl.className   = 'import-msg success';
    } catch (err) {
      msgEl.textContent = '❌ ' + (err.message || '导入失败');
      msgEl.className   = 'import-msg error';
    }

    this._refreshCount();
  },

  /** File → ArrayBuffer */
  _readFileAsBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  },

  /** fetch URL → ArrayBuffer */
  async _fetchFile(url) {
    let resp;
    try {
      resp = await fetch(url);
    } catch (e) {
      throw new Error('请求被阻止（CORS 或网络问题），请确保通过 HTTP 服务器访问页面而非 file://');
    }
    if (!resp.ok) throw new Error(`文件不可达 (${resp.status})`);
    return resp.arrayBuffer();
  },

  /** 解析 xlsx/csv ArrayBuffer，返回 { rows, hasHeader } */
  _parseXLSXBuffer(buf) {
    try {
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      const wsname = wb.SheetNames[0];
      if (!wsname) return { rows: [], hasHeader: false };
      const ws = wb.Sheets[wsname];

      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      const ac = this._answerCol;
      const pc = this._promptCol;
      const nonEmpty = rows.filter(r => {
        return r && (String(r[pc] || '').trim() || String(r[ac] || '').trim());
      });

      let hasHeader = false;
      const first = nonEmpty[0];
      if (first && nonEmpty.length > 1) {
        const h2 = String(first[ac] || '').trim().toLowerCase();
        if (h2 === 'answer' || h2 === '答案' || h2 === 'answers' || h2 === '英文' || h2 === 'english') {
          hasHeader = true;
        }
      }

      return { rows: nonEmpty, hasHeader };
    } catch (err) {
      throw new Error('文件解析失败：' + err.message);
    }
  },

  /** 用当前列设置从原始行解析数据 */
  _parseRows(rows, hasHeader) {
    const pc  = this._promptCol;
    const ac  = this._answerCol;
    const src = hasHeader ? rows.slice(1) : rows;

    return src.map(r => ({
      prompt: String(r[pc] || '').trim(),
      answer: String(r[ac] || '').trim(),
    })).filter(item => item.prompt || item.answer);
  },

  /** 刷新主页面的数量上限 */
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

  /** 动态加载 SheetJS CDN */
  _ensureXLSX() {
    if (window.XLSX) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
      script.onload  = () => resolve();
      script.onerror = () => reject(new Error('无法加载 xlsx 解析库，请检查网络连接'));
      document.head.appendChild(script);
    });
  },
};

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
