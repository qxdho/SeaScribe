/* ============================================================
   SeaScribe — Picker Display Module
   在修饰层占位元素中填入签名 + 上次时间，等待用户点击
   ============================================================ */

(function() {

  var sigEl, timeEl, hintEl, overlay;

  function initRefs() {
    overlay = document.getElementById('pick-decorative');
    sigEl = document.getElementById('pick-decorative-sig');
    timeEl = document.getElementById('pick-decorative-time');
    hintEl = overlay ? overlay.querySelector('.pick-decorative-hint') : null;
  }

  /**
   * 更新修饰层的签名和时间，等待点击
   * @param {HTMLElement} _overlay — 未使用（保留接口兼容）
   * @param {HTMLElement} _nameEl — 未使用
   * @param {Object} data — { name, signature, lastPickedTime }
   * @returns {Promise<void>}
   */
  function showOnDecorative(_overlay, _nameEl, data) {
    initRefs();
    if (!overlay) return Promise.resolve();

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

    // 显示提示
    if (hintEl) hintEl.style.display = '';

    return new Promise(function(resolve) {
      function onClick(e) {
        e.preventDefault();
        e.stopPropagation();
        overlay.removeEventListener('click', onClick);
        overlay.removeEventListener('pointerup', onClick);
        // 清理内容
        sigEl.textContent = '';
        sigEl.classList.add('empty');
        timeEl.textContent = '';
        if (hintEl) hintEl.style.display = 'none';
        resolve();
      }
      overlay.addEventListener('pointerup', onClick);
      overlay.addEventListener('click', onClick);
    });
  }

  /* ====== 导出 ====== */
  window.PickerDisplay = { showOnDecorative: showOnDecorative };
})();
