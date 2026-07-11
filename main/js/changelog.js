/* ============================================================
   SeaScribe — Changelog Overlay
   ============================================================ */

(function() {
  var overlay = document.getElementById('changelog-overlay');
  var body    = document.getElementById('changelog-body');

  window.SeaScribe.bindModal('changelog-overlay', 'btn-changelog-close-x');

  document.getElementById('btn-changelog').addEventListener('click', function() {
    overlay.classList.remove('hidden');
    fetch('UPDATE.md')
      .then(function(r) { return r.text(); })
      .then(function(md) {
        body.innerHTML = window.SeaScribe.renderMarkdown(md);
      })
      .catch(function() { body.innerHTML = '<p>无法加载更新日志</p>'; });
  });
})();
