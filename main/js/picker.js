/* ============================================================
   SeaScribe — Name Picker
   ============================================================ */

(function() {
  var stdlistSelect = document.getElementById('stdlist-select');
  var btnPick = document.getElementById('btn-pick');
  var pickResult = document.getElementById('pick-result');
  var overlay = document.getElementById('pick-overlay');
  var overlayText = document.getElementById('pick-overlay-text');

  var reg = window.__STDLIST_REGISTRY__ || [];
  reg.forEach(function(entry) {
    var opt = document.createElement('option');
    opt.value = entry.id;
    opt.textContent = entry.label;
    stdlistSelect.appendChild(opt);
  });
  if (reg.length) stdlistSelect.value = reg[0].id;

  var animating = false;

  btnPick.addEventListener('click', function() {
    if (animating) return;
    var listId = stdlistSelect.value;
    if (!listId) return;
    var list = window['__STDLIST_' + listId + '__'];
    if (!list || !list.length) return;

    animating = true;
    pickResult.textContent = '';
    var start = Math.floor(Math.random() * list.length);
    var total = list.length;
    overlay.classList.remove('hidden', 'shrink');

    function tick(i) {
      overlayText.textContent = list[(start + i) % list.length];
      if (i < total - 1) {
        setTimeout(function() { tick(i + 1); }, 1200 / total);
      } else {
        overlayText.classList.add('pop');
        setTimeout(function() {
          overlayText.classList.remove('pop');
          var target = pickResult.getBoundingClientRect();
          var overlayRect = overlayText.getBoundingClientRect();
          var dx = target.left + target.width / 2 - (overlayRect.left + overlayRect.width / 2);
          var dy = target.top + target.height / 2 - (overlayRect.top + overlayRect.height / 2);
          var scale = parseFloat(getComputedStyle(pickResult).fontSize) / parseFloat(getComputedStyle(overlayText).fontSize);

          overlay.style.setProperty('--dx', dx + 'px');
          overlay.style.setProperty('--dy', dy + 'px');
          overlay.style.setProperty('--scale', scale);
          overlay.style.setProperty('--shrink-dur', '0.6s');
          overlay.classList.add('shrink');

          overlay.addEventListener('animationend', function handler() {
            overlay.removeEventListener('animationend', handler);
            pickResult.textContent = list[(start + total - 1) % list.length];
            overlay.classList.add('hidden');
            animating = false;
          });
        }, 300);
      }
    }
    tick(0);
  });
})();
