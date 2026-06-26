/* ============================================================
   SeaScribe — Theme Manager
   ============================================================ */

(function() {
  const btnTheme = document.getElementById('btn-theme');

  window.SeaScribe.applyTheme = function(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    btnTheme.textContent = dark ? '☀️' : '🌙';
  };

  // Init
  btnTheme.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';

  btnTheme.addEventListener('click', function() {
    window.SeaScribe.applyTheme(document.documentElement.getAttribute('data-theme') !== 'dark');
  });
})();
