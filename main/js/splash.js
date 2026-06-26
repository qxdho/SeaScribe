/* ============================================================
   SeaScribe — Splash Screen + System Log
   ============================================================ */

(function() {
  var splash = document.getElementById('splash');
  var log = document.getElementById('splash-log');

  // 全局日志存储
  window.__SEASCRIBE_LOG__ = [];

  function logLine(msg, ok) {
    window.__SEASCRIBE_LOG__.push({ msg: msg, ok: ok });
    var span = document.createElement('div');
    span.className = 'splash-log-line';
    span.innerHTML = (ok ? '✅ ' : '❌ ') + msg;
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
    function() { logLine('主题系统', !!document.documentElement.getAttribute('data-theme')); },
    function() { logLine('主配置', !!window.__SEASCRIBE_CONFIG__); },
    function() { logLine('化学配置', !!window.__CHEMISTRY_CONFIG__); },
    function() { logLine('英语配置', !!window.__ENGLISH_CONFIG__); },
    function() { logLine('插件注册表', !!SubjectRegistry); },
    function() { logLine('化学插件', !!SubjectRegistry.get('chemistry')); },
    function() { logLine('英语插件', !!SubjectRegistry.get('english')); },
    function() { logLine('点名系统', !!document.getElementById('stdlist-select')); },
    function() { logLine('学科页面', !!document.getElementById('subject-page')); },
    function() { logLine('听写页面', !!document.getElementById('dictation-page')); },
    function() { logLine('卡片容器', !!document.getElementById('card-grid')); },
    function() { logLine('控制栏', !!document.querySelector('.controls')); },
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
      return '<div style="padding:3px 0;font-size:0.9rem">' + (l.ok ? '✅ ' : '❌ ') + l.msg + '</div>';
    }).join('');
  });

  document.getElementById('btn-syslog-close').addEventListener('click', function() {
    syslogOverlay.classList.add('hidden');
  });

  syslogOverlay.addEventListener('click', function(e) {
    if (e.target === syslogOverlay) syslogOverlay.classList.add('hidden');
  });
})();
