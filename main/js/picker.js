/* ============================================================
   SeaScribe — Name Picker (v3.3)
   从 data/stdlist/ 扫描 CSV/XLSX 文件
   CSV 格式：第1列=姓名，第2列=头衔（可选）
   ============================================================ */

(function() {
  var stdlistSelect = document.getElementById('stdlist-select');
  var btnPick = document.getElementById('btn-pick');
  var pickResult = document.getElementById('pick-result');
  var overlay = document.getElementById('pick-overlay');
  var overlayText = document.getElementById('pick-overlay-text');

  var _currentList = [];  // [{name, title}]
  var animating = false;

  function ensureXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
      s.onload = resolve;
      s.onerror = function() { reject(new Error('无法加载 xlsx 解析库')); };
      document.head.appendChild(s);
    });
  }

  // Parse: col A = name, col B = title (optional)
  function parseNames(buf) {
    var wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    var wsname = wb.SheetNames[0];
    if (!wsname) return [];
    var ws = wb.Sheets[wsname];
    var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    var items = [];
    for (var i = 0; i < rows.length; i++) {
      var name = String(rows[i][0] || '').trim();
      var title = String(rows[i][1] || '').trim();
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
        var csvXlsx = files.filter(function(f) {
          return /\.(csv|xlsx|xls)$/i.test(f.name);
        });
        if (!csvXlsx.length) {
          stdlistSelect.innerHTML = '<option value="">无名单文件</option>';
          return;
        }
        stdlistSelect.innerHTML = '<option value="">— 选择班级 —</option>' +
          csvXlsx.map(function(f) {
            var label = f.name.replace(/\.(csv|xlsx|xls)$/i, '');
            return '<option value="' + esc(f.url) + '">' + esc(label) + '</option>';
          }).join('');
      })
      .catch(function() {
        stdlistSelect.innerHTML = '<option value="">扫描失败</option>';
      });
  }

  stdlistSelect.addEventListener('change', function() {
    var url = stdlistSelect.value;
    if (!url) { _currentList = []; return; }
    ensureXLSX().then(function() {
      return fetch(url);
    }).then(function(r) {
      if (!r.ok) throw new Error('加载失败');
      return r.arrayBuffer();
    }).then(function(buf) {
      _currentList = parseNames(buf);
    }).catch(function(err) {
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
      overlayText.innerHTML = esc(item.name) + (item.title ? '<br><small style="font-size:0.3em;opacity:0.7">' + esc(item.title) + '</small>' : '');
      if (i < total - 1) {
        setTimeout(function() { tick(i + 1); }, 1200 / total);
      } else {
        overlayText.classList.add('pop');
        setTimeout(function() {
          overlayText.classList.remove('pop');
          var target = pickResult.getBoundingClientRect();
          var overlayRect = overlayText.getBoundingClientRect();
          var dx = target.left + target.width / 2 - (overlayRect.left + overlayRect.width / 2);
          var dy = target.top + target.height / 2 - (overlayRect.top + overlayRect.height / 2);
          var scale = parseFloat(getComputedStyle(pickResult).fontSize) / parseFloat(getComputedStyle(overlayText).fontSize);

          overlay.style.setProperty('--dx', dx + 'px');
          overlay.style.setProperty('--dy', dy + 'px');
          overlay.style.setProperty('--scale', scale);
          overlay.style.setProperty('--shrink-dur', '0.6s');
          overlay.classList.add('shrink');

          overlay.addEventListener('animationend', function handler() {
            overlay.removeEventListener('animationend', handler);
            var last = list[(start + total - 1) % list.length];
            pickResult.innerHTML = esc(last.name) + (last.title ? ' <small style="font-size:0.5em;opacity:0.6">' + esc(last.title) + '</small>' : '');
            overlay.classList.add('hidden');
            animating = false;
          });
        }, 300);
      }
    }
    tick(0);
  });

  scanFiles();

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
})();
