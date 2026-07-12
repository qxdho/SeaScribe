/* ============================================================
   SeaScribe — Splash Screen + System Log
   ============================================================ */

(function() {
  var splash = document.getElementById('splash');
  var log = document.getElementById('splash-log');

  window.__SEASCRIBE_LOG__ = [];

  // 拦截 console 输出到系统日志
  (function() {
    var orig = { log: console.log, error: console.error, warn: console.warn };
    function push(level, args) {
      var msg = Array.prototype.slice.call(args).map(function(a) {
        try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
        catch(e) { return String(a); }
      }).join(' ');
      window.__SEASCRIBE_LOG__.push({ label: '[' + level + ']', ok: level !== 'error', text: msg });
    }
    console.log   = function() { orig.log.apply(console, arguments);   push('log', arguments); };
    console.error = function() { orig.error.apply(console, arguments); push('error', arguments); };
    console.warn  = function() { orig.warn.apply(console, arguments);  push('warn', arguments); };
  })();

  function logLine(label, ok, okMsg, failMsg) {
    var text = ok ? (okMsg || 'OK') : (failMsg || 'FAIL');
    window.__SEASCRIBE_LOG__.push({ label: label, ok: ok, text: text });
    var span = document.createElement('div');
    span.className = 'splash-log-line';
    span.innerHTML = (ok ? '✅ ' : '❌ ') + label + ' <span style="opacity:0.6">' + text + '</span>';
    log.appendChild(span);
  }

  function updateBadge() {
    var btn = document.getElementById('btn-syslog');
    if (!btn) return;
    var errors = window.__SEASCRIBE_LOG__.filter(function(l) { return !l.ok; }).length;
    if (errors > 0) {
      btn.innerHTML = '📋 系统日志 <sup style="color:#ff6b6b;font-weight:700">' + errors + '</sup>';
    }
  }

  var checks = [
    function() {
      var theme = document.documentElement.getAttribute('data-theme');
      var ok = !!theme;
      logLine('主题系统', ok, theme === 'dark' ? '深色模式' : '浅色模式', '未找到data-theme属性');
    },
    function() {
      var cfg = window.__SEASCRIBE_CONFIG__;
      var ok = !!cfg;
      logLine('主配置', ok, ok ? ('默认' + (cfg.theme === 'dark' ? '深色' : '浅色')) : '', 'config.js 未加载');
    },
    function() {
      var ok = !!window.__CHEMISTRY_CONFIG__;
      var detail = '';
      if (ok) {
        var c = window.__CHEMISTRY_CONFIG__;
        detail = 'H~Kr ' + (c.defaultRangeEnd || 36) + '元素';
      }
      logLine('化学配置', ok, detail, 'config/chemistry/config.js 缺失');
    },
    function() {
      var ok = !!window.__ENGLISH_CONFIG__;
      var detail = '';
      if (ok) {
        var c = window.__ENGLISH_CONFIG__;
        detail = '默认' + c.defaultCount + '题';
      }
      logLine('英语配置', ok, detail, 'config/english/config.js 缺失');
    },
    function() {
      var ok = !!(window.__SEASCRIBE_CONFIG__ && window.__CHEMISTRY_CONFIG__ && window.__ENGLISH_CONFIG__ && window.__PICKER_CONFIG__);
      var count = (!!window.__SEASCRIBE_CONFIG__) + (!!window.__CHEMISTRY_CONFIG__) + (!!window.__ENGLISH_CONFIG__) + (!!window.__PICKER_CONFIG__);
      logLine('配置汇总', ok, count + '/4 已加载', '部分配置缺失');
    },
    function() {
      var ok = !!SubjectRegistry;
      logLine('插件注册表', ok, '已就绪', 'core.js 未加载');
    },
    function() {
      var p = SubjectRegistry.get('chemistry');
      var ok = !!p;
      var detail = '';
      if (ok) detail = '默认' + (p.defaultCount || '?') + '题';
      logLine('化学插件', ok, detail, 'chemistry/plugin.js 未注册');
    },
    function() {
      var p = SubjectRegistry.get('english');
      var ok = !!p;
      var detail = '';
      if (ok) detail = '默认' + (p.defaultCount || '?') + '题';
      logLine('英语插件', ok, detail, 'english/plugin.js 未注册');
    },
    function() {
      var list = SubjectRegistry.list();
      var ok = list.length >= 2;
      logLine('插件总计', ok, list.length + ' 个已注册', '插件不足');
    },
    function() {
      var ok = !!document.getElementById('btn-picker');
      var detail = '';
      if (ok && window.__PICKER_CONFIG__) {
        var m = window.__PICKER_CONFIG__.methods;
        detail = (m ? m.length : 0) + '种随机方式';
      }
      logLine('点名系统', ok, detail, '按钮未渲染');
    },
    function() {
      var cfg = window.__PICKER_CONFIG__;
      var ok = !!cfg;
      var detail = '';
      if (ok) {
        var methods = cfg.methods || [];
        var def = methods.find(function(m) { return m.id === cfg.defaultMethod; });
        detail = '默认' + (def ? def.name : cfg.defaultMethod);
      }
      logLine('点名配置', ok, detail, 'config/picker/config.js 缺失');
    },
    function() {
      var ok = !!document.getElementById('subject-page');
      logLine('学科页面', ok, 'DOM已就绪', '未找到#subject-page');
    },
    function() {
      var ok = !!document.getElementById('dictation-page');
      logLine('听写页面', ok, 'DOM已就绪', '未找到#dictation-page');
    },
    function() {
      var ok = !!document.getElementById('card-grid');
      logLine('卡片容器', ok, 'DOM已就绪', '未找到#card-grid');
    },
    function() {
      var ok = !!document.querySelector('.controls');
      logLine('控制栏', ok, 'DOM已就绪', '未找到.controls');
    },
    function() {
      var ok = !!document.getElementById('btn-admin');
      logLine('管理入口', ok, 'DOM已就绪', '未找到#btn-admin');
    },
    function() {
      var ok = !!document.getElementById('btn-about');
      logLine('关于页面', ok, 'DOM已就绪', '未找到#btn-about');
    },
    function() {
      var ok = !!document.getElementById('btn-changelog');
      logLine('更新日志', ok, 'DOM已就绪', '未找到#btn-changelog');
    },
    function() {
      var ok = !!document.getElementById('btn-syslog');
      logLine('系统日志', ok, 'DOM已就绪', '未找到#btn-syslog');
    },
    function() {
      var ok = !!document.getElementById('pick-decorative');
      logLine('点名动画层', ok, 'DOM已就绪', '未找到#pick-decorative');
    },
    function() {
      var ok = typeof confetti !== 'undefined' || document.querySelector('script[src*="canvas-confetti"]') !== null;
      logLine('点名特效', ok, ok ? 'canvas-confetti' : '', 'CDN未加载（离线正常）');
    },
    function() {
      var sheets = document.styleSheets;
      var found = false;
      for (var s = 0; s < sheets.length; s++) {
        try { if (sheets[s].href && sheets[s].href.indexOf('theme.css') >= 0) { found = true; break; } } catch(e) {}
      }
      logLine('CSS主题文件', found, 'theme.css', '未加载');
    },
    function() {
      var ok = true;
      try { localStorage.setItem('_seascribe_test', '1'); localStorage.removeItem('_seascribe_test'); } catch(e) { ok = false; }
      logLine('本地存储', ok, '可用', 'localStorage不可用');
    },
    function() {
      var w = window.screen.width;
      var h = window.screen.height;
      var ratio = window.devicePixelRatio || 1;
      logLine('屏幕分辨率', true, w + '×' + h + (ratio > 1 ? ' @' + ratio + 'x' : ''), '');
    },
    function() {
      var img = document.querySelector('.topbar-logo');
      var ok = img && img.src.indexOf('.png') !== -1;
      logLine('Logo PNG', ok, '已加载', 'Logo未切换PNG');
    },
    function() {
      var sess = null;
      try { sess = JSON.parse(localStorage.getItem('seascribe_admin') || 'null'); } catch(e) {}
      var ok = !!(sess && sess.token);
      var detail = '';
      if (ok && sess.user) detail = sess.user.displayName || sess.user.nickname || sess.user.username;
      logLine('管理员会话', ok, detail || '已登录', '未登录（正常）');
    },
    function() {
      logLine('版本', true, 'v4.3.0', '');
    },
  ];

  var i = 0;
  function runCheck() {
    if (i < checks.length) {
      checks[i](); i++;
      log.scrollTop = log.scrollHeight;
      setTimeout(runCheck, 60);
    } else {
      updateBadge();
    }
  }
  setTimeout(runCheck, 500);

  splash.addEventListener('click', closeSplashFn, { once: true });
  document.addEventListener('keydown', closeSplashFn, { once: true });

  function closeSplashFn() {
    if (!splash || !splash.parentNode) return;
    splash.style.animation = 'splashOut 0.5s var(--ease) forwards';
    splash.addEventListener('animationend', function(e) {
      if (e.target === splash && e.animationName === 'splashOut') {
        splash.remove();
      }
    });
  }

  // ---- 系统日志按钮 ----
  var syslogOverlay = document.getElementById('syslog-overlay');
  var syslogBody = document.getElementById('syslog-body');

  window.SeaScribe.bindModal('syslog-overlay', 'btn-syslog-close-x');

  var syslogBtn = document.getElementById('btn-syslog');
  if (syslogBtn) {
    syslogBtn.addEventListener('click', function() {
    syslogOverlay.classList.remove('hidden');
    syslogBody.innerHTML = window.__SEASCRIBE_LOG__.map(function(l) {
      return '<div style="padding:3px 0;font-size:0.9rem">' +
        (l.ok ? '✅ ' : '❌ ') + l.label +
        ' <span style="opacity:0.5">' + l.text + '</span></div>';
    }).join('');
    setTimeout(function() { syslogBody.scrollTop = syslogBody.scrollHeight; }, 50);
  });
  }
})();
