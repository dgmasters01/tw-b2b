# TW-B2B Phase 2 — Booking Analytics 통합 & 호텔 정보 동기화

> **이 문서는 Phase 2 작업의 단계별 인수인계 문서입니다.**
> 새 채팅에서 작업을 이어가려면: `tw-b2b PHASE2.md 읽고 [N]단계 작업해줘`

**최종 갱신**: 2026-04-27
**현재 단계**: Step 1 완료 / Step 2 대기
**작업자**: Claude (Anthropic) + 이지형 대표

---

## 0. PHASE 2 OVERVIEW

### 배경
Phase 1에서 admin.html과 booking-analytics.html(v9.1)을 통합 완료했음. 그러나 통합 직후 대표님 사용 중 3가지 이슈가 발견됨.

### 3대 핵심 이슈

| # | 이슈 | 영향도 | 작업 단계 |
|---|------|--------|-----------|
| 1 | **성급별 분류 부정확** — 평균단가 기준 추정이라 부정확. 호텔 마스터 DB와 미연결 | 🔴 핵심 | Step 2 |
| 2 | **스크롤 후 사이드바 메뉴 클릭 안 됨** — UX 치명적 | 🔴 즉시 | Step 1 |
| 3 | **booking-analytics.html이 한국어 단일** — TW B2B 영어 우선 정책 위반 | 🟡 큼 | Step 4 |

### 추가 핵심 작업
- **호텔 정보 동기화**: 호텔 매니저가 hotel-info.html에서 입력한 정보 → B2B 영업 탭의 호텔 기본정보 영역 자동 표시
- **성급 동기화**: hotels.star_rating → 성급별 탭 정확화
- 두 작업은 동일한 매칭 로직(agoda_hotel_id 또는 hotel_name)을 사용하므로 함께 진행

---

## 1. STEP TRACKER

### Step 1: 사이드바 클릭 버그 수정 — ✅ 완료 (2026-04-27)
**문제**: Analytics 탭(iframe) 안에서 스크롤 내리면 좌측 사이드바 메뉴 클릭 불가
**원인**: 사이드바가 `position:sticky; height:100vh`로 설정되어 있었으나, iframe 콘텐츠가 길어지면 sticky 컨텍스트가 흐트러져 스크롤 시 클릭 영역 침범 가능
**해결**:
- `.ad-sidebar`: `position:sticky` → `position:fixed; top:0; left:0; z-index:100`
- `.ad-content`: `margin-left:240px` 추가 (fixed 사이드바 자리 확보)
- 모바일(@media max-width:900px): `.ad-content{margin-left:0}` 추가하여 fixed 효과 해제

**완료 조건**:
- [x] 페이지 어디서든 사이드바 6개 메뉴 클릭 가능 (fixed로 항상 화면에 존재)
- [x] iframe 내부 스크롤은 정상 동작 (격리됨)
- [x] 모바일에서도 동작 (relative + flex-row로 자동 전환)

---

### Step 2: 호텔 정보 + 성급 동기화 — ⏸ 대기
**목표**: hotels 테이블 → booking-analytics.html 양방향 연결

**Sub-step 2.1**: B2B 영업 탭 호텔 기본정보 영역 채우기
- `rHtD()` 함수에서 Supabase REST API 호출
- agoda_hotel_id로 매칭 (1순위), hotel_name fuzzy match (2순위)
- 표시 항목: address / phone / contact_email / website / review_score / contact_name

**Sub-step 2.2**: 성급별 탭 정확화
- 현재: 가격으로 추정 (부정확)
- 개선: bookings_unified와 hotels 조인 → star_rating 사용
- 미매칭 호텔만 가격 추정 (fallback)

**완료 조건**:
- [ ] B2B 영업 → 호텔 클릭 시 hotels DB 정보 표시 (또는 "호텔 매니저 등록 대기 중" 표시)
- [ ] 성급별 차트가 hotels.star_rating 기반으로 정확
- [ ] 상단 노란 배너 "성급은 평균단가 기준 임의 추정" 제거

---

