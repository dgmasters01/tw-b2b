---
date: 2026-05-25
bl: BL-INVOICE-001
step: 7
status: done
commit_target: feat(BL-INVOICE-001) step 7 — PayPal webhook → Receipt 자동 전환 [step:done:7]
tone: business
---

# BL-INVOICE-001 단계 7 — PayPal webhook → Receipt 자동 전환

## ① 완료 내용

`api/paypal.js` 1개 파일 박음 (492줄 → 930줄, 헬퍼 3개 + 2개 핸들러 보강).

**1) 헬퍼 3개 신설** (transitionHotelToPaid 다음 위치):
- `issueAndMarkPaidForCapture(paymentId, captureId)` — payment에 invoice 없으면 INV-INT 신규 발행 + 즉시 paid 마크, 있으면 paid로 갱신. 멱등 보장(이미 paid면 skip). 한국 매니저에게 PayPal 결제가 들어온 정책 위반 케이스는 거부 + 사유 반환.
- `markInvoicePaidByCapture(captureId)` — capture_id로 payment 역추적 후 위 헬퍼 호출 (webhook 중복 호출용).
- `voidInvoiceByCapture(captureId, reason)` — capture_id → payment → invoice 역추적 → CN-INT 채번 + credit_notes INSERT(전액 양수) + invoices.status='void'+voided_at+void_reason. 멱등(이미 void면 skip).

**2) `handleCaptureOrder` 보강**:
- payments INSERT 성공 후 `issueAndMarkPaidForCapture` 호출 → INV-INT-2026-NNNN 자동 발행 + paid 즉시 마크.
- INSERT 응답이 409(중복 capture_id)면 capture_id로 payment.id 역추적 후 멱등 실행.
- 실패 시 ops 알림(`[TW B2B] ⚠️ PayPal 결제 OK / 인보이스 자동 발행 실패`) — 운영자가 admin-invoices 결제 탭에서 수동 발행 가능하므로 응답은 차단 아님.
- ops 결제 완료 이메일에 "인보이스 자동 발행" 행 추가, return JSON에 `invoice: {id, invoice_number, action}` 박음.

**3) webhook 2개 케이스 보강**:
- `PAYMENT.CAPTURE.COMPLETED` → 기존 payments status='succeeded' 갱신 + `markInvoicePaidByCapture` 호출 (capture-order에서 이미 했어도 멱등).
- `PAYMENT.CAPTURE.REFUNDED` → 기존 payments status='refunded' 갱신 + `voidInvoiceByCapture` 호출 (CN 자동 발행) + ops 알림에 결과 박음.

**4) tasks.json**: step 7 done, label "PayPal webhook → Receipt 자동 전환 (capture + COMPLETED + REFUNDED)", progress 50% → 58%.

## ② 이유

- **정책 2.7 명시**: Receipt 발행 시점 = 입금 확인 후, PayPal은 webhook 자동. → capture-order 성공 = 입금 확정 = invoice 즉시 paid. pending 단계 없음(라운드 9 합의: "결제하기" 누르는 시점에 환율 snapshot 확정인데, PayPal은 환율 무관 USD 결제라 snapshot도 불필요).
- **멱등 처리 3중 보장**: ①capture-order에서 1차 발행 ②COMPLETED webhook이 같은 capture_id로 재호출되면 issueAndMarkPaidForCapture 내부에서 status='paid' 발견 후 'already_paid' 반환 ③409 INSERT는 capture_id 역추적. PayPal은 capture-order + webhook 동시 발생 가능하므로 멱등이 절대 필수.
- **InvoicePdf.js의 "PAID" 도장 워터마크는 이미 박혀있음** (status='paid' 자동 분기). 단계 7에서 추가 작업 불필요.
- **별도 invoice-engine.js 추출 안 한 이유**: 단계 10(manager dashboard) 작업 시 함께 추출 예정. 지금 추출하면 paypal.js와 invoice.js 양쪽 동시 수정 → 충돌·끊김 위험. 정석은 호출처 2개 이상 될 때 추출.
- **owner_only 차단 우회**: 사용자 토큰 없는 webhook 환경 → invoice.js의 handleIssue 직접 호출 불가 → service_role 키로 직접 Supabase 호출. 단계 6의 list/void API와 동일 패턴.

## ③ 사업 영향

- **해외 매니저(USD/PayPal) 결제 → 인보이스 발행 → Receipt → "PAID" PDF가 자동 1트랜잭션으로 완성**. 대표님이 손댈 일 없음. ops 이메일로 결과만 확인.
- **PayPal 환불(고객이 PayPal 분쟁에서 환불 받음 등) 발생 시 invoice 자동 void + CN-INT 자동 발행**. 회계 정합성 자동 유지 — 사람이 안 끼어도 분쟁 시 증빙 가능.
- **한국 매니저 흐름과 완전 격리**: 한국 매니저는 admin-invoices에서 대표님 수동 발행 (정책 2.11). PayPal 자동 발행은 hotels.country가 한국이면 거부 + ops 알림(정책 위반 케이스 가시화).
- **운영 부담 분산**: invoice 자동 발행이 실패해도 결제 자체는 차단 안 됨(매니저는 marketing.html 정상 진입 가능). admin-invoices 결제 탭에서 수동 발행 가능하므로 사고 복구 1클릭.

## ④ 다음 행동

자율 진행 권한 범위 내에서 단계 8 이어감.

- **단계 8 (다음)**: 입금 기한 자동 만료 cron (`api/cron/invoice-expire.js`, vercel.json crons 매시 정각, `due_at < now() & status='pending' → status='expired'`, 자동 ops 알림). 한국 매니저 미입금 인보이스 자동 정리 + 텔레그램 4단계 알림(라운드 11) 일부 함께 박을지는 단계 8 진입 시 판단.
- **단계 9**: sales.html 이중 발행 차단 모달
- **단계 10**: manager-dashboard '서류' 탭 (이때 invoice-engine.js 추출 정석)

## ⑤ 대표님 결정 필요

**없음.** 헌법 1조 + 부칙 16 자율 결정 범위:
- payments + invoices 멱등 처리 흐름 (capture-order ↔ webhook 동시 발생 대비)
- ops 알림 양식 (기존 패턴 동일)
- invoice-engine 추출 미루기 (단계 10에서 함께)
- PAID 워터마크는 InvoicePdf.js에서 이미 처리(추가 작업 없음)

다음 단계 8 진입 — 컨텍스트 여유 있어 본 채팅에서 이어가도 됩니다. 단, 단계 8은 vercel.json + 신규 cron 파일 + 텔레그램 봇 호출까지 묶이면 분량 큼 — 진입 시 재판단.
