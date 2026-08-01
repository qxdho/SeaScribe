/* ============================================================
   SeaScribe — 英语单词跟读插件
   词库：data/enword/*.txt（每3行一组：中文释义/英文/备注）
   TTS：浏览器 SpeechSynthesis API（en-US）
   ============================================================ */

const EnwordPlugin = {
  meta: { id:'enword', name:'英语跟读', description:'单词顺序朗读 · 浏览器TTS发音', icon:'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#e8854b" opacity="0.15"/><text x="24" y="35" text-anchor="middle" font-size="32" font-weight="700" fill="currentColor" font-family="Georgia,serif">🗣</text></svg>' },

  readerMode: true,

  defaultFile: "hf-00.view-available.txt",
  readInterval: 3,
  ttsRate: 0.8,
  startIndex: 1,
  defaultFontSize: 100,

  _data: [],
  _currentIdx: 0,
  _timer: null,
  _paused: false,
  _files: [],
  _fontPct: 100,

  loadConfig() {
    PluginUtils.loadConfig(this, window.__ENWORD_CONFIG__, {
      ttsRate: 'ttsRate', readInterval: 'readInterval',
      startIndex: 'startIndex', defaultFile: 'defaultFile',
      defaultFontSize: 'defaultFontSize',
    });
  },

  async loadData() { return this._data; },

  renderPrompt(item) {
    return '<span style="font-size:1.3em">' + SeaScribe.esc(item.prompt) + '</span>';
  },

  renderAnswer(item) {
    var html = '<div class="a-line"><span class="a-label">单词</span><span class="a-val" style="font-size:1.6em;font-weight:700">' + SeaScribe.esc(item.answer) + '</span></div>';
    html += '<button class="btn btn-ghost" onclick="EnwordPlugin.speakWord(\'' + SeaScribe.esc(item.answer.replace(/'/g, "\\'")) + '\')" style="margin-top:4px;padding:4px 10px;font-size:0.78rem">🔊 朗读</button>';
    if (item.memo) {
      html += '<div class="a-line" style="margin-top:4px"><span class="a-label">备注</span><span class="a-val">' + SeaScribe.esc(item.memo) + '</span></div>';
    }
    return html;
  },

  configUI(container) {
    container.innerHTML =
      '<span class="ctrl-label">词库</span>' +
      '<select class="range-select" id="enword-file-select" style="max-width:220px">' +
        '<option value="">扫描中…</option>' +
      '</select>' +
      '<span class="ctrl-label">从单词开始</span>' +
      '<select class="range-select" id="enword-start-word" style="max-width:200px" disabled>' +
        '<option value="">— 先选择词库 —</option>' +
      '</select>' +
      '<span class="ctrl-sep"></span>' +
      '<button class="btn btn-dark" id="enword-read-btn" style="padding:7px 18px;min-width:130px">▶ 开始朗读</button>' +
      '<span id="enword-count" style="font-size:0.8rem;color:var(--muted);display:none"></span>';
    this._scanFiles();
    this._bindConfigEvents(container);
    CustomSelect.initAll(container);
  },

  async _scanFiles() {
    var sel = document.getElementById('enword-file-select');
    try {
      var resp = await fetch('/api/enword-files');
      if (!resp.ok) throw new Error('scan failed');
      var files = await resp.json();
      this._files = files;
      sel.innerHTML = files.map(function(f) {
        var selAttr = f.name === EnwordPlugin.defaultFile ? ' selected' : '';
        return '<option value="' + SeaScribe.esc(f.name) + '"' + selAttr + '>' + SeaScribe.esc(f.name) + '</option>';
      }).join('');
      if (sel._customSelect) sel._customSelect.refresh();
      await this._loadFile(this.defaultFile);
    } catch(e) {
      sel.innerHTML = '<option value="">扫描失败</option>';
      if (sel._customSelect) sel._customSelect.refresh();
    }
  },

  _bindConfigEvents(container) {
    var self = this;
    container.querySelector('#enword-file-select').addEventListener('change', async function() {
      await self._loadFile(this.value);
    });
    container.querySelector('#enword-start-word').addEventListener('change', function() {
      var idx = parseInt(this.value);
      if (!isNaN(idx) && idx >= 0) {
        self.startIndex = idx + 1;
        self._currentIdx = idx;
        self._showWord();
      }
    });
    container.querySelector('#enword-read-btn').addEventListener('click', function() {
      self.startReading();
    });
  },

  _populateWordSelect() {
    var sel = document.getElementById('enword-start-word');
    if (!sel) return;
    var currentVal = this._currentIdx;
    sel.innerHTML = this._data.map(function(item, i) {
      return '<option value="' + i + '"' + (i === currentVal ? ' selected' : '') +
        '>' + SeaScribe.esc(item.answer) + '</option>';
    }).join('');
    sel.disabled = false;
    sel.value = String(currentVal);
    if (sel._customSelect) sel._customSelect.refresh();
  },

  async _loadFile(filename) {
    if (!filename) return;
    try {
      var resp = await fetch('/data/enword/' + encodeURIComponent(filename));
      var text = await resp.text();
      var raw = text.split('\n').filter(function(l) { return l.trim(); });
      var start = 0;
      if (raw[0] && raw[0].indexOf('[') >= 0) {
        for (var i = 0; i < raw.length; i++) {
          if (raw[i].indexOf('"') >= 0) { start = i; break; }
        }
      }
      var items = [];
      for (var i = start; i + 2 < raw.length; i += 3) {
        var q = raw[i].replace(/^\s*"/, '').replace(/["\],;]+\s*$/, '').trim();
        var a = raw[i+1].replace(/^\s*"/, '').replace(/["\],;]+\s*$/, '').trim();
        var m = raw[i+2].replace(/^\s*"/, '').replace(/["\],;]+\s*$/, '').trim();
        if (q && a) items.push({ prompt: q, answer: a, memo: m });
      }
      this._data = items;
      this._currentIdx = this.startIndex - 1;
      if (this._currentIdx >= this._data.length) this._currentIdx = 0;
      this._populateWordSelect();
      var cnt = document.getElementById('enword-count');
      if (cnt) { cnt.textContent = '共 ' + items.length + ' 词'; cnt.style.display = ''; }
      this._showWord();
    } catch(e) {
      console.warn('Enword load error:', e);
    }
  },

  /* ── Reader UI ── */
  initReader(container) {
    // Fill the cardGrid area, let dictation-page keep its natural display
    container.style.display = 'flex';
    container.style.alignItems = 'stretch';
    container.style.justifyContent = 'stretch';
    container.style.flex = '1';
    container.style.width = '100%';
    container.style.minHeight = '0';
    container.style.height = 'auto';

    this._fontPct = this.defaultFontSize || 100; // 每次进入使用配置默认字号

    container.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;padding:24px 20px 200px;width:100%">' +
        '<div id="enword-display" style="text-align:center;max-width:900px;--enword-fs:' + (this._fontPct / 100) + '">' +
          '<div id="enword-english" style="font-size:calc(clamp(3rem, 8vw, 7rem) * var(--enword-fs, 1));font-weight:700;line-height:1.1;color:var(--text);margin-bottom:20px;letter-spacing:0.03em;word-break:break-all"></div>' +
          '<div id="enword-chinese" style="font-size:calc(clamp(1.7rem, 5vw, 3rem) * var(--enword-fs, 1));color:var(--text);opacity:0.9;line-height:1.7;max-width:900px;margin:0 auto;font-weight:500"></div>' +
          '<div id="enword-memo" style="font-size:calc(clamp(1.4rem, 3.5vw, 2rem) * var(--enword-fs, 1));color:var(--text);opacity:0.75;margin-top:20px;max-width:900px;line-height:1.65"></div>' +
        '</div>' +
        '<div style="position:fixed;bottom:0;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 20px 14px;background:var(--bg);border-top:1px solid var(--border)">' +
          '<div style="font-size:0.82rem;color:var(--muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center">' +
            '<span id="enword-progress"></span>' +
            '<span>· 间隔</span>' +
            '<span class="stepper">' +
              '<button class="stepper-btn" id="enword-int-minus">−</button>' +
              '<input type="number" class="stepper-input" id="enword-interval" value="' + this.readInterval + '" min="0.5" max="10" step="0.5" style="width:48px">' +
              '<button class="stepper-btn" id="enword-int-plus">+</button>' +
            '</span>' +
            '<span>秒</span>' +
            '<span>· 字号</span>' +
            '<span class="stepper">' +
              '<button class="stepper-btn" id="enword-fs-minus">−</button>' +
              '<input type="number" class="stepper-input" id="enword-fs" value="' + this._fontPct + '" min="60" max="200" step="10" style="width:56px">' +
              '<button class="stepper-btn" id="enword-fs-plus">+</button>' +
            '</span>' +
            '<span>%</span>' +
          '</div>' +
          '<button class="btn btn-dark" id="enword-pause" style="padding:10px 34px;font-size:1rem;min-width:130px">⏸ 暂停</button>' +
          '<div style="display:flex;gap:8px">' +
            '<button class="btn btn-ghost" id="enword-prev" style="padding:6px 14px;font-size:0.82rem">◀ 上一词</button>' +
            '<button class="btn btn-ghost" id="enword-next" style="padding:6px 14px;font-size:0.82rem">下一词 ▶</button>' +
            '<button class="btn btn-ghost" id="enword-speak" style="padding:6px 14px;font-size:0.82rem">🔊 朗读</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    this._bindReaderEvents(container);
    this._showWord();
  },

  _bindReaderEvents(container) {
    var self = this;
    container.querySelector('#enword-prev').addEventListener('click', function() { self.prevWord(); });
    container.querySelector('#enword-next').addEventListener('click', function() { self.nextWord(); });
    container.querySelector('#enword-pause').addEventListener('click', function() { self.togglePause(); });
    container.querySelector('#enword-speak').addEventListener('click', function() {
      if (self._data[self._currentIdx]) self.speakWord(self._data[self._currentIdx].answer);
    });
    container.querySelector('#enword-interval').addEventListener('change', function() {
      self.readInterval = parseFloat(this.value) || 3;
    });
    var clampInterval = function(v) { return Math.max(0.5, Math.min(10, v)); };
    container.querySelector('#enword-int-minus').addEventListener('click', function() {
      var inp = document.getElementById('enword-interval');
      inp.value = clampInterval(parseFloat(inp.value) - 0.5);
      self.readInterval = parseFloat(inp.value);
    });
    container.querySelector('#enword-int-plus').addEventListener('click', function() {
      var inp = document.getElementById('enword-interval');
      inp.value = clampInterval(parseFloat(inp.value) + 0.5);
      self.readInterval = parseFloat(inp.value);
    });
    // ── 字号调节（60% ~ 200%）──
    var fsDisplay = container.querySelector('#enword-display');
    var applyFontSize = function() {
      var pct = Math.max(60, Math.min(200, self._fontPct));
      var inp = document.getElementById('enword-fs');
      if (inp) inp.value = pct;
      if (fsDisplay) fsDisplay.style.setProperty('--enword-fs', pct / 100);
    };
    container.querySelector('#enword-fs-minus').addEventListener('click', function() {
      self._fontPct = Math.max(60, (self._fontPct || 100) - 10);
      applyFontSize();
    });
    container.querySelector('#enword-fs-plus').addEventListener('click', function() {
      self._fontPct = Math.min(200, (self._fontPct || 100) + 10);
      applyFontSize();
    });
    container.querySelector('#enword-fs').addEventListener('change', function() {
      var v = parseInt(this.value, 10);
      self._fontPct = isNaN(v) ? 100 : Math.max(60, Math.min(200, v));
      applyFontSize();
    });
  },

  _showWord() {
    var item = this._data[this._currentIdx];
    var engEl = document.getElementById('enword-english');
    var chnEl = document.getElementById('enword-chinese');
    var memoEl = document.getElementById('enword-memo');
    var progEl = document.getElementById('enword-progress');
    if (!engEl) return;
    if (item) {
      engEl.textContent = item.answer;
      chnEl.innerHTML = item.prompt.replace(/\n/g, '<br>');
      memoEl.innerHTML = (item.memo || '').replace(/<br\s*\/?>/gi, '<br>');
      if (progEl) progEl.textContent = (this._currentIdx + 1) + ' / ' + this._data.length;
    } else {
      engEl.textContent = '（无数据）';
      chnEl.textContent = '';
      memoEl.textContent = '';
    }
  },

  /* ── Reader actions ── */
  startReading() {
    this._paused = false;
    // startIndex — already set via word select
    if (this._currentIdx >= this._data.length) this._currentIdx = 0;
    this._showWord();
    this.speakWord(this._data[this._currentIdx] ? this._data[this._currentIdx].answer : '');
    this._updatePauseBtn();
    var self = this;
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(function() {
      if (self._paused) return;
      self.nextWord();
    }, this.readInterval * 1000);
  },

  togglePause() {
    this._paused = !this._paused;
    this._updatePauseBtn();
    if (!this._paused && this._data[this._currentIdx]) {
      this.speakWord(this._data[this._currentIdx].answer);
    }
  },

  _updatePauseBtn() {
    var btn = document.getElementById('enword-pause');
    if (btn) btn.textContent = this._paused ? '▶ 继续' : '⏸ 暂停';
  },

  prevWord() {
    if (this._currentIdx > 0) this._currentIdx--;
    this._showWord();
    // Sync word select
    var ws = document.getElementById('enword-start-word');
    if (ws) { ws.value = String(this._currentIdx); if (ws._customSelect) ws._customSelect.refresh(); }
  },

  nextWord() {
    if (this._currentIdx < this._data.length - 1) {
      this._currentIdx++;
      this._showWord();
      if (!this._paused) this.speakWord(this._data[this._currentIdx].answer);
    } else {
      this._paused = true;
      this._updatePauseBtn();
      if (this._timer) clearInterval(this._timer);
      this._showWord();
    }
    var ws = document.getElementById('enword-start-word');
    if (ws) { ws.value = String(this._currentIdx); if (ws._customSelect) ws._customSelect.refresh(); }
  },

  /* ── TTS ── */
  speakWord(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = this.ttsRate;
    u.pitch = 1.0;
    u.volume = 1.0;
    window.speechSynthesis.speak(u);
  },
};