### Step 3: 매칭 정확도 향상 — ⏸ 대기
**문제**: 아고다 리포트 호텔명 vs hotels.hotel_name 100% 일치 어려움
**해결**:
- bookings_agoda 테이블에 agoda_hotel_id 컬럼 추가 (이미 있을 수 있음 - 확인 필요)
- 호텔명 정규화 함수 (소문자, 특수문자 제거, '&' → 'and' 등)
- 미매칭 호텔 리스트를 admin에서 수동 매칭 가능하도록

**완료 조건**:
- [ ] 매칭률 95% 이상
- [ ] 미매칭 호텔 리스트 admin에서 확인 가능

---

### Step 4: i18n (영문/한국어 토글) — ⏸ 대기 (큰 작업)
**목표**: booking-analytics.html을 영어 기본 + 한국어 토글로 변경

**전략**:
- shared.js의 T.i18n 시스템 활용 (이미 있음)
- 모든 한국어 텍스트를 data-en/data-ko로 변경
- 작업량: 약 200~300개 문자열

**완료 조건**:
- [ ] 페이지 로드 시 영어 기본
- [ ] 우상단 EN/한국어 토글 버튼
- [ ] 모든 차트 라벨, 표 헤더, 버튼, 메시지 다국어 지원

---

## 2. TECHNICAL CONTEXT

### Supabase hotels 테이블 (이미 존재 - Phase 2에서 활용)
```
id                  uuid PK
user_id             uuid (호텔 매니저 가입한 user)
agoda_hotel_id      bigint  ⭐ 매칭 키 1순위
agoda_url           text
hotel_name          text NOT NULL
star_rating         numeric  ⭐ 성급 동기화 소스
review_score        numeric
review_count        integer
daily_rate          numeric
address             text     ⭐ B2B 영업 탭 표시
phone               text     ⭐ B2B 영업 탭 표시
website             text     ⭐ B2B 영업 탭 표시
contact_name        text     ⭐ 영업 담당자
contact_email       text     ⭐ 이메일
contact_phone       text
whatsapp            text
google_place_id     text
google_photos       jsonb
city, country       text
status              text (pending/approved/published)
created_at, updated_at, approved_at, paid_at, published_at
```

### 관련 파일
- **hotel-info.html** (538줄): 호텔 매니저용 정보 입력 페이지 (이미 완성. T.db.createHotel 사용)
- **admin.html**: 통합 운영 콘솔 (Analytics 탭 = iframe)
- **booking-analytics.html**: v9.1 분석 페이지 (1MB, 정적 데이터)
- **shared.js**: T.db, T.requireAuth, T.i18n 등 공유 함수

### 매칭 로직 (Step 2에서 사용)
```js
// 1순위: agoda_hotel_id 일치
// 2순위: 호텔명 정규화 후 일치
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}
```

---

## 3. CHANGE LOG (Phase 2)

| 날짜 | Step | 변경사항 | 커밋 |
|------|------|----------|------|
| 2026-04-27 | - | PHASE2.md 신규 작성 | (이번 커밋) |
| 2026-04-27 | Step 1 | 사이드바 fixed positioning 적용 (스크롤 후 메뉴 클릭 불가 버그 해결) | (이번 커밋) |

---

## 4. 새 채팅 사용법

### 표준 명령어
```
tw-b2b PHASE2.md 읽고 Step [N] 작업해줘
```

### 자주 쓰는 명령
```
tw-b2b PHASE2.md 읽고 다음 단계 진행
tw-b2b PHASE2.md 읽고 현재 상태 확인
tw-b2b PHASE2.md 업데이트
```

### 새 채팅 시작 시 Claude가 해야 할 것
1. PHASE2.md를 view 도구로 읽기
2. STATUS.md도 같이 읽기 (Phase 1 컨텍스트)
3. 현재 진행 중 Step 확인
4. 대표님이 지시한 단계 또는 다음 단계 작업
5. 완료 후 PHASE2.md의 CHANGE LOG와 Step Tracker 갱신
6. git push까지 완료
7. 대표님께 (a)요약 (b)체크리스트 (c)막힐 가능성 (d)배포 링크 보고

---

**문서 관리 원칙**: 매 Step 완료 시 이 문서를 갱신하고 함께 push.
