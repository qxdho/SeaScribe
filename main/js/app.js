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
})();
