/* ============================================================
   SeaScribe — Markdown Modal Helper (ES Module)
   通用「弹窗 + 加载 UPDATE.md 渲染」逻辑（about / changelog 共用）
   ============================================================ */

import { SeaScribe } from '../core/state.js';

export function initMarkdownModal(btnId, overlayId, closeBtnId, bodyId, url) {
  SeaScribe.bindModal(overlayId, closeBtnId);
  var btn = document.getElementById(btnId);
  if (!btn) return;
  btn.addEventListener('click', function() {
    var overlay = document.getElementById(overlayId);
    if (overlay) overlay.classList.remove('hidden');
    var body = document.getElementById(bodyId);
    if (body && !body.dataset.loaded) {
      fetch(url).then(function(r) { return r.text(); }).then(function(md) {
        body.innerHTML = SeaScribe.renderMarkdown(md);
        body.dataset.loaded = '1';
      }).catch(function() {
        body.innerHTML = '<p>无法加载更新日志。</p>';
      });
    }
  });
}
