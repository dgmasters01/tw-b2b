# 다음 작업 인계 (가벼움 — 의무 헤더 prepend 금지)

일호기/여행능력자들. 한국어, "대표님" 호칭.

## 첫 행동
`_os/boot.md` **1개**만 fetch → 헌법 자가검증.

## 영구 인프라 (외워둘 것)
- **파일 저장**: `POST gohotelwinners.com/api/ops/github-commit`, header `x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK`, body `{path, content, message}` (plain text, base64 금지). 30/h.
- **DB 실행**: `POST gohotelwinners.com/api/ops/db-query`, 동일 header, body `{query}` → DDL/SQL 즉시 실행. DDL 성공 시 `rows:[]` 정상. 60/h. 검증은 information_schema로.
- **메일 알림**: `POST gohotelwinners.com/api/email/ops/notify-claude-work`, 동일 header, body `{step, summary}` (둘 다 필수). 50/day.

## 🔴 1순위 작업: BL-EMAIL-LOCALE-ROUTING (P1 · order 10)
제목: [자동 메일 12개 영어 default] 한국 매니저만 한국어 분기.
- 지금 자동 메일(가입확인/인증/Agoda안내 등 약 12종)이 전부 영어로만 나감. 이제 **국가 데이터가 정규화됐으니**(아래 직전 처리) 그걸 기준으로 한국어 분기.
- 메일 발송 모듈: `api/_lib/email-sender.js`(sendSystemEmail). 발송 호출처들을 찾아 수신자 locale 결정 → 한국 매니저(`hotels.country='South Korea'`)면 한국어 본문, 그 외 영어.
- 먼저 probe: 자동 메일 발송처(api/ 내 sendSystemEmail 호출처, webhook, signup 트리거) grep. 본문이 하드코딩 영어인지 템플릿인지 확인 후 ko/en 분기 설계.

## 🟢 직전 처리 메모 (2026-05-30)
- **BL-SIGNUP-COUNTRY-FIELD 완료**(done) commit `5d9934e`. 국가 입력을 **자유 텍스트 → 정규화 드롭다운**으로 교체.
  - **위치 판단**: D-032 target은 signup.html이나, signup.html은 계정생성만 하고 **실제 국가 입력은 hotel-info.html**(2단계 가입의 호텔정보 단계)이라 거기 구현. `<select id="edit-country" required>` 동남아 10국 상단 + 아시아 + 기타. **value는 영문 표준명으로 정규화**(DB hotels.country=text에 영문 저장) → 메일 로케일 분기의 기반.
  - Agoda 자동채움값 매칭 `setCountrySelect()` 헬퍼(정확→data-ko→부분, 실패시 미선택). 저장 시 country 필수 검증 추가. 라이브 배포 확인 완료.
- **BL-REFUND-FLOW 완료**(done, 100%). step2: api/admin.js `89184f5`, _admin/admin.html `1ad4266`, marketing.html `69f1862`. **버그픽스 `ea1e855`**: 환불 탭 별도 IIFE에서 `T` 미접근("T is not defined") → rfToken `window.TW.sb`로 수정. 라이브 화면 검증 완료.
  - ⚠️ 미검증: PayPal sandbox 실환불 E2E는 payments 0건 → 실결제 후. handleRefundHotel(별개 BL) status='completed' 버그(CHECK엔 'succeeded') 발견 — approve가 대체하므로 영향 적음.
- **BL-RENEWAL-WATCH** in_progress→done 정리 완료.

## ⚠️ 거대 파일 가드
`_admin/admin.html`(약 6,690줄) 통째 read/cat/`curl|head`/`grep -i 내용출력` 금지 → **약 4,798번째 줄 = 1MB 데이터(절대 출력 금지)**. 줄번호만 grep→sed. 상세 `_os/playbook/large-file-read.md`.

## 환경
repo dgmasters01/tw-b2b(main). raw=curl 무인증(검증은 commit SHA 직지정). jq 없음→python3. PayPal: _lib/paypal-client.js, Merchant HAY86YMQP9T5C. 메일: _lib/email-sender.js. 가입 흐름: signup.html(계정) → hotel-info.html(호텔정보, 국가 select 있음) → verify-email.html.
