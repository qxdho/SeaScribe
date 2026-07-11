/* ============================================================
   SeaScribe — Picker Display Module
   纯展示：接收 {name, signature, lastPickedTime}
   全屏渲染 → 等待用户点击屏幕 → resolve
   ============================================================ */

(function() {
  var displayEl, displayName, displaySig, displayTime;

  function initRefs() {
    displayEl = document.getElementById('pick-display');
    displayName = document.getElementById('pick-display-name');
    displaySig = document.getElementById('pick-display-sig');
    displayTime = document.getElementById('pick-display-time');
  }

  /**
   * 全屏显示点名结果，等待用户点击
   * @param {Object} data — { name, signature, lastPickedTime }
   * @returns {Promise<void>} 用户点击后 resolve
   */
  function show(data) {
    initRefs();

    if (!displayEl) {
      console.warn('[PickerDisplay] DOM 未就绪');
      return Promise.resolve();
    }

    displayEl.classList.remove('hidden');

    // 渲染姓名
    displayName.textContent = data.name || '';

    // 渲染个性签名
    displaySig.textContent = data.signature || '';
    if (data.signature) {
      displaySig.classList.remove('empty');
    } else {
      displaySig.classList.add('empty');
    }

    // 渲染上次点名时间
    if (data.lastPickedTime) {
      var formatted = window.PickerTimestamp
        ? PickerTimestamp.format(data.lastPickedTime)
        : data.lastPickedTime;
      displayTime.textContent = '上次点名：' + (formatted || data.lastPickedTime);
      displayTime.classList.remove('never');
    } else {
      displayTime.textContent = '✨ 未被点过';
      displayTime.classList.add('never');
    }

    return new Promise(function(resolve) {
      function onClick(e) {
        // 阻止事件冒泡和默认行为
        e.preventDefault();
        e.stopPropagation();
        displayEl.removeEventListener('click', onClick);
        displayEl.removeEventListener('pointerup', onClick);
        displayEl.classList.add('hidden');
        resolve();
      }

      // 使用 pointerup 在现代设备上更可靠
      displayEl.addEventListener('pointerup', onClick, { once: false });
      // click 作为 fallback
      displayEl.addEventListener('click', onClick, { once: false });
    });
  }

  /* ====== 导出 ====== */
  window.PickerDisplay = { show: show };
})();
