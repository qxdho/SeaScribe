/* ============================================================
   SeaScribe Admin — Auth (Login / Logout UI)
   ============================================================ */

(function() {
  var loginPage = document.getElementById('admin-login');
  var bindPage  = document.getElementById('admin-bind');
  var appPage   = document.getElementById('admin-app');
  var loginError = document.getElementById('login-error');
  var bindError  = document.getElementById('bind-error');

  function showLogin() {
    appPage.classList.add('hidden');
    bindPage.classList.add('hidden');
    loginPage.classList.remove('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    loginError.classList.add('hidden');
    var btn = document.getElementById('login-submit');
    btn.disabled = false;
    btn.textContent = '登 录';
  }

  function showApp(user) {
    loginPage.classList.add('hidden');
    bindPage.classList.add('hidden');
    appPage.classList.remove('hidden');
    PageRegistry.init(user);
  }

  function showBind() {
    loginPage.classList.add('hidden');
    appPage.classList.add('hidden');
    bindPage.classList.remove('hidden');
    var classSelect = document.getElementById('bind-class');
    var nameSelect = document.getElementById('bind-displayname');
    classSelect.innerHTML = '<option value="">扫描中…</option>';
    nameSelect.innerHTML = '<option value="">— 先选择班级 —</option>';
    document.getElementById('bind-submit').disabled = true;
    bindError.classList.add('hidden');
    loadClassList();
  }

  async function loadClassList() {
    var classSelect = document.getElementById('bind-class');
    try {
      var res = await fetch('/api/roster/classes');
      var classes = await res.json();
      if (!classes.length) {
        classSelect.innerHTML = '<option value="">无班级数据</option>';
        return;
      }
      classSelect.innerHTML = '<option value="">— 选择班级 —</option>' +
        classes.map(function(c) {
          return '<option value="' + Admin.esc(c) + '">' + Admin.esc(c) + '</option>';
        }).join('');
    } catch(e) {
      classSelect.innerHTML = '<option value="">加载失败</option>';
    }
  }

  // Login button
  document.getElementById('login-submit').addEventListener('click', async function() {
    var username = document.getElementById('login-username').value.trim();
    var password = document.getElementById('login-password').value;
    if (!username || !password) {
      loginError.textContent = '请输入用户名和密码';
      loginError.classList.remove('hidden');
      return;
    }
    loginError.classList.add('hidden');
    var btn = document.getElementById('login-submit');
    btn.disabled = true;
    btn.textContent = '登录中…';
    var userInput = document.getElementById('login-username');
    var passInput = document.getElementById('login-password');
    userInput.disabled = true;
    passInput.disabled = true;
    var res = await Admin.api('/api/admin/login', {
      method: 'POST',
      body: { username: username, password: password },
    });
    if (!res.ok) {
      btn.disabled = false;
      btn.textContent = '登 录';
      userInput.disabled = false;
      passInput.disabled = false;
      loginError.textContent = res.data.error || '登录失败';
      loginError.classList.remove('hidden');
      return;
    }
    Admin.saveSession(res.data.token, res.data.user);
    Admin.toast('登录成功', 'success');
    if (res.data.user.displayName || res.data.user.role !== 'student') {
      showApp(res.data.user);
    } else {
      showBind();
    }
  });

  // Toggle password visibility
  document.getElementById('login-toggle-pw').addEventListener('click', function() {
    var pw = document.getElementById('login-password');
    if (pw.type === 'password') {
      pw.type = 'text';
      this.textContent = '🙈';
    } else {
      pw.type = 'password';
      this.textContent = '👁';
    }
  });

  // Enter to login
  document.getElementById('login-password').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('login-submit').click();
  });

  // Bind: class select → load names
  document.getElementById('bind-class').addEventListener('change', async function() {
    var nameSelect = document.getElementById('bind-displayname');
    var btn = document.getElementById('bind-submit');
    if (!this.value) {
      nameSelect.innerHTML = '<option value="">— 先选择班级 —</option>';
      btn.disabled = true;
      return;
    }
    nameSelect.innerHTML = '<option value="">加载中…</option>';
    btn.disabled = true;
    try {
      var res = await fetch('/api/roster/' + encodeURIComponent(this.value));
      var students = await res.json();
      if (!students.length) {
        nameSelect.innerHTML = '<option value="">名单为空</option>';
        return;
      }
      nameSelect.innerHTML = '<option value="">— 选择姓名 —</option>' +
        students.map(function(s) {
          return '<option value="' + Admin.esc(s.name) + '" data-sig="' + Admin.esc(s.signature || '') + '">' + Admin.esc(s.name) + (s.signature ? ' — ' + Admin.esc(s.signature) : '') + '</option>';
        }).join('');
    } catch(e) {
      nameSelect.innerHTML = '<option value="">加载失败</option>';
    }
  });

  // Bind: name select → enable submit
  document.getElementById('bind-displayname').addEventListener('change', function() {
    document.getElementById('bind-submit').disabled = !this.value;
  });

  // Bind submit
  document.getElementById('bind-submit').addEventListener('click', async function() {
    var name = document.getElementById('bind-displayname').value.trim();
    if (!name) {
      bindError.textContent = '请选择姓名';
      bindError.classList.remove('hidden');
      return;
    }
    bindError.classList.add('hidden');
    var sel = document.getElementById('bind-displayname');
    var sig = sel.selectedOptions[0] ? sel.selectedOptions[0].getAttribute('data-sig') || '' : '';
    var res = await Admin.api('/api/admin/profile', {
      method: 'POST',
      body: { displayName: name, signature: sig },
    });
    if (!res.ok) {
      bindError.textContent = res.data.error || '绑定失败';
      bindError.classList.remove('hidden');
      return;
    }
    var sess = Admin.getSession();
    sess.user.displayName = res.data.displayName;
    Admin.saveSession(sess.token, sess.user);
    showApp(sess.user);
  });

  // Logout button
  document.getElementById('admin-logout-btn').addEventListener('click', async function() {
    await Admin.api('/api/admin/logout', { method: 'POST' });
    Admin.clearSession();
    Admin.toast('已退出登录', 'info');
    showLogin();
  });

  // Expose
  window.AdminAuth = {
    showLogin: showLogin,
    showApp: showApp,
    showBind: showBind,
  };
})();
