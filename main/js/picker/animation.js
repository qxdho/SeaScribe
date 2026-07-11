/* ============================================================
   SeaScribe — Picker Animation Module
   双层动画编排：修饰动画（全屏滚动） + 过程动画（可选）
   串接 display 模块 → 缩小飞入
   ============================================================ */

(function() {
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
   * @param {AsyncGenerator} generator — 随机算法 generator
   * @param {Object} options — { showProcess, processMode, decorativeType }
   * @returns {Promise<{name, signature, lastPickedTime}>}
   */
  async function run(list, generator, options) {
    initRefs();
    options = options || {};

    // 确保元素可见
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
    var finalPerson = null;
    var lastPickedTime = null;

    if (!options.showProcess) {
      // 不显示过程动画：静默消费 generator
      finalPerson = await consumeSilent(generator);
    }

    // 等待过程动画完成（它会自己消费 generator）
    if (processPromise) {
      var pResult = await processPromise;
      finalPerson = pResult.person;
      lastPickedTime = pResult.lastPickedTime;
    }

    // 停止修饰动画
    stopDecorative(finalPerson ? finalPerson.name : (list[0] ? list[0].name : ''));

    // 等待修饰动画定格
    await delay(400);

    // 彩带
    fireConfetti();

    await delay(300);

    // 调用 display 模块
    if (window.PickerDisplay) {
      await PickerDisplay.show({
        name: finalPerson.name,
        signature: finalPerson.signature || '',
        lastPickedTime: lastPickedTime,
      });
    }

    // 所有层消失
    hideAllLayers();

    // 缩小飞入（固定动画）
    await shrinkToResult(finalPerson.name);

    return {
      name: finalPerson.name,
      signature: finalPerson.signature || '',
      lastPickedTime: lastPickedTime,
    };
  }

  /* ====== 修饰动画 ====== */
  var _decorRunning = false;
  var _decorTarget = null;
  var _decorResolve = null;

  function startDecorative(list) {
    _decorRunning = true;
    _decorTarget = null;

    return new Promise(function(resolve) {
      _decorResolve = resolve;

      // 滚动展示姓名
      var interval = 80; // ms per name
      var idx = 0;
      var lastTick = 0;

      function tick(ts) {
        if (!_decorRunning) {
          // 停止：定位到最终名字
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
    });
  }

  function stopDecorative(finalName) {
    _decorRunning = false;
    _decorTarget = finalName;
  }

  /* ====== 过程动画 ====== */
  async function runProcess(list, generator, el) {
    var stepIdx = 0;
    var result = null;
    var lastTime = null;

    while (true) {
      var step = await generator.next();
      if (step.done) break;

      var data = step.value;
      if (data.type === 'result') {
        result = data.person;
        lastTime = data.lastPickedTime;
        // 渲染最终结果在过程层
        renderProcessResult(el, data.person);
        await delay(800);
        break;
      } else if (data.type === 'step') {
        stepIdx++;
        renderProcessStep(el, data, stepIdx);
        // 每步之间已有 generator 内部的 delay
      }
    }

    return { person: result, lastPickedTime: lastTime };
  }

  function renderProcessStep(el, data, idx) {
    if (data.phase === 'subset') {
      // 公平随机 —— 显示子集筛选
      var subsetNames = data.subset.map(function(p) { return p.name; }).join('、');
      var restNames = data.rest.map(function(p) { return p.name; }).join('、');
      el.innerHTML = '<div class="proc-phase">公平随机 — 第 ' + idx + ' 步</div>' +
        '<div class="proc-step-title">随机选出子集（' + data.subset.length + ' 人）</div>' +
        '<div class="proc-subset">' + esc(subsetNames) + '</div>' +
        '<div class="proc-rest-label">其余：</div>' +
        '<div class="proc-rest">' + esc(restNames) + '</div>';
    } else if (data.phase === 'select') {
      // 公平随机 —— 选定结果
      var reason = data.reason === 'never' ? '未被点过，优先选出' : '距上次点名间隔最长';
      el.innerHTML = '<div class="proc-phase">公平随机 — 选定</div>' +
        '<div class="proc-step-title">' + reason + '</div>' +
        '<div class="proc-chosen-name">🎯 ' + esc(data.chosen.name) + '</div>';
    } else {
      // 二分法
      var leftNames = (data.left || []).map(function(p) { return p.name; });
      var rightNames = (data.right || []).map(function(p) { return p.name; });
      var elimNames = (data.eliminated || []).map(function(p) { return p.name; });

      var elimClass = data.eliminated === data.right ? 'proc-right' : 'proc-left';

      el.innerHTML = '<div class="proc-phase">二分法 — 第 ' + idx + ' 轮</div>' +
        '<div class="proc-split">' +
          '<div class="proc-group proc-keep">' +
            (data.eliminated === data.right ? esc(leftNames.join(' ')) : esc(rightNames.join(' '))) +
          '</div>' +
          '<div class="proc-group ' + elimClass + '">' +
            esc(elimNames.join(' ')) +
          '</div>' +
        '</div>' +
        '<div class="proc-elim-msg">淘汰 ' + elimNames.length + ' 人，剩余 ' + (data.remaining || []).length + ' 人</div>';
    }
  }

  function renderProcessResult(el, person) {
    el.innerHTML = '<div class="proc-result-name">🎯 ' + esc(person.name) + '</div>';
  }

  async function consumeSilent(generator) {
    while (true) {
      var step = await generator.next();
      if (step.done) break;
      if (step.value.type === 'result') {
        return step.value.person;
      }
    }
    return null;
  }

  /* ====== 缩小飞入 ====== */
  function shrinkToResult(name) {
    return new Promise(function(resolve) {
      var overlay = decorativeEl;
      var textEl = decorativeText;
      var target = resultTarget;

      // 短暂显示 overlay 用于飞入
      overlay.classList.remove('hidden');
      textEl.textContent = name;
      textEl.classList.add('pop');

      setTimeout(function() {
        textEl.classList.remove('pop');

        var targetRect = target.getBoundingClientRect();
        var overlayRect = textEl.getBoundingClientRect();
        var dx = targetRect.left + targetRect.width / 2 - (overlayRect.left + overlayRect.width / 2);
        var dy = targetRect.top + targetRect.height / 2 - (overlayRect.top + overlayRect.height / 2);
        var targetFontSize = parseFloat(getComputedStyle(target).fontSize);
        var overlayFontSize = parseFloat(getComputedStyle(textEl).fontSize);
        var scale = targetFontSize / overlayFontSize;

        overlay.style.setProperty('--dx', dx + 'px');
        overlay.style.setProperty('--dy', dy + 'px');
        overlay.style.setProperty('--scale', scale);
        overlay.style.setProperty('--shrink-dur', '0.35s');
        overlay.classList.add('shrink');

        textEl.addEventListener('animationend', function handler() {
          textEl.removeEventListener('animationend', handler);
          target.textContent = name;
          overlay.classList.add('hidden');
          resolve();
        });
      }, 500);
    });
  }

  /* ====== Confetti ====== */
  function fireConfetti() {
    if (typeof confetti === 'undefined') return;
    var count = 200;
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

  function hideAllLayers() {
    if (decorativeEl) decorativeEl.classList.add('hidden');
    if (processEl) processEl.classList.add('hidden');
  }

  function delay(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /* ====== 导出 ====== */
  window.PickerAnimation = { run: run };
})();
