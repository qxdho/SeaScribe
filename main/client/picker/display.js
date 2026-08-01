/* ============================================================
   SeaScribe — Picker Display Module (ESM)
   在修饰层占位元素中填入签名 + 上次时间 + 头像，等待用户点击
   v6.1.0: fill()/fillMany() 与 waitForClick() 分离 —— 头像/签名
   可与名字定格弹跳同时出现；支持点多人（同时/逐个定格）
   ============================================================ */

import { SeaScribe } from '../core/state.js';
import { PickerTimestamp } from './timestamp.js';

/* data URI 编码后的 SVG 占位头像 —— 避免 innerHTML 注入时
   双引号提前闭合 src 属性导致 SVG 源码泄露到页面 */
var DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<rect width="100" height="100" rx="50" fill="#ccc"/>' +
  '<circle cx="50" cy="40" r="18" fill="#999"/>' +
  '<ellipse cx="50" cy="82" rx="30" ry="22" fill="#999"/></svg>'
);

var sigEl, timeEl, avatarEl, hintEl, overlay;

function initRefs() {
  overlay = document.getElementById('pick-decorative');
  sigEl = document.getElementById('pick-decorative-sig');
  timeEl = document.getElementById('pick-decorative-time');
  avatarEl = document.getElementById('pick-decorative-avatar');
  hintEl = overlay ? overlay.querySelector('.pick-decorative-hint') : null;
}

