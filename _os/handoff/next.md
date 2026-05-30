# 다음 작업 인계 (가벼움 — 의무 헤더 prepend 금지)

일호기/여행능력자들. 한국어, "대표님" 호칭.

## 첫 행동
`_os/boot.md` **1개**만 fetch → 헌법 자가검증.

## ⭐ 새 영구 인프라 (2026-05-30 신설 — 외워둘 것)
**SQL 자동 실행 창구 생겼다. 다시는 대표님께 Supabase 수동 붙여넣기 시키지 말 것.**
- `POST gohotelwinners.com/api/ops/db-query`, header `x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK`, body `{query}` → Supabase Management API로 DDL/SQL 즉시 실행. DDL 성공 시 `rows:[]` 정상. 한도 60/h.
- 서버 열쇠: Vercel env `SUPABASE_ACCESS_TOKEN`(sbp_, Production+Preview, Never 만료). 엔드포인트 코드 `api/ops/db-query.js`(commit 2fea633).
- 즉, github-commit(파일저장) + db-query(DB실행) = 한 쌍. 표 만들 일 생기면 sql 짜서 이 창구로 직접 실행 → information_schema로 검증.

## 🔴 1순위 작업: BL-REFUND-FLOW **step 2 (UI + 라우터 연결)** — 진행 중
제목: [환불 관리 탭] PayPal Refund API 연동 + 환불 이력 영구 보관 (P1 · order 7 · D-033).

### ✅ step 1 (백엔드 기반) 완료 — 2026-05-30
- `api/_lib/paypal-client.js` → **`refundCapture(captureId,{amount,currency,note,requestId})`** (commit 313db73). PayPal `POST /v2/payments/captures/{id}/refund`, 멱등키 내장.
- `db/refund_requests.sql` (commit b38120f) → **표 라이브 생성·검증 완료** (db-query 창구로 실행. 17컬럼/RLS 2정책/인덱스4/트리거 확인). ※ 더는 수동 적용 불필요.

### ⬜ step 2 할 일 (이번 채팅)
1. **api/admin.js 라우터에 환불 워크플로 액션 추가** (2990줄, 일반 편집 OK):
   - 기존 `handleRefundHotel`(line ~1438, action `refund-hotel`)은 PayPal 호출 없는 반쪽 → 보강/대체.
   - `refund-request`(매니저 신청 → refund_requests INSERT, pending)
   - `refund-list`(대기 목록 GET)
   - `refund-approve`(대표님 확인 → `refundCapture()` 호출 → status=refunded + paypal_refund_id 기록. 기존 REFUNDED webhook이 invoice void+크레딧노트 자동 처리 — 멱등 주의)
   - `refund-reject`(decision_note → status=rejected → 매니저 자동 메일 via _lib/email-sender)
   - ALLOWED_ACTIONS 배열(line ~2536) 등록 필수.
2. **`_admin/admin.html` "↩️ 환불·취소" 탭** — ⚠️⚠️ 6,231줄 / **4701줄=1MB 데이터(절대 출력 금지)**. 줄번호만 grep→sed. Sales 탭 참고 줄: 280~617 + 2564~2598.
3. **매니저 환불 신청 진입점** — D-033은 "marketing.html 매니저 본인 신청". `_admin/marketing.html` 404였음 → 실제 경로 먼저 probe(`marketing.html` 루트 등). 신청 폼 1개 + refund-request 호출.

### ⚠️ 거대 파일 가드
`_admin/admin.html` 통째 read/cat/`curl|head`(4701 포함)/`grep -i 내용출력` 금지 → 1MB 끊김. 줄번호만 뽑고 sed 구간으로만. 상세 `_os/playbook/large-file-read.md`.

## 🟢 직전 처리 메모
- BL-RENEWAL-WATCH(재계약 탭) 직전 완료(commit 8bf2e84)인데 tasks.json엔 아직 `in_progress` → admin-status 배너 오표시 가능. 정리 필요(이젠 db-query 불필요, tasks.json은 github-commit으로 status만 surgical 교체).

## 환경
repo dgmasters01/tw-b2b(main). raw=curl 무인증(main raw 캐시지연 → 검증은 commit SHA 직지정). commit창구 POST gohotelwinners.com/api/ops/github-commit (x-ops-token 동일, plain text, 30/h). **SQL창구 위 ⭐ 참고.** jq 없음→python3. PayPal: _lib/paypal-client.js, Merchant HAY86YMQP9T5C.
