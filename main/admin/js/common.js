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
        return { ok: r.ok, status: r.status, data: data };
      }, function() {
        // JSON parse failed (e.g. HTML error page)
        return { ok: false, status: r.status, data: { error: '服务器返回异常' } };
      }).then(function(result) {
        if (r.status === 401) {
          clearSession();
          location.href = '/admin/';
        }
        return result;
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

  /** 时间格式化 YYYY-MM-DD HH:mm（admin 各页统一使用；秒级时间戳自动转毫秒） */
  function formatTime(ts) {
    if (!ts) return '--';
    var d = (typeof ts === 'number' && ts > 1e9) ? new Date(ts * 1000) : new Date(ts);
    if (isNaN(d.getTime())) return ts;
    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /** 头像 HTML：无头像显示灰色占位，URL 显示 img，其余按文本（各页统一使用） */
  function avatarHTML(user, cls) {
    var a = user && user.avatar ? user.avatar : '';
    cls = cls || 'admin-avatar';
    if (!a) return '<img src="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2250%22 fill=%22%23ccc%22/><circle cx=%2250%22 cy=%2240%22 r=%2218%22 fill=%22%23999%22/><ellipse cx=%2250%22 cy=%2282%22 rx=%2230%22 ry=%2222%22 fill=%22%23999%22/></svg>" class="' + cls + '" style="opacity:0.6">';
    if (/^https?:\/\//.test(a) || a.charAt(0) === '/') return '<img src="' + esc(a) + '" class="' + cls + '" onerror="this.outerHTML=\'<span>👤</span>\'">';
    return '<span style="font-size:1.3rem">' + esc(a) + '</span>';
  }

  /** Switch theme (light ↔ dark) and sync all toggle buttons */
  function toggleTheme() {
    var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('#btn-theme, #btn-theme-login, #btn-theme-bind').forEach(function(b) {
      b.textContent = t === 'dark' ? '☀️' : '🌙';
    });
    localStorage.setItem('seascribe_theme', t);
  }

  window.Admin = {
    saveSession: saveSession,
    getSession: getSession,
    clearSession: clearSession,
    api: api,
    esc: esc,
    formatTime: formatTime,
    avatarHTML: avatarHTML,
    toast: toast,
    toggleTheme: toggleTheme,
  };

  function toast(msg, type) {
    type = type || 'info';
    var area = document.getElementById('admin-toast-area');
    if (!area) return;
    var isWarn = type === 'error';
    var cssClass = isWarn ? 'warn' : 'normal';
    var icon = isWarn ? '⚠️ ' : '';
    var el = document.createElement('div');
    el.className = 'admin-toast admin-toast-' + cssClass;
    el.innerHTML = icon + Admin.esc(msg) + '<button class="admin-toast-close" title="关闭">✕</button>';
    el.querySelector('.admin-toast-close').addEventListener('click', function() { removeToast(el); });
    area.appendChild(el);
    setTimeout(function() { removeToast(el); }, isWarn ? 5000 : 3000);
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
