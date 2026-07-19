/* ============================================================
   SeaScribe — Page Navigator (ES Module)
   ============================================================ */

import { SeaScribe } from '../core/state.js';

const subjectPage   = document.getElementById('subject-page');
const dictationPage = document.getElementById('dictation-page');
const brandLogo     = document.getElementById('brand-logo');
const btnBack       = document.getElementById('btn-back');

SeaScribe.switchToPage = function(show, hide) {
  return new Promise(function(resolve) {
    hide.classList.add('page-exit');
    hide.addEventListener('animationend', function() {
      hide.classList.add('hidden'); hide.classList.remove('page-exit');
      show.classList.remove('hidden'); show.classList.add('page-enter');
      show.addEventListener('animationend', function() {
        show.classList.remove('page-enter');
        resolve();
      }, { once: true });
    }, { once: true });
  });
};

SeaScribe.goHome = async function() {
  location.hash = '';
  dictationPage.style.removeProperty('--card-font-scale');
  await SeaScribe.switchToPage(subjectPage, dictationPage);
  subjectPage.scrollIntoView({ behavior: 'smooth' });
};

brandLogo.addEventListener('click', function() { SeaScribe.goHome(); });
btnBack.addEventListener('click', function() { SeaScribe.goHome(); });
