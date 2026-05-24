# 인보이스/영수증 시스템 — 사업 정책 단일 진실원

**제정일:** 2026-05-24
**관련 BL:** BL-INVOICE-001 / BL-INVOICE-002 / BL-INVOICE-003
**관련 결정:** D-009 (PDF 발행 결정), D-047 (인보이스 사업 정책 확정), D-048 (이 문서 신설)
**핑퐁 원본:** `_decisions/pingpong/BL-INVOICE-001.json` (15라운드)
**적용 대상:** gohotelwinners.com (TW B2B) — 모든 결제·인보이스·영수증 흐름

> **이 문서는 인보이스 시스템의 단일 진실원입니다.** 코드·UI·정책 충돌 시 이 문서가 기준입니다. 변경은 헌법 부칙 6(이중 형식 유지) + 새 핑퐁 + 새 D-XXX 등록 후에만 가능합니다.

---

## 1. 한 줄 요약 (사람용)

대표님이 한국법인 "여행능력자들" 이름으로 호텔 매니저에게 인보이스/영수증을 발행한다. **한국 매니저는 원화·세금계산서**, **해외 매니저는 달러·PayPal**로 자동 갈라진다. 발행은 대표님만 누를 수 있고, 한국 입금은 대표님이 통장 확인 후 손으로 "입금 확인" 누른다.

---

## 2. 사업 정책 (사람용)

### 2.1 발행 주체

- **단일 주체: 한국법인 "여행능력자들"**
- 베트남 법인은 인보이스 시스템에서 **완전 배제** (운영 메모에서도 베트남 법인 인보이스 언급 금지)
- 사업자등록번호·상호·대표자명·주소 = admin-settings 회사 정보 관리 탭에서 관리 (하드코딩 금지)

### 2.2 국가별 자동 분기 (핵심 스위치)

매니저 가입/결제 단계에서 입력한 **Bill To 국가**가 모든 분기의 스위치다.

| Bill To 국가 | 통화 | 결제수단 | 인보이스 언어 | 세금 |
|---|---|---|---|---|
| 한국 | KRW | Bank Transfer (국내 계좌) **만 노출** | 한국어/영어 토글 (기본 한국어) | VAT 10% 포함 |
| 한국 외 (전 세계) | USD | PayPal + Bank Transfer (외화) | 영어 단일 | 영세율(0%, Zero-rated export of services) |

**시스템 단 차단:** 한국 매니저에게 PayPal 인보이스 발행 불가 (UI에서 옵션 자체 숨김).

### 2.3 통화·환율 정책

- **인보이스 1장 = 통화 1개** (혼합 금지)
- 한국 매니저에게 글로벌 USD 상품을 팔 때 → **인보이스 발행 시점 환율 1회 snapshot**
  - 환율 소스: 한국수출입은행 매매기준율 API
  - 표기 예시: `₩276,000 (USD 200 × 1,380, 발행일 2026-05-24 기준)`
- snapshot 이후 환율이 변동해도 **인보이스 금액은 고정** (고객은 ₩276,000만 송금하면 됨)
- 결제수단 바뀌면 기존 인보이스 void → 신규 인보이스 재발행 (snapshot 새로 적용)

### 2.4 세금 정책

| 구분 | 세금 처리 | 인보이스 표기 |
|---|---|---|
| 한국 매니저 | VAT 10% 포함 | 공급가액 + VAT 분리 표기 (예: `공급가액 ₩250,909 / VAT ₩25,091 / Total ₩276,000`) |
| 해외 매니저 | 한국 부가세법상 영세율 (수출 서비스) | `Tax: $0.00 (Zero-rated export of services)` |

### 2.5 결제수단·계좌 정보

코드 하드코딩 절대 금지. admin-settings.html "결제 정보 관리" 탭에서 대표님이 수정.

| 결제수단 | 노출 조건 | 저장 필드 |
|---|---|---|
| Bank Transfer (KRW) | 한국 매니저 전용 | 은행명, 계좌번호, 예금주, 사업자등록번호 |
| Bank Transfer (USD) | 해외 매니저 | 은행명, SWIFT, IBAN, 계좌번호, 수취인명 |
| PayPal | 해외 매니저 | PayPal 이메일 |

