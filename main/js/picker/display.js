/* ============================================================
   SeaScribe — Picker Display Module
   在修饰层占位元素中填入签名 + 上次时间，等待用户点击
   ============================================================ */

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
   * 更新修饰层的签名和时间，等待点击
   */
  function showOnDecorative(_overlay, _nameEl, data) {
    initRefs();

    // 填入签名
    if (data.signature) {
      sigEl.textContent = data.signature;
      sigEl.classList.remove('empty');
    } else {
      sigEl.textContent = '';
      sigEl.classList.add('empty');
    }

    // 填入上次点名时间
    if (data.lastPickedTime) {
      var formatted = window.PickerTimestamp
        ? PickerTimestamp.format(data.lastPickedTime)
        : data.lastPickedTime;
      timeEl.textContent = '上次点名：' + (formatted || data.lastPickedTime);
      timeEl.classList.remove('never');
    } else {
      timeEl.textContent = '✨ 未被点过';
      timeEl.classList.add('never');
    }

    // 加载头像
    if (avatarEl && data.name) {
      avatarEl.classList.add('hidden');
      avatarEl.src = '';
      fetch('/api/admin/user-avatar?name=' + encodeURIComponent(data.name))
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.avatar) {
            avatarEl.src = d.avatar;
            avatarEl.classList.remove('hidden');
          }
        })
        .catch(function() {});
    }

    // 显示提示
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
        if (avatarEl) { avatarEl.src = ''; avatarEl.classList.add('hidden'); }
        if (hintEl) hintEl.style.display = 'none';
        resolve();
      }
      overlay.addEventListener('pointerup', onClick);
      overlay.addEventListener('click', onClick);
    });
  }

  window.PickerDisplay = { showOnDecorative: showOnDecorative };
})();
