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

### 2-9. Tinted Overlay (glow, hover bg) — **결정 D1 반영 (모던 syntax)**

> **방침**: 알파 변형 토큰을 폭발시키지 않고, CSS Color Module Level 4 `rgb(from var(--x) r g b / α)` 모던 syntax 사용.
> **브라우저 지원**: Chrome 111+ (2023.3) / Safari 16.2 (2022.12) / Firefox 113 (2023.5) — 2026년 99.5%+ 지원.

#### 사용 패턴 (페이지 코드)

```css
/* glow 효과 — staff(파랑) */
.button:hover {
  box-shadow: 0 0 24px rgb(from var(--staff) r g b / 0.3);
}

/* hover background — ceo(노랑) */
.row:hover {
  background: rgb(from var(--ceo) r g b / 0.08);
}

/* boundary highlight — danger */
.alert {
  border: 2px solid rgb(from var(--danger) r g b / 0.5);
}
```

#### 베이스 토큰 (모던 syntax는 이 토큰들을 받아서 알파 자유 변형)

| 베이스 토큰 | 다크 | 라이트 | 용도 |
|---|---|---|---|
| `--staff` | `#2563eb` | `#1d4ed8` | 파랑 계열 glow/bg/border |
| `--auto` / `--success` | `#16a34a` / `#10B981` | `#15803d` / `#059669` | 녹색 계열 |
| `--ceo` / `--warn` | `#ca8a04` / `#F59E0B` | `#a16207` / `#D97706` | 노랑 계열 |
| `--danger` | `#EF4444` | `#DC2626` | 빨강 계열 |
| `--info` | `#06B6D4` | `#0891B2` | 청록 계열 |
| `--accent-purple-deep` | `#6d28d9` | `#5b21b6` | 보라 계열 (§2-10) |

#### 자주 쓰는 알파 단계 (참고용 — 토큰화 안 함)

| 시각 의미 | 알파 값 | 예시 |
|---|---|---|
| 거의 보이지 않음 | `0.04~0.08` | hover bg soft |
| 살짝 보임 | `0.10~0.18` | hover bg, soft border |
| 명시적 강조 | `0.25~0.35` | glow, focus ring |
| 강한 강조 | `0.40~0.60` | active glow, alert border |

> **금지**: `--staff-glow-soft`, `--ceo-bg-mid` 같은 알파-step 토큰을 신설하지 않는다 (단일 진실원 폭발 방지).
> **예외**: 자주 쓰는 1~2종(예: `--auto-bg`, `--staff-bg`, `--ceo-bg`)은 의미 명시 위해 토큰 유지 (이미 §2-6에 박힘).

### 2-10. 보라/분홍 명도 변형 — **결정 D3 반영 (3단계 × 2색 = 6토큰)**

> **방침**: 디자인 시스템 표준(Tailwind/Material/Radix)에 따라 색상당 deep/soft/bg 3단계만 정의.
> 알파 변형은 §2-9 모던 syntax로 처리 (예: `rgb(from var(--accent-purple-deep) r g b / 0.3)`).

#### 보라 (Purple)

| 토큰 | 다크 | 라이트 | 용도 |
|---|---|---|---|
| `--accent-purple-deep` | `#6d28d9` | `#5b21b6` | 강조 본체, hover/active |
| `--accent-purple-soft` | `#c4b5fd` | `#7c3aed` | 보조 글자, soft 강조 (다크에서 밝게, 라이트에서 진하게) |
| `--accent-purple-bg` | `rgba(124,58,237,.10)` | `rgba(124,58,237,.06)` | soft 배경 (정적, 자주 씀) |

> **구식 색 흡수**: `#534ab7`(admin.html 29회) → `--accent-purple-deep`로 통일. `#ede9fe`(라이트 잔재) → 라이트 모드 `--accent-purple-bg`로 흡수.

#### 분홍 (Pink/Magenta — Aurora-2)

| 토큰 | 다크 | 라이트 | 용도 |
|---|---|---|---|
| `--accent-pink-deep` | `#db2777` | `#be185d` | 강조 본체 |
| `--accent-pink-soft` | `#f9a8d4` | `#ec4899` | 보조 |
| `--accent-pink-bg` | `rgba(236,72,153,.10)` | `rgba(236,72,153,.06)` | soft 배경 |

### 2-11. status / priority 신설 — admin-status, admin-tasks 핵심

| 토큰 | 다크 | 라이트 | 용도 |
|---|---|---|---|
| `--status-pending` | `#2563eb` | `#1d4ed8` | tasks 상태 (`--staff`와 별도 — 의미 분리) |
| `--status-in-progress` | `#9333ea` | `#7e22ce` | tasks 상태 |
| `--priority-p0` | `#dc2626` | `#b91c1c` | P0 = `--danger`와 별칭 가능 |
| `--priority-p1` | `#ea580c` | `#c2410c` | P1 |
| `--priority-p2` | `#ca8a04` | `#a16207` | P2 = `--ceo`와 별칭 가능 |
| `--priority-p3` | `#64748b` | `#475569` | P3 (낮음) |