/** 异步加载头像到指定 img 元素 */
function loadAvatar(imgEl, name) {
  if (!imgEl || !name) return;
  fetch('/api/admin/user-avatar?name=' + encodeURIComponent(name))
    .then(function(r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function(d) {
      if (d && d.avatar) {
        var preloadImg = new Image();
        preloadImg.onload = function() {
          imgEl.src = preloadImg.src;
          imgEl.style.opacity = '1';
        };
        preloadImg.onerror = function() {
          imgEl.src = d.avatar;
          imgEl.style.opacity = '1';
        };
        preloadImg.src = d.avatar;
      }
    })
    .catch(function(e) { console.error('Avatar preload failed:', e); });
}

/**
 * 填充签名 / 上次点名时间 / 头像（单卡，幂等，可在弹跳动画期间调用）
 * @param {Object} data — { name, signature, lastPickedTime }
 */
function fill(data) {
  initRefs();

  // 填入签名
  if (data.signature) {
    sigEl.textContent = data.signature;
    sigEl.classList.remove('empty');
  } else {
    sigEl.textContent = '';
    sigEl.classList.add('empty');
  }

  // 填入上次点名时间
  if (data.lastPickedTime) {
    var formatted = PickerTimestamp.format(data.lastPickedTime);
    timeEl.textContent = '上次点名：' + (formatted || data.lastPickedTime);
    timeEl.classList.remove('never');
  } else {
    timeEl.textContent = '✨ 未被点过';
    timeEl.classList.add('never');
  }

  // 加载头像 —— 没有则用默认占位
  if (avatarEl && data.name) {
    avatarEl.classList.remove('hidden');
    avatarEl.src = DEFAULT_AVATAR;
    avatarEl.style.opacity = '0.5';
    loadAvatar(avatarEl, data.name);
  }

  // 提示信息
  if (hintEl) hintEl.style.display = '';
}

/**
 * 多人结果填充为卡片列表（展示态 → 停顿 → FLIP 过渡到紧凑态）
 * @param {Array} persons — [{name, signature, lastPickedTime}, ...]
 * @param {string} mode — "simultaneous" 同时弹出 / "sequential" 逐个弹出
 */
function fillMany(persons, mode) {
  initRefs();
  var cards = document.getElementById('pick-decorative-cards');
  if (!cards) return;

  // 隐藏单卡布局，切到多卡容器
  var inner = overlay ? overlay.querySelector('.pick-decorative-inner') : null;
  if (inner) inner.style.display = 'none';
  if (avatarEl) avatarEl.src = '';
  cards.classList.remove('hidden');
  cards.classList.remove('pop-all');
  var PLACEHOLDER_SIG = '这位同学很低调，还没留下签名哦~';
  cards.innerHTML = persons.map(function(p, i) {
    var hasSig = !!p.signature;
    var sigText = hasSig ? p.signature : PLACEHOLDER_SIG;
    return '<div class="pick-decorative-card" data-idx="' + i + '" title="' + SeaScribe.esc(sigText) + '">' +
      '<div class="card-main">' +
        '<img class="pick-decorative-card-avatar" src="' + DEFAULT_AVATAR + '" alt="">' +
        '<span class="pick-decorative-card-name">' + SeaScribe.esc(p.name) + '</span>' +
      '</div>' +
      '<span class="pick-decorative-card-sig' + (hasSig ? '' : ' placeholder') + '">' + SeaScribe.esc(sigText) + '</span>' +
    '</div>';
  }).join('');

  // 异步加载每张卡的头像
  persons.forEach(function(p, i) {
    var img = cards.querySelector('.pick-decorative-card[data-idx="' + i + '"] .pick-decorative-card-avatar');
    loadAvatar(img, p.name);
  });

  // 按人数自适应列数（人多列多，卡片不超屏）
  applyCardGrid(cards, persons.length);

  // 弹出动画：逐个 / 同时；动画结束后脱离 animation 以便 FLIP 接管 transform
  var cardEls = cards.querySelectorAll('.pick-decorative-card');
  function releaseAnim(card) {
    card.addEventListener('animationend', function handler() {
      card.removeEventListener('animationend', handler);
      card.classList.remove('pop');
      card.style.opacity = '1';
      card.style.transform = 'none'; // 固定完整大小，避免回落到默认 scale(0.6)
      cards.classList.remove('pop-all');
    });
  }
  if (mode === 'sequential') {
    cardEls.forEach(function(card, i) {
      setTimeout(function() { card.classList.add('pop'); }, i * 380);
      releaseAnim(card);
    });
  } else {
    cards.classList.add('pop-all');
    cardEls.forEach(releaseAnim);
  }

  // 展示态停顿后，逐卡 FLIP 过渡到紧凑态（头像名字缩小横排，给签名让位）
  setTimeout(function() {
    flipToCompact(cards, mode);
  }, 1800);

  // 提示信息
  if (hintEl) hintEl.style.display = '';
}

/**
 * 按人数设置网格列数：人多列多，保证卡片高度在屏幕内
 * @param {HTMLElement} cards — 多卡容器
 * @param {number} n — 人数
 */
function applyCardGrid(cards, n) {
  var cols;
  if (n >= 18) cols = 6;
  else if (n >= 12) cols = 5;
  else if (n >= 8) cols = 4;
  else if (n >= 5) cols = 3;
  else if (n >= 3) cols = 2;
  else cols = 1;
  // 窄屏限制列数，避免卡片过窄
  if (window.innerWidth < 640 && cols > 3) cols = 3;
  if (window.innerWidth < 480 && cols > 2) cols = 2;
  cards.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';
}

/**
 * 紧凑态过渡：卡片容器固定不动，内部元素同时移动（分离路径防交叉）
 * @param {HTMLElement} cards — 多卡容器
 * @param {string} mode — 逐卡交错间隔
 */
function flipToCompact(cards, mode) {
  var cardEls = cards.querySelectorAll('.pick-decorative-card');
  if (!cardEls.length) return;

  cardEls.forEach(function(card, i) {
    var delay = (mode === 'sequential' ? i * 200 : 0);
    setTimeout(function() {
      var avatar = card.querySelector('.pick-decorative-card-avatar');
      var name = card.querySelector('.pick-decorative-card-name');
      var sig = card.querySelector('.pick-decorative-card-sig');
      var specs = [avatar, name, sig].filter(Boolean).map(function(el) {
        return { el: el, first: el.getBoundingClientRect() };
      });
      if (!specs.length) return;
      // 切换紧凑态，捕捉新位置并计算补偿
      card.classList.add('compact');
      specs.forEach(function(spec) {
        var last = spec.el.getBoundingClientRect();
        var dx = spec.first.left - last.left;
        var dy = spec.first.top - last.top;
        var sx = spec.first.width / Math.max(1, last.width);
        var sy = spec.first.height / Math.max(1, last.height);
        // 先原地缩小（40%）再直线平移：路径清晰，头像/名字不交叉
        spec.el.style.setProperty('--fx', dx + 'px');
        spec.el.style.setProperty('--fy', dy + 'px');
        spec.el.style.setProperty('--fs', sx + ',' + sy);
        spec._cls = 'flip-el';
      });
      void card.offsetWidth; // 强制重排
      // 同时播放（0 延迟），动画结束清理
      specs.forEach(function(spec) {
        spec.el.classList.add(spec._cls);
        spec.el.addEventListener('animationend', function handler() {
          spec.el.removeEventListener('animationend', handler);
          spec.el.classList.remove(spec._cls);
          ['--fx', '--fy', '--fs'].forEach(function(v) {
            spec.el.style.removeProperty(v);
          });
        });
      });
    }, delay);
  });
}

/**
 * 等待点击（或超时）关闭装饰层
 * @returns {Promise<void>}
 */
function waitForClick() {
  initRefs();

  return new Promise(function(resolve) {
    var resolved = false;
    function cleanup() {
      if (resolved) return;
      resolved = true;
      overlay.removeEventListener('click', onClick);
      overlay.removeEventListener('pointerup', onClick);
      sigEl.textContent = '';
      sigEl.classList.add('empty');
      timeEl.textContent = '';
      if (avatarEl) { avatarEl.src = ''; avatarEl.style.opacity = ''; }
      if (hintEl) hintEl.style.display = 'none';
      // 多卡容器保留给 shrink 飞入动画使用（收尾由 shrink 清理，不清空）
      var inner = overlay ? overlay.querySelector('.pick-decorative-inner') : null;
      if (inner) inner.style.display = '';
      resolve();
    }
    function onClick(e) {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
    }
    overlay.addEventListener('pointerup', onClick);
    overlay.addEventListener('click', onClick);
    // Safety timeout: auto-resolve after 120s to prevent hanging promise
    setTimeout(cleanup, 120000);
  });
}

export const PickerDisplay = { fill: fill, fillMany: fillMany, waitForClick: waitForClick };
