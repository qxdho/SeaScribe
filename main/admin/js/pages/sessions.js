/* ============================================================
   SeaScribe Admin ? Session Management Page
   ============================================================ */

(function() {

function render() {
  var content = document.getElementById("admin-content");
  content.innerHTML =
    '<div class="admin-card">' +
      '<h3>📱 ??????</h3>' +
      '<p style="color:var(--muted);margin-bottom:16px">???????????????????????????</p>' +
      '<div id="sessions-list"><p style="color:var(--muted)">???...</p></div>' +
    '</div>';
  loadSessions();
}

function loadSessions() {
  Admin.api("/api/admin/sessions").then(function(res) {
    var container = document.getElementById("sessions-list");
    if (!res.ok) {
      container.innerHTML = '<p class="admin-msg warn">????</p>';
      return;
    }
    var sessions = res.data;
    if (!sessions || !sessions.length) {
      container.innerHTML = '<p style="color:var(--muted)">????????</p>';
      return;
    }
    var tokenMap = [];  // tokens stored in JS memory, not DOM
    container.innerHTML = '<div class="session-list">' +
      sessions.map(function(s, i) {
        var currentToken = Admin.getSession().token;
        var isCurrent = currentToken && s.token && s.token.indexOf(currentToken.slice(0, 12)) === 0;
        var ua = s.user_agent || "";
        var deviceName = parseUA(ua) || "????";
        var ip = s.ip || "--";
        var time = formatTime(s.created_at);
        var expires = formatTime(s.expires_at);
        if (!isCurrent) tokenMap[i] = s.token;
        return '<div class="session-item">' +
          '<div class="session-info">' +
            '<div class="session-device">' + Admin.esc(deviceName) + (isCurrent ? ' <span class="session-current-tag">????</span>' : "") + '</div>' +
            '<div class="session-meta"><span>IP: ' + Admin.esc(ip) + '</span> | <span>????: ' + time + '</span> | <span>??: ' + expires + '</span></div>' +
          '</div>' +
          (isCurrent ? "" : '<button class="admin-btn admin-btn-outline admin-btn-sm session-logout-btn" data-idx="' + i + '">????</button>') +
        '</div>';
      }).join("") +
      '</div>';

    container.querySelectorAll(".session-logout-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var idx = parseInt(this.getAttribute("data-idx"));
        var token = tokenMap[idx];
        if (!token) return;
        if (!confirm("????????????")) return;
        Admin.api("/api/admin/sessions", {
          method: "POST",
          body: { token: token },
        }).then(function(res) {
          if (res.ok) {
            Admin.toast("????????", "success");
            loadSessions();
          } else {
            Admin.toast(res.data.error || "????", "error");
          }
        });
      });
    });
  });
}

function parseUA(ua) {
  if (!ua) return "????";
  if (/Linux.*Android/i.test(ua)) return "Android ??";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS ??";
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
  return "????";
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
  label: "????",
  icon: "📱",
  roles: ["admin", "teacher"],
  render: render,
});

})();
