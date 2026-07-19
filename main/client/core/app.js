/* ============================================================
   SeaScribe — Application Entry Point (ES Module)
   ============================================================ */

import { SeaScribe, SubjectRegistry } from './state.js';
import '../utils/shuffle.js';
import '../utils/theme.js';
import '../ui/navigator.js';
import '../ui/controls.js';
import '../ui/cards.js';
import '../utils/plugin-utils.js';
import '../ui/modal.js';
import '../utils/markdown.js';
import '../pages/changelog.js';
import '../ui/splash.js';
import '../pages/about.js';
import '../ui/custom-select.js';

// Register plugins (loaded as regular scripts via index.html)
if (typeof EnglishPlugin !== 'undefined') SubjectRegistry.register(EnglishPlugin);
if (typeof ChemistryPlugin !== 'undefined') SubjectRegistry.register(ChemistryPlugin);
if (typeof EnwordPlugin !== 'undefined') SubjectRegistry.register(EnwordPlugin);

// Render subject page
SeaScribe.renderSubjectPage();

// Hash routing
(function() {
  var h = location.hash;
  if (h && h.indexOf('#/') === 0) {
    var id = h.slice(2);
    var p = SubjectRegistry.get(id);
    if (p) SeaScribe.openSubject(p);
  }
})();

// ---- 更多下拉菜单 ----
(function() {
  var btnMore = document.getElementById('btn-more');
  var menu = document.getElementById('more-menu');
  if (!btnMore || !menu) return;
  btnMore.addEventListener('click', function(e) {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });
  menu.querySelectorAll('.more-item').forEach(function(item) {
    item.addEventListener('click', function() { menu.classList.add('hidden'); });
  });
  document.addEventListener('click', function() { menu.classList.add('hidden'); });
})();

// ---- 管理后台登录状态 ----
(function() {
  var statusEl = document.getElementById('admin-status');
  if (!statusEl) return;
  var sess = null;
  try { sess = JSON.parse(localStorage.getItem('seascribe_admin') || 'null'); } catch(e) {}
  if (!sess || !sess.token) return;
  fetch('/api/admin/session', {
    credentials: 'same-origin',
    headers: { 'Authorization': 'Bearer ' + sess.token }
  }).then(function(r) { return r.json().then(function(data) { return { ok: r.ok, data: data }; }); })
    .then(function(res) {
      if (res.ok && res.data.username) {
        var name = res.data.displayName || res.data.nickname || res.data.username;
        statusEl.innerHTML = '<span class="status-dot"></span>' + SeaScribe.esc(name);
        statusEl.title = '已登录: ' + res.data.username + ' (' + res.data.role + ')';
        statusEl.classList.remove('hidden');
      }
    }).catch(function(e) { console.error('Admin session check failed:', e); });
})();
