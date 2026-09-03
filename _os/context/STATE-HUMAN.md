# 전체 상태 한 벌 (사람이 읽는 판) — 2026-09-03

> 🔴 이 문서는 `_os/context/state.json` 을 사람이 읽게 옮긴 것이다. **정본은 json 쪽**이고, 클로드는 그것을 읽는다.
> 대표님이 보시는 그림판은 `staycurate.com/admin/map.html` (로그인 필요).

---

## 1. 서비스 4곳

| 서비스 | 하는 일 | 창고(DB) | 일꾼 | 완성도 |
|---|---|---|---|---|
| **블로그** (staycurate.com) | 한국어 호텔 추천 글을 로봇이 만들어 발행 → 아고다 수수료 | 창고A vjsludfjsphwnumuoqaj (스튜디오와 공유) | 28 | 62% |
| **스튜디오(B2B)** (gohotelwinners.com) | 호텔에 마케팅 판매 → 구독료·제작비 | 창고A (블로그와 공유) | 21 | 74% |
| **스튜디오 개발·운영실** (GitHub Actions) | 코드·문서 자동 점검. 최근 7일 커밋 869건 중 840건이 이 일꾼들 | 없음 | 13 | 돎 |
| **개인업무시스템** (1hogi.gohotelwinners.com) | 대표님 메일·할일·판정 | 창고B fifsuiwsgdounlpialqx · 표 35개(items·mail_messages·judgment_*·contacts·cases 등) | 4 (메일 수집 15분마다 · 판정 · 구글 출입증 · 완성도 점검) | 틀은 있고 자료가 0건 — 메일 수집이 돌기 시작하면 채워짐 |

## 2. 창고

**창고 A** `vjsludfjsphwnumuoqaj` — 블로그·스튜디오가 **같이 쓴다** · 표 106 · 뷰 84 · 함수 32 · 트리거 37

| 소유 | 표 수 |
|---|---|
| 공용재료 | 23 |
| 블로그 | 30 |
| 스튜디오 | 49 |
| 백업 | 4 |

- 가르는 법: 표 이름이 아니라 site_id 칸 (19개 표) · D-B101
- 만나는 자리: hotel_code 로 맞춤 · 계약호텔 3253 중 2954가 명부와 연결(299 미연결)
- 뷰 판정: 가동 57 · 코드 미연결 17 · 구형 4(신형 있음) · 진단용 3 · 매니저 미오픈 3 — db/view-owner.csv

**창고 B** `fifsuiwsgdounlpialqx` — 개인OS 전용 · 표 35 · 1개 — /api/cron/mail-sync 15분마다
- 대표 표: items 할일 · mail_messages 메일 · judgment_requests 판정함 · waiting_replies 회신대기 · contacts·cases 사람·건 · routines 반복일 · daily_briefs 하루요약 · heartbeats 생존신호
- 안전규칙: 메일 삭제·발송 금지(읽기만) · 2026-07-27 이전 메일 미접근

## 3. 창구와 열쇠

**블로그 자기 것**
- `db-query` — POST www.staycurate.com/api/ops/db-query (door=own · 90회/h)
- `github-commit` — POST www.staycurate.com/api/ops/github-commit (30/h · GITHUB_PAT 없으면 borrowed 우회)
- `github-read` — GET www.staycurate.com/api/ops/github-read (120/h)
- `selftest` — GET /api/selftest (인증 없음)

**빌리는 것 (스튜디오)**
- `pool-weekends` — 주말가격 (아고다 열쇠가 스튜디오에만)
- `google-places` — 구글 상세·후기
- `blog-stats` — 관리화면 통계
- `db-query(옛길)` — 자기 문이 죽었을 때만

🔴 인증: x-ops-token · 블로그 OPS_TOKEN 값 == 스튜디오 CLAUDE_OPS_TOKEN 값 (한쪽만 바꾸면 401)

**열쇠 이름** (값은 어디에도 적지 않는다)
- 블로그 13개: OPS_TOKEN · SUPABASE_ACCESS_TOKEN · ADMIN_USER · ADMIN_PASS · SUPABASE_URL · SUPABASE_SERVICE_KEY · RAKUTEN_APP_ID · RAKUTEN_ACCESS_KEY · GSC_CLIENT_EMAIL · GSC_PRIVATE_KEY · GSC_SA_JSON · GSC_SITE_URL · ANTHROPIC_API_KEY(미투입·의도)
- 스튜디오에만: AGODA_API_KEY · AGODA_SITE_ID · GOOGLE_PLACES_API_KEY · GITHUB_PAT · CLAUDE_OPS_TOKEN

