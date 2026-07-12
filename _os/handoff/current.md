# 인계서 — 스튜디오 후속 4단계 (단계5 완료 → 2·3·4)

**작성**: 2026-07-12 (분석 탭 스크롤 버그 수정 완료 세션)
**다음 채팅 첫 fetch = boot.md → 이 파일.**

---

## 🚦 배경: 지난 대화에서 확정한 "후속 4단계"
채널 메뉴(단계1~5, D-064)는 라이브 완료. 그 뒤 확정된 4단계 순서:
1. **단계5 채널등록·CID편집** — ✅ 완료·라이브(api/channels.js·studio.html, register_from_md/add_cid/retire/restore)
2. **분석 페이지 스크롤 버그** — ✅ **완료·라이브 검증**(이 세션)
3. **채널명 단일화** — ✅ **완료·라이브**(이번 세션, dd487b4)
4. **호텔 상세 유료계약 카드+소개콘텐츠** — ⬜ **보류(데이터 선결)**

## ✅ 단계2 완료 내용 (이 세션)
- **증상**: 관리자 콘솔(admin.html) → 📈분석 화면에서 스크롤 내리면 상단 탭 줄(전체현황·채널별…)이 화면 밖으로 사라져 못 누름.
- **원인**: ① 인라인 분석의 `#tab-analytics .T` 에 sticky 누락(단독 booking-analytics.html엔 있음) ② body `overflow-x:hidden` 이 sticky를 깸(overflow-y가 자동 auto로 강제됨).
- **수정(_admin/admin.html, 커밋 d9aaebb)**: ① `#tab-analytics .T` 에 `position:sticky;top:60px;z-index:40`+글래스 배경 추가 ② body `overflow-x:hidden→clip`(가로넘침 방지 유지, overflow-y는 자동 visible) ③ 모바일(@media 900) `#tab-analytics .T{top:0}`.
- **검증(라이브 배포본)**: 스크롤 0/700/1400 전부 탭 top:60 고정·클릭 정상, 스크롤 상태서 실제 탭 전환 성공. 가로 스크롤바 없음.
- **[후속·이번 세션] 검은 바 보완(커밋 29b053b)**: `#tab-analytics .T` sticky 배경이 다크 글래스`rgba(10,10,15,.85)`라 밝은 테마에서 글자 안 보임+카드와 안 어울림 → `rgba(248,247,244,.92)` 밝은 글래스로 교체. 스크롤 고정·blur 유지.
- **주의**: admin.html 은 리포 루트에 없음. **실소스=`_admin/admin.html`**, api/admin-page.js 가 인증 게이트 걸어 서빙. 커밋 경로는 `_admin/admin.html`.

## ✅ 단계3 완료 (이번 세션) — 채널명 단일화
- **구현(_admin/admin.html, 커밋 dd487b4)**: 분석 진입 시(`_BKA_init`) `GET /api/channels`(쿠키 세션) 1회 조회 → code→name 맵 생성 → baked `D.ch[].ch` 라벨을 현재 channels.name 으로 치환(`_applyChannelNames`), 재렌더. `_BKA_mount` 재진입 시 캐시맵 재적용. 시장 접미사(괄호 "(대만)" 등) 보존. 조회 실패 시 baked 라벨 유지(무해).
- **브리지 맵**: `_CH_ALIAS` = 굳어진 baked 라벨→code 1:1 (TW/HT/JP/ZH/KT/VN). 7/7 커버 검증.
- **실측 변화**: 대만 `World Hotel (대만)`→`世界就是家 (대만)`, 베트남 `Korea Hotel (베트남)`→`reviewkhachsan (베트남)`. 나머지 5개는 이미 일치.
- **대표님 결정**: 표기는 **channels.name 기본명 그대로**(世界就是家 등). name_en 전환은 `_loadChannelNames` 의 `m[c.code]=c.name` 한 줄만 `c.name_en` 로 바꾸면 됨.
- **미적용**: 단독 `booking-analytics.html`(anon 페이지)엔 동일 모듈 미주입 — anon 이라 `/api/channels` 401 → baked 유지되므로 실익 낮음. 필요 시 후속.
- **성과표(D-063)** 는 여전히 미구현 → 성과표 채널명 단일화는 그 구현 시 함께.

