# 인계서 — BL-REVENUE-DASHBOARD Step 1 시작

**작성**: 2026-05-26
**다음 채팅 첫 fetch = 이 파일 1개로 충분.**

---

## 🚦 다음 채팅 첫 행동 (3줄로 끝)

1. `_os/boot.md` 1개 fetch (헌법 부팅)
2. **이 파일은 이미 읽음** → 추가 헌법 fetch 금지 (CHARTER·CLAUDE.md 안 읽음)
3. 아래 작업 명세 그대로 박기 시작

---

## 🎯 이 채팅 한 결정

**`booking-analytics.html` 현재 상태 분석 보고서 박음 = `docs/design/BL-REVENUE-DASHBOARD/before-audit.md` 1개 파일 박기.**

설계서·차트 코드·페이지 수정은 다음 다음 채팅.

---

## 📋 Step 1 작업 명세

### 박을 것 (1개 파일만)
경로: `docs/design/BL-REVENUE-DASHBOARD/before-audit.md`

### 내용 구조
1. `booking-analytics.html` 현재 라인 수 + 차트 영역 위치
2. 현재 박혀있는 차트 종류 (있다면) — selector·라이브러리·데이터 소스
3. 현재 매출 데이터 소스 = Supabase `payments` + `bookings_unified` view
4. 추가할 것 = 5개 토글(일·주·월·분기·년) + 3채널 분리(Self/Agoda/B2B)
5. 위험요소 = 페이지 라인수 1500+ 여부, 기존 차트 깨질 위험

### 박기 전 라이브 fetch 3개 (이게 전부)
- `booking-analytics.html` (라인수 확인 + 차트 섹션 grep)
- `tasks.json` → BL-REVENUE-DASHBOARD 진척 박을 자리
- `BACKLOG.md` → BL-REVENUE-DASHBOARD 요약

### commit subject
`docs(BL-REVENUE-DASHBOARD): before-audit.md 박음 [step:done:1]`

---

## 🧭 북극성

**대표님이 한 화면에서 "오늘·이번주·이번달·이번분기·올해 매출이 작년 대비 얼마나 늘었나, 어디서(Self/Agoda/B2B) 들어왔나" 5초 안에 본다.**

---

## ⚠️ 다음 채팅 절대 금지

- ❌ 헌법 본문(OPERATIONS_CHARTER.md·CLAUDE.md) 풀로 읽기 — boot.md 1개로 끝
- ❌ design-spec.md / Step 2 박기 — 이 채팅은 Step 1만
- ❌ `booking-analytics.html` 본문 수정 — 분석 보고서만 박음
- ❌ tasks.json 진척 100% 박기 — Step 1 done(20%)만

---

## 📊 BL-REVENUE-DASHBOARD 메타

- **ID**: BL-REVENUE-DASHBOARD
- **카테고리**: analytics / **우선순위**: P1 / **자율성**: 🟡 SEMI
- **출처**: autoheal:analytics-2026-05-13 + 대표님 2026-05-26 직접 지시
- **단계 총 5개**: 1.before-audit 2.design-spec 3.차트 코드 박기 4.페이지 적용 5.Playwright 검증
- **각 단계 = 1 채팅** (끊김 방지 부칙 16.1)

---

## 🔑 직전 BL 상태 (참고만)

- BL-COMMON-HEADER-UNIFY = ✅ 100% done (commit a9ea52e + 48a36c2 + cad4460)
- 후속 2건 pending: BL-MGR-DASH-HEADER-UNIFY / BL-COMMON-HEADER-CSS-CLEANUP

---

**호칭: 대표님. 언어: 한국어. 사업가 언어 강제(부칙 18).**