## 4. 일꾼

총 **76명** — blog 28 · studio 21 · studio-dev 23 · personal 4

상태: 돎 69 · 쉼 1 · 수동 1 · 은퇴 3 · 대기 1 · 확인 필요 1

🔴 «부르는 곳이 없다»는 고장이 아니라 은퇴일 수 있다 — 반드시 state·note 를 먼저 본다(08-29 클로드 오판)

## 5. 지금 막힌 곳

**블로그**
- 후기출처1곳뿐: 56
- 후기판독대기: 2394
- 가격미확보: 28
- 대표님승인대기: 6
- 발행됨: 5

**스튜디오** (2026-09-03 갈래 분류 · D-106 / 2026-09-02 재분류 · D-103)

🔴 **미완료 64건은 세 갈래로 갈라져 있다** — 화면 맨 위 탭에서 고른다 (`gohotelwinners.com/admin-status.html`)

| 갈래 | 뜻 | 미완료 | 자율 | 직원 | 대표님 | 막힘 |
|---|---|---:|---:|---:|---:|---:|
| **b2b** | 호텔에 $200 파는 일 — 매니저·결제·재계약·성과표·수수료·**예약 데이터** | 37 | 15 | 7 | 5 | 6 |
| **studio** | 원고→유튜브 — 스튜디오 6메뉴·키워드·채널·클릭추적 | 10 | 4 | 0 | 6 | 4 |
| **os** | 도구 정비(사업 아님) — 화면 동기화·문서 자동화·봇·죽은 코드 | 17 | 11 | 2 | 2 | 4 |
| 전체 | | **64** | 30 | 9 | 13 | 14 |

- 갈래 정본 = `tasks.json` 의 `biz` 칸 (화면 코드 아님) · 뜻풀이는 `tasks.json` 의 `biz_legend`
- 걸러지는 것은 「앞으로 할 일」 8칸뿐 — **지난 기록·완료율은 탭과 무관하게 전체 기준**
- 완료된 작업에는 갈래를 달지 않는다 (지난 기록은 가르지 않는다)
- 신규 사업 4건(`scope=out_of_repo`)은 갈래로 만들지 않고 맨 아래 접힌 한 줄 (D-105)

- 열린 작업 64건 · 그중 **🔑 대표님 몫은 2건뿐**
  - `BL-BOOKING-EARNINGS-IMPORT` — 아고다 Earnings(수수료) 리포트 내려받기 (P0 · 「최근 3개월 수익 0원」의 원인)
  - `BL-YT-DRIVE-WATCH` — 구글 서비스계정 JSON 키를 Vercel 환경변수에
- ⏳ 오픈 대기 8건 — 사이트 미오픈·가입 매니저 0명이라 **지금은 결정 자체가 불가능** (BL-004·005·007·012·013 · SQ-D·E·F)
- ⏸ 조건 대기 1건 — `BL-STUDIO-MENU-6TAB`(91%). 멈춘 게 아니라 **«새 채널을 늘릴 때» 착수**. 라이브 원고 파이프라인이라 지금 건드리면 위험
- 데드라인 정본 = `tasks.json` 의 `deadline` **한 곳뿐** (2026-06-30 · D+64 경과 → 대표님 날짜 확정 대기)
- 🔴 백업: 열쇠 2개는 정상 등록(0단계 통과). **`tw-b2b-backup` 저장소가 아직 없어 404** — 창고 생성 → PAT 권한 부여 → Run workflow 순서
- 🔴 2026-08-29 대표님 정정: 이 둘은 «버그»가 아니다. 아고다 자료가 아직 업로드되지 않았고,
-    콘텐츠에 노출한 호텔과 실제 예약 호텔이 들어와야 매칭·집계가 된다. 자료가 들어오기 전에는 쫓지 않는다.
-    (BL-BOOKING-EARNINGS-IMPORT · BL-HOTEL-MASTER-RESYNC — 상태: 자료 대기)

**공통**
- 결정문서_색인누락: 57개 중 42개 — 다음 클로드가 그 결정을 모른다(최우선 위험)

## 6. 🔴 용어·판단 주의 (여기서 자주 틀린다)

