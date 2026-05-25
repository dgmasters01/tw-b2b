---
date: 2026-05-25
bl: BL-INVOICE-001
step: 6
status: done
commit_target: feat(BL-INVOICE-001) step 6 — admin-invoices.html + list/void API [step:done:6]
tone: business
---

# BL-INVOICE-001 단계 6 — admin-invoices.html + list/void API

## ① 완료 내용

1. **`api/invoice.js`** — placeholder로 박혀있던 `list` / `void` 액션을 실제 구현으로 교체.
   - `handleList`: status / track / q(substring) / limit / offset / order 파라미터 지원, PostgREST Range 헤더로 페이지네이션 + Content-Range 헤더로 total 추출, admin/owner/staff 권한.
   - `handleVoid`: invoice fetch → 이미 void면 409 → CN-KR/CN-INT 채번(`next_invoice_number` RPC) → `credit_notes` INSERT (양수 저장) → `invoices.status='void' + voided_at + void_reason` 갱신, owner only, 사유 5자 이상 필수.
   - router switch에서 list/void → 실제 핸들러 연결. 헤더 주석 단계 5 후속 → 단계 4~6 업데이트.

2. **`_admin/admin-invoices.html`** 신설 (990줄, Aurora 톤, EN 기본 + KO 토글).
   - 2탭: ①발행된 인보이스 ②미발행 결제
   - 인보이스 탭: 상태 pill 5종 + 트랙 셀렉트 + 검색박스(invoice_number/name/email) + 페이지네이션(20건/페이지)
   - 행 클릭 → 상세 모달 (메타 KV + PDF iframe 미리보기 + Download/Void 버튼)
   - 결제 탭: `invoice_number IS NULL` payments 표시 + "Issue invoice" 버튼 → `/api/invoice?action=issue` → 성공 시 인보이스 탭 전환 + 새 인보이스 자동 오픈
   - Void 모달: 사유 분류 4종(고객 요청/중복/취소/기타) + 자유 사유 입력 + 정책 2.9 경고 박스 (부분 환불 없음, CN 자동 발행)
   - i18n: localStorage 'tw-admin-lang' 영속화, EN/KO 모든 라벨·placeholder·toast·empty 상태 번역

3. **`_admin/admin-status.html`** Card 8 추가 (`/_admin/admin-invoices.html` 진입점, aurora-3 톤).

4. **`tasks.json`** — step 6 label을 "admin-invoices.html + list/void API"로 정정 (기존 "세금 자동 분기"는 step 4 handleIssue에서 이미 흡수됐음을 본문에 명시), step 6 done, progress 42% → 50%.

## ② 이유

- **list/void는 단계 5에서 placeholder 상태로 박혀있었음** — admin UI를 만들려면 두 API가 반드시 박혀야 함. 단계 5 후속으로 미뤘던 걸 단계 6에서 함께 박는 게 자연스러움.
- **단계 6 원래 정의("세금 자동 분기")는 step 4 handleIssue에서 이미 박혀있었음** — `isKorea` 분기로 KRW/USD, vat_10_included/zero_rated, INV-KR/INV-INT, bank_transfer_krw/paypal 모두 분기 완료. 같은 작업을 두 번 박지 않고, 실제로 필요한 admin UI 작업을 단계 6 슬롯에 박음 (헌법 1조 자율 결정).
- **결제 목록 → 인보이스 발행 흐름**을 한 화면 안에 통합한 이유는 작업 흐름이 "결제 확인 → 인보이스 발행 → 미리보기 → 확정"으로 이어지기 때문. 별도 페이지로 분리하면 컨텍스트 끊김.
- **EN 기본 + KO 토글**: 헌법 외부 콘텐츠 영어 우선 원칙 (한국 매니저 대상 한정 admin이지만 추후 글로벌 직원 사용 대비 + USD/PayPal 글로벌 표준 정합).

## ③ 사업 영향

- **인보이스 운영 전체 사이클이 1개 페이지로 묶임.** 결제 확인 → 발행 → PDF 검수 → 다운로드 → (문제 시) void + CN 자동 발행까지 admin-invoices에서 끝남. 대표님이 더이상 DB SQL을 직접 만질 일 없음.
- **부분 환불 차단을 시스템 단에 박음** (정책 2.9). 사용자(owner 본인 포함)가 임의로 부분 환불 처리할 수 없게 됨 — 회계 단순성 확보.
- **list API는 향후 매니저 본인 인보이스 조회(manager-dashboard `서류` 탭, BL 단계 10)에 그대로 재사용 가능**. 권한 분기만 추가하면 됨.
- **Credit Note 메타는 박혔지만 CN PDF는 미생성** — admin-invoices에서 cn_number를 확인할 수는 있으나 PDF는 별도 BL에서 박을 것. (정책 분쟁 시 메타로 충분, PDF는 보강 우선순위 낮음.)

## ④ 다음 행동

자율 진행 권한 범위 내에서 단계 7 이후를 commit 후 다음 채팅에서 이어감.

- **단계 7**: PayPal webhook → Receipt 자동 전환 (`invoices.status='paid' + paid_at`, "PAID" 도장 워터마크는 InvoicePdf.js에 이미 박혀있음)
- **단계 8**: 입금 기한 자동 만료 cron (`/api/cron/invoice-expire`, 매시 정각, due_at < now & status='pending' → status='expired')
- **단계 9**: sales.html 이중 발행 차단 모달
- **단계 10**: manager-dashboard '서류' 탭

## ⑤ 대표님 결정 필요

**없음.** 헌법 1조 자율 결정 범위:
- step 6 label 재정의 (세금 분기는 step 4 흡수 → admin UI로 대체)
- admin-invoices 2탭 구조 (결제 + 인보이스 통합)
- 이메일 알림은 박지 않음 (운영 진입 전이라 운영 부담 제거)
- Credit Note PDF 미생성 (메타만)

다음 단계 7 진입 시 별도 컨텍스트 블록 생성 — 본 채팅 종료 후 새 채팅에서 이어가시면 됩니다.
