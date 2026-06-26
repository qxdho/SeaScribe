/* ============================================================
   SeaScribe — Controls (font, columns, layout, count)
   ============================================================ */

(function() {
  const dictationPage = document.getElementById('dictation-page');
  const countInput    = document.getElementById('count-input');
  const colDisp       = document.getElementById('col-display');
  const fontSlider    = document.getElementById('font-slider');
  const fsDisp        = document.getElementById('fs-display');
  const btnLayout     = document.getElementById('btn-layout');
  const cardGrid      = document.getElementById('card-grid');

  window.SeaScribe.fontSizePct = 100;
  window.SeaScribe.columnCount = 0;
  window.SeaScribe.layoutMode  = 'grid';
  window.SeaScribe.gridColumns = 0;
  window.SeaScribe.listColumns = 0;
  window.SeaScribe.gridFontSize = 100;
  window.SeaScribe.listFontSize = 100;

  // ---- FONT SIZE ----
  window.SeaScribe.applyFontSize = function(pct) {
    window.SeaScribe.fontSizePct = pct;
    fsDisp.textContent = pct + '%'; fontSlider.value = pct;
    dictationPage.style.setProperty('--card-font-scale', (pct/100).toFixed(2));
  };

  fontSlider.addEventListener('input', function() {
    window.SeaScribe.applyFontSize(parseInt(fontSlider.value));
  });
  document.getElementById('fs-minus').addEventListener('click', function() {
    window.SeaScribe.applyFontSize(Math.max(60, window.SeaScribe.fontSizePct - 5));
  });
  document.getElementById('fs-plus').addEventListener('click', function() {
    window.SeaScribe.applyFontSize(Math.min(200, window.SeaScribe.fontSizePct + 5));
  });

  // ---- COLUMNS ----
  window.SeaScribe.applyColumns = function(n) {
    window.SeaScribe.columnCount = n; colDisp.textContent = n;
    if (window.SeaScribe.layoutMode === 'list') {
      window.SeaScribe.listColumns = n;
      cardGrid.style.columnCount = n;
      return;
    }
    window.SeaScribe.gridColumns = n;
    cardGrid.classList.add('grid-morph');
    cardGrid.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
    setTimeout(function() { cardGrid.classList.remove('grid-morph'); }, 350);
  };

  document.getElementById('col-minus').addEventListener('click', function() {
    if (window.SeaScribe.columnCount > 1) window.SeaScribe.applyColumns(window.SeaScribe.columnCount - 1);
  });
  document.getElementById('col-plus').addEventListener('click', function() {
    if (window.SeaScribe.columnCount < 6) window.SeaScribe.applyColumns(window.SeaScribe.columnCount + 1);
  });

  // ---- LAYOUT ----
  window.SeaScribe.applyLayout = function(mode) {
    cardGrid.classList.add('layout-morph');
    window.SeaScribe.layoutMode = mode;
    btnLayout.textContent = mode === 'list' ? '⊞' : '☰';
    if (mode === 'list') {
      window.SeaScribe.columnCount = window.SeaScribe.listColumns;
      colDisp.textContent = window.SeaScribe.listColumns;
      window.SeaScribe.applyFontSize(window.SeaScribe.listFontSize);
      cardGrid.classList.add('list');
      cardGrid.style.columnCount = window.SeaScribe.listColumns;
      cardGrid.style.gridTemplateColumns = '';
    } else {
      window.SeaScribe.columnCount = window.SeaScribe.gridColumns;
      colDisp.textContent = window.SeaScribe.gridColumns;
      window.SeaScribe.applyFontSize(window.SeaScribe.gridFontSize);
      cardGrid.classList.remove('list');
      cardGrid.style.columnCount = '';
      cardGrid.style.gridTemplateColumns = 'repeat(' + window.SeaScribe.gridColumns + ', 1fr)';
    }
    setTimeout(function() { cardGrid.classList.remove('layout-morph'); }, 300);
  };

  btnLayout.addEventListener('click', function() {
    window.SeaScribe.applyLayout(window.SeaScribe.layoutMode === 'list' ? 'grid' : 'list');
  });

  // ---- COUNT ----
  window.SeaScribe.getMaxCount = function() {
    var ap = window.SeaScribe.activePlugin;
    if (!ap || !ap._data) return 0;
    var items = ap._data;
    if (ap && typeof ap.getRange === 'function') {
      var r = ap.getRange(); items = items.slice(r[0], r[1]);
    }
    return items.filter(function(item) { return item && (item.prompt || item.symbol); }).length;
  };

  window.SeaScribe.clampCount = function(v) {
    var m = window.SeaScribe.getMaxCount();
    if (v < 1) v = 1; if (v > m) v = m; return v;
  };

  document.getElementById('count-minus').addEventListener('click', function() {
    countInput.value = window.SeaScribe.clampCount(parseInt(countInput.value) - 1);
  });
  document.getElementById('count-plus').addEventListener('click', function() {
    countInput.value = window.SeaScribe.clampCount(parseInt(countInput.value) + 1);
  });
  countInput.addEventListener('change', function() {
    countInput.value = window.SeaScribe.clampCount(parseInt(countInput.value) || 1);
  });
  countInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') window.SeaScribe.doShuffle();
  });
})();
