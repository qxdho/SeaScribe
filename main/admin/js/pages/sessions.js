/* ============================================================
   SeaScribe Admin — Session Management Page
   ============================================================ */

(function() {

function render() {
  var content = document.getElementById("admin-content");
  content.innerHTML =
    '<div class="admin-card">' +
      '<h3>📱 设备管理</h3>' +
      '<p style="color:var(--muted);margin-bottom:16px">以下是您账号的所有活跃会话，可强制退出非当前设备</p>' +
      '<div id="sessions-list"><p style="color:var(--muted)">加载中…</p></div>' +
    '</div>';
  loadSessions();
}

function loadSessions() {
  Admin.api("/api/admin/sessions").then(function(res) {
    var container = document.getElementById("sessions-list");
    if (!res.ok) {
      container.innerHTML = '<p class="admin-msg warn">加载失败</p>';
      return;
    }
    var sessions = res.data;
    if (!sessions || !sessions.length) {
      container.innerHTML = '<p style="color:var(--muted)">暂无活跃会话</p>';
      return;
    }
    var tokenMap = [];  // tokens stored in JS memory, not DOM
    container.innerHTML = '<div class="session-list">' +
      sessions.map(function(s, i) {
        var currentToken = Admin.getSession().token;
        var isCurrent = currentToken && s.token && s.token.indexOf(currentToken.slice(0, 12)) === 0;
        var ua = s.user_agent || "";
        var deviceName = parseUA(ua) || "未知设备";
        var ip = s.ip || "--";
        var time = formatTime(s.created_at);
        var expires = formatTime(s.expires_at);
        if (!isCurrent) tokenMap[i] = s.token;
        return '<div class="session-item">' +
          '<div class="session-info">' +
            '<div class="session-device">' + Admin.esc(deviceName) + (isCurrent ? ' <span class="session-current-tag">当前</span>' : "") + '</div>' +
            '<div class="session-meta"><span>IP: ' + Admin.esc(ip) + '</span> | <span>登录: ' + time + '</span> | <span>过期: ' + expires + '</span></div>' +
          '</div>' +
          (isCurrent ? "" : '<button class="admin-btn admin-btn-outline admin-btn-sm session-logout-btn" data-idx="' + i + '">退出</button>') +
        '</div>';
      }).join("") +
      '</div>';

    container.querySelectorAll(".session-logout-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var idx = parseInt(this.getAttribute("data-idx"));
        var token = tokenMap[idx];
        if (!token) return;
        if (!confirm("确定要强制退出该设备吗？")) return;
        Admin.api("/api/admin/sessions", {
          method: "POST",
          body: { token: token },
        }).then(function(res) {
          if (res.ok) {
            Admin.toast("已退出该设备", "success");
            loadSessions();
          } else {
            Admin.toast(res.data.error || "操作失败", "error");
          }
        });
      });
    });
  });
}

function parseUA(ua) {
  if (!ua) return "未知设备";
  if (/Linux.*Android/i.test(ua)) return "Android 设备";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS 设备";
  if (/Windows/i.test(ua)) {
    if (/Edg/i.test(ua)) return "Windows (Edge)";
    if (/Chrome/i.test(ua)) return "Windows (Chrome)";
    if (/Firefox/i.test(ua)) return "Windows (Firefox)";
    return "Windows";
  }
  if (/Mac/i.test(ua)) {
    if (/Chrome/i.test(ua)) return "macOS (Chrome)";
    if (/Safari/i.test(ua)) return "macOS (Safari)";
    return "macOS";
  }
  if (/Linux/i.test(ua)) return "Linux";
  return "未知设备";
}

function formatTime(ts) {
  if (!ts) return "--";
  var d = (typeof ts === "number" && ts > 1e9) ? new Date(ts * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return ts;
  var pad = function(n) { return n < 10 ? "0" + n : "" + n; };
  return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

PageRegistry.register({
  id: "sessions",
  label: "设备管理",
  icon: "📱",
  roles: null,
  render: render,
});

})();
