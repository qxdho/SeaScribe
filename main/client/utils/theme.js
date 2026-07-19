/* ============================================================
   SeaScribe — Theme Manager
   ============================================================ */

import { SeaScribe } from '../core/state.js';

var btnTheme = document.getElementById('btn-theme');

SeaScribe.applyTheme = function(dark) {
  var t = dark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  if (btnTheme) btnTheme.textContent = dark ? '☀️' : '🌙';
  localStorage.setItem('seascribe_theme', t);
};

if (btnTheme) {
  btnTheme.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
  btnTheme.addEventListener('click', function() {
    SeaScribe.applyTheme(document.documentElement.getAttribute('data-theme') !== 'dark');
  });
}