변경 이력은 audit_log에 자동 기록 (누가/언제/이전값→새값).

### 2.6 인보이스 번호 규칙

**국가별 분리 + 연도별 리셋** (세무 신고 편의)

| 종류 | 번호 형식 | 예시 |
|---|---|---|
| 한국 인보이스 | `INV-KR-{YYYY}-{0001부터 4자리}` | INV-KR-2026-0001, INV-KR-2026-0002 |
| 해외 인보이스 | `INV-INT-{YYYY}-{0001부터 4자리}` | INV-INT-2026-0001, INV-INT-2026-0002 |
| 한국 Credit Note | `CN-KR-{YYYY}-{0001부터 4자리}` | CN-KR-2026-0001 |
| 해외 Credit Note | `CN-INT-{YYYY}-{0001부터 4자리}` | CN-INT-2026-0001 |

- 각 트랙 독립 카운터 (Supabase sequence)
- 매년 1월 1일 자동 리셋 (cron)
- 결번 금지 (void된 번호도 영구 보존, 재사용 불가)

### 2.7 인보이스/영수증 2종 구분

동일 템플릿 기반, 상단 라벨과 "PAID" 도장 유무로 구분.

| 종류 | 발행 시점 | 상태 |
|---|---|---|
| **Invoice (청구서)** | 결제하기 누른 즉시 자동 발행 | Pending |
| **Receipt (영수증)** | 입금 확인 후 자동 발행 (PayPal=webhook 자동 / 한국=대표님 수동) | Paid |

### 2.8 입금 기한·만료·재발행

- **입금 기한 = 발행일 + 2영업일** (주말·공휴일 자동 제외)
- 기한 24시간 전·1시간 전 자동 리마인더 이메일
- 기한 경과 시 cron(매시 정각) 자동 Void/Expired 처리
- 같은 상품 재결제 시 신규 인보이스 발행 (새 환율 적용)
- **이중 발행 방지:** Pending 인보이스가 있는 상태에서 같은 매니저가 같은 상품 결제 시도 → 즉시 차단 모달 ("이미 발행된 미결제 인보이스가 있습니다") + `[기존 인보이스 보기]` `[취소 요청]` 2개 버튼만 노출

### 2.9 환불 정책

- **부분 환불 없음** (운영 단순화)
- 전체 취소만 가능 → 기존 인보이스 void → Credit Note 발행 (`CN-KR-` / `CN-INT-`)
- 환불 사유는 admin-invoices에서 대표님이 직접 입력

### 2.10 한국 영수증 종류 선택 (sales 페이지 결제 단계)

한국 매니저는 결제 시 영수증 종류 라디오 **필수 선택** (기본값 = ①):

| 순서 | 종류 | 입력 필드 |
|---|---|---|
| ① (기본) | **세금계산서 (사업자 전자세금계산서)** | 사업자등록번호, 상호, 대표자명, 업태, 종목, 수신 이메일 |
| ② | 현금영수증 (사업자 지출증빙) | 사업자등록번호만 |
| ③ | 현금영수증 (개인 소득공제) | 휴대폰번호 또는 주민번호 뒷자리 |

라디오 옆 안내 문구: "사업자 고객 대상 서비스, 전자세금계산서 발행이 표준입니다"

**발행 흐름:**
- 인보이스 PDF에 "발행 예정 영수증: 세금계산서 / 사업자등록번호 123-45-67890 / 상호 OOO" 미리 박힘
- 입금 확인 시점에 admin-invoices에서 "영수증 발행" 별도 버튼
- 초기: 대표님이 홈택스/국세청 사이트에서 수동 발행 → admin에 "발행 완료" 체크박스
- 24시간 내 발행 안 되면 텔레그램 자동 리마인더
- 향후 별도 BL로 홈택스 API 자동 연동 분리

### 2.11 발행 권한

| 역할 | 권한 |
|---|---|
| **대표님 (super_admin)** | 인보이스/영수증 발행 + 조회 + 입금 확인 + 환불(CN 발행) + 결제 정보 수정 |
| 스리랑카 직원 (admin) | admin-invoices **조회만 (read-only)** |

