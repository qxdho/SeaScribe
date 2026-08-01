/* ============================================================
   SeaScribe Admin — Operation Logs Page
   ============================================================ */

(function() {

var _userList = [];   // cached user list for admin filter

function render() {
  var user = Admin.getSession().user;
  var isAdmin = user.role === 'admin';
  var canSeeDebug = isAdmin || user.role === 'teacher';
  var content = document.getElementById("admin-content");
  content.innerHTML =
    '<div class="admin-card">' +
      '<h3>📝 操作日志</h3>' +
      '<p style="color:var(--muted);margin-bottom:16px">' + (isAdmin ? '记录最近 200 条操作' : '以下是你账号最近的操作记录') + '</p>' +
      '<div class="logs-toolbar">' +
        (canSeeDebug ? '<div class="logs-filter">' +
          '<select id="logs-source-filter">' +
            '<option value="normal">正常日志</option>' +
            '<option value="debug">Debug 日志</option>' +
          '</select>' +
        '</div>' : '') +
        (isAdmin ? '<div class="logs-filter">' +
          '<select id="logs-user-filter">' +
            '<option value="">全部用户</option>' +
          '</select>' +
        '</div>' : '') +
        '<div class="logs-filter">' +
          '<select id="logs-action-filter">' +
            '<option value="">全部操作</option>' +
            '<option value="login">登录</option>' +
            '<option value="logout">退出登录</option>' +
            '<option value="session_logout">强制退出</option>' +
            '<option value="profile_update">修改资料</option>' +
            '<option value="password_change">修改密码</option>' +
            (isAdmin ? '<option value="register">注册</option>' +
            '<option value="user_create">创建用户</option>' +
            '<option value="user_modify">修改用户</option>' +
            '<option value="user_delete">删除用户</option>' +
            '<option value="config_save">保存配置</option>' +
            '<option value="roster_save">保存名单</option>' : '') +
            '<option value="avatar_upload">上传头像</option>' +
          '</select>' +
        '</div>' +
        '<button id="logs-refresh" class="admin-btn admin-btn-sm">🔄 刷新</button>' +
      '</div>' +
      '<div id="logs-table-wrap"><p style="color:var(--muted)">加载中…</p></div>' +
    '</div>';

  // Load user list for admin filter
  if (isAdmin) {
    loadUserFilter();
  }
  loadLogs();
}

function loadUserFilter() {
  Admin.api("/api/admin/users").then(function(res) {
    if (!res.ok) return;
    _userList = res.data || [];
    var sel = document.getElementById("logs-user-filter");
    if (!sel) return;
    sel.innerHTML = '<option value="">全部用户</option>' +
      _userList.map(function(u) {
        return '<option value="' + Admin.esc(u.uid) + '">' + Admin.esc(u.displayName || u.nickname || u.username) + '</option>';
      }).join('');
    // 刷新已被 CustomSelect 包装的下拉组件
    if (sel._customSelect) sel._customSelect.refresh();
  });
}

function loadLogs() {
  var actionFilterEl = document.getElementById("logs-action-filter");
  var actionValue = actionFilterEl ? actionFilterEl.value : "";
  var userFilterEl = document.getElementById("logs-user-filter");
  var userValue = userFilterEl ? userFilterEl.value : "";
  var sourceEl = document.getElementById("logs-source-filter");
  var source = sourceEl ? sourceEl.value : "normal";
  var apiPath = source === "debug" ? "/api/admin/logs/debug" : "/api/admin/logs";
  Admin.api(apiPath).then(function(res) {
    var wrap = document.getElementById("logs-table-wrap");
    if (!res.ok) {
      wrap.innerHTML = '<p class="admin-msg warn">加载失败</p>';
      return;
    }
    var logs = res.data || [];
    if (!logs.length) {
      wrap.innerHTML = '<p style="color:var(--muted)">暂无记录</p>';
      return;
    }

    // Apply filters
    if (actionValue) {
      logs = logs.filter(function(l) { return l.action === actionValue; });
    }
    if (userValue) {
      logs = logs.filter(function(l) { return l.uid === userValue; });
    }

    wrap.innerHTML = '<table class="admin-table logs-table">' +
      '<thead><tr><th>时间</th><th>操作</th><th>详情</th><th>IP</th><th>操作人</th></tr></thead>' +
      '<tbody>' +
      logs.slice().reverse().map(function(l) {
        var actionLabel = actionMap(l.action) || l.action;
        return '<tr>' +
          '<td class="logs-time">' + Admin.formatTime(l.timestamp) + '</td>' +
          '<td><span class="logs-action-tag logs-action-' + Admin.esc(l.action) + '">' + Admin.esc(actionLabel) + '</span></td>' +
          '<td>' + Admin.esc(l.detail || "") + '</td>' +
          '<td>' + Admin.esc(l.ip || "") + '</td>' +
          '<td>' + Admin.esc(l.displayName || l.username || "") + '</td>' +
        '</tr>';
      }).join("") +
      '</tbody></table>';
  });
}

function actionMap(action) {
  var map = {
    login: "登录", logout: "退出登录", session_logout: "强制退出",
    profile_update: "修改资料", password_change: "修改密码",
    register: "注册", user_create: "创建用户",
    user_modify: "修改用户", user_delete: "删除用户",
    config_save: "保存配置", roster_save: "保存名单",
    avatar_upload: "上传头像",
  };
  return map[action] || action;
}

// Auto-refresh and filter
(function() {
  document.addEventListener("change", function(e) {
    if (e.target.id === "logs-action-filter" || e.target.id === "logs-user-filter" || e.target.id === "logs-source-filter") loadLogs();
  });
  document.addEventListener("click", function(e) {
    if (e.target.id === "logs-refresh") loadLogs();
  });
})();

PageRegistry.register({
  id: "logs",
  label: "操作日志",
  icon: "📝",
  roles: null,
  render: render,
});

})();
