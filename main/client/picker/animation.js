/* ============================================================
   SeaScribe — Picker Animation Module (ESM)
   双层动画编排：修饰动画（全屏滚动） + 过程动画（可选）
   串接 display 模块 → 缩小飞入
   ============================================================ */

import { SeaScribe } from '../core/state.js';
import { PickerDisplay } from './display.js';

var cfg = window.__PICKER_CONFIG__ || {};

// DOM 引用（由 index.js 传入或自行获取）
var decorativeEl, decorativeText, processEl, resultTarget;

function initRefs() {
  decorativeEl = document.getElementById('pick-decorative');
  decorativeText = document.getElementById('pick-decorative-text');
  processEl = document.getElementById('pick-process');
  resultTarget = document.getElementById('pick-result');
}

/**
 * 运行动画编排
 * @param {Array} list — 完整名单 [{name, signature}, ...]
 * @param {AsyncGenerator} generator — 随机算法 generator（yield {type:'results', persons})
 * @param {Object} options — { showProcess, processMode, decorativeType, count, multiMode }
 * @returns {Promise<{persons: [{name, signature, lastPickedTime}]}>}
 */
async function run(list, generator, options) {
  initRefs();
  options = options || {};
  var multiMode = options.multiMode || 'simultaneous';

  // 全部初始化到干净状态
  resetAll();

  // 确保修饰层可见
  decorativeEl.classList.remove('hidden');
  if (processEl) processEl.classList.add('hidden');

  // 启动修饰动画（非阻塞）
  var decorativeDone = startDecorative(list);

  // 启动过程动画（若开启）
  var processPromise = null;
  if (options.showProcess && processEl) {
    processEl.classList.remove('hidden');
    if (options.processMode === 'windowed') {
      processEl.classList.add('windowed');
    } else {
      processEl.classList.remove('windowed');
    }
    processPromise = runProcess(list, generator, processEl);
  }

  // 消费 generator 直到拿到结果
  var finalPersons = null;
  var lastPickedTime = null;

  if (!options.showProcess) {
    // 不显示过程动画：静默消费 generator
    finalPersons = await consumeSilent(generator);
  }

  // 等待过程动画完成（它会自己消费 generator）
  if (processPromise) {
    var pResult = await processPromise;
    finalPersons = pResult.persons;
    lastPickedTime = pResult.lastPickedTime;
    // 过程动画结束后自动消失
    if (processEl) processEl.classList.add('hidden');
  }

  // 兜底：generator 未产出结果时
  if (!finalPersons || !finalPersons.length) {
    finalPersons = [{ person: list[0] || { name: '', signature: '' }, lastPickedTime: null }];
  }

  // 停止修饰动画（会等待最少 _decorMinMs 后真正停止）
  stopDecorative(finalPersons[0].person.name);

  // 从时间戳查询上次点名时间
  if (options.timestamps && !lastPickedTime) {
    finalPersons.forEach(function(entry) {
      if (!entry.lastPickedTime) {
        entry.lastPickedTime = options.timestamps[entry.person.name] || null;
      }
    });
  }

  // 等待滚动动画真正结束（名字定格并开始弹跳）
  await decorativeDone;

  // 名字定格弹跳的同时立即填充头像/签名 —— 不再等彩带与 300ms 延迟
  if (decorativeEl) {
    if (finalPersons.length > 1) {
      PickerDisplay.fillMany(
        finalPersons.map(function(p) {
          return { name: p.person.name, signature: p.person.signature || '', lastPickedTime: p.lastPickedTime };
        }),
        multiMode
      );
    } else if (decorativeText) {
      PickerDisplay.fill({
        name: finalPersons[0].person.name,
        signature: finalPersons[0].person.signature || '',
        lastPickedTime: finalPersons[0].lastPickedTime,
      });
    }
  }

  // 彩带
  fireConfetti();

  // 弹跳（pickPop 0.35s）与彩带播放期间等待
  await SeaScribe.delay(300);

  // 弹跳结束，移除 pop
  if (decorativeText) decorativeText.classList.remove('pop');

  // 等待用户点击关闭
  await PickerDisplay.waitForClick();

  // 缩小飞入（固定动画，多人拼接名字）
  await shrinkToResult(finalPersons.map(function(p) { return p.person.name; }));

  return {
    persons: finalPersons.map(function(p) {
      return { name: p.person.name, signature: p.person.signature || '', lastPickedTime: p.lastPickedTime };
    }),
  };
}

/* ====== 修饰动画 ====== */
var _decorRunning = false;
var _decorTarget = null;
var _decorResolve = null;
var _decorStartTime = 0;
var _decorMinMs = cfg.decorMinMs || 2000;
var _decorGeneration = 0;

