/* ============================================================
   SeaScribe — Modal Helper
   为弹窗绑定标准关闭行为：右上角 ✕ + 点击遮罩关闭
   ============================================================ */

(function() {
  /**
   * 为指定弹窗绑定关闭事件
   * @param {string} overlayId  - 遮罩元素 ID
   * @param {string} closeXId   - 右上角 ✕ 按钮 ID
   *   弹窗 CSS 要求：
   *     .xxx-overlay        — position:fixed; opacity 过渡
   *     .xxx-overlay.hidden — opacity:0; pointer-events:none
   */
  window.SeaScribe.bindModal = function(overlayId, closeXId) {
    var overlay = document.getElementById(overlayId);
    var closeX  = document.getElementById(closeXId);

    function close() { overlay.classList.add('hidden'); }

    if (closeX) closeX.addEventListener('click', close);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) close();
    });
  };
})();
