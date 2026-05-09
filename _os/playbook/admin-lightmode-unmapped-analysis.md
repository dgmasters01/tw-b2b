# BL-ADMIN-LIGHTMODE 2단계 — 미매핑 색 분석 결과

**작업일:** 2026-05-10 (2단계 1차)
**입력:** admin-status.html (467곳) + admin.html (497곳) = **총 964곳**
**1차 결과:** §2 토큰 1:1 매핑 221곳 (22%) / 미매핑 743곳 (78%) / 미매핑 종류 310종
**관련 파일:**
- `_os/playbook/admin-lightmode-color-map.csv` — 964곳 전수 매핑 표 (단일 진실원)
- `_os/playbook/admin-lightmode-tokens.md` — 토큰 정의 (§2)
- `extract_colors.py`, `analyze_unmapped.py` — 재실행 가능 스크립트

---

## 1. 카테고리별 분류 (HSL 자동 분류)

| 카테고리 | 종류 | 사용 곳 | 비고 |
|---|---:|---:|---|
| **tinted-overlay** | 129 | **191** | 🔴 §2에 카테고리 자체 없음 — §2-9 신규 필요 |
| **blue-staff (라이트모드 색)** | 42 | 157 | 라이트모드 의도 색이 다크 페이지에 하드코딩됨 |
| **green-success-auto** | 22 | 59 | --success 변형 다수 |
| **red-danger** | 16 | 57 | --danger 변형 다수 |
| **orange-warn** | 26 | 47 | --warn 변형 |
| **ink-3-4 (무채색 중간)** | 2 | 44 | `#888`(23) `#999`(21) — Ink 단계 사이 |
| **violet-aurora** | 15 | 42 | `#534ab7`(29) — aurora purple 변형 |
| **ink** | 6 | 32 | `#e0e0e0`(11) `#eee`(6) 등 |
| **yellow-ceo** | 11 | 23 | --ceo 변형 |
| **ink-5** | 3 | 19 | `#666`(12) — 비활성/메타 |
| **surface-bg** | 3 | 18 | `#1a1a1a`(11) `#222`(4) |
| **shadow** | 11 | 17 | rgba(0,0,0,α) — α 다양 |
| **glass-line-white** | 8 | 12 | rgba(255,255,255,α) — α 다양 |
| **ink-2** | 7 | 9 | `#d8d8d8` `#aaa` 등 |
| **surface-bg3** | 3 | 7 | `#555`(4) |
| **magenta-pink-aurora** | 4 | 4 | 거의 안 씀 |
| **surface-bg2** | 1 | 4 | `#333`(4) |
| **surface-deepest** | 1 | 1 | `#0a0a0a` |

---

## 2. 핵심 패턴 4가지 (§2 확장 설계의 근거)

### 2-1. 🔴 tinted-overlay — §2-9 신규 카테고리 필수
- **129종 191곳** — 미매핑 중 최대 그룹
- 사용처: `box-shadow`, hover 배경, glow 효과, 강조 boundary
- 패턴: 토큰 색(--staff/--ceo/--danger/--aurora-1 등) + α(0.04~0.85)
- 상위 사용:
  - `rgba(99,102,241,0.3)` 7회 — staff blue glow
  - `rgba(99,102,241,0.08)` 5회 — staff blue soft bg
  - `rgba(251,191,36,0.4)` 4회 — ceo glow
  - `rgba(147,51,234,0.3)` 4회 — aurora purple glow
  - `rgba(34,197,94,0.2)` 4회 — success bg
- **설계 방향**: 베이스 토큰별 α 단계(`--staff-glow-soft/-mid/-strong`) 또는 CSS `color-mix()` 활용