- **«다음 할 일»을 고르기 전에 «갈래 탭»을 먼저 고른다** — 한 화면에 b2b·studio·os 가 섞여 있어, B2B 영업을 하려는데 화면이 스튜디오 키워드 일을 추천하던 사고가 있었다. 갈래 정본은 `tasks.json` 의 `biz` (D-106)
- **창구 `github-read` 는 `.md`·`.json` 만 utf-8** — `.sha256` 등은 **base64** 로 온다. `encoding` 키를 먼저 본다. 09-03 에 이걸 몰라 «기준선이 안 들어갔다»고 잘못 볼 뻔했다 (D-106)
- **«막힘» 숫자를 믿기 전에 목록을 뽑아 갈라라** — 09-02 실측: 31건 중 취소·흡수 3 · 이미 끝난 결정 2 · 오픈 전 8 · 조건 대기 1 이 섞여 있었다. 진짜는 2건 (D-103)
- **«숨기기» 와 «나누기» 는 다르다** — 대표님 지시: *상태가 안 보이면 작업이 되는지 모른다. 눈은 줄이지 않는다.* 카드에서 뺀 것은 반드시 같은 화면에 이름표로 남긴다 (D-103)
- **창구 401 은 «열쇠가 없다» 가 아니라 «옛 값을 집었다»** — `tw-b2b` 는 Public 이라 값을 문서에 못 적는다. `conversation_search` 로 최근 대화에서 찾는다. 🔴 «열쇠가 없어서 문서로 대신» 금지 (D-104)
- **덜 만들어진 것을 «안 쓰는 것» 으로 판정하지 마라** — 스튜디오 매니저 기능은 개발 중이고 사이트 미오픈·가입 매니저 0명이다
- **«부르는 곳이 없다» 는 고장이 아니라 은퇴일 수 있다** — 반드시 state·note 를 먼저 본다 (08-29 클로드 오판)

## 7. 정본 파일 위치

| 무엇 | 어디 |
|---|---|
| 사업전체 | `staycurate docs/BUSINESS-MAP.md` |
| 일꾼 | `tw-b2b _os/workers/registry.json (+WORKERS.md 사람용·HOW-TO-ADD.md)` |
| 배선 | `staycurate docs/WIRING-MAP.md` |
| 표소유 | `staycurate db/table-owner.csv · docs/DB-MAP.md §2-6` |
| 표정의 | `staycurate db/schema.sql (표106+함수32+시퀀스55)` |
| 뷰정의 | `staycurate db/views-full.sql (84개 · 4회 반복 실행)` |
| 씨앗 | `staycurate db/seed/seed.sql (14표 497행)` |
| 열쇠 | `staycurate docs/ENV.md` |
| 복제설명서 | `staycurate docs/MANUAL.md(사람) · docs/MANUAL-MACHINE.md(기계)` |
| 빈곳점검표 | `staycurate docs/GAPS.md` |
| 대표님할일 | `staycurate docs/OWNER-TODO.md` |
| 결정 | `tw-b2b DECISIONS_INDEX.md(정본) · DECISIONS.md · _business/decisions/` |
| 작업목록 | `tw-b2b tasks.json` |
| 뷰소유 | `staycurate db/view-owner.csv · docs/DB-MAP.md §2-7` |

## 8. 클로드가 아직 못 본 것

- 개인OS DB 창구 — 열쇠 값이 달라 401 (대표님 몫 · 3분)
- `tw-b2b-backup` 저장소 — 아직 생성 전(404). 백업 첫 실행이 여기서 멈춤
- GitHub 이슈 본문 — 비인증 한도(내용은 파악: 결정 42건 누락)
- 코드 미연결 뷰 17개 — 매니저 오픈·향후 화면용인지 개별 확인 남음

## 9. 작업 전 반드시 읽을 것

1. `tw-b2b _os/boot.md` — 부팅 절차 · §6 창구 열쇠 자가 조달 (D-104)
2. `staycurate docs/HOW-I-WORK.md` — 찾는다 → 배포본을 받는다 → 숫자는 잰다 → 실행해 본다 → 기록한다
3. `tw-b2b _os/context/DECISION-LOOKUP.md` — 「이 주제는 어느 결정문서」 주제별 색인 (**판단하기 전에 먼저**)
4. `tw-b2b _os/context/state.json` — 클로드용 정본 (이 문서는 사람용 사본)
5. 화면을 만지면 `_os/playbook/page-roles.md` (D-039 화면 역할 헌법)

**방향**: 북극성 = 글이 나가고 돈이 된다. 지금 1순위는 블로그 50편 가는 길(출처 2곳 문제 56편 → 판독 → 승인).

---

**작성**: 2026-09-03 (D-106 사업 갈래 반영 · D-103·D-104 포함) · 정본 `_os/context/state.json` 에서 옮김 · 값이 바뀌면 json 을 고치고 이 문서도 다시 만든다