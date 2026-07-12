/* ============================================================
   SeaScribe Admin — PageRegistry + Router
   Replaces dashboard.js with a plugin-style registration system.
   ============================================================ */

const PageRegistry = {
  _pages: new Map(),

  /**
   * Register a page module.
   * @param {Object} page
   *   - id: string        — unique page id
   *   - label: string     — nav display name
   *   - icon: string      — nav icon (emoji)
   *   - roles: string[]   — allowed roles (null/undefined = all)
   *   - render(): void    — render page content into #admin-content
   */
  register(page) {
    if (!page || !page.id) {
      console.error('[Admin] Invalid page:', page);
      return;
    }
    this._pages.set(page.id, page);
  },

  /** Get a page by id */
  get(id) {
    return this._pages.get(id) || null;
  },

  /** List pages visible to a user */
  list(user) {
    var self = this;
    return Array.from(this._pages.values()).filter(function(p) {
      return !p.roles || p.roles.indexOf(user.role) >= 0;
    });
  },

  /** Navigate to a page */
  navigate(pageId) {
    var page = this._pages.get(pageId);
    if (!page) return;

    if (this._navigating) return;
    this._navigating = true;

    // Highlight nav
    var nav = document.getElementById('admin-nav');
    nav.querySelectorAll('a').forEach(function(a) {
      a.classList.toggle('active', a.dataset.page === pageId);
    });

    // Render page
    page.render();

    var self = this;
    setTimeout(function() { self._navigating = false; }, 0);
  },

  /** Render nav from registered pages */
  renderNav(user) {
    var nav = document.getElementById('admin-nav');
    nav.innerHTML = this.list(user).map(function(p) {
      return '<a data-page="' + p.id + '">' + p.icon + ' ' + Admin.esc(p.label) + '</a>';
    }).join('');

    var self = this;
    nav.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() {
        location.hash = '#/' + this.dataset.page;
        self.navigate(this.dataset.page);
      });
    });
  },

  /** Render user info in topbar */
  renderUserInfo(user) {
    var el = document.getElementById('admin-user-info');
    var roleLabel = { admin: '管理员', teacher: '教师', student: '学生' }[user.role] || user.role;
    el.innerHTML = '<span class="nickname">' + Admin.esc(user.nickname || user.username) + '</span> <span class="role-tag">' + Admin.esc(roleLabel) + '</span>';
  },

  /** Full init: render nav + user info + navigate to first page (or hash) */
  init(user) {
    this._user = user;
    this.renderNav(user);
    this.renderUserInfo(user);

    // 支持 #/xxx 直接跳转
    var self = this;
    var hashPage = null;
    if (location.hash.indexOf('#/') === 0) {
      hashPage = location.hash.slice(2);
    }
    var allowed = this.list(user);
    if (hashPage && allowed.some(function(p) { return p.id === hashPage; })) {
      history.replaceState(null, '', '#/' + hashPage);
      this.navigate(hashPage);
    } else {
      var first = allowed[0];
      if (first) {
        history.replaceState(null, '', '#/' + first.id);
        this.navigate(first.id);
      }
    }

    // 浏览器前进/后退（校验角色权限）
    window.addEventListener('hashchange', function() {
      var id = location.hash.indexOf('#/') === 0 ? location.hash.slice(2) : '';
      var ok = self._pages.has(id) && self.list(self._user).some(function(p) { return p.id === id; });
      if (ok) self.navigate(id);
    });
  },
};
