# 다음 작업 인계 (가벼움 — 의무 헤더 prepend 금지)

일호기/여행능력자들. 한국어, "대표님" 호칭.

## 첫 행동
`_os/boot.md` **1개**만 fetch → 헌법 자가검증.

## 🔴 1순위 작업: BL-REFUND-FLOW **step 2 (UI + 라우터 연결)** — 진행 중
제목: [환불 관리 탭] PayPal Refund API 연동 + 환불 이력 영구 보관 (P1 · order 7 · D-033).

### ✅ step 1 (백엔드 기반) 완료 — 2026-05-30
- `api/_lib/paypal-client.js` → **`refundCapture(captureId, {amount,currency,note,requestId})`** 추가 (commit **313db73**). PayPal `POST /v2/payments/captures/{id}/refund`, 멱등키 내장, amount 미지정=전액.
- `db/refund_requests.sql` 신설 (commit **b38120f**) — refund_requests 테이블(pending→approved→refunded / rejected / failed), 5년 영구보관, RLS(매니저 본인 select/insert만, 상태변경은 service_role). ⚠️ **아직 Supabase에 미적용** — 대표님이 Supabase SQL Editor에 이 파일 1회 실행 필요.

### ⬜ step 2 할 일 (이번 채팅)
1. **api/admin.js 라우터에 환불 워크플로 액션 추가** (admin.js 2990줄, 거대 X — 일반 편집 OK):
   - 기존 `handleRefundHotel`(line ~1438, action `refund-hotel`)은 **PayPal 호출 없이 DB만 기록하는 반쪽**. 이를 보강/대체.
   - `refund-request`(매니저 신청 → refund_requests INSERT, status=pending)
   - `refund-list`(대기 목록 GET, status=pending 우선)
   - `refund-approve`(대표님 확인 → `refundCapture()` 호출 → refund_requests status=refunded + paypal_refund_id 기록. 기존 REFUNDED webhook이 invoice void+크레딧노트 자동 처리하므로 중복 주의 — 멱등)
   - `refund-reject`(decision_note 입력 → status=rejected → 매니저에게 자동 메일 via _lib/email-sender)
   - ALLOWED_ACTIONS 배열(line ~2536)에 새 액션 등록 필수.
2. **`_admin/admin.html` "↩️ 환불·취소" 탭 신설** — ⚠️⚠️ 거대 파일 6,231줄 / **4701줄=1MB 인라인 데이터(절대 출력 금지)**. 줄번호만 grep→sed 구간 읽기. Sales 탭 구조 참고 줄: **280~617 + 2564~2598**. 수정 시 4701줄 SHA 보존 패턴.
3. **매니저 환불 신청 진입점** — D-033은 "marketing.html 매니저 본인 신청". ⚠️ `_admin/marketing.html`는 404였음 → 실제 경로 먼저 확인(`marketing.html` 루트 등 probe). 신청 폼/버튼 1개 + refund-request 액션 호출.

### ⚠️ 거대 파일 가드 (멈춤 사고 직접 원인)
`_admin/admin.html` 통째 read/cat/`curl|head`(4701 포함)/`grep -i 내용출력` 금지 → 1MB 쏟아져 끊김. 줄번호만 뽑고(`grep -niE '패턴' file|cut -d: -f1`) sed 구간으로만. 상세: `_os/playbook/large-file-read.md`.

## 🟢 직전 처리 메모
- BL-RENEWAL-WATCH(재계약 탭)은 직전 채팅서 완료(commit 8bf2e84)인데 tasks.json엔 아직 `in_progress`로 남음 → admin-status "진행 중" 배너 오표시 가능. 정리 필요(tasks.json 1MB, 해당 task의 status만 surgical 교체).
- BL-REFUND-FLOW는 step1 commit으로 auto-detect-bot이 in_progress 전환했을 가능성 높음(미확인).

## 환경
repo dgmasters01/tw-b2b(main). raw=bash curl 무인증(단 main 브랜치 raw는 캐시 지연 → 검증은 commit SHA 직지정). commit창구 POST gohotelwinners.com/api/ops/github-commit, header x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK, body{path,content,message}(plain text, base64 금지). 30/h. jq 없음→python3. PayPal: _lib/paypal-client.js(getAccessToken 캐싱·live/sandbox 자동), Merchant HAY86YMQP9T5C.
