/* ============================================================
   SeaScribe Admin — Dashboard (Navigation + Page Routing)
   ============================================================ */

(function() {
  var nav      = document.getElementById('admin-nav');
  var content  = document.getElementById('admin-content');
  var userInfo = document.getElementById('admin-user-info');

  var _currentPage = '';

  /** 导航项定义：id, label, icon, roles (可选，不设=全员可见) */
  var PAGES = [
    { id: 'profile',  label: '我的资料', icon: '👤' },
    { id: 'users',    label: '用户管理', icon: '👥', roles: ['admin'] },
    { id: 'config',   label: '配置管理', icon: '⚙️',  roles: ['admin', 'teacher'] },
    { id: 'files',    label: '英语文件', icon: '📂',  roles: ['admin', 'teacher'] },
  ];

  window.AdminApp = {
    init: init,
  };

  function init() {
    var user = Admin.getSession().user;
    renderNav(user);
    renderUserInfo(user);
    var first = PAGES.filter(function(p) { return !p.roles || p.roles.indexOf(user.role) >= 0; })[0];
    if (first) navigate(first.id);
  }

  /* ====== Topbar Nav ====== */
  function renderNav(user) {
    nav.innerHTML = PAGES.filter(function(p) {
      return !p.roles || p.roles.indexOf(user.role) >= 0;
    }).map(function(p) {
      return '<a data-page="' + p.id + '">' + p.icon + ' ' + Admin.esc(p.label) + '</a>';
    }).join('');

    nav.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() { navigate(this.dataset.page); });
    });
  }

  function renderUserInfo(user) {
    userInfo.innerHTML = '<span class="nickname">' + Admin.esc(user.nickname || user.username) + '</span>';
  }

  /* ====== Navigation ====== */
  function navigate(pageId) {
    _currentPage = pageId;
    // 高亮
    nav.querySelectorAll('a').forEach(function(a) {
      a.classList.toggle('active', a.dataset.page === pageId);
    });

    // 路由到对应模块
    switch (pageId) {
      case 'profile': renderProfile(); break;
      case 'users':   renderUsers();   break;
      case 'config':  renderConfig();  break;
      case 'files':   renderFiles();   break;
      default: content.innerHTML = '';
    }
  }

  /* ====== Profile ====== */
  function renderProfile() {
    window.AdminProfile.render();
  }

  /* ====== Users ====== */
  function renderUsers() {
    window.AdminUsers.render();
  }

  /* ====== Config ====== */
  function renderConfig() {
    window.AdminConfig.render();
  }

  /* ====== Files ====== */
  function renderFiles() {
    window.AdminFiles.render();
  }
})();
