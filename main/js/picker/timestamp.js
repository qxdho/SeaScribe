/* ============================================================
   SeaScribe — Picker Timestamp Module
   服务端时间戳读写 + 开关控制
   ============================================================ */

(function() {
  var cfg = window.__PICKER_CONFIG__ || {};

  /**
   * 从服务端读取班级时间戳
   * @param {string} listName — 如 "11班.csv"
   * @returns {Promise<Object>} — { "张三": "2024-06-15T10:30:00", ... }
   */
  async function load(listName) {
    try {
      var r = await fetch('/api/picker-timestamps?list=' + encodeURIComponent(listName));
      if (!r.ok) return {};
      return await r.json();
    } catch (e) {
      console.warn('[PickerTimestamp] 读取时间戳失败:', e);
      return {};
    }
  }

  /**
   * 保存时间戳到服务端（仅记录当前这个人）
   * @param {string} listName — 如 "11班.csv"
   * @param {Object} person — { name, signature }
   */
  async function save(listName, person) {
    if (!isEnabled()) return;

    // 先读取现有时间戳，再更新当前人
    var timestamps = await load(listName);
    timestamps[person.name] = new Date().toISOString();

    try {
      await fetch('/api/picker-timestamps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list: listName, data: timestamps }),
      });
    } catch (e) {
      console.warn('[PickerTimestamp] 保存时间戳失败:', e);
    }
  }

  /**
   * 清空某个班级的全部时间戳
   * @param {string} listName — 如 "11班.csv"
   */
  async function clear(listName) {
    try {
      await fetch('/api/picker-timestamps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list: listName, data: {} }),
      });
    } catch (e) {
      console.warn('[PickerTimestamp] 清空时间戳失败:', e);
    }
  }

  /** 时间戳记录是否开启 */
  function isEnabled() {
    return cfg.timestampEnabled !== false;
  }

  /**
   * 格式化时间戳为可读字符串
   * @param {string|null} isoStr
   * @returns {string|null}
   */
  function format(isoStr) {
    if (!isoStr) return null;
    var d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' +
      pad(d.getMonth() + 1) + '-' +
      pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' +
      pad(d.getMinutes());
  }

  /* ====== 导出 ====== */
  window.PickerTimestamp = {
    load: load,
    save: save,
    clear: clear,
    isEnabled: isEnabled,
    format: format,
  };
})();
