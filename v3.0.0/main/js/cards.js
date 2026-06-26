/* ============================================================
   SeaScribe — Cards (render, shuffle, reveal)
   ============================================================ */

(function() {
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

  window.SeaScribe.activePlugin   = null;
  window.SeaScribe.currentItems   = [];
  window.SeaScribe.answersVisible = false;

  // ---- SUBJECT PAGE ----
  window.SeaScribe.renderSubjectPage = function() {
    subjectList.innerHTML = '';
    SubjectRegistry.list().forEach(function(p) {
      var card = document.createElement('div');
      card.className = 'subject-card';
      card.innerHTML = '<span class="subject-icon">' + (p.meta.icon || '📚') + '</span><span class="subject-name">' + p.meta.name + '</span><span class="subject-desc">' + p.meta.description + '</span>';
      card.addEventListener('click', function() { window.SeaScribe.openSubject(p); });
      subjectList.appendChild(card);
    });
  };

  // ---- OPEN ----
  window.SeaScribe.openSubject = async function(plugin) {
    window.SeaScribe.activePlugin = plugin;
    location.hash = '#/' + plugin.meta.id;
    if (typeof plugin.loadConfig === 'function') plugin.loadConfig();

    dictationTitle.textContent = plugin.meta.name + '听写';
    pluginConfig.innerHTML = '';
    cardGrid.innerHTML = '';
    if (typeof plugin.configUI === 'function') plugin.configUI(pluginConfig, plugin);

    var max = window.SeaScribe.getMaxCount();
    countInput.value = Math.min(plugin.defaultCount, max);
    countInput.max = max;
    window.SeaScribe.gridColumns = plugin.gridColumns;
    window.SeaScribe.listColumns = plugin.listColumns;
    window.SeaScribe.gridFontSize = plugin.gridFontSize;
    window.SeaScribe.listFontSize = plugin.listFontSize;
    window.SeaScribe.applyLayout(plugin.defaultLayout);
    window.SeaScribe.applyColumns(plugin.defaultColumns);
    fontSlider.value = plugin.defaultFontSize;
    window.SeaScribe.applyFontSize(plugin.defaultFontSize);
    window.SeaScribe.answersVisible = false;
    btnReveal.disabled = true;
    btnReveal.textContent = '公布答案';

    await window.SeaScribe.switchToPage(dictationPage, subjectPage);
    window.SeaScribe.doShuffle();
  };

  // ---- SHUFFLE ----
  window.SeaScribe.doShuffle = async function() {
    var plugin = window.SeaScribe.activePlugin;
    if (!plugin) return;
    var items = await plugin.loadData();
    var pool = items.slice();
    if (typeof plugin.getRange === 'function') {
      var r = plugin.getRange(); pool = pool.slice(r[0], r[1]);
    }
    pool = pool.filter(function(item) { return item && (item.prompt || item.symbol); });
    var count = Math.min(parseInt(countInput.value) || plugin.defaultCount, pool.length);
    countInput.value = count; countInput.max = pool.length;
    window.SeaScribe.currentItems = new DictationEngine().shuffleAndPick(pool, count);
    window.SeaScribe.answersVisible = false;
    btnReveal.disabled = false; btnReveal.textContent = '公布答案';
    window.SeaScribe.renderCards(window.SeaScribe.currentItems, false);
  };

  btnShuffle.addEventListener('click', function() { window.SeaScribe.doShuffle(); });

  // ---- REVEAL ----
  btnReveal.addEventListener('click', function() {
    window.SeaScribe.answersVisible = !window.SeaScribe.answersVisible;
    btnReveal.textContent = window.SeaScribe.answersVisible ? '隐藏答案' : '公布答案';
    window.SeaScribe.renderCards(window.SeaScribe.currentItems, window.SeaScribe.answersVisible);
  });

  // ---- RENDER CARDS ----
  window.SeaScribe.renderCards = function(items, showAnswers) {
    var plugin = window.SeaScribe.activePlugin;
    cardGrid.innerHTML = '';
    items.forEach(function(item, i) {
      if (!item) return;
      var card = document.createElement('div');
      card.className = 'card';
      card.style.animationDelay = (i * 0.04) + 's';
      card.innerHTML = '<span class="card-num">' + (i + 1) + '</span><div class="card-prompt">' + plugin.renderPrompt(item, i) + '</div><div class="card-answers' + (showAnswers ? ' visible' : '') + '">' + plugin.renderAnswer(item) + '</div>';
      cardGrid.appendChild(card);
    });
    if (showAnswers) {
      requestAnimationFrame(function() {
        cardGrid.querySelectorAll('.card-answers.visible').forEach(function(el) {
          el.classList.remove('visible'); void el.offsetWidth; el.classList.add('visible');
        });
      });
    }
  };
})();
