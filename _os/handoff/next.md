# 다음 작업 인계 (가벼움 — 의무 헤더 prepend 금지)

일호기/여행능력자들. 한국어, "대표님" 호칭.

## 첫 행동
`_os/boot.md` **1개**만 fetch → 헌법 자가검증.

## 영구 인프라 (2026-05-30 신설 — 외워둘 것)
**파일 저장 + DB 실행 한 쌍. 다시는 대표님께 수동 붙여넣기 시키지 말 것.**
- **파일 저장**: `POST gohotelwinners.com/api/ops/github-commit`, header `x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK`, body `{path, content, message}` (plain text, base64 금지). 30/h.
- **DB 실행**: `POST gohotelwinners.com/api/ops/db-query`, 동일 header, body `{query}` → Supabase Management API로 DDL/SQL 즉시 실행. DDL 성공 시 `rows:[]` 정상. 60/h. 검증은 information_schema로.
- 서버 열쇠: Vercel env `SUPABASE_ACCESS_TOKEN`(sbp_, Never 만료), `GITHUB_PAT`(만료 2026-07-26). 엔드포인트 `api/ops/db-query.js`(2fea633), `api/ops/github-commit.js`.

## 🔴 1순위 작업: BL-SIGNUP-COUNTRY-FIELD (P1 · order 9 · 의존성 없음)
제목: [가입 시 국가 선택 필수] 동남아 7개국 상단 노출.
- 매니저 가입 폼에 국가 선택 필드 추가(필수). 동남아 7개국(베트남/태국/캄보디아/라오스/미얀마/필리핀/인도네시아 등 — tasks.json notes 확인)을 셀렉트 상단에 노출.
- 가입 경로 파일 probe 먼저: `signup.html`/`sales.html`/가입 폼 위치 확인. hotels 또는 매니저 프로필 테이블에 country 컬럼 존재 여부 db-query로 확인 → 없으면 ALTER로 추가.
- **연계**: order 10 `BL-EMAIL-LOCALE-ROUTING`(자동메일 12개 영어 default, 한국 매니저만 한국어 분기)이 이 작업에 depends_on. 국가 필드가 생기면 메일 로케일 분기의 기준이 됨 → 이어서 진행 권장.

## 🟢 직전 처리 메모 (2026-05-30)
- **BL-REFUND-FLOW step2 완료** → BL done(100%). 커밋: api/admin.js `89184f5`(환불 액션 3종 refund-list/approve/reject + 거절시 매니저 자동 통보메일 sendSystemEmail), _admin/admin.html `1ad4266`('↩️ 환불·취소' 탭: 목록/요약/승인·환불/거절 UI + pending 배지), marketing.html `69f1862`(매니저 본인 신청 진입점).
  - **설계 결정**: 매니저 신청은 admin.js `refund-request` 액션이 아니라 **marketing.html에서 RLS 직접 insert**로 구현. 이유 = admin.js `requireAdmin`은 관리자 전용 인증이라 매니저 호출 불가, RLS가 이미 "매니저 본인 + status=pending" insert 허용. D-033 "매니저 본인 신청" 본질 충족.
  - **검증 완료**: refund_requests↔hotels/payments FK 조인 OK, payments.status CHECK 제약=`['pending','succeeded','failed','refunded','canceled']` → approve 핸들러 `succeeded` 정합 확인. 라이브 `/api/admin?action=refund-list` HTTP 401(가드 동작) = 라우팅 정상.
  - **⚠️ 미검증/발견사항**: ① PayPal **sandbox 환불 E2E는 payments 데이터 0건이라 보류** — 실결제 발생 후 승인→refundCapture 실호출 1회 검증 필요. ② 기존 `handleRefundHotel`(admin.js ~1471줄, 별개 BL-ADMIN-USER-MANAGEMENT)이 `status=eq.completed`로 조회하나 'completed'는 CHECK 제약에 없는 값 → 항상 0건 매칭 버그. 단 내 `handleRefundApprove`가 사실상 이를 대체하므로 영향 적음. 정리할지 대표님 판단.
- **BL-RENEWAL-WATCH** status `in_progress`→`done` 정리 완료(배너 오표시 해소). commit `2247e44`(tasks.json).

## ⚠️ 거대 파일 가드
`_admin/admin.html`(현재 6,688줄) 통째 read/cat/`curl|head`/`grep -i 내용출력` 금지 → **약 4,798번째 줄 = 1MB 데이터(절대 출력 금지)**. 줄번호만 grep→sed 구간으로만. 상세 `_os/playbook/large-file-read.md`.

## 환경
repo dgmasters01/tw-b2b(main). raw=curl 무인증(main raw 캐시지연 → 검증은 commit SHA 직지정). GitHub API 비인증은 rate limit. jq 없음→python3. PayPal: _lib/paypal-client.js(refundCapture 멱등), Merchant HAY86YMQP9T5C. 메일: _lib/email-sender.js(sendSystemEmail=고객/매니저, sendOpsEmail=내부).
