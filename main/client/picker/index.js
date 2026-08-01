/* ============================================================
   SeaScribe — Picker Entry Module (ESM)
   入口：Modal 弹窗管理 + 事件绑定 + 流程串接
   ============================================================ */

import { SeaScribe } from '../core/state.js';
import { PickerRandom } from './random.js';
import { PickerTimestamp } from './timestamp.js';
import { PickerAnimation } from './animation.js';

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
var timestampCheck = document.getElementById('picker-timestamp');
var btnTsView = document.getElementById('picker-ts-view');
var tsPanel = document.getElementById('picker-ts-panel');
var tsBody = document.getElementById('picker-ts-body');
var processModeRadios, multiRadios;

var _currentList = [];   // [{name, signature}, ...]
var _currentFileName = '';
var _animating = false;
var _count = Math.min(Math.max(1, cfg.defaultCount || 1), cfg.countMax || 10);

// 人数与多人模式 DOM
var countMinus = document.getElementById('picker-count-minus');
var countPlus = document.getElementById('picker-count-plus');
var countValueEl = document.getElementById('picker-count-value');
var countHint = document.getElementById('picker-count-hint');
var methodSelect = document.getElementById('picker-method-select');

// 调试 DOM
var debugToggle = document.getElementById('picker-debug-toggle');
var debugSection = document.getElementById('picker-debug-section');
var debugSelect = document.getElementById('picker-debug-name');
var debugPlay = document.getElementById('picker-debug-play');

/* ====== 初始化配置 UI ====== */
(function() {
  // 随机方式下拉（替代原 radio 卡片组，紧凑布局）
  var methodSelect = document.getElementById('picker-method-select');
  methodSelect.innerHTML = (cfg.methods || []).map(function(m) {
    var sel = m.id === cfg.defaultMethod ? ' selected' : '';
    return '<option value="' + escAttr(m.id) + '"' + sel + ' title="' + SeaScribe.esc(m.desc || '') + '">' + SeaScribe.esc(m.name) + '</option>';
  }).join('');

  // 修饰动画 select
  decorativeSelect.innerHTML = (cfg.decorativeAnimations || []).map(function(a) {
    var sel = a.id === cfg.defaultDecorative ? ' selected' : '';
    return '<option value="' + escAttr(a.id) + '"' + sel + '>' + SeaScribe.esc(a.name) + '</option>';
  }).join('');

  // 过程动画模式 radio
  processModeGroup.innerHTML = (cfg.processModes || []).map(function(m) {
    var chk = m.id === cfg.processMode ? ' checked' : '';
    return '<label><input type="radio" name="picker-process-mode" value="' + escAttr(m.id) + '"' + chk + '><span>' + SeaScribe.esc(m.name) + '</span></label>';
  }).join('');

  // 重新获取动态创建的 radio 引用
  processModeRadios = document.getElementsByName('picker-process-mode');
  multiRadios = document.getElementsByName('picker-multi-mode');
})();

// 初始状态：过程动画 radio 置灰（未勾选"显示随机过程"）
updateProcessUI();

/* ====== 人数控件 ====== */
function updateCountUI() {
  var max = cfg.countMax || 10;
  if (countValueEl) countValueEl.textContent = _count;
  if (countMinus) countMinus.disabled = _count <= 1;
  if (countPlus) countPlus.disabled = _count >= max;
  if (countHint) countHint.classList.toggle('hidden', _count < max);
  // 多人动画常驻占位，人数=1 时置灰（页面不因显隐跳动）
  if (multiRadios) {
    for (var i = 0; i < multiRadios.length; i++) {
      multiRadios[i].disabled = _count <= 1;
    }
  }
}
if (countMinus) {
  countMinus.addEventListener('click', function() {
    if (_count > 1) { _count--; updateCountUI(); }
  });
}
if (countPlus) {
  countPlus.addEventListener('click', function() {
    var max = cfg.countMax || 10;
    if (_count < max) { _count++; updateCountUI(); }
  });
}
updateCountUI();

/* ====== Modal 控制 ====== */
SeaScribe.bindModal('picker-modal', 'picker-close-x');

btnPicker.addEventListener('click', function() {
  if (_animating) return;
  modal.classList.remove('hidden');
  scanFiles();
});

