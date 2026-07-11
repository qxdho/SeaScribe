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
    console.log('[PickerDisplay] DOM检查: overlay=' + !!overlay +
      ' sigEl=' + !!sigEl + ' timeEl=' + !!timeEl + ' hintEl=' + !!hintEl);
  }

  /**
   * 更新修饰层的签名和时间，等待点击
   */
  function showOnDecorative(_overlay, _nameEl, data) {
    initRefs();
    if (!overlay) { console.error('[PickerDisplay] overlay 不存在!'); return Promise.resolve(); }

    console.log('[PickerDisplay] 收到数据:', JSON.stringify(data));

    // 填入签名
    if (data.signature) {
      sigEl.textContent = data.signature;
      sigEl.classList.remove('empty');
      console.log('[PickerDisplay] 签名已设置: "' + data.signature + '" empty类=' + sigEl.classList.contains('empty'));
    } else {
      sigEl.textContent = '';
      sigEl.classList.add('empty');
      console.log('[PickerDisplay] 无签名, empty类已添加');
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

  window.PickerDisplay = { showOnDecorative: showOnDecorative };
})();
