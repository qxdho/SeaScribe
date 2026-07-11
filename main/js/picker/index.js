/* ============================================================
   SeaScribe — Picker Entry Module
   入口：Modal 弹窗管理 + 事件绑定 + 流程串接
   ============================================================ */

(function() {
  var cfg = window.__PICKER_CONFIG__ || {};

  // DOM
  var btnPicker = document.getElementById('btn-picker');
  var resultEl = document.getElementById('pick-result');
  var modal = document.getElementById('picker-modal');
  var listSelect = document.getElementById('picker-list-select');
  var decorativeSelect = document.getElementById('picker-decorative');
  var showProcessCheck = document.getElementById('picker-show-process');
  var processModeGroup = document.getElementById('picker-process-mode-group');
  var btnStart = document.getElementById('picker-start');
  var btnClose = document.getElementById('picker-close');
  var timestampCheck = document.getElementById('picker-timestamp');
  var methodRadios, processModeRadios;

  var _currentList = [];   // [{name, signature}, ...]
  var _currentFileName = '';
  var _animating = false;

  /* ====== 初始化配置 UI ====== */
  (function() {
    // 随机方式 radio
    var methodGroup = document.getElementById('picker-method-group');
    methodGroup.innerHTML = (cfg.methods || []).map(function(m) {
      var checked = m.id === cfg.defaultMethod ? ' checked' : '';
      return '<label class="picker-radio-item">' +
        '<input type="radio" name="picker-method" value="' + escAttr(m.id) + '"' + checked + '>' +
        '<span class="picker-radio-item-label">' +
          '<span class="title">' + esc(m.name) + '</span>' +
          '<span class="desc">' + esc(m.desc) + '</span>' +
        '</span>' +
      '</label>';
    }).join('');

    // 修饰动画 select
    decorativeSelect.innerHTML = (cfg.decorativeAnimations || []).map(function(a) {
      var sel = a.id === cfg.defaultDecorative ? ' selected' : '';
      return '<option value="' + escAttr(a.id) + '"' + sel + '>' + esc(a.name) + '</option>';
    }).join('');

    // 过程动画模式 radio
    var modeGroup = document.getElementById('picker-process-mode-group');
    var radioHTML = (cfg.processModes || []).map(function(m) {
      var chk = m.id === cfg.processMode ? ' checked' : '';
      return '<label>' +
        '<input type="radio" name="picker-process-mode" value="' + escAttr(m.id) + '"' + chk + '>' +
        '<span>' + esc(m.name) + '</span>' +
      '</label>';
    }).join('');
    modeGroup.innerHTML = '<label class="picker-section-label">过程动画显示模式</label>' +
      '<div class="picker-radio-inline">' + radioHTML + '</div>';

    // 重新获取动态创建的 radio 引用
    methodRadios = document.getElementsByName('picker-method');
    processModeRadios = document.getElementsByName('picker-process-mode');
  })();

  /* ====== Modal 控制 ====== */
  btnPicker.addEventListener('click', function() {
    if (_animating) return;
    modal.classList.remove('hidden');
    scanFiles();
  });

  btnClose.addEventListener('click', function() {
    modal.classList.add('hidden');
  });

  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.classList.add('hidden');
  });

  /* ====== 扫描名单文件 ====== */
  function scanFiles() {
    listSelect.innerHTML = '<option value="">扫描中…</option>';
    fetch('/api/stdlist-files')
      .then(function(r) { return r.json(); })
      .then(function(files) {
        var csvFiles = files.filter(function(f) { return /\.csv$/i.test(f.name); });
        if (!csvFiles.length) {
          listSelect.innerHTML = '<option value="">无名单文件</option>';
          btnStart.disabled = true;
          return;
        }
        listSelect.innerHTML = '<option value="">— 选择班级 —</option>' +
          csvFiles.map(function(f) {
            var label = f.name.replace(/\.csv$/i, '');
            return '<option value="' + escAttr(f.url) + '" data-filename="' + escAttr(f.name) + '">' + esc(label) + '</option>';
          }).join('');
        btnStart.disabled = true;
        // 自动选择最后一个
        var opts = listSelect.options;
        if (opts.length > 1) {
          listSelect.selectedIndex = opts.length - 1;
          listSelect.dispatchEvent(new Event('change'));
        }
      })
      .catch(function() {
        listSelect.innerHTML = '<option value="">扫描失败</option>';
        btnStart.disabled = true;
      });
  }

  /* ====== 加载选中班级 ====== */
  listSelect.addEventListener('change', function() {
    var opt = listSelect.selectedOptions[0];
    if (!opt || !opt.value) {
      _currentList = [];
      _currentFileName = '';
      btnStart.disabled = true;
      return;
    }
    _currentFileName = opt.getAttribute('data-filename') || '';
    fetch(opt.value + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function(r) { return r.text(); })
      .then(function(text) {
        // DEBUG
        console.log('[Picker] fetch 原始文本前300字:', JSON.stringify(text.substring(0, 300)));
        var linesArr = text.split(/\r?\n/);
        var withComma = linesArr.filter(function(l) { return l.indexOf(',') >= 0 && l.split(',')[1] && l.split(',')[1].trim(); });
        console.log('[Picker] 含非空第二列的样本行:', withComma.slice(0, 5).map(function(l) { return JSON.stringify(l); }));
        _currentList = parseCSV(text);
        btnStart.disabled = _currentList.length === 0;
      })
      .catch(function(err) {
        console.error('[Picker] 名单加载失败:', err);
        _currentList = [];
        btnStart.disabled = true;
      });
  });

  /* ====== 解析 CSV：第1列=姓名，第2列=个性签名 ====== */
  function parseCSV(text) {
    var items = [];
    var lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      var cols = line.split(',');
      var name = (cols[0] || '').trim();
      var signature = (cols[1] || '').trim();
      // DEBUG
      if (signature) {
        console.log('[Picker] parseCSV 签名行' + i + ': cols=' + JSON.stringify(cols) + ' → sig="' + signature + '"');
      }
      if (name) {
        items.push({ name: name, signature: signature || '' });
      }
    }
    var withSig = items.filter(function(p) { return p.signature; });
    console.log('[Picker] 解析完成: ' + items.length + ' 人, 有签名: ' + withSig.length + ' 人');
    if (withSig.length > 0) {
      console.log('[Picker] 签名样本:', withSig.slice(0, 3).map(function(p) {
        return p.name + ' → "' + p.signature + '"';
      }));
    }
    return items;
  }

  /* ====== 过程动画开关联动 ====== */
  showProcessCheck.addEventListener('change', function() {
    if (showProcessCheck.checked) {
      processModeGroup.classList.remove('hidden');
    } else {
      processModeGroup.classList.add('hidden');
    }
  });

  /* ====== 开始点名 ====== */
  btnStart.addEventListener('click', async function() {
    if (_animating) return;
    if (!_currentList.length) return;

    _animating = true;
    modal.classList.add('hidden');

    // 读取配置
    var method = getRadioValue(methodRadios, cfg.defaultMethod);
    var decorativeType = decorativeSelect.value || cfg.defaultDecorative;
    var showProcess = showProcessCheck.checked;
    var processMode = getRadioValue(processModeRadios, cfg.processMode);

    // 读取时间戳
    var timestamps = {};
    var doTimestamp = timestampCheck && timestampCheck.checked;
    if (window.PickerTimestamp && doTimestamp) {
      timestamps = await PickerTimestamp.load(_currentFileName);
    }

    // 启动随机算法
    var generator = PickerRandom.pick(_currentList, method, timestamps, { skipDelays: !showProcess });

    // 运行动画编排
    var result = await PickerAnimation.run(_currentList, generator, {
      showProcess: showProcess,
      processMode: processMode,
      decorativeType: decorativeType,
      timestamps: timestamps,
    });

    // 保存时间戳
    if (window.PickerTimestamp && doTimestamp) {
      await PickerTimestamp.save(_currentFileName, result);
    }

    _animating = false;
  });

  /* ====== 辅助函数 ====== */
  function getRadioValue(radios, defaultVal) {
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) return radios[i].value;
    }
    return defaultVal;
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function escAttr(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
