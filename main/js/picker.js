/* ============================================================
   SeaScribe — Name Picker (v3.3)
   从 data/stdlist/ 扫描 CSV 文件，纯 JS 解析（零依赖）
   CSV 格式（无表头）：第1列=姓名，第2列=头衔（可选）
   ============================================================ */

(function() {
  var stdlistSelect = document.getElementById('stdlist-select');
  var btnPick = document.getElementById('btn-pick');
  var pickResult = document.getElementById('pick-result');
  var overlay = document.getElementById('pick-overlay');
  var overlayText = document.getElementById('pick-overlay-text');
  var overlayTitle = document.getElementById('pick-overlay-title');

  var _currentList = [];  // [{name, title}]
  var animating = false;

  // 纯 JS 解析 CSV（不用 SheetJS，避免编码问题）
  function parseCSV(text) {
    var items = [];
    var lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      var cols = line.split(',');
      var name = (cols[0] || '').trim();
      var title = (cols[1] || '').trim();
      if (name) {
        items.push({ name: name, title: title || '' });
      }
    }
    return items;
  }

  function scanFiles() {
    stdlistSelect.innerHTML = '<option value="">扫描中…</option>';
    fetch('/api/stdlist-files')
      .then(function(r) { return r.json(); })
      .then(function(files) {
        var csvFiles = files.filter(function(f) {
          return /\.csv$/i.test(f.name);
        });
        if (!csvFiles.length) {
          stdlistSelect.innerHTML = '<option value="">无名单文件</option>';
          return;
        }
        stdlistSelect.innerHTML = '<option value="">— 选择班级 —</option>' +
          csvFiles.map(function(f) {
            var label = f.name.replace(/\.csv$/i, '');
            return '<option value="' + esc(f.url) + '">' + esc(label) + '</option>';
          }).join('');
        // 自动选择最后一个（通常是最高班级）
        var opts = stdlistSelect.options;
        if (opts.length > 1) {
          stdlistSelect.selectedIndex = opts.length - 1;
          stdlistSelect.dispatchEvent(new Event('change'));
        }
      })
      .catch(function() {
        stdlistSelect.innerHTML = '<option value="">扫描失败</option>';
      });
  }

  stdlistSelect.addEventListener('change', function() {
    var url = stdlistSelect.value;
    if (!url) { _currentList = []; return; }
    fetch(url)
      .then(function(r) { return r.text(); })
      .then(function(text) {
        _currentList = parseCSV(text);
      })
      .catch(function(err) {
        console.error('名单加载失败:', err);
        _currentList = [];
      });
  });

  btnPick.addEventListener('click', function() {
    if (animating) return;
    if (!_currentList.length) return;

    animating = true;
    pickResult.innerHTML = '';
    var list = _currentList;
    var start = Math.floor(Math.random() * list.length);
    var total = list.length;
    overlay.classList.remove('hidden', 'shrink');

    function tick(i) {
      var item = list[(start + i) % list.length];
      overlayText.textContent = item.name;
      overlayTitle.textContent = '';
      overlayTitle.classList.remove('show');
      if (i < total - 1) {
        setTimeout(function() { tick(i + 1); }, 1200 / total);
      } else {
        // 定格后显示头衔
        var last = item;
        overlayTitle.textContent = last.title || '';
        overlayTitle.classList.add('show');
        overlayText.classList.add('pop');
        fireConfetti();
        setTimeout(function() {
          overlayText.classList.remove('pop');
          // 淡出头衔
          overlayTitle.classList.remove('show');
          // 头衔淡出后再等一小会就开始缩小
          var target = pickResult.getBoundingClientRect();
          var overlayRect = overlayText.getBoundingClientRect();
          var dx = target.left + target.width / 2 - (overlayRect.left + overlayRect.width / 2);
          var dy = target.top + target.height / 2 - (overlayRect.top + overlayRect.height / 2);
          var scale = parseFloat(getComputedStyle(pickResult).fontSize) / parseFloat(getComputedStyle(overlayText).fontSize);

          overlay.style.setProperty('--dx', dx + 'px');
          overlay.style.setProperty('--dy', dy + 'px');
          overlay.style.setProperty('--scale', scale);
          overlay.style.setProperty('--shrink-dur', '0.35s');
          overlay.classList.add('shrink');

          overlay.addEventListener('animationend', function handler() {
            overlay.removeEventListener('animationend', handler);
            pickResult.textContent = last.name;
            overlayTitle.textContent = '';
            overlay.classList.add('hidden');
            animating = false;
          });
        }, 400);
      }
    }
    tick(0);
  });

  // ---- Confetti 特效 ----
  function fireConfetti() {
    if (typeof confetti === 'undefined') return;
    var count = 200;
    var defaults = { origin: { y: 0.7 }, zIndex: 10001 };
    function fire(particleRatio, opts) {
      confetti(Object.assign({}, defaults, opts, {
        particleCount: Math.floor(count * particleRatio)
      }));
    }
    fire(0.25, { spread: 50, startVelocity: 55 });
    fire(0.2,  { spread: 90 });
    fire(0.35, { spread: 150, decay: 0.91, scalar: 0.8 });
    fire(0.1,  { spread: 180, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1,  { spread: 180, startVelocity: 45 });
  }

  scanFiles();

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
})();
