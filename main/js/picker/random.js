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
   * @param {Object} options — { skipDelays: boolean }
   * @returns {AsyncGenerator} yield {type, ...}
   *   步骤: {type:'step', ...}  结果: {type:'result', person:{name,signature}, lastPickedTime}
   */
  async function* pick(list, method, timestamps, options) {
    timestamps = timestamps || {};
    options = options || {};

    if (method === 'binary') {
      yield* binaryPick(list, options);
    } else if (method === 'fair') {
      yield* fairPick(list, timestamps, options);
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
  async function* binaryPick(list, options) {
    var skip = options && options.skipDelays;
    var group = list.slice();
    var rejected = [];

    while (group.length > 1) {
      // 先洗牌再对半分，实现随机分组
      var shuffled = group.slice();
      var n = shuffled.length;
      for (var i = n - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
      }
      var mid = Math.floor(shuffled.length / 2);
      if (shuffled.length % 2 !== 0) {
        mid += Math.random() < 0.5 ? 0 : 1;
      }
      var left = shuffled.slice(0, mid);
      var right = shuffled.slice(mid);
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
      if (group.length > 1 && !skip) {
        await SeaScribe.delay(cfg.binaryStepDelay || 1000);
      }
    }

    var person = group[0];
    yield { type: 'result', person: person, lastPickedTime: null };
  }

  /* ---------- 时间加权随机法 ---------- */
  async function* fairPick(list, timestamps, options) {
    var skip = options && options.skipDelays;
    var ratio = cfg.fairSubsetRatio != null ? cfg.fairSubsetRatio : 0.3;
    var targetSize = cfg.fairTargetSize != null ? cfg.fairTargetSize : 5;
    var total = list.length;
    var pool = list.slice();
    var round = 0;

    // 多轮缩小子集，直到 ≤ targetSize
    while (pool.length > targetSize) {
      round++;
      var subsetSize = Math.max(targetSize, Math.floor(pool.length * ratio));
      subsetSize = Math.min(subsetSize, pool.length);

      // Fisher-Yates 洗牌
      var shuffled = pool.slice();
      var n = shuffled.length;
      for (var i = n - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
      }
      var subset = shuffled.slice(0, subsetSize);
      var rest = shuffled.slice(subsetSize);

      yield {
        type: 'step',
        phase: 'subset',
        subset: subset,
        rest: rest,
        total: total,
        round: round,
        poolSize: pool.length,
      };

      if (!skip) await SeaScribe.delay(cfg.fairStepDelay || 1200);
      pool = subset;
    }

    // 最终子集 ≤ targetSize，从中选人
    var subset = pool;

    var neverPicked = [];
    for (var k = 0; k < subset.length; k++) {
      if (!timestamps[subset[k].name]) {
        neverPicked.push(subset[k]);
      }
    }

    var person;

    if (neverPicked.length > 0) {
      var pickIdx = Math.floor(Math.random() * neverPicked.length);
      person = neverPicked[pickIdx];

      yield {
        type: 'step',
        phase: 'select',
        subset: subset,
        neverPicked: neverPicked,
        chosen: person,
        reason: 'never',
        total: total,
      };
    } else {
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
        total: total,
      };
    }

    if (!skip) await SeaScribe.delay(cfg.fairResultDelay || 1000);

    var lastTime = timestamps[person.name] || null;
    yield { type: 'result', person: person, lastPickedTime: lastTime };
  }

  /* ====== 导出 ====== */
  window.PickerRandom = { pick: pick };
})();
