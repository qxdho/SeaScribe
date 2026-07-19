/* ============================================================
   SeaScribe — Modal Helper (ES Module)
   ============================================================ */

import { SeaScribe } from '../core/state.js';

SeaScribe.bindModal = function(overlayId, closeXId) {
  var overlay = document.getElementById(overlayId);
  var closeX  = document.getElementById(closeXId);

  function close() { overlay.classList.add('hidden'); }

  if (closeX) closeX.addEventListener('click', close);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) close();
  });
};
