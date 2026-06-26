/* ============================================================
   SeaScribe — Splash Screen + System Log
   ============================================================ */

(function() {
  var splash = document.getElementById('splash');
  var log = document.getElementById('splash-log');

  window.__SEASCRIBE_LOG__ = [];

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
      var ok = !!document.documentElement.getAttribute('data-theme');
      logLine('主题系统', ok, '已加载', '未找到data-theme属性');
    },
    function() {
      var ok = !!window.__SEASCRIBE_CONFIG__;
      logLine('主配置', ok, '已加载', 'config.js 未加载');
    },
    function() {
      var ok = !!window.__CHEMISTRY_CONFIG__;
      logLine('化学配置', ok, '已加载', 'config/chemistry/config.js 缺失');
    },
    function() {
      var ok = !!window.__ENGLISH_CONFIG__;
      logLine('英语配置', ok, '已加载', 'config/english/config.js 缺失');
    },
    function() {
      var ok = !!SubjectRegistry;
      logLine('插件注册表', ok, '已就绪', 'core.js 未加载');
    },
    function() {
      var ok = !!SubjectRegistry.get('chemistry');
      logLine('化学插件', ok, '已注册', 'chemistry/plugin.js 未注册');
    },
    function() {
      var ok = !!SubjectRegistry.get('english');
      logLine('英语插件', ok, '已注册', 'english/plugin.js 未注册');
    },
    function() {
      var ok = !!document.getElementById('stdlist-select');
      logLine('点名系统', ok, 'DOM已就绪', '下拉框未渲染');
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

  splash.addEventListener('click', function closeSplash() {
    splash.style.animation = 'splashOut 0.5s var(--ease) forwards';
    splash.addEventListener('animationend', function(e) {
      if (e.target === splash && e.animationName === 'splashOut') {
        splash.remove();
      }
    });
  }, { once: true });

  // ---- 系统日志按钮 ----
  var syslogOverlay = document.getElementById('syslog-overlay');
  var syslogBody = document.getElementById('syslog-body');

  document.getElementById('btn-syslog').addEventListener('click', function() {
    syslogOverlay.classList.remove('hidden');
    syslogBody.innerHTML = window.__SEASCRIBE_LOG__.map(function(l) {
      return '<div style="padding:3px 0;font-size:0.9rem">' +
        (l.ok ? '✅ ' : '❌ ') + l.label +
        ' <span style="opacity:0.5">' + l.text + '</span></div>';
    }).join('');
  });

  document.getElementById('btn-syslog-close').addEventListener('click', function() {
    syslogOverlay.classList.add('hidden');
  });

  syslogOverlay.addEventListener('click', function(e) {
    if (e.target === syslogOverlay) syslogOverlay.classList.add('hidden');
  });
})();
