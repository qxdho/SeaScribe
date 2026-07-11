/* ============================================================
   SeaScribe — Picker Random Module
   三种随机算法，统一 async generator 接口
   ============================================================ */

(function() {
  var cfg = window.__PICKER_CONFIG__ || {};

  /**
   * 统一入口：根据方法名调用对应算法
   * @param {Array<{name, signature}>} list — 名单
   * @param {string} method — 'pure' | 'binary' | 'fair'
   * @param {Object} timestamps — { 姓名: "ISO时间字符串", ... }
   * @returns {AsyncGenerator} yield {type, ...}
   *   步骤: {type:'step', ...}  结果: {type:'result', person:{name,signature}, lastPickedTime}
   */
  async function* pick(list, method, timestamps) {
    timestamps = timestamps || {};

    if (method === 'binary') {
      yield* binaryPick(list);
    } else if (method === 'fair') {
      yield* fairPick(list, timestamps);
    } else {
      yield* purePick(list);
    }
  }

  /* ---------- 纯随机 ---------- */
  async function* purePick(list) {
    var idx = Math.floor(Math.random() * list.length);
    yield { type: 'result', person: list[idx], lastPickedTime: null };
  }

  /* ---------- 二分法 ---------- */
  async function* binaryPick(list) {
    var group = list.slice();
    var rejected = [];

    while (group.length > 1) {
      var mid = Math.floor(group.length / 2);
      // 奇数时随机分配多余者到左组或右组
      if (group.length % 2 !== 0) {
        mid += Math.random() < 0.5 ? 0 : 1;
      }
      var left = group.slice(0, mid);
      var right = group.slice(mid);
      // 随机淘汰一组
      var eliminateRight = Math.random() < 0.5;
      var eliminated = eliminateRight ? right : left;
      group = eliminateRight ? left : right;
      rejected = rejected.concat(eliminated);

      yield {
        type: 'step',
        left: left,
        right: right,
        eliminated: eliminated,
        remaining: group,
        rejected: rejected,
        total: list.length,
      };

      // 短暂延迟让动画帧渲染
      if (group.length > 1) {
        await delay(cfg.binaryStepDelay || 800);
      }
    }

    var person = group[0];
    yield { type: 'result', person: person, lastPickedTime: null };
  }

  /* ---------- 公平随机 ---------- */
  async function* fairPick(list, timestamps) {
    var ratio = cfg.fairSubsetRatio != null ? cfg.fairSubsetRatio : 0.3;
    var minSize = cfg.fairSubsetMin != null ? cfg.fairSubsetMin : 3;
    var subsetSize = Math.max(minSize, Math.floor(list.length * ratio));
    subsetSize = Math.min(subsetSize, list.length);

    // Fisher-Yates 洗牌取子集
    var shuffled = list.slice();
    var n = shuffled.length;
    for (var i = n - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    var subset = shuffled.slice(0, subsetSize);
    var rest = shuffled.slice(subsetSize);

    // yield 子集筛选过程
    yield {
      type: 'step',
      phase: 'subset',
      subset: subset,
      rest: rest,
      total: list.length,
    };

    await delay(cfg.fairStepDelay || 600);

    // 找从未被点过的人
    var neverPicked = [];
    for (var k = 0; k < subset.length; k++) {
      if (!timestamps[subset[k].name]) {
        neverPicked.push(subset[k]);
      }
    }

    var person;

    if (neverPicked.length > 0) {
      // 优先选从未被点过的人，多个则随机
      var pickIdx = Math.floor(Math.random() * neverPicked.length);
      person = neverPicked[pickIdx];

      yield {
        type: 'step',
        phase: 'select',
        subset: subset,
        neverPicked: neverPicked,
        chosen: person,
        reason: 'never',
        total: list.length,
      };
    } else {
      // 都点过，选间隔最长者
      var now = Date.now();
      var best = subset[0];
      var bestInterval = -1;
      for (var m = 0; m < subset.length; m++) {
        var ts = timestamps[subset[m].name];
        if (ts) {
          var interval = now - new Date(ts).getTime();
          if (interval > bestInterval) {
            bestInterval = interval;
            best = subset[m];
          }
        }
      }
      person = best;

      yield {
        type: 'step',
        phase: 'select',
        subset: subset,
        neverPicked: [],
        chosen: person,
        reason: 'interval',
        bestInterval: bestInterval,
        total: list.length,
      };
    }

    await delay(cfg.fairResultDelay || 400);

    var lastTime = timestamps[person.name] || null;
    yield { type: 'result', person: person, lastPickedTime: lastTime };
  }

  function delay(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  /* ====== 导出 ====== */
  window.PickerRandom = { pick: pick };
})();
