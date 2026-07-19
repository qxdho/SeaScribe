/* ============================================================
   SeaScribe 鈥?Picker Display Module
   鍦ㄤ慨楗板眰鍗犱綅鍏冪礌涓～鍏ョ鍚?+ 涓婃鏃堕棿锛岀瓑寰呯敤鎴风偣鍑?   ============================================================ */

(function() {

  var sigEl, timeEl, avatarEl, hintEl, overlay;

  function initRefs() {
    overlay = document.getElementById('pick-decorative');
    sigEl = document.getElementById('pick-decorative-sig');
    timeEl = document.getElementById('pick-decorative-time');
    avatarEl = document.getElementById('pick-decorative-avatar');
    hintEl = overlay ? overlay.querySelector('.pick-decorative-hint') : null;
  }

  /**
   * 鏇存柊淇グ灞傜殑绛惧悕鍜屾椂闂达紝绛夊緟鐐瑰嚮
   */
  function showOnDecorative(_overlay, _nameEl, data) {
    initRefs();

    // 濉叆绛惧悕
    if (data.signature) {
      sigEl.textContent = data.signature;
      sigEl.classList.remove('empty');
    } else {
      sigEl.textContent = '';
      sigEl.classList.add('empty');
    }

    // 濉叆涓婃鐐瑰悕鏃堕棿
    if (data.lastPickedTime) {
      var formatted = window.PickerTimestamp
        ? PickerTimestamp.format(data.lastPickedTime)
        : data.lastPickedTime;
      timeEl.textContent = '涓婃鐐瑰悕锛? + (formatted || data.lastPickedTime);
      timeEl.classList.remove('never');
    } else {
      timeEl.textContent = '鉁?鏈鐐硅繃';
      timeEl.classList.add('never');
    }

    // 鍔犺浇澶村儚 鈥斺€?娌℃湁鍒欑敤榛樿 logo
    if (avatarEl && data.name) {
      avatarEl.classList.remove('hidden');
      avatarEl.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%23ccc"/><circle cx="50" cy="40" r="18" fill="%23999"/><ellipse cx="50" cy="82" rx="30" ry="22" fill="%23999"/></svg>';
      avatarEl.style.opacity = '0.5';
      fetch('/api/admin/user-avatar?name=' + encodeURIComponent(data.name))
        .then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function(d) {
          if (d && d.avatar) {
            avatarEl.src = d.avatar;
            avatarEl.style.opacity = '1';
          }
        })
        .catch(function() {});
    }

    // 鎻愮ず淇℃伅
    if (hintEl) hintEl.style.display = '';

    return new Promise(function(resolve) {
      function onClick(e) {
        e.preventDefault();
        e.stopPropagation();
        overlay.removeEventListener('click', onClick);
        overlay.removeEventListener('pointerup', onClick);
        sigEl.textContent = '';
        sigEl.classList.add('empty');
        timeEl.textContent = '';
        if (avatarEl) {
          avatarEl.classList.add('hidden');
          avatarEl.style.opacity = '';
        }
        if (hintEl) hintEl.style.display = 'none';
        resolve();
      }
      overlay.addEventListener('pointerup', onClick);
      overlay.addEventListener('click', onClick);
    });
  }

  window.PickerDisplay = { showOnDecorative: showOnDecorative };
})();
