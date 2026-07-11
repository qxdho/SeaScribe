/* ============================================================
   SeaScribe Admin — Auth (Login / Logout)
   ============================================================ */

(function() {
  var loginPage = document.getElementById('admin-login');
  var appPage   = document.getElementById('admin-app');
  var loginError = document.getElementById('login-error');

  /* ====== 登录 ====== */
  document.getElementById('login-submit').addEventListener('click', async function() {
    var username = document.getElementById('login-username').value.trim();
    var password = document.getElementById('login-password').value;
    if (!username || !password) {
      loginError.textContent = '请输入用户名和密码';
      loginError.classList.remove('hidden');
      return;
    }
    loginError.classList.add('hidden');
    var res = await Admin.api('/api/admin/login', {
      method: 'POST',
      body: { username: username, password: password },
    });
    if (!res.ok) {
      loginError.textContent = res.data.error || '登录失败';
      loginError.classList.remove('hidden');
      return;
    }
    Admin.saveSession(res.data.token, res.data.user);
    showApp();
  });

  // 回车登录
  document.getElementById('login-password').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('login-submit').click();
  });

  /* ====== 登出 ====== */
  document.getElementById('admin-logout-btn').addEventListener('click', async function() {
    await Admin.api('/api/admin/logout', { method: 'POST' });
    Admin.clearSession();
    showLogin();
  });

  /* ====== 页面切换 ====== */
  function showApp() {
    loginPage.classList.add('hidden');
    appPage.classList.remove('hidden');
    window.AdminApp.init();
  }

  function showLogin() {
    appPage.classList.add('hidden');
    loginPage.classList.remove('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    loginError.classList.add('hidden');
  }

  /* ====== 初始检查 ====== */
  var sess = Admin.getSession();
  if (sess && sess.token) {
    // 验证 token 是否还有效
    Admin.api('/api/admin/session').then(function(res) {
      if (res.ok) { showApp(); }
      else { Admin.clearSession(); showLogin(); }
    });
  } else {
    showLogin();
  }
})();
