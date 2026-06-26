/* ============================================================
   SeaScribe — Splash Screen
   ============================================================ */

(function() {
  var splash = document.getElementById('splash');
  var log = document.getElementById('splash-log');

  function logLine(msg, ok) {
    var span = document.createElement('div');
    span.className = 'splash-log-line';
    span.innerHTML = (ok ? '✅ ' : '❌ ') + msg;
    log.appendChild(span);
  }

  var checks = [
    function() { logLine('主配置', !!window.__SEASCRIBE_CONFIG__); },
    function() { logLine('化学配置', !!window.__CHEMISTRY_CONFIG__); },
    function() { logLine('英语配置', !!window.__ENGLISH_CONFIG__); },
    function() { logLine('化学插件', !!SubjectRegistry.get('chemistry')); },
    function() { logLine('英语插件', !!SubjectRegistry.get('english')); },
    function() { logLine('学生名单', !!document.getElementById('stdlist-select')); },
    function() { logLine('页面元素', !!document.getElementById('card-grid')); }
  ];

  var i = 0;
  function runCheck() {
    if (i < checks.length) {
      checks[i](); i++;
      log.scrollTop = log.scrollHeight;
      setTimeout(runCheck, 30);
    }
  }
  setTimeout(runCheck, 400);

  splash.addEventListener('click', function closeSplash() {
    splash.style.animation = 'splashOut 0.5s var(--ease) forwards';
    splash.addEventListener('animationend', function(e) {
      if (e.target === splash && e.animationName === 'splashOut') {
        splash.remove();
      }
    });
  }, { once: true });
})();
