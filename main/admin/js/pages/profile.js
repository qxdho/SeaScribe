/* ============================================================
   SeaScribe Admin — Profile Page
   ============================================================ */

(function() {

var _avatarUrl = '';

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
        '<label for="profile-uid">用户 ID</label>' +
        '<input type="text" id="profile-uid" value="' + Admin.esc(user.uid || '—') + '" disabled>' +
      '</div>' +
      (user.role === 'student' ?
      '<div class="admin-form-group">' +
        '<label for="profile-class">班级</label>' +
        '<input type="text" id="profile-class" value="加载中…" disabled>' +
      '</div>' +
      '<div class="admin-form-group">' +
        '<label for="profile-lastpick">上次被点名</label>' +
        '<input type="text" id="profile-lastpick" value="加载中…" disabled>' +
      '</div>' : '') +
      '<div class="admin-form-group">' +
        '<label for="profile-username">用户名（英文）</label>' +
        '<input type="text" id="profile-username" value="' + Admin.esc(user.username) + '" autocomplete="username">' +
      '</div>' +
      '<div class="admin-form-group">' +
        '<label for="profile-nickname">昵称</label>' +
        '<input type="text" id="profile-nickname" value="' + Admin.esc(user.nickname || '') + '" placeholder="给自己起个名字">' +
      '</div>' +
      (user.role === 'student' ?
      '<div class="admin-form-group">' +
        '<label for="profile-signature">个性签名</label>' +
        '<input type="text" id="profile-signature" value="' + Admin.esc(user.signature || '') + '" placeholder="在点名时展示的个性签名">' +
      '</div>' : '') +
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

  // 加载班级
  Admin.api('/api/user/class').then(function(res) {
    var el = document.getElementById('profile-class');
    if (!el) return;
    if (res.ok && res.data.className) {
      el.value = res.data.className;
    } else {
      el.value = '未绑定班级';
    }
  });

  // 加载上次点名时间
  Admin.api('/api/user/last-pick').then(function(res) {
    var el = document.getElementById('profile-lastpick');
    if (!el) return;
    if (res.ok && res.data.time) {
      var d = new Date(res.data.time);
      el.value = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } else if (!res.ok) {
      el.value = '加载失败';
    } else {
      el.value = '未被点名';
    }
  });
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // 刷新最新资料（管理员可能在后台改了签名等）
  Admin.api('/api/admin/session').then(function(res) {
    if (res.ok) {
      var sigEl = document.getElementById('profile-signature');
      if (sigEl) sigEl.value = res.data.signature || '';
      var nickEl = document.getElementById('profile-nickname');
      if (nickEl) nickEl.value = res.data.nickname || '';
    }
  });

  document.getElementById('profile-avatar-btn').addEventListener('click', function() {
    document.getElementById('profile-avatar-file').click();
  });

  document.getElementById('profile-avatar-file').addEventListener('change', async function() {
    var file = this.files[0];
    if (!file) return;
    Admin.toast('头像上传中…', "info");
    var reader = new FileReader();
    reader.onload = async function() {
      var b64 = reader.result.split(',')[1];
      var res = await Admin.api('/api/admin/upload/avatar', {
        method: 'POST',
        body: { filename: file.name, content: b64 },
      });
      if (res.ok && res.data.url) {
        _avatarUrl = res.data.url;
        var saveRes = await Admin.api('/api/admin/profile', {
          method: 'POST',
          body: { avatar: _avatarUrl },
        });
        if (saveRes.ok) {
          document.getElementById('profile-avatar-preview').innerHTML = avatarHTML({ avatar: _avatarUrl });
          var sess = Admin.getSession();
          sess.user.avatar = _avatarUrl;
          Admin.saveSession(sess.token, sess.user);
          Admin.toast('头像已更新', "success");
        } else {
          Admin.toast(saveRes.data.error || '保存失败', "error");
        }
      } else {
        Admin.toast(res.data.error || '上传失败', "error");
      }
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('profile-save').addEventListener('click', async function() {
    var body = {
      username: document.getElementById('profile-username').value.trim(),
      nickname: document.getElementById('profile-nickname').value.trim(),
      signature: (document.getElementById('profile-signature') || {}).value || '',
      avatar: _avatarUrl,
    };
    var res = await Admin.api('/api/admin/profile', { method: 'POST', body: body });
    if (!res.ok) { Admin.toast(res.data.error || '保存失败', "error"); return; }
    var sess = Admin.getSession();
    sess.user.username = res.data.username;
    sess.user.nickname = res.data.nickname;
    sess.user.displayName = res.data.displayName;
    sess.user.signature = res.data.signature;
    sess.user.avatar = res.data.avatar;
    _avatarUrl = res.data.avatar;
    Admin.saveSession(sess.token, sess.user);
    Admin.toast('资料已保存', "success");
  });

  document.getElementById('profile-pw-save').addEventListener('click', async function() {
    var oldPw = document.getElementById('profile-oldpw').value;
    var newPw = document.getElementById('profile-newpw').value;
    if (!newPw) { Admin.toast('请输入新密码', "error"); return; }
    if (!oldPw) { Admin.toast('请输入旧密码', "error"); return; }
    var res = await Admin.api('/api/admin/profile', {
      method: 'POST',
      body: { oldPassword: oldPw, newPassword: newPw },
    });
    if (!res.ok) { Admin.toast(res.data.error || '修改失败', "error"); return; }
    document.getElementById('profile-oldpw').value = '';
    document.getElementById('profile-newpw').value = '';
    Admin.toast('密码已修改', "success");
  });
}

function avatarHTML(user) {
  var a = user.avatar || '';
  if (!a) return '<span style="opacity:0.3;font-size:2rem">👤</span>';
  if (/^https?:\/\//.test(a)) return '<img src="' + Admin.esc(a) + '" class="admin-avatar-lg" onerror="this.outerHTML=\'<span>👤</span>\'">';
  if (/^\/admin\/_store\/avatars\//.test(a)) return '<img src="' + Admin.esc(a) + '" class="admin-avatar-lg" onerror="this.outerHTML=\'<span>👤</span>\'">';
  return '<span style="font-size:2.5rem">' + Admin.esc(a) + '</span>';
}



PageRegistry.register({
  id: 'profile',
  label: '我的资料',
  icon: '👤',
  render: render,
});

})();
