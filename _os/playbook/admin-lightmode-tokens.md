# admin 라이트 모드 — 확정 토큰 표

**작성일**: 2026-05-10
**적용 범위**: `_admin/admin-*.html` 13개 + `shared.css`
**상태**: ✅ 확정 (5결정 통과 — D-022)
**용도**: BL-ADMIN-LIGHTMODE 단계 2~5 작업 시 **단일 참조원** (Single Source of Truth).

---

## 1. 5결정 (D-022)

| # | 결정 | 확정값 |
|---|---|---|
| ① | 시안 색감 | 아래 표 그대로 (다크 기본 + 라이트 한 쌍) |
| ② | `admin-tasks.html` 라이트 잔재 | **다크로 통일** — 3단계에서 페이지 :root 9개 모두 삭제 시 자동 해소 |
| ③ | 본문 글자 라이트 ink | **`#1E293B`** (한 단계 부드럽게, 시안 `#0F172A`보다 부담 적음) |
| ④ | 토글 위치 | **사이드바 하단 공통** — 한 곳 = 13개 페이지 동시 적용 (헌법 부칙 8 자동 동기화) |
| ⑤ | 기본값 | **OS 설정 따라감** (`prefers-color-scheme`) + 사용자 토글이 우선 (localStorage 저장) |

---

## 2. 토큰 매핑 표 — 다크/라이트 한 쌍씩

### 2-1. 배경 단계 (Surface)

| 토큰 | 의미 | 다크 | 라이트 |
|---|---|---|---|
| `--bg` | 페이지 최하단 | `#0A0A0F` | `#F8FAFC` |
| `--bg-2` | 1차 카드/패널 | `#13131A` | `#FFFFFF` |
| `--bg-3` | 2차 카드/내부 | `#1C1C26` | `#F1F5F9` |
| `--bg-4` | 3차 (코드/입력) | `#25252F` | `#E2E8F0` |

### 2-2. 외곽선 (Line)

| 토큰 | 다크 | 라이트 |
|---|---|---|
| `--line` | `rgba(255,255,255,.08)` | `rgba(15,23,42,.08)` |
| `--line-2` | `rgba(255,255,255,.14)` | `rgba(15,23,42,.14)` |
| `--line-3` | `rgba(255,255,255,.22)` | `rgba(15,23,42,.22)` |

### 2-3. 글래스 (Glass overlay)

| 토큰 | 다크 | 라이트 |
|---|---|---|
| `--glass` | `rgba(255,255,255,.05)` | `rgba(15,23,42,.04)` |
| `--glass-2` | `rgba(255,255,255,.08)` | `rgba(15,23,42,.06)` |
| `--glass-3` | `rgba(255,255,255,.12)` | `rgba(15,23,42,.09)` |
| `--glass-4` | `rgba(255,255,255,.18)` | `rgba(15,23,42,.12)` |

### 2-4. 글자 단계 (Ink) — **결정③ 적용**

| 토큰 | 의미 | 다크 | 라이트 |
|---|---|---|---|
| `--ink` | 본문 (가장 진함) | `#FAFAFA` | **`#1E293B`** ← 결정③ |
| `--ink-2` | 본문 보조 | `#E5E5EE` | `#334155` |
| `--ink-3` | 메타 정보 | `#A0A0B0` | `#475569` |
| `--ink-4` | placeholder | `#6E6E80` | `#64748B` |
| `--ink-5` | 비활성 | `#52525C` | `#94A3B8` |

### 2-5. 상태 색 (Status)

| 토큰 | 다크 | 라이트 |
|---|---|---|
| `--success` | `#10B981` | `#059669` |
| `--warn` | `#F59E0B` | `#D97706` |
| `--danger` | `#EF4444` | `#DC2626` |
| `--info` | `#06B6D4` | `#0891B2` |

### 2-6. 3-State 배지 (admin-status.html 핵심)

