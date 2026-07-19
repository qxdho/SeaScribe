/* ============================================================
   SeaScribe — Controls (ES Module)
   ============================================================ */

import { SeaScribe } from '../core/state.js';

const dictationPage = document.getElementById('dictation-page');
const countInput    = document.getElementById('count-input');
const colDisp       = document.getElementById('col-display');
const fontSlider    = document.getElementById('font-slider');
const fsDisp        = document.getElementById('fs-display');
const btnLayout     = document.getElementById('btn-layout');
const cardGrid      = document.getElementById('card-grid');

SeaScribe.fontSizePct = 100;
SeaScribe.columnCount = 0;
SeaScribe.layoutMode  = 'grid';
SeaScribe.gridColumns = 0;
SeaScribe.listColumns = 0;
SeaScribe.gridFontSize = 100;
SeaScribe.listFontSize = 100;

SeaScribe.applyFontSize = function(pct) {
  SeaScribe.fontSizePct = pct;
  fsDisp.textContent = pct + '%'; fontSlider.value = pct;
  dictationPage.style.setProperty('--card-font-scale', (pct/100).toFixed(2));
};

fontSlider.addEventListener('input', function() {
  SeaScribe.applyFontSize(parseInt(fontSlider.value));
});
document.getElementById('fs-minus').addEventListener('click', function() {
  SeaScribe.applyFontSize(Math.max(60, SeaScribe.fontSizePct - 5));
});
document.getElementById('fs-plus').addEventListener('click', function() {
  SeaScribe.applyFontSize(Math.min(200, SeaScribe.fontSizePct + 5));
});

SeaScribe.applyColumns = function(n) {
  SeaScribe.columnCount = n; colDisp.textContent = n;
  if (SeaScribe.layoutMode === 'list') {
    SeaScribe.listColumns = n;
    cardGrid.style.columnCount = n;
    return;
  }
  SeaScribe.gridColumns = n;
  cardGrid.classList.add('grid-morph');
  cardGrid.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
  setTimeout(function() { cardGrid.classList.remove('grid-morph'); }, 350);
};

document.getElementById('col-minus').addEventListener('click', function() {
  if (SeaScribe.columnCount > 1) SeaScribe.applyColumns(SeaScribe.columnCount - 1);
});
document.getElementById('col-plus').addEventListener('click', function() {
  if (SeaScribe.columnCount < 6) SeaScribe.applyColumns(SeaScribe.columnCount + 1);
});

SeaScribe.applyLayout = function(mode) {
  cardGrid.classList.add('layout-morph');
  SeaScribe.layoutMode = mode;
  btnLayout.textContent = mode === 'list' ? '⊞' : '☰';
  if (mode === 'list') {
    SeaScribe.columnCount = SeaScribe.listColumns;
    colDisp.textContent = SeaScribe.listColumns;
    SeaScribe.applyFontSize(SeaScribe.listFontSize);
    cardGrid.classList.add('list');
    cardGrid.style.columnCount = SeaScribe.listColumns;
    cardGrid.style.gridTemplateColumns = '';
  } else {
    SeaScribe.columnCount = SeaScribe.gridColumns;
    colDisp.textContent = SeaScribe.gridColumns;
    SeaScribe.applyFontSize(SeaScribe.gridFontSize);
    cardGrid.classList.remove('list');
    cardGrid.style.columnCount = '';
    cardGrid.style.gridTemplateColumns = 'repeat(' + SeaScribe.gridColumns + ', 1fr)';
  }
  setTimeout(function() { cardGrid.classList.remove('layout-morph'); }, 300);
};

btnLayout.addEventListener('click', function() {
  SeaScribe.applyLayout(SeaScribe.layoutMode === 'list' ? 'grid' : 'list');
});

SeaScribe.getMaxCount = function() {
  var ap = SeaScribe.activePlugin;
  if (!ap || !ap._data) return 0;
  var items = ap._data;
  if (ap && typeof ap.getRange === 'function') {
    var r = ap.getRange(); items = items.slice(r[0], r[1]);
  }
  return items.filter(function(item) { return item && (item.prompt || item.symbol); }).length;
};

SeaScribe.clampCount = function(v) {
  var m = SeaScribe.getMaxCount();
  if (v < 1) v = 1; if (v > m) v = m; return v;
};

document.getElementById('count-minus').addEventListener('click', function() {
  countInput.value = SeaScribe.clampCount(parseInt(countInput.value) - 1);
});
document.getElementById('count-plus').addEventListener('click', function() {
  countInput.value = SeaScribe.clampCount(parseInt(countInput.value) + 1);
});
var countMaxBtn = document.getElementById('count-max');
if (countMaxBtn) {
  countMaxBtn.addEventListener('click', function() {
    countInput.value = SeaScribe.getMaxCount();
  });
}
countInput.addEventListener('change', function() {
  countInput.value = SeaScribe.clampCount(parseInt(countInput.value) || 1);
});
countInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') SeaScribe.doShuffle();
});
