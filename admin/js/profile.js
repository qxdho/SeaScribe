/* ============================================================
   SeaScribe Admin — Profile (My Profile)
   ============================================================ */

(function() {

  var _avatarUrl = '';  // 内部存储，不暴露给用户

  window.AdminProfile = {
    render: render,
  };

  function render() {
    var user = Admin.getSession().user;
    _avatarUrl = user.avatar || '';
    var content = document.getElementById('admin-content');

    content.innerHTML =
      '<div class="admin-card">' +
        '<h3>👤 我的资料</h3>' +
        '<div class="admin-form-row" style="align-items:center;margin-bottom:16px">' +
          '<div id="profile-avatar-preview" style="font-size:3rem;line-height:1">' + avatarHTML(user) + '</div>' +
          '<div><button id="profile-avatar-btn" class="admin-btn admin-btn-outline admin-btn-sm">更换头像</button>' +
          '<input type="file" id="profile-avatar-file" accept="image/*" style="display:none">' +
          '<p style="font-size:0.72rem;color:var(--muted);margin-top:4px">点击上传图片，自动保存</p></div>' +
        '</div>' +
        '<div class="admin-form-group">' +
          '<label for="profile-username">用户名（英文）</label>' +
          '<input type="text" id="profile-username" value="' + Admin.esc(user.username) + '">' +
        '</div>' +
        '<div class="admin-form-group">' +
          '<label for="profile-nickname">昵称（中文/日文）</label>' +
          '<input type="text" id="profile-nickname" value="' + Admin.esc(user.nickname || '') + '" placeholder="给自己起个名字">' +
        '</div>' +
        '<p id="profile-msg" class="admin-msg hidden"></p>' +
        '<button id="profile-save" class="admin-btn admin-btn-primary" style="width:auto;padding:8px 24px">保存资料</button>' +
      '</div>' +
      '<div class="admin-card">' +
        '<h3>🔐 修改密码</h3>' +
        '<div class="admin-form-group">' +
          '<label for="profile-oldpw">旧密码</label>' +
          '<input type="password" id="profile-oldpw" placeholder="输入旧密码">' +
        '</div>' +
        '<div class="admin-form-group">' +
          '<label for="profile-newpw">新密码</label>' +
          '<input type="password" id="profile-newpw" placeholder="输入新密码">' +
        '</div>' +
        '<p id="profile-pw-msg" class="admin-msg hidden"></p>' +
        '<button id="profile-pw-save" class="admin-btn admin-btn-primary" style="width:auto;padding:8px 24px">修改密码</button>' +
      '</div>';

    // 更换头像 → 打开文件选择器
    document.getElementById('profile-avatar-btn').addEventListener('click', function() {
      document.getElementById('profile-avatar-file').click();
    });

    // 文件选择后上传 + 自动保存
    document.getElementById('profile-avatar-file').addEventListener('change', async function() {
      var file = this.files[0];
      if (!file) return;
      showMsg('', '头像上传中…');
      var reader = new FileReader();
      reader.onload = async function() {
        var b64 = reader.result.split(',')[1];
        var res = await Admin.api('/api/admin/upload/avatar', {
          method: 'POST',
          body: { filename: file.name, content: b64 },
        });
        if (res.ok && res.data.url) {
          _avatarUrl = res.data.url;
          // 立即保存到 profile
          var saveRes = await Admin.api('/api/admin/profile', {
            method: 'POST',
            body: { avatar: _avatarUrl },
          });
          if (saveRes.ok) {
            document.getElementById('profile-avatar-preview').innerHTML = avatarHTML({ avatar: _avatarUrl });
            var sess = Admin.getSession();
            sess.user.avatar = _avatarUrl;
            Admin.saveSession(sess.token, sess.user);
            showMsg('success', '头像已更新');
          } else {
            showMsg('error', saveRes.data.error || '保存失败');
          }
        } else {
          showMsg('error', res.data.error || '上传失败');
        }
      };
      reader.readAsDataURL(file);
    });

    // 保存资料（不含密码）
    document.getElementById('profile-save').addEventListener('click', async function() {
      var body = {
        username: document.getElementById('profile-username').value.trim(),
        nickname: document.getElementById('profile-nickname').value.trim(),
        avatar: _avatarUrl,
      };
      var res = await Admin.api('/api/admin/profile', { method: 'POST', body: body });
      if (!res.ok) { showMsg('error', res.data.error || '保存失败'); return; }
      var sess = Admin.getSession();
      sess.user.username = res.data.username;
      sess.user.nickname = res.data.nickname;
      sess.user.avatar = res.data.avatar;
      _avatarUrl = res.data.avatar;
      Admin.saveSession(sess.token, sess.user);
      showMsg('success', '资料已保存');
    });

    // 修改密码
    document.getElementById('profile-pw-save').addEventListener('click', async function() {
      var oldPw = document.getElementById('profile-oldpw').value;
      var newPw = document.getElementById('profile-newpw').value;
      if (!newPw) { showPwMsg('error', '请输入新密码'); return; }
      if (!oldPw) { showPwMsg('error', '请输入旧密码'); return; }
      var res = await Admin.api('/api/admin/profile', {
        method: 'POST',
        body: { oldPassword: oldPw, newPassword: newPw },
      });
      if (!res.ok) { showPwMsg('error', res.data.error || '修改失败'); return; }
      document.getElementById('profile-oldpw').value = '';
      document.getElementById('profile-newpw').value = '';
      showPwMsg('success', '密码已修改');
    });
  }

  function avatarHTML(user) {
    var a = user.avatar || '';
    if (!a) return '<span style="opacity:0.3;font-size:2rem">👤</span>';
    if (/^https?:\/\//.test(a)) return '<img src="' + Admin.esc(a) + '" class="admin-avatar-lg" onerror="this.outerHTML=\'<span>👤</span>\'">';
    if (/^\/admin\/_store\/avatars\//.test(a)) return '<img src="' + Admin.esc(a) + '" class="admin-avatar-lg" onerror="this.outerHTML=\'<span>👤</span>\'">';
    return '<span style="font-size:2.5rem">' + Admin.esc(a) + '</span>';
  }

  function showMsg(type, text) {
    var el = document.getElementById('profile-msg');
    el.textContent = text;
    el.className = 'admin-msg ' + (type ? 'admin-msg-' + type : '');
    el.classList.remove('hidden');
    if (type === 'success' || type === 'error') {
      setTimeout(function() { el.classList.add('hidden'); }, 3000);
    }
  }

  function showPwMsg(type, text) {
    var el = document.getElementById('profile-pw-msg');
    el.textContent = text;
    el.className = 'admin-msg admin-msg-' + type;
    el.classList.remove('hidden');
    setTimeout(function() { el.classList.add('hidden'); }, 3000);
  }
})();