### 2-12. 라이트 잔재 색 처리 — **결정 D2 반영 (그대로 라이트 토큰 매핑)**

> **방침**: 다크 페이지에 잘못 박힌 라이트 색(slate-100/200/300, yellow-100, violet-100 등 42종)은 **의도 무시하지 않고 라이트 토큰에 그대로 매핑**.
> 다크 모드에서는 라이트 토큰이 자동 반전(다크 색)되어 표시되고, 라이트 모드에서는 의도 그대로 보존.

#### 라이트 잔재 색 → 라이트 토큰 매핑 표 (자주 등장 우선)

| 라이트 잔재 색 | 의미 | 매핑 토큰 (라이트 모드 값) |
|---|---|---|
| `#0f172a` | slate-900 (라이트 본체 글자) | `--ink` (라이트=`#1E293B`, 거의 동일) |
| `#1e293b` | slate-800 | `--ink` (라이트=`#1E293B` 정확히 일치) |
| `#334155` | slate-700 | `--ink-2` (라이트=`#334155` 정확히 일치) |
| `#475569` | slate-600 | `--ink-3` (라이트=`#475569` 정확히 일치) |
| `#64748b` | slate-500 | `--ink-4` (라이트=`#64748B` 정확히 일치) |
| `#94a3b8` | slate-400 | `--ink-5` (라이트=`#94A3B8` 정확히 일치) |
| `#cbd5e1` | slate-300 | `--line-2` (라이트 컬럼) |
| `#e2e8f0` | slate-200 | `--bg-4` (라이트=`#E2E8F0` 정확히 일치) |
| `#f1f5f9` | slate-100 | `--bg-3` (라이트=`#F1F5F9` 정확히 일치) |
| `#f8fafc` | slate-50 | `--bg` (라이트=`#F8FAFC` 정확히 일치) |
| `#ffffff` | white | `--bg-2` (라이트=`#FFFFFF` 정확히 일치) |

> **자동 반전 효과**: 다크 모드에서 페이지가 `var(--ink)`를 쓰면 `#FAFAFA`(흰), 라이트 모드에선 `#1E293B`(다크 회색) — 토글만 하면 자동 반전. 페이지 코드 수정 없음.

### 2-13. 무채색 회색 단계 (admin.html 구식 잔재)

> **방침**: `#888`(23회), `#999`(21회), `#666`(12회) 등은 ink 단계로 근사 매핑. 새 토큰 신설 안 함.

| 잔재 색 | 명도 | 매핑 |
|---|---:|---|
| `#999` | L=60% | `--ink-3` (`#A0A0B0`, L=68%) — 8% 차이, 시각적 거의 동일 |
| `#888` | L=53% | `--ink-3` (가까움) |
| `#666` | L=40% | `--ink-4` (`#6E6E80`, L=44%) |
| `#555` | L=33% | `--ink-5` (`#52525C`, L=34%) |
| `#444` `#333` | L=27% / 20% | `--bg-3` `--bg-2` 근사 |
| `#aaa` `#d8d8d8` `#e0e0e0` `#eee` | 라이트 잔재 | `--ink-2` ~ `--bg-4` 근사 (자동 반전 적용) |

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

---

## 7. 2단계 진행 상황 (1차)

**상태:** 🟡 진행 중 — 색 추출 완료, 토큰 확장안 설계 대기

### 7-1. 추출 결과
- 입력: `admin-status.html` 467곳 + `admin.html` 497곳 = **964곳**
- §2 토큰 1:1 매핑: **221곳 (22%)**
- 미매핑: **743곳 (78%) / 310종**
- CSV: `_os/playbook/admin-lightmode-color-map.csv` (단일 진실원)
- 분석: `_os/playbook/admin-lightmode-unmapped-analysis.md`

### 7-2. 정책 결정 (대표님)
- **D-022 후속 정책**: "디자인 정확도 우선" — §2 토큰 확장으로 실제 색 100% 커버
- 미매핑 색을 기존 토큰으로 근사 매핑하지 않음

### 7-3. 다음 세션 결정 사항 (3가지)
| 결정 | 주제 | 비고 |
|---|---|---|
| D1 | tinted-overlay 설계 (색별 α-step / color-mix() / rgb-from syntax) | §2-9 신규 카테고리 |
| D2 | blue-staff 라이트모드 오염 색 처리 (라이트 토큰 매핑 / 다크 강제) | 42종 157곳 |
| D3 | violet-aurora 명도 변형 토큰 수 (풀 5단계 / 핵심 3단계 / 빈도 기준) | §2-7 확장 |

### 7-4. 잔여 작업
1. D1/D2/D3 결정 받기
2. §2-9 (tinted-overlay) + §2-7 확장 설계
3. extract_colors.py 룩업 테이블 업데이트 → CSV 재생성 (매핑률 95%+ 목표)
4. §7 매핑 결과 표 (페이지별·토큰별·잔여) 본 섹션에 추가
5. 4단계 시안 검토로 진행

### 7-5. 재실행 가능 스크립트
- `scripts/extract_colors.py` — HTML → CSV 매핑 추출
- `scripts/analyze_unmapped.py` — 미매핑 색 HSL 카테고리 분류
