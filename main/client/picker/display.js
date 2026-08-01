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
 * 紧凑态过渡：卡片容器固定不动，仅对内部元素（头像/名字/签名）做 FLIP
 * @param {HTMLElement} cards — 多卡容器
 * @param {string} mode — 逐卡交错间隔
 */
function flipToCompact(cards, mode) {
  var cardEls = cards.querySelectorAll('.pick-decorative-card');
  if (!cardEls.length) return;

  cardEls.forEach(function(card, i) {
    var delay = (mode === 'sequential' ? i * 200 : 0);
    setTimeout(function() {
      var elems = [
        card.querySelector('.pick-decorative-card-avatar'),
        card.querySelector('.pick-decorative-card-name'),
        card.querySelector('.pick-decorative-card-sig'),
      ].filter(Boolean);
      if (!elems.length) return;
      // 捕捉展示态位置
      var firsts = elems.map(function(el) { return el.getBoundingClientRect(); });
      // 切换紧凑态（卡片尺寸不变，仅内部重新布局）
      card.classList.add('compact');
      // 捕捉紧凑态位置，反向补偿
      elems.forEach(function(el, idx) {
        var first = firsts[idx];
        var last = el.getBoundingClientRect();
        var dx = first.left - last.left;
        var dy = first.top - last.top;
        var sx = first.width / Math.max(1, last.width);
        var sy = first.height / Math.max(1, last.height);
        el.style.transition = 'none';
        el.style.transformOrigin = 'top left';
        el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')';
      });
      void card.offsetWidth; // 强制重排
      // 平滑过渡到紧凑态自然位置（更慢更柔的缓动）
      // 错开 stagger：名字先让路 → 头像跟上 → 签名最后，避免移动路径交叉"撞车"
      var delays = [0.1, 0, 0.2]; // [avatar, name, sig]
      elems.forEach(function(el, idx) {
        el.style.transition = 'transform 0.8s cubic-bezier(0.33, 1, 0.68, 1) ' + (delays[idx] != null ? delays[idx] : 0) + 's';
        el.style.transform = '';
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
      // 清理多卡容器并恢复单卡布局
      var cards = document.getElementById('pick-decorative-cards');
      if (cards) {
        cards.classList.add('hidden');
        cards.classList.remove('pop-all');
        cards.querySelectorAll('.pick-decorative-card').forEach(function(c) {
          c.classList.remove('compact', 'pop');
          c.style.transition = '';
          c.style.transform = '';
          c.style.opacity = '';
        });
        cards.innerHTML = '';
      }
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