function startDecorative(list) {
  _decorRunning = true;
  _decorTarget = null;
  _decorStartTime = performance.now();
  var gen = ++_decorGeneration;

  return new Promise(function(resolve) {
    _decorResolve = resolve;

    var interval = cfg.decorIntervalMs || 80;
    var idx = 0;
    var lastTick = 0;

    function tick(ts) {
      if (gen !== _decorGeneration) return;
      if (!_decorRunning) {
        if (_decorTarget) {
          decorativeText.textContent = _decorTarget;
        }
        decorativeText.classList.add('pop');
        _decorResolve();
        return;
      }
      if (ts - lastTick >= interval) {
        lastTick = ts;
        idx = (idx + 1) % list.length;
        decorativeText.textContent = list[idx].name;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // Safety timeout: force stop after 30s
    setTimeout(function() {
      if (_decorRunning && gen === _decorGeneration) {
        _decorRunning = false;
      }
    }, 30000);
  });
}

function stopDecorative(finalName) {
  _decorTarget = finalName;
  var elapsed = performance.now() - _decorStartTime;
  if (elapsed < _decorMinMs) {
    // 还没滚够，延迟停止
    setTimeout(function() {
      _decorRunning = false;
    }, _decorMinMs - elapsed);
  } else {
    _decorRunning = false;
  }
}

/* ====== 过程动画 ====== */
async function runProcess(list, generator, el) {
  var stepIdx = 0;
  var result = null;
  var lastTime = null;

  // 初始淡入
  el.style.opacity = '0';
  el.style.transition = 'opacity 0.3s var(--ease)';
  await SeaScribe.delay(50);
  el.style.opacity = '1';

  while (true) {
    var step = await generator.next();
    if (step.done) break;

    var data = step.value;
    if (data.type === 'results') {
      result = data.persons; // [{person, lastPickedTime}, ...]
      lastTime = data.persons.length ? data.persons[0].lastPickedTime : null;
      renderProcessResult(el, data.persons);
      await SeaScribe.delay(cfg.processResultMs || 800);
      break;
    } else if (data.type === 'step') {
      stepIdx++;
      renderProcessStep(el, data, stepIdx);
    }
  }

  // 淡出消失
  el.style.opacity = '0';
  await SeaScribe.delay(cfg.processFadeMs || 300);
  el.style.opacity = '';
  el.style.transition = '';

  return { persons: result, lastPickedTime: lastTime };
}

function renderProcessStep(el, data, idx) {
  if (data.phase === 'subset') {
    // 时间加权随机法 —— 显示子集筛选
    var subsetNames = data.subset.map(function(p) { return p.name; }).join('、');
    var restCount = (data.rest || []).length;
    var roundInfo = data.round ? ' · 第 ' + data.round + ' 轮（剩 ' + data.poolSize + ' → ' + data.subset.length + ' 人）' : '';
    el.innerHTML = '<div class="proc-phase">时间加权随机法' + roundInfo + '</div>' +
      '<div class="proc-step-title">随机选出 <strong>' + data.subset.length + '</strong> 人进入下一轮</div>' +
      '<div class="proc-subset">' + SeaScribe.esc(subsetNames) + '</div>' +
      '<div class="proc-rest-label">淘汰 ' + restCount + ' 人</div>';
  } else if (data.phase === 'select') {
    // 时间加权随机法 —— 显示选中逻辑
    var neverCount = (data.neverPicked || []).length;
    var chosenName = data.chosen ? data.chosen.name : '';
    var reasonText;
    var detailHtml = '';

    if (data.reason === 'never') {
      reasonText = '子集中有 <strong>' + neverCount + '</strong> 人从未被点过';
      if (neverCount > 1) {
        reasonText += '，从中随机选出一人';
      }
      // 高亮从未点过的人
      var neverNames = (data.neverPicked || []).map(function(p) { return p.name; });
      var subsetNames = (data.subset || []).map(function(p) {
        var name = p.name;
        if (neverNames.indexOf(name) >= 0) {
          return '<span class="proc-highlight">' + SeaScribe.esc(name) + '</span>';
        }
        return SeaScribe.esc(name);
      }).join('、');
      detailHtml = '<div class="proc-subset">' + subsetNames + '</div>';
    } else {
      reasonText = '子集中所有人均已点过名，选<strong>距上次点名最久</strong>的人';
      var subsetNames2 = (data.subset || []).map(function(p) { return p.name; }).join('、');
      detailHtml = '<div class="proc-subset">' + SeaScribe.esc(subsetNames2) + '</div>';
    }

    el.innerHTML = '<div class="proc-phase">时间加权随机法 · 选定结果</div>' +
      '<div class="proc-reason">' + reasonText + '</div>' +
      detailHtml +
      '<div class="proc-chosen-name">🎯 ' + SeaScribe.esc(chosenName) + '</div>';
  } else {
    // 二分法
    var leftNames = (data.left || []).map(function(p) { return p.name; });
    var rightNames = (data.right || []).map(function(p) { return p.name; });
    var elimNames = (data.eliminated || []).map(function(p) { return p.name; });
    var elimIsRight = data.eliminated === data.right;
    var keepSide = elimIsRight ? leftNames : rightNames;
    var elimSide = elimIsRight ? rightNames : leftNames;
    var remaining = (data.remaining || []).length;
    var total = data.total;

    var pct = Math.round((remaining / total) * 100);
    var barHtml = '<div class="proc-bar"><div class="proc-bar-fill" style="width:' + pct + '%"></div></div>';

    el.innerHTML = '<div class="proc-phase">二分法 · 第 ' + idx + ' 轮</div>' +
      '<div class="proc-split">' +
        '<div class="proc-group proc-keep">' +
          '<div class="proc-group-label">✔ 保留</div>' +
          SeaScribe.esc(keepSide.join(' ')) +
        '</div>' +
        '<div class="proc-group proc-elim proc-out">' +
          '<div class="proc-group-label">✘ 淘汰</div>' +
          SeaScribe.esc(elimSide.join(' ')) +
        '</div>' +
      '</div>' +
      '<div class="proc-elim-msg">淘汰 ' + elimNames.length + ' 人，剩余 <strong>' + remaining + '</strong> / ' + total + '</div>' +
      barHtml;
  }
}

function renderProcessResult(el, persons) {
  var names = (persons || []).map(function(p) { return p.person.name; });
  el.innerHTML = '<div class="proc-phase">结果</div>' +
    '<div class="proc-result-name">🎯 ' + names.map(function(n) { return SeaScribe.esc(n); }).join('、') + '</div>' +
    '<div class="proc-result-sub">点击屏幕继续</div>';
}

async function consumeSilent(generator) {
  while (true) {
    var step = await generator.next();
    if (step.done) break;
    if (step.value.type === 'results') {
      return step.value.persons; // [{person, lastPickedTime}, ...]
    }
  }
  return null;
}

/* ====== 缩小飞入 ====== */
function shrinkToResult(names) {
  return new Promise(function(resolve) {
    var overlay = decorativeEl;
    var textEl = decorativeText;
    var target = resultTarget;
    var label = (Array.isArray(names) ? names : [names]).join(' ');

    // ── 多人：名字 ghost 副本一起从卡片原位飞到顶栏各自位置并淡出 ──
    if ((Array.isArray(names) ? names : [names]).length > 1) {
      var cards = document.getElementById('pick-decorative-cards');
      var nameEls = cards ? cards.querySelectorAll('.pick-decorative-card-name') : [];
      var nameList = Array.isArray(names) ? names : [names];
      // 顶栏用 span 包裹每个名字：测量每个名字在顶栏的各自目标位置
      target.textContent = '';
      var spans = nameList.map(function(n, i) {
        var s = document.createElement('span');
        s.textContent = n + (i < nameList.length - 1 ? ' ' : '');
        s.style.whiteSpace = 'pre';
        target.appendChild(s);
        return s;
      });
      // 复制名字为 ghost（fixed 定位到原位，脱离卡片容器）
      var ghosts = [];
      nameEls.forEach(function(el, i) {
        var r = el.getBoundingClientRect();
        var ghost = el.cloneNode(true);
        ghost.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;margin:0;z-index:10003;pointer-events:none;';
        overlay.appendChild(ghost);
        ghosts.push(ghost);
        var sr = spans[i] ? spans[i].getBoundingClientRect() : target.getBoundingClientRect();
        ghost._dx = sr.left + sr.width / 2 - (r.left + r.width / 2);
        ghost._dy = sr.top + sr.height / 2 - (r.top + r.height / 2);
      });
      // 一起飞入（0 延迟同时），各自飞到顶栏对应位置
      requestAnimationFrame(function() {
        ghosts.forEach(function(g) {
          g.style.transition = 'transform 0.5s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.3s ease 0.2s';
          g.style.transform = 'translate(' + g._dx + 'px,' + g._dy + 'px)';
          g.style.opacity = '0';
        });
        // 卡片整体同步淡出
        if (cards) {
          cards.style.transition = 'opacity 0.45s ease';
          cards.style.opacity = '0';
        }
      });
      // 背景淡出
      overlay.classList.add('shrink');
      // 飞入完成后收尾
      setTimeout(function() {
        ghosts.forEach(function(g) { if (g.parentNode) g.parentNode.removeChild(g); });
        overlay.classList.add('hidden');
        overlay.classList.remove('shrink');
        if (cards) {
          cards.style.opacity = '';
          cards.style.transition = '';
          cards.classList.add('hidden');
          cards.innerHTML = '';
        }
        var innerEl = overlay ? overlay.querySelector('.pick-decorative-inner') : null;
        if (innerEl) innerEl.style.display = '';
        resolve();
      }, 600);
      return;
    }

    // ── 单人：名字淡入后平移到顶栏 ──
    // 收起多人卡片（理论上单人无卡片，兜底清理）
    var cardsEl = document.getElementById('pick-decorative-cards');
    if (cardsEl) { cardsEl.classList.add('hidden'); cardsEl.innerHTML = ''; }

    // 恢复单卡布局，但清空头像/签名/时间/提示——只留名字用于飞入
    var inner = overlay ? overlay.querySelector('.pick-decorative-inner') : null;
    if (inner) inner.style.display = '';
    var avatarEl = document.getElementById('pick-decorative-avatar');
    if (avatarEl) { avatarEl.classList.add('hidden'); avatarEl.src = ''; avatarEl.style.opacity = ''; }
    var sigEl = document.getElementById('pick-decorative-sig');
    if (sigEl) { sigEl.textContent = ''; sigEl.classList.add('empty'); }
    var timeEl = document.getElementById('pick-decorative-time');
    if (timeEl) { timeEl.textContent = ''; timeEl.classList.add('never'); }
    var hintEl = overlay ? overlay.querySelector('.pick-decorative-hint') : null;
    if (hintEl) hintEl.style.display = 'none';

    target.textContent = '';
    textEl.textContent = label;
    // 飞入字号对齐顶栏目标：动画纯平移（scale≈1），名字不会变大/缩小跳变
    var targetFontSize = parseFloat(getComputedStyle(target).fontSize) || 16;
    textEl.style.fontSize = targetFontSize + 'px';

    // 名字柔和淡入（避免卡片收起后名字"突然"出现）
    textEl.style.opacity = '0';
    textEl.style.transition = 'opacity 0.12s ease';
    void overlay.offsetWidth;
    textEl.style.opacity = '1';

    // 等淡入完成后，测量稳定布局并播放飞入动画
    setTimeout(function() {
      var targetRect2 = target.getBoundingClientRect();
      var overlayRect = textEl.getBoundingClientRect();
      var dx = targetRect2.left + targetRect2.width / 2 - (overlayRect.left + overlayRect.width / 2);
      var dy = targetRect2.top + targetRect2.height / 2 - (overlayRect.top + overlayRect.height / 2);
      var targetFontSize2 = parseFloat(getComputedStyle(target).fontSize);
      var overlayFontSize = parseFloat(getComputedStyle(textEl).fontSize);
      var scale = targetFontSize2 / overlayFontSize;

      overlay.style.setProperty('--dx', dx + 'px');
      overlay.style.setProperty('--dy', dy + 'px');
      overlay.style.setProperty('--scale', scale);
      overlay.classList.add('shrink');

      textEl.addEventListener('animationend', function handler() {
        textEl.removeEventListener('animationend', handler);
        textEl.style.removeProperty('font-size');
        textEl.style.removeProperty('opacity');
        textEl.style.removeProperty('transition');
        target.textContent = label;
        overlay.classList.add('hidden');
        overlay.classList.remove('shrink');
        overlay.style.removeProperty('--dx');
        overlay.style.removeProperty('--dy');
        overlay.style.removeProperty('--scale');
        resolve();
      });
    }, 150);
  });
}

/* ====== Confetti ====== */
function fireConfetti() {
  if (typeof confetti === 'undefined') return;
  var count = cfg.confettiCount || 200;
  var defaults = { origin: { y: 0.7 }, zIndex: 10001, gravity: 1.4 };
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

/* 全部层初始化到干净状态 */
function resetAll() {
  var av = document.getElementById("pick-decorative-avatar");
  if (av) { av.classList.add("hidden"); av.src = ""; av.style.opacity = ""; }
  _decorRunning = false;
  _decorTarget = null;
  _decorStartTime = 0;
  if (decorativeEl) {
    decorativeEl.classList.add('hidden');
    decorativeEl.classList.remove('shrink', 'pop');
    decorativeEl.style.removeProperty('--dx');
    decorativeEl.style.removeProperty('--dy');
    decorativeEl.style.removeProperty('--scale');
    var inner = decorativeEl.querySelector('.pick-decorative-inner');
    if (inner) inner.style.display = '';
  }
  var cards = document.getElementById('pick-decorative-cards');
  if (cards) {
    cards.classList.add('hidden');
    cards.classList.remove('pop-all');
    cards.innerHTML = '';
  }
  if (decorativeText) {
    decorativeText.classList.remove('pop');
    decorativeText.textContent = '';
  }
  if (processEl) {
    processEl.classList.add('hidden');
    processEl.classList.remove('windowed');
    processEl.innerHTML = '';
  }
}

/* ====== 导出 ====== */
export const PickerAnimation = { run: run };