### 2-2. blue-staff 42종 — 라이트모드 색 하드코딩 (오염)
- `#534ab7`(29) `#94a3b8`(12) `#60a5fa`(11) `#64748b`(10) `#1e293b`(9) `#cbd5e1`(9) `#6366f1`(8) `#e2e8f0`(8) `#f1f5f9`(7) `#e5e7eb`(6) `#0f172a`(3) `#f8fafc`(3) `#334155`(2) ...
- 이 중 다수가 §2 라이트 컬럼 값과 일치 (예: `#1e293b` = 라이트 `--ink`)
- **원인**: 페이지 작성 시 라이트/다크 구분 없이 자유롭게 색 사용
- **설계 방향**: 다크모드 토큰으로 강제 매핑 (라이트 진입 시 자동 전환)

### 2-3. violet-aurora 15종 — aurora 보조 stops
- `#534ab7`(29) `#6d28d9`(8) `#c4b5fd`(14) `#ede9fe`(4) `#8b5cf6`(2) `#a855f7`(2) ...
- §2-7 aurora는 4개 stop만 정의(`#7c3aed → #ec4899 → #f59e0b → #06b6d4`)
- 실제로는 보라 계열의 명도 변형(`#534ab7` = aurora-1 darker, `#c4b5fd` = aurora-1 lighter)이 다수 사용됨
- **설계 방향**: `--aurora-1-deep`, `--aurora-1-soft`, `--aurora-1-bg` 등 명도 변형 토큰 추가

### 2-4. 무채색 회색 단계 부족
- `#888`(23) `#999`(21) `#666`(12) `#555`(4) `#444`(2) `#777`(2) ...
- §2-4 Ink 단계: `--ink-3`(`#A0A0B0`, L=68%) → `--ink-4`(`#6E6E80`, L=44%) → `--ink-5`(`#52525C`, L=34%)
- 빠진 단계: L=53%(`#888`), L=60%(`#999`), L=40%(`#666`)
- **설계 방향**: ①`#888` `#999`를 `--ink-3`로 근사(20% 명도차) 또는 ②`--ink-3a`(`#999`) `--ink-3b`(`#888`) 단계 추가

---

## 3. 다음 세션에서 결정할 사항 (대표님 결정 필요)

### 결정 D1: tinted-overlay 토큰 설계 방식
- **A. 색별 α-step**: `--staff-glow-soft/mid/strong`, `--ceo-glow-soft/mid/strong` 등 (토큰 +30~50개)
  - → 결과: 명시적, 자동완성 잘 됨, 라이트모드 변환 명확
- **B. CSS color-mix()**: `color-mix(in srgb, var(--staff) 8%, transparent)` 패턴으로 인라인 사용
  - → 결과: 토큰 폭발 방지, 모던 CSS, 다만 IE/구형 브라우저 미지원(2026년엔 OK)
- **C. 베이스 토큰 + alpha-token 조합**: `rgb(from var(--staff) r g b / 0.3)` 같은 모던 syntax
  - → 결과: 가장 정석, Chrome 111+ 필요(2026년 OK)

### 결정 D2: blue-staff 라이트모드 오염 색 처리
- **A. 그대로 라이트 토큰 매핑** — `#1e293b` → `--ink`(라이트 모드에선 그대로, 다크에선 자동 반전)
- **B. 다크 톤으로 통일** — 의도 무시하고 다크 토큰으로 강제

### 결정 D3: violet-aurora 명도 변형 토큰 수
- **A. 풀 단계** (-deep, -mid, -soft, -bg, -text 5단계) — Aurora 1·2 각각
- **B. 핵심 3단계만** (-deep, -soft, -bg)
- **C. 사용 빈도 기준 추가** (`#534ab7`만 추가, 나머지는 색별 근사 매핑)

---

## 4. 다음 세션 작업 계획 (2단계 잔여)

```
Step A. 위 D1/D2/D3 결정 받기 (대표님)
Step B. 결정 기반으로 §2 토큰 확장안 설계 → playbook §2-9, §2-10 추가
Step C. extract_colors.py 룩업 테이블 업데이트 → CSV 재생성 (목표: 매핑률 95%+)
Step D. playbook §7에 매핑 결과 요약 표 추가 (페이지별·토큰별·미매핑 잔여)
Step E. commit + push + ops 메일
```

---

**Last updated:** 2026-05-10 (2단계 1차 — 분석 완료, 토큰 확장안 미정)
