/* ============================================================
   SeaScribe — Application Entry Point
   Loaded last; ties everything together.
   ============================================================ */

(function() {
  // Register plugins
  SubjectRegistry.register(EnglishPlugin);
  SubjectRegistry.register(ChemistryPlugin);

  // Render subject page
  window.SeaScribe.renderSubjectPage();

  // Hash routing: if URL has #/chemistry or #/english, open directly
  (function() {
    var h = location.hash;
    if (h && h.indexOf('#/') === 0) {
      var id = h.slice(2);
      var p = SubjectRegistry.get(id);
      if (p) window.SeaScribe.openSubject(p);
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

    // 点菜单项后关闭
    menu.querySelectorAll('.more-item').forEach(function(item) {
      item.addEventListener('click', function() {
        menu.classList.add('hidden');
      });
    });

    // 点页面其他地方关闭
    document.addEventListener('click', function() {
      menu.classList.add('hidden');
    });
  })();

  // ---- 管理后台登录状态 ----
  (function() {
    var statusEl = document.getElementById('admin-status');
    if (!statusEl) return;

    // 先检查 localStorage 是否有 admin session，避免未登录时 401
    var sess = null;
    try { sess = JSON.parse(localStorage.getItem('seascribe_admin') || 'null'); } catch(e) {}
    if (!sess || !sess.token) return;

    fetch('/api/admin/session', {
      credentials: 'same-origin',
      headers: { 'Authorization': 'Bearer ' + sess.token }
    })
      .then(function(r) { return r.json().then(function(data) { return { ok: r.ok, data: data }; }); })
      .then(function(res) {
        if (res.ok && res.data.username) {
          var name = res.data.displayName || res.data.nickname || res.data.username;
          statusEl.innerHTML = '<span class="status-dot"></span>' + SeaScribe.esc(name);
          statusEl.title = '已登录: ' + res.data.username + ' (' + res.data.role + ')';
          statusEl.classList.remove('hidden');
        }
      })
      .catch(function(e) { console.error('Admin session check failed:', e); });
  })();
})();