| 토큰 | 다크 | 라이트 |
|---|---|---|
| `--auto` | `#16a34a` | `#15803d` |
| `--auto-bg` | `rgba(22,163,74,.10)` | `rgba(22,163,74,.12)` |
| `--auto-text` | `#86efac` | `#166534` |
| `--staff` | `#2563eb` | `#1d4ed8` |
| `--staff-bg` | `rgba(96,165,250,.10)` | `rgba(37,99,235,.10)` |
| `--staff-text` | `#93c5fd` | `#1e40af` |
| `--ceo` | `#ca8a04` | `#a16207` |
| `--ceo-bg` | `rgba(251,191,36,.10)` | `rgba(202,138,4,.12)` |
| `--ceo-text` | `#fcd34d` | `#854d0e` |

### 2-7. 그라디언트 (Aurora — 브랜드)

| 토큰 | 다크 | 라이트 |
|---|---|---|
| `--aurora` | `linear-gradient(135deg,#7C3AED 0%,#EC4899 35%,#F59E0B 65%,#06B6D4 100%)` | 동일 |
| `--aurora-soft` | `linear-gradient(135deg,rgba(124,58,237,.3),rgba(236,72,153,.3) 50%,rgba(6,182,212,.3))` | `linear-gradient(135deg,rgba(124,58,237,.12),rgba(236,72,153,.12) 50%,rgba(6,182,212,.12))` |

### 2-8. 그림자 (Shadow)

| 토큰 | 다크 | 라이트 |
|---|---|---|
| `--sh-1` | `0 1px 2px rgba(0,0,0,.4)` | `0 1px 2px rgba(15,23,42,.06)` |
| `--sh-2` | `0 8px 24px rgba(0,0,0,.4)` | `0 4px 12px rgba(15,23,42,.08)` |
| `--sh-3` | `0 24px 60px -12px rgba(0,0,0,.6)` | `0 12px 32px -8px rgba(15,23,42,.12)` |

---

## 3. 적용 메커니즘 (5단계에서 박을 코드 골격)

### 3-1. shared.css 추가 블록

```css
/* :root 다크는 기존 그대로 유지 — 변경 없음 */

[data-theme="light"] {
  --bg: #F8FAFC; --bg-2: #FFFFFF; --bg-3: #F1F5F9; --bg-4: #E2E8F0;
  --line: rgba(15,23,42,.08); --line-2: rgba(15,23,42,.14); --line-3: rgba(15,23,42,.22);
  --glass: rgba(15,23,42,.04); --glass-2: rgba(15,23,42,.06);
  --glass-3: rgba(15,23,42,.09); --glass-4: rgba(15,23,42,.12);
  --ink: #1E293B; --ink-2: #334155; --ink-3: #475569; --ink-4: #64748B; --ink-5: #94A3B8;
  --success: #059669; --warn: #D97706; --danger: #DC2626; --info: #0891B2;
  --auto: #15803d; --auto-bg: rgba(22,163,74,.12); --auto-text: #166534;
  --staff: #1d4ed8; --staff-bg: rgba(37,99,235,.10); --staff-text: #1e40af;
  --ceo: #a16207; --ceo-bg: rgba(202,138,4,.12); --ceo-text: #854d0e;
  --aurora-soft: linear-gradient(135deg, rgba(124,58,237,.12), rgba(236,72,153,.12) 50%, rgba(6,182,212,.12));
  --sh-1: 0 1px 2px rgba(15,23,42,.06);
  --sh-2: 0 4px 12px rgba(15,23,42,.08);
  --sh-3: 0 12px 32px -8px rgba(15,23,42,.12);
}

/* 결정⑤ — OS 설정 따라가되, 사용자 토글이 우선 */
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]):not([data-theme="light"]) {
    /* OS가 라이트면 위 [data-theme="light"] 토큰을 적용 — 토큰 중복 없이 변수 재할당 */
    --bg: #F8FAFC; --bg-2: #FFFFFF; --bg-3: #F1F5F9; --bg-4: #E2E8F0;
    /* ... (위와 동일, shared.css에 :is() 또는 :where() 셀렉터로 한 번만 박기) */
  }
}
```

