# 사업 합의 단일 진실원 (사람용)

> **단일 진실원:** 본 파일 + `business-agreements.json`
> **헌법:** 부칙 20 (BL-DECISION-TRACKING)
> **자동 갱신:** `decision-tracking-bot` + 클로드 채팅 마무리 시 의무 박음
> **검증:** `verification-gap-bot`이 매 commit 코드 grep으로 status 자동 갱신

---

## 📊 현재 미구현 사업 합의 한눈에

| ID | 합의 | 합의 일자 | 관련 BL | 상태 | 며칠째 |
|---|---|---|---|---|---|
| AGR-2026-0003 | 한국 매니저 KRW 송금 분기 (sales.html) | 2026-05-24 | BL-INVOICE-001 | ❌ NOT_IMPLEMENTED | 1일 |
| AGR-2026-0005 | 한국 매니저 수동 입금 확인 admin | 2026-05-24 | BL-INVOICE-002 | ❌ NOT_IMPLEMENTED (BL 0%) | 1일 |
| AGR-2026-0013 | 한국 결제 영수증 종류 라디오 3종 | 2026-05-24 | BL-INVOICE-001 또는 002 | ❌ NOT_IMPLEMENTED | 1일 |

---

## 2026-05-25 — BL-INVOICE-001 핑퐁 15라운드 합의 (D-047 / D-048)

단일 진실원: `_os/playbook/invoice-system.md`
백로그: BL-INVOICE-001 / BL-INVOICE-002 / BL-INVOICE-003

### ✅ AGR-2026-0001 — 라운드 1: 발행 주체 한국법인 단일
- **합의:** 인보이스 발행은 한국법인 "여행능력자들" 단일, 베트남법인 완전 배제
- **위치:** `api/invoice.js` issuer 박음, `_os/playbook/invoice-system.md` 2.1
- **상태:** ✅ DONE (commit `0aeee15`)

### ✅ AGR-2026-0002 — 라운드 1: 한국 호텔=KO/EN 토글, 해외=EN 단일
- **합의:** 한국 사업자에게는 한/영 토글, 그 외 전세계는 영어 단일
- **위치:** `api/invoice.js` PDF 생성 시 분기
- **상태:** ✅ DONE

### ❌ AGR-2026-0003 — 라운드 3: 한국 매니저 KRW 송금 분기 (sales.html)
- **합의:** Bill To 국가가 한국이면 PayPal 옵션 숨기고 KRW 국내 송금 단일 옵션만 노출
- **예상 위치:** `sales.html` (hotel.country === 'KR' 분기 + payment_accounts 읽어서 송금 카드 렌더)
- **검증 코드 패턴:** `hotel\.country.*KR|bank_transfer_krw`
- **관련 BL:** BL-INVOICE-001
- **상태:** ❌ NOT_IMPLEMENTED
- **발견 경위:** 2026-05-25 sandbox 결제 테스트 중 PayPal "한국→한국 차단" 화면에서 발견

### ✅ AGR-2026-0004 — 라운드 4: PayPal 자동 + KRW 수동 하이브리드 흐름
- **합의:** PayPal은 webhook 자동, KRW는 대표님 수동 입금 확인 후 admin 버튼으로 Paid 전환
- **위치:** PayPal 자동 부분만 `api/paypal.js` 박힘
- **상태:** 🟡 PARTIAL — PayPal 자동(✅) / KRW 수동(❌ AGR-2026-0005로 분리)

### ❌ AGR-2026-0005 — 라운드 5: 한국 매니저 수동 입금 확인 admin
- **합의:** admin-invoices.html에 Pending/Paid/Overdue 탭 + "입금 확인" 버튼 + 미수금 위젯 + 자동 컬러 배지(7/14/30일)
- **예상 위치:** `_admin/admin-invoices.html` (이미 단계 6에서 박혔으나 "입금 확인" 흐름 미박힘)
- **관련 BL:** BL-INVOICE-002 (status: pending, 0%)
- **상태:** ❌ NOT_IMPLEMENTED

### ✅ AGR-2026-0006 — 라운드 6: 계좌·도장·서명 admin 수정 가능
- **합의:** payment_accounts 테이블 + admin-settings.html "결제 정보 관리" 탭으로 대표님이 직접 수정
- **위치:** `_admin/admin-settings.html` (회사 정보·결제 정보 탭) + `company_info`/`payment_accounts` 테이블
- **상태:** ✅ DONE (BL-INVOICE-003 100%)

### ✅ AGR-2026-0007 — 라운드 7: 한국 매니저는 KRW 가격표 별도, 환율 변동 무관
- **합의:** 한국 업체는 KRW 단일 통화, USD→KRW 환산은 인보이스 발행 시점 환율 스냅샷 고정
- **위치:** `api/invoice.js` handleIssue (환율 snapshot 박음) + `fx_snapshots` 테이블
- **상태:** ✅ DONE (단계 3 환율 API + 단계 4 채번)

