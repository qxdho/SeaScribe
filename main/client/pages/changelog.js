/* ============================================================
   SeaScribe — Changelog (ES Module)
   ============================================================ */

import { SeaScribe } from '../core/state.js';

SeaScribe.bindModal('changelog-overlay', 'btn-changelog-close-x');

var clBtn = document.getElementById('btn-changelog');
if (clBtn) {
  clBtn.addEventListener('click', function() {
    var overlay = document.getElementById('changelog-overlay');
    overlay.classList.remove('hidden');
    var body = document.getElementById('changelog-body');
    if (body && !body.dataset.loaded) {
      fetch('UPDATE.md').then(function(r) { return r.text(); }).then(function(md) {
        body.innerHTML = SeaScribe.renderMarkdown(md);
        body.dataset.loaded = '1';
      }).catch(function() {
        body.innerHTML = '<p>无法加载更新日志。</p>';
      });
    }
  });
}
