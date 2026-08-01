/* ============================================================
   SeaScribe — Splash Screen + System Log (ES Module)
   ============================================================ */

import { SeaScribe, SubjectRegistry } from '../core/state.js';

var splash = document.getElementById('splash');
var log = document.getElementById('splash-log');

window.__SEASCRIBE_LOG__ = [];

if (splash) (function() {

  // 版本号自动填充 —— 唯一来源 config/config.js 的 window._CONF.main.version
  var cfgVer = (window._CONF && window._CONF.main && window._CONF.main.version) || '';
  var versionLabel = cfgVer ? 'v' + cfgVer : '';
  var splashVer = document.getElementById('splash-version');
  var topbarVer = document.getElementById('topbar-version');
  if (splashVer) splashVer.textContent = versionLabel;
  if (topbarVer) topbarVer.textContent = versionLabel;

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
    // 完整日志仅在「系统日志」弹窗查看，开屏保持简洁
  }

  function logPhase(title) {
    window.__SEASCRIBE_LOG__.push({ label: '── ' + title + ' ──', ok: true, text: '' });
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
    // 动态扫描所有 __XXX_CONFIG__ 全局变量
    function() {
      var keys = Object.keys(window).filter(function(k) { return /^__\w+_CONFIG__$/.test(k); });
      var loaded = 0;
      keys.forEach(function(k) {
        var cfg = window[k];
        var name = k.replace(/^__/, '').replace(/_CONFIG__$/, '');
        var ok = !!cfg && typeof cfg === 'object';
        if (ok) loaded++;
        var detail = ok ? '已加载' : '缺失';
        logLine(name + ' 配置', ok, detail, 'config/' + name + '/config.js 缺失');
      });
      if (keys.length === 0) {
        logLine('配置扫描', false, '未发现任何配置', '检查 config/ 目录');
      }
      logLine('配置汇总', loaded > 0, loaded + '/' + keys.length + ' 已加载', (keys.length - loaded) + ' 个缺失');
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
    // 动态列出已注册插件
    function() {
      var list = SubjectRegistry.list();
      if (list.length === 0) {
        logLine('插件扫描', false, '未注册任何插件', '检查 plugins/ 目录');
      } else {
        list.forEach(function(p) {
          var detail = (p.readerMode ? '[跟读] ' : '') + (p.defaultCount ? '默认' + p.defaultCount + '题' : '');
          logLine(p.meta.name + ' (' + p.meta.id + ')', true, detail || '已注册', '');
        });
      }
      logLine('插件总计', list.length > 0, list.length + ' 个已注册', '无');
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
      logLine('SeaScribe 版本', true, 'v' + (cfgVer || '未知'), '');
    },
  ];

  var i = 0;
  var _checksDone = false;
  var _closeQueued = false;
  function runCheck() {
    if (i < checks.length) {
      checks[i](); i++;
      setTimeout(runCheck, 0); // 立即完成自检，开屏无需等待
    } else {
      _checksDone = true;
      updateBadge();
      // 开屏仅在有问题时显示一行错误摘要（完整日志见系统日志弹窗）
      var errs = window.__SEASCRIBE_LOG__.filter(function(l) { return !l.ok; });
      if (errs.length > 0 && log) {
        log.innerHTML = '<div class="splash-log-line" style="color:#ff6b6b">⚠ 发现 ' + errs.length + ' 个问题（详见系统日志）</div>';
      }
      if (_closeQueued) closeSplashNow();
    }
  }
  setTimeout(runCheck, 50);

  splash.addEventListener('click', closeSplashFn, { once: true });
  document.addEventListener('keydown', closeSplashFn, { once: true });

  function closeSplashFn() {
    if (!splash || !splash.parentNode) return;
    if (!_checksDone) {
      _closeQueued = true;
      var hint = splash.querySelector('.splash-hint');
      if (hint) hint.textContent = '请等待自检完成…';
      return;
    }
    closeSplashNow();
  }

  function closeSplashNow() {
    splash.style.animation = 'splashOut 0.2s var(--ease-out) forwards';
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
