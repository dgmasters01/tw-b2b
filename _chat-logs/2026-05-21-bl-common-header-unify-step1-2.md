---
slug: 2026-05-21-bl-common-header-unify-step1-2
title: BL-COMMON-HEADER-UNIFY 진척률 정정 + Step 1·2 실제 작업물 박음
date: 2026-05-21
tasks: [BL-COMMON-HEADER-UNIFY]
commits: [e98fa04]
decisions: []
---

## 🎯 한 줄 요약

대표님이 admin-status.html 진행 중 박스에서 BL-COMMON-HEADER-UNIFY 카드(80% 표시) 클릭 → Claude 라이브 fetch 결과 실체 0% 발견(auto-detect-bot 오매핑) → 진척률 80%→40% 정정 + Step 1(BEFORE 분석) · Step 2(설계 명세) 실제 박음.

## 📍 무엇을 박았나

### Phase 1: 진척률 거짓 발견

- tasks.json: `progress.percent=80, completed_count=4/5` 박힘
- 라이브 grep: `shared.js` 내 `renderCommonHeader` 정의 0건, 7개 매니저 페이지 어디에도 호출 0건
- 원인 추적: `progress_warning.detected_by_commit=24496a6` — BL-MGR-DASH-SIGNOUT 핫픽스 commit subject의 `[step:done:1~4]` 태그를 auto-detect-bot이 본 BL로 잘못 매핑
- 대표님께 보고 → "2번(정정 + 1·2단계 박기)" 선택

### Phase 2: 7개 매니저 페이지 헤더 전수 grep

| 페이지 | 헤더 컨테이너 | 로그아웃 | Settings | 언어 토글 | 클래스명 |
|---|---|---|---|---|---|
| dashboard.html | (명시 없음) | ✅ btn-logout | ✅ | ❌ | dh-logout |
| marketing.html | (명시 없음) | ✅ btn-logout | ✅ | ❌ | mk-btn-out |
| hotel-info.html | (명시 없음) | ✅ btn-logout | ✅ | ❌ | hi-btn-out |
| sales.html | (명시 없음) | ✅ btn-logout | ✅ | ❌ | sl-btn-out |
| booking-analytics.html | (명시 없음) | ✅ ba-btn-logout ⚠️ | ✅ | ❌ | ba-btn-out |
| manager-dashboard.html | ✅ md-topbar | ✅ md-signout-btn ⚠️ | ✅ (아이콘만) | ✅ | md-signout-btn, md-menu-btn |
| settings.html | ✅ st-topbar | ❌ | ❌ (현재 페이지) | ❌ | st-back만 |

**핵심 발견**: 기존 chat-log(`2026-05-21-bl-mgr-dash-signout-and-ux-audit.md`)의 "설정 진입 누락 6건" 표는 라이브 코드와 불일치. 실제 문제는 **누락이 아니라 파편화**(클래스명 5종 분산, id 일관성 깨짐, 언어 토글은 manager-dashboard에만, Settings 아이콘 표기 3종, settings.html 자체 헤더 없음).

### Phase 3: Step 1 박음 — BEFORE 전수 분석 보고서

`docs/design/BL-COMMON-HEADER-UNIFY/before-header-audit.md` (124 lines):
- 7개 페이지 헤더 구조 매트릭스
- 파편화 5대 문제 명시
- Step 4 마이그레이션 영향 범위 (약 150라인 → 7라인, -143라인)
- 옵션 A/B/C 권장 (B = 점진 마이그레이션)

### Phase 4: Step 2 박음 — 설계 명세서

`docs/design/BL-COMMON-HEADER-UNIFY/design-spec.md` (236 lines):
- `TW.renderCommonHeader(opts)` 함수 시그니처 + 5개 매개변수
- BEM 클래스 HTML 구조 (`.tw-header__*`)
- 함수 동작 8단계 의사 코드
- shared.css에 박을 BEM CSS (모바일 768px 반응형 포함)
- 페이지 마이그레이션 패턴 (HTML 1줄 + JS 1줄 + CSS 클래스 제거)
- 호환성 안전장치 4개
- Step 5 검증 체크리스트

### Phase 5: tasks.json 정정

- `progress.percent`: 80 → 40
- Step 1·2: `done=True`, `artifact` 경로 박힘
- Step 3·4·5: `done=False`로 정상화
- `design_artifacts` 배열 2건 등록 (design-artifacts-rule.md 의무)
- `history` 1건 추가 — 정정 사유 영구 기록
- `progress_warning_resolved_at` 박음

## 🧠 결정 (대표님)

**선택**: 2번 — 진척률 정정 + 이 채팅에서 1·2단계만 박고 끊음

**왜**:
- 거짓 80%를 두면 다른 의사결정 왜곡 (헌법 12조 위반)
- 3·4·5단계는 large 작업(shared.js 신설 + 7개 페이지 마이그레이션 + 라이브 검증) → 한 채팅 무리
- 1·2단계(분석 + 설계)는 코드 안 건드리는 안전한 작업이라 이 채팅에서 가능

## ⚠️ 알아두기 (다음 채팅 Claude용)

### 즉시 fetch 할 것
1. `docs/design/BL-COMMON-HEADER-UNIFY/before-header-audit.md` — 페이지별 현재 상태
2. `docs/design/BL-COMMON-HEADER-UNIFY/design-spec.md` — 함수 시그니처와 BEM 클래스

### Step 3 시작 시 박을 것
- `shared.js`의 IIFE 안 (현재 line 470~498 구간) `TW = { ... }` 객체에 `renderCommonHeader` 키 추가
- `shared.css` 파일 끝에 `/* === tw-header (BEM) === */` 섹션 추가
- design-spec.md 5번 항목 참조

### Step 4 마이그레이션 순서 (영향 적은 것부터)
1. `settings.html` (현재 헤더 없음 → 빈 컨테이너만 박음)
2. `marketing.html` (가장 단순)
3. `sales.html`
4. `hotel-info.html`
5. `booking-analytics.html` (id 불일치 케이스)
6. `dashboard.html`
7. `manager-dashboard.html` (이미 풀 헤더 박혀있음 — 기존 `.md-topbar` 코드 제거 + `#tw-common-header` 박는 단순 교체)

### Step 5 검증
- Playwright 임시 paid 계정 생성 패턴은 `_screenshots/2026-05-21-bl-mgr-dash-signout/verify_signout.js` 참조
- 환경변수 `SUPABASE_SERVICE_ROLE_KEY` 필요

### 절대 안 박을 것
- 기존 페이지별 클래스(`.dh-logout`, `.mk-btn-out`, `.hi-btn-out`, `.sl-btn-out`, `.ba-btn-out`) 즉시 삭제 ❌
  → 옵션 B(점진 마이그레이션) 권장. deprecation 마커만 박고 다음 BL에서 제거.

## 📊 commit

- `e98fa04` — fix(BL-COMMON-HEADER-UNIFY): 진척률 80%→40% 정정 + Step 1·2 실제 작업물 박음 [step:done:1][step:done:2]
