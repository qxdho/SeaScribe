/* ============================================================
   SeaScribe — Splash Screen + System Log
   分阶段自检，细化条目，快速启动
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

  function logPhase(title) {
    var span = document.createElement('div');
    span.className = 'splash-log-line';
    span.innerHTML = '<span style="opacity:0.35">── ' + title + ' ──</span>';
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

    // ====== 阶段 1：运行环境 ======
    function() { logPhase('运行环境'); },
    function() {
      var ok = true;
      try { localStorage.setItem('_st', '1'); localStorage.removeItem('_st'); } catch(e) { ok = false; }
      logLine('localStorage', ok, '读写正常', '不可用');
    },
    function() {
      var w = window.screen.width, h = window.screen.height;
      var ratio = window.devicePixelRatio || 1;
      logLine('屏幕', true, w + '×' + h + (ratio > 1 ? ' @' + ratio + 'x' : ''), '');
    },
    function() {
      var ua = navigator.userAgent;
      var browser = '未知';
      if (/Edg\//.test(ua)) browser = 'Edge'; else if (/Chrome\//.test(ua)) browser = 'Chrome';
      else if (/Firefox\//.test(ua)) browser = 'Firefox'; else if (/Safari\//.test(ua)) browser = 'Safari';
      logLine('浏览器', true, browser, '');
    },
    function() {
      logLine('在线状态', navigator.onLine, navigator.onLine ? '在线' : '离线', '离线');
    },

    // ====== 阶段 2：配置系统 ======
    function() { logPhase('配置系统'); },
    function() {
      var cfg = window.__SEASCRIBE_CONFIG__;
      var ok = !!cfg;
      logLine('主配置 config.js', ok, ok ? ('默认' + (cfg.theme === 'dark' ? '深色' : '浅色') + '主题') : '', '未加载');
    },
    function() {
      var ok = !!window.__CHEMISTRY_CONFIG__;
      var detail = '';
      if (ok) {
        var c = window.__CHEMISTRY_CONFIG__;
        detail = 'H~Kr ' + (c.defaultRangeEnd || 36) + '元素，默认' + (c.defaultCount || '?') + '题';
      }
      logLine('化学配置', ok, detail, 'config/chemistry/config.js 缺失');
    },
    function() {
      var ok = !!window.__ENGLISH_CONFIG__;
      var detail = '';
      if (ok) {
        var c = window.__ENGLISH_CONFIG__;
        detail = '默认' + c.defaultCount + '题' + (c.promptCol !== undefined ? '，听写列=' + String.fromCharCode(65 + c.promptCol) : '');
      }
      logLine('英语配置', ok, detail, 'config/english/config.js 缺失');
    },
    function() {
      var cfg = window.__PICKER_CONFIG__;
      var ok = !!cfg;
      var detail = '';
      if (ok) {
        var methods = cfg.methods || [];
        detail = methods.length + '种随机方式';
      }
      logLine('点名配置', ok, detail, 'config/picker/config.js 缺失');
    },
    function() {
      var total = (!!window.__SEASCRIBE_CONFIG__) + (!!window.__CHEMISTRY_CONFIG__) + (!!window.__ENGLISH_CONFIG__) + (!!window.__PICKER_CONFIG__);
      var ok = total === 4;
      logLine('配置汇总', ok, total + '/4 已加载', (4-total) + ' 个缺失');
    },

    // ====== 阶段 3：样式系统 ======
    function() { logPhase('样式系统'); },
    function() {
      var theme = document.documentElement.getAttribute('data-theme');
      logLine('主题模式', !!theme, theme === 'dark' ? '深色' : '浅色', 'data-theme 缺失');
    },
    function() {
      var sheets = document.styleSheets;
      var cssFiles = [];
      for (var s = 0; s < sheets.length; s++) {
        try { if (sheets[s].href) { var m = sheets[s].href.match(/\/([^\/]+\.css)$/); if (m) cssFiles.push(m[1]); } } catch(e) {}
      }
      var ok = cssFiles.length >= 10;
      logLine('CSS 文件', ok, cssFiles.length + ' 个已加载', cssFiles.length + ' 个（偏少）');
    },
    function() {
      var sheets = document.styleSheets;
      var found = false;
      for (var s = 0; s < sheets.length; s++) {
        try { if (sheets[s].href && sheets[s].href.indexOf('theme.css') >= 0) { found = true; break; } } catch(e) {}
      }
      logLine('theme.css', found, '已加载', '未找到');
    },

    // ====== 阶段 4：插件系统 ======
    function() { logPhase('插件系统'); },
    function() {
      logLine('注册表 SubjectRegistry', !!SubjectRegistry, '已就绪', 'core.js 未加载');
    },
    function() {
      var p = SubjectRegistry.get('chemistry');
      var ok = !!p;
      var detail = '';
      if (ok) detail = '默认' + (p.defaultCount || '?') + '题，' + (p._data ? p._data.length : 0) + '元素';
      logLine('化学插件', ok, detail, '未注册');
    },
    function() {
      var p = SubjectRegistry.get('english');
      var ok = !!p;
      var detail = '';
      if (ok) detail = '默认' + (p.defaultCount || '?') + '题';
      logLine('英语插件', ok, detail, '未注册');
    },
    function() {
      var list = SubjectRegistry.list();
      var ok = list.length >= 2;
      logLine('插件总计', ok, list.length + ' 个已注册', '不足（需≥2）');
    },

    // ====== 阶段 5：核心 DOM ======
    function() { logPhase('核心 DOM'); },
    function() { logLine('开屏层 #splash', !!splash, '就绪', '缺失'); },
    function() { logLine('顶栏 header.topbar', !!document.querySelector('header.topbar'), '就绪', '缺失'); },
    function() { logLine('学科页 #subject-page', !!document.getElementById('subject-page'), '就绪', '缺失'); },
    function() { logLine('听写页 #dictation-page', !!document.getElementById('dictation-page'), '就绪', '缺失'); },
    function() { logLine('卡片容器 #card-grid', !!document.getElementById('card-grid'), '就绪', '缺失'); },
    function() { logLine('控制栏 .controls', !!document.querySelector('.controls'), '就绪', '缺失'); },
    function() { logLine('更多菜单 #more-menu', !!document.getElementById('more-menu'), '就绪', '缺失'); },
    function() { logLine('管理入口 #btn-admin', !!document.getElementById('btn-admin'), '就绪', '缺失'); },

    // ====== 阶段 6：模态弹窗 ======
    function() { logPhase('模态弹窗'); },
    function() { logLine('点名弹窗 #picker-modal', !!document.getElementById('picker-modal'), '就绪', '缺失'); },
    function() { logLine('点名动画层 #pick-decorative', !!document.getElementById('pick-decorative'), '就绪', '缺失'); },
    function() { logLine('更新日志弹窗', !!document.getElementById('changelog-overlay'), '就绪', '缺失'); },
    function() { logLine('系统日志弹窗', !!document.getElementById('syslog-overlay'), '就绪', '缺失'); },
    function() { logLine('关于弹窗', !!document.getElementById('about-overlay'), '就绪', '缺失'); },

    // ====== 阶段 7：外部依赖 ======
    function() { logPhase('外部依赖'); },
    function() {
      var img = document.querySelector('.topbar-logo');
      var ok = !!(img && img.complete && img.naturalWidth > 0);
      logLine('Logo 图片', ok, ok ? (img.naturalWidth + '×' + img.naturalHeight) : '', '未加载或破损');
    },
    function() {
      var ok = typeof confetti !== 'undefined' || document.querySelector('script[src*="canvas-confetti"]') !== null;
      logLine('confetti CDN', ok, ok ? (typeof confetti !== 'undefined' ? '已就绪' : '脚本已加载') : '', 'CDN 不可达（离线正常）');
    },

    // ====== 阶段 8：会话状态 ======
    function() { logPhase('会话状态'); },
    function() {
      var sess = null;
      try { sess = JSON.parse(localStorage.getItem('seascribe_admin') || 'null'); } catch(e) {}
      var ok = !!(sess && sess.token);
      var detail = '';
      if (ok && sess.user) detail = sess.user.displayName || sess.user.nickname || sess.user.username;
      logLine('管理员会话', ok, detail || '已登录', '未登录');
    },

    // ====== 阶段 9：汇总 ======
    function() { logPhase('汇总'); },
    function() {
      logLine('SeaScribe 版本', true, 'v4.3.2', '');
    },
  ];

  var i = 0;
  function runCheck() {
    if (i < checks.length) {
      checks[i](); i++;
      log.scrollTop = log.scrollHeight;
      setTimeout(runCheck, 20);
    } else {
      updateBadge();
    }
  }
  setTimeout(runCheck, 100);

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
