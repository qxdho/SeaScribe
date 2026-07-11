/* ============================================================
   SeaScribe Admin — Common Utilities
   ============================================================ */

(function() {
  var STORE_KEY = 'seascribe_admin';

  /** 保存 session 到 localStorage */
  function saveSession(token, user) {
    localStorage.setItem(STORE_KEY, JSON.stringify({ token: token, user: user }));
  }

  /** 读取 session */
  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    } catch(e) { return null; }
  }

  /** 清除 session */
  function clearSession() {
    localStorage.removeItem(STORE_KEY);
  }

  /** 带 auth 的 fetch 封装 */
  function api(url, options) {
    options = options || {};
    var headers = options.headers || {};
    var sess = getSession();
    if (sess && sess.token) {
      headers['Authorization'] = 'Bearer ' + sess.token;
    }
    if (options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    options.headers = headers;
    return fetch(url, options).then(function(r) {
      return r.json().then(function(data) {
        if (r.status === 401) {
          clearSession();
          location.reload();
        }
        return { ok: r.ok, status: r.status, data: data };
      });
    }).catch(function() {
      return { ok: false, status: 0, data: { error: '网络错误' } };
    });
  }

  /** HTML 转义 */
  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  window.Admin = {
    saveSession: saveSession,
    getSession: getSession,
    clearSession: clearSession,
    api: api,
    esc: esc,
  };
})();
