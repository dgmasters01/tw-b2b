# BL-COMMON-HEADER-UNIFY — Step 2: shared.js `renderCommonHeader()` 설계 명세

**작성일**: 2026-05-21
**작성자**: claude
**Step 3에서 이 명세대로 shared.js에 박을 함수.**

---

## 1. 함수 시그니처

```javascript
TW.renderCommonHeader(opts) → void
```

### opts 매개변수

| 키 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `mountId` | string | 선택 | 헤더 박을 컨테이너 id. 기본 `'tw-common-header'` |
| `activeTab` | string | 필수 | 'dashboard' / 'marketing' / 'hotel-info' / 'sales' / 'analytics' / 'manager-dashboard' / 'settings' 중 1개 |
| `pageTitle` | string | 선택 | 헤더 우측 페이지 라벨 (영문). 안 주면 activeTab 기반 자동 박음 |
| `pageTitleKo` | string | 선택 | 페이지 라벨 (한글). 안 주면 자동 매핑 |
| `showTabs` | boolean | 선택 | 매니저 페이지 탭 노출 여부. 기본 `true` |

---

## 2. 함수가 박는 HTML 구조 (BEM 클래스)

```html
<div class="tw-header">
  <a href="/" class="tw-header__logo">
    <div class="tw-header__logo-icon">G</div>
    <div class="tw-header__logo-text">GOHOTELWINNERS</div>
    <div class="tw-header__logo-sub" data-en="..." data-ko="...">...</div>
  </a>

  <nav class="tw-header__nav">
    <a href="/dashboard.html" class="tw-header__tab" data-tab="dashboard" data-en="Home" data-ko="홈">Home</a>
    <a href="/marketing.html" class="tw-header__tab" data-tab="marketing" data-en="Marketing" data-ko="마케팅">Marketing</a>
    <a href="/hotel-info.html" class="tw-header__tab" data-tab="hotel-info" data-en="Hotel Info" data-ko="호텔 정보">Hotel Info</a>
    <a href="/sales.html" class="tw-header__tab" data-tab="sales" data-en="Sales" data-ko="영업">Sales</a>
    <a href="/booking-analytics.html" class="tw-header__tab" data-tab="analytics" data-en="Analytics" data-ko="분석">Analytics</a>
    <!-- activeTab과 data-tab 일치하면 .tw-header__tab--active 추가 -->
  </nav>

  <div class="tw-header__right">
    <div class="tw-header__lang">
      <button class="tw-header__lang-btn tw-header__lang-btn--active" data-lang="en">EN</button>
      <button class="tw-header__lang-btn" data-lang="ko">한</button>
    </div>
    <div class="tw-header__user">
      <div class="tw-header__user-avatar" id="tw-user-initial">·</div>
      <span class="tw-header__user-name" id="tw-user-name">Loading...</span>
    </div>
    <a href="/settings.html" class="tw-header__settings" aria-label="Settings" title="Settings" data-en="Settings" data-ko="설정">⚙️ Settings</a>
    <button class="tw-header__signout" id="tw-signout-btn" data-en="Sign out" data-ko="로그아웃">Sign out</button>
  </div>
</div>
```

---

## 3. 함수 동작 (의사 코드)

```javascript
TW.renderCommonHeader = function (opts) {
  opts = opts || {};
  var mountId = opts.mountId || 'tw-common-header';
  var activeTab = opts.activeTab;
  var showTabs = opts.showTabs !== false;
  var mount = document.getElementById(mountId);

  if (!mount) {
    console.warn('[TW.renderCommonHeader] mount 컨테이너 없음:', mountId);
    return;
  }

  // 1. activeTab 기반 페이지 타이틀 자동 매핑 (opts에 안 줬으면)
  var titleMap = {
    'dashboard':         { en: 'Dashboard',         ko: '대시보드' },
    'marketing':         { en: 'Marketing',         ko: '마케팅' },
    'hotel-info':        { en: 'Hotel Info',        ko: '호텔 정보' },
    'sales':             { en: 'Sales',             ko: '영업' },
    'analytics':         { en: 'Analytics',         ko: '분석' },
    'manager-dashboard': { en: 'Manager Dashboard', ko: '매니저 대시보드' },
    'settings':          { en: 'Settings',          ko: '설정' }
  };
  var pTitle = opts.pageTitle || (titleMap[activeTab] && titleMap[activeTab].en) || '';
  var pTitleKo = opts.pageTitleKo || (titleMap[activeTab] && titleMap[activeTab].ko) || '';

  // 2. HTML 빌드 (Step 2의 BEM 구조)
  var html = [...];   // 위 2번 항목 HTML을 문자열로

  // 3. mount에 박음
  mount.innerHTML = html;

  // 4. activeTab 강조 (.tw-header__tab--active 클래스 add)
  var tabs = mount.querySelectorAll('.tw-header__tab');
  tabs.forEach(function (t) {
    if (t.getAttribute('data-tab') === activeTab) {
      t.classList.add('tw-header__tab--active');
    }
  });

  // 5. 언어 토글 핸들러 (기존 TW.switchLang 재사용)
  var langBtns = mount.querySelectorAll('.tw-header__lang-btn');
  langBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var lang = b.getAttribute('data-lang');
      if (TW && typeof TW.switchLang === 'function') TW.switchLang(lang);
      langBtns.forEach(function (x) { x.classList.remove('tw-header__lang-btn--active'); });
      b.classList.add('tw-header__lang-btn--active');
    });
  });
  // 현재 언어 반영
  var curLang = (TW && TW.lang) || 'en';
  langBtns.forEach(function (b) {
    if (b.getAttribute('data-lang') === curLang) b.classList.add('tw-header__lang-btn--active');
    else b.classList.remove('tw-header__lang-btn--active');
  });

  // 6. Sign out 핸들러 바인딩
  var signoutBtn = document.getElementById('tw-signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', function () {
      if (TW && typeof TW.logout === 'function') {
        TW.logout();
      } else if (window.sb && window.sb.auth) {
        window.sb.auth.signOut().then(function () { window.location.replace('/login.html'); });
      }
    });
  }

  // 7. 사용자 정보 박기 (이미 페이지가 TW.user 박았다고 가정 — 없으면 빈값 유지)
  if (TW && TW.user) {
    var initEl = document.getElementById('tw-user-initial');
    var nameEl = document.getElementById('tw-user-name');
    var email = TW.user.email || '';
    if (initEl) initEl.textContent = (email[0] || '·').toUpperCase();
    if (nameEl) nameEl.textContent = email.split('@')[0] || 'User';
  }

  // 8. data-en/data-ko 즉시 적용
  if (TW && typeof TW.applyLang === 'function') TW.applyLang();
};
```