/* ====== 扫描名单文件 ====== */
function scanFiles() {
  listSelect.innerHTML = '<option value="">扫描中…</option>';
  fetch('/api/roster/classes')
    .then(function(r) { return r.json(); })
    .then(function(classes) {
      if (!classes.length) {
        listSelect.innerHTML = '<option value="">无班级数据</option>';
        btnStart.disabled = true;
        return;
      }
      listSelect.innerHTML = '<option value="">— 选择班级 —</option>' +
        classes.map(function(c) {
          return '<option value="' + escAttr(c) + '">' + SeaScribe.esc(c) + '</option>';
        }).join('');
      btnStart.disabled = true;
      if (listSelect.options.length > 1) {
        listSelect.selectedIndex = listSelect.options.length - 1;
        listSelect.dispatchEvent(new Event('change'));
      }
      if (listSelect._customSelect) listSelect._customSelect.refresh();
    })
    .catch(function() {
      listSelect.innerHTML = '<option value="">加载失败</option>';
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
  _currentFileName = opt.value;
  fetch('/api/roster/' + encodeURIComponent(opt.value))
    .then(function(r) { return r.json(); })
    .then(function(students) {
      _currentList = students.map(function(s) {
        return { name: s.name, signature: s.signature || '' };
      });
      btnStart.disabled = _currentList.length === 0;
      btnTsView.disabled = _currentList.length === 0;
      tsPanel.classList.add('hidden');
      // 填充调试下拉框
      debugSelect.innerHTML = '<option value="">— 选择姓名后播放动画 —</option>' +
        _currentList.map(function(s) {
          return '<option value="' + SeaScribe.esc(s.name) + '">' + SeaScribe.esc(s.name) + (s.signature ? ' — ' + SeaScribe.esc(s.signature) : '') + '</option>';
        }).join('');
      if (debugSelect._customSelect) debugSelect._customSelect.refresh();
      debugPlay.disabled = true;
    })
    .catch(function(err) {
      console.error('[Picker] 名单加载失败:', err);
      _currentList = [];
      btnStart.disabled = true;
      btnTsView.disabled = true;
    });
});

/* ====== 时间戳管理 ====== */
btnTsView.addEventListener('click', async function() {
  if (!_currentFileName) return;
  var ts = await PickerTimestamp.load(_currentFileName);
  var names = Object.keys(ts);
  if (!names.length) {
    tsBody.innerHTML = '<div style="color:var(--muted);padding:8px 0">暂无记录</div>';
  } else {
    names.sort(function(a, b) { return (ts[b] || '').localeCompare(ts[a] || ''); });
    tsBody.innerHTML = names.map(function(n) {
      var t = PickerTimestamp.format(ts[n]) || '—';
      return '<div class="picker-ts-row"><span class="picker-ts-name">' + SeaScribe.esc(n) + '</span><span class="picker-ts-time">' + t + '</span></div>';
    }).join('');
  }
  tsPanel.classList.remove('hidden');
});

document.getElementById('picker-ts-panel-close').addEventListener('click', function() {
  tsPanel.classList.add('hidden');
});

/* ====== 过程动画开关联动（常驻置灰，不显隐，界面不跳动） ====== */
function updateProcessUI() {
  var on = showProcessCheck.checked;
  for (var i = 0; i < processModeRadios.length; i++) {
    processModeRadios[i].disabled = !on;
  }
}
showProcessCheck.addEventListener('change', updateProcessUI);

/* ====== 调试模式开关（常驻置灰） ====== */
if (debugToggle) {
  debugToggle.addEventListener('change', function() {
    var on = debugToggle.checked;
    if (debugSelect) debugSelect.disabled = !on;
    if (debugPlay) debugPlay.disabled = !on || !debugSelect.value;
  });
  debugSelect.addEventListener('change', function() {
    debugPlay.disabled = debugToggle.checked ? !debugSelect.value : true;
  });
}

/* ====== 开始点名 ====== */
btnStart.addEventListener('click', async function() {
  if (_animating) return;
  if (!_currentList.length) return;

  _animating = true;
  modal.classList.add('hidden');

  // 读取配置
  var method = methodSelect.value || cfg.defaultMethod;
  var decorativeType = decorativeSelect.value || cfg.defaultDecorative;
  var showProcess = showProcessCheck.checked;
  var processMode = getRadioValue(processModeRadios, cfg.processMode);
  var pickCount = _count;
  var multiMode = getRadioValue(multiRadios, cfg.defaultMultiMode);

  // 读取时间戳
  var timestamps = {};
  var doTimestamp = timestampCheck && timestampCheck.checked;
  if (doTimestamp) {
    timestamps = await PickerTimestamp.load(_currentFileName);
  }

  // 启动随机算法
  var generator = PickerRandom.pick(_currentList, method, timestamps, {
    count: pickCount,
    skipDelays: !showProcess,
  });

  // 运行动画编排
  var result = await PickerAnimation.run(_currentList, generator, {
    showProcess: showProcess,
    processMode: processMode,
    decorativeType: decorativeType,
    timestamps: timestamps,
    count: pickCount,
    multiMode: multiMode,
  });

  // 保存时间戳（多人批量）
  if (doTimestamp && result.persons) {
    await PickerTimestamp.saveMany(_currentFileName, result.persons.map(function(p) { return p.name; }));
  }

  _animating = false;
});

/* ====== 调试播放动画 ====== */
debugPlay.addEventListener('click', async function() {
  var name = debugSelect.value;
  if (!name || _animating || !_currentList.length) return;

  // 从名单中匹配签名
  var person = null;
  for (var i = 0; i < _currentList.length; i++) {
    if (_currentList[i].name === name) { person = _currentList[i]; break; }
  }
  if (!person) person = { name: name, signature: '' };

  _animating = true;
  modal.classList.add('hidden');

  // 调试模式：隐藏头像
  var avatarEl = document.getElementById('pick-decorative-avatar');
  var avatarWasHidden = avatarEl ? avatarEl.classList.contains('hidden') : true;
  if (avatarEl) avatarEl.classList.add('hidden');

  // 查询时间戳（若有记录则显示上次时间）
  var timestamps = {};
  if (_currentFileName) {
    timestamps = await PickerTimestamp.load(_currentFileName);
  }
  var lastTime = timestamps[name] || null;

  // 构造 fake generator：直接返回指定结果（单卡）
  async function* fakeGen() {
    yield { type: 'results', persons: [{ person: person, lastPickedTime: lastTime }] };
  }

  // 运行动画（不保存时间戳）
  await PickerAnimation.run(_currentList, fakeGen(), {
    showProcess: showProcessCheck.checked,
    processMode: getRadioValue(processModeRadios, cfg.processMode),
    decorativeType: decorativeSelect.value || cfg.defaultDecorative,
    timestamps: timestamps,
  });

  _animating = false;
  if (avatarEl) { avatarEl.src = ''; avatarEl.classList.add('hidden'); }
});

/* ====== 辅助函数 ====== */
function getRadioValue(radios, defaultVal) {
  for (var i = 0; i < radios.length; i++) {
    if (radios[i].checked) return radios[i].value;
  }
  return defaultVal;
}

function escAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
