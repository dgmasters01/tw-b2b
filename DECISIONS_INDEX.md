# DECISIONS INDEX (AI용)

**제정일:** 2026-05-03
**용도:** AI 즉시 검색용 의사결정 인덱스 (헌법 6조 본체 — 이중 형식 의무)
**짝 문서:** `DECISIONS.md` (사람용 / 스토리 형식)

---

## ⚠️ 동기화 규칙

- 이 문서는 **AI(Claude)가 30초 안에 의사결정 전체를 스캔**할 수 있도록 구조화된 표 형식으로 보관한다.
- `DECISIONS.md` 가 갱신되면 이 인덱스도 동기화 (sync_engine 책임).
- ID(D-XXX)는 **고정 불변**. 한 번 부여하면 절대 재사용 금지.
- 카테고리: `infra` / `data` / `payment` / `i18n` / `ux` / `analytics` / `feature` / `strategy` / `policy`
- 상태: `확정` / `보류` / `검토중` / `폐기`

---

## 📋 결정 인덱스

| ID | 결정 | 카테고리 | 날짜 | 상태 | 영향받는 작업 / 문서 |
|---|---|:---:|:---:|:---:|---|
| D-095 | **shop 의 DB는 하나로 같이 쓴다** — 코드·배포·장부이름표·창구레인·RLS는 따로, **Supabase 프로젝트·호텔명부·가격창고·봇·부품은 같이**. 🔴 DB 를 나눠도 호출 문제는 안 풀리고 아고다는 **오히려 두 배로 먹는다**(창고 둘이면 같은 호텔 두 번 조회). 창구 120/h 는 관리·개발용이지 사이트용이 아님. 나눌 신호 4개(패키지 결제·개인정보 도입 / 한 사업이 60% 초과 / CPU·커넥션 경고 반복 / 사이트 30개↑는 읽기사본 추가) | infra | 2026-08-16 | 확정 | _business/decisions/2026-08-16-db-shared-or-split.md, _business/shop/SHOP_RENEWAL.md |
| D-094 | **사업이 늘어날 때의 한도 설계** — 문 몫 90/h 는 사업마다 주는데 **전체 천장 120/h 는 고정** → 사업이 늘수록 각자 몫이 줄어든다. 새 원칙 = **「사업이 늘어도 문 두드리는 횟수는 늘지 않게」**. 늘려도 되는 것(도메인·레포·프로젝트·prefix) / 절대 안 되는 것(DB 인스턴스·봇 종류·외부 API 계정·규칙문서). 병목 5개 처방 = 정적 굽기·묶음 커밋·창고1개+봇1개·봇 순회·요금은 나중. 🔴 120/h 는 **관리·개발용**이지 손님 화면용이 아니다 | infra | 2026-08-16 | 확정 | docs/ARCHITECTURE.md §4-B, _business/decisions/2026-08-16-scale-limits.md |
| D-093 | **travelwinners.shop 메인 화면 확정(O-1)** — 카드=C형(1위 크게·2·3위 딱지 없음) · 열면 금토일 달력까지 · 세로순서 ①영상 ②묶음줄 ③이벤트 ④지난영상 ⑤아고다 뒷문 · 🔴 대표 그림은 **유튜브 썸네일 폐기 → 아고다 Top1 사진**(채널 썸네일이 같은 틀이라 구분 불가) · 메뉴는 **「어디 가세요?」 버튼+올라오는 시트**(모바일 표준, 시트 안은 인기도시6→나라목록→검색 순) · 조회 한도는 서버가 아니라 키/계정 → **나누지 않고 창고 통합** · 쿠팡은 「여행준비물」 페이지에만 | ux | 2026-08-16 | 확정 | _business/shop/SHOP_RENEWAL.md, _business/decisions/2026-08-16-shop-main.md, shop-main-v2.html, shop-main-v3.html |
| D-092 | **결정 확정 시 문서 4곳 자동 갱신 의무** — 결정문서만 만들고 인덱스에 안 넣으면 «있는 줄 모르는» 상태가 된다(2026-08-11~12 에 5건이 그랬고, 같은 함정으로 8/11 아침 D-071 을 못 찾아 틀렸다). 🔴 **묻지 않고** ①전문 ②INDEX ③DECISIONS ④SYSTEM_MAP·ops.html 을 갱신한다. 빠뜨리면 `decision-index-guard` 봇이 GitHub Issue 로 잡는다(매일 KST 06시+push) | ops | 2026-08-12 | 확정 | _os/boot.md §3, .github/workflows/decision-index-guard.yml |
| D-086 | 아고다 번호 잣대 순서 복원 — **예약에 찍힌 번호 1순위 · 이름 2순위 · 거리 3순위**(D-071 §2-A). 한 건물에 여러 호텔이라 거리로 고르면 옆 건물을 붙인다. 949곳 연결(2,006→2,955) · 대조 154→192. 🔴 리뷰수·주소 물증은 실측 0건(우리 값≠아고다 최신값·주소 체계 다름) — 작동한 건 이름 완전일치뿐 | hotel | 2026-08-11 | 확정 | hotels, _business/decisions/2026-08-11-agoda-id-link.md, hotels_agoda_backup_20260811 |
| D-087 | DB 잠금 2차 — 표 **77개 전부** RLS. 8/4에 27개 잠갔는데 3주 만에 24개가 다시 열려 있었다(구독자 이메일 포함). 🔴 사람이 기억하는 규칙은 샌다 → **점검판에 「안 잠긴 표 N개」 상시 표시**. 보안 방어선 5겹 정리 · 조직 분리는 방어선이 아니다(계정 하나면 같이 털림) | infra | 2026-08-11 | 확정 | 전체 public 표, ops.html, _business/decisions/2026-08-11-db-lock-round2.md |
| D-088 | **창구 차선 분리 + 블로그 전용 문** — 전체 120회/시간(DB 보호선·절대 안 올림, 7/22 뻗은 이력) 유지하되 사업별 90회 상한(`x-ops-client`). staycurate 자기 문 신설(자기 열쇠·스튜디오 장부 쓰기 차단). gohotelwinners 죽어도 블로그 발행 계속. 🔴 열쇠 만료 2027-08-10 | infra | 2026-08-11 | 확정 | api/ops/db-query.js, staycurate/api/ops/*, staycurate/docs/DOOR.md, ops.html |
| D-089 | **아고다 명부 301만곳 구축** — 조건 없이 전 세계 3,015,718곳·221개국 적재(누락 0). 8/1(15개국)·8/9(6.9만)처럼 **조건을 걸면 반드시 부족해져 또 넣게 된다**. 기존 69,785곳은 hotel_code 그대로 승계. 9시간 무중단(새 표→검증→이름 바꿔치기) · 갱신 주기 = **분기**(신규 3.8%/10일·폐업 1.1%/10일 실측) | data | 2026-08-11 | 확정 | hotel_master, hotel_master_old_20260811, agoda_file_source, _business/decisions/2026-08-11-agoda-master-full.md |
| D-090 | **키워드 수요 = 구글 트렌드로 정정** — 헌장 §7-E-3(2026-07-14)이 「자동완성 순위=수요」를 폐기했는데 `키워드-실측.md`와 코드가 3주간 옛 방식 유지. 유후인에서 검색 0인 호텔 고유명이 기회점수 1위로 올라옴(히요리 사례 재현). 트렌드 없으면 **0이 아니라 «모름»** · 재기 전 **DB(trend·snapshot) 먼저 조회**(28개 도시 기조사) · 장부는 **기획 단계**에서 만든다(A안) | content | 2026-08-12 | 확정 | api/youtube-book.js, api/_lib/kwtool.js, _content/youtube/키워드-실측.md v2 |
| D-091 | **도시 이름 별칭 체계** — 같은 곳을 셋이 다르게 부른다(아고다 `유후` / 키워드DB `cc:japan|yufu` / 사람 `유후인`). 🔴 **하나로 강제하지 않는다**(아고다도 «/»로 272개 도시를 복수 표기). `city_alias_name`(76,478건·종류 구분) + `city_link`(아고다↔키워드 97개 연결) + `find_city()`. 새 표기는 마주칠 때마다 쌓는다 | data | 2026-08-12 | 확정 | city_alias_name, city_link, find_city(), _business/decisions/2026-08-12-city-alias.md |
| D-001 | 엑셀 업로드 단일 데이터 입수 방식 | data | 2026-04-27 | 확정 | BL-005, BL-008 |
| D-002 | USD / PayPal 결제 (Merchant ID HAY86YMQP9T5C) | payment | 2026-04 | 확정 | BL-013, signup.html |
| D-003 | 영어 우선 + 한국어 토글 (data-ko 일괄 적용) | i18n | 2026-04 | 확정 | 모든 외부 노출 페이지 |
| D-004 | 4 시스템 카테고리 (Business Docs / Task & Status / Page Gallery / Service Ops) | infra | 2026-05-03 | 확정 | 헌법 부칙 5 |
| D-005 | UX/UI 통일 우선, 콘텐츠 디테일 나중 (Aurora Trendy 전면 적용 후 사업 시작) | strategy | 2026-05-03 | 확정 | 헌법 부칙 6, BL-AURORA-MIGRATION |
| D-006 | YouTube 더보기 호텔별 단축 URL 클릭 카운트 (gohotel.win/h/{hotel_id}) | analytics | 2026-05-03 | 확정 | BL-TRACK-001 |
| D-007 | 매니저 대시보드 한 화면 7영역 (헌법 7조 매니저 적용) | ux | 2026-05-03 | 확정 | BL-MANAGER-DASH-001 |
| D-008 | 조회수 보조 지표화, 메인은 채널 노출/예약/매출 추정 | analytics | 2026-05-03 | 확정 | BL-MANAGER-DASH-001 |
| D-009 | 인보이스 / 영수증 PDF 영구 다운로드 (1년 후에도 1클릭) | feature | 2026-05-03 | 확정 | BL-INVOICE-001 |
| D-010 | 카테고리별 단일 진실 파일 매핑 표준 (4 카테고리 각각의 .md/.json 명시) | infra | 2026-05-03 | 확정 (개정) | BL-CATEGORY-REMAP, BL-HUB-RETIRE |
| D-011 | 3-State 권한 시스템 (🤖 자동 / 👥 직원 / 👤 대표님) + 영·한 체계 + admin-status 범위 | infra | 2026-05-04 | 확정 | BL-STATUS-DASH |
| D-012 | 대용량 admin 페이지 3-Layer 분리 (Summary/Display/Full) + admin-tasks 대시보드 흡수 | infra | 2026-05-04 | 확정 | BL-STATUS-DASH, BL-PAGE-DEDUP |
| D-013 | admin-hub.html 폐기 — 사이드바 = 라우팅 / admin-status = 통합 진입점 (클릭 단계 3→1) | infra | 2026-05-04 | 확정 | BL-HUB-RETIRE, D-010 매핑 표 카테고리 0 이관 |
| D-014 | chat-logs 시스템 — 사람용+AI용 이중 형식 강제 (헌법 6조 본체) + 인증 게이트 | infra | 2026-05-04 | 확정 | BL-CHAT-LOG-SYSTEM Phase 1~3 |
| D-015 | BL-ADMIN-AUTH-V2 — 5단계 권한 + 초대 + 즉시 박탈 + 무제한 이력 | policy | 2026-05-05 | 확정 | BL-ADMIN-AUTH-V2 |
| D-016 | BL-ADMIN-AUTH-V2 라우터 통합 — Vercel Hobby 12 함수 한도 회피 | infra | 2026-05-04 | 확정 | BL-ADMIN-AUTH-V2 |
| D-017 | 자격증명 라이프사이클 — 개발기간(등록 정상) → 서비스기간(일괄 폐기) | policy | 2026-05-08 | 확정 | 헌법 부칙 4, `_os/playbook/credentials-lifecycle.md` |
| D-018 | Vercel Hobby → Pro 업그레이드 ($20/월) — 약관 준수 + 일일 배포 한도 30배 + webhook race 차단 | infra | 2026-05-08 | 확정 | BL-VERCEL-DEPLOY-RACE-GUARD, gohotelwinners.com 호스팅 |
| D-019 | admin-status.html 중복 3중 정리 + 작업 지휘소 통합 — ③·⑥·⑦ 제거 | infra | 2026-05-08 | 확정 | BL-DEDUP-CONSOLIDATE (8단계), BL-URGENT-CARD-FLOW 흡수 |
| D-020 | 헌법 자가 검증에 사전 안전장치 3개(북극성/중복점검/한채팅한결정) — 방향 상실 방지 | policy | 2026-05-08 | 확정 | OPERATIONS_CHARTER.md 11조 자가검증, _os/boot.md 5-A |
| D-021 | BL-ADMIN-AUTH-PERF — Edge Middleware 단일 게이트 (A-2 정석, Hobby 12 한도 회피) | infra | 2026-05-09 | 확정 | middleware.ts(신규), admin-* 12개 페이지 인증 코드 제거 (2편) |
| D-022 | BL-ADMIN-LIGHTMODE — 다크/라이트 토큰 한 쌍 + 사이드바 토글 + OS 따라가기 | ux | 2026-05-10 | 확정 | BL-ADMIN-LIGHTMODE, shared.css 토큰 매핑 |
| D-023 | BL-CLAUDE-DISCIPLINE — 헌법 부칙 16 신설 + 인계서 강제 헤더 + 클로드 4개 의무 | policy | 2026-05-10 | 확정 | OPERATIONS_CHARTER.md 부칙 16, `_os/playbook/claude-discipline.md`, `_os/handoff-header.md` |
| D-024 | BL-BASELINE-AUTO-TASK — 헬스체크 결과를 tasks.json에 자동 등록 | infra | 2026-05-11 | 확정 | BL-BASELINE-AUTO-TASK, `_os/scripts/auto-task-from-health.mjs` |
| D-025 | BL-003 분할 — A(Agoda Matching=호텔 가입 승인 게이트, P0) + B(Affiliate 엑셀→예약 검증, P1) | strategy | 2026-05-11 | 확정 | BL-003-A, BL-003-B |
| D-026 | BL-ADMIN-AUTH — A안 2단계 권한 (CEO/Staff) + 로그 3종(접속/실행/admin-status 최근 활동) | policy | 2026-05-11 | 확정 | BL-ADMIN-AUTH |
| D-027 | BL-ADMIN-AUTH 진행 확정 — D-026 그대로 박음 (대표님 한 마디 확정 단계) | policy | 2026-05-11 | 확정 | BL-ADMIN-AUTH |
| D-028 | 갤러리 완성도(흐름·카테고리·빈페이지) + BEFORE/AFTER 자동 이력 보관 봇 복구 | infra | 2026-05-12 | 확정 | BL-GALLERY-FLOW-COMPLETENESS, BL-CAPTURE-BOT-RESTORE |
| D-029 | BL-015 — A안 확정. Playwright 자동 캡처로 admin-status Page Gallery에 BEFORE/AFTER 슬롯 박음 | infra | 2026-05-12 | 확정 | BL-015, BL-CAPTURE-BOT-RESTORE |
| D-030 | BL-GALLERY-FLOW-COMPLETENESS — 진행 승인. BL-SERVICE-MAP-OS 선행 후 갤러리 작업 흡수 | infra | 2026-05-12 | 확정 | BL-SERVICE-MAP-OS, BL-GALLERY-FLOW-COMPLETENESS |
| D-031 | "journey" 단어 폐기 — 서비스명(GoHotel) 접두사로 통일 (Claude 자율 결정) | infra | 2026-05-13 | 확정 | BL-RENAME-GOHOTEL, JOURNEY.md→GOHOTEL_FLOW.md, 13곳 일괄 변경 |
| D-032 | 동남아 1차 타겟 명시 + 영어 default 메일 + 국가 필드 필수 | strategy | 2026-05-13 | 확정 | BL-SIGNUP-COUNTRY-FIELD, BL-EMAIL-LOCALE-ROUTING, BL-ADMIN-COUNTRY-FILTER |
| D-033 | 환불·취소 정책 명확화 + 영수증 5년 영구 보관 | policy | 2026-05-13 | 확정 | BL-REFUND-FLOW, BL-RECEIPT-ARCHIVE |
| D-034 | 이벤트 사이트 = 별도 브랜드/도메인 신설 (B2B와 분리) | strategy | 2026-05-13 | 확정 | BL-EVENT-SITE-FOUNDATION, BL-EVENT-CUSTOMER-DB, BL-EVENT-PAYMENT-PROXY, BL-EVENT-HOTEL-NOTIFY |
| D-035 | 신규 매니저 가입 시 누적 매출 임계값 3구간 분기 노출 ($1,000+/$200~999/<$200) | analytics | 2026-05-13 | 확정 | BL-PAST-VIDEO-RECON, BL-SIGNUP-ENRICHMENT, BL-AGODA-TOS-CHECK |
| D-036 | BL-CHATLOG-BIZ-FORMAT — C안 + 검증 봇 (헌법 손 안 댐, 워닝만) | infra | 2026-05-12 | 확정 | BL-CHATLOG-BIZ-FORMAT |
| D-037 | BL-URGENT-CARD-FLOW — A안 통합 모달 (인계서/결정/핑퐁 분리 X) | infra | 2026-05-13 | 확정 | BL-URGENT-CARD-FLOW |
| D-038 | BL-AGODA-TOS-CHECK — Agoda 약관 검토 완료, D-035 그대로 진행 (4중 안전 구조) | policy | 2026-05-13 | 확정 | BL-AGODA-TOS-CHECK done, BL-SIGNUP-ENRICHMENT 설계 기준 |
| D-039 | BL-PAGE-ROLES-SPLIT — admin-status(시스템 완성도) vs admin.html(운영 대시보드) 책임 분리 | infra | 2026-05-15 | 확정 | BL-PAGE-ROLES-SPLIT, `_os/playbook/page-roles.md` |
| D-047 | BL-INVOICE-001 핑퐁 15라운드 합의 — 인보이스 번호 국가별 분리(INV-KR/INT) + 발행 권한 super_admin 1인 + 도장·서명 admin 업로드 구조 | feature | 2026-05-24 | 확정 | BL-INVOICE-001, BL-INVOICE-002, BL-INVOICE-003, `_os/playbook/invoice-system.md` |
| D-048 | BL-INVOICE-SYSTEM-DOCS — 인보이스 시스템 사업 정책 단일 진실원 문서화(`_os/playbook/invoice-system.md`) + 3개 BL 분담 확정(003 선결 → 001 → 002) + BL-INVOICE-001 progress 12단계 박힘(부칙 7 해소) | policy | 2026-05-24 | 확정 | `_os/playbook/invoice-system.md`, BL-INVOICE-001/002/003, `tasks.json` |
| D-049 | 채팅 끊김 객관 트리거 4종 도입 — 응답 15회 / 파일 10회 / 단계 완료 / 거대 파일 1500줄+ (판단 개입 0%) | policy | 2026-05-26 | 확정 | 헌법 부칙 16.1, `_os/playbook/claude-discipline.md` §8, CLAUDE.md ⑥번 룰 |
| D-050 | impersonate(매니저 시점) 미복원 — admin-manager-hub.html(상세)로 매니저 화면 진입 단일화 (옛 dashboard.html?impersonate 경로 BL-FLOW-3로 단절) | infra | 2026-05-30 | 확정 | BL-ADMIN-SIDEBAR-MISSING-ENTRIES done, `_admin/admin.html`, `admin-manager-hub.html` |
| D-051 | 자동 로그인 기본값 '미영구(닫으면 로그아웃)'로 전환 + '로그인 유지' 체크박스 옵트인 (login.html+admin-login.html+shared.js 동일) | security | 2026-05-30 | 확정 | BL-LOGIN-PERSIST-OPTIN done, `shared.js`, `login.html`, `admin-login.html` |
| D-052 | B2B 자동메일 영어 메인 유지 + 한국어 보류(보험), 해제 트리거=한국 인바운드 추천 채널 비중 상승 | strategy | 2026-06-02 | 확정 | BL-EMAIL-LOCALE-ROUTING(자동판별 보류), 후속 BL-EMAIL-MANAGER-LOCALE-AUTO, 채널전략 |
| D-053 | admin 호텔 상세 = 매니저 분석 형태 미러링(별도 페이지) + 수수료 2버전(매니저 숨김/admin 표시) + 기간 4구분(마케팅전/기간/후/전체, 전체=분석 동기화) + 회차(campaign_log) + 마케팅전 예약 매칭(대표님 확정) + 매니저 이름·연락처 가입폼 추가 | feature | 2026-06-02 | 확정 | BL-ADMIN-HOTEL-DETAIL(신규), signup.html, admin-manager-hub.html, dashboard.html, _business/decisions/2026-06-02-admin-hotel-detail-d053.md |
| D-054 | 2026-06-02 (DECISIONS.md 신규 박스) | admin 호텔상세(D-053) 실행세부 — 과거예약 복구적재 확정 + 매니저페이지 통계·예약형태 탭UX(클로드 위임) + 회차 시작일=송출일 자동(클로드 위임확정) |
| D-078 | 아고다 호텔 파일(52만건) 자체 확보 — 예약 많은 나라부터 적재 · 남의 서버에 매번 묻지 않는다 | hotel | 2026-08-01 | 확정 | agoda_hotel, api/cron/hotel-addr-fill.js, _business/AGODA_LOAD_STATE.md |
| D-077 | 자동화 비용 정책 — 무료를 먼저·유료는 최소 · 한도 있는 것은 마지막에 | ops | 2026-07-27 | 확정 | _business/decisions/2026-07-27-automation-cost-policy.md |
| D-076 | 배선 관리 원칙 — 코드가 정답이다 · 지도는 코드에서 뽑는다(wiring-scan) | ops | 2026-07-27 | 확정 | SYSTEM_WIRING.md, _os/tools/wiring-scan.mjs, _business/decisions/2026-07-27-system-wiring-doctrine.md |
| D-079 | 호텔 자료의 바탕 = 아고다 호텔 파일(52만건) · 찾을 땐 우리 DB·좌표(50m·800m), API는 채울 때만 · 구글은 최후 · 지역 분모를 agoda_inventory→agoda_hotel 로 교체(「미개척 -53곳」 음수 제거) · TOP1/2/3 은 순서가 아니라 원고 글자로 판정 · 검색어 분류는 씨앗이 아니라 나온 말로 · 검색어가 적어도 버리지 않는다(개척 후보) · 검사봇 3종(kw-audit·wiring-audit·health) | hotel/keyword | 2026-08-02 | 확정 | api/kw-survey-now.js, api/cron/{hotel-addr-fill,hotel-fill,kw-audit,wiring-audit}.js, api/content-keywords.js, api/_lib/hotel-rank.js, v_district_star, studio.html, studio-keyword-preview.html, _business/HOTEL_MATCH.md, _business/BOTS_MAP.md, _os/BOTS_TECH.md |
| D-075 | 키워드 발굴·순환 바로잡기 — 씨앗에 「자유여행」 추가·여행축 상한 8→16 · 붙여쓰기 짝을 여행축에도(도시여행·도시자유여행) · 봇 순환 3회에 1번 신규 발굴 우선(NEW_EVERY) · 지난달에 끝난 조사를 「예약중」으로 말하던 거짓 표시 제거 | keyword | 2026-08-01 | 확정 | api/kw-survey-now.js, api/cron/kw-survey.js, api/content-keywords.js, studio.html, _business/decisions/2026-08-01-keyword-harvest-cycle.md |
| D-074 | 스튜디오 영문판(i18n) — 한국어 기본·영어 덧붙이기 · 사전방식(data-i18n·t()) + 문장 많은 메뉴는 렌더후 번역계층(STUDIO_PHRASES·영어일 때만 동작) · 제목·파일명·호텔명 칸은 번역 제외 · 언어 결정 = 내선택 → 계정기본(admins.lang) → 브라우저말(ko/en) | i18n | 2026-07-26 | 확정 | studio.html, api/me-lang.js, admins.lang, admin_invitations.lang, _business/decisions/2026-07-26-studio-i18n.md |
| D-067 | 자체기획 원고흐름 + 확인필요 사유(코드오타·같은채널코드중복·아고다링크없음) + 담당규칙(세역할·단계별버튼·담당있으면 남못맡음·변경=최고관리자만·원고작성담당=코드복사분석만) + 자체기획 발행예정 올린사람 표시안함 + 발행예정↔올리기 동기화(정상만·코드기준) + 확인필요=올리기에서만(채널명·파일명·사유) + 잘못폴더정리(채널=cid판정·file_id추적) | studio/flow | 2026-07-19 | 확정 | studio.html 전략·올리기, api/content-queue.js, api/publications.js, _business/decisions/2026-07-19-manuscript-flow-review-reasons.md, STUDIO_FLOW.md |

---

## 🔗 짝 문서 매핑 (DECISIONS.md 위치)

| ID | DECISIONS.md 섹션 / 라인 | 비고 |
|---|---|---|
| D-001 | 2026-04-26~28 (Phase 3 Step 4) | 엑셀 매칭 정책 본문 |
| D-002 | 2026-03 ~ 2026-04 (Phase 1~2 인프라) L629 | PayPal USD 결제 |
| D-003 | 2026-03 ~ 2026-04 (Phase 1~2 인프라) L165 | 영문 우선 + 한국어 토글 |
| D-004 | 2026-05-03 신규 (Charter v2 통합) | 부칙 5 신설과 동시 |
| D-005 | 2026-05-03 신규 (Charter v2 통합) | 부칙 6 신설과 동시 |
| D-006 | 2026-05-03 신규 (Charter v2 통합) | BUSINESS.md 15-A 통찰 6 |
| D-007 | 2026-05-03 신규 (Charter v2 통합) | BUSINESS.md 15-A 통찰 4 |
| D-008 | 2026-05-03 신규 (Charter v2 통합) | BUSINESS.md 15-A 통찰 5 |
| D-009 | 2026-05-03 신규 (Charter v2 통합) | BUSINESS.md 15-A 통찰 7 |
| D-010 | 2026-05-03 신규 (Charter v2 통합) + 2026-05-04 D-013로 개정 | BL-CENTRAL-HUB 1단계 후 발견된 카테고리 어긋남 해결 + admin-hub 폐기로 카테고리 0 이관 |
| D-011 | 2026-05-04 신규 | 대표님 병목 해제 — 단순 작업은 권한 직원이 트리거, 결정은 대표님 |
| D-012 | 2026-05-04 신규 | 대용량 fetch 분리 + admin-tasks 흡수 |
| D-013 | 2026-05-04 신규 | admin-hub 폐기 — 잉여 레이어 제거 (대표님 통찰 직접 반영) |
| D-014 | 2026-05-04 신규 | 헌법 6조(사람용+AI용 이중) 본체 — chat-logs/ 풀 디테일 + 인증 게이트 + 활동 이력 ↔ chat-log 4중 연결 |
| D-015 | 2026-05-05 신규 | BL-ADMIN-AUTH-V2 권한 정책 본체 |
| D-016 | 2026-05-04 신규 | Vercel Hobby 12 함수 한도 회피 위한 라우터 통합 |
| D-017 | 2026-05-08 신규 (최상단) | 토큰·키 라이프사이클 — 헌법 부칙 4 보강 + `_os/playbook/credentials-lifecycle.md` 신설 |
| D-018 | 2026-05-08 신규 (최상단) | Vercel Pro 결제 활성화 — 호스팅 인프라 안정화 + 헌법 위반(상업 사용) 해소 |
| D-021 | 2026-05-09 신규 (최상단) | BL-ADMIN-AUTH-PERF Edge Middleware 정석 — A-1 비정석 옵션 자가 반성 포함 |
| D-028 | 2026-05-12 신규 (Pending 섹션 직전) | 갤러리 완성도 + BEFORE/AFTER 이력 — 대표님 매니저 체험 중 발견 |
| D-047 | 2026-05-24 (DECISIONS.md L288~355) | BL-INVOICE-001 핑퐁 15라운드 합의 본체 — 핑퐁 원본은 `_decisions/pingpong/BL-INVOICE-001.json` |
| D-048 | 2026-05-24 (DECISIONS.md D-047 박스 직후) | 인보이스 시스템 단일 진실원 문서화 + 3개 BL 분담 확정 — 단일 진실원은 `_os/playbook/invoice-system.md` |
| D-049 | 2026-05-26 (DECISIONS.md 신규 박스) | 채팅 끊김 객관 트리거 4종 — 추상 규칙 → 객관 카운트 전환, 부칙 16.1 신설 |
| D-050 | 2026-05-30 (DECISIONS.md 최상단 신규 박스) | impersonate 미복원 — admin-manager-hub.html 단일화 / 매니저 화면 진입 통로 정리 |
| D-051 | 2026-05-30 (DECISIONS.md 최상단 신규 박스) | 로그인 유지 옵트인 — 기본 미영구 전환 + 체크박스(매니저·관리자 동일) |
| D-052 | 2026-06-02 (DECISIONS.md 최상단 신규 박스) | B2B 메일 영어 메인 + 한국어 보험, 트리거=한국 인바운드 채널↑ |
| D-053 | 2026-06-02 (상세=_business/decisions/2026-06-02-admin-hotel-detail-d053.md) | admin 호텔 상세 미러링 + 수수료 2버전 + 기간 4구분 + 마케팅전 예약 매칭 (DECISIONS.md 박스 후속 동기화) |
| D-074 | 2026-07-26 (상세=_business/decisions/2026-07-26-studio-i18n.md) | 스튜디오 영문판 · 계정 기본 언어 자동 |
| D-075 | 2026-08-01 (상세=_business/decisions/2026-08-01-keyword-harvest-cycle.md) | 키워드 발굴 규칙·봇 순환 |
| D-079 | 2026-08-02 (상세=_business/HOTEL_MATCH.md · D-075 §§8·9) | 호텔 자료 바탕·검사봇·개척 우선 |
| D-092 | 2026-08-12 (상세=_os/boot.md §3 · decision-index-guard.yml) | 결정 확정 시 문서 4곳 자동 갱신 의무 |
| D-086 | 2026-08-11 (상세=_business/decisions/2026-08-11-agoda-id-link.md) | 아고다 번호 잣대 순서 복원 · 949곳 연결 |
| D-087 | 2026-08-11 (상세=_business/decisions/2026-08-11-db-lock-round2.md) | DB 잠금 2차 · 표 77개 전부 · 보안 5겹 |
| D-088 | 2026-08-11 (상세=_business/decisions/2026-08-11-ops-lanes.md · staycurate/docs/DOOR.md) | 창구 차선 분리 · 블로그 전용 문 |
| D-089 | 2026-08-11 (상세=_business/decisions/2026-08-11-agoda-master-full.md) | 아고다 명부 301만곳 · 분기 갱신 |
| D-090 | 2026-08-12 (상세=_content/youtube/키워드-실측.md v2 · BUSINESS.md §7-E-3) | 키워드 수요=구글 트렌드 정정 |
| D-091 | 2026-08-12 (상세=_business/decisions/2026-08-12-city-alias.md) | 도시 이름 별칭 체계 |
| D-093 | 2026-08-16 (상세=_business/decisions/2026-08-16-shop-main.md) | travelwinners.shop 메인 화면 확정 |
| D-094 | 2026-08-16 (상세=_business/decisions/2026-08-16-scale-limits.md · docs/ARCHITECTURE.md §4-B) | 사업 확장 시 한도 설계 |
| D-095 | 2026-08-16 (상세=_business/decisions/2026-08-16-db-shared-or-split.md) | shop DB 공유/분리 판단 |

---

## 📅 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-08-12 | D-086~D-092 등록 (아고다 잣대 복원·DB잠금2차·창구분리·명부301만·키워드수요정정·도시별칭·문서 자동갱신 의무) |
| 2026-05-03 | 최초 작성 (Charter v2 통합 — D-001~D-009 등록) |
| 2026-05-04 | D-010 D-011 등록 (3-State 권한 + admin-status 범위) |
| 2026-05-04 | D-012 등록 (3-Layer 분리 + admin-tasks 흡수) |
| 2026-05-04 | D-013 등록 (admin-hub.html 폐기 + D-010 카테고리 0 이관 개정) |
| 2026-05-04 | D-014 등록 (chat-logs 시스템 — 사람용+AI용 이중 형식 강제 + 인증 게이트) |
| 2026-05-12 | D-028 등록 (갤러리 완성도 + BEFORE/AFTER 자동 이력 — 대표님 매니저 체험 중 발견) |
| 2026-05-24 | D-022~D-027 + D-029 + D-030 + D-039 9건 누락분 소급 등록 (자율 진행 중 INDEX-DECISIONS 동기화 검증 후 보강) |
| 2026-05-24 | D-047 등록 (BL-INVOICE-001 핑퐁 15라운드 합의 본체 — 인덱스 누락분 소급 등록) |
| 2026-05-24 | D-048 등록 (인보이스 시스템 단일 진실원 `_os/playbook/invoice-system.md` 신설 + 3개 BL 분담 확정) |
| 2026-05-26 | D-049 등록 (채팅 끊김 객관 트리거 4종 도입 — 부칙 16.1 신설 / CLAUDE.md ⑥ 보강 / discipline.md §8 신설) |
| 2026-05-30 | D-050 등록 (impersonate 미복원 — admin-manager-hub.html 단일화 / BL-ADMIN-SIDEBAR-MISSING-ENTRIES done) |
| 2026-05-30 | D-051 등록 (로그인 유지 옵트인 — 자동로그인 기본 미영구 전환 / BL-LOGIN-PERSIST-OPTIN done) |
| 2026-06-02 | D-052 등록 (B2B 자동메일 언어 전략 — 영어 메인+한국어 보류 / 트리거=한국 인바운드 채널 비중 상승) |
| 2026-06-02 | D-053 등록 (admin 호텔 상세 페이지 설계 — 매니저 분석 미러링 + 수수료 2버전 + 기간 4구분 + 마케팅전 예약 매칭 + 매니저 연락처 / BL-ADMIN-HOTEL-DETAIL 신규) |
| 2026-06-02 | D-054 등록 (admin 호텔상세 실행세부 — 과거예약 복구적재 + 매니저페이지 통계·예약 탭UX 위임결정 / 회차 시작일 산출은 대표님 확정대기) |
| 2026-06-11 | D-055 등록 (메인 페이지 섹션 1~4 확정) |
| 2026-06-11 | D-056 등록 (디자인=기존 다크 Aurora 유지·라이트 시도 폐기) |
| 2026-06-15 | D-057 등록 (메인 8섹션 ①~④ 확정 + 제작방식 변경) |
| 2026-07-11 | D-058 등록 (스튜디오 올리기 메뉴 — 드라이브→발행) |
| 2026-07-11 | D-059 등록 (유튜브 조회수 추적 — 나이별 3h/12h/24h·주1·월1 / api/cron/yt-views) |
| 2026-07-11 | D-060 등록 (스튜디오 성과표 메뉴) |
| 2026-07-15 | D-061 등록 (멀티채널 노출 전략 — 우리가 하나임 안 드러냄) |
| 2026-07-13 | D-062 등록 (호텔 메뉴 = 전략 분석 대시보드) |
| 2026-07-13 | D-063 등록 (성과표 = 전 채널·영상·호텔 종합 조망 · 접속국 축) |
| 2026-07-11 | D-064 등록 (채널 메뉴 — .md로 새 채널 등록) |
| 2026-07-14 | D-065 등록 (키워드 메뉴 — 유튜브 발굴·수요·경쟁·기회) |
| 2026-07-16 | D-066 등록 (채널별 콘텐츠 시나리오) |
| 2026-07-16 | D-068 등록 (콘텐츠 1개 : 시나리오 N개 · R코드 체계) |
| 2026-07-20 | D-069 등록 (데이터 파이프라인 — 아고다 1차·유튜브·자동순환·저비용 / api/cron/kw-survey) |
| 2026-07-20 | D-070 등록 (나라별 지역 파싱 틀 + 측정 시스템 / api/_lib/district-parse.js) |
| 2026-07-20 | D-071 등록 (호텔 중복 판정·병합 — 좌표 기반 / api/hotel-review.js) |
| 2026-07-21 | D-072 등록 (다채널 배포 — cid가 채널 정함·채널 간 cid 다름 정상·중복=파일명+채널·예약기간 다르면 다른 콘텐츠 / api/publications.js) |
| 2026-07-21 | D-073 등록 (키워드 월별 재조사 — 봇이 이번 달 ym snapshot 없는 도시 재조사·조사일 finished_at 표시·완성 결과보기 제거·월별 그래프 ym 기반 / api/content-keywords.js) |
| 2026-07-26 | D-074 등록 (스튜디오 영문판 — 사전+번역계층 2중 방식·계정 기본 언어 자동 / studio.html, api/me-lang.js) |
| 2026-07-27 | D-075 등록 (아고다 예약 무결성 3중 방어 — 업로드 시 agoda_id 우선매칭·마스터 자동등록·매일 booking-health 봇 / api/admin.js, api/cron/booking-health.js) |
| 2026-07-27 | D-076 등록 (시스템 배선 관리 — 코드에서 자동 추출하는 SYSTEM_WIRING.md·표→화면 역인덱스·1000줄 위험 자동판정·신규호텔 확인 카드 / _os/tools/wiring-scan.mjs) |
| 2026-07-27 | D-077 등록 (자동화 비용 정책 — 봇 10개 전수 실측·바깥 유료는 구글 1개뿐·새 봇 판단 4기준·SHA 캐시로 헛일 방지 / SYSTEM_MAP §4) |
| 2026-07-27 | D-078 등록 (아고다 CID 다중 — 채널 하나에 번호 여럿·정본은 channel_cid_map DB·규격문서 cid는 대표번호일 뿐 / api/youtube.js) |
| 2026-08-01 | D-075 등록 (키워드 발굴·순환 바로잡기 — 자유여행·띄어쓰기·신규 발굴 우선 / api/kw-survey-now.js, api/cron/kw-survey.js) |
| 2026-08-02 | D-079 등록 (호텔 자료 바탕=아고다 파일 · 검사봇 3종 · 검색어 적어도 버리지 않음) |
| 2026-08-07 | D-080 등록 (지역명 한국어 단일화 + 「값 박힘·이름 중복」 자동 검사 — 같은 지역이 영어·한자로 갈라져 예약이 나뉘던 사고 / api/_lib/district-parse.js, api/cron/kw-audit.js, api/cron/wiring-audit.js) |
| 2026-08-07 | D-081 등록 (검사봇 4층 구조 — 코드·배선·자료·화면 / 「한 가지는 한 로봇만」·「감시자와 수리공 분리」·겹침 3건 제거·screen-sweep 신설 / api/cron/screen-sweep.js, SYSTEM_MAP §3-B) |
| 2026-08-07 | D-082 등록 (지역 파서 나라 우선 판정 — 파리에 방콕 지역 박히던 오매칭 차단·부분일치 폐지·로마자 유지 폐지·8개국 사전 신설·채우기 봇 하루1도시 병목 제거 / api/_lib/district-parse.js, api/cron/hotel-district-fill.js) |
| 2026-08-08 | D-083 등록 (지역 채움 «할 수 있는 나라 / 못 하는 나라» 분리 — SUPPORTED_CC 명시·규칙 없는 도시가 하루치 자리 먹던 2차 병목 제거·못 하는 것은 no_rule 대기목록으로 보고·한국은 아웃바운드 우선이라 보류(주소 근거 확보) / api/_lib/district-parse.js, api/cron/hotel-district-fill.js) |
| 2026-08-08 | D-084 등록 (지역 채움 프로세스 정본화 — 진단 창구 신설·파서 수정 전 전수진단 의무·「0건=완료 vs 고장」 구별·금지사항 5개 / api/ops/district-diagnose.js, _business/HOTEL_DISTRICT_PIPELINE.md, SYSTEM_MAP §3) |
| 2026-08-08 | D-085 등록 (구글 주소 재조회 — 좌표를 얻은 대가로 구글에 못 묻던 999건 구제·mode=district 신설·기존좌표 2km 오매칭 검증·하루 3회 자동·8일 완료 예정 / api/_lib/hotel-geo.js, api/cron/hotel-geo-fill.js, vercel.json) |
| 2026-08-16 | D-093 등록 (travelwinners.shop 메인 확정 — C형 카드·딱지 없음·달력 동시 노출·배치ㄱ·대표그림 아고다 Top1 사진·「어디 가세요?」 시트 메뉴·창고 통합·쿠팡은 여행준비물 페이지만 / _business/shop/SHOP_RENEWAL.md) |
| 2026-08-16 | D-094 등록 (사업 확장 시 한도 설계 — 천장 120/h 고정 함정·묶음 커밋·정적 굽기·창고1개+봇1개·템플릿 레포·사용률 점검판 / docs/ARCHITECTURE.md §4-B) |
| 2026-08-16 | D-095 등록 (shop DB는 하나로 공유 — 나누면 아고다 호출 2배, 나눌 신호 4개 명시) |

---

## 📁 개별 결정문서 색인 (`_business/decisions/`) — 2026-08-29 일괄 등재

> 🔴 **왜 생겼나** — `decision-index-guard` 봇이 «결정문서 57개 중 42개가 색인에 없다»를 매일 이슈로 알리고 있었는데 아무도 못 봤다.
> 색인에 없으면 **다음 채팅의 클로드가 그 결정이 있는 줄 모른다.** 2026-08-29 에 42건을 전수 등재했다.
> 앞으로 `_business/decisions/` 에 파일을 만들면 **이 표에도 한 줄 추가**한다. (D5 룰)

| 날짜 | 관련 ID | 무엇을 정했나 | 파일 |
|:---:|:---:|---|---|
| 2026-05-26 | — | 2026-05-26 시스템 재설계 1단계 - 결정 8건 | `_business/decisions/2026-05-26-system-redesign-step1.md` |
| 2026-05-27 | — | 2026-05-27 base64 사고 + 새 룰 3건 + 사업 합의 6건 (백로그 정리) | `_business/decisions/2026-05-27-incident-and-new-rules.md` |
| 2026-05-28 | — | 2026-05-28 결정 기록 누락 자동 감지 봇 (D16) | `_business/decisions/2026-05-28-decisions-audit-bot.md` |
| 2026-05-30 | D-050 | 2026-05-30 직전 채팅 결정 2벌저장 — 매니저 진입 정리 + 로그인 유지 옵트인 (D-050·D-0 | `_business/decisions/2026-05-30-handoff-d050-d051.md` |
| 2026-06-07 | D-055 | 메인 페이지 재설계 결정 (2026-06-07) | `_business/decisions/2026-06-07-main-redesign.md` |
| 2026-06-11 | D-055 | 작업 기록: 과거 예약 데이터 시스템 적재 (2026-06-11) | `_business/decisions/2026-06-11-legacy-booking-migration.md` |
| 2026-06-11 | D-056 | 메인 스토리 흐름 + 디자인/내용 규칙 (2026-06-11, D-056) | `_business/decisions/2026-06-11-main-story-rules.md` |
| 2026-06-15 | D-057 | 2026-06-15 메인(index) ①~④ 섹션 확정 | `_business/decisions/2026-06-15-main-sections-1-4-confirmed.md` |
| 2026-07-03 | D-057 | 이 파일은 잘못된 위치입니다 (2026-07-03 시스템 정정) | `_business/decisions/2026-07-03-main-redesign-handoff.md` |
| 2026-07-11 | D-061 | 2026-07-11 호텔 매니저 대시보드 구조 (라이브 코드 기준 정리) | `_business/decisions/2026-07-11-manager-dashboard-structure.md` |
| 2026-07-11 | D-064 | 2026-07-11 스튜디오 채널 메뉴 (UX/UI) — 채널 자산·규격 관리 마스터 | `_business/decisions/2026-07-11-studio-channel-menu.md` |
| 2026-07-11 | D-062 | 2026-07-11 스튜디오 호텔 메뉴 (UX/UI) — 전략 분석 대시보드 | `_business/decisions/2026-07-11-studio-hotel-menu.md` |
| 2026-07-11 | D-065 | 2026-07-11 스튜디오 키워드 메뉴 (UX/UI) — 분석·추천 엔진 + 수요 트렌드 인텔리전스 | `_business/decisions/2026-07-11-studio-keyword-menu.md` |
| 2026-07-11 | D-063 | 2026-07-11 스튜디오 성과표 메뉴 (UX/UI) — 전 채널·영상·호텔 종합 조망 | `_business/decisions/2026-07-11-studio-performance-menu.md` |
| 2026-07-11 | D-060 | 2026-07-11 스튜디오 올리기 메뉴 전체 설계 (UX/UI) | `_business/decisions/2026-07-11-studio-upload-menu-full.md` |
| 2026-07-11 | D-058 | 2026-07-11 유튜브 발행 관리 + 조회수 추적 시스템 | `_business/decisions/2026-07-11-youtube-publish-viewcount-system.md` |
| 2026-07-12 | — | 분석 페이지 날짜 표기 원칙 (채널명 단일화 관련) | `_business/decisions/2026-07-12-analytics-date-principle.md` |
| 2026-07-12 | D-060 | 2026-07-12 콘텐츠 고유코드 = 모든 원고에 자동 부착 (D-060·D-066 보강) | `_business/decisions/2026-07-12-content-code-all-manuscripts.md` |
| 2026-07-12 | — | 2026-07-12 드라이브 자동읽기 — 폴더·서비스계정 등록 | `_business/decisions/2026-07-12-drive-folder-registered.md` |
| 2026-07-12 | D-066 | 2026-07-12 스튜디오 전략 메뉴 (UX/UI) — 만들 콘텐츠 기획 큐 + 방향 판 | `_business/decisions/2026-07-12-studio-strategy-menu.md` |
| 2026-07-13 | D-062 | 호텔 마스터(통합 명단) 정석 방향 결정 (2026-07-13) | `_business/decisions/2026-07-13-hotel-master-direction.md` |
| 2026-07-13 | — | 호텔 마스터 1단계 — hotels 확장 스키마 적용 (2026-07-13) | `_business/decisions/2026-07-13-hotel-master-schema-applied.md` |
| 2026-07-13 | — | 숙소 유형 정책 결정 (2026-07-13) | `_business/decisions/2026-07-13-hotel-type-policy.md` |
| 2026-07-13 | D-062 | 스튜디오 호텔 메뉴 — 최종 UI/UX 확정 + 서비스 방향 (2026-07-13) | `_business/decisions/2026-07-13-studio-hotel-menu-final-ux.md` |
| 2026-07-13 | D-063 | 스튜디오 성과표 메뉴 — 최종 UI/UX 확정 + 서비스 방향 (2026-07-13) | `_business/decisions/2026-07-13-studio-performance-menu-final-ux.md` |
| 2026-07-14 | — | 예약된 작업 — 수작업 소개 이력 파일 → DB 반영 (BL-EXPOSURE-IMPORT) | `_business/decisions/2026-07-14-exposure-import-plan.md` |
| 2026-07-14 | D-065 | 2026-07-14 키워드 메뉴 재설계 — 작업 중 정리 (WIP) | `_business/decisions/2026-07-14-keyword-menu-redesign-wip.md` |
| 2026-07-14 | D-065 | 키워드 메뉴 — 화면 전수 점검표 (빌드 스펙) | `_business/decisions/2026-07-14-keyword-screen-checklist.md` |
| 2026-07-15 | D-067 | 2026-07-15 다채널 노출 전략 (D-067) — 채널은 "고르는 것"이 아니라 "전부 전개되는 것" | `_business/decisions/2026-07-15-multichannel-exposure-strategy.md` |
| 2026-07-16 | D-068 | D-068 — 콘텐츠 1개 : 시나리오 N개 (채널별). 코드는 시나리오의 것 (2026-07-16) | `_business/decisions/2026-07-16-content-scenario-per-channel.md` |
| 2026-07-17 | D-067 | D-067 호텔 데이터 3층 설계 — **정석** (2026-07-17 확정) | `_business/decisions/2026-07-17-hotel-data-layers.md` |
| 2026-07-20 | D-070 | 결정 D-070 : 나라별 지역(구·동네) 파싱 — 전 세계 대응 틀 + 측정 시스템 정리 | `_business/decisions/2026-07-20-country-district-parsing.md` |
| 2026-07-20 | D-069 | 결정 D-069 : 키워드·호텔 데이터 파이프라인 — 아고다 1차 · 유튜브 기준 · 자동 순환 · 저비용 | `_business/decisions/2026-07-20-data-pipeline-auto.md` |
| 2026-07-20 | D-071 | 결정 D-071 : 호텔 중복 판정·병합 시스템 (좌표 기반) | `_business/decisions/2026-07-20-hotel-dedup-merge.md` |
| 2026-07-21 | D-073 | 결정 D-073 : 키워드 월별 재조사 + 조사일 표시 (화면 정리) | `_business/decisions/2026-07-21-keyword-monthly-resurvey.md` |
| 2026-07-21 | D-072 | 결정 D-072 : 다채널 배포 구조 — cid·중복·예약기간 정리 | `_business/decisions/2026-07-21-multichannel-distribution.md` |
| 2026-07-22 | D-073 | 🔴 2026-07-22 사고 — 아고다 자료 과적으로 서비스 중단 (D-073) | `_business/decisions/2026-07-22-db-overload-incident.md` |
| 2026-07-27 | D-075 | D-075 · 아고다 예약 업로드 무결성 — 사람이 찾지 않아도 되게 | `_business/decisions/2026-07-27-booking-master-integrity.md` |
| 2026-07-27 | D-078 | D-078 · 아고다 CID — 채널 하나에 번호 여럿 | `_business/decisions/2026-07-27-cid-multi-per-channel.md` |
| 2026-08-08 | D-085 | D-085 · 구글에 주소를 다시 물어본다 (지역 채우기 D안) | `_business/decisions/2026-08-08-구글주소-재조회.md` |
| 2026-08-08 | D-083 | D-083 후속 · 지역 채움 — **주소 파싱은 여기서 끝낸다** (전수 진단 근거) | `_business/decisions/2026-08-08-지역채움-주소파싱-종료.md` |
| 2026-08-08 | D-083 | D-083 · 지역 채움 — 「할 수 있는 것 / 못 하는 것」을 시스템이 스스로 가른다 | `_business/decisions/2026-08-08-지역채움-지원국가.md` |

**등재 42건** · 전체 결정문서 57건 · 이 표에 파일명이 있으면 감시 봇이 이슈를 자동으로 닫는다.
