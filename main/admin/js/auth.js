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
    document.getElementById('login-username').disabled = false;
    document.getElementById('login-password').disabled = false;
    // Reset register card visibility
    var lc = document.querySelector('#admin-login .admin-login-card:first-of-type');
    if (lc) lc.classList.remove('hidden');
    var rc = document.getElementById('register-card');
    if (rc) rc.classList.add('hidden');
    // Only override hash if it is not an auth page
    var h = location.hash;
    if (h !== '#/login' && h !== '#/register') history.replaceState(null, '', '#/login');
    document.getElementById('register-username').value = '';
    document.getElementById('register-nickname').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-password2').value = '';
    document.getElementById('register-error').classList.add('hidden');
    document.getElementById('register-submit').disabled = true;
    document.getElementById('register-submit').textContent = '注 册';
    // Reset validation styles
    ['register-username','register-nickname','register-password','register-password2'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.classList.remove('reg-ok','reg-bad'); }
    });
    ['reg-hint-username','reg-hint-nickname','reg-hint-password','reg-hint-password2'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.className = 'reg-hint'; }
    });
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
    if (classSelect._customSelect) classSelect._customSelect.refresh();
    if (nameSelect._customSelect) nameSelect._customSelect.refresh();
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
        if (classSelect._customSelect) classSelect._customSelect.refresh();
        return;
      }
      classSelect.innerHTML = '<option value="">— 选择班级 —</option>' +
        classes.map(function(c) {
          return '<option value="' + Admin.esc(c) + '">' + Admin.esc(c) + '</option>';
        }).join('');
      if (classSelect._customSelect) classSelect._customSelect.refresh();
    } catch(e) {
      classSelect.innerHTML = '<option value="">加载失败</option>';
      if (classSelect._customSelect) classSelect._customSelect.refresh();
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
      Admin.toast(res.data.error || '登录失败', 'error');
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
  var pwInput = document.getElementById('login-password');
  var clearBtn = document.getElementById('login-clear-pw');
  var eyeShow = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var eyeHide = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  var toggleBtn = document.getElementById('login-toggle-pw');
  toggleBtn.innerHTML = eyeHide;
  toggleBtn.title = '显示密码';
  toggleBtn.addEventListener('click', function() {
    if (pwInput.type === 'password') {
      pwInput.type = 'text';
      this.innerHTML = eyeShow;
      this.title = '隐藏密码';
    } else {
      pwInput.type = 'password';
      this.innerHTML = eyeHide;
      this.title = '显示密码';
    }
  });

  // Clear password
  clearBtn.addEventListener('click', function() {
    pwInput.value = '';
    pwInput.focus();
    this.style.display = 'none';
  });
  pwInput.addEventListener('input', function() {
    clearBtn.style.display = pwInput.value ? '' : 'none';
  });

  // Enter to login
  document.getElementById('login-password').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('login-submit').click();
  });

  // Toggle login ↔ register via hash
  var loginCard = document.querySelector('#admin-login .admin-login-card:first-of-type');
  var registerCard = document.getElementById('register-card');
  document.getElementById('login-to-register').addEventListener('click', function() {
    history.replaceState(null, '', '#/register');
    loginCard.classList.add('hidden');
    registerCard.classList.remove('hidden');
  });
  document.getElementById('register-to-login').addEventListener('click', function() {
    history.replaceState(null, '', '#/login');
    registerCard.classList.add('hidden');
    loginCard.classList.remove('hidden');
    document.getElementById('register-error').classList.add('hidden');
  });

  // Hash change → switch login/register card
  window.addEventListener('hashchange', function() {
    var h = location.hash;
    if (!loginPage || loginPage.classList.contains('hidden')) return;
    if (h === '#/register') {
      loginCard.classList.add('hidden');
      registerCard.classList.remove('hidden');
    } else {
      registerCard.classList.add('hidden');
      loginCard.classList.remove('hidden');
      document.getElementById('register-error').classList.add('hidden');
    }
  });

  // Register real-time validation
  var regUser   = document.getElementById('register-username');
  var regNick   = document.getElementById('register-nickname');
  var regPw     = document.getElementById('register-password');
  var regPw2    = document.getElementById('register-password2');
  var regBtn    = document.getElementById('register-submit');
  var regErr    = document.getElementById('register-error');
  var hintUser  = document.getElementById('reg-hint-username');
  var hintPw    = document.getElementById('reg-hint-password');
  var hintPw2   = document.getElementById('reg-hint-password2');

  var userNameOk = false, pwOk = false, pw2Ok = false;

  function setField(el, hint, ok, okMsg, badMsg) {
    if (ok) {
      el.classList.add('reg-ok'); el.classList.remove('reg-bad');
      hint.textContent = '✓ ' + okMsg;
      hint.className = 'reg-hint ok';
    } else {
      el.classList.add('reg-bad'); el.classList.remove('reg-ok');
      hint.textContent = '✗ ' + badMsg;
      hint.className = 'reg-hint bad';
    }
  }

  function clearField(el, hint, placeholder) {
    el.classList.remove('reg-ok', 'reg-bad');
    hint.textContent = placeholder;
    hint.className = 'reg-hint';
  }

  function updateRegBtn() {
    regBtn.disabled = !(userNameOk && pwOk && pw2Ok);
    regErr.classList.add('hidden');
  }

  regUser.addEventListener('input', function() {
    var v = regUser.value.trim();
    if (!v) { clearField(regUser, hintUser, '字母开头，3-20位，可含数字和下划线'); userNameOk = false; }
    else if (!/^[a-zA-Z]/.test(v)) {
      setField(regUser, hintUser, false, '', '首字母必须是英文字母');
      userNameOk = false;
    }
    else if (!/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(v)) {
      setField(regUser, hintUser, false, '', '3-20位，只能包含字母、数字和下划线');
      userNameOk = false;
    }
    else {
      setField(regUser, hintUser, true, '格式正确', '');
      userNameOk = true;
    }
    updateRegBtn();
  });

  regPw.addEventListener('input', function() {
    var v = regPw.value;
    if (!v) { clearField(regPw, hintPw, '至少 6 位字符'); pwOk = false; }
    else if (v.length < 6) {
      setField(regPw, hintPw, false, '', '至少需要 6 位');
      pwOk = false;
    }
    else {
      setField(regPw, hintPw, true, '长度符合要求', '');
      pwOk = true;
    }
    // Also re-check confirm
    if (regPw2.value) regPw2.dispatchEvent(new Event('input'));
    updateRegBtn();
  });

  regPw2.addEventListener('input', function() {
    var v = regPw2.value;
    if (!v) { clearField(regPw2, hintPw2, '与上方密码一致'); pw2Ok = false; }
    else if (v !== regPw.value) {
      setField(regPw2, hintPw2, false, '', '两次密码不一致');
      pw2Ok = false;
    }
    else if (!pwOk) {
      setField(regPw2, hintPw2, false, '', '请先填写上方密码');
      pw2Ok = false;
    }
    else {
      setField(regPw2, hintPw2, true, '密码一致', '');
      pw2Ok = true;
    }
    updateRegBtn();
  });

  // Register submit
  regBtn.addEventListener('click', async function() {
    if (!userNameOk || !pwOk || !pw2Ok) return;
    regErr.classList.add('hidden');
    regBtn.disabled = true;
    regBtn.textContent = '注册中…';
    regUser.disabled = true;
    regNick.disabled = true;
    regPw.disabled = true;
    regPw2.disabled = true;
    var res = await Admin.api('/api/admin/register', {
      method: 'POST',
      body: { username: regUser.value.trim(), nickname: regNick.value.trim().slice(0,100), password: regPw.value },
    });
    regBtn.disabled = false;
    regBtn.textContent = '注 册';
    regUser.disabled = false;
    regNick.disabled = false;
    regPw.disabled = false;
    regPw2.disabled = false;
    if (!res.ok) {
      Admin.toast(res.data.error || '注册失败', 'error');
      return;
    }
    Admin.saveSession(res.data.token, res.data.user);
    Admin.toast('注册成功', 'success');
    showBind();
  });

  // Enter to submit register
  regPw2.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !regBtn.disabled) regBtn.click();
  });

  // Bind: class select → load names
  document.getElementById('bind-class').addEventListener('change', async function() {
    var nameSelect = document.getElementById('bind-displayname');
    var btn = document.getElementById('bind-submit');
    var ref = function() { if (nameSelect._customSelect) nameSelect._customSelect.refresh(); };
    if (!this.value) {
      nameSelect.innerHTML = '<option value="">— 先选择班级 —</option>';
      ref(); btn.disabled = true;
      return;
    }
    nameSelect.innerHTML = '<option value="">加载中…</option>';
    ref(); btn.disabled = true;
    try {
      var res = await fetch('/api/roster/' + encodeURIComponent(this.value));
      var students = await res.json();
      if (!students.length) {
        nameSelect.innerHTML = '<option value="">名单为空</option>';
        ref(); return;
      }
      nameSelect.innerHTML = '<option value="">— 选择姓名 —</option>' +
        students.map(function(s) {
          return '<option value="' + Admin.esc(s.name) + '" data-sig="' + Admin.esc(s.signature || '') + '">' + Admin.esc(s.name) + (s.signature ? ' — ' + Admin.esc(s.signature) : '') + '</option>';
        }).join('');
      ref();
    } catch(e) {
      nameSelect.innerHTML = '<option value="">加载失败</option>';
      ref();
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

  // Bind page logout
  var btnBindLogout = document.getElementById('btn-bind-logout');
  if (btnBindLogout) {
    btnBindLogout.addEventListener('click', async function() {
      await Admin.api('/api/admin/logout', { method: 'POST' });
      Admin.clearSession();
      Admin.toast('已退出登录', 'info');
      showLogin();
    });
  }

  // Expose
  window.AdminAuth = {
    showLogin: showLogin,
    showApp: showApp,
    showBind: showBind,
  };
})();
