/* ============================================================
   SeaScribe — Changelog Overlay
   ============================================================ */

(function() {
  var overlay = document.getElementById('changelog-overlay');
  var body    = document.getElementById('changelog-body');

  window.SeaScribe.bindModal('changelog-overlay', 'btn-changelog-close-x');

  document.getElementById('btn-changelog').addEventListener('click', function() {
    overlay.classList.remove('hidden');
    fetch('docs/update.md')
      .then(function(r) { return r.text(); })
      .then(function(md) {
        body.innerHTML = md
          .replace(/^### (.+)/gm, '<h3>$1</h3>')
          .replace(/^## (.+)/gm, '<h3>$1</h3>')
          .replace(/^# (.+)/gm, '<h2>$1</h2>')
          .replace(/^- (.+)/gm, '<li>$1</li>')
          .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
      })
      .catch(function() { body.innerHTML = '<p>无法加载更新日志</p>'; });
  });
})();
