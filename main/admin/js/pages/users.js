/* ============================================================
   SeaScribe Admin — Users Management Page (admin only)
   ============================================================ */

(function() {

var _allUsers = [];
var _classMap = {};   // displayName -> className
var _sortKey = '';
var _sortDir = 1;  // 1=asc, -1=desc

function render() {
  var content = document.getElementById('admin-content');
  content.innerHTML =
    '<div class="admin-card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<h3 style="margin:0">👥 用户管理</h3>' +
        '<button id="users-add-btn" class="admin-btn admin-btn-primary admin-btn-sm">+ 新建用户</button>' +
      '</div>' +
      '<div id="users-filter-bar" style="display:flex;gap:8px;margin-bottom:14px;align-items:center">' +
        '<input type="text" id="users-filter-search" placeholder="🔍 搜索用户名/姓名/昵称…" style="flex:1;min-width:0;padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:0.85rem;background:var(--surface);color:var(--text)">' +
        '<div id="users-filter-extra" style="display:flex;gap:6px;flex-shrink:0;max-width:220px;opacity:1;transition:max-width 0.3s var(--ease),opacity 0.2s">' +
          '<select id="users-filter-role" class="filter-select" style="width:90px">' +
            '<option value="">全部角色</option>' +
            '<option value="admin">管理员</option>' +
            '<option value="teacher">教师</option>' +
            '<option value="student">学生</option>' +
          '</select>' +
          '<select id="users-filter-class" class="filter-select" style="width:100px">' +
            '<option value="">全部班级</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div id="users-table-wrap"></div>' +
    '</div>' +
    '<div id="users-form-card" class="admin-card hidden"></div>';

  document.getElementById('users-add-btn').addEventListener('click', function() {
    renderForm(null);
  });

  // Filter listeners
  document.getElementById('users-filter-search').addEventListener('input', applyFilter);
  document.getElementById('users-filter-role').addEventListener('change', applyFilter);
  document.getElementById('users-filter-class').addEventListener('change', applyFilter);

  // 筛选展开/收起：聚焦或选择时展开，失焦且无激活项时收起
  var filterBar = document.getElementById('users-filter-bar');
  var filterExtra = document.getElementById('users-filter-extra');
  var filterSearch = document.getElementById('users-filter-search');
  var filterRole = document.getElementById('users-filter-role');
  var filterClass = document.getElementById('users-filter-class');

  function hideFilters() {
    filterExtra.querySelectorAll('.cs-wrap.open').forEach(function(w) { if (w._cs) w._cs.close(); });
    filterExtra.style.maxWidth = '0';
    filterExtra.style.opacity = '0';
  }
  function showFilters() {
    if (!filterSearch.value.trim()) {
      filterExtra.style.maxWidth = '220px';
      filterExtra.style.opacity = '1';
    }
  }

  filterSearch.addEventListener('focus', hideFilters);
  filterBar.addEventListener('focusout', function() {
    setTimeout(function() {
      if (!filterBar.contains(document.activeElement)) showFilters();
    }, 200);
  });
  filterRole.addEventListener('change', function() { if (this.value) showFilters(); });
  filterClass.addEventListener('change', function() { if (this.value) showFilters(); });

  loadData();
}

async function loadData() {
  // Load roster for class mapping, then load users
  var rosterRes = await Admin.api('/api/admin/roster');
  _classMap = {};
  if (rosterRes.ok) {
    var roster = rosterRes.data;
    for (var cls in roster) {
      var students = roster[cls];
      students.forEach(function(s) {
        _classMap[s.name] = cls;
      });
    }
    // Populate class filter
    var classSelect = document.getElementById('users-filter-class');
    if (classSelect) {
      var classes = Object.keys(roster).sort();
      classSelect.innerHTML = '<option value="">全部班级</option>';
      classes.forEach(function(c) {
        classSelect.appendChild(new Option(c, c));
      });
      if (classSelect._customSelect) classSelect._customSelect.refresh();
    }
  }

  var res = await Admin.api('/api/admin/users');
  if (!res.ok) return;
  _allUsers = res.data;
  applyFilter();
}

function applyFilter() {
  var searchEl = document.getElementById('users-filter-search');
  var roleEl = document.getElementById('users-filter-role');
  var classEl = document.getElementById('users-filter-class');
  var search = (searchEl ? searchEl.value.trim().toLowerCase() : '');
  var role = roleEl ? roleEl.value : '';
  var cls = classEl ? classEl.value : '';

  var filtered = _allUsers.filter(function(u) {
    if (role && u.role !== role) return false;
    if (cls) {
      var uc = _classMap[u.displayName] || '';
      if (uc !== cls) return false;
    }
    if (search) {
      var hay = (u.username + ' ' + (u.displayName || '') + ' ' + (u.nickname || '')).toLowerCase();
      if (hay.indexOf(search) === -1) return false;
    }
    return true;
  });

  if (_sortKey) {
    filtered.sort(function(a, b) {
      if (_sortKey === 'class') {
        var va = (_classMap[a.displayName] || '').toLowerCase();
        var vb = (_classMap[b.displayName] || '').toLowerCase();
      } else {
        var va = (a[_sortKey] || '').toString().toLowerCase();
        var vb = (b[_sortKey] || '').toString().toLowerCase();
      }
      return va < vb ? -_sortDir : va > vb ? _sortDir : 0;
    });
  }
  renderTable(filtered);
}

function sortIndicator(key) {
  if (_sortKey !== key) return '';
  return ' <span style="font-size:0.7em">' + (_sortDir === 1 ? '▲' : '▼') + '</span>';
}

function renderTable(users) {
  var th = function(key, label) {
    return '<th style="cursor:pointer;user-select:none" data-sort="' + key + '">' + label + sortIndicator(key) + '</th>';
  };
  var html = '<table class="admin-table"><thead><tr><th>#</th><th>头像</th>' + th('username','用户名') + th('displayName','姓名') + th('nickname','昵称') + th('class','班级') + th('role','角色') + '<th style="white-space:nowrap">操作</th></tr></thead><tbody>';
  if (!users.length) {
    html += '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">无匹配用户</td></tr>';
  } else {
    users.forEach(function(u, i) {
      html += '<tr>' +
        '<td style="width:32px;color:var(--muted);font-size:0.82rem">' + (i + 1) + '</td>' +
        '<td style="width:40px">' + Admin.avatarHTML(u) + '</td>' +
        '<td style="white-space:nowrap"><code>' + Admin.esc(u.username) + '</code></td>' +
        '<td style="white-space:nowrap">' + Admin.esc(u.displayName || '—') + '</td>' +
        '<td>' + Admin.esc(u.nickname || '—') + '</td>' +
        '<td style="white-space:nowrap">' + Admin.esc(_classMap[u.displayName] || '—') + '</td>' +
        '<td>' + roleBadge(u.role) + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button class="admin-btn admin-btn-outline admin-btn-sm" data-edit="' + u.username + '">编辑</button> ' +
          '<button class="admin-btn admin-btn-danger admin-btn-sm" data-del="' + u.username + '">删除</button>' +
        '</td>' +
      '</tr>';
    });
  }
  html += '</tbody></table>';
  document.getElementById('users-table-wrap').innerHTML = html;

  // 绑定排序
  document.querySelectorAll('#users-table-wrap th[data-sort]').forEach(function(th) {
    th.addEventListener('click', function() {
      var key = this.dataset.sort;
      if (_sortKey === key) {
        _sortDir = -_sortDir;
      } else {
        _sortKey = key;
        _sortDir = 1;
      }
      applyFilter();
    });
  });

  document.querySelectorAll('[data-edit]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      renderForm(this.dataset.edit);
    });
  });
  document.querySelectorAll('[data-del]').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var name = this.dataset.del;
      if (!confirm('确定删除用户「' + name + '」吗？此操作不可撤销。')) return;
      var res = await Admin.api('/api/admin/users/' + encodeURIComponent(name) + '/delete', { method: 'POST' });
      if (res.ok) loadData();
      else Admin.toast(res.data.error || '删除失败');
    });
  });
}

