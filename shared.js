/* ============================================
   TravelWinners B2B — Shared JavaScript
   ============================================ */
(function () {
  'use strict';

  var SURL = 'https://vjsludfjsphwnumuoqaj.supabase.co';
  var SKEY = 'sb_publishable_IluITb52iuwwHf9xgP99MA__KX-sNM6';

  var sb = null;
  try {
    sb = window.supabase.createClient(SURL, SKEY);
  } catch (e) {
    console.warn('Supabase init:', e);
  }

  // Expose globally
  window.TW = window.TW || {};
  window.TW.sb = sb;
  window.TW.lang = localStorage.getItem('tw-lang') || 'en';

  // Helper
  window.TW.$ = function (id) { return document.getElementById(id); };

  // Toast
  window.TW.toast = function (msg, isError) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(function () { t.className = 'toast'; }, 3000);
  };

  // Language
  window.TW.switchLang = function (l) {
    window.TW.lang = l;
    localStorage.setItem('tw-lang', l);
    var enBtn = document.getElementById('lang-en');
    var koBtn = document.getElementById('lang-ko');
    if (enBtn) enBtn.classList.toggle('active', l === 'en');
    if (koBtn) koBtn.classList.toggle('active', l === 'ko');
    document.querySelectorAll('[data-' + l + ']').forEach(function (el) {
      var v = el.getAttribute('data-' + l);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = v;
      } else {
        el.innerHTML = v;
      }
    });
  };

  // Init lang switcher buttons
  document.addEventListener('DOMContentLoaded', function () {
    var enBtn = document.getElementById('lang-en');
    var koBtn = document.getElementById('lang-ko');
    if (enBtn) {
      enBtn.addEventListener('click', function () { window.TW.switchLang('en'); });
    }
    if (koBtn) {
      koBtn.addEventListener('click', function () { window.TW.switchLang('ko'); });
    }
    // Apply saved language
    window.TW.switchLang(window.TW.lang);
  });

  // Auth guard — redirect to login if not logged in
  window.TW.requireAuth = function (callback) {
    if (!sb) { window.location.href = 'login.html'; return; }
    sb.auth.getSession().then(function (r) {
      if (r.data.session) {
        callback(r.data.session.user);
      } else {
        window.location.href = 'login.html';
      }
    }).catch(function () {
      window.location.href = 'login.html';
    });
  };

  // Logout
  window.TW.logout = function () {
    if (sb) {
      sb.auth.signOut().then(function () {
        localStorage.removeItem('tw-session-email');
        window.location.href = 'login.html?logout=1';
      }).catch(function () {
        localStorage.removeItem('tw-session-email');
        window.location.href = 'login.html?logout=1';
      });
    } else {
      localStorage.removeItem('tw-session-email');
      window.location.href = 'login.html?logout=1';
    }
  };

})();
