# 다음 작업 인계 (가벼움 — 의무 헤더 prepend 금지)

일호기/여행능력자들. 한국어, "대표님" 호칭.

## 첫 행동
`_os/boot.md` **1개**만 fetch → 헌법 자가검증.

## 🟣 비즈니스 정책 ("정책 체크" 트리거)
대표님이 **"정책 체크"** → `_os/business-policy/` 문서 재검토.
- `refund-and-cancellation.md` (환불정책 확정), `open-questions.md` (미결: 영상/채널 관리 체계 등).

## 영구 인프라
- 파일 저장: `POST gohotelwinners.com/api/ops/github-commit` (x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK), body `{path,content,message}`. 30/h. ⚠️ python SSL "not yet valid" → **curl --data-binary @file** 우회.
- DB: `POST .../api/ops/db-query` body `{query}`. 60/h. 메일: `POST .../api/email/ops/notify-claude-work` body `{step,summary}`. 50/day.

## 📋 i18n 작업 규칙 (필수)
`_os/playbook/i18n-rule.md` — **모든 화면(admin 포함) EN/한국어 필수. 만들 때 바로 둘 다.** admin도 영어권 관리자(2단계 권한)가 봄.
- 표준: 정적/동적HTML = `data-en`/`data-ko` 속성(admin `applyLang` 자동전환, 동적생성 후 `window.TW_applyLang()` 호출). 변수섞임/alert = `(window.TW.lang==='ko')` 분기.
- 검증: 영역마다 jsdom으로 전환+이벤트보존 확인 후 커밋 (jsdom: /tmp/jsdomtest/node_modules).

## 🔴 대기 작업
### A. admin i18n 잔여 2영역 (대표님 전용·신중)
- **매출/예약 분석 대시보드** (`_admin/admin.html` 약 4865~5267줄): 압축 코드(F/W/P/CB 등 짧은 변수) + 한글 이스케이프(`\uXXXX`) ~100줄. overview/channel/country/city/hotel/pattern/stars/sales 탭. ⚠️ 잘못 건드리면 차트 깨짐 — 신중히, 함수별로 검증하며.
- **admin-manager-hub.html** (별도 파일, 한글 ~47곳, 토글 자체 없음).
- ※ 운영화면(사용자/직원/호텔/환불/큐/노출일/멤버/허브버튼/에러)은 i18n 완료.

### B. 환불 정책 구현 2·3단계 (정책=refund-and-cancellation.md)
- 1단계(노출일 입력) 완료. **2단계**: marketing.html 매니저 환불버튼 조건부 노출(24h+노출일미입력→보임 / 노출후→숨김+1:1문의 / 6개월0건→30일 재노출). **3단계**: 24h수수료공제 + 약관문구5개 + 0건판정(제휴링크 아고다예약).

### C. BL-EMAIL-LOCALE-ROUTING: 자동메일 한국=한국어 분기 (hotels.country 기반).

## 🟢 직전 처리 (2026-06-01) — admin i18n 운영화면 전면 정리
- 노출일 입력칸(data속성·jsdom검증) `c277bd0`
- 환불·취소 탭 `83b2e10`
- 사용자 관리 모달 um-modal `2585ecc`
- 직원 관리 모달 am-modal `6442b69`
- 결정큐/백로그(ps) 토스트/빈상태/툴팁 `9dc2b63`
- CID안내/멤버헤더/매니저허브/토큰에러/연락처 `b899222`
- 노출일 저장 백엔드 `37dca20` (api/admin.js handleSetExposureDate → hotels.published_at)
- 모두 jsdom 전환+이벤트보존 검증 후 커밋. **검증 먼저, 보고 나중** (대표님 지시).

## ⚠️ 거대 파일 가드
`_admin/admin.html`(약 6,760줄) 통째 read/cat 금지 → 약 4,798번째 줄=1MB 데이터(출력 금지). 줄번호 grep→sed만. 호텔 quick action=`openHotelQuickMenu`(약3268~, hqmCallApi 성공시 loadAll). i18n엔진=`applyLang(root,lang)`(6010~, [data-en/ko] 처리), `window.TW_applyLang()` 전역노출.

## 환경
repo dgmasters01/tw-b2b(main). raw=curl 무인증(검증은 commit SHA). jq없음→python3. hotels: status/paid_at/published_at(=노출시작일,수기)/country(정규화). 가입: signup→hotel-info(국가select)→verify-email. marketing.html=결제후 매니저 대시보드(토글화 완료).
