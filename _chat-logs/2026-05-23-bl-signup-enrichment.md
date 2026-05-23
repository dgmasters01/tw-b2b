# BL-SIGNUP-ENRICHMENT — sales.html D-035 임계값 분기 본인 호텔 매출 박스

**날짜**: 2026-05-23
**BL ID**: BL-SIGNUP-ENRICHMENT
**상태**: ✅ done (5/5 steps)
**commit**: `cb11a7721c` ([링크](https://github.com/dgmasters01/tw-b2b/commit/cb11a7721c00c59ac0ece5d5ff4d31a9dfcae7f3))
**근거 결정**: D-035 (3구간 임계값) + D-038 (Agoda 약관 안전 확정)
**선행**: BL-PAST-VIDEO-RECON (호텔별 누적 매출 집계, done) + BL-AUTO-BOTS-HEALTH-RESTORE
**다음**: tasks.json에서 P1 자동 안내

---

## ① 완료 내용

**신규 매니저가 sales.html에 들어왔을 때, 본인 호텔이 우리 채널로 발생시킨 누적 매출을 D-035 3구간 임계값으로 분기 노출**:

| 구간 | 누적 매출 | 표시 (KO) | 표시 (EN) |
|---|---|---|---|
| 강력 | $1,000+ | 🎯 본전 회수 완료 / "이미 $X 매출 발생 / 예약 N건" | 🎯 ROI already covered / "Your hotel has earned $X" |
| 부드러움 | $200~999 | ✨ 관심 채널 확인 / "이미 N건 예약 발생" | ✨ Channel interest detected / "Already N bookings" |
| 숨김 | <$200 | 표시 안 함 (메모리 규칙: 매니저 부정 인식 방지) | 표시 안 함 |

박힌 위치: `approved` 분기에서 **🎉 가입 완료 축하 헤더 바로 위**. 결제 카드 진입 전 본인 매출 강력 노출 → 결제 동기 확신.

### 기술 변경

1. **CSS 3종 신설**: `sl-revenue-strong`(그라디언트+박스섀도우+큰 글씨), `sl-revenue-soft`(보라톤+중간 글씨), `sl-revenue-loading`(점선 박스+로딩 텍스트)
2. **fetchHotelRevenue(hotelId)**: `T.sb.auth.getSession()` → Bearer 토큰 → `/api/hotel-bookings?hotelId=X` 호출 → `headline.total_amount_usd` + `booking_count` 추출
3. **renderHotelRevenue(box, amount, count)**: 3구간 분기 + KO/EN 다국어 메시지 박스 렌더
4. **approved 분기 첫줄에 placeholder div** `#sl-hotel-revenue-box` 박음 (비동기 채움)
5. **initPayPalButtons 직후 fetchHotelRevenue 호출** — PayPal 로딩과 매출 fetch 병렬 실행

## ② 이유

- **D-035 결정**: "200달러 넘은 곳이어야 매니저가 돈 가치 인정. 조회수는 작아도 예약 발생함" — 건수 아닌 매출액 기준
- **BL-FLOW-2 5단 카피**: 일반 매니저용 전체 통계($854K) 노출은 완성. 그러나 **본인 호텔 한정** 표시는 없었음
- **BL-PAST-VIDEO-RECON done**: 호텔별 누적 매출 집계 시스템이 이미 작동 중 → 표시할 데이터 준비됨
- **D-038 약관 안전**: Agoda Affiliate Agreement v.2023 검토 결과 4중 안전 구조 확정 (약관 4.1.1 권장 + 호텔 본인 데이터 사용 + RLS 본인만 보기 + Extranet 자기 검증)

## ③ 사업 영향

- **결제 전환율 직접 상승 기대**: $1,000+ 매니저는 "이미 본전 회수" 메시지 → 결제 망설임 0
- **$200~999 구간**: 건수 강조로 "관심 채널" 인식 → 확장 동기 부여
- **<$200 구간**: D-035 명시 — 표시 안 함으로 매니저 부정 인식 방지 + 기존 5단 카피의 일반 통계만 사용
- **본인 호텔 매출은 RLS로 본인만 보임** → 다른 호텔 데이터 노출 0건 (D-038 4중 안전)

## ④ 다음 행동

정석(헌법 13조)대로 다음 작업 자동 식별 — 남은 자율 진행 가능한 P0/P1 BL은 클로드가 자동 정렬.

P1 차단 없음 BL:
- BL-SYSTEM-MANUAL-AUTOGEN (시스템 매뉴얼 자동 생성)
- BL-MEMBERS-DATA-SOURCE (가입자 화면 정리)

P0 approval_required=true BL:
- BL-ADMIN-OPERATIONS-DASHBOARD (운영 대시보드 본격 구축) — 사업가 V2 컨텍스트 3블록으로 보고 후 결정 받기

## ⑤ 대표님 결정 필요

**없음** — 자율 진행 완료. 라이브 확인 부탁드립니다:

### 어디 가서 / 무엇을 누르면 / 무엇이 보이는지

1. **https://gohotelwinners.com/sales.html** approved 상태 매니저(Agoda 자동 매칭된 호텔)로 로그인
2. 페이지 맨 위 5단 카피(1~3단) 보임 (BL-FLOW-2)
3. **결제 영역 진입 직전 — 본인 호텔 매출 박스 표시**:
   - 누적 매출 $1,000+ → 그라디언트 박스 "🎯 본전 회수 완료 / 당신 호텔은 우리 채널을 통해 이미 $X,XXX 매출 발생"
   - $200~999 → 보라톤 박스 "✨ 관심 채널 확인 / 이미 N건 예약 발생"
   - <$200 → 표시 안 함 (5단 카피 + 축하 헤더 + 결제 카드만 보임)
4. 그 아래 🎉 가입 완료 축하 헤더 + 결제 카드(BL-FLOW-2)
5. 언어 토글 (EN/KO) 누르면 → 매출 박스 텍스트도 즉시 다국어 갱신 (부칙 19 hook 작동 중)

## 헌법 부칙 위반 0건

- 부칙 7 [step:done:1~4] 태그 ✅ (commit subject)
- 부칙 11 stats 자동 재계산 ✅
- 부칙 15 chat-log 박음 ✅
- 부칙 19 전체 갱신 ✅ (renderSales 안에서 placeholder + 비동기 fetch, 언어 토글 재렌더링 hook 자동 적용됨)
- 안전장치 3개 통과 (북극성/중복점검/한 결정)