- 발행 버튼은 super_admin 역할에서만 활성화
- Supabase RLS 정책으로 시스템 단 차단 (`INSERT INTO invoices` = super_admin only)
- 차단 위반 시 UI 회색 + 클릭 시 "권한 없음" 모달

### 2.12 도장·서명 이미지

- admin-settings.html "회사 정보 관리" 탭에 **업로드 영역 미리 개발**
- 대표님이 이미지 파일 준비되면 그때 업로드만 누름 → 즉시 차기 인보이스부터 PDF 우측 하단 자동 박힘
- 업로드 전: 텍스트로 `(주)여행능력자들 / 대표 이지형` 서명란 표시
- 업로드 후: 이미지로 자동 교체

### 2.13 대표님 알림 (Telegram + admin 배지)

**1차 채널: Telegram 봇 (tw_personal_os_bot, Chat ID 8778277875)**

한국 인보이스(KRW Pending) 4단계 자동 알림:

| 시점 | 메시지 예시 |
|---|---|
| 발행 즉시 | `🔔 신규 한국 인보이스 INV-KR-2026-0123 / 업체명 / ₩276,000 / 기한 5/26 23:59` |
| 발행 +24h | `⏰ 미입금 24시간 경과 / 기한까지 24시간 남음` |
| 기한 6h 전 | `🚨 기한 임박 / ₩276,000 미입금 / 오늘 18:00까지` |
| 기한 경과 | `❌ 자동 취소됨 INV-KR-2026-0123 / 사유: 기한 초과` |

입금 확인 처리 시 텔레그램 알림 자동 정지.

영수증 발행 누락 알림 (입금 확인 후 24시간 내 영수증 발행 안 되면):
`📋 영수증 발행 누락 INV-KR-2026-0123 / 세금계산서 미발행`

**2차 채널: admin 메인 대시보드 상단 위젯**
- `🇰🇷 한국 미입금 N건 / 가장 임박: ₩276,000 (6시간 남음)`
- 항상 표시 (헌법 부칙 19 — 전체 갱신)

### 2.14 보관 정책

- 인보이스/영수증 PDF = **5년 영구 보관** (BL-RECEIPT-ARCHIVE에서 다룸)
- Supabase Storage (primary) + S3 백업 (secondary)
- 매니저는 dashboard "서류" 탭에서 1클릭 다운로드 (1년 이전 건도 동일하게 다운 가능)

---

## 3. 시스템 정책 (AI용 YAML)

