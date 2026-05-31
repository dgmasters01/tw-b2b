# 다음 작업 인계 (가벼움 — 의무 헤더 prepend 금지)

일호기/여행능력자들. 한국어, "대표님" 호칭.

## 첫 행동
`_os/boot.md` **1개**만 fetch → 헌법 자가검증.

## 🟣 비즈니스 정책 (중요 — "정책 체크" 트리거)
- 대표님이 **"정책 체크"** 라고 하면 → `_os/business-policy/` 문서들을 꺼내 함께 재검토한다.
- 현재 문서: `_os/business-policy/refund-and-cancellation.md` (환불·취소 정책, 2026-05-31 합의).
- 새 비즈니스 정책 합의가 나오면 이 폴더에 문서로 적립한다. 새 대화 넘어가기 전 정책은 반드시 여기 저장.

## 영구 인프라
- **파일 저장**: `POST gohotelwinners.com/api/ops/github-commit`, header `x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK`, body `{path,content,message}` (plain text). 30/h. ⚠️ python urllib가 SSL "certificate not yet valid"로 막히면 **curl --data-binary @file** 로 우회(컨테이너 시계 문제).
- **DB 실행**: `POST .../api/ops/db-query`, body `{query}`. DDL 즉시 실행. 60/h.
- **메일 알림**: `POST .../api/email/ops/notify-claude-work`, body `{step,summary}` (둘 다 필수). 50/day.

## 🔴 대기 작업
### A. BL-REFUND-FLOW 정책 반영 (신규 — 위 정책문서 기반 구현)
환불 정책이 확정됐으나 코드 미반영. 구현 TODO:
- admin 호텔 관리에 **노출일(캠페인 시작일) 수기 입력 칸** 신설 (DB 컬럼 필요 여부 확인).
- 매니저 환불 버튼 **조건부 노출**: ①결제+24h이내 & 노출일미입력 → 보임(수수료공제 취소) ②노출일입력/노출후 → 숨김+1:1문의 안내 ③첫노출일+6개월 & 제휴링크 아고다예약 0건 → 30일간 재노출(100% 환불).
- 24h 취소 시 **PayPal 수수료 공제** 계산(환불액=결제액−수수료).
- **약관 문구** 5개 반영(정책문서 참조).
- 0건 판정 = 제휴링크 아고다 예약 기준.

### B. BL-EMAIL-LOCALE-ROUTING (P1 · order 10)
자동 메일 약 12종이 전부 영어. 가입 국가(`hotels.country`, 정규화됨)가 South Korea면 한국어, 그 외 영어로 분기. 발송 모듈 `api/_lib/email-sender.js`(sendSystemEmail). 호출처 grep → locale 분기 설계.

## 🟢 직전 처리 (2026-05-31)
- **i18n 점검 완료**: 고객·매니저 페이지 중 진짜 한글/영어 혼용은 **marketing.html 하나뿐**(나머지 sales/dashboard 등은 이미 분기 정상 — 첫 점검은 줄단위라 오탐多). 
- **marketing.html 토글화 완료** commit `62ed0df`: 환불카드 한글고정 수정 → 전 텍스트 isKo 분기 + `window.TW.switchLang` 래핑으로 헤더 EN/한국어 버튼 클릭 시 재렌더. (`window.__mkLast`에 마지막 hotel/data 저장 후 재호출 방식)
- **환불 정책 문서화** commit `21f4fba`: `_os/business-policy/refund-and-cancellation.md`.
- (이전) BL-REFUND-FLOW step2+버그픽스(ea1e855), BL-SIGNUP-COUNTRY-FIELD(5d9934e, 국가 드롭다운 정규화), BL-RENEWAL-WATCH done.

## ⚠️ 거대 파일 가드
`_admin/admin.html`(약 6,690줄) 통째 read/cat 금지 → 약 4,798번째 줄 = 1MB 데이터(절대 출력 금지). 줄번호 grep→sed만.

## 환경
repo dgmasters01/tw-b2b(main). raw=curl 무인증(검증은 commit SHA 직지정). jq 없음→python3. PayPal: _lib/paypal-client.js, Merchant HAY86YMQP9T5C. 메일: _lib/email-sender.js. 가입: signup.html(계정)→hotel-info.html(호텔정보·국가select)→verify-email.html. marketing.html=결제완료 매니저 대시보드(영어 고정이었으나 토글화 완료).
