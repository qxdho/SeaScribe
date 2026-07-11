/* ============================================================
   SeaScribe Admin — Users Management (admin only)
   ============================================================ */

(function() {

  window.AdminUsers = {
    render: render,
  };

  function render() {
    var content = document.getElementById('admin-content');
    content.innerHTML =
      '<div class="admin-card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
          '<h3 style="margin:0">👥 用户管理</h3>' +
          '<button id="users-add-btn" class="admin-btn admin-btn-primary admin-btn-sm">+ 新建用户</button>' +
        '</div>' +
        '<div id="users-table-wrap"></div>' +
      '</div>' +
      '<div id="users-form-card" class="admin-card hidden"></div>';

    document.getElementById('users-add-btn').addEventListener('click', function() {
      renderForm(null);
    });

    loadUsers();
  }

  async function loadUsers() {
    var res = await Admin.api('/api/admin/users');
    if (!res.ok) return;
    var users = res.data;
    var html = '<table class="admin-table"><thead><tr><th>头像</th><th>用户名</th><th>昵称</th><th>角色</th><th>操作</th></tr></thead><tbody>';
    users.forEach(function(u) {
      html += '<tr>' +
        '<td>' + avatarCell(u) + '</td>' +
        '<td><code>' + Admin.esc(u.username) + '</code></td>' +
        '<td>' + Admin.esc(u.nickname || '—') + '</td>' +
        '<td>' + roleBadge(u.role) + '</td>' +
        '<td>' +
          '<button class="admin-btn admin-btn-outline admin-btn-sm" data-edit="' + u.username + '">编辑</button> ' +
          '<button class="admin-btn admin-btn-danger admin-btn-sm" data-del="' + u.username + '">删除</button>' +
        '</td>' +
      '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('users-table-wrap').innerHTML = html;

    // bind edit/delete
    document.querySelectorAll('[data-edit]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        renderForm(this.dataset.edit);
      });
    });
    document.querySelectorAll('[data-del]').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var name = this.dataset.del;
        if (!confirm('确定删除用户「' + name + '」吗？此操作不可撤销。')) return;
        var res = await Admin.api('/api/admin/users/' + name + '/delete', { method: 'POST' });
        if (res.ok) loadUsers();
        else alert(res.data.error || '删除失败');
      });
    });
  }

  function avatarCell(u) {
    var a = u.avatar || '';
    if (!a) return '<span style="opacity:0.3">—</span>';
    if (/^https?:\/\//.test(a)) return '<img src="' + Admin.esc(a) + '" class="admin-avatar">';
    return '<span style="font-size:1.3rem">' + Admin.esc(a) + '</span>';
  }

  function roleBadge(role) {
    var labels = { admin: '管理员', teacher: '教师', student: '学生' };
    return '<span style="font-size:0.78rem;font-weight:600;color:var(--admin-accent)">' + (labels[role] || role) + '</span>';
  }

  function renderForm(username) {
    var isEdit = !!username;
    var card = document.getElementById('users-form-card');
    card.classList.remove('hidden');
    card.innerHTML =
      '<h3>' + (isEdit ? '编辑用户 ' + Admin.esc(username) : '新建用户') + '</h3>' +
      '<div class="admin-form-group">' +
        '<label>用户名（英文）</label>' +
        '<input type="text" id="uform-username" ' + (isEdit ? 'disabled' : '') + ' placeholder="用户名">' +
      '</div>' +
      '<div class="admin-form-group">' +
        '<label>昵称（中文/日文）</label>' +
        '<input type="text" id="uform-nickname" placeholder="显示名称">' +
      '</div>' +
      '<div class="admin-form-group">' +
        '<label>头像（emoji 或图片 URL）</label>' +
        '<input type="text" id="uform-avatar" placeholder="emoji 或图片地址">' +
      '</div>' +
      '<div class="admin-form-row">' +
        '<div class="admin-form-group">' +
          '<label>角色</label>' +
          '<select id="uform-role">' +
            '<option value="student">学生</option>' +
            '<option value="teacher">教师</option>' +
            '<option value="admin">管理员</option>' +
          '</select>' +
        '</div>' +
        '<div class="admin-form-group">' +
          '<label>密码' + (isEdit ? '（留空不修改）' : '') + '</label>' +
          '<input type="text" id="uform-password" placeholder="' + (isEdit ? '留空不修改' : '默认 123456') + '">' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px">' +
        '<button id="uform-save" class="admin-btn admin-btn-primary admin-btn-sm">保存</button>' +
        '<button id="uform-cancel" class="admin-btn admin-btn-ghost admin-btn-sm">取消</button>' +
      '</div>';

    document.getElementById('uform-cancel').addEventListener('click', function() {
      card.classList.add('hidden');
    });

    if (isEdit) {
      // load user data
      Admin.api('/api/admin/users/' + username).then(function(res) {
        if (res.ok) {
          document.getElementById('uform-username').value = res.data.username;
          document.getElementById('uform-nickname').value = res.data.nickname || '';
          document.getElementById('uform-avatar').value = res.data.avatar || '';
          document.getElementById('uform-role').value = res.data.role || 'student';
        }
      });
      document.getElementById('uform-save').addEventListener('click', async function() {
        var body = {
          nickname: document.getElementById('uform-nickname').value.trim(),
          avatar: document.getElementById('uform-avatar').value.trim(),
          role: document.getElementById('uform-role').value,
        };
        var pw = document.getElementById('uform-password').value.trim();
        if (pw) body.password = pw;
        var res = await Admin.api('/api/admin/users/' + username, { method: 'POST', body: body });
        if (res.ok) { card.classList.add('hidden'); loadUsers(); }
        else alert(res.data.error || '保存失败');
      });
    } else {
      document.getElementById('uform-save').addEventListener('click', async function() {
        var body = {
          username: document.getElementById('uform-username').value.trim(),
          nickname: document.getElementById('uform-nickname').value.trim(),
          avatar: document.getElementById('uform-avatar').value.trim(),
          role: document.getElementById('uform-role').value,
        };
        var pw = document.getElementById('uform-password').value.trim();
        if (pw) body.password = pw;
        var res = await Admin.api('/api/admin/users', { method: 'POST', body: body });
        if (res.ok) { card.classList.add('hidden'); loadUsers(); }
        else alert(res.data.error || '保存失败');
      });
    }
  }
})();