```yaml
invoice_system:
  version: "1.0"
  effective_from: "2026-05-24"
  source_pingpong: "_decisions/pingpong/BL-INVOICE-001.json"
  decisions: [D-009, D-047, D-048]
  related_backlog: [BL-INVOICE-001, BL-INVOICE-002, BL-INVOICE-003]

  issuer:
    legal_entity: "여행능력자들"
    country: "KR"
    forbidden_alternatives: ["베트남 법인"]
    info_storage: "admin-settings.html → 회사 정보 관리 탭 (Supabase: company_info)"

  country_branching:
    switch_field: "bill_to.country"
    branches:
      KR:
        currency: "KRW"
        payment_methods: ["bank_transfer_krw"]
        invoice_languages: ["ko", "en"]
        default_language: "ko"
        tax_mode: "vat_10_included"
        receipt_types_required: true
      NON_KR:
        currency: "USD"
        payment_methods: ["paypal", "bank_transfer_usd"]
        invoice_languages: ["en"]
        default_language: "en"
        tax_mode: "zero_rated"
        tax_label: "Zero-rated export of services"
        receipt_types_required: false

  fx_policy:
    source: "한국수출입은행 매매기준율 API"
    snapshot_at: "invoice_issued_at"
    snapshot_frequency: "once_per_invoice"
    locked_after_snapshot: true
    display_format: "₩{amount_krw} (USD {amount_usd} × {rate}, 발행일 {date} 기준)"

  invoice_numbering:
    format:
      kr_invoice: "INV-KR-{YYYY}-{NNNN}"
      int_invoice: "INV-INT-{YYYY}-{NNNN}"
      kr_credit_note: "CN-KR-{YYYY}-{NNNN}"
      int_credit_note: "CN-INT-{YYYY}-{NNNN}"
    counter:
      type: "supabase_sequence"
      tracks: ["INV-KR", "INV-INT", "CN-KR", "CN-INT"]
      reset_at: "yearly_jan_1"
      gap_filling: false
      void_preserves_number: true

  payment_terms:
    due_days: 2
    business_days_only: true
    timezone: "Asia/Seoul"
    reminder_schedule:
      - { offset: "-24h", channel: "email" }
      - { offset: "-1h", channel: "email" }
    on_expiry: "auto_void"
    expiry_cron: "0 * * * *"
    reissue_allowed: true
    reissue_resets_fx: true

  duplicate_prevention:
    rule: "block_if_pending_exists"
    block_modal:
      title: "이미 발행된 미결제 인보이스가 있습니다"
      buttons: ["기존 인보이스 보기", "취소 요청"]

  refund_policy:
    partial_refund: false
    full_cancellation: true
    document_type: "credit_note"
    cn_numbering: "CN-{KR|INT}-{YYYY}-{NNNN}"

  korean_receipt_types:
    required_on_checkout: true
    default: "tax_invoice"
    options:
      tax_invoice:
        order: 1
        label: "세금계산서 (사업자 전자세금계산서)"
        required_fields: ["business_number", "company_name", "ceo_name", "business_type", "business_item", "email"]
      cash_receipt_business:
        order: 2
        label: "현금영수증 (사업자 지출증빙)"
        required_fields: ["business_number"]
      cash_receipt_personal:
        order: 3
        label: "현금영수증 (개인 소득공제)"
        required_fields_either: ["phone_number", "rrn_last_7"]
    issuance_phase_1: "manual_via_hometax_with_admin_checkbox"
    issuance_phase_2: "hometax_api_integration"  # 별도 BL로 분리
    miss_alert_after_hours: 24

  permissions:
    super_admin:
      users: ["대표님"]
      actions: ["issue_invoice", "issue_receipt", "confirm_deposit", "issue_credit_note", "edit_payment_info"]
    admin:
      users: ["스리랑카 직원"]
      actions: ["view_only"]
    enforcement: "supabase_rls"
    ui_button_state:
      non_super_admin: "disabled_grey"
      click_response: "permission_denied_modal"

  stamp_and_signature:
    upload_location: "admin-settings.html → 회사 정보 관리 탭"
    pre_upload_display: "(주)여행능력자들 / 대표 이지형"
    post_upload_display: "image"
    pdf_position: "bottom_right"
    apply_from: "next_invoice_after_upload"

  notifications:
    primary_channel:
      platform: "telegram"
      bot: "tw_personal_os_bot"
      chat_id: "8778277875"
    secondary_channel:
      platform: "admin_dashboard"
      location: "main_dashboard_top_widget"
    korean_invoice_alerts:
      - { trigger: "invoice_issued", emoji: "🔔" }
      - { trigger: "issued_plus_24h_no_deposit", emoji: "⏰" }
      - { trigger: "expiry_minus_6h", emoji: "🚨" }
      - { trigger: "auto_voided", emoji: "❌" }
      - { trigger: "receipt_missing_after_24h", emoji: "📋" }
    cron: "0 * * * *"
    silenced_by: "manual_deposit_confirmation"

  document_types:
    invoice:
      status_on_issue: "pending"
      label: "INVOICE"
      paid_stamp: false
    receipt:
      status_on_issue: "paid"
      label: "RECEIPT"
      paid_stamp: true
      template_base: "same_as_invoice"

  storage:
    duration_years: 5
    primary: "supabase_storage"
    secondary: "s3_backup"
    user_access: "dashboard → 서류 탭 → 1-click download"
    archival_backlog: "BL-RECEIPT-ARCHIVE"

  forbidden:
    - "베트남 법인 명의 인보이스 발행"
    - "한국 매니저에게 PayPal 옵션 노출"
    - "계좌번호·도장 이미지 코드 하드코딩"
    - "부분 환불"
    - "Pending 상태에서 동일 매니저·동일 상품 중복 인보이스 발행"
    - "스리랑카 직원이 발행 버튼 누르기"
    - "snapshot 후 환율 재계산"
    - "void된 번호 재사용"
```