> **3단계 정석**: `:where(html[data-theme="light"], :root:not([data-theme])) where(@media prefers-color-scheme: light)` 이중 셀렉터로 토큰 1번만 박는 패턴 사용. 페이지 코드는 변수 이름만 알면 됨.

### 3-2. 토글 UI (사이드바 하단 — 결정④)

`shared-sidebar.html` 또는 sidebar.js 단일 진실원에 토글 1개. 13개 페이지 자동 적용.

```html
<button id="theme-toggle" aria-label="라이트/다크 전환">
  <span class="theme-icon-dark">🌙</span>
  <span class="theme-icon-light">☀️</span>
</button>
```

```js
// 1. 초기값 결정: localStorage > OS > 기본 다크
const stored = localStorage.getItem('tw-theme'); // 'light' | 'dark' | null
const osLight = matchMedia('(prefers-color-scheme: light)').matches;
const theme = stored || (osLight ? 'light' : 'dark');
document.documentElement.dataset.theme = theme;

// 2. 토글
document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('tw-theme', next);
});
```

---

## 4. 페이지 그룹 분류 (1단계 전수 조사 결과)

| 그룹 | 페이지 | 처리 방법 (3단계) |
|---|---|---|
| **그룹 1 — 자체 :root 다크** (7개) | `admin-business-charter`, `admin-decisions`, `admin-decisions-index`, `admin-manager-journey`, `admin-service-ops`, `admin-status`, `admin-user-journey` | :root 블록 삭제 → shared.css 토큰만 사용 |
| **그룹 2 — 자체 :root 라이트** (1개) | `admin-tasks` | :root 블록 삭제 → 결정② 자동 해소 |
| **그룹 3 — 자체 :root 글래스** (1개) | `admin-permissions` | :root 블록 삭제 |
| **그룹 4 — :root 없음** (4개) | `admin`, `admin-business`, `admin-gallery`, `admin-hub` | 변경 없음 (이미 정석) |

---

## 5. 하드코딩 색 위험도 (2단계 매핑 우선순위)

| 페이지 | rgba 개수 | hex 개수 | 우선순위 |
|---|---:|---:|---|
| `admin-status.html` | 219 | 248 | 🔴 P0 (Command Center) |
| `admin.html` | 60 | 437 | 🔴 P0 (대시보드) |
| `admin-tasks.html` | 22 | 85 | 🟠 P1 |
| `admin-permissions.html` | 22 | 17 | 🟡 P2 |
| `admin-service-ops.html` | 21 | 25 | 🟡 P2 |
| `admin-business-charter.html` | 17 | 29 | 🟡 P2 |
| `admin-decisions.html` | 17 | 29 | 🟡 P2 |
| `admin-decisions-index.html` | 17 | 29 | 🟡 P2 |
| `admin-manager-journey.html` | 17 | 29 | 🟡 P2 |
| `admin-user-journey.html` | 17 | 29 | 🟡 P2 |
| `admin-gallery.html` | 3 | 51 | 🟢 P3 |
| `admin-hub.html` | 3 | 8 | 🟢 P3 |
| `admin-business.html` | 0 | 56 | 🟢 P3 |

→ **2단계는 status + admin 두 페이지부터** (전체 위험의 60%+).

---

## 6. 다음 단계 작업 시 반드시 이 표 참조

- **2단계** (하드코딩 전수 매핑): 13개 페이지의 `rgba()` / `#hex` → 위 §2 토큰 1:1 매핑 표 작성
- **3단계** (shared.css 통합): 페이지 :root 9개 삭제 + shared.css에 §3-1 코드 박기
- **4단계** (시안 검토): admin-status + admin-tasks 2페이지 Before/After 스크린샷 → 대표님 확인
- **5단계** (코드 박기): 페이지 1개씩 commit, 단계 1개=commit 1개 (헌법 부칙 7)

---

**Last updated**: 2026-05-10
**Decision ref**: D-022 (DECISIONS.md)
**Chat log**: `_chat-logs/2026-05-10-bl-admin-lightmode-step1.md`
