/* ============================================================
 * _os/skins/admin-theme-toggle.js — Admin 라이트/다크 토글
 * BL-ADMIN-LIGHTMODE step6 (D-022)
 * ============================================================
 *
 * 사용법: admin 페이지 head에 1줄 추가
 *   <script src="/_os/skins/admin-theme-toggle.js" defer></script>
 *
 * 동작:
 *   - localStorage('tw-admin-theme')에서 초기값 로드 → html[data-theme] + body[data-skin] 동시 적용
 *   - 처음이면 OS prefers-color-scheme 따라감
 *   - 페이지 로드 후 사이드바 하단에 토글 버튼 자동 주입
 *   - 토글 누르면 즉시 반전 + localStorage 저장
 *   - 모든 admin 페이지 동기화 (storage 이벤트 listen)
 * ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'tw-admin-theme';
  var html = document.documentElement;

  // 1. 초기 테마 결정
  function getInitialTheme() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (saved === 'light' || saved === 'dark') return saved;
    // 처음이면 OS 선호 따라감
    if (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function applyTheme(t) {
    if (t === 'light') {
      html.setAttribute('data-theme', 'light');
      if (document.body) document.body.dataset.skin = 'light';
    } else {
      html.setAttribute('data-theme', 'dark');
      if (document.body) document.body.dataset.skin = 'dark';
    }
  }

  // FOUC 방지 — body 도착 전에 html에 박기
  applyTheme(getInitialTheme());

  // 2. body 준비되면 data-skin 동기화 + 토글 버튼 주입
  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function injectToggle() {
    if (document.querySelector('.theme-toggle-fixed')) return; // 중복 방지
    var saved = getInitialTheme();
    if (document.body && !document.body.dataset.skin) {
      document.body.dataset.skin = saved;
    }

    var btn = document.createElement('button');
    btn.className = 'theme-toggle-fixed';
    btn.type = 'button';
    btn.setAttribute('aria-label', '라이트/다크 모드 전환');
    btn.title = 'Light / Dark 모드 (Alt+T)';
    btn.innerHTML =
      '<span class="tt-icon">' + (saved === 'light' ? '🌙' : '☀️') + '</span>' +
      '<span class="tt-label">' + (saved === 'light' ? '다크' : '라이트') + '</span>';

    btn.addEventListener('click', function () {
      var cur = html.getAttribute('data-theme') || 'dark';
      var next = cur === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
      btn.querySelector('.tt-icon').textContent = next === 'light' ? '🌙' : '☀️';
      btn.querySelector('.tt-label').textContent = next === 'light' ? '다크' : '라이트';
    });

    document.body.appendChild(btn);
  }

  function bindShortcut() {
    document.addEventListener('keydown', function (e) {
      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        var btn = document.querySelector('.theme-toggle-fixed');
        if (btn) btn.click();
      }
    });
  }

  function bindStorageSync() {
    // 다른 탭에서 토글 시 자동 동기화
    window.addEventListener('storage', function (e) {
      if (e.key !== STORAGE_KEY) return;
      var v = e.newValue;
      if (v === 'light' || v === 'dark') {
        applyTheme(v);
        var btn = document.querySelector('.theme-toggle-fixed');
        if (btn) {
          btn.querySelector('.tt-icon').textContent = v === 'light' ? '🌙' : '☀️';
          btn.querySelector('.tt-label').textContent = v === 'light' ? '다크' : '라이트';
        }
      }
    });
  }

  onReady(function () {
    injectToggle();
    bindShortcut();
    bindStorageSync();
  });
})();
