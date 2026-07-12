# 인계서 — 스튜디오 후속 4단계 (단계5 완료 → 2·3·4)

**작성**: 2026-07-12 (분석 탭 스크롤 버그 수정 완료 세션)
**다음 채팅 첫 fetch = boot.md → 이 파일.**

---

## 🚦 배경: 지난 대화에서 확정한 "후속 4단계"
채널 메뉴(단계1~5, D-064)는 라이브 완료. 그 뒤 확정된 4단계 순서:
1. **단계5 채널등록·CID편집** — ✅ 완료·라이브(api/channels.js·studio.html, register_from_md/add_cid/retire/restore)
2. **분석 페이지 스크롤 버그** — ✅ **완료·라이브 검증**(이 세션)
3. **채널명 단일화** — ⬜ 다음 착수
4. **호텔 상세 유료계약 카드+소개콘텐츠** — ⬜ **보류(데이터 선결)**

## ✅ 단계2 완료 내용 (이 세션)
- **증상**: 관리자 콘솔(admin.html) → 📈분석 화면에서 스크롤 내리면 상단 탭 줄(전체현황·채널별…)이 화면 밖으로 사라져 못 누름.
- **원인**: ① 인라인 분석의 `#tab-analytics .T` 에 sticky 누락(단독 booking-analytics.html엔 있음) ② body `overflow-x:hidden` 이 sticky를 깸(overflow-y가 자동 auto로 강제됨).
- **수정(_admin/admin.html, 커밋 d9aaebb)**: ① `#tab-analytics .T` 에 `position:sticky;top:60px;z-index:40`+글래스 배경 추가 ② body `overflow-x:hidden→clip`(가로넘침 방지 유지, overflow-y는 자동 visible) ③ 모바일(@media 900) `#tab-analytics .T{top:0}`.
- **검증(라이브 배포본)**: 스크롤 0/700/1400 전부 탭 top:60 고정·클릭 정상, 스크롤 상태서 실제 탭 전환 성공. 가로 스크롤바 없음.
- **주의**: admin.html 은 리포 루트에 없음. **실소스=`_admin/admin.html`**, api/admin-page.js 가 인증 게이트 걸어 서빙. 커밋 경로는 `_admin/admin.html`.

## ⬜ 단계3 (다음 착수) — 채널명 단일화
- **목표**: 분석 페이지·성과표가 채널명을 **channels 테이블에서 실시간**으로 읽게. 지금 분석 페이지엔 하드코딩 채널 라벨이 있어 채널명 바꿔도 자동 반영 안 됨.
- **주의**: "성과표"(D-063)는 아직 미구현 → 이번엔 **분석 페이지(booking-analytics/_admin) 하드코딩 라벨 부분만** 단일화 가능.

## ⛔ 단계4 (보류) — 데이터 선결 필요 (이 세션 실측)
- **실측**: hotels 3곳(데모)·유료 0·인보이스 0·아고다ID 연결 0 / publications 2건. → 유료계약 카드=항상 "무료", 소개콘텐츠=항상 "없음"(빈 껍데기).
- **구조 원인**: admin-hotel-detail.html=매니저 등록 B2B 호텔(3곳)용 / 스튜디오 호텔메뉴(D-062, 미구현)=아고다 2,082호텔 분석용. 두 호텔이 다른 테이블. publications.hid_top1/2/3=아고다 호텔번호인데 hotels.agoda_hotel_id 0곳 채워짐.
- **선결**: 스튜디오 호텔메뉴 구현 + 아고다↔hotels 매칭(agoda_hotel_id 채우기). 이후 단계4 착수해야 실데이터 표시.
- **데이터 있음(확인)**: hotels.paid_at, invoices(번호·결제·상태), publications(hid_top1/2/3·title·youtube_url·channel_code·published_at). 조회수만 미연동(D-059, "—").

## 🔑 인프라
- 커밋: `POST gohotelwinners.com/api/ops/github-commit` x-ops-token `{path,content,message}` (plain text). 30/h.
- DB: `POST /api/ops/db-query` x-ops-token `{query}`. 60/h. (읽기 검증용)
