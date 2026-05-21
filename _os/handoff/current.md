# 인계서 — BL-COMMON-HEADER-UNIFY Step 3·4·5

**작성**: 2026-05-21 (commit e98fa04 이후)
**작성자**: claude
**다음 채팅 Claude가 fetch할 위치**: `_os/handoff/current.md`

---

## 🚦 채팅 라우팅 권장: ⚠️ 새 채팅 권장

**사유**: Step 3·4·5 = large 작업 (shared.js 함수 신설 + shared.css BEM 추가 + 7개 페이지 마이그레이션 + Playwright 라이브 검증). 한 채팅 토큰 압박 가능성.

---

## 🎯 어디서부터 이어갈지

**현재 진행률**: 40% (2 / 5 단계 완료)

**다음 시작 단계**: ⏳ **Step 3 — shared.js에 renderCommonHeader() 함수 박음 + shared.css에 .tw-header BEM 박음**

---

## 📋 즉시 fetch (Claude가 자동 실행)

### 1. 헌법 3종 (의무)
- `OPERATIONS_CHARTER.md` (176 lines)
- `CLAUDE.md` (149 lines)
- `_os/playbook/claude-discipline.md` (231 lines)

### 2. boot.md
- `_os/boot.md` (129 lines)

### 3. **이 작업 전용 설계 자료** (가장 중요)
- `docs/design/BL-COMMON-HEADER-UNIFY/before-header-audit.md` — 7개 페이지 현재 상태
- `docs/design/BL-COMMON-HEADER-UNIFY/design-spec.md` — **함수 시그니처·BEM 클래스·마이그레이션 패턴 박힘**

### 4. 라이브 코드
- `shared.js` (498 lines) — IIFE 안 `TW = { ... }` 객체에 renderCommonHeader 키 추가
- `shared.css` — 파일 끝에 `.tw-header__*` BEM 섹션 추가
- 매니저 페이지 7개 (Step 4에서 마이그레이션)

---

## 🧭 북극성

**매니저가 모든 페이지에서 Sign out·Settings·언어전환을 동일한 방법으로 사용한다.**

---

## 🎯 한 채팅 한 결정 (다음 채팅)

**Step 3·4·5 중 어디까지를 한 채팅에 박을지 — 시작 시 자가 판단.**

권장 분할:
- **Plan A** (안전): 한 채팅 = Step 3만 (함수 + CSS). Step 4·5는 다음 채팅.
- **Plan B** (적극): 한 채팅 = Step 3 + Step 4 (1~3개 페이지). 남은 페이지·Step 5는 다음.
- **Plan C** (한방): Step 3·4·5 한 채팅 — 권장 안 함. 토큰 끊김 시 반토막.

---

## 📍 Step 3 작업 명세 (즉시 시작 가능)

### A. shared.js 박음

위치: 현재 line 470~498 구간 (IIFE 안 TW 객체 마지막)

`statusColor` 키 뒤에 콤마 박고 `renderCommonHeader` 키 추가:

```javascript
statusColor: function (s) { ... },   // ← 마지막 콤마 박음

renderCommonHeader: function (opts) {
  // design-spec.md 3번 항목 의사 코드 그대로 박음
  ...
}
```

### B. shared.css 박음

파일 끝에 design-spec.md 4번 항목 BEM CSS 그대로 박음.

### C. 검증 (이번 단계 안에서)

- `node -e "..."` 로 shared.js 문법 통과 확인
- 빈 HTML 테스트 페이지 만들어 함수 호출 → 헤더 렌더 시각 확인 (로컬, push 전)

### D. commit 메시지

```
feat(BL-COMMON-HEADER-UNIFY): shared.js renderCommonHeader() + shared.css .tw-header BEM 박음 [step:done:3]

[변경사유]
design-spec.md 명세 그대로 박음. 페이지별 헤더 클래스 5종(.dh-logout/.mk-btn-out/...)
파편화 해소 + 매니저가 모든 페이지에서 동일 헤더 사용 가능하도록 인프라 구축.
```

---

## 📍 Step 4 작업 명세

### 마이그레이션 순서 (영향 적은 것부터)
1. `settings.html` — 현재 헤더 없음 → 빈 컨테이너만 박음
2. `marketing.html` — 가장 단순
3. `sales.html`
4. `hotel-info.html`
5. `booking-analytics.html` — id `ba-btn-logout` 케이스
6. `dashboard.html`
7. `manager-dashboard.html` — 기존 `.md-topbar` 풀 코드 제거 + `#tw-common-header` 박는 교체

### 각 페이지 3곳 변경
- HTML: 기존 헤더 블록 → `<header id="tw-common-header"></header>`
- JS init() 안: `TW.renderCommonHeader({ activeTab: '...' });`
- 페이지 내 헤더 전용 CSS 블록 → 삭제

### commit 단위
**옵션 A 권장**: 페이지 1개당 commit 1개 = 7개 commit. subject는 마지막 페이지에 `[step:done:4]`.
**옵션 B**: 7개 한 commit. subject `[step:done:4]`.

---

## 📍 Step 5 작업 명세

- Playwright 임시 paid 계정 생성 → 7개 페이지 진입 → 헤더 동작 전수 검증
- 패턴: `_screenshots/2026-05-21-bl-mgr-dash-signout/verify_signout.js`
- 환경변수 필요: `SUPABASE_SERVICE_ROLE_KEY`
- 캡처 저장: `_screenshots/2026-05-21-bl-common-header-unify/` 폴더
- commit subject: `[step:done:5]`

### 검증 체크리스트 (design-spec.md 8번)
- [ ] `#tw-common-header` 컨테이너 7개 페이지 모두 존재
- [ ] Sign out 클릭 → `/login.html` 이동
- [ ] Settings 클릭 → `/settings.html` 진입
- [ ] EN/한 토글 → 페이지 텍스트 즉시 변경
- [ ] activeTab 강조 정상

---

## ⚠️ 절대 금지

- ❌ 기존 페이지별 헤더 클래스(`.dh-logout`, `.mk-btn-out`, `.hi-btn-out`, `.sl-btn-out`, `.ba-btn-out`) **즉시 삭제** — 옵션 B(점진 마이그레이션) 권장. deprecation 주석만 박고 다음 BL에서 제거.
- ❌ "임시로 inline 박을게요" — 헌법 위반 (Aurora 디자인 토큰 의무)
- ❌ shared.css에 inline 또는 별도 CSS 추가 — `shared.css` 단일 파일에만 박음 (CLAUDE.md 5번)
- ❌ design-spec.md 명세에서 자기 마음대로 벗어남 — 명세 자체 수정 필요 시 대표님께 결정 먼저

---

## 🚨 헌법 의무 재확인

- 부칙 7: 단계 1개 = commit 1개, subject `[step:done:N]` 태그
- 부칙 12: 매 응답 첫 줄 `[작업 소요: ...]`
- 부칙 13: 두 번째 줄 `🚦 ✅/⚠️`
- 부칙 16: 첫 5줄 강제 양식
- 헌법 12조: 그림 일치 — 진행 중에도 보고
- 12대 원칙 12조: 자체 검증 의무 — push 전 본인이 작동 확인

---

## 📊 작업 진행 메타

- **BL ID**: BL-COMMON-HEADER-UNIFY
- **카테고리**: ux / **우선순위**: P1 / **크기**: large
- **진척**: 2 / 5 (40%) — 이번 채팅에서 80% 거짓 → 40% 정정 + 1·2단계 실제 박음
- **이전 commit**: `e98fa04` (Step 1·2 박음)
- **chat-log**: `_chat-logs/2026-05-21-bl-common-header-unify-step1-2.md`
