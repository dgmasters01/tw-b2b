# 다음 작업 인계 (가벼움 — 의무 헤더 prepend 금지)

일호기/여행능력자들. 한국어, "대표님" 호칭.

## 첫 행동
`_os/boot.md` **1개**만 fetch → 헌법 자가검증.

## 🟣 비즈니스 정책 ("정책 체크" 트리거)
대표님이 **"정책 체크"** → `_os/business-policy/` 문서 꺼내 재검토.
- `refund-and-cancellation.md` — 환불·취소 정책(확정).
- `open-questions.md` — 미결 결정사항(영상/채널 관리 체계, 환불 구현잔여, 메일분기).
새 정책 합의는 이 폴더에 적립. 새 대화 넘어가기 전 정책 반드시 저장.

## 영구 인프라
- 파일 저장: `POST gohotelwinners.com/api/ops/github-commit` (x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK), body `{path,content,message}`. 30/h. ⚠️ python urllib SSL "not yet valid"면 **curl --data-binary @file** 우회.
- DB 실행: `POST .../api/ops/db-query` body `{query}`. 60/h. (SSL 회피: python ssl.CERT_NONE 또는 curl)
- 메일: `POST .../api/email/ops/notify-claude-work` body `{step,summary}`. 50/day.

## 🔴 대기 작업 (환불 정책 구현 — 3단계 중 1단계 완료)
### 2단계: 매니저 환불 버튼 조건부 노출 (다음)
marketing.html `twRefundRequest` 버튼을 정책대로 조건 노출:
- ① 결제(`hotels.paid_at`)+24h 이내 & 노출일(`hotels.published_at`) 미입력 → 버튼 보임 (24h 취소, 수수료공제 안내)
- ② 24h 경과 또는 published_at 입력됨/노출시작 → 버튼 숨김 + "1:1 문의 이용" 안내
- ③ published_at +6개월 & 제휴링크 아고다예약 0건 → 30일간 버튼 재노출 (100% 환불)
- 매니저 화면(marketing.html)이 hotel의 paid_at/published_at/예약수를 알아야 함 → hotel-bookings API 또는 hotels 조회에 필드 추가 확인.
### 3단계: 24h 취소 수수료 공제 계산 + 약관 문구 5개 반영
### (별도) BL-EMAIL-LOCALE-ROUTING: 자동메일 한국=한국어 분기 (hotels.country 기반)

## 🟢 직전 처리 (2026-06-01)
- **노출 시작일 입력 기능 완료 (환불정책 1단계)**: 
  - 백엔드 commit `37dca20`: api/admin.js `handleSetExposureDate` 액션 `set-exposure-date`(hotel_id, exposure_date) → `hotels.published_at` 저장 + 타임라인 기록. ALLOWED_ACTIONS/switch 등록. (라이브 401 가드 확인)
  - UI commit `9e48734`: _admin/admin.html `openHotelQuickMenu`(호텔 quick action 모달)에 "📅 노출 시작일" date input + 저장. 모달 열 때 hotel-detail로 현재 published_at 조회해 표시.
  - **노출일 = `hotels.published_at`** (대표님 수기 입력, 호텔 단위 1개). videos 테이블 영상별 관리와는 분리(open-questions 참조).
- **환불 정책 문서화** `21f4fba`, **미결사항** `960a8d3`.
- (이전) marketing i18n 토글화 `62ed0df`, BL-REFUND-FLOW step2+버그픽스 `ea1e855`, BL-SIGNUP-COUNTRY-FIELD `5d9934e`.

## ⚠️ 거대 파일 가드
`_admin/admin.html`(약 6,740줄) 통째 read/cat 금지 → 약 4,798번째 줄 = 1MB 데이터(절대 출력 금지). 줄번호 grep→sed만. 호텔 quick action 모달=`openHotelQuickMenu`(약 3268~), API호출=`hqmCallApi`(성공시 loadAll 리로드).

## 환경
repo dgmasters01/tw-b2b(main). raw=curl 무인증(검증은 commit SHA 직지정). jq 없음→python3. hotels 주요컬럼: status, paid_at, published_at(=노출시작일), country(정규화됨), agoda_match_status. videos 테이블=영상별(0건, 미구현). 가입: signup→hotel-info(국가select)→verify-email. marketing.html=결제후 매니저 대시보드(토글화 완료).