## ⛔ 단계4 (보류) — 데이터 선결 필요 (이 세션 실측)
- **실측**: hotels 3곳(데모)·유료 0·인보이스 0·아고다ID 연결 0 / publications 2건. → 유료계약 카드=항상 "무료", 소개콘텐츠=항상 "없음"(빈 껍데기).
- **구조 원인**: admin-hotel-detail.html=매니저 등록 B2B 호텔(3곳)용 / 스튜디오 호텔메뉴(D-062, 미구현)=아고다 2,082호텔 분석용. 두 호텔이 다른 테이블. publications.hid_top1/2/3=아고다 호텔번호인데 hotels.agoda_hotel_id 0곳 채워짐.
- **선결**: 스튜디오 호텔메뉴 구현 + 아고다↔hotels 매칭(agoda_hotel_id 채우기). 이후 단계4 착수해야 실데이터 표시.
- **데이터 있음(확인)**: hotels.paid_at, invoices(번호·결제·상태), publications(hid_top1/2/3·title·youtube_url·channel_code·published_at). 조회수만 미연동(D-059, "—").

## 🟢 스튜디오 6메뉴 진행 (BL-STUDIO-MENU-6TAB · studio.html)
- **올리기** ✅ 구현(docx→원고 파싱·publications·설명란/링크)
- **채널** ✅ 구현·라이브(D-064: 채널/CID 마스터, 새 채널 .md 등록, 수정)
- **호텔** ✅ **완료·라이브(이번 세션)** — D-062: `api/content-hotels`(신규, v_content_hotel_stats 조회·에디터 세션·수수료 없음) + studio.html view-hotel 실구현. 호텔별 노출·최고순위(TOP1/2/3)·확정/취소·확정률·예약기간 카드. 라이브 검증: 실호텔 6곳(호텔 라 포레스타 HT TOP1 확정3/취소2 등). 커밋 api=87d683f, studio=c092e80.
- **성과표** ✅ **완료·라이브(이번 세션)** — D-060: `api/content-performance`(신규, v_channel_stats 수수료·거래액 제외 + publications 영상수 + v_content_hotel_exposure 영상별 호텔) + studio.html view-perf(요약카드 4 + 채널별 + 영상별). 라이브 검증: 채널 7·영상 2·노출호텔 6·확정예약 3,756. 채널명 단일화 자동(뷰가 channels 조인). 커밋 api=8747863, studio=8e8583c. ※조회수·클릭 칸은 발행 영상 0개라 "—"(아래).
- **키워드** ✅ **완료·라이브(이번 세션)** — D-060: 뷰 2개 신설(v_content_keyword_cities·v_content_keyword_hotels: bookings_agoda↔publications TOP1/2/3 대조) + `api/content-keywords`(신규) + studio.html view-keyword. "예약 많은데 영상 없는 도시·호텔" 추천. 라이브: 도시 25·호텔 30(오사카 583건·타이베이 349건 등 노출0). 커밋 api=b0e588b, studio=70a0b48.
- **전략** ⬜ **마지막 1개** — 콘텐츠 기획 큐. 신규 데이터 모델 필요(content_queue 테이블: 아이디어→기획→제작→완료 + 담당/메모). v1 제안: 키워드 추천에서 '이거 만들자' → 큐 적재 → 상태 진행. **쓰기(CRUD) 포함이라 별도 집중 작업**으로 다음 진행.
- **우선순위 근거**: 백엔드 뷰가 이미 done(v_content_hotel_stats)이라 호텔이 최소공수·최대가치 → 1위로 완료. 다음은 성과표(데이터 있음), 그다음 키워드/전략(선행 데이터 필요).

## 📌 조회수/클릭 파이프라인 실측 (이번 세션 · 대표님 몫 아님)
- **YOUTUBE_API_KEY**: 대표님이 이미 세팅 완료(확인). → 조회수 관련 대표님 요청 없음.
- **현재 수집 대상 0개**: videos 테이블 0행, publications의 youtube_video_id 0개(=발행된 영상 0). → 조회수 수집기(BL-YT-VIEWS-COLLECT)를 지금 만들어도 가져올 게 없음. "앞으로 올릴 영상부터" 원칙. **영상 발행이 시작되면 수집기 붙이기.**
- **저장처는 이미 존재**: videos 테이블에 view_count·like_count·click_count·last_stats_update 컬럼 있음. cron 없음(vercel.json). 수집기+주1회 cron 만들면 됨(키·저장처 준비완료라 순수 제작만 남음).
- **클릭(BL-TRACK-001)**: link_clicks 테이블 없음 + gohotel.win 단축URL infra 미구축. 발행+클릭추적 착수 시 함께.
- **db-query 능력**: `/api/ops/db-query`는 DDL/DML 실행 허용(파괴적 DROP만 차단) → 스키마·데이터 작업 Claude 직접 가능.

## 🔑 인프라
- 커밋: `POST gohotelwinners.com/api/ops/github-commit` x-ops-token `{path,content,message}` (plain text). 30/h.
- DB: `POST /api/ops/db-query` x-ops-token `{query}`. 60/h. (읽기 검증용)