---

## 4. shared.css에 박을 BEM 클래스 (요약)

```css
/* === tw-header (공통 매니저 헤더, BL-COMMON-HEADER-UNIFY) === */
.tw-header { display:flex; align-items:center; justify-content:space-between;
             padding:14px 24px; border-bottom:1px solid var(--line-2);
             background:var(--bg-1); backdrop-filter:blur(20px); }
.tw-header__logo { display:flex; align-items:center; gap:10px; text-decoration:none; }
.tw-header__logo-icon { /* G 박스 */ }
.tw-header__logo-text { font-weight:700; color:var(--ink); font-family:var(--display); }
.tw-header__logo-sub { font-size:11px; color:var(--ink-3); margin-left:8px; }

.tw-header__nav { display:flex; gap:4px; }
.tw-header__tab { padding:8px 14px; border-radius:8px; color:var(--ink-2);
                  text-decoration:none; font-weight:500; transition:var(--transition); }
.tw-header__tab:hover { color:var(--ink); background:var(--glass); }
.tw-header__tab--active { background:var(--aurora); color:#fff; }

.tw-header__right { display:flex; align-items:center; gap:10px; }
.tw-header__lang { display:flex; gap:2px; background:var(--bg-2); border-radius:8px; padding:2px; }
.tw-header__lang-btn { background:transparent; border:none; color:var(--ink-3);
                       padding:5px 10px; border-radius:6px; cursor:pointer; font-size:12px; }
.tw-header__lang-btn--active { background:var(--glass-2); color:var(--ink); }
.tw-header__user { display:flex; align-items:center; gap:8px; }
.tw-header__user-avatar { width:28px; height:28px; border-radius:50%; background:var(--aurora);
                          display:flex; align-items:center; justify-content:center;
                          color:#fff; font-weight:700; font-size:12px; }
.tw-header__user-name { color:var(--ink-2); font-size:13px; }
.tw-header__settings, .tw-header__signout {
  padding:7px 14px; border-radius:8px; background:var(--glass); color:var(--ink-2);
  border:1px solid var(--line-2); text-decoration:none; font-size:13px;
  cursor:pointer; transition:var(--transition); }
.tw-header__settings:hover, .tw-header__signout:hover {
  background:var(--glass-2); color:var(--ink); border-color:var(--line-3); }

/* 모바일 (768px 이하) — 탭 가로 스크롤 */
@media (max-width: 768px) {
  .tw-header { flex-wrap:wrap; padding:10px 14px; gap:10px; }
  .tw-header__nav { order:3; width:100%; overflow-x:auto; }
  .tw-header__user-name { display:none; }
}
```

---

## 5. 페이지 마이그레이션 패턴 (Step 4)

각 페이지 변경 3곳:

**HTML — 기존 헤더 블록 제거 후 빈 컨테이너만:**
```html
<header id="tw-common-header"></header>
```

**JS — init() 안에서 1줄:**
```javascript
TW.renderCommonHeader({ activeTab: 'marketing' });
```

**CSS — 페이지별 헤더 클래스(`.mk-btn-out` 등) 제거. shared.css 의존.**

---

## 6. 호환성 안전장치

1. **`TW.renderCommonHeader` 호출 전 mount 존재 안 하면 console.warn만, 페이지는 안 깨짐.**
2. **`TW.switchLang` 없으면 언어 토글만 비활성, 다른 기능은 작동.**
3. **`TW.logout` 없으면 supabase 직접 호출로 fallback.**
4. **`opts.activeTab` 잘못 박혀도 탭 강조만 안 됨. 헤더 자체는 정상 렌더.**

---

## 7. 박을 위치 (Step 3 commit 대상)

- `shared.js` — IIFE 안, `TW = { ... }` 객체에 `renderCommonHeader` 키 추가 (현재 line 470~498 구간)
- `shared.css` — 파일 끝에 `/* === tw-header ... */` 섹션 추가

---

## 8. 검증 방법 (Step 5)

- Playwright 임시 paid 계정 생성 → 7개 페이지 각각 진입 → 다음 체크:
  - [ ] `#tw-common-header` 컨테이너 존재
  - [ ] Sign out 버튼 클릭 시 `/login.html`로 이동
  - [ ] Settings 버튼 클릭 시 `/settings.html` 진입
  - [ ] EN/한 토글 클릭 시 페이지 텍스트 즉시 변경
  - [ ] activeTab 현재 페이지가 강조됨
