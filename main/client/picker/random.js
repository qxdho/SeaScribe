/* ============================================================
   SeaScribe — Picker Random Module (ESM)
   三种随机算法，统一 async generator 接口
   v6.1.0: 支持一次点多人（count>1 时无重复抽取）
   ============================================================ */

import { SeaScribe } from '../core/state.js';

const cfg = window.__PICKER_CONFIG__ || {};

/** Cryptographically secure random integer [0, max) */
function _cryptoRandom(max) {
  var arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return Math.floor((arr[0] / 4294967296) * max);
}

/** 无重复抽取 pickCount 人（Fisher-Yates 部分洗牌），不足则取全部 */
function _draw(list, pickCount) {
  var pool = list.slice();
  var n = pool.length;
  var need = Math.min(pickCount, n);
  var picked = [];
  for (var i = 0; i < need; i++) {
    var j = i + _cryptoRandom(n - i);
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    picked.push(pool[i]);
  }
  return picked;
}

/** 将主结果 + 补抽若干人，组装为 results 负载 */
function _composeResults(mainPerson, lastTime, list, timestamps, count) {
  var persons = [{ person: mainPerson, lastPickedTime: lastTime }];
  var chosen = [mainPerson.name];
  var need = Math.min(count, list.length) - 1;
  if (need > 0) {
    var rest = list.filter(function(p) { return chosen.indexOf(p.name) < 0; });
    var extra = _draw(rest, need);
    extra.forEach(function(p) {
      chosen.push(p.name);
      persons.push({ person: p, lastPickedTime: timestamps[p.name] || null });
    });
  }
  return { type: 'results', persons: persons };
}

async function* pick(list, method, timestamps, options) {
  timestamps = timestamps || {};
  options = options || {};
  var count = Math.max(1, options.count || 1);

  if (method === 'binary') {
    yield* binaryPick(list, timestamps, count, options);
  } else if (method === 'fair') {
    yield* fairPick(list, timestamps, count, options);
  } else {
    yield* purePick(list, timestamps, count);
  }
}

async function* purePick(list, timestamps, count) {
  var picked = _draw(list, count);
  var persons = picked.map(function(p) {
    return { person: p, lastPickedTime: timestamps[p.name] || null };
  });
  yield { type: 'results', persons: persons };
}

async function* binaryPick(list, timestamps, count, options) {
  var skip = options && options.skipDelays;
  var group = list.slice();
  var rejected = [];

  while (group.length > 1) {
    var shuffled = group.slice();
    var n = shuffled.length;
    for (var i = n - 1; i > 0; i--) {
      var j = _cryptoRandom(i + 1);
      var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    var mid = Math.floor(shuffled.length / 2);
    if (shuffled.length % 2 !== 0) {
      mid += _cryptoRandom(2) === 0 ? 0 : 1;
    }
    var left = shuffled.slice(0, mid);
    var right = shuffled.slice(mid);
    var eliminateRight = _cryptoRandom(2) === 0;
    var eliminated = eliminateRight ? right : left;
    group = eliminateRight ? left : right;
    rejected = rejected.concat(eliminated);

    yield {
      type: 'step',
      left: left, right: right,
      eliminated: eliminated, remaining: group,
      rejected: rejected, total: list.length,
    };

    if (group.length > 1 && !skip) {
      await SeaScribe.delay(cfg.binaryStepDelay || 800);
    }
  }

  var person = group[0];
  var lastTime = timestamps[person.name] || null;
  yield _composeResults(person, lastTime, list, timestamps, count);
}

async function* fairPick(list, timestamps, count, options) {
  var skip = options && options.skipDelays;
  var ratio = cfg.fairSubsetRatio != null ? cfg.fairSubsetRatio : 0.3;
  var targetSize = cfg.fairTargetSize != null ? cfg.fairTargetSize : 5;
  var total = list.length;
  var pool = list.slice();
  var round = 0;

  while (pool.length > targetSize) {
    round++;
    var subsetSize = Math.max(targetSize, Math.floor(pool.length * ratio));
    subsetSize = Math.min(subsetSize, pool.length);

    var shuffled = pool.slice();
    var n = shuffled.length;
    for (var i = n - 1; i > 0; i--) {
      var j = _cryptoRandom(i + 1);
      var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    var subset = shuffled.slice(0, subsetSize);
    var rest = shuffled.slice(subsetSize);

    yield {
      type: 'step', phase: 'subset',
      subset: subset, rest: rest,
      total: total, round: round, poolSize: pool.length,
    };

    if (!skip) await SeaScribe.delay(cfg.fairStepDelay || 1000);
    pool = subset;
  }

  var subset = pool;

  var neverPicked = [];
  for (var k = 0; k < subset.length; k++) {
    if (!timestamps[subset[k].name]) {
      neverPicked.push(subset[k]);
    }
  }

  var person;

  if (neverPicked.length > 0) {
    var pickIdx = _cryptoRandom(neverPicked.length);
    person = neverPicked[pickIdx];

    yield {
      type: 'step', phase: 'select',
      subset: subset, neverPicked: neverPicked,
      chosen: person, reason: 'never', total: total,
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
      type: 'step', phase: 'select',
      subset: subset, neverPicked: [],
      chosen: person, reason: 'interval',
      bestInterval: bestInterval, total: total,
    };
  }

  if (!skip) await SeaScribe.delay(cfg.fairResultDelay || 1000);

  var lastTime = timestamps[person.name] || null;
  yield _composeResults(person, lastTime, list, timestamps, count);
}

export const PickerRandom = { pick: pick };
