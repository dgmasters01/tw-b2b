# 작업 인계서 (Handoff) — BL-ADMIN-LIGHTMODE step 5 fix

> 직전 채팅: step 4 (Before/After 검토) 완료 — **FAIL 판정**
> 갱신: 2026-05-10 (Claude, 3번 정석 결정 — 새 채팅에서 fix)

---

## 🚨 새 클로드 — 작업 시작 전 절대 의무

위 자동 prepend 헤더(BL-CLAUDE-DISCIPLINE) 그대로 따를 것. 추가:

**🔥 헌법 라이브 fetch 의무 강화 (2026-05-10 대표님 지시)**:
인계서만 믿지 말 것. 작업 진입 전 다음 3개 라이브 fetch 강제:
1. `OPERATIONS_CHARTER.md` (헌법 본문)
2. `CLAUDE.md` (Claude 행동 매뉴얼)
3. `_os/playbook/claude-discipline.md` (디테일 단일 진실원)

**위반 사례 (이번 채팅 발생)**: 헌법을 라이브로 안 읽고 인계서 헤더만 보고 작업 → 대표님이 "헌법 수정된 내용 안 읽고 작업한다"고 지적. 절대 반복 금지.

---

## 직전 채팅에서 완료된 일

### step 4 검토 결과 (FAIL)

admin-status + admin-tasks 다크/라이트 양쪽 라이브 캡처 비교 → **결함 3개 확정**.

**검토 보고서**: `_os/handoff/BL-ADMIN-LIGHTMODE_step4_review.md` (라이브 fetch 필수)

### 결함 요약 (보고서 본문에 상세)

| # | 위치 | 증상 | 심각도 |
|---|------|------|-------|
| 1 | `_admin/admin-status.html` head | shared.css `<link>` 누락 → 라이트 모드 자체 작동 안 함 | 🔴 치명 |
| 2 | `_admin/admin-tasks.html` 본문 | 다크 전용 하드코딩 색 30+곳 → 흰 배경에 흰 글자 | 🟡 중 |
| 3 | `_admin/admin-tasks.html` 진행률 바 | linear-gradient(90deg, #a855f7, #ec4899) 하드코딩 → 라이트에서 채도 잃음 | 🟡 중 |

### 통과 항목 (재작업 불필요)

- 시그니처 그라디언트(타이틀, 핑크 배지) — 양쪽 정상 (D-022 단일 진실원 OK)
- admin-tasks 배경 자체 전환 — `--bg`, `--bg-2` 정상 반전

---

## 🎯 다음 시작 단계 — step 5 fix

**현재 진행률**: 4/6 (66%)

### 작업 순서 (Claude 자율 — 정석 5기준)

1. **결함 1 fix** — admin-status.html `<head>` shared.css link 1줄 추가
   - commit: `fix(BL-ADMIN-LIGHTMODE step5a): admin-status shared.css link 누락 fix`
   - 약 5분
2. **결함 2 fix** — admin-tasks.html 본문 하드코딩 색 → shared.css 토큰 변환
   - grep으로 대상 식별 → 1:1 매핑 후 sed/str_replace
   - commit: `fix(BL-ADMIN-LIGHTMODE step5b): admin-tasks 다크 잔재 색 토큰 변환`
   - 약 20~30분
3. **결함 3 fix** — 진행률 바 그라디언트 토큰화 (결함 2와 같은 commit 가능)
4. **재검토** — 동일 스크립트로 재캡처 + BEFORE/AFTER 비교
   - 통과 시 step 5 done `[step:done:5]` 박음
5. **step 6** — 사이드바 하단 토글 + localStorage (다음 단계)

### 재검토 스크립트 위치

이전 세션 `/home/claude/shoot_local.py`는 세션 종료로 사라짐. 새 채팅에서 동일 로직 재작성 필요:
- 로컬 정적 서버 (포트 8765, root: tw-b2b clone 경로)
- Playwright Chromium 1440x900 viewport
- `document.documentElement.setAttribute('data-theme', '${theme}')` 강제 토글
- 다크/라이트 4종 full_page 캡처

---

## 🔧 핵심 라이브 상태

- **헌법**: `OPERATIONS_CHARTER.md` (200줄 이하 강제)
- **결정**: D-022 (BL-ADMIN-LIGHTMODE 5결정)
- **shared.css**: `[data-theme="light"]` 블록 150~243줄 + OS 자동 적용 245~277줄 — **확정, 손대지 말 것**
- **단일 진실원**: shared.css. 페이지 :root는 alias만. 하드코딩 금지.

---

## 🚨 핵심 의무 (헌법 부칙 16)

- 첫 응답 5줄 양식 강제
- 단계 1개 = commit 1개 + `[step:done:N]` 태그
- 디자인 변경 시 BEFORE/AFTER 스크린샷 의무
- 보고는 "어디 가서 무엇을 누르면 무엇이 보이는지" 4줄
- 묻는 것 = 4가지(비즈니스/서비스/틀/디자인 큰 방향)뿐
