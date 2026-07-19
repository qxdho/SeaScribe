/* ============================================================
   SeaScribe — About Page (ES Module)
   ============================================================ */

import { SeaScribe } from '../core/state.js';

SeaScribe.bindModal('about-overlay', 'btn-about-close-x');

var aboutBtn = document.getElementById('btn-about');
if (aboutBtn) {
  aboutBtn.addEventListener('click', function() {
    var overlay = document.getElementById('about-overlay');
    overlay.classList.remove('hidden');
    var body = document.getElementById('about-body');
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
