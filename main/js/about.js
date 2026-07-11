/* ============================================================
   SeaScribe — About Overlay
   从 README.md 加载内容并渲染为 HTML
   ============================================================ */

(function() {
  var overlay = document.getElementById('about-overlay');
  var body = document.getElementById('about-body');

  window.SeaScribe.bindModal('about-overlay', 'btn-about-close-x');

  document.getElementById('btn-about').addEventListener('click', function() {
    overlay.classList.remove('hidden');
    fetch('README.md')
      .then(function(r) { return r.text(); })
      .then(function(md) {
        body.innerHTML = window.SeaScribe.renderMarkdown(md);
      })
      .catch(function() { body.innerHTML = '<p>无法加载关于页面</p>'; });
  });
})();
