/* ============================================================
   SeaScribe Admin — Application Entry Point
   Loaded last; wires auth, router, and pages together.
   ============================================================ */

(function() {
  var sess = Admin.getSession();
  if (sess && sess.token) {
    // 立即渲染，避免闪现登录页
    if (sess.user.displayName || sess.user.role !== 'student') {
      AdminAuth.showApp(sess.user);
    } else {
      AdminAuth.showBind();
    }
    // 后台静默验证 token 是否过期
    Admin.api('/api/admin/session').then(function(res) {
      if (!res.ok) {
        Admin.clearSession();
        AdminAuth.showLogin();
      }
    });
  } else {
    AdminAuth.showLogin();
    // If loading #/register directly, swap to register card
    if (location.hash === '#/register') {
      var lc = document.querySelector('#admin-login .admin-login-card:first-of-type');
      var rc = document.getElementById('register-card');
      if (lc && rc) { lc.classList.add('hidden'); rc.classList.remove('hidden'); }
    }
  }
})();