### ✅ AGR-2026-0008 — 라운드 8: 한국=VAT 10% 포함, 해외=영세율 0%
- **합의:** 인보이스에 자동 분기 표기 (한국 공급가액+VAT 분리, 해외 "Zero-rated export of services")
- **위치:** `api/invoice.js` PDF 생성 세금 분기
- **상태:** ✅ DONE

### ✅ AGR-2026-0009 — 라운드 9: 발행 시점 환율 고정
- **위치:** `fx_snapshots` 테이블 + `api/invoice.js` handleIssue
- **상태:** ✅ DONE

### ✅ AGR-2026-0010 — 라운드 10: 입금 기한 발행일+2영업일, 자동 만료, 이중 발행 차단 모달
- **합의:** ① 입금 기한 48시간 ② 기한 24h/1h 전 리마인더 ③ 기한 경과 자동 Expired ④ 이중 결제 시도 차단 모달
- **위치:** `api/cron/invoice-expire.js` + `sales.html` 차단 모달
- **상태:** ✅ DONE (단계 8 + 단계 9)

### ✅ AGR-2026-0011 — 라운드 11: KRW Pending 텔레그램 알림 4단계
- **합의:** 발행 즉시 🔔 / 24h ⏰ / 6h 전 🚨 / 만료 ❌
- **위치:** `api/cron/invoice-expire.js` + `api/_lib/telegram.js`
- **상태:** ✅ DONE (단계 8) — 단, TELEGRAM_BOT_TOKEN 실제 박는 건 운영 진입 시

### ❌ AGR-2026-0013 — 라운드 13~14: 한국 결제 영수증 종류 라디오 3종 (세금계산서 기본값)
- **합의:** sales.html 한국 결제 단계에 영수증 종류 선택 라디오 3종
  - ①세금계산서(사업자, **기본값**) — 사업자번호·상호·대표자명·업태·종목·이메일
  - ②현금영수증(사업자 지출증빙) — 사업자번호
  - ③현금영수증(개인 소득공제) — 휴대폰번호
- **B2B 타겟 안내 문구** 라디오 옆에 박음
- **admin-invoices에 "영수증 발행" 버튼** + 입금 확인 후 24h 내 미발행 시 텔레그램 ⚠️
- **예상 위치:** `sales.html` (한국 결제 단계) + `_admin/admin-invoices.html` (영수증 발행 흐름)
- **관련 BL:** BL-INVOICE-001 (sales.html 부분) + BL-INVOICE-002 (admin 부분)
- **상태:** ❌ NOT_IMPLEMENTED

### ✅ AGR-2026-0015 — 라운드 15: 인보이스 번호 4트랙 + 발행 권한 super_admin 단독 + 도장·서명 추후 업로드
- **합의:**
  - 번호 규칙: `INV-KR-YYYY-NNNN` / `INV-INT-YYYY-NNNN` / `CN-KR-YYYY-NNNN` / `CN-INT-YYYY-NNNN` (연도별 리셋)
  - 발행 권한: 대표님(super_admin) 단독, 스리랑카 직원은 조회만
  - 도장·서명: admin-settings 업로드 영역 미리 박음, 이미지 업로드 전엔 텍스트로 "(주)여행능력자들 / 대표 이지형"
- **위치:** `api/_lib/invoice-numbering.js` + `_admin/admin-settings.html` + RLS 정책
- **상태:** ✅ DONE (단계 4 + BL-INVOICE-003)

---

## 2026-05-25 — BL-DECISION-TRACKING 신설 (부칙 20)

### ✅ AGR-2026-0016 — 사업 합의 추적 게이트 (부칙 20)
- **합의:** 채팅에서 합의한 사업·서비스 정책은 코드 박힘이 자동 검증되기 전까지 미완료. 5톱니 사이클.
- **위치:** 본 파일 + `business-agreements.json` + `_os/playbook/decision-tracking.md` + `OPERATIONS_CHARTER.md` 부칙 20
- **관련 BL:** BL-DECISION-TRACKING (이 작업)
- **상태:** 🟡 PARTIAL (1편 박힘 / 2편 봇·admin 배지·인계서 헤더 미박힘)

---

## 사용 가이드

### 클로드가 채팅 마무리 시 (의무)
1. 이번 채팅에서 합의된 사업·서비스 결정 추출
2. 각 합의를 `AGR-YYYY-NNNN` 신규 ID로 본 파일 + .json에 append
3. 인계서 헤더에 "이번 채팅 사업 합의 N건 — 미구현 M건" 표시

### 대표님 (수동 — 선택)
- admin-status.html 상단 "📋 미구현 사업 합의 N건" 배지 클릭으로 한눈에 확인
- 명시적으로 후속 작업으로 미루실 때 `status: deferred` 박기

### 봇 (자동 — 2편 박힘)
- `verification-gap-bot`: 매 commit 코드 grep → status 자동 갱신
- `decision-tracking-bot`: chat-log push 시 합의 자동 추출 보완
