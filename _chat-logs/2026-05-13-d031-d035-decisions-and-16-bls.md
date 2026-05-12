# 2026-05-13 — D-031~D-035 결정 5개 + 신규 BL 16개 일괄 등록 + 우선순위 정렬

**일시**: 2026-05-13
**참여자**: 이지형 대표님 + Claude
**범위**: 결정 5개(D-031~D-035) + 자식 BL 16개 등록 + admin-status 정정

---

## 사업가 5블록 (헌법 6조)

### 1. 무슨 일이 있었나
- 대표님 8개 통찰 발표 (네이밍/재계약/동남아/환불/매출차트/매니저호텔분리/이벤트사이트/추가페이지)
- 통찰 ⑨⑩⑪ 추가 발표 (커뮤니케이션 이력/유튜브 호텔 예약 추적/신규 매니저 매출 노출)
- 대표님 결정 3개: D-035 A안 보강(누적 매출 기준), D-034 B안(별도 브랜드), 작업 순서 Claude 자율
- 대표님 정정 지시: "기존 시스템으로 작업할 수 있게 해야 됨, 새로 박지 마"

### 2. 무엇이 결정됐나
- D-031: journey 단어 폐기 → gohotel 접두사 (Claude 자율)
- D-032: 동남아 1차 타겟 + 영어 default 메일 + 국가 필드
- D-033: 환불 정책 명확화 + 영수증 5년 보관
- D-034: 이벤트 사이트 = 별도 브랜드/도메인
- D-035: 신규 매니저 가입 시 누적 매출 임계값 3구간 ($1k+/$200~999/<$200)

### 3. 무엇이 박혔나
- DECISIONS.md + DECISIONS_INDEX.md에 D-031~D-035 박음 (commit 8532281)
- tasks.json에 신규 BL 16개 등록 (commit 89a0de7):
  1. BL-RENAME-GOHOTEL (1h, P0)
  2. BL-PAST-VIDEO-RECON (4h, P0)
  3. BL-AGODA-TOS-CHECK (2h, P0, 대표님 직접)
  4. BL-HOTEL-DETAIL-PAGE (5h, P1)
  5. BL-REVENUE-DASHBOARD (4h, P1)
  6. BL-RENEWAL-WATCH (5h, P1)
  7. BL-REFUND-FLOW (5h, P1)
  8. BL-SIGNUP-ENRICHMENT (5h, P0, ⭐ 영업 무기)
  9. BL-SIGNUP-COUNTRY-FIELD (2h, P1)
  10. BL-EMAIL-LOCALE-ROUTING (4h, P1)
  11. BL-ADMIN-COUNTRY-FILTER (2h, P2)
  12. BL-RECEIPT-ARCHIVE (3h, P2)
  13. BL-EVENT-SITE-FOUNDATION (25h, P1, xlarge)
  14. BL-EVENT-CUSTOMER-DB (8h, P2)
  15. BL-EVENT-PAYMENT-PROXY (6h, P2)
  16. BL-EVENT-HOTEL-NOTIFY (3h, P2)

### 4. 무엇이 정정됐나
- BL-NEXT-WORK-SEQUENCE 신규 카드 (commit cac22a1) 롤백 (commit 25b0c64):
  - 대표님 지시 "기존 시스템 그대로 사용" 반영
  - 기존 4박스 (🧭 지금 뭐부터 / 🎯 다음 추천 / ⚡ 진행 중 / ⏸ 잠시 멈춤) 자동 갱신 정상 작동
  - 16개 BL은 기존 자율 큐가 알아서 우선순위 정렬
- BL-CHATLOG-BIZ-FORMAT order 충돌 해소 (P0 order=1 → order=100, 결정 대기 카테고리)
- 헌법 데드라인 갱신 (2026-05-03 지남 → 2026-06-30 사업 시작 목표)

### 5. 다음에 무엇을 하나
- 🎯 다음 추천 = BL-RENAME-GOHOTEL (P0 order=1, 1h) 자동 1순위
- 🧑 결정 대기 = BL-AGODA-TOS-CHECK (대표님 약관 검토)
- 5초 폴링이 자동으로 다음 추천 갱신 — 대표님 추가 작업 불필요

---

## 영향받는 작업 / 결정 (자동 매핑용)

**Decisions**: D-031, D-032, D-033, D-034, D-035

**Tasks**: BL-RENAME-GOHOTEL, BL-PAST-VIDEO-RECON, BL-AGODA-TOS-CHECK, BL-HOTEL-DETAIL-PAGE, BL-REVENUE-DASHBOARD, BL-RENEWAL-WATCH, BL-REFUND-FLOW, BL-SIGNUP-ENRICHMENT, BL-SIGNUP-COUNTRY-FIELD, BL-EMAIL-LOCALE-ROUTING, BL-ADMIN-COUNTRY-FILTER, BL-RECEIPT-ARCHIVE, BL-EVENT-SITE-FOUNDATION, BL-EVENT-CUSTOMER-DB, BL-EVENT-PAYMENT-PROXY, BL-EVENT-HOTEL-NOTIFY

**Commits**: 8532281, 89a0de7, cac22a1, ae65da2, 25b0c64, dd004de
