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
    options.credentials = 'same-origin';
    return fetch(url, options).then(function(r) {
      return r.json().then(function(data) {
        if (r.status === 401) {
          clearSession();
          location.href = '/admin/';
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

  /** Switch theme (light ↔ dark) and sync all toggle buttons */
  function toggleTheme() {
    var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('#btn-theme, #btn-theme-login, #btn-theme-bind').forEach(function(b) {
      b.textContent = t === 'dark' ? '☀️' : '🌙';
    });
    localStorage.setItem('seascribe_admin_theme', t);
  }

  window.Admin = {
    saveSession: saveSession,
    getSession: getSession,
    clearSession: clearSession,
    api: api,
    esc: esc,
    toast: toast,
    toggleTheme: toggleTheme,
  };

  function toast(msg, type) {
    type = type || 'info';
    var area = document.getElementById('admin-toast-area');
    if (!area) return;
    var el = document.createElement('div');
    el.className = 'admin-toast admin-toast-' + type;
    el.innerHTML = Admin.esc(msg) + '<button class="admin-toast-close" title="关闭">✕</button>';
    el.querySelector('.admin-toast-close').addEventListener('click', function() { removeToast(el); });
    area.appendChild(el);
    setTimeout(function() { removeToast(el); }, 3000);
  }

  function removeToast(el) {
    if (!el || !el.parentNode) return;
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'opacity 0.2s, transform 0.2s';
    setTimeout(function() {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 200);
  }

  // Theme toggle — init and bind
  (function() {
    var themeBtns = document.querySelectorAll('#btn-theme, #btn-theme-login, #btn-theme-bind');
    if (!themeBtns.length) return;
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    themeBtns.forEach(function(btn) {
      btn.textContent = current === 'dark' ? '☀️' : '🌙';
      btn.addEventListener('click', Admin.toggleTheme);
    });
  })();
})();
