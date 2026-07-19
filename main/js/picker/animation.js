/* ============================================================
   SeaScribe 鈥?Picker Animation Module
   鍙屽眰鍔ㄧ敾缂栨帓锛氫慨楗板姩鐢伙紙鍏ㄥ睆婊氬姩锛?+ 杩囩▼鍔ㄧ敾锛堝彲閫夛級
   涓叉帴 display 妯″潡 鈫?缂╁皬椋炲叆
   ============================================================ */

(function() {
  var cfg = window.__PICKER_CONFIG__ || {};

  // DOM 寮曠敤锛堢敱 index.js 浼犲叆鎴栬嚜琛岃幏鍙栵級
  var decorativeEl, decorativeText, processEl, resultTarget;

  function initRefs() {
    decorativeEl = document.getElementById('pick-decorative');
    decorativeText = document.getElementById('pick-decorative-text');
    processEl = document.getElementById('pick-process');
    resultTarget = document.getElementById('pick-result');
  }

  /**
   * 杩愯鍔ㄧ敾缂栨帓
   * @param {Array} list 鈥?瀹屾暣鍚嶅崟 [{name, signature}, ...]
   * @param {AsyncGenerator} generator 鈥?闅忔満绠楁硶 generator
   * @param {Object} options 鈥?{ showProcess, processMode, decorativeType }
   * @returns {Promise<{name, signature, lastPickedTime}>}
   */
  async function run(list, generator, options) {
    initRefs();
    options = options || {};

    // 鍏ㄩ儴鍒濆鍖栧埌骞插噣鐘舵€?
    resetAll();

    // 纭繚淇グ灞傚彲瑙?
    decorativeEl.classList.remove('hidden');
    if (processEl) processEl.classList.add('hidden');

    // 鍚姩淇グ鍔ㄧ敾锛堥潪闃诲锛?
    var decorativeDone = startDecorative(list);

    // 鍚姩杩囩▼鍔ㄧ敾锛堣嫢寮€鍚級
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

    // 娑堣垂 generator 鐩村埌鎷垮埌缁撴灉
    var finalPerson = null;
    var lastPickedTime = null;

    if (!options.showProcess) {
      // 涓嶆樉绀鸿繃绋嬪姩鐢伙細闈欓粯娑堣垂 generator
      finalPerson = await consumeSilent(generator);
    }

    // 绛夊緟杩囩▼鍔ㄧ敾瀹屾垚锛堝畠浼氳嚜宸辨秷璐?generator锛?
    if (processPromise) {
      var pResult = await processPromise;
      finalPerson = pResult.person;
      lastPickedTime = pResult.lastPickedTime;
      // 杩囩▼鍔ㄧ敾缁撴潫鍚庤嚜鍔ㄦ秷澶?
      if (processEl) processEl.classList.add('hidden');
    }

    // 鍋滄淇グ鍔ㄧ敾锛堜細绛夊緟鏈€灏?_decorMinMs 鍚庣湡姝ｅ仠姝級
    stopDecorative(finalPerson ? finalPerson.name : (list[0] ? list[0].name : ''));

    // 浠庢椂闂存埑鏌ヨ涓婃鐐瑰悕鏃堕棿
    if (options.timestamps && finalPerson) {
      lastPickedTime = options.timestamps[finalPerson.name] || null;
    }

    // 绛夊緟婊氬姩鍔ㄧ敾鐪熸缁撴潫
    await decorativeDone;

    // 褰╁甫
    fireConfetti();

    await SeaScribe.delay(300);

    // 鐩存帴鍦ㄤ慨楗板眰涓婅拷鍔犵鍚嶅拰鏃堕棿锛堜笉鍐嶇敤鐙珛 display 灞傦級
    if (window.PickerDisplay && decorativeEl && decorativeText) {
      decorativeText.classList.remove('pop');
      await PickerDisplay.showOnDecorative(decorativeEl, decorativeText, {
        name: finalPerson.name,
        signature: finalPerson.signature || '',
        lastPickedTime: lastPickedTime,
      });
    }

    // 缂╁皬椋炲叆锛堝浐瀹氬姩鐢伙級
    await shrinkToResult(finalPerson.name);

    return {
      name: finalPerson.name,
      signature: finalPerson.signature || '',
      lastPickedTime: lastPickedTime,
    };
  }

  /* ====== 淇グ鍔ㄧ敾 ====== */
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
    });
  }

  function stopDecorative(finalName) {
    _decorTarget = finalName;
    var elapsed = performance.now() - _decorStartTime;
    if (elapsed < _decorMinMs) {
      // 杩樻病婊氬锛屽欢杩熷仠姝?
      setTimeout(function() {
        _decorRunning = false;
      }, _decorMinMs - elapsed);
    } else {
      _decorRunning = false;
    }
  }

  /* ====== 杩囩▼鍔ㄧ敾 ====== */
  async function runProcess(list, generator, el) {
    var stepIdx = 0;
    var result = null;
    var lastTime = null;

    // 鍒濆娣″叆
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s var(--ease)';
    await SeaScribe.delay(50);
    el.style.opacity = '1';

    while (true) {
      var step = await generator.next();
      if (step.done) break;

      var data = step.value;
      if (data.type === 'result') {
        result = data.person;
        lastTime = data.lastPickedTime;
        renderProcessResult(el, data.person);
        await SeaScribe.delay(cfg.processResultMs || 800);
        break;
      } else if (data.type === 'step') {
        stepIdx++;
        renderProcessStep(el, data, stepIdx);
      }
    }

    // 娣″嚭娑堝け
    el.style.opacity = '0';
    await SeaScribe.delay(cfg.processFadeMs || 300);
    el.style.opacity = '';
    el.style.transition = '';

    return { person: result, lastPickedTime: lastTime };
  }

  function renderProcessStep(el, data, idx) {
    if (data.phase === 'subset') {
      // 鏃堕棿鍔犳潈闅忔満娉?鈥斺€?鏄剧ず瀛愰泦绛涢€?
      var subsetNames = data.subset.map(function(p) { return p.name; }).join('銆?);
      var restCount = (data.rest || []).length;
      var roundInfo = data.round ? ' 路 绗?' + data.round + ' 杞紙鍓?' + data.poolSize + ' 鈫?' + data.subset.length + ' 浜猴級' : '';
      el.innerHTML = '<div class="proc-phase">鏃堕棿鍔犳潈闅忔満娉? + roundInfo + '</div>' +
        '<div class="proc-step-title">闅忔満閫夊嚭 <strong>' + data.subset.length + '</strong> 浜鸿繘鍏ヤ笅涓€杞?/div>' +
        '<div class="proc-subset">' + SeaScribe.esc(subsetNames) + '</div>' +
        '<div class="proc-rest-label">娣樻卑 ' + restCount + ' 浜?/div>';
    } else if (data.phase === 'select') {
      // 鏃堕棿鍔犳潈闅忔満娉?鈥斺€?鏄剧ず閫変腑閫昏緫
      var neverCount = (data.neverPicked || []).length;
      var chosenName = data.chosen ? data.chosen.name : '';
      var reasonText;
      var detailHtml = '';

      if (data.reason === 'never') {
        reasonText = '瀛愰泦涓湁 <strong>' + neverCount + '</strong> 浜轰粠鏈鐐硅繃';
        if (neverCount > 1) {
          reasonText += '锛屼粠涓殢鏈洪€夊嚭涓€浜?;
        }
        // 楂樹寒浠庢湭鐐硅繃鐨勪汉
        var neverNames = (data.neverPicked || []).map(function(p) { return p.name; });
        var subsetNames = (data.subset || []).map(function(p) {
          var name = p.name;
          if (neverNames.indexOf(name) >= 0) {
            return '<span class="proc-highlight">' + SeaScribe.esc(name) + '</span>';
          }
          return SeaScribe.esc(name);
        }).join('銆?);
        detailHtml = '<div class="proc-subset">' + subsetNames + '</div>';
      } else {
        reasonText = '瀛愰泦涓墍鏈変汉鍧囧凡鐐硅繃鍚嶏紝閫?strong>璺濅笂娆＄偣鍚嶆渶涔?/strong>鐨勪汉';
        var subsetNames2 = (data.subset || []).map(function(p) { return p.name; }).join('銆?);
        detailHtml = '<div class="proc-subset">' + SeaScribe.esc(subsetNames2) + '</div>';
      }

      el.innerHTML = '<div class="proc-phase">鏃堕棿鍔犳潈闅忔満娉?路 閫夊畾缁撴灉</div>' +
        '<div class="proc-reason">' + reasonText + '</div>' +
        detailHtml +
        '<div class="proc-chosen-name">馃幆 ' + SeaScribe.esc(chosenName) + '</div>';
    } else {
      // 浜屽垎娉?
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

      el.innerHTML = '<div class="proc-phase">浜屽垎娉?路 绗?' + idx + ' 杞?/div>' +
        '<div class="proc-split">' +
          '<div class="proc-group proc-keep">' +
            '<div class="proc-group-label">鉁?淇濈暀</div>' +
            SeaScribe.esc(keepSide.join(' ')) +
          '</div>' +
          '<div class="proc-group proc-elim proc-out">' +
            '<div class="proc-group-label">鉁?娣樻卑</div>' +
            SeaScribe.esc(elimSide.join(' ')) +
          '</div>' +
        '</div>' +
        '<div class="proc-elim-msg">娣樻卑 ' + elimNames.length + ' 浜猴紝鍓╀綑 <strong>' + remaining + '</strong> / ' + total + '</div>' +
        barHtml;
    }
  }

  function renderProcessResult(el, person) {
    el.innerHTML = '<div class="proc-phase">缁撴灉</div>' +
      '<div class="proc-result-name">馃幆 ' + SeaScribe.esc(person.name) + '</div>' +
      '<div class="proc-result-sub">鐐瑰嚮灞忓箷缁х画</div>';
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

  /* ====== 缂╁皬椋炲叆 ====== */
  function shrinkToResult(name) {
    return new Promise(function(resolve) {
      var overlay = decorativeEl;
      var textEl = decorativeText;
      var target = resultTarget;

      target.textContent = '';
      textEl.textContent = name;

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
      overlay.classList.add('shrink');

      textEl.addEventListener('animationend', function handler() {
        textEl.removeEventListener('animationend', handler);
        target.textContent = name;
        overlay.classList.add('hidden');
        overlay.classList.remove('shrink');
        overlay.style.removeProperty('--dx');
        overlay.style.removeProperty('--dy');
        overlay.style.removeProperty('--scale');
        resolve();
      });
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

  /* 鍏ㄩ儴灞傚垵濮嬪寲鍒板共鍑€鐘舵€?*/
  function resetAll() {
    var av = document.getElementById('pick-decorative-avatar');
    if (av) { av.classList.add('hidden'); av.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2250%22 fill=%22%23ccc%22/><circle cx=%2250%22 cy=%2240%22 r=%2218%22 fill=%22%23999%22/><ellipse cx=%2250%22 cy=%2282%22 rx=%2230%22 ry=%2222%22 fill=%22%23999%22/></svg>'; av.style.opacity = ''; }
    _decorRunning = false;
    _decorTarget = null;
    _decorStartTime = 0;
    if (decorativeEl) {
      decorativeEl.classList.add('hidden');
      decorativeEl.classList.remove('shrink', 'pop');
      decorativeEl.style.removeProperty('--dx');
      decorativeEl.style.removeProperty('--dy');
      decorativeEl.style.removeProperty('--scale');
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

  /* ====== 瀵煎嚭 ====== */
  window.PickerAnimation = { run: run };
})();
