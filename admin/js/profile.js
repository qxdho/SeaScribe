/* ============================================================
   SeaScribe Admin — Profile (My Profile)
   ============================================================ */

(function() {

  window.AdminProfile = {
    render: render,
  };

  function render() {
    var user = Admin.getSession().user;
    var content = document.getElementById('admin-content');

    content.innerHTML =
      '<div class="admin-card">' +
        '<h3>👤 我的资料</h3>' +
        '<div class="admin-form-row" style="align-items:center;margin-bottom:16px">' +
          '<div id="profile-avatar-preview" style="font-size:3rem;line-height:1">' + avatarHTML(user) + '</div>' +
          '<div><button id="profile-avatar-btn" class="admin-btn admin-btn-outline admin-btn-sm">更换头像</button>' +
          '<p style="font-size:0.72rem;color:var(--muted);margin-top:4px">支持 emoji 或图片链接</p></div>' +
        '</div>' +
        '<div class="admin-form-group">' +
          '<label for="profile-username">用户名（英文）</label>' +
          '<input type="text" id="profile-username" value="' + Admin.esc(user.username) + '">' +
        '</div>' +
        '<div class="admin-form-group">' +
          '<label for="profile-nickname">昵称（中文/日文）</label>' +
          '<input type="text" id="profile-nickname" value="' + Admin.esc(user.nickname || '') + '" placeholder="给自己起个名字">' +
        '</div>' +
        '<div class="admin-form-group">' +
          '<label for="profile-avatar">头像（emoji 或图片 URL）</label>' +
          '<input type="text" id="profile-avatar" value="' + Admin.esc(user.avatar || '') + '" placeholder="输入 emoji 或图片地址">' +
        '</div>' +
        '<hr style="border:none;border-top:1px solid var(--border);margin:16px 0">' +
        '<h4 style="margin-bottom:12px">修改密码（留空则不修改）</h4>' +
        '<div class="admin-form-group">' +
          '<label for="profile-oldpw">旧密码</label>' +
          '<input type="password" id="profile-oldpw" placeholder="输入旧密码">' +
        '</div>' +
        '<div class="admin-form-group">' +
          '<label for="profile-newpw">新密码</label>' +
          '<input type="password" id="profile-newpw" placeholder="输入新密码">' +
        '</div>' +
        '<p id="profile-msg" class="admin-msg hidden"></p>' +
        '<button id="profile-save" class="admin-btn admin-btn-primary" style="width:auto;padding:8px 24px">保存</button>' +
      '</div>';

    // avatar preview live update
    document.getElementById('profile-avatar').addEventListener('input', function() {
      document.getElementById('profile-avatar-preview').innerHTML = avatarHTML({ avatar: this.value });
    });

    // save
    document.getElementById('profile-save').addEventListener('click', async function() {
      var body = {
        username: document.getElementById('profile-username').value.trim(),
        nickname: document.getElementById('profile-nickname').value.trim(),
        avatar: document.getElementById('profile-avatar').value.trim(),
      };
      var oldPw = document.getElementById('profile-oldpw').value;
      var newPw = document.getElementById('profile-newpw').value;
      if (newPw) {
        if (!oldPw) { showMsg('error', '修改密码需要输入旧密码'); return; }
        body.oldPassword = oldPw;
        body.newPassword = newPw;
      }
      var res = await Admin.api('/api/admin/profile', { method: 'POST', body: body });
      if (!res.ok) { showMsg('error', res.data.error || '保存失败'); return; }
      // Update session
      var sess = Admin.getSession();
      sess.user.username = res.data.username;
      sess.user.nickname = res.data.nickname;
      sess.user.avatar = res.data.avatar;
      Admin.saveSession(sess.token, sess.user);
      showMsg('success', '保存成功');
    });
  }

  function avatarHTML(user) {
    var a = user.avatar || '';
    if (!a) return '<span style="opacity:0.3;font-size:2rem">👤</span>';
    if (/^https?:\/\//.test(a)) return '<img src="' + Admin.esc(a) + '" class="admin-avatar-lg" onerror="this.outerHTML=\'<span>👤</span>\'">';
    return '<span style="font-size:2.5rem">' + Admin.esc(a) + '</span>';
  }

  function showMsg(type, text) {
    var el = document.getElementById('profile-msg');
    el.textContent = text;
    el.className = 'admin-msg admin-msg-' + type;
    el.classList.remove('hidden');
    setTimeout(function() { el.classList.add('hidden'); }, 3000);
  }
})();