---

## 4. 3개 BL 분담 (사람용)

### BL-INVOICE-003 (선결 — 다른 두 개의 기반)

**제목:** 결제 정보 마스터 관리 (계좌·세금·도장 admin 수정)

**범위:**
- Supabase 테이블 신설: `company_info`, `payment_accounts`
- admin-settings.html "회사 정보 관리" 탭 신설
- admin-settings.html "결제 정보 관리" 탭 신설
- 도장·서명 이미지 업로드 영역 (Supabase Storage)
- audit_log 변경 이력 자동 기록
- super_admin RLS 정책

**의존성:** 없음 (이게 가장 먼저)

**완료 기준:**
- 대표님이 admin-settings에서 KRW 계좌 변경 → 즉시 차기 인보이스 PDF 반영 확인
- 스리랑카 직원 계정으로 접근 시 read-only 확인

---

### BL-INVOICE-001 (PDF 발행 엔진)

**제목:** 인보이스/영수증 PDF 자동 생성·다운로드·1년+ 보관

**범위:**
- 인보이스 PDF 생성 API (`api/invoice/[payment_id].js`)
- 국가별 자동 분기 (위 2.2)
- 환율 snapshot 로직 (한국수출입은행 API 연동)
- 세금 자동 분기 (한국 VAT 10% / 해외 영세율)
- 인보이스 번호 채번 (Supabase sequence)
- Credit Note 발행 로직
- PayPal webhook → Receipt 자동 전환
- 입금 기한 자동 만료 cron (매시 정각)
- 이중 발행 방지 차단 모달
- manager dashboard "서류" 탭 1클릭 다운로드
- PDF Supabase Storage 저장 (1년+ 영구 보관)

**의존성:** BL-INVOICE-003 (계좌·도장 정보 필요)

**완료 기준:**
- 한국 매니저가 결제하기 → INV-KR-2026-0001 PDF 생성 + KRW 환산 + VAT 분리 표기 확인
- 해외 매니저 결제하기 → INV-INT-2026-0001 PDF + USD + Zero-rated 표기 확인
- PayPal 결제 완료 → Receipt 자동 전환 확인

---

### BL-INVOICE-002 (한국 운영 화면)

**제목:** 한국 업체 수동 입금 정리 시스템

**범위:**
- admin-invoices.html 신규 페이지 (Pending / Paid / Overdue / Voided 탭)
- 미수금 행에 "입금 확인" 버튼 → 모달 (입금일·실제 입금액·메모 입력)
- 입금 확인 시 Receipt 자동 생성·전환
- 영수증 종류별 발행 처리 (세금계산서/현금영수증) — Phase 1 수동 + 체크박스
- 대시보드 상단 "한국 미수금 현황" 위젯
- 경과 7/14/30일 자동 컬러 배지 (노랑→주황→빨강)
- Telegram 4단계 자동 알림
- 영수증 발행 누락 알림
- CSV 내보내기 (세무 신고용)

**의존성:** BL-INVOICE-001 (PDF 엔진 + 인보이스 데이터 필요)

**완료 기준:**
- 한국 매니저 인보이스 발행 → 즉시 텔레그램 🔔 알림 도착 확인
- 대표님이 "입금 확인" 버튼 클릭 → Receipt PDF 자동 생성 + 알림 정지 확인
- 기한 경과 시 cron 자동 Void + ❌ 알림 확인

---

## 5. 변경 이력

| 일자 | 변경 내용 | commit |
|---|---|---|
| 2026-05-24 | 신설 (BL-INVOICE-001 핑퐁 15라운드 합의 단일 진실원화) | (TBD) |

---

## 6. 관련 문서

- 핑퐁 원본: `_decisions/pingpong/BL-INVOICE-001.json`
- 결정 본체: `DECISIONS.md` D-047 (BL-INVOICE-001 결정 확정)
- 정책 신설: `DECISIONS.md` D-048 (이 문서 신설)
- 사업 흐름: `BUSINESS.md` 15-A 통찰 7
- 사용자 여정: `JOURNEY.md` D단계
- 보관 정책: `tasks.json` BL-RECEIPT-ARCHIVE
