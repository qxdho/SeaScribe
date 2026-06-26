/* ============================================================
   SeaScribe — Page Navigator
   ============================================================ */

(function() {
  const subjectPage   = document.getElementById('subject-page');
  const dictationPage = document.getElementById('dictation-page');
  const brandLogo     = document.getElementById('brand-logo');
  const btnBack       = document.getElementById('btn-back');

  window.SeaScribe.switchToPage = function(show, hide) {
    return new Promise(function(resolve) {
      hide.classList.add('page-exit');
      hide.addEventListener('animationend', function h() {
        hide.removeEventListener('animationend', h);
        hide.classList.add('hidden'); hide.classList.remove('page-exit');
        show.classList.remove('hidden'); show.classList.add('page-enter');
        show.addEventListener('animationend', function s() {
          show.removeEventListener('animationend', s);
          show.classList.remove('page-enter');
          resolve();
        }, { once: true });
      }, { once: true });
    });
  };

  window.SeaScribe.goHome = async function() {
    location.hash = '';
    dictationPage.style.removeProperty('--card-font-scale');
    await window.SeaScribe.switchToPage(subjectPage, dictationPage);
    subjectPage.scrollIntoView({ behavior: 'smooth' });
  };

  brandLogo.addEventListener('click', function() { window.SeaScribe.goHome(); });
  btnBack.addEventListener('click', function() { window.SeaScribe.goHome(); });
})();
