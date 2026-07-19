/* ============================================================
   SeaScribe — Cards (ES Module)
   ============================================================ */

import { SeaScribe, SubjectRegistry } from '../core/state.js';

const subjectPage    = document.getElementById('subject-page');
const dictationPage  = document.getElementById('dictation-page');
const subjectList    = document.getElementById('subject-list');
const dictationTitle = document.getElementById('dictation-title');
const pluginConfig   = document.getElementById('plugin-config');
const cardGrid       = document.getElementById('card-grid');
const countInput     = document.getElementById('count-input');
const btnShuffle     = document.getElementById('btn-shuffle');
const btnReveal      = document.getElementById('btn-reveal');
const fontSlider     = document.getElementById('font-slider');

SeaScribe.activePlugin   = null;
SeaScribe.currentItems   = [];
SeaScribe.answersVisible = false;

SeaScribe.renderSubjectPage = function() {
  subjectList.innerHTML = '';
  SubjectRegistry.list().forEach(function(p) {
    var card = document.createElement('div');
    card.className = 'subject-card';
    card.innerHTML = '<span class="subject-icon">' + (p.meta.icon || '📚') + '</span><span class="subject-name">' + SeaScribe.esc(p.meta.name) + '</span><span class="subject-desc">' + SeaScribe.esc(p.meta.description) + '</span>';
    card.addEventListener('click', function() { SeaScribe.openSubject(p); });
    subjectList.appendChild(card);
  });
};

SeaScribe.openSubject = async function(plugin) {
  SeaScribe.activePlugin = plugin;
  location.hash = '#/' + plugin.meta.id;
  if (typeof plugin.loadConfig === 'function') plugin.loadConfig();

  dictationTitle.textContent = plugin.meta.name;
  pluginConfig.innerHTML = '';
  cardGrid.innerHTML = '';

  if (plugin.readerMode) {
    if (typeof plugin.configUI === 'function') plugin.configUI(pluginConfig);
    await SeaScribe.switchToPage(dictationPage, subjectPage);
    var ctrlRow = document.querySelector('.control-row');
    if (ctrlRow) ctrlRow.style.display = 'none';
    document.getElementById('btn-reveal').style.display = 'none';
    plugin.initReader(cardGrid);
    return;
  }

  var cr = document.querySelector('.control-row');
  if (cr) cr.style.display = '';
  document.getElementById('btn-reveal').style.display = '';
  cardGrid.style.display = '';
  cardGrid.style.alignItems = '';
  cardGrid.style.justifyContent = '';
  cardGrid.style.flex = '';
  cardGrid.style.minHeight = '';
  cardGrid.style.width = '';
  cardGrid.style.height = '';
  var dp = document.getElementById('dictation-page');
  if (dp) { dp.style.display = ''; dp.style.flexDirection = ''; dp.style.minHeight = ''; }

  if (typeof plugin.configUI === 'function') plugin.configUI(pluginConfig);

  var max = SeaScribe.getMaxCount();
  countInput.value = Math.min(plugin.defaultCount, max);
  countInput.max = max;
  SeaScribe.gridColumns = plugin.gridColumns;
  SeaScribe.listColumns = plugin.listColumns;
  SeaScribe.gridFontSize = plugin.gridFontSize;
  SeaScribe.listFontSize = plugin.listFontSize;
  SeaScribe.applyLayout(plugin.defaultLayout);
  SeaScribe.applyColumns(plugin.defaultColumns);
  fontSlider.value = plugin.defaultFontSize;
  SeaScribe.applyFontSize(plugin.defaultFontSize);
  SeaScribe.answersVisible = false;
  btnReveal.disabled = true;
  btnReveal.textContent = '公布答案';

  await SeaScribe.switchToPage(dictationPage, subjectPage);
  SeaScribe.doShuffle();
};

SeaScribe.doShuffle = async function() {
  var plugin = SeaScribe.activePlugin;
  if (!plugin) return;
  var items = await plugin.loadData();
  var pool = items.slice();
  if (typeof plugin.getRange === 'function') {
    var r = plugin.getRange(); pool = pool.slice(r[0], r[1]);
  }
  pool = pool.filter(function(item) { return item && (item.prompt || item.symbol); });
  var count = Math.min(parseInt(countInput.value) || plugin.defaultCount, pool.length);
  countInput.value = count; countInput.max = pool.length;
  SeaScribe.currentItems = SeaScribe.shuffleAndPick(pool, count);
  SeaScribe.answersVisible = false;
  btnReveal.disabled = false; btnReveal.textContent = '公布答案';
  SeaScribe.renderCards(SeaScribe.currentItems, false);
};

btnShuffle.addEventListener('click', function() { SeaScribe.doShuffle(); });

btnReveal.addEventListener('click', function() {
  SeaScribe.answersVisible = !SeaScribe.answersVisible;
  btnReveal.textContent = SeaScribe.answersVisible ? '隐藏答案' : '公布答案';
  SeaScribe.renderCards(SeaScribe.currentItems, SeaScribe.answersVisible);
});

SeaScribe.renderCards = function(items, showAnswers) {
  var plugin = SeaScribe.activePlugin;
  cardGrid.innerHTML = '';
  var frag = document.createDocumentFragment();
  items.forEach(function(item, i) {
    if (!item) return;
    var card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = (i * 0.04) + 's';
    card.innerHTML = '<div style="display:flex;align-items:baseline;gap:14px"><span class="card-num">' + (i + 1) + '</span><div class="card-prompt">' + plugin.renderPrompt(item, i) + '</div></div><div class="card-answers' + (showAnswers ? ' visible' : '') + '">' + plugin.renderAnswer(item) + '</div>';
    frag.appendChild(card);
  });
  cardGrid.appendChild(frag);
  if (showAnswers) {
    requestAnimationFrame(function() {
      cardGrid.querySelectorAll('.card-answers.visible').forEach(function(el) {
        el.classList.remove('visible'); void el.offsetWidth; el.classList.add('visible');
      });
    });
  }
};