function roleBadge(role) {
  var labels = { admin: '管理员', teacher: '教师', student: '学生' };
  return '<span style="font-size:0.78rem;font-weight:600;color:var(--text)">' + (labels[role] || role) + '</span>';
}

function renderForm(username) {
  var isEdit = !!username;
  var card = document.getElementById('users-form-card');
  card.classList.remove('hidden');
  card.innerHTML =
    '<h3>' + (isEdit ? '编辑用户 ' + Admin.esc(username) : '新建用户') + '</h3>' +
    '<p style="color:var(--muted);font-size:0.72rem;font-weight:600;margin:8px 0 4px">账号信息</p>' +
    (isEdit ? '<div class="admin-form-group">' +
      '<label for="uform-uid">用户 ID</label>' +
      '<input type="text" id="uform-uid" disabled>' +
    '</div>' : '') +
    '<div class="admin-form-group">' +
      '<label for="uform-username">用户名（英文）</label>' +
      '<input type="text" id="uform-username" name="username" autocomplete="username" ' + (isEdit ? 'disabled' : '') + ' placeholder="用户名">' +
    '</div>' +
    '<div class="admin-form-group">' +
      '<label for="uform-role">角色</label>' +
      '<select id="uform-role" name="role"' + (isEdit && username === Admin.getSession().user.username ? ' disabled' : '') + '>' +
        '<option value="student">学生</option>' +
        '<option value="teacher">教师</option>' +
        '<option value="admin">管理员</option>' +
      '</select>' +
    '</div>' +
    '<p style="color:var(--muted);font-size:0.72rem;font-weight:600;margin:16px 0 4px">个人信息</p>' +
    '<div class="admin-form-group" id="uform-dn-group">' +
      '<label for="uform-displayname">姓名（绑定点名名单）</label>' +
      '<select id="uform-displayname" name="displayname" style="width:100%">' +
        '<option value="">加载中…</option>' +
      '</select>' +
    '</div>' +
    '<div class="admin-form-group">' +
      '<label for="uform-nickname">昵称</label>' +
      '<input type="text" id="uform-nickname" name="nickname" placeholder="给自己起个名字">' +
    '</div>' +
    '<p style="color:var(--muted);font-size:0.72rem;font-weight:600;margin:16px 0 4px">安全</p>' +
    '<div class="admin-form-group">' +
      '<label for="uform-password">密码' + (isEdit ? '（留空不修改）' : '') + '</label>' +
      '<input type="password" id="uform-password" name="password" placeholder="' + (isEdit ? '留空不修改' : '至少6位') + '" autocomplete="new-password">' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:16px">' +
      '<button id="uform-save" class="admin-btn admin-btn-primary admin-btn-sm">保存</button>' +
      '<button id="uform-cancel" class="admin-btn admin-btn-ghost admin-btn-sm">取消</button>' +
    '</div>';

  window.CustomSelect.initAll(card);

  document.getElementById('uform-cancel').addEventListener('click', function() {
    card.classList.add('hidden');
  });

  var roleSel = document.getElementById('uform-role');
  function toggleDN() {
    document.getElementById('uform-dn-group').style.display = roleSel.value === 'student' ? '' : 'none';
  }
  roleSel.addEventListener('change', toggleDN);
  toggleDN();

  // 从姓名池加载可选姓名
  if (isEdit) {
    Admin.api('/api/admin/users/' + username).then(function(res) {
      if (res.ok) {
        document.getElementById('uform-username').value = res.data.username;
        document.getElementById('uform-uid').value = res.data.uid || '—';
        document.getElementById('uform-nickname').value = res.data.nickname || '';
        document.getElementById('uform-role').value = res.data.role || 'student';
        toggleDN();
        fetchDisplayNames(res.data.displayName || '');
      }
    });
    document.getElementById('uform-save').addEventListener('click', async function() {
      var body = {
        displayName: document.getElementById('uform-displayname').value.trim(),
        nickname: document.getElementById('uform-nickname').value.trim(),
        role: document.getElementById('uform-role').value,
      };
      var pw = document.getElementById('uform-password').value.trim();
      if (pw) body.password = pw;
      var res = await Admin.api('/api/admin/users/' + username, { method: 'POST', body: body });
      if (res.ok) { card.classList.add('hidden'); loadData(); }
      else Admin.toast(res.data.error || '保存失败');
    });
  } else {
    fetchDisplayNames();
    document.getElementById('uform-save').addEventListener('click', async function() {
      var body = {
        username: document.getElementById('uform-username').value.trim(),
        displayName: document.getElementById('uform-displayname').value.trim(),
        nickname: document.getElementById('uform-nickname').value.trim(),
        role: document.getElementById('uform-role').value,
      };
      var pw = document.getElementById('uform-password').value.trim();
      if (pw) body.password = pw;
      var res = await Admin.api('/api/admin/users', { method: 'POST', body: body });
      if (res.ok) { card.classList.add('hidden'); loadData(); }
      else Admin.toast(res.data.error || '保存失败');
    });
  }
}

async function fetchDisplayNames(thenSelect) {
  var sel = document.getElementById('uform-displayname');
  if (!sel) return;
  try {
    var res = await fetch('/api/roster/classes');
    var classes = await res.json();
    var names = new Set();
    for (var i = 0; i < classes.length; i++) {
      var r = await fetch('/api/roster/' + encodeURIComponent(classes[i]));
      var students = await r.json();
      students.forEach(function(s) { if (s.name) names.add(s.name); });
    }
    var sorted = Array.from(names).sort();
    sel.innerHTML = '<option value="">— 不绑定 —</option>' +
      sorted.map(function(n) { return '<option value="' + Admin.esc(n) + '">' + Admin.esc(n) + '</option>'; }).join('');
    if (thenSelect) {
      sel.value = thenSelect;
    }
    if (sel._customSelect) sel._customSelect.refresh();
  } catch(e) { sel.innerHTML = '<option value="">加载失败</option>'; if (sel._customSelect) sel._customSelect.refresh(); }
}

PageRegistry.register({
  id: 'users',
  label: '用户管理',
  icon: '👥',
  roles: ['admin'],
  render: render,
});

})();
