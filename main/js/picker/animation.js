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
      // 过程动画结束后自动消失
      if (processEl) processEl.classList.add('hidden');
    }

    // 停止修饰动画
    stopDecorative(finalPerson ? finalPerson.name : (list[0] ? list[0].name : ''));

    // 从时间戳查询上次点名时间（覆盖算法返回值，保证所有方式一致）
    if (options.timestamps && finalPerson) {
      lastPickedTime = options.timestamps[finalPerson.name] || null;
    }

    // 彩带（立即释放，不等定格）
    fireConfetti();

    // 等待修饰动画定格
    await delay(500);

    // 直接在修饰层上追加签名和时间（不再用独立 display 层）
    if (window.PickerDisplay && decorativeEl && decorativeText) {
      console.log('[Animation] finalPerson:', JSON.stringify(finalPerson));
      decorativeText.classList.remove('pop');
      await PickerDisplay.showOnDecorative(decorativeEl, decorativeText, {
        name: finalPerson.name,
        signature: finalPerson.signature || '',
        lastPickedTime: lastPickedTime,
      });
    }

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

    // 初始淡入
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.25s var(--ease)';
    await delay(50);
    el.style.opacity = '1';

    while (true) {
      var step = await generator.next();
      if (step.done) break;

      var data = step.value;
      if (data.type === 'result') {
        result = data.person;
        lastTime = data.lastPickedTime;
        // 淡出 → 更新内容 → 淡入
        el.style.opacity = '0';
        await delay(250);
        renderProcessResult(el, data.person);
        el.style.opacity = '1';
        await delay(800);
        break;
      } else if (data.type === 'step') {
        stepIdx++;
        // 淡出 → 更新内容 → 淡入
        el.style.opacity = '0';
        await delay(250);
        renderProcessStep(el, data, stepIdx);
        el.style.opacity = '1';
        // 每步之间已有 generator 内部的 delay
      }
    }

    // 淡出消失
    el.style.opacity = '0';
    await delay(250);
    el.style.opacity = '';
    el.style.transition = '';

    return { person: result, lastPickedTime: lastTime };
  }

  function renderProcessStep(el, data, idx) {
    if (data.phase === 'subset') {
      // 公平随机 —— 显示子集筛选
      var subsetNames = data.subset.map(function(p) { return p.name; }).join('、');
      var restCount = (data.rest || []).length;
      el.innerHTML = '<div class="proc-phase">公平随机 · 随机筛选</div>' +
        '<div class="proc-step-title">从 ' + data.total + ' 人中随机选出 <strong>' + data.subset.length + '</strong> 人作为候选子集</div>' +
        '<div class="proc-subset">' + esc(subsetNames) + '</div>' +
        '<div class="proc-rest-label">其余 ' + restCount + ' 人暂不参与</div>';
    } else if (data.phase === 'select') {
      // 公平随机 —— 显示选中逻辑
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
            return '<span class="proc-highlight">' + esc(name) + '</span>';
          }
          return esc(name);
        }).join('、');
        detailHtml = '<div class="proc-subset">' + subsetNames + '</div>';
      } else {
        reasonText = '子集中所有人均已点过名，选<strong>距上次点名最久</strong>的人';
        var subsetNames2 = (data.subset || []).map(function(p) { return p.name; }).join('、');
        detailHtml = '<div class="proc-subset">' + esc(subsetNames2) + '</div>';
      }

      el.innerHTML = '<div class="proc-phase">公平随机 · 选定结果</div>' +
        '<div class="proc-reason">' + reasonText + '</div>' +
        detailHtml +
        '<div class="proc-chosen-name">🎯 ' + esc(chosenName) + '</div>';
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
            esc(keepSide.join(' ')) +
          '</div>' +
          '<div class="proc-group proc-elim proc-out">' +
            '<div class="proc-group-label">✘ 淘汰</div>' +
            esc(elimSide.join(' ')) +
          '</div>' +
        '</div>' +
        '<div class="proc-elim-msg">淘汰 ' + elimNames.length + ' 人，剩余 <strong>' + remaining + '</strong> / ' + total + '</div>' +
        barHtml;
    }
  }

  function renderProcessResult(el, person) {
    el.innerHTML = '<div class="proc-phase">结果</div>' +
      '<div class="proc-result-name">🎯 ' + esc(person.name) + '</div>' +
      '<div class="proc-result-sub">点击屏幕继续</div>';
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

      // 清空结果位，避免飞入时重影
      target.textContent = '';

      textEl.textContent = name;

      setTimeout(function() {
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
          overlay.classList.remove('shrink');
          overlay.style.removeProperty('--dx');
          overlay.style.removeProperty('--dy');
          overlay.style.removeProperty('--scale');
          overlay.style.removeProperty('--shrink-dur');
          resolve();
        });
      }, 200);
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
    if (decorativeEl) {
      decorativeEl.classList.add('hidden');
      decorativeEl.classList.remove('shrink');
      decorativeEl.style.removeProperty('--dx');
      decorativeEl.style.removeProperty('--dy');
      decorativeEl.style.removeProperty('--scale');
      decorativeEl.style.removeProperty('--shrink-dur');
    }
    if (processEl) processEl.classList.add('hidden');
  }

  /* 全部层初始化到干净状态 */
  function resetAll() {
    _decorRunning = false;
    _decorTarget = null;
    if (decorativeEl) {
      decorativeEl.classList.add('hidden');
      decorativeEl.classList.remove('shrink', 'pop');
      decorativeEl.style.removeProperty('--dx');
      decorativeEl.style.removeProperty('--dy');
      decorativeEl.style.removeProperty('--scale');
      decorativeEl.style.removeProperty('--shrink-dur');
    }
    if (decorativeText) {
      decorativeText.classList.remove('pop');
      decorativeText.textContent = '';
      decorativeText.style.visibility = '';
    }
    if (processEl) {
      processEl.classList.add('hidden');
      processEl.classList.remove('windowed');
      processEl.innerHTML = '';
    }
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
