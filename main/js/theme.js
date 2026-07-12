/* ============================================================
   SeaScribe — Theme Manager
   与 admin 共享 localStorage key: seascribe_theme
   ============================================================ */

(function() {
  var btnTheme = document.getElementById('btn-theme');

  window.SeaScribe.applyTheme = function(dark) {
    var t = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    btnTheme.textContent = dark ? '☀️' : '🌙';
    localStorage.setItem('seascribe_theme', t);
  };

  // Init button icon
  btnTheme.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';

  btnTheme.addEventListener('click', function() {
    window.SeaScribe.applyTheme(document.documentElement.getAttribute('data-theme') !== 'dark');
  });
})();
