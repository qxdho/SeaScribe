/* ============================================================
   SeaScribe — Picker Display Module
   在修饰动画层上追加签名 + 上次时间，等待用户点击
   ============================================================ */

(function() {

  /**
   * 在修饰层上追加签名和时间信息，等待点击
   * @param {HTMLElement} overlay — #pick-decorative 容器
   * @param {HTMLElement} nameEl — 已有的名字 span
   * @param {Object} data — { name, signature, lastPickedTime }
   * @returns {Promise<void>}
   */
  function showOnDecorative(overlay, nameEl, data) {
    if (!overlay || !nameEl) return Promise.resolve();

    // 名字已经由修饰动画定格显示，这里追加签名和时间
    var sigEl = document.createElement('div');
    sigEl.className = 'pick-decorative-sig';
    if (data.signature) {
      sigEl.textContent = data.signature;
    } else {
      sigEl.classList.add('empty');
    }
    overlay.appendChild(sigEl);

    var timeEl = document.createElement('div');
    timeEl.className = 'pick-decorative-time';
    if (data.lastPickedTime) {
      var formatted = window.PickerTimestamp
        ? PickerTimestamp.format(data.lastPickedTime)
        : data.lastPickedTime;
      timeEl.textContent = '上次点名：' + (formatted || data.lastPickedTime);
    } else {
      timeEl.textContent = '✨ 未被点过';
      timeEl.classList.add('never');
    }
    overlay.appendChild(timeEl);

    var hintEl = document.createElement('div');
    hintEl.className = 'pick-decorative-hint';
    hintEl.textContent = '点击屏幕继续';
    overlay.appendChild(hintEl);

    return new Promise(function(resolve) {
      function onClick(e) {
        e.preventDefault();
        e.stopPropagation();
        overlay.removeEventListener('click', onClick);
        overlay.removeEventListener('pointerup', onClick);
        // 清理追加的元素
        if (sigEl.parentNode) sigEl.parentNode.removeChild(sigEl);
        if (timeEl.parentNode) timeEl.parentNode.removeChild(timeEl);
        if (hintEl.parentNode) hintEl.parentNode.removeChild(hintEl);
        resolve();
      }
      overlay.addEventListener('pointerup', onClick);
      overlay.addEventListener('click', onClick);
    });
  }

  /* ====== 导出 ====== */
  window.PickerDisplay = { showOnDecorative: showOnDecorative };
})();
