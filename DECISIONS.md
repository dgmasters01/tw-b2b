# TravelWinners B2B — 의사결정 로그 (Decisions Log)

> **이 문서는 비즈니스 결정의 변경 이력을 시간순으로 기록합니다.**
>
> 새로운 결정이 생기면 상단에 추가합니다 (최신순).
> 결정이 변경되면 이전 결정을 `~취소선~` 처리하고 새 결정을 추가합니다.
> 미래의 Claude / 새 직원 / 매니저가 "왜 이렇게 됐는가" 를 추적할 수 있어야 합니다.
>
> 형식: **언제 / 무엇을 / 왜 / 누가**

---

## 🆕 2026-05-11 — 점검 봇 발견 → 자동 BL 등록 인프라




### 결정 D-027: BL-ADMIN-AUTH — a안으로 갑니다. 박을 것 3가지: ①접속 로그(누가 언제 admin 들어왔나) ②실행 로그(누가 언제 무슨 버튼 눌렀나 — 호텔 승인·삭제·수정 등 중요 액션) ③admin-status 페이지 하단 "최근 활동" 박스에 시간순으로 한 줄씩 표시. 권한은 CEO(대표님 — 전체 권한) / Staff(초대된 스탭 — 제한 권한) 두 단계로 나누고, 둘 다 이메일로 구분되니까 로그에 자동으로 누가 했는지 박힙니다. 이대로 BL-ADMIN-AUTH 진행하겠습니다 ⭐ 2026-05-11

**확정 시각**: 2026-05-11T17:12:25.885Z

**결정 한 줄**: a안으로 갑니다. 박을 것 3가지: ①접속 로그(누가 언제 admin 들어왔나) ②실행 로그(누가 언제 무슨 버튼 눌렀나 — 호텔 승인·삭제·수정 등 중요 액션) ③admin-status 페이지 하단 "최근 활동" 박스에 시간순으로 한 줄씩 표시. 권한은 CEO(대표님 — 전체 권한) / Staff(초대된 스탭 — 제한 권한) 두 단계로 나누고, 둘 다 이메일로 구분되니까 로그에 자동으로 누가 했는지 박힙니다. 이대로 BL-ADMIN-AUTH 진행하겠습니다

**핑퐁 라운드 (2회)**:

**라운드 1**
- 대표님: a안으로 지금은 단순하게 하자. 누가 접속했고 누가 실행했는지 표시하면 되지 않나? 초대 메일으로 스탭이 초대되었을때 여러명일 경우, 스탭누가 무슨작업을 했는지 기록을 남기면 되지 않을까?
- Claude: a안 단순하게 갑니다. 기록할 것 딱 2개: ①누가 언제 admin 페이지에 들어왔나(접속 로그) ②누가 언제 무슨 버튼을 눌렀나(실행 로그). 초대된 스탭이 여러 명이어도 각자 이메일로 구분되니까 "김OO 스탭이 5월 12일 14:30에 호텔 승인 버튼 눌렀음" 식으로 한 줄씩 쌓입니다. admin-status 페이지 하단에 "최근 활동" 박스 하나 추가해서 대표님이 한눈에 누가 뭘 했는지 보이게 만들면 끝.

**라운드 2**
- 대표님: 그래 그런식으 확정하자
- Claude: a안으로 갑니다. 박을 것 3가지: ①접속 로그(누가 언제 admin 들어왔나) ②실행 로그(누가 언제 무슨 버튼 눌렀나 — 호텔 승인·삭제·수정 등 중요 액션) ③admin-status 페이지 하단 "최근 활동" 박스에 시간순으로 한 줄씩 표시. 권한은 CEO(대표님 — 전체 권한) / Staff(초대된 스탭 — 제한 권한) 두 단계로 나누고, 둘 다 이메일로 구분되니까 로그에 자동으로 누가 했는지 박힙니다. 이대로 BL-ADMIN-AUTH 진행하겠습니다

---

### 결정 D-026: BL-ADMIN-AUTH — admin 인증 + 권한 등급 (A안 2단계 CEO/Staff + 로그 3종) ⭐⭐⭐ 2026-05-11

**확정 시각**: 2026-05-11T16:31:00.068Z

**결정 한 줄**: A안(2단계 권한) 채택 — 권한 등급은 CEO(대표님 — 전체 권한) / Staff(초대된 스탭 — 제한 권한) 두 단계. 둘 다 이메일로 구분되니까 로그에 자동으로 누가 했는지 박힙니다. 박을 것 3가지: ①접속 로그(누가 언제 admin 들어왔나) ②실행 로그(누가 언제 무슨 버튼 눌렀나 — 호텔 승인·삭제·수정 등 중요 액션) ③admin-status 페이지 하단 "최근 활동" 박스에 시간순으로 한 줄씩 표시.

**핑퐁 라운드 (2회)**: _decisions/pingpong/BL-ADMIN-AUTH.json 참조. R1에서 4가지 선택지 제시(A: 2단계/B: 3단계/C: 4단계/D: 페이지별 ACL). R2에서 대표님 "그래 그런식으 확정하자" 후 A안(2단계 + 로그 3종)으로 확정.

**복구 메모**: 결정 확정 시도가 실패한 후 Chrome 진단 중 API 테스트 호출이 200 OK를 반환하면서 D-026이 박혀버린 사고. 처음 박힌 본문에 "(테스트 호출 — 실제 결정 박을 때 같은 결과인지 진단)" 표식이 포함됐었음. BL-DECISION-CONFIRM-D026-FIX로 정식 본문(핑퐁 R2 Claude 답변 기반)으로 즉시 정정.

**파급 작업**:
- 즉시: BL-ADMIN-AUTH 자율 큐 진입 → Claude가 Supabase Auth + 2단계 권한 + 접속/실행 로그 + admin-status 최근 활동 박스 구현
- DB: access_logs / action_logs 테이블 신설
- UI: admin-status 페이지 하단 "📜 최근 활동" 박스

---

### 결정 D-025: BL-003 — Agoda 예약 검증을 Matching(호텔 가입 승인) + 예약검증 둘로 쪼개기 ⭐⭐⭐ 2026-05-11

**확정 시각**: 2026-05-11T15:23:26.587Z

**결정 한 줄**: BL-003을 BL-003-A(Agoda Matching = 호텔 가입 수동 승인 페이지, P0 1순위) + BL-003-B(Agoda Affiliate 엑셀 업로드 → 호텔별 예약 검증 페이지, P1)로 쪼개기. 본질이 두 가지였음 — 매니저 온보딩 게이트와 매출 검증.

**핑퐁 라운드 (9회)**: _decisions/pingpong/BL-003.json 참조. 9라운드 핵심:
- R1-2: 검증의 단일 진실원이 "고객 진술"이 아니라 Agoda Affiliate 대시보드 데이터임을 정리
- R3-4: 매니저 가입 시 자동 매칭(agoda_hotels + Google Places API) + 호텔 URL 붙여넣기 흐름 확정
- R5-6: Agoda는 실시간 예약 API 미제공 → Affiliate 엑셀 업로드 방식이 표준
- R7: analytics 페이지(아고다 제휴 호텔별 예약리스트)를 admin 페이지에 차용
- R8: "Agoda Matching" 본질이 예약 검증이 아니라 **호텔 가입 수동 승인**임을 대표님이 정정
- R9: BL-003-A(가입 승인) + BL-003-B(예약 검증) 쪼개기 합의

**파급 작업**:
- BL-003-A (P0 1순위): admin/agoda-matching 페이지 신설 — 매니저 가입 시 자동 매칭 실패 호텔의 대기 큐 + 수동 매칭 + 승인 알림
- BL-003-B (P1): admin/agoda-booking-verify 페이지 신설 — Affiliate 엑셀 업로드 + 호텔별 매출 정리

**복구 메모**: 대표님이 admin-status에서 "🚀 결정 확정" 버튼 눌렀으나 흐름이 끊겨 commit이 박히지 않은 사고 발생. BL-DECISION-CONFIRM-RESCUE로 핑퐁 9라운드 보존된 결론을 그대로 D-025로 박음. 결정 확정 흐름의 에러 가시화는 같은 BL의 단계 3에서 처리.

---

### 결정 D-024: BL-BASELINE-AUTO-TASK — 점검 결과를 tasks.json에 자동 등록 ⭐⭐⭐ 2026-05-11

**무엇을**: 기존 점검 봇 3종(health-check-admin / page-status-scan / charter-length-bot)이 빨간불·노란불을 발견해도 `_health.json`·`pages-status.json`·CI exit 1에서 끝나고 **tasks.json BL로 안 박혀 흘러가던 문제**를, 새 봇 `auto-task-from-health`로 자동 등록. 안정 ID(`BL-AUTO-{CHECK}-{KEY}`) + dedup(active 상태 검사) + 24h 가드 + 자동 close 로직 박음.

**왜 정석인가** (헌법 5기준):
1. **단일 진실원**: tasks.json이 작업 큐의 유일 source — 점검 결과가 그쪽으로 흐르는 게 정석.
2. **표준 패턴**: 기존 5개 봇과 동일 구조(node script + workflow yml + concurrency + race retry 3회).
3. **유지보수 비용 최소**: 룰북 1개(`auto-task-registry.md`) + 스크립트 1개 + 워크플로 1개. 분산 안 함.
4. **자동 동기화**: 부칙 8 — health-bot push → auto-task-bot 자동 트리거 → tasks.json 갱신 → admin-status 5초 폴링 → 화면 즉시 갱신.
5. **재발·롤백 안전**: git revert 1번으로 3개 파일 동시 롤백. dedup 덕에 중복 박기 사고 원천 차단.

**원인 (대표님 통찰 2026-05-10)**:
- "점검 봇이 빨간불 잡아도 BL로 안 박혀 흘러감. health-bot / page-status-scan / charter-length-bot 결과를 tasks.json에 자동 BL 등록. 중복 방지 dedup 로직 필수."
- 짝꿍: BL-BASELINE-HUMAN-LANG (점검 결과를 사업가 언어로 풀기)

**핵심 로직**:
- 안정 ID: `BL-AUTO-{CHECK_NAME}-{STABLE_KEY}` — 같은 종류 사고는 같은 ID로 매칭
- dedup: active 상태(pending/in_progress/paused/blocked) BL 있으면 SKIP / done인데 24h 안이면 SKIP / 24h 지났으면 REOPEN
- auto-close: 같은 check가 green으로 돌아오면 active BL 자동 done 처리
- 예외(BL 안 박음): vercel_sync yellow / vercel_quota yellow / bots unknown only — 기다리면 풀리는 것은 정보성

**산출물**:
- `_os/playbook/auto-task-registry.md` (룰북 단일 진실원, 300줄 이하)
- `_os/scripts/auto-task-from-health.mjs` (코어 스크립트)
- `.github/workflows/auto-task-from-health.yml` (트리거 + race retry 3회)
- `tasks.json` BL-BASELINE-AUTO-TASK 5단계 progress 박음

**검증**:
- 자체 검증 11개 통과 (룰북 8번 섹션)
- dedup 로컬 테스트: 동일 ID 2회 호출 시 1회만 박힘
- 라이브 검증: 첫 실행에서 현재 _health.json red 상태 → BL 자동 등록 → admin-status 화면 갱신 확인

---

## 🆕 2026-05-10 — 클로드 행동 강제 게이트 (부칙 16 신설)

### 결정 D-023: BL-CLAUDE-DISCIPLINE — 헌법 부칙 16 + 인계서 강제 헤더 + 4개 의무 ⭐⭐⭐ 2026-05-10

**무엇을**: 클로드가 헌법을 매번 어기는 4개 사고 패턴을 차단하기 위해 헌법 부칙 16(15줄) + 운영 매뉴얼 1개(`_os/playbook/claude-discipline.md`) + 인계서 강제 헤더 1개(`_os/handoff-header.md`) + admin-status.html 인계서 함수에 prepend 코드 박음. 모든 인계서 머리에 강제 헤더가 자동 prepend되어 새 채팅 클로드가 부칙 16을 100% 지키게 강제.

**4개 의무**:
1. **첫 응답 5줄 양식 강제** — ① 작업 소요 ② 라우팅 ③ fetch 완료 ④ 북극성+결정 ⑤ 중복점검 grep
2. **라이브 fetch + 중복 점검 강제** — 인계서·tasks만 믿지 말고 GitHub 라이브 fetch + grep 의무
3. **개발 순서·기술 선택 묻지 않음** — 묻는 것은 4가지뿐: 비즈니스 방향 / 서비스 방향 / 전체 틀 변화 / 디자인 큰 방향(이미지 첨부)
4. **보고는 초등학생 언어 + 4줄 형식 + 디자인은 이미지** — "무엇을 했나 / 어디 가서 / 무엇을 누르면 / 무엇이 보이는지"

**왜 정석인가** (헌법 5기준):
1. **단일 진실원**: 부칙 16 디테일은 `claude-discipline.md` 1개에만. 인계서 헤더는 `handoff-header.md` 1개에만.
2. **표준 패턴**: 헌법(선언) → playbook(매뉴얼) → boot(트리거) 3층 구조 유지 (대표님이 박은 표준).
3. **유지보수 비용 최소**: playbook 1개 + 헤더 1개로 통합. 분산 안 함.
4. **자동 동기화**: 모든 인계서가 헤더 자동 fetch → prepend. admin-status.html 카드 클릭 1번 = 부칙 16 강제 적용.
5. **재발·롤백 안전**: git revert 1번으로 7개 파일 동시 롤백. 헤더 1파일 수정만으로 전체 인계서 변경.

**원인 (대표님 진단 2026-05-10)**:
- "헌법에 있는 내용인데도 클로드가 안 지킨다. 매번 같은 사고가 반복되고, 내가 같은 설명을 다시 해야 한다."
- 4개 사고 패턴 확인: ① 보안 잔소리 ② "MCP 없다" ③ "어느 방식 원하세요?" ④ 클로드 언어 보고

**산출물**:
- `OPERATIONS_CHARTER.md` 부칙 16 (15줄, 헌법 175줄로 200줄 강제 통과)
- `_os/playbook/claude-discipline.md` (250줄 — 4개 의무 디테일 + 위반 사례 + 자가 진단 절차)
- `_os/handoff-header.md` (인계서 강제 헤더 단일 진실원)
- `_os/boot.md` 3번 섹션 갱신 (5줄 양식 + 묻지 않음 원칙)
- `_admin/admin-status.html` `buildHandoffMessage` 함수 (헤더 자동 prepend)

**검증**:
- 헌법 200줄 강제 통과: 175줄 ✅
- 라이브 검증: admin-status.html 카드 클릭 → 인계서 머리에 🚨 강제 헤더 prepend 확인
- 다음 채팅 새 클로드: 인계서 첫 줄부터 부칙 16 의무 자동 적용

---



### 결정 D-022: BL-ADMIN-LIGHTMODE — 다크/라이트 토큰 한 쌍 + 사이드바 토글 + OS 따라가기 ⭐⭐⭐ 2026-05-10

**무엇을**: admin-* 페이지 13개에 라이트 모드 정식 지원. shared.css 단일 진실원에 `[data-theme="light"]` 블록 1개로 다크↔라이트 토큰 매핑. 페이지 자체 :root 9개(7 다크 + 1 라이트 + 1 글래스)는 모두 삭제하고 shared.css 토큰만 사용. 사이드바 하단 공통 토글 1개로 13개 페이지 동시 전환. 기본값은 OS `prefers-color-scheme` 따라가되 사용자 토글이 우선 (localStorage 저장).

**5결정**:
1. **시안 색감**: 다크 기본 + 라이트 한 쌍 (확정 토큰 표 `_os/playbook/admin-lightmode-tokens.md`)
2. **`admin-tasks.html` 라이트 잔재**: 다크로 통일 — 3단계 :root 삭제 시 자동 해소
3. **라이트 본문 ink**: `#1E293B` (한 단계 부드럽게, `#0F172A`는 거의 검정이라 장시간 부담)
4. **토글 위치**: 사이드바 하단 공통 — 한 곳 = 13개 페이지 동시 적용 (헌법 부칙 8 자동 동기화)
5. **기본값**: `prefers-color-scheme` OS 설정 따라감 + 사용자 토글이 우선 (localStorage `tw-theme`)

**왜 정석인가** (헌법 5기준):
1. **단일 진실원**: shared.css 1군데. 페이지별 :root 9개 = 단일 진실원 위반 = 삭제.
2. **표준 패턴**: `prefers-color-scheme`은 W3C CSS Media Queries Level 5 표준. CSS 변수 + data-attribute 토글은 업계 표준.
3. **유지보수 비용 최소**: 토큰 표 1개에 다크/라이트 한 쌍 → 페이지 수정 시 변수 이름만 알면 됨.
4. **자동 동기화**: 사이드바 토글 1번 = 13개 페이지 즉시 적용 (헌법 부칙 8).
5. **재발·롤백 안전**: 페이지 :root 삭제로 직전 1차 시도가 깨진 진짜 원인(토큰 이름 충돌) 영구 제거. localStorage 1key 삭제로 OS 설정 복귀.

**1차 시도 (2026-05-09 — commit 726994d, 362a104) revert 원인**:
- 9개 페이지가 자체 :root에 다크 색을 박아두고 있고 토큰 이름이 shared.css와 다른 체계 (`--panel`/`--text`/`--border` vs shared의 `--bg-2`/`--ink`/`--line`).
- shared.css만 라이트로 바꿔도 페이지 :root가 다크 색 덮어써서 안 바뀜.
- → 같은 함정 재발 방지: 3단계에서 페이지 :root 9개 모두 삭제.

**6단계 진행 계획**:
1. ✅ 디자인 토큰 표 확정 (이 결정 — 2026-05-10)
2. ⏸️ 13개 페이지 하드코딩 rgba/hex 전수 매핑 표 (status + admin 우선)
3. ⏸️ shared.css에 `[data-theme="light"]` 박음 + 페이지 :root 9개 삭제
4. ⏸️ admin-status + admin-tasks 2페이지 Before/After 스크린샷 검토
5. ⏸️ 검토 통과한 토큰만 페이지 1개씩 commit
6. ⏸️ 사이드바 하단 토글 박음 + localStorage 동작 검증

**참고 commit**:
- `d2deb98` — Phase 0 배너 fix (유지)
- `726994d`, `362a104` — 1차 시도 revert (재발 방지 참고)

**산출물**:
- `_os/playbook/admin-lightmode-tokens.md` (확정 토큰 표 — 2~5단계 단일 참조원)
- `_chat-logs/2026-05-10-bl-admin-lightmode-step1.md` (1단계 영구 기록)
- `tasks.json` BL-ADMIN-LIGHTMODE (6단계 progress.steps)

**누가**: 클로드 (대표님 결정 위임 — "5개 다 클로드 정석 판단으로 진행")

---

## 🆕 2026-05-09 — admin-* 페이지 인증 속도 정석 박음 (Edge Middleware SSR 게이트)

### 결정 D-021: BL-ADMIN-AUTH-PERF — Edge Middleware 단일 게이트 (A-2 정석) ⭐⭐⭐ 2026-05-09

**무엇을**: admin-* 페이지 12개의 클라이언트 사이드 직렬 인증(Supabase JS 로드 → getSession → checkAdmin RPC → admins SELECT, 네트워크 4건 직렬)을 Vercel Edge Middleware 1군데로 흡수. middleware.ts가 모든 admin 요청을 가로채 Supabase JWT 직접 검증 + `is_admin` RPC 호출까지 처리. 검증 통과한 요청만 admin HTML 반환. 비통과 요청은 Edge에서 즉시 `/login.html` 리디렉트.

**왜 A-2가 정석인가** (헌법 5기준):
1. **단일 진실원**: 인증 로직 1군데. A-1은 Edge + 페이지 둘 다 = 2군데 = 위반.
2. **표준 패턴**: Vercel Edge Middleware = Supabase 공식 SSR 인증 패턴.
3. **유지보수**: 새 admin 페이지 추가 시 middleware matcher만 수정. 페이지마다 인증 코드 박을 필요 없음.
4. **보안**: 비로그인자는 admin HTML 자체를 못 받음. 현재는 HTML 받고 → JS 실행 → 튕김 (깜빡임 + 보안 누수).
5. **재발 방지**: A-1 → A-2는 결국 재작업. 처음부터 종착지로.

**왜 A-1을 만들지 않았나** (자가 반성):
- 첫 응답에서 A-1(쿠키만 검증) + A-2(완전 검증) 비교 후 A-1 추천한 것은 **헌법 위반**.
- 메모리 절대 원칙 인용: "임시방편·수동 우회·하드코딩 옵션은 대표님께 제안조차 금지. 정석 방안만 1~3개 제시."
- A-1 추천 이유("빨라서·단계적이라서")는 비정석 사유. 정석 5기준으로 재평가하니 A-1은 어느 기준도 충족 못 함.
- 대표님이 "정석은 뭐야"라고 짚어주신 후 자가 교정. **이 패턴(A-1 같은 비정석 옵션 제시)을 사전 안전장치 3개 다음에 추가 검토 필요** (D-020 후속).

**Vercel Hobby 12 함수 한도 회피** (D-016 재발 방지):
- 현재 Serverless Function 카운트: 12개 (정확히 한도). `api/auth/verify.js` 신규 = 13개 = 빌드 실패.
- 정석 설계: 검증 로직을 `middleware.ts` 내부에 직접 박음. Edge Middleware는 함수 카운트에서 분리.
- 결과: Function 카운트 12 → 12 (변동 없음). Edge Runtime이 페이지보다 가까이 = 더 빠름.

**구현 단계** (5 step):
1. D-021 박음 (이 결정)
2. tasks.json BL-ADMIN-AUTH-PERF progress.steps 박음
3. middleware.ts 작성 (Supabase JWT 직접 검증 + is_admin RPC + redirect)
4. vercel.json admin-* 리디렉트 ↔ middleware matcher 충돌 검증
5. 2편 인계서 작성 + push (실제 페이지 12개 인증 코드 제거 + 라이브 검증은 새 채팅)

**연관 작업**:
- D-015, D-016 (BL-ADMIN-AUTH-V2 — 권한 시스템 + Hobby 한도 회피 선례)
- BL-DEDUP-CONSOLIDATE (직전 작업)
- 후속: 2편 (`HANDOFF_BL-ADMIN-AUTH-PERF_PHASE2.md` 기반 새 채팅)

**누가**: 이지형 대표님 (정석 방향 결정) / 클로드 (코드 점검·진단·실행 + 자가 반성).

---

## 🆕 2026-05-08 — admin-status 화면 통합 + 헌법 안전장치 강화

### 결정 D-020: 헌법 자가 검증에 사전 안전장치 3개 박음 — 방향 상실 방지 ⭐⭐⭐ 2026-05-08
**무엇을**: OPERATIONS_CHARTER.md `Claude의 자가 검증` 섹션 앞에 사전 안전장치 3개 박음. 자가 검증 11개보다 **앞에** 통과해야 함. boot.md 5번에도 동기화.

**3개 안전장치**:
1. 🧭 **북극성 문장** — 이 작업이 푸는 사용자 문제를 한 줄로 박음 (기술 부채는 사용자 문제 아님)
2. 🔍 **중복 점검** — 이미 있는 화면·기능과 중복 없는지 코드 추적으로 확인
3. 🎯 **한 채팅 한 결정** — 본질 결정 1개 명시. 다른 작업 섞이면 분리

**왜**:
- 대표님 진단(2026-05-08): "BL을 박을수록 방향 잃은 결과물이 쌓인다"
- 직접 경험 사례: BL-AI-TAB-BOT-DETECT 처리 후 임박 카드/작업 지휘소 중복을 대표님이 짚어주실 때까지 못 알아챔
- 자가 검증 11개는 "기술 정합성"만 점검 — "본질 정합성" 점검이 빠져있었음

**효과**: Claude가 새 BL 시작 전 의무로 답해야 하므로, 본질이 틀린 작업은 시작 전에 막힘.

**누가**: 이지형 대표님 (진단·결정) / 클로드 (실행).

**연관 파일**:
- OPERATIONS_CHARTER.md (174줄, 200줄 제한 내)
- _os/boot.md (5-A 섹션 신설)
- DECISIONS_INDEX.md (D-020 추가)

---

### 결정 D-019: admin-status.html 중복 3중 정리 + 작업 지휘소 통합 ⭐⭐⭐ 2026-05-08
**무엇을**: admin-status.html의 ③ 작업 분포 KPI 4종 / ⑥ 임박 작업 섹션 / ⑦ 결정 대기 박스 원본을 제거하고, ④ 작업 지휘소가 모든 작업 입구·실행을 흡수하는 구조로 통합.

**남기는 것**: ① 현재 진행 / ② 전체 평균 게이지(페이지 완성도) / ④ 작업 지휘소(헤더에 KPI 흡수) / ⑤ 5 시스템 카테고리 + 카테고리별 진행률 흡수 / ⑧ 시급 페이지 TOP 10 / 활동 이력 / 건강 검진 박스(헌법 검증 27/27 흡수).

**왜**:
1. **3중 중복 발견** (대표님 직접 진단):
   - 자동/직원/대표님 분류: ③ KPI / ④ 작업 지휘소 슬롯 / ⑥ 임박 카드 → 3중
   - 자율 작업 큐: ④ 슬롯 2 / ⑥ 자율 큐 원본 (JS DOM 이동) → 2중
   - 결정 대기: ④ 슬롯 1 / ⑦ 결정 대기 원본 (JS DOM 이동) / ⑥ 임박 카드 → 3중
2. **③·⑥은 옛 도구**: 작업 지휘소 신설(D-011 3-State 권한) 전 도구. 작업 지휘소가 이미 정확히 대체.
3. **헌법 정신**: "하나에서 전체 관리" — 작업 보는 곳 한 군데로.
4. **각자 즉시 실행**: 작업 지휘소 슬롯에 ▶ 즉시시작 / ▶ 메일발송 박아 직원 권한 흐름까지 흡수.

**처리 절차 (정석)**:
- 사전: 연결고리 지도 박음 (`_os/playbook/dependency-map-bl-dedup-consolidate.md`) — 113군데 연결 위험 사전 분석
- 단계별 8 commit: 백업→헤더 KPI→진행률 이동→즉시시작 버튼→⑦제거→⑥제거→③제거→OS 동기화→라이브 검증
- 각 단계 = 1 commit + 라이브 검증 통과 후 다음 단계
- 백업: `_admin/_backup_20260508_pre-dedup_admin-status.html`
- BL-URGENT-CARD-FLOW(임박 카드 흐름)는 step3로 흡수 → status=absorbed

**누가**: 이지형 대표님 (진단·결정) / 클로드 (실행 — 새 채팅에서 단계별 자율).

**연관 파일**:
- _admin/admin-status.html (5867줄, 113 연결고리)
- _os/manifest.json (admin-status.html role 갱신 — step7)
- BL-DEDUP-CONSOLIDATE (P0, large, 4h, 8단계)
- BL-OS-INSTALL-PAT-FLOW (P1, medium, 별건)
- DECISIONS_INDEX.md (D-019 추가)

---


**무엇을**: gohotelwinners.com 호스팅 플랜을 Hobby(무료) → Pro($20/월)로 업그레이드. 안전장치로 Spend Management hard limit $50 설정 권장.

**왜**:
1. **헌법 위반 해소**: Hobby 약관은 비상업적 사용 한정. gohotelwinners.com에서 $200 PayPal 결제 받으면 약관 위반 → 갑작스런 계정 정지 위험 (운영 중 사고 가능).
2. **Vercel webhook race 영구 차단**: Hobby는 일일 100개 배포 한도. 봇 7개(activity/sync/scan/auto-detect/health/chat-log/charter-length) 운영 시 매일 한도 부딪힘. Pro는 3,000개/일.
3. **사고 직접 경험**: 2026-05-08 헌법변경(D-017) 라이브 미반영 사고 발생. Vercel deployment list에서 89186e0 + 5983b9c + 후속 commit 모두 한도 초과로 빌드 차단됨.
4. **상업 사용 약관 준수**: Pro 가입으로 commercial usage 정식 허용.

**비용 분석**:
- 월 고정 $20 (약 28,000원)
- $20 included credit (대부분의 사용량 무료 흡수)
- Spend Management hard limit $50 권장 → 폭주 시 자동 정지 (청구서 폭탄 방지)
- 우리 사업 트래픽 예상 (B2B 호텔 운영자 + 일반 패키지 고객 수천~수만/월) 대비 Pro 한도 사용률 5% 이하

**누가**: 이지형 대표님 (결제 등록) / 클로드 (분석·권고·검증).

**대안 검토 결과 (모두 기각)**:
- ❌ Hobby 유지: 약관 위반 + 일일 한도 사고 반복 → 사업 운영 불가
- ❌ Cloudflare Pages 이전: 이전 작업 자체가 1주일 BL → ROI 낮음
- ❌ Stripe 도입 (PayPal 대체): 베트남 법인 미지원 + 한국 직접 가입 불가 → 도입 어려움. PayPal 유지가 정석.

**라이프사이클 (D-017 부칙 4 적용)**:
- **개발기간 (현재~)**: Pro 활성. 카드 정보 등록 정상.
- **서비스기간 진입 시**: 카드 정보 rotate (개인 카드 → 법인 카드 권장). Spend Management 검토.
- **사업 종료·일시 중단 시**: Pro → Hobby 다운그레이드 가능 (commercial 종료 후).

**문서 박힌 곳**:
- DECISIONS.md (이 항목)
- DECISIONS_INDEX.md (D-018 추가)
- `_os/playbook/credentials-lifecycle.md` 카드·구독 섹션 추가 권장 (다음 채팅)
- handoff/current.md (다음 채팅 1순위 = BL-VERCEL-DEPLOY-RACE-GUARD 영구 가드 구현)

**관련 BL**:
- BL-VERCEL-DEPLOY-RACE-GUARD (P0): 봇 commit 통합·Vercel quota 모니터링·webhook 정지 자동 감지
- BL-VERCEL-DEPLOY-RACE-GUARD가 끝나면 Pro 한도(3,000/일) 안에서도 자동 안전망 가동

---



### 결정 D-017: 토큰·키 라이프사이클 = 개발기간(등록 정상) → 서비스기간(일괄 폐기) ⭐⭐⭐ 2026-05-08
**무엇을**: GitHub PAT·Vercel Token·Supabase Key·API Key 등 모든 자격증명의 라이프사이클을 헌법 부칙 4에 박고, 디테일은 `_os/playbook/credentials-lifecycle.md`에 분리.

- **개발기간**: 등록·평문 노출 = 정상 상태 (사고 아님). 클로드는 토큰 폐기·재발급 잔소리 절대 금지.
- **서비스기간**: 진입 시 일괄 폐기·재발급. 채팅 평문 주입 영구 폐지, Actions Secrets / Vercel 환경변수만 허용.
- **사고 vs 정상 라이프사이클** 구분 표 신설 — 외부 유출 의심·자연 만료만 사고로 분류.

**왜**: 클로드가 매 채팅에서 "토큰 폐기하세요" 잔소리 반복 → 대표님 시간 손실 + 헌법 1조(결정만) 위반. 페이즈별 정상 상태를 명문화해서 클로드 자가 강제 가능하게 함.

**누가**: 이지형 대표님 (지시) / 클로드 (헌법 박음 + playbook 신설).

**문서 박힌 곳**:
- `OPERATIONS_CHARTER.md` 부칙 4 한 줄 추가 (200줄 한계 내 유지: 163줄)
- `_os/playbook/credentials-lifecycle.md` 신설 (디테일·자격증명 종류·서비스 진입 절차·사고 구분 표)
- `_os/playbook/README.md` 인덱스 갱신
- `_os/playbook/emergency.md` 4번 항목 — "외부 유출 의심·만료" 시에만 발동으로 명확화

**관련 BL**: 없음 (운영 룰만 박는 것이므로 BL 신설 불필요).

---



> 본 섹션은 헌법 부칙 5·6 신설 + BUSINESS.md 15-A 통찰 7개와 동시 확정된 결정들이다.
> AI용 인덱스: `DECISIONS_INDEX.md` (D-004 ~ D-009)

### 결정 D-004: 4 시스템 카테고리 (헌법 부칙 5)
**무엇을**: TW B2B 운영을 4개 시스템으로 분리·동기화한다.
- ① 비즈니스 독스 ② Task & Status ③ Page Gallery ④ Service Operations

**왜**: 한 파일에 합치는 게 아니라 4개가 동기화되는 것이 진짜 통합. 옛 STATUS.md 326줄이 동기화 깨졌던 사례에서 도출.
**누가**: 이지형 대표님 + Claude

### 결정 D-005: UX/UI 통일 우선, 콘텐츠 디테일 나중 (헌법 부칙 6)
**무엇을**: Aurora Trendy 디자인 시스템을 모든 페이지에 동일 적용한 후에만 사업을 시작한다. 콘텐츠 디테일은 운영 중 매니저 피드백으로 개선.
**왜**: 매니저 첫인상 = 사업 모델 신뢰 좌우. 임시 디자인은 만들지 않는다. 디자인 시스템 자체가 사업 자산이다.
**누가**: 이지형 대표님 + Claude

### 결정 D-006: YouTube 더보기 호텔별 단축 URL 클릭 카운트
**무엇을**: YouTube 영상 더보기에 호텔별 단축 URL(`gohotel.win/h/{hotel_id}`) 배치, TOP1/TOP2/TOP3 순서. 클릭 시 Supabase 카운트 +1 → Agoda 어필리에이트 리디렉션.
**왜**: 진성 관심 사용자 측정 = 조회수와 다른 지표 = 다른 OTA에 없는 차별화 = **사업 모델의 핵심 부품**.
**누가**: 이지형 대표님 + Claude

### 결정 D-007: 매니저 대시보드 한 화면 7영역
**무엇을**: 매니저가 로그인하면 한 페이지(스크롤만)에서 7영역(진행 단계 / 호텔 정보 / 콘텐츠 / 노출 채널 / 예약 결과 / 6개월 보장 / 매출 추정)을 5초 안에 파악.
**왜**: 헌법 7조(5초 파악)을 매니저에게도 동일 적용. "어려우면 안 됨"이 TW B2B 차별화 전략.
**누가**: 이지형 대표님 + Claude

### 결정 D-008: 조회수 보조 지표화, 메인은 사업 지표
**무엇을**: 매니저 대시보드에서 조회수는 작은 보조 표시로만, 메인은 채널 노출(8/8) / 콘텐츠 결과 / 예약 / 매출 추정 / 6개월 보장.
**왜**: 조회수 적어도 예약 일어나는 케이스 존재. 조회수만 보여주면 매니저 실망 → 해지. "우리한 방법" 필요.
**누가**: 이지형 대표님 + Claude

### 결정 D-009: 인보이스 / 영수증 PDF 영구 다운로드
**무엇을**: 인보이스, 결제 영수증, 6개월 사용 리포트 PDF를 결제 후 1년 이상 매니저 대시보드 별도 탭에서 1클릭으로 다운로드 가능.
**왜**: 회계·세무 시즌 필요. 메인 화면에서 1번 클릭으로 도달해야 함.
**누가**: 이지형 대표님 + Claude

### 결정 D-010: 카테고리별 단일 진실 파일 매핑 표준 ⭐⭐
**무엇을**: 헌법 부칙 5의 4 카테고리 각각이 다루는 .md/.json 파일을 명시적으로 매핑한다. 한 파일이 두 카테고리에 동시 존재 불가, 누락 불가.

| # | 카테고리 | URL | 단일 진실 파일 |
|:--:|---|---|---|
| 0 | Central Hub | `/admin-hub.html` | (라우팅만) |
| 1 | Business Docs | `/admin-business.html` | BUSINESS / DECISIONS / DECISIONS_INDEX / JOURNEY / BUSINESS_FLOW |
| 2 | Task & Status | `/admin-tasks.html` | tasks.json / BACKLOG / CHANGELOG / SOLO_WORK_QUEUE / ECHO_LOG |
| 3 | Page Gallery | `/admin-gallery.html` | docs/screenshots / _backup_/ / pages-meta.mjs |
| 4 | Service Ops | `/admin-service-ops.html` | SERVICE_OPS / RUNBOOK / INCIDENT_LOG (운영 후) |

**왜**:
- 1단계 작업(BL-CENTRAL-HUB) 후 발견: BACKLOG가 두 카테고리에 동시 존재 + JOURNEY/DECISIONS_INDEX/ECHO_LOG/SOLO_WORK_QUEUE 5개가 어느 페이지에도 노출 안 됨.
- 헌법 부칙 5가 종이 위에만 있고 코드엔 반영 안 된 상태였음.
- 대표님 통찰: "메뉴툴에 있는 메뉴들의 특성에 맞게 변경, 수정하여 최종 통합시스템을 만들어야 한다."

**후속 작업**: BL-CATEGORY-REMAP (P0) — 6단계로 코드 정리.
**누가**: 이지형 대표님 + Claude

---

### 결정 D-011: 3-State 권한 시스템 + 영·한 체계 + admin-status 작업 범위 ⭐⭐ 2026-05-04
**무엇을**: 통합관리 시스템에서 작업을 3가지 상태로 분류하고, 권한 등급은 2단계로 시작하며, admin-status는 한국어 우선으로 진행한다.

**3-State 작업 분류 (배지 색 일관성)**:
| 색 | 라벨 (KO) | 라벨 (EN) | 의미 | 누가 실행 |
|---|---|---|---|---|
| 🟢 초록 | 🤖 자동 | 🤖 Auto | 시스템 자율 | scan-bot / sync-bot / GitHub Actions |
| 🔵 파랑 | 👥 직원 가능 | 👥 Staff | 단순 트리거 | 권한 직원 (Staff) — 명령어 붙여 실행 |
| 🟡 노랑 | 👤 대표님 결정 | 👤 CEO Decision | 사업/디자인 결정 | 대표님(CEO)만 |
| ⚪ 회색 | ⏸ 보류 | ⏸ Hold | 의도된 대기 | 외부 조건 충족 후 |
| 🔴 빨강 | 🚫 막힘 | 🚫 Blocked | 외부 의존 막힘 | 의존성 해제 후 |

**자동 분류 로직 (tasks.json 메타데이터)**:
- `claude_can_auto: true` → 🤖 자동
- `claude_can_auto: false` + `approval_required: false` → 👥 직원 가능
- `claude_can_auto: false` + `approval_required: true` → 👤 대표님 결정

**권한 등급 (2단계 시작)**:
- **CEO** (대표님 1명) — 모든 결정 + 모든 작업 트리거
- **Staff** (권한 직원) — 🤖 자동 작업 모니터링 + 👥 직원 가능 작업 트리거. 👤 결정 작업은 차단

**확장 계획**:
- 지금: 코드 구조만 준비 (CEO 단독 사용)
- 다음 주: 영·한 토글 일괄 적용 (메모리 #20 원칙 — i18n 단일 작업)
- 그 후: 첫 직원 추가 (스리랑카 1명, role='staff')
- 향후 필요시 3단계(CEO/Senior/Operator)로 세분화

**왜** (대표님 발언):
> "내가 결정과 로봇자동화 표시가 있는데, 나 말고 다른 직원이 할 수 있는 단순작업도 표시 할 수 있으면 좋겠어. 권한을 가진 직원이 실행할 수 있게. 올해 10개 이상 프로젝트를 한다 해도 메인은 내가 결정하지만, 단순한 건 누구나 할 수 있어 빨리 진행할 수 있잖아."
> "TW B2B 영어 사이트에 관리자도 영어로 제공해야 해외 직원들도 관리 가능."

**핵심 통찰**: 기존 2-state(자동/결정)는 대표님 병목이 그대로. 3-state는 **"단순 작업 → 직원, 결정 → 대표님"** 분리로 병목 해제.

**admin-status 작업 범위 (이번 결정으로 확정)**:
- ✅ 3-state 배지 모두 구현 (🤖 자동 / 👥 직원 / 👤 대표님)
- ✅ 한국어 우선 (data-en 영어 속성은 박되 표시는 KO 기본)
- ✅ 개발 영역만 (사업 KPI는 별도 대시보드)
- ⏳ 영·한 토글 작동 + 직원 권한 차등은 다음 주 일괄 작업으로 분리

**프레임워크화 (장기)**:
- 지금: TW B2B에서 검증·완성 우선
- 추후: "Claude Operations Framework v1"로 추출 → 호텔이야 / CEYLON JOURNEY / 신규 사업 동일 인프라 복제

**누가**: 이지형 대표님 통찰 + Claude 정리
**연관 작업**: BL-STATUS-DASH (이번 진행 중 작업), BL-I18N-BATCH (다음 주 예정), BL-STAFF-ROLE (직원 추가 시점에)

---

### 결정 D-012: 대용량 admin 페이지 3-Layer 분리 + admin-tasks 대시보드 흡수 ⭐ 2026-05-04
**무엇을**: admin-status.html이 대용량(>100KB) 데이터를 직접 fetch하지 않고 3-Layer로 분리한다. 그리고 admin-tasks의 KPI/임박작업 대시보드는 admin-status로 흡수한다 ("하나에서 전체 관리").

**3-Layer 분리 (D-012)**:
| Layer | 파일 | 역할 |
|---|---|---|
| Summary | `pages-status.summary.json` | 카드용 요약 (점수/카테고리별 평균/사이드바 점수) |
| Display | `pages-status.display.json` | UI 표시용 (사이드바 메뉴, 카테고리 통계, top10 페이지) |
| Full | `pages-status.json` | 전체 raw 데이터 (scan-bot 출력) |

**왜**:
- 대용량 fetch는 페이지 로딩 지연
- 3-Layer로 분리 시 Summary는 5KB 이하 → 첫 화면 즉시 렌더
- Display는 고정 키 구조 → UI 코드 안정
- Full은 raw 보기 / 디버그용

**admin-tasks 흡수 사유**:
> 대표님: "사이드바에서 작업 관리 들어가면 admin-tasks가 임박/카테고리/완료율 또 보여줘. admin-status랑 똑같이 안 되고? 하나에서 전체 보면 되잖아."

→ admin-tasks는 작업 모달/CRUD 전용, KPI 대시보드는 admin-status에 흡수.

**연관 작업**: BL-STATUS-DASH (Phase 3-B 동적 fetch 구현 완료), BL-PAGE-DEDUP (admin-tasks 대시보드 제거 완료)

---

### 결정 D-013: admin-hub.html 폐기 — 사이드바 = 라우팅 / admin-status = 통합 진입점 ⭐⭐ 2026-05-04
**무엇을**: admin-hub.html을 폐기하고 admin-status.html을 5 카테고리 통합 진입점으로 승격한다. 사이드바가 라우팅을 담당하므로 별도 허브 페이지가 잉여(redundant).

**왜** (대표님 발언):
> "사이드바 메뉴 6개에 admin-hub 안에도 4 카테고리 카드 또 있으면 중복이잖아. 필요 없는 거 같애."

**핵심 통찰**: 사이드바가 이미 카테고리 라우팅 역할을 완벽히 처리하고 있는데, admin-hub가 똑같은 카드를 한 번 더 보여주는 건 클릭 단계만 늘리는 잉여 레이어. 헌법 7조 ("5초 안에 파악") 위배.

**조치**:
1. admin.html 사이드바 — Central Hub 메뉴 제거, System Status를 보라 그라디언트 강조 항목으로 승격 (Tools 6→5).
2. vercel.json — `/admin-hub.html` + `/admin-hub` 둘 다 admin-status.html로 301 영구 리다이렉트.
3. admin-hub.html — 폐기 안내 페이지로 교체 (meta refresh + JS replace + 사용자 안내 3중 안전망).
4. 헌법 부칙 5 / D-010 매핑 표 — 카테고리 0(중앙 허브)을 admin-status로 이관, 강제 규칙 갱신.
5. admin-status.html — 6 카테고리 카드 → 5 카테고리 카드 재정렬 (Card 1 Central Hub 제거 + Card 2~6 → 1~5).
6. admin-status.html / admin-service-ops.html — '허브로' / 'Back to Hub' 버튼 → 'Admin' / 'Back to Admin'으로 변경.

**효과**: 클릭 단계 3단계(사이드바 → admin-hub → 카테고리) → 1단계(사이드바 → 카테고리) 단순화.

**연관 작업**: BL-HUB-RETIRE (이번 작업), BL-PAGE-DEDUP (선행 작업)
**누가**: 이지형 대표님 통찰 + Claude 자율 실행

---

---

### 결정 D-014: 헌법 부칙 15 신설 — chat-log 박기 자동 강제 게이트 ⭐⭐ 2026-05-08

**무엇을**: BL 작업 done 트랜지션 시 `_chat-logs/index.json byTask` 매핑 의무를 헌법(부칙 15) + auto-detect-bot(검증 게이트) 양쪽에 박는다.

**왜** (사고 본질):
선행 작업 **BL-ACT-INDEX-RESTORE** 진행 중 chat-log를 박지 않아 4개 commit (`67273d8`, `aa5dcd6`, `2ec94a3`, `f1c06fa`) 모두 byCommit 매핑 실패 → admin-status 활동이력 펼침에서 "기록 못 찾음" 발생. byCommit 시간근접 fallback이 일부 메웠지만 본질 해법은 **byTask 매핑 강제**.

원인은 단순: 사람이 잊어도 시스템이 못 막았다. 부칙 7(progress.steps 강제)과 동일 패턴으로 부칙 15 추가.

**핵심 통찰**: "자동화 게이트는 중복으로 보이더라도 누락보다 낫다." 사람이 잊을 수 있는 모든 의무는 봇이 검증해야 한다 — 헌법 명문 + 봇 코드 양쪽 동시.

**조치**:
1. `OPERATIONS_CHARTER.md` 부칙 15 신설 (1줄, 165줄로 200줄 제한 준수). 디테일은 playbook 참조.
2. `_os/playbook/chatlog-auto-gate.md` 신설: 의무·검증게이트·자가치유·예외(`chatlog_exempt: true` / `META-` prefix)·작성형식·운영흐름.
3. `_os/scripts/auto_detect_task_status.py` 패치: `update_task()`에 `chatlog_by_task` 인자 추가, done 트랜지션 직후 byTask 매핑 검증, 없으면 `task['chatlog_warning']` 박음, 매핑 박히면 자가 치유. summary에 `chatlog_warnings` 별도 수집 + GitHub Actions Summary 출력.
4. 단위 테스트 6 케이스 통과: 매핑없음/매핑있음/자가치유/exempt/META-/in_progress 무영향.

**효과**:
- 앞으로 BL done 처리 시 chat-log byTask 매핑 자동 검증.
- 박지 않으면 ⚠️ 워닝 노출, 박으면 자가 치유.
- BL-ACT-INDEX-RESTORE 같은 사고 영구 차단.

**비교 — 부칙 7 vs 부칙 15**:
- 부칙 7: pending → in_progress 트랜지션 시 progress.steps 검증
- 부칙 15: in_progress → done 트랜지션 시 chat-log byTask 매핑 검증
- 두 게이트가 작업 라이프사이클 입구·출구를 모두 지킴.

**연관 작업**: BL-CHATLOG-AUTO-GATE (이번 작업), BL-ACT-INDEX-RESTORE (선행 — 이 사고가 본 결정의 트리거)
**누가**: Claude 발견·설계·실행 + 이지형 대표님 헌법 변경 승인 (자율 진행 가능: ❌ → 헌법 변경이라 대표님 결정 필요 작업이었음)

---

### 결정 D-016: BL-ADMIN-AUTH-V2 라우터 통합 — Vercel Hobby 12 함수 한도 회피 ⭐⭐ 2026-05-04

**무엇을**: D-015에서 추가한 신규 5개 함수(api/admin/* 4개 + api/auth/session 1개)를 라우터 패턴으로 기존 함수에 흡수. Vercel Hobby 플랜의 12개 Serverless Function 한도 회피.

**왜**: D-015 박은 직후 Vercel Build Failed 발생 — `No more than 12 Serverless Functions can be added on the Hobby plan`. 함수 갯수 15개 → 한도 초과.

**대표님 결정 (비용 정책)**: C 옵션 — 지금 라우터 통합으로 무료(Hobby) 유지 + 정식 오픈 직전 Pro($20/월) 전환.

**왜 무료 유지가 맞나**:
- 정식 오픈 전 = 매출 0 = $20/월도 부담
- 매니저 1~2명 들어오면 즉시 회수 ($200/매니저)
- Pro로 가도 라우터 패턴은 더 깨끗 (cold start ↓, 코드 책임 분리)

**박은 변경**:

| 변경 | Before | After |
|---|---|---|
| api/admin/accept-invite.js | 별도 함수 | api/_lib/admin-auth-handlers.js의 한 case |
| api/admin/change-role.js | 별도 함수 | 동일 |
| api/admin/invite.js | 별도 함수 | 동일 |
| api/admin/users-list.js | 별도 함수 | 동일 |
| api/auth/session.js | 별도 함수 | api/auth.js의 한 case |

**라우팅 흐름** (vercel.json rewrites 추가):
```
클라이언트              vercel.json rewrites           실제 함수
/api/admin/invite    → /api/admin?action=auth-invite → api/admin.js → adminAuthHandler
/api/auth/session    → /api/auth?action=session     → api/auth.js
```

**핵심 설계**:
- `api/admin.js`의 라우터에서 `action.startsWith('auth-')` 감지 → `_lib/admin-auth-handlers.js` 호출
- auth-* 핸들러는 자체 Bearer JWT 인증 (`requireAdmin` 우회 — accept-invite는 가입 전 무인증 진입 필요)
- 클라이언트 코드 변경 0 (rewrites가 흡수)

**함수 갯수**:
- D-015 박은 직후: **15개** ❌ (Build Failed)
- D-016 박은 후: **12개** ✅ (정확히 한도)

**파일 변경**:
- 신규: `api/auth.js`, `api/_lib/admin-auth-handlers.js`
- 수정: `api/admin.js` (auth-* prefix 분기 추가), `vercel.json` (rewrites 5개 추가)
- 삭제: `api/admin/`, `api/auth/` 폴더 (5개 파일)

**Phase β 마이그레이션 (정식 오픈 직전)**:
- Pro 플랜 전환 → 함수 한도 해제
- 라우터 패턴 유지 (코드 정리 가치)
- 새 기능은 자유롭게 분리 가능

**연관 작업**: D-015 (BL-ADMIN-AUTH-V2 본 작업)
**누가**: 이지형 대표님(비용 정책 결정) + Claude 자율 실행(라우터 패턴 + rewrites)

---

### 결정 D-015: BL-ADMIN-AUTH-V2 — 5단계 권한 + 초대 + 즉시 박탈 + 무제한 이력 ⭐⭐⭐ 2026-05-05
**무엇을**: 임시 비번 시스템(ADMIN_ACCESS_KEY 쿠키) 폐기. Supabase Auth 기반 정식 권한 시스템 박음.

**왜** (대표님 발언):
> "이메일로 회원가입, 관리자로 저정됨, 호텔은 자유롭게 가입하는데. 우리가 매칭하는게 있어서 내가 최종승인처리하는거로 알고 있는데 시스템을 그렇게 만들걸로 안고 있어."
> "단순히 회원가입으로 가자"
> "호텔 매칭 체크해야 되서. 맞는지 너가 확인 필요"

**라이브 코드 검증 결과**: 호텔 매칭/승인 흐름은 이미 hotel-info.html(매니저) + _admin/admin.html(어드민)에 박혀있음. 권한 분리만 빠져있음 → BL-ADMIN-AUTH-V2가 채움.

**5단계 권한 체계**:

| Role | 가입 방식 | 권한 |
|---|---|---|
| **owner** | dgmasters01@gmail.com 자동 (DB 트리거) | 전체 (삼중 보호) |
| **admin** | 초대 전용 (owner 발송) | staff/readonly 변경, 초대, 호텔 승인 |
| **staff** | 초대 전용 (owner/admin 발송) | 호텔 매칭 처리, 콘텐츠 편집 |
| **readonly** | 초대 전용 | 조회만 |
| **manager** | 자유가입 (signup.html) | 자기 호텔만 (RLS) |

**Owner 삼중 보호**:
1. **DB 트리거** `protect_owner_account` — role/email/is_active 변경 차단, 삭제 차단
2. **handle_new_user 트리거** — dgmasters01@gmail.com 가입 시 자동 owner 박힘
3. **RLS 정책** — DELETE는 owner만 (단, owner 본인 삭제는 트리거가 차단)

**보안 자동 장치**:
- 비밀번호: bcrypt (Supabase 자동), 8자 이상 강제 (UI/API)
- 세션: 30일, refreshToken 자동 갱신
- 박탈 시: 즉시 모든 세션 종료 (auth.admin.signOut)
- 이력: role_change_log 무제한 영구 보존 (10가지 action 추적)
- RLS: admins/admin_invitations/role_change_log 모두 활성

**박힌 파일** (한 commit 통합 — 분할 시 거짓 시스템):
- SQL: `sql/bl-admin-auth-v2.sql` (Supabase Management API로 자동 적용)
- API: `/api/auth/session` `/api/admin/invite` `/api/admin/accept-invite` `/api/admin/change-role` `/api/admin/users-list`
- API 재작성: `/api/admin-page` (임시 비번 → Supabase 세션 검증)
- 페이지: `/admin-login.html` `/admin-accept-invite.html` `/_admin/admin-permissions.html`
- 라우팅: vercel.json (admin-permissions / admin-hub rewrites)
- 통합: admin-status.html에 Card 6 권한 관리 추가

**메일 발신자** (메모리 #10 표준):
- 한국어 초대: `여행능력자들 <noreply@gohotelwinners.com>`
- 그외 언어: `TravelWinners <noreply@gohotelwinners.com>`
- Reply-To: info@gohotelwinners.com

**Google OAuth 결정**: 보류. 직원 1~2명 단계에서 ROI 낮음. 5명 넘어가면 별건 BL-GOOGLE-OAUTH로 추가.

**연관 작업**: BL-ADMIN-AUTH-V2 (이번 commit)
**누가**: 이지형 대표님 결정 + Claude 자율 실행 (기술 디테일 100%)

---


**무엇을**: 모든 큰 단위 작업은 commit 직전에 `chat-logs/{slug}.md`에 풀 디테일 한국어 기록을 남긴다. 활동 이력 화면에서 commit 클릭 → chat-log fetch → 펼침 패널로 표시.

**왜** (대표님 발언):
> "내가 계속 강조하는거는 내가 볼수 있는 화면과 너의 시스템 내용을 별도로 제공해서 시스템을 운영해야. 그래야 나도 그분을 찾아 볼수 있잖아. 무슨내용으로 했는지 내가 일어봐야 알수 있잖아. 너도 너가 읽을수 있게 정리해 놓은 코드를 잘 정리해야 쉽게 알수 있잖아. 이거는 너와 나의 합의점이라고 생각해. 서로가 알수 있는."

**핵심 통찰** (대표님):
> "사라지면 다시 기존에 이야기는 디테일하게 알수가 없겠네"
→ 채팅이 끝나면 디테일 사라짐 = "결과만 남고 과정 사라짐" = 헌법 4조(전수 추적) 위반.

**3-Layer 구조** (D-010 단일 진실 + 헌법 6조 이중 형식):

| Layer | 파일 | 역할 | 누가 박나 |
|---|---|---|---|
| L1 채팅 로그 | `chat-logs/{YYYY-MM-DD-slug}.md` | 대표님 발언 원문 + Claude 자율 판단 근거 + 막힌 지점 + 검증 (한국어 풀어쓰기) | Claude, 큰 단계 commit 직전 |
| L2 ECHO_LOG | `ECHO_LOG.md` | 결정/통찰/정책 변경 추출 | Claude (기존) |
| L3 commit 메시지 | `git log` | 변경 사유 + 검증 결과 | Claude (기존) |

**연결 키**: commit hash. 한 commit이 활동 이력 한 줄 = chat-log 한 파일 = ECHO_LOG 한 항목 = DECISIONS 한 항목 (있을 때만) = CHANGELOG 한 항목.

**인증 게이트** (헌법 11조 "운영 진입 후 토큰 비움" 보강):
- chat-logs는 GitHub repo에 두되 직접 URL 접근 차단
- vercel.json `rewrites`로 `/chat-logs/*` → `/api/chat-log` API 함수 라우팅
- API에서 토큰 검증(`x-admin-token` = `ADMIN_VIEW_TOKEN` env) 또는 Referer가 gohotelwinners.com인 경우만 200 응답
- 장기: admin-* 전체 Supabase Auth 게이트는 별건 BL로 등록

**활동 이력 화면 보강** (Phase 2):
- activity-row 클릭 → 펼침 패널 (탭 3개)
- 📖 사람용 = chat-logs/{commit_hash}.md fetch
- 🤖 AI용 = ECHO_LOG / DECISIONS 발췌
- 🔧 코드 변경 = commit diff 요약

**자동화 의무**:
- Claude는 큰 단위 작업 commit 직전 무조건 chat-log 박기 (메모리에 강제 박음, Phase 3에서 진행)
- `scripts/build-chat-log-index.mjs` — frontmatter 읽어 `chat-logs/index.json` 자동 생성
- 인덱스에 `byCommit` / `byTask` 매핑 → 활동 이력 화면이 commit hash로 조회

**연관 작업**: BL-CHAT-LOG-SYSTEM (Phase 1: 이번 작업)
**누가**: 이지형 대표님 핵심 합의 ("서로가 알수 있는" 시스템) + Claude 자율 실행

---

## 🆕 2026-04-29 — 비즈니스 흐름 전면 정리

### 결정 1-C: 매니저 정보 변경 정책 (Tier 차등) ⭐ 2026-04-29 추가
**무엇을**: 매니저가 정보 변경 시 영향도에 따라 3-Tier 차등 처리

**왜** (대표님 발언):
> "매니저 가입하면 내용이 잘못 되었을 경우, 변경해야 될 경우, 승인 필요할까?"

**3-Tier 구조**:
- **Tier 1 (즉시 변경)**: 비밀번호, 휴대폰, 직책, 마케팅 동의
  → 변경 이력 로그만 남김
- **Tier 2 (즉시 + 알림)**: 이메일, 호텔 사진, 담당자 이름 오타 수정
  → 즉시 반영 + 관리자 알림 메일
- **Tier 3 (관리자 승인 필수)** ⭐: 호텔명, 주소, Agoda 링크, 등급, 담당자 교체
  → 승인 대기 → 관리자 검증 → 반영

**왜 Tier 3 승인 필수인가**:
- 호텔이 영상을 다른 호텔로 바꿔치기 위험 방지
- 매니저 실수로 잘못된 정보 입력 → 영상 재제작 비용 발생 방지
- 우리는 6개월 보장 약속한 입장 → 신중한 변경 필요

**구현 위치**: settings.html 보강 + admin.html 승인 큐 신설

**누가**: 이지형 대표님 통찰

---

### 결정 1-D: 호텔 담당자 교체 시스템 (Manager Handover) ⭐ 2026-04-29 추가
**무엇을**: 호텔에 여러 담당자 가능 + 담당자 교체 워크플로 + 결제 이력은 호텔에 귀속

**왜** (대표님 발언):
> "호텔 담당자가 바뀔 수 있으니깐. 기존에 누구의 이름으로 결제를 했는지 이름이라든지 표시 정리해 놓을. 이분들이 이 시스템을 계속 이용하면 스토리도 알 수 있잖아."

**핵심 통찰**:
- 매니저는 회사를 떠날 수 있지만 호텔은 남는다
- 결제 이력 = 호텔의 자산 (영구 보존)
- 담당자 교체 시 인수인계 워크플로 필요
- "누가 결제했는지" 기록은 영업 자산 (LTV 분석)

**데이터 모델 변경**:
- 기존: profiles ←→ hotels (1:1)
- 변경: hotels → hotel_managers (1:N) ⭐ 신규 테이블
  - current (boolean): 현재 담당자 여부
  - role (primary / secondary): 권한 구분
  - started_at / ended_at: 담당 기간
  - handover_from_id: 인수인계 받은 사람

**인수인계 워크플로**:
```
1. 김매니저: "호텔 담당 인수인계" 버튼 클릭
2. 새 담당자 이메일 입력 → 박매니저
3. 박매니저에게 초대 메일 자동 발송
4. 박매니저 수락 → hotel_managers 테이블 업데이트
5. 김매니저 → current=false, 박매니저 → current=true
6. 결제 이력은 그대로 보존
7. 관리자에게 ops 메일 알림
```

**이전 담당자 권한**:
- 본인이 결제했던 호텔 정보 평생 조회 가능 (read-only)
- 변경 권한은 없음

**여러 담당자 가능**:
- primary (1명, 모든 권한)
- secondary (여러 명, 정보 변경 권한 제한)

**구현**:
- 새 테이블: `hotel_managers`
- API 신설: `/api/hotel-handover.js`
- UI 신설: settings.html 인수인계 섹션 + 초대 수락 페이지

**우선순위**: BACKLOG Phase B (sales/marketing 완성 후)

**누가**: 이지형 대표님 핵심 통찰

---

### 결정 1-E: 호텔 스토리 / LTV 추적 ⭐ 2026-04-29 추가
**무엇을**: 호텔별 거래 이력 + 누적 성과 + ~~충성 고객 등급 시스템~~ (등급 부분은 결정 1-H로 폐기)

**왜** (대표님 발언):
> "이분들이 이 시스템을 계속 이용하면 스토리도 알 수 있잖아."

**관리자 페이지에서 보는 정보** (admin.html):
- 첫 결제일 / 재결제 횟수 / 총 매출
- 담당자 이력 (현재/이전)
- 영상 이력 (시기별 제작)
- 누적 성과 (총 예약 ⭐ + 조회수 + ROI)
- 운영 메모 (관리자 전용)
- ~~고객 등급: 🥉 Bronze (1회) / 🥈 Silver (2회) / 🥇 Gold (3회+) / 💎 Platinum (5회+)~~ → **결정 1-H로 폐기**
- 영업 인사이트(사실 기반): "재결제 3회 충성 호텔" 같은 표현

**매니저 페이지에서 보는 정보** (marketing.html):
- "우리와 함께한지 X일째"
- "누적 결제 N회 ($M)"
- "누적 예약 N건" ⭐ (조회수보다 우선, 결정 1-I 참조)
- 매니저가 자부심 갖고 사장에게 보고 가능

**비즈니스 가치**:
- LTV (Lifetime Value) 분석 → 영업 자료
- 재결제 호텔 식별 → 우선 영업
- "Lotte는 3번 결제한 충성 호텔" → 신규 호텔 설득
- 체인 호텔 추가 영업 가능성 발견

**구현**:
- DB 뷰: `hotel_lifetime_stats` (자동 집계)
- admin.html 호텔 상세 페이지 강화
- marketing.html "우리와 함께한 시간" 섹션 추가

**우선순위**: BACKLOG Phase C (자동화)

**누가**: 이지형 대표님 통찰

---

### 결정 1-F: sales/marketing 페이지 디자인 — "전세계 1등" 수준 ⭐ 2026-04-29 추가
**무엇을**: sales.html + marketing.html을 글로벌 1등 SaaS 수준 디자인

**왜** (대표님 발언):
> "결제 마케팅 페이지에 프로세스 진행 단계를 잘 보여주고 멋지게 전세계 1등에 맞게 보여줘야 돼 맞지?"

**참고 벤치마크**:
- Stripe (가격 + 신뢰)
- Notion (시각적 임팩트)
- Linear (미니멀 프리미엄)
- Vercel (그라데이션 모던)
- Plausible Analytics (대시보드)

**sales.html 핵심 요소**:
1. 전체화면 히어로 + 그라데이션
2. 실시간 통계 카운트 애니메이션 (영상 수 / 조회수 / 채널 수)
3. 프로세스 시각적 타임라인 (결제 → 제작 → 노출 → 보장)
4. 5개 언어 채널 강력한 시각화 (각 채널 구독자 / 예시 영상)
5. 6개월 보장 배지/도장
6. 호텔 후기 카루셀
7. FAQ 아코디언
8. 두 번째 CTA (스크롤 끝)

**marketing.html 핵심 요소**:
1. 큰 숫자 3개 (조회수 / 예약 / 누적 매출)
2. 시각적 프로세스 진행 바 (6개월 D-Day)
3. 6채널 그리드 (각 채널별 조회수 카드)
4. 시간별 조회수 차트 (우상향 그래프)
5. PDF 보고서 다운로드 (강조 버튼)
6. 호텔 스토리 (우리와 함께한 시간)
7. 빠른 액션 (담당자 변경 / 정보 수정)

**디자인 원칙**:
- 매니저가 3초 안에 가치 확신
- 사장에게 보여줘도 부끄럽지 않은 수준
- 모바일 완벽 대응
- 다크/라이트 테마 (선택)
- 영문 우선 + 한국어 토글

**우선순위**: BACKLOG P0 / Phase A (지금 작업)

**누가**: 이지형 대표님 비전

---

### 결정 1: 페이지 흐름 재설계
**무엇을**: dashboard.html 단일 페이지 → **sales.html (결제 전) + marketing.html (결제 후)** 분리

**왜**:
- 결제 박스가 dashboard에 노출되어 결제 후에도 표시되는 비즈니스 비효율
- 결제 전/후 사용자 니즈가 완전히 다름 (전: 설득 필요 / 후: 성과 확인 필요)
- 매니저는 매일 안 들어옴 → 들어올 때 "성과" 만 보고 싶음

**구현 위치**: BACKLOG.md P0 / Phase A

**누가**: 이지형 대표님 결정 (Claude 제안)

---

## 🆕 2026-04-29 — 비즈니스 흐름 전면 정리

### 결정 1-G: 통합 To-Do Inbox 운영 원칙 ⭐⭐⭐ 2026-04-29 추가
**무엇을**: admin.html Dashboard 탭 = **모든 처리 작업이 모이는 통합 인박스**

**왜** (대표님 발언):
> "한 사람이 처리해야 될 업무는 한 곳에서 우선순위가 표시되어 체크하면 정리할 수 있게 해야 됨."
> "내가 복잡하게 관리하게 하면 안 됨. 나에게 유리하게 해야 됨."

**핵심 통찰**:
- 대표님 = 1인 운영 (혼자 모든 처리)
- 여러 탭/페이지 돌아다니면 일 누락 발생
- 한 곳에서 우선순위 자동 정렬 + 체크 처리 필요

**구체적 항목** (Dashboard에 표시될 작업):
- 🔴 호텔 승인 대기
- 🟠 Agoda 매칭 실패 (수동)
- 🟡 호텔 정보 변경 신청 (Tier 3)
- 🟢 영상 제작 시작 대기
- 🔵 영상 노출 시작 대기
- ⚪ 담당자 교체 신청
- 📊 6개월 보장 D-30 임박 호텔

**금지 사항**:
- ❌ 처리 작업을 Hotels / Agoda Matching / Members 등 여러 탭에 분산
- ❌ 대표님이 "어디서 처리하지?" 고민하게 만드는 UI

**의무 사항**:
- ✅ 모든 처리 작업이 Dashboard 한 곳에
- ✅ 우선순위 자동 정렬
- ✅ 체크박스 완료 처리
- ✅ 클릭 시 즉시 처리 화면 (모달/새 탭)

**구현 우선순위**: BACKLOG P0 (sales/marketing 작업과 함께)

**관련 문서**: BUSINESS.md §0 신설

**누가**: 이지형 대표님 핵심 운영 철학

---

### 결정 1-H: 호텔 등급 시스템 폐기 ⭐ 2026-04-29 추가
**무엇을**: ~~Bronze / Silver / Gold / Platinum 등급 표시~~ → **단순 사실만 표시**

**왜** (대표님 발언):
> "Bronze/Silver/Gold/Platinum 등급 이거는 왜 필요하지? 필요 없을 것 같은데."

**제거 이유**:
- B2B 호텔 영업에서 매니저에게 "Bronze" 표시 → **자존심 상함**
- 일반 SaaS 게이미피케이션 패턴은 호텔 영업과 맞지 않음
- 단순 사실 ("누적 결제 N회") 이 더 신뢰감 있음

**대체 방식**:
- ✅ 매니저 marketing.html: "누적 결제 1회 ($200)" 만 표시
- ✅ 관리자 admin.html: "재결제 3회 충성 호텔" 같은 영업 인사이트 (라벨 X, 사실 표현)
- ✅ 영업 분류는 내부용 (재결제 호텔 / 신규 호텔 / 만료 임박 / 체인 호텔)

**누가**: 이지형 대표님 직관적 판단

---

### 결정 1-I: 매니저 페이지 핵심 지표 = 예약 (조회수 X) ⭐⭐ 2026-04-29 추가
**무엇을**: marketing.html 1순위 지표를 **조회수 → 예약 발생 건수** 로 변경

**왜** (대표님 발언):
> "영상을 조회수 낮을 수 있어. 그러나 예약은 해."

**핵심 통찰**:
- **조회수 = Vanity Metric** (가짜 지표, 변동성 큼)
- **예약 = Real Metric** (진짜 지표, 실제 매출 발생)
- 호텔 매니저 입장에서 ROI 계산은 "예약 건수 × 평균 객실 단가"

**케이스 비교**:
- 조회수 5,000 / 예약 0건 → "광고 효과 없음"
- 조회수 500 / 예약 12건 → "이게 진짜 가치"

**marketing.html 우선순위 재정의**:
- 1순위: 📞 예약 발생 건수 + 추정 매출 + ROI ⭐
- 2순위: 📋 예약 상세 보기 (검증)
- 3순위: 📺 채널별 조회수 (참고용)
- 4순위: D-Day / 호텔 스토리

**구현 영향**:
- marketing.html 디자인 변경 (조회수 카드 → 예약 카드 강조)
- sales.html 가치 어필 시 "예약 발생 보장" 강조
- 자동 메일 (월간 리포트) 첫 줄에 예약 건수 우선 표시

**관련 문서**: BUSINESS.md §10 정정

**누가**: 이지형 대표님 핵심 비즈니스 통찰

---

### 결정 1-J: Agoda 예약 검증 시스템 (Booking Verification) ⭐⭐ 2026-04-29 추가
**무엇을**: 매니저가 marketing.html에서 **본인 호텔 예약을 직접 확인 + Agoda Partner Hub에서 대조 가능**

**왜** (대표님 발언):
> "아고다의 본인 확인 할 수 있는 것을 제공해줘야 돼."
> "TW Booking Analytics에서 보면 호텔별로 예약번호, 예약날짜, 시간 등 대조할 수 있는 것."

**비즈니스 본질**:
- 우리가 "예약 8건 발생" 이라고 말로만 하면 매니저는 못 믿음
- 6개월 환불 분쟁 시 **객관적 증거** 필요
- 매니저가 사장에게 보고할 때 **검증 가능한 데이터** 필요
- → **신뢰가 비즈니스의 생존**

**제공할 정보**:
- 예약번호 (Agoda Booking ID)
- 예약 날짜 / 시간
- 체크인 / 체크아웃
- 객실 수 / 인원
- 금액
- 예약자 국가 (이름은 마스킹)

**매니저 검증 워크플로**:
1. marketing.html → "예약 8건 발생" 확인
2. "예약 상세 보기" 클릭
3. 예약번호 8개 확인
4. Agoda Partner Hub 로그인
5. My Bookings → 예약번호 검색
6. ✅ 동일 정보 확인 → 완벽한 신뢰 형성

**개인정보 처리**:
- ✅ 표시: 예약번호 / 날짜 / 금액 / 국가
- ❌ 표시 안 함: 예약자 이름 / 이메일 / 전화
- → GDPR / 개인정보보호법 준수

**기술 구현**:
- 데이터 소스: TW Booking Analytics (이미 있음)
- DB JOIN: TW B2B hotels.agoda_hotel_id ↔ Booking Analytics booking.hotel_id
- API 신설: `/api/hotel-bookings.js`
- UI: marketing.html "예약 상세 보기" 섹션

**관련 문서**: BUSINESS.md §7-D 신설

**우선순위**: BACKLOG P0 — sales/marketing.html 신설과 동시 구현 필수

**누가**: 이지형 대표님 결정적 비즈니스 통찰

---

### 결정 1-L: 채널 명단 정정 — 5개 운영 채널 (스리랑카어 채널 없음) ⭐ 2026-04-29 추가
**무엇을**: ~~6개 언어 채널~~ → **5개 언어 채널** 로 정정. 스리랑카어 채널 현재 운영 안 함.

**왜** (대표님 발언):
> "스리랑카는 아니다. 없다. 지금은. 영어, 일본어, 대만어, 영어, 한국어, 베트남어 이렇게다. 다시 기억해. 현재로써."

**정확한 채널 명단** (메모리 저장된 Agoda CID 매핑 기준):

| 언어 | 채널명 | 구 CID | 신 CID |
|---|---|---|---|
| 한국어 | 호텔이야 한국 | 1922821 | 1932026 |
| 일본어 | 호텔이야 일본 | 1923665 | 1932024 |
| 영어 | Koreahotelguide (한영) | 1926314 | 1932023 |
| 베트남어 | Korea Hotel 베트남어 | 1922822 | 1932022 |
| 대만어 (중국어 번체) | 世界就是家·대만 World-hotel | 1930375 | 1932021 |

**추가 (육성 중)**:
- 호텔이곳 한국 (CID 1946819, 키우는 중, 예약 없음)

**변경 영향**:
- BUSINESS.md: "6언어 채널" → "5언어 채널" 일괄 변경
- DECISIONS.md: 채널 매핑 정정
- BACKLOG.md: 채널 매핑 작업 항목 정정
- sales.html / marketing.html: 5개 채널 시각화로 변경
- channel_cid_map 테이블: 5개 채널 + 1개 육성 채널 등록

**향후 추가 가능성**:
- 스리랑카어 채널 향후 운영 시 6개 채널로 확장 고려
- 현재는 스리랑카어 미운영 상태로 시스템 구축

**관련 문서**: 메모리 18 [Agoda CID 채널 매핑] 참조

**누가**: 이지형 대표님 정정

---

### 결정 1-K: 채널별 예약 유입 추적 ⭐⭐ 2026-04-29 추가
**무엇을**: 예약 발생 시 **어느 채널 (한국어/영어/일본어/대만어/베트남어) 에서 유입됐는지** 자동 추적 + 표시

**왜** (대표님 발언):
> "어느 채널에서 유입되는지도 필요할듯. 채널이 여러 개이고 운영하는 나라별 대상이 다르니깐. 그게 있으면 좋을 것 같애."

**비즈니스 가치 3가지**:
1. **매니저 신뢰 강화**: "한국어 채널 5건, 영어 채널 3건" 구체적 증명 → 5언어 채널의 진짜 가치
2. **영업 무기**: "베트남 호텔에는 베트남어 채널이 효과적" 데이터 기반 영업
3. **채널 운영 ROI**: 어느 채널 영상 제작에 더 투자할지 데이터 기반 결정

**기술 구현**:
- **채널 매핑 테이블 신설** `channel_cid_map` (메모리 18 기준 정확한 CID)
  - 호텔이야 한국 (한국어) ↔ 1922821 (구) / 1932026 (신)
  - 호텔이야 일본 (일본어) ↔ 1923665 (구) / 1932024 (신)
  - Koreahotelguide (영어) ↔ 1926314 (구) / 1932023 (신)
  - Korea Hotel 베트남어 (베트남어) ↔ 1922822 (구) / 1932022 (신)
  - 世界就是家 (대만/중국어 번체) ↔ 1930375 (구) / 1932021 (신)
  - 호텔이곳 한국 (육성 중) ↔ 1946819

- **bookings 테이블 컬럼 추가**:
  - `cid` (Agoda Affiliate CID)
  - `channel_id` (자동 변환된 채널 ID)
  - `source_video_id` (어떤 영상에서 유입됐는지, 옵션)

- **TW Booking Analytics 데이터에서**:
  - cid 정보가 있다면: 자동 추출 → channel 변환
  - cid 정보가 없다면: 별도 매핑 작업 필요

**우선 확인 필요**:
TW Booking Analytics 엑셀에 cid 정보 포함되는지 대표님 확인 필요. 없으면 별도 작업 추가.

**표시 방식**:
- 예약 카드: "📺 유입: 한국어 채널 (호텔이야)"
- 채널별 분석: "한국어 5건, 영어 3건, 일본어 0건..." 시각화
- 매출 분석: 채널별 추정 매출 합계

**기타 채널 처리**:
- 우리 채널 외 유입 (직접 검색 등) → "기타" 로 표시
- 우리 영상 아닌 일반 Agoda 검색 유입 → 표시 안 함 (우리 매출 아님)

**관련 문서**: BUSINESS.md §7-D 보강

**우선순위**: BACKLOG P0 — Agoda 예약 검증 시스템과 함께 구현

**누가**: 이지형 대표님 핵심 비즈니스 통찰

---

### 결정 1-A: 매니저 최종 검수 단계 명확화 ⭐ 2026-04-29 추가
**무엇을**: 가입 → 호텔 매칭 → **매니저 최종 검수 페이지** → 가입 완료 → sales.html

**왜** (대표님 발언):
> "본인이 입력한 거와 자동 매칭해준 내용 최종 맞는지 수정 및 확인하는 페이지를 보여줘야 되지 않을까? 그러고 최종 확인을 누르면 가입되고, 결제를 안했으니깐 장점 페이지... sales.html"

- 자동 매칭은 100% 정확하지 않음 (Google ↔ Agoda 데이터 불일치 가능)
- 매니저가 직접 확인 → 우리도 안전, 매니저도 안심
- **결제 전이므로 marketing/리포트 페이지가 아닌 sales(장점) 페이지로 이동**

**구현**:
- hotel-info.html을 **검색 모드 + 확인 모드 2단계** 로 운영
- 또는 hotel-info-confirm.html 별도 페이지 신설

**핵심 구분**:
- sales.html (결제 전) = 우리 서비스 장점 어필 + 결제 유도
- marketing.html (결제 후) = 성과 리포트 (조회수, 예약 건수, PDF 보고서)
- **두 페이지는 완전히 다른 목적, 절대 합치지 않음**

**관련**: BUSINESS_FLOW.md Stage 1D 신설

**누가**: 이지형 대표님 핵심 통찰

---

### 결정 1-B: 관리자 비즈니스 문서 뷰어 ⭐ 2026-04-29 추가
**무엇을**: admin.html에 **Business Docs 메뉴** 추가, BUSINESS.md / DECISIONS.md / BUSINESS_FLOW.md / BACKLOG.md를 관리자 페이지에서 직접 볼 수 있게

**왜** (대표님 발언):
> "BUSINESS.md 너가 이런식으로 정리해 놓은 것도 내가 관리자에서 내용을 볼 수 있으면 좋겠어. 왜냐하면 개발자가 아니니깐. 어디에 내용이 있는지 나도 모르잖아. 변경 작업해야 되는거 기록해 놓을 거, 방향들을 보고 같이 다시 이야기하고 맞혀 나갈 수 있잖아."

**핵심 통찰**:
- 대표님은 GitHub 안 들어감 → 문서 위치 모름
- 시각적으로 보면서 변경 결정 → Claude와 채팅으로 즉시 수정
- 대표님 = 비개발자 통제권 확보

**구현**:
- admin-business.html 신설
- GitHub raw URL에서 Markdown 직접 fetch → 자동 렌더링
- 좌측 네비 + 검색 + 인쇄 + 새로고침
- admin.html Tools 섹션에 "📚 Business Docs" 메뉴 추가

**문서 페어 (시각적 통제 도구 2개)**:
- 📸 admin-gallery.html — 페이지 시각 확인
- 📚 admin-business.html — 비즈니스 정책 시각 확인

**누가**: 이지형 대표님 핵심 요청

---

### 결정 2: 월간 리포트 (주간 → 월간)
**무엇을**: ~~매주 월요일 자동 리포트 메일~~ → **매월 결제일 기준 자동 리포트**

**왜**:
- 매니저는 매일 들어오지 않음 → 매주 메일은 부담
- 매월 1회가 적정 (결제 가치 인식 강화)
- 매월 결제일 기준 = "내가 돈 낸 지 한 달이 됐구나" 인식

**관련 정책**: BUSINESS.md §9 자동화 정책

**누가**: 이지형 대표님 결정

---

### 결정 3: 재계약 할인 정책 폐기
**무엇을**: ~~재계약 시 20% 할인~~ → **할인 없음, 동일 가격 $200**

**왜**:
- 가격 할인은 하향 평준화 → 강력한 자산(5언어 채널, 6개월 보장) 가치 훼손
- 누적 성과로 설득하는 게 건강한 비즈니스 모델
- 할인 운영하면 호텔이 가격 협상하려 함 → 고객 응대 비용 증가

**메일 문구 변경**:
- ❌ "재계약 시 20% 할인 받으세요"
- ✅ "지난 6개월 X명 노출 / Y건 예약. 계속 노출 원하시면 재계약 가능합니다."

**누가**: 이지형 대표님 결정

---

### 결정 4: Agoda 링크 수집 시점
**무엇을**: ~~signup.html 가입 시 Agoda 링크 입력~~ → **hotel-info.html에서 처리** (현재 시스템 유지)

**왜**:
- 가입 마찰 최소화 → 영업 DB 확보 우선
- 이미 hotel-info.html에 3단계 안전망 매칭 시스템 구축 완료 (2026-04-26)
- 가입 시점에 링크 요구하면 Agoda 등록 안 된 호텔은 가입 자체가 안 됨

**관련 시스템**: 이미 구현된 3단계 안전망 (자동 매칭 → URL 백업 → 관리자 수동)

**누가**: 이지형 대표님 + Claude (이전 채팅 결정 재확인)

**참고**: 한 차례 Claude가 이 시스템을 망각했으나 대표님이 짚어주셔서 재확인 완료

---

### 결정 5: 결제 시간 표시 정책
**무엇을**: 결제 내역에 **날짜 + 시간 표시 (KST)**

**왜**:
- B2B 회계 감사 / 부가세 신고 시 시각 정보 필수
- PayPal 거래 ID와 매칭 시 시각 일치 확인
- 6개월 환불 보장 만료 시점 정확 계산

**표시 형식**:
- marketing.html: `2026-04-29 14:30 (KST)`
- 인보이스 PDF: `2026-04-29 14:30:42 (KST, UTC+9)`

**누가**: Claude 제안 → 대표님 승인

---

### 결정 6: 매니저 페이지 우선순위 (3초 룰)
**무엇을**: marketing.html 정보 우선순위 = **조회수/예약 → 채널별 성과 → D-Day → 호텔 정보**

**왜**:
- 매니저는 매일 안 들어옴 → 들어올 때 3초 안에 가치 확신해야 함
- "내 돈이 일하고 있다" 를 시각적으로 증명 필요
- 호텔 정보 / 결제 내역은 한 번 보면 끝

**디자인 영향**: marketing.html 헤드라인 가장 크게, 결제 내역 가장 작게

**누가**: Claude 분석 + 대표님 승인

---

### 결정 7: PDF 보고서 = 매니저 핵심 기능
**무엇을**: marketing.html에 **"한 클릭 PDF 보고서 다운로드"** 기능 필수 포함

**왜**:
- **매니저는 결정권자가 아닌 보고하는 사람** ⭐ 핵심 통찰
- 사장에게 PDF 한 장으로 보고 가능 → 매니저 입지 강화
- 매니저가 사장에게 보고 → 사장이 "다른 호텔도 추천해줘" → 자연 영업

**우선순위**: BACKLOG Phase B (Phase A 골격 완성 후)

**누가**: 대표님 통찰 ("위 상사에게 보고도 해야 되니깐. 맞지?")

---

### 결정 8: 비즈니스 헌장 문서 체계 도입
**무엇을**: 5대 표준 문서 체계 도입
- BUSINESS.md (이 문서) — 사업 방향
- DECISIONS.md — 의사결정 이력
- BUSINESS_FLOW.md — 사용자 여정
- BACKLOG.md — 작업 백로그
- admin-gallery.html — 페이지 시각 갤러리

**왜**:
- "비즈니스 방향이 정리되어 있어야 개발이 디테일해진다" (대표님 통찰)
- 새 채팅에서 컨텍스트 손실 방지
- 새 직원/매니저 온보딩 자료
- Claude가 망각해도 문서 보면 즉시 복원 가능

**누가**: 이지형 대표님 결정

---

## 🗓️ 2026-04-26~28 — Phase 3 Step 4 (Agoda 매칭)

### 결정 9: 매칭 실패 시 100% 활성화 원칙
**무엇을**: 매니저가 가입한 호텔은 **어떤 경우에도 활성화시킨다**

**왜** (대표님 발언 그대로):
> "만약 이게 매칭이 안되면, 우리가 영업을 못하는거야. 그러면 안되잖아."

**구현**: 3단계 안전망 (자동 매칭 → URL 백업 → 관리자 수동 매칭)

**작업**: 8단계 분할 작업 완료 (DB 컬럼, API, UI, Admin 큐)

**누가**: 이지형 대표님 핵심 비즈니스 원칙

---

### 결정 10: Agoda 등급 정책
**무엇을**: **3성급 이상만 등록 가능**

**왜**: 영상 품질 유지 + 채널 신뢰성

**구현**: hotel-info.html에서 자동 등급 검증

**누가**: 이지형 대표님

---

## 🗓️ 2026-04 (이전) — 콘텐츠 정책

### 결정 11: APA 호텔 전면 제외
**무엇을**: APA 호텔 체인은 추천 / 등록 / 콘텐츠에서 **완전 제외**

**왜**: 대표님 비즈니스 정책 (역사 부정 발언 등 윤리 이슈)

**누가**: 이지형 대표님

---

### 결정 12: 콘텐츠 표현 가이드라인
**금지 표현**:
- "가상체험" / "상상 유도"
- "주관확정" 표현 (납득돼요 등)
- "컴팩트하지만"
- "이번 편 탑원으로 추천드려요"
- "2인" → "두명"
- "직결" → "바로 연결"

**누가**: 이지형 대표님 (콘텐츠 작성 기준 v3)

---

## 🗓️ 2026-03 ~ 2026-04 (Phase 1~2) — 인프라 결정

### 결정 13: 글로벌 영업 / USD 결제
**무엇을**: 한국 전용 기능 도입 X, USD 단일 통화

**왜**: 글로벌 영업 (한국, 일본, 대만, 베트남, 동남아 호텔 대상)

**구현**: PayPal USD 결제, 영어 우선 UI, 한국어 토글

**누가**: 이지형 대표님 비즈니스 전략

---

### 결정 14: 인프라 스택
**무엇을**: GitHub + Supabase + Vercel + Resend + PayPal

**왜**:
- Supabase: PostgreSQL + Auth + RLS 통합 (관리 부담 최소)
- Vercel: 자동 배포 + Edge Functions
- Resend: 이메일 발송 (Custom SMTP 가능)
- PayPal: 글로벌 결제 표준

**누가**: 대표님 결정 + Claude 추천

---

## 📌 향후 결정 필요 항목 (Pending)

다음 결정은 **이번 채팅 또는 다음 채팅에서** 확정 필요:

### Q1: 영상 조회수 데이터 소스
- A. YouTube API 자동 연동 (정확, 1~2주 개발)
- B. 대표님 수동 입력 (간단, 즉시 가능)
- C. 나중에 자동화, 지금은 "--" 표시

### Q2: 예약 건수 트래킹 방식
- A. Agoda 트래킹 픽셀 (자동, 복잡)
- B. 매니저 직접 보고 (간단)
- C. 나중에 결정

### Q3: 환불 신청 처리 방식
- A. 자동 처리 (PayPal API 환불)
- B. 매니저 신청 → 관리자 검토 → 수동 환불 (추천)
- C. 검토 없이 자동 환불

### Q4: 6개월 보장 시작 기준
- A. 결제일 기준
- B. 영상 첫 노출일 기준 ⭐ (대표님 의도일 가능성)
- C. 별도 기준

### Q5: 호텔 영상 링크 입력 책임자
- A. 관리자(대표님)가 admin.html에서 입력
- B. 매니저가 marketing.html에서 입력
- C. 채널별 영상 자동 매칭 시스템

### Q6: PDF 보고서 발송 시점
- A. 매니저 다운로드 시 즉석 생성
- B. 월간 리포트 메일 첨부
- C. 둘 다

---

## 📅 결정 이력 통계

- 총 결정 항목: **14개**
- 변경된 결정: **3개** (월간 리포트 / 재계약 할인 / Agoda 링크 시점)
- 핵심 원칙 (변경 불가): **2개** (100% 활성화 / APA 제외)
- 향후 결정 대기: **6개**

---

## 💡 결정 기록 가이드

새 결정이 생기면 다음 형식으로 추가:

```markdown
### 결정 N: [한 줄 제목]
**무엇을**: 구체적인 결정 내용

**왜**: 결정의 근거 (가능한 대표님 발언 그대로 인용)

**관련**: 영향받는 페이지 / 기능 / 정책

**누가**: 이지형 대표님 / Claude / 둘 다

**구현 위치**: BACKLOG.md 관련 항목 링크
```

---

### 결정 D-022: BL-ADMIN-AUTH-PERF 라이브 검증 통과 + 사전 결함 1건 분리 ⭐⭐ 2026-05-09

**무엇을**: D-021에서 결정한 Edge Middleware 단일 게이트 정석을 라이브 배포 + Chrome 자동 계측으로 검증 완료. 회귀 0. 사전 결함 1건(BL-ADMIN-AUTH-PERF 무관) 발견 → BL-GALLERY-PAGES-META-FIX(P1)로 분리.

**라이브 검증 결과** (Chrome 자동 계측, 2026-05-09):

| 페이지 | 동작 | Supabase RPC 호출 | 비고 |
|---|---|---|---|
| admin-status.html | ✅ 정상 표시 | 0건 | 폴링 5초 사이클 정상, 인증 RPC 0 |
| admin-business.html | ✅ 정상 표시 | 0건 | BUSINESS.md 자동 로드 OK |
| admin.html | ✅ 정상 표시 | 0건 | role='owner' 표시 OK, /api/admin?action=list-users만 존재 (정상) |
| admin-permissions.html | (미검증, 동일 패턴) | - | 회귀 위험 0 |
| admin-gallery.html | ⚠️ 사전 결함 | 0건 | scripts/pages-meta.mjs 4일 전부터 GitHub에 누락 — BL 무관 |

**결정의 근거**:
1. Network 탭에서 `supabase` / `vjsludfjsphwnumuoqaj` 패턴 매칭 0건 = middleware가 edge에서 100% 처리 확인.
2. admin.html의 user.email 표시 + role='owner' 뱃지 표시 = `getSession` (user 정보) + `admins.select(role)` 정상 작동.
3. middleware의 자동 redirect 검증: anon curl로 `/admin-gallery.html` 접근 시 302 → `/login.html?reason=no_session&next=...` (정상).

**admin-gallery 사전 결함 분석**:
- 직전 commit `0ea3356` (2026-05-05) 이후 `/scripts/pages-meta.mjs` import는 박혀있는데 파일 자체는 GitHub repo에 없음 → 라이브 404 → JS 모듈 진입 실패 → "Loading 1/3 권한 확인 중"에서 영구 멈춤.
- BL-ADMIN-AUTH-PERF 작업과 무관. 본 BL 시작 전 4일간 이미 깨진 상태.
- BL-GALLERY-PAGES-META-FIX(P1)으로 분리 (대표님 결정 2026-05-09).

**부수 발견** (별도 BL 권장):
- 브라우저 폴링 시 `/_admin/_health.json`도 middleware의 `/_admin/:path*` matcher에 잡혀 anon이면 login.html로 redirect됨. 로그인 상태에선 정상이라 사용자 영향 0이지만, matcher 보강이 더 정석 (재발·롤백 안전 측면).

**연관**:
- D-021 (정석 결정)
- BL-ADMIN-AUTH-PERF (status: done, 2026-05-09)
- BL-GALLERY-PAGES-META-FIX (P1, 신설)
- BL-SHARED-AUTH-CLEANUP (P3, dead code 별도 정리)

**상태**: BL-ADMIN-AUTH-PERF done. step 6~9 모두 done.

**누가**: 이지형 대표님 (정석 방향 + 라이브 검증 방식 결정) / Claude (코드 수정 + 라이브 자동 계측 + 자가 진단).

---


### 결정 D-023: BL-ACTIVITY-FEED-CLEANUP — 봇 commit 클릭 시 사람용 탭 빈 메시지 정석 fix ⭐⭐ 2026-05-09

> ⚠️ **부분 무효화 (2026-05-10, BL-HUMAN-TAB-ALWAYS-SHOW)**: 본 결정의 "봇 commit 디폴트 탭 = code" 부분은 뒤집혔다. 사유: 사람용·AI용 탭에 봇 활동의 정체(🎯 무엇 + 📍 왜 + 봇 정의 카드)를 풍부하게 박았으므로, 봇이라고 코드 탭으로 자동 전환할 이유가 사라짐. 디폴트 탭은 모든 활동에 대해 `human`. 사람용 탭 빈 메시지 fix(`loadHumanTab()`)의 봇 분기 자체는 유효 (봇 안내 메시지가 풍부하게 박힘). 또한 본 D-023 번호가 **BL-CLAUDE-DISCIPLINE의 D-023과 충돌** — DECISIONS_INDEX 번호 정리는 별개 후속 작업.

**무엇을**: 활동 이력 펼침 패널에서 봇 commit(scan-bot/sync-bot/auto-detect-bot/health-bot/activity-bot) 클릭 시 사람용 탭이 디폴트로 열리고 "작업 번호 901d313이 인덱스에 등록되지 않았거나 매핑에 실패" 빈 메시지가 노출되는 문제. 데이터·필터·인계서·AI용 탭·코드 변경 탭 모두 정상이고 유일한 결함은 `loadHumanTab()` + `toggleActivityExpand()`에 봇 분기 누락.

**진단 (전수 점검 결과)**:

| 영역 | 파일·라인 | 상태 |
|---|---|---|
| 데이터 분류 (CEO/Staff/Bot) | `_os/scripts/build-activity-feed.mjs:53~88` | ✅ 정상. 봇 패턴 매칭 정확. |
| 데이터 결과 | `activity-feed.display.json` byRole | ✅ 정상. CEO 85건 / Staff 0 / Bot 288건 분리. |
| 인계서 생성 (사람/봇 분리) | `admin-status.html:4297~4344` | ✅ 정상. CEO/Staff와 Bot 명확히 분리. |
| 활동 행 시각 구분 (cls) | `admin-status.html:2506` | ✅ 정상. role별 'ceo' / 'staff' / 'bot' 클래스 적용. |
| 필터 ([전체]/CEO/Staff/Bot) | `admin-status.html:2498~2500` | ✅ 정상. 의도된 동작 ([전체]에 봇 노출은 정상). |
| AI용 탭 봇 분기 | `admin-status.html:4794~4826` (BL-AI-TAB-BOT-DETECT) | ✅ 정상. detectBotCommit + 안내 메시지 박힘. |
| 코드 변경 탭 | `admin-status.html:4892~` | ✅ 정상. commit이면 GitHub diff 노출. |
| **사람용 탭 봇 분기** | `admin-status.html:4488~4553` `loadHumanTab()` | ❌ **결함**. 봇 사전 분기 없음 → chat-log 매핑 시도 → 항상 실패 → 빈 메시지. |
| **디폴트 탭** | `admin-status.html:4482~4485` `toggleActivityExpand()` | ❌ **결함**. 봇 commit이어도 무조건 사람용 탭 즉시 로드. |

**왜 정석인가** (선택지 비교):

| 선택지 | 결과 | 평가 |
|---|---|---|
| A. [전체] 필터에서 봇 자동 제외 | 데이터는 그대로지만 노출 안 됨 | ❌ 활동 이력의 본 목적("끊겨도 추적 가능")에 어긋남. 봇 활동도 시간순 흐름의 일부. |
| B. 사람용 탭에 봇 분기 추가 + 디폴트 탭을 commit 종류에 따라 자동 선택 | 봇 클릭 시 코드 변경 탭이 디폴트, 사람용 탭은 "봇 활동이라 사람 컨텍스트 없음" 분기 메시지 | ✅ **채택**. AI용 탭이 이미 쓰는 정확히 같은 정석 패턴 (BL-AI-TAB-BOT-DETECT). 단일 진실원, 재발 안전. |
| C. [전체] 디폴트에 봇 흐리게 표시 | 사람용 탭 빈 메시지 문제는 그대로 | ❌ 증상 위장, 근본 원인 미해결. |

**정석 fix 설계** (3 단계):

1. **`loadHumanTab()` 사전 분기**: `detectBotCommit(item)` 호출 → 봇이면 chat-log 매핑 건너뛰고 "이 활동은 봇 자동 갱신이라 사람 작업 기록(chat-log)이 없습니다. 코드 변경 탭에서 commit diff를 확인하세요." 메시지 + 해당 봇 설명(BOT_INFO). AI용 탭의 4811~4823라인과 동일한 카드 디자인.

2. **`toggleActivityExpand()` 디폴트 탭 자동 선택**: 봇 commit이면 디폴트 탭을 'code'(코드 변경)로 전환. 봇 활동 본질 = "무엇이 바뀌었는가"가 핵심이지 "왜 결정했는가"가 아님. CEO/Staff commit은 기존대로 'human' 디폴트.

3. **라이브 배포 + 검증**: scan-bot commit 클릭 시 코드 변경 탭이 디폴트로 열림 + 사람용 탭 클릭 시 분기 메시지 노출 + AI용 탭 기존 동작 유지.

**연관**:
- 진단 chat-log: `_chat-logs/2026-05/BL-ACTIVITY-FEED-CLEANUP.md` (이 채팅에서 박음, 다음 채팅 인계용)
- AI용 탭 정석 패턴: `BL-AI-TAB-BOT-DETECT` (이미 라이브, 같은 패턴 재사용)
- 작업 등록: `tasks.json` BL-ACTIVITY-FEED-CLEANUP (P1, status=pending)

**상태**: 진단 완료. 실행은 다음 채팅에서 (BL-GALLERY-PAGES-META-FIX 직후 응답 끊김 방지 차원).

**누가**: 이지형 대표님 (정석 우선 방향 + "전체 정리가 정석" 결정) / Claude (5개 영역 코드 진단 + 설계).

---



## 🤖 자동 동기화 — 대표님 결정 필요/승인 작업

> ⚠️ **이 섹션은 자동 생성됩니다.** `tasks.json` → `sync_engine.py` 가 갱신.
> 직접 편집 금지 — 위쪽 수동 결정 로그만 편집하세요.
> 마지막 갱신: **2026-05-09** (총 23개 작업)

**상태 요약**: absorbed: 1, blocked: 7, done: 8, pending: 7

---

### ✅ P0 — admin-status.html 중복 3중 정리 — ③·⑥·⑦ 제거 + 작업 지휘소로 통합

- **ID**: `BL-DEDUP-CONSOLIDATE`
- **상태**: `done`
- **카테고리**: infra
- **생성**: 2026-05-08
- **결정 필요 항목**:
  - 대표님 OK 박힘 (2026-05-08 채팅)
- **메모**: 연결고리 지도(_os/playbook/dependency-map-bl-dedup-consolidate.md)를 손대기 전 100% 따른다. 113군데 연결 위험. 각 단계 = 1 commit + 라이브 검증 + 다음 단계 진입. 백업: _admin/_backup_20260508_pre-dedup_admin-status.html. BL-URGENT-CARD-FLOW는 step3에서 흡수 후 폐기.
- **최근 변경**: 2026-05-09 — `mail_sent — Resend id: 630a1850-767b-4e30-aeba-9e8bec3aafcb` by ops-mail-bot

---

### ⏳ P1 — OS 설치 시 PAT/시크릿 자동 박기 흐름 — install_os.sh 보강

- **ID**: `BL-OS-INSTALL-PAT-FLOW`
- **상태**: `pending`
- **카테고리**: infra
- **생성**: 2026-05-08
- **결정 필요 항목**:
  - Q: PAT 박는 방식 — 환경변수 vs .env.local vs GitHub Secrets API
- **메모**: BL-DEDUP-CONSOLIDATE와 별건. install_os.sh에 PAT 처리 로직이 박혀있지 않음 (현재 224줄, grep 확인). 설치 후 새 프로젝트에서 GitHub push·workflow 트리거 시 거부됨. Q 답변 후 진행.
- **최근 변경**: 2026-05-08 — `BL 신설 (대표님 진단 — OS 설치 PAT 거부 문제)` by Claude

---

### ⏳ P0 — chat-log 사업가 5블록 표준 강제 (사람용 탭 가독성 fix)

- **ID**: `BL-CHATLOG-BIZ-FORMAT`
- **상태**: `pending`
- **카테고리**: infra
- **생성**: 2026-05-08
- **막힘 사유**: Q2 결정 대기 — 부칙 합치기 vs 분리
- **결정 필요 항목**:
  - Q2: 부칙 15에 합칠지 vs 부칙 16 신설할지 (제안: 부칙 15에 합치기)
- **메모**: 사람용 탭이 chat-log를 보여줄 때 사업가 용어가 아닌 개발자 용어 가득. 원인: 표준(_os/playbook/chat-log-format.md)은 박혀있는데 작성 시 미준수. fix: (1) 부칙에 5블록 표준 준수 명문 (2) auto-detect-bot이 chat-log 박힐 때 5블록 헤딩 + 사업가 용어 검증 (3) 검증 실패 시 워닝, 자가 치유 (4) 기존 chat-log 재작성 (BL-ACT-INDEX-RE
- **최근 변경**: 2026-05-08 — `BL 신설 (대표님 이미지 1 지적)` by Claude

---

### ❔ P0 — 임박 작업 카드 클릭 흐름 재설계 (인계서/결정 모달 통합)

- **ID**: `BL-URGENT-CARD-FLOW`
- **상태**: `absorbed`
- **카테고리**: infra
- **생성**: 2026-05-08
- **막힘 사유**: Q1 결정 대기 — 실행 방식 A/B 선택
- **결정 필요 항목**:
  - Q1: 결정 입력 → 실행 방식 (A안 즉시 실행 vs B안 클립보드 중계)
- **메모**: 현재: 임박 작업 카드 클릭 → location.href '/admin-tasks.html?id=...' (편집 모달로 점프, 흐름 깨짐). 직전 채팅 미적용 4종: (1) 결정 모달에 사업적 맥락/옵션/트레이드오프 표시 (2) 내용 보면서 입력란 동시 사용 가능 펼친 상태 (3) 결정 입력 → 실행 흐름 (A: tasks.json 자동 갱신 + 자율 큐 이동 / B: 클립보드 중계) (4) 모든 카드 클릭 일관된 흐름. 임박
- **최근 변경**: 2026-05-08 — `status 유지 (absorbed)` by auto-detect-bot

---

### ✅ P0 — BL 작업 done 처리 시 chat-log 박기 자동 강제 게이트 (헌법 부칙 보강 필요)

- **ID**: `BL-CHATLOG-AUTO-GATE`
- **상태**: `done`
- **카테고리**: infra
- **생성**: 2026-05-08
- **결정 필요 항목**:
  - 헌법 부칙 7 또는 신설 부칙으로 chat-log 의무화 명문 박을지 결정
- **메모**: BL-ACT-INDEX-RESTORE 진행 중 chat-log를 박지 않아서 4개 commit 모두 byCommit 매핑 실패 → 활동이력 펼침에서 "기록 못 찾음". 영구 차단: (1) 헌법에 "BL done 처리 시 _chat-logs/{date}-{slug}.md 박기 의무" 명문, (2) auto-detect-bot에 검증 게이트 — done 트랜지션 감지 시 해당 BL ID가 byTask에 매핑됐는지 확인, 없으면 ⚠
- **최근 변경**: 2026-05-08 — `done 작업에 commit 추가 (status 유지 — 자동 리오픈 안 함)` by auto-detect-bot

---

### ⏳ P0 — [admin Supabase Auth] 정식 오픈 전 의무 — admin-* 전체 인증 + 권한 등급 (CEO/Staff)

- **ID**: `BL-ADMIN-AUTH`
- **상태**: `pending`
- **카테고리**: infrastructure
- **생성**: 2026-05-04
- **결정 필요 항목**:
  - 권한 등급 정책 결정 필요
- **메모**: 헌법 11조 운영 진입 의무. 단순 토큰 + Referer는 임시 수단.

---

### ✅ P0 — Admin Hotels 상세 패널 매니저 정보 누락 + 모달 닫기 불가

- **ID**: `BL-DONE-001`
- **상태**: `done`
- **카테고리**: bug
- **생성**: 2026-05-02
- **결정 필요 항목**:
  - **sales.html 신설** ⭐ "전세계 1등" 디자인 (Stripe/Notion/Linear 수준)
- **메모**: ## ✅ [DONE 2026-04-29] P0 — Admin Hotels 상세 패널 매니저 정보 누락 + 모달 닫기 불가 > 해결 완료. 상세는 CHANGELOG.md 참조. 본 섹션은 다음 정리 시 DONE 섹션으로 이동.  **배경**: Phase B PayPal 결제 검증 직후 발견. 어드민이 Hotels 탭 → View 클릭 시 호텔 상세 패널이 열리는데, 매니저 정보 3개 필드가 모두 빈 값(`-`)으로 표시됨.  *
- **최근 변경**: 2026-05-02 — `done` by claude-builder

---

### 🔴 P0 — Agoda 예약 검증 시스템 (Booking Verification)

- **ID**: `BL-003`
- **상태**: `blocked`
- **카테고리**: dev
- **생성**: 2026-05-02
- **막힘 사유**: 대표님 결정 대기
- **메모**: ## 🔴 P0 — Agoda 예약 검증 시스템 (Booking Verification) ⭐⭐ 2026-04-29  **배경** (대표님 핵심 비즈니스 통찰): > "아고다의 본인 확인 할 수 있는 것을 제공해줘야 돼. TW Booking Analytics에서 호텔별로 예약번호, 예약날짜, 시간 등 대조할 수 있는 것."  **핵심 가치**: - 우리가 "예약 N건 발생" 이라고 말로만 하면 매니저는 못 믿음 - 매니저가 본인 
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### 🔴 P1 — 호텔 담당자 교체 시스템 (Manager Handover)

- **ID**: `BL-005`
- **상태**: `blocked`
- **카테고리**: dev
- **생성**: 2026-05-02
- **막힘 사유**: 대표님 결정 대기
- **메모**: ## 🔴 P1 — 호텔 담당자 교체 시스템 (Manager Handover) ⭐ 2026-04-29  **배경** (대표님 통찰): > "호텔 담당자가 바뀔 수 있으니깐. 기존에 누구의 이름으로 결제를 했는지 표시 정리해 놓을. 이분들이 시스템을 계속 이용하면 스토리도 알 수 있잖아."  매니저는 떠나도 호텔은 남는다. 결제 이력은 호텔에 영구 귀속.  **작업 항목**: 1. **`hotel_managers` 테이블 신설**
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### ⏳ P2 — 호텔 스토리 / LTV 추적

- **ID**: `BL-006`
- **상태**: `pending`
- **카테고리**: dev
- **생성**: 2026-05-02
- **메모**: ## 🟡 P2 — 호텔 스토리 / LTV 추적 ⭐ 2026-04-29  **배경**: 장기 고객 = 영업 자산. "Lotte는 3번 결제한 충성 고객" 같은 분석 가능.  **작업 항목**: 1. **DB 뷰**: `hotel_lifetime_stats` (자동 집계) 2. **admin.html 호텔 상세 페이지 강화** — 거래 요약 / 담당자 이력 / 영상 이력 / 영업 인사이트(사실 기반) 3. **marketing.h
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### 🔴 P1 — 자동 알림 메일 시스템 누락

- **ID**: `BL-007`
- **상태**: `blocked`
- **카테고리**: bug
- **생성**: 2026-05-02
- **막힘 사유**: 대표님 결정 대기
- **메모**: ## 🔴 P1 — 자동 알림 메일 시스템 누락  **배경**: 호텔 상태 변경 시 매니저에게 자동 알림 메일이 발송되어야 하는데, `admin.html`의 `changeStatus()` 에서 DB만 업데이트하고 메일 발송 로직 없음.  **현재 동작 중인 메일** (정상): - ✅ 회원가입 인증 메일 - ✅ ops 알림 메일 (`/api/email/ops/notify-claude-work`) - ✅ 결제 완료 시 ops 메일 
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### 🔴 P2 — Phase 3 D단계 — PayPal 검증 후 진행

- **ID**: `BL-012`
- **상태**: `blocked`
- **카테고리**: dev
- **생성**: 2026-05-02
- **막힘 사유**: 대표님 결정 대기
- **메모**: ## ⏳ Phase 3 D단계 — PayPal 검증 후 진행  ### D-1. 회원 탈퇴 기능 - 매니저가 자기 계정 삭제 가능 - 호텔 데이터 처리 (cascade vs soft delete 결정) - Confirm 모달 필수  ### D-2. 이메일 변경 기능 - 매니저 settings에서 이메일 변경 - 새 이메일 인증 필수 - 변경 이력 로그  ### D-3. Custom SMTP (Resend 도메인 인증) - Res
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### 🔴 P2 — Live 전환 작업 (Sandbox 검증 완료 후)

- **ID**: `BL-013`
- **상태**: `blocked`
- **카테고리**: dev
- **생성**: 2026-05-02
- **막힘 사유**: 대표님 결정 대기
- **메모**: ## 🚀 Live 전환 작업 (Sandbox 검증 완료 후)  - `PAYPAL_ENV` 환경변수: `sandbox` → `live` - PayPal Live Webhook 별도 등록 - `PAYPAL_WEBHOOK_ID` 환경변수 갱신 - 실제 결제 1건 테스트 ($1 소액) - 환불 프로세스 검증  ---
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### 🔴 P2 — 보안 — 토큰 폐기

- **ID**: `BL-014`
- **상태**: `blocked`
- **카테고리**: infrastructure
- **생성**: 2026-05-02
- **막힘 사유**: 대표님 결정 대기
- **메모**: ## 🔒 보안 — 토큰 폐기  이전 채팅에서 평문 노출된 토큰 폐기 필요: 1. **GitHub PAT** (`ghp_eLTTsY...`) — GitHub Settings → PAT → Revoke 2. **Supabase MGMT_TOKEN** (`sbp_b9475...`) — Supabase Account → Access Tokens → Revoke 3. **Supabase SERVICE_ROLE** (`sb_secret_
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### ⏳ P2 — BEFORE/AFTER 스크린샷 자동 캡처 시스템 (Page Gallery 통합)

- **ID**: `BL-015`
- **상태**: `pending`
- **카테고리**: dev
- **생성**: 2026-05-02
- **메모**: ## 🟡 P2 — BEFORE/AFTER 스크린샷 자동 캡처 시스템 (Page Gallery 통합)  ### 배경 대표님 메모리 원칙: 모든 페이지 수정 시 ① 수정 전 풀페이지 스크린샷 ② 수정 작업 ③ 수정 후 풀페이지 스크린샷 ④ 작업 기록에 BEFORE/AFTER 비교 등록 ⑤ 관리자 페이지에서 전후 비교 확인 가능. Page Gallery 스크린샷도 수정 시 자동 갱신.  ### 현재 상태 - `admin-galler
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### ✅ P0 — Vercel 12-Function 한도 영구 회피 (admin-* 통합)

- **ID**: `SQ-DONE-C`
- **상태**: `done`
- **카테고리**: dev
- **생성**: 2026-05-02
- **메모**: ### C. 🟢 ✅ **[DONE 8e6e7d80]** — Vercel 12-Function 한도 영구 회피 (admin-* 통합) **완료일**: 2026-04-29  **완료 내역**: - `api/admin.js` 신규 작성 (paypal.js와 동일한 `?action=` 라우터 패턴, ~700 lines) - 4개 admin-* 함수 통합: `booking-upload`, `list-users`, `send-invite
- **최근 변경**: 2026-05-02 — `done` by claude-builder

---

### 🔴 P1 — admin.html 디자인 개편

- **ID**: `SQ-F`
- **상태**: `blocked`
- **카테고리**: design
- **생성**: 2026-05-02
- **막힘 사유**: 대표님 결정 대기
- **메모**: ### F. 🔴 BLOCKED — admin.html 디자인 개편 **대표님 결정 필요 사항**: 1. 좌측 사이드바 구조 — 현재 OVERVIEW/SALES/OPERATIONS/TOOLS 4그룹 유지? 2. Dashboard 첫 화면 — KPI 카드 우선 vs 활동 피드 우선? 3. 컬러 팔레트 — 현재 보라(#534AB7) 기조 유지 vs 변경?  **예상 시간**: 결정 후 2시간  ---  ## 🟡 P1 — 5/3 이전
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### ⏳ P1 — 자동 알림 메일 시스템 (BACKLOG의 P1)

- **ID**: `SQ-G`
- **상태**: `pending`
- **카테고리**: dev
- **생성**: 2026-05-02
- **메모**: ### G. 🟢 AUTO — 자동 알림 메일 시스템 (BACKLOG의 P1) **작업 내용**: BACKLOG.md L280 참조. 6개 트리거 메일 구현 - 호텔 등록 / 승인 / 거절 / 결제 완료 / 영상 제작 시작 / 영상 게시 - 기존 `sendSystemEmail` 함수 활용 - 영어 본체 + 한국어 토글 (i18n 일괄 작업 시점까지 영어만)  **예상 시간**: 2시간 **자율 진행 사유**: 메일 템플릿은 BU
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### ⏳ P1 — Supabase Management API 토큰 갱신 알림 자동화

- **ID**: `SQ-H`
- **상태**: `pending`
- **카테고리**: infrastructure
- **생성**: 2026-05-02
- **메모**: ### H. 🟢 AUTO — Supabase Management API 토큰 갱신 알림 자동화 **작업 내용**: 토큰 만료 7일 전 ops 메일 자동 발송 (현재 토큰 만료 5/26) - Vercel Cron 또는 Supabase Edge Function 사용 - 현재는 메모리에만 알림 메모, 자동화 안 됨  **예상 시간**: 1시간 **자율 진행 사유**: 인프라 자동화  ---  ## 🟢 P2 — 자투리 시간에
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### ✅ P1 — v2 Aurora 마이그레이션 — 인증 페이지 4종 일괄 적용 (signup/forgot/reset/verify)

- **ID**: `CHG-15`
- **상태**: `done`
- **카테고리**: ux
- **생성**: 2026-05-01
- **최근 변경**: 2026-05-01 — `done` by claude

---

### ✅ P1 — api/admin.js 통합 라우터 — Vercel 12-function 한도 회피 (Function 카운트 12 → 9)

- **ID**: `CHG-6`
- **상태**: `done`
- **카테고리**: dev
- **생성**: 2026-04-29
- **최근 변경**: 2026-04-29 — `done` by claude

---

### ✅ P1 — Page Gallery 매니저/어드민 자동 캡처 (Issue #4 부분 해결)

- **ID**: `CHG-5`
- **상태**: `done`
- **카테고리**: dev
- **생성**: 2026-04-29
- **최근 변경**: 2026-04-29 — `done` by claude

---

### ✅ P1 — Business Docs 사이드바 강화 + Page Gallery iframe 한계 안내

- **ID**: `CHG-4`
- **상태**: `done`
- **카테고리**: ux
- **생성**: 2026-04-29
- **최근 변경**: 2026-04-29 — `done` by claude

---

<!-- SYNC_ENGINE:DECISIONS_AUTO_END -->

---

<!-- SYNC_ENGINE:DECISIONS_AUTO_START -->

## 🤖 자동 동기화 — 대표님 결정 필요/승인 작업

> ⚠️ **이 섹션은 자동 생성됩니다.** `tasks.json` → `sync_engine.py` 가 갱신.
> 직접 편집 금지 — 위쪽 수동 결정 로그만 편집하세요.
> 마지막 갱신: **2026-05-12** (총 27개 작업)

**상태 요약**: absorbed: 1, blocked: 6, cancelled: 1, done: 11, obsoleted: 1, pending: 7

---

### ❔ P1 — Supabase SQL 자동 적용 인프라 — sql/ 폴더 변경 시 GitHub Actions가 Management API로 자동 RUN

- **ID**: `BL-SUPABASE-SQL-AUTO-APPLY`
- **상태**: `cancelled`
- **카테고리**: infra
- **생성**: 2026-05-12
- **막힘 사유**: GitHub Secrets에 SUPABASE_MGMT_TOKEN 등록 필요 (대표님 1번)
- **메모**: 발생 맥락: BL-ADMIN-ACTIVITY-MOVE 작업 중 발견.  기술 흐름 (정석): 1) .github/workflows/supabase-sql-apply.yml — push 시 sql/*.sql 감지 2) Supabase Management API POST /v1/projects/{ref}/database/query (curl) 3) 응답 검증 + 실패 시 ops 메일 + tasks.json 자동 업데이트 4) 멱등
- **최근 변경**: 2026-05-12 — `?` by claude

---

### ✅ P1 — ADMIN 사용자 활동 박스 admin-status → admin.html 이전 (부칙 5 카테고리 분리)

- **ID**: `BL-ADMIN-ACTIVITY-MOVE`
- **상태**: `done`
- **카테고리**: infra
- **생성**: 2026-05-12
- **메모**: 이전 작업 (2026-05-12): - admin-status.html: CSS 블록(라인 875~917) + HTML 박스(2763~2779) + JS 함수(4728~4800) + 호출 2곳 모두 제거 - admin.html: Dashboard 탭에 박스 박음 (다크 글래스 톤 — var(--glass), var(--ink), --line) - 폴링 주기: 5초 → 30초 (admin.html은 운영 화면이라 부담 작게) -
- **최근 변경**: 2026-05-12 — `mail_sent — Resend id: 4e86654b-047b-4027-83cd-10459ca7a65d (bundle 4)` by ops-mail-bot

---

### ⏳ P0 — [서비스 페이지 전체 지도] 페이지 골격 + 진행률 표시 — 모든 작업의 부모

- **ID**: `BL-SERVICE-MAP`
- **상태**: `pending`
- **카테고리**: infrastructure
- **생성**: 2026-05-11
- **막힘 사유**: 디자인 큰 방향 결정 대기
- **결정 필요 항목**:
  - 디자인 큰 방향 검수 (대표님 그림)
- **메모**: 대표님 통찰 (2026-05-10) — 서비스 페이지 전체 지도 + 진행률 표시.  핵심 본질: "어느 페이지에 무엇을 박을지" 모르면 자율 작업 못 박음. 페이지 = 모든 작업의 부모.  ## 📋 Phase 1~3 페이지 우선순위 (Claude 자율 판단 — 사업 매출 흐름 기준)  ### Phase 1 — 매출 직결 흐름 (사업 시작 가능 상태 만들기) | 순서 | 페이지 | 현재 | 근거 | |---|---|---|---

---

### ❔ P1 — [서비스 페이지 지도] 방문자→고객 여정 단일 시각 자료 (gohotelwinners.com 전체)

- **ID**: `BL-SERVICE-PAGE-MAP`
- **상태**: `obsoleted`
- **카테고리**: business
- **생성**: 2026-05-11
- **막힘 사유**: 디자인 큰 방향 결정 대기
- **결정 필요 항목**:
  - 디자인 큰 방향 검수 (대표님 그림)
- **메모**: ⚠️ 잘못 박힘 (2026-05-11 ID mismatch 사고) — 대표님 결정 이름으로 대체. 새 BL: BL-SERVICE-MAP.  대표님 통찰 (2026-05-10): admin-status는 시스템 지도, 사업가는 서비스 페이지 흐름 지도가 별도로 필요. 랜딩 → 상품 → 결제 → 대시보드 흐름을 한 장에. 부칙 16에 따라 디자인 방향만 대표님 검수.

---

### ✅ P0 — admin-status.html 중복 3중 정리 — ③·⑥·⑦ 제거 + 작업 지휘소로 통합

- **ID**: `BL-DEDUP-CONSOLIDATE`
- **상태**: `done`
- **카테고리**: infra
- **생성**: 2026-05-08
- **결정 필요 항목**:
  - 대표님 OK 박힘 (2026-05-08 채팅)
- **메모**: 연결고리 지도(_os/playbook/dependency-map-bl-dedup-consolidate.md)를 손대기 전 100% 따른다. 113군데 연결 위험. 각 단계 = 1 commit + 라이브 검증 + 다음 단계 진입. 백업: _admin/_backup_20260508_pre-dedup_admin-status.html. BL-URGENT-CARD-FLOW는 step3에서 흡수 후 폐기.
- **최근 변경**: 2026-05-09 — `mail_sent — Resend id: 630a1850-767b-4e30-aeba-9e8bec3aafcb` by ops-mail-bot

---

### ⏳ P1 — OS 설치 시 PAT/시크릿 자동 박기 흐름 — install_os.sh 보강

- **ID**: `BL-OS-INSTALL-PAT-FLOW`
- **상태**: `pending`
- **카테고리**: infra
- **생성**: 2026-05-08
- **결정 필요 항목**:
  - Q: PAT 박는 방식 — 환경변수 vs .env.local vs GitHub Secrets API
- **메모**: BL-DEDUP-CONSOLIDATE와 별건. install_os.sh에 PAT 처리 로직이 박혀있지 않음 (현재 224줄, grep 확인). 설치 후 새 프로젝트에서 GitHub push·workflow 트리거 시 거부됨. Q 답변 후 진행.
- **최근 변경**: 2026-05-08 — `BL 신설 (대표님 진단 — OS 설치 PAT 거부 문제)` by Claude

---

### ⏳ P0 — chat-log 사업가 5블록 표준 강제 (사람용 탭 가독성 fix)

- **ID**: `BL-CHATLOG-BIZ-FORMAT`
- **상태**: `pending`
- **카테고리**: infra
- **생성**: 2026-05-08
- **막힘 사유**: Q2 결정 대기 — 부칙 합치기 vs 분리
- **결정 필요 항목**:
  - Q2: 부칙 15에 합칠지 vs 부칙 16 신설할지 (제안: 부칙 15에 합치기)
- **메모**: 사람용 탭이 chat-log를 보여줄 때 사업가 용어가 아닌 개발자 용어 가득. 원인: 표준(_os/playbook/chat-log-format.md)은 박혀있는데 작성 시 미준수. fix: (1) 부칙에 5블록 표준 준수 명문 (2) auto-detect-bot이 chat-log 박힐 때 5블록 헤딩 + 사업가 용어 검증 (3) 검증 실패 시 워닝, 자가 치유 (4) 기존 chat-log 재작성 (BL-ACT-INDEX-RE
- **최근 변경**: 2026-05-08 — `BL 신설 (대표님 이미지 1 지적)` by Claude

---

### ❔ P0 — 임박 작업 카드 클릭 흐름 재설계 (인계서/결정 모달 통합)

- **ID**: `BL-URGENT-CARD-FLOW`
- **상태**: `absorbed`
- **카테고리**: infra
- **생성**: 2026-05-08
- **막힘 사유**: Q1 결정 대기 — 실행 방식 A/B 선택
- **결정 필요 항목**:
  - Q1: 결정 입력 → 실행 방식 (A안 즉시 실행 vs B안 클립보드 중계)
- **메모**: 현재: 임박 작업 카드 클릭 → location.href '/admin-tasks.html?id=...' (편집 모달로 점프, 흐름 깨짐). 직전 채팅 미적용 4종: (1) 결정 모달에 사업적 맥락/옵션/트레이드오프 표시 (2) 내용 보면서 입력란 동시 사용 가능 펼친 상태 (3) 결정 입력 → 실행 흐름 (A: tasks.json 자동 갱신 + 자율 큐 이동 / B: 클립보드 중계) (4) 모든 카드 클릭 일관된 흐름. 임박
- **최근 변경**: 2026-05-08 — `status 유지 (absorbed)` by auto-detect-bot

---

### ✅ P0 — BL 작업 done 처리 시 chat-log 박기 자동 강제 게이트 (헌법 부칙 보강 필요)

- **ID**: `BL-CHATLOG-AUTO-GATE`
- **상태**: `done`
- **카테고리**: infra
- **생성**: 2026-05-08
- **결정 필요 항목**:
  - 헌법 부칙 7 또는 신설 부칙으로 chat-log 의무화 명문 박을지 결정
- **메모**: BL-ACT-INDEX-RESTORE 진행 중 chat-log를 박지 않아서 4개 commit 모두 byCommit 매핑 실패 → 활동이력 펼침에서 "기록 못 찾음". 영구 차단: (1) 헌법에 "BL done 처리 시 _chat-logs/{date}-{slug}.md 박기 의무" 명문, (2) auto-detect-bot에 검증 게이트 — done 트랜지션 감지 시 해당 BL ID가 byTask에 매핑됐는지 확인, 없으면 ⚠
- **최근 변경**: 2026-05-12 — `mail_sent — Resend id: 3216ffa5-e5bf-47ec-9f7c-483e0417a339 (bundle 135)` by ops-mail-bot

---

### ✅ P0 — [admin Supabase Auth] 정식 오픈 전 의무 — admin-* 전체 인증 + 권한 등급 (CEO/Staff)

- **ID**: `BL-ADMIN-AUTH`
- **상태**: `done`
- **카테고리**: infrastructure
- **생성**: 2026-05-04
- **결정 필요 항목**:
  - 권한 등급 정책 결정 필요
- **메모**: 진단 (2026-05-12): D-016/BL-ADMIN-AUTH-V2로 admins 테이블 + 5단계 role + 초대 시스템 이미 박힘. D-026 결정 요구사항 3가지 중 1개만 박혀있고 2개는 누락:   ① 접속 로그 → ❌ access_logs 테이블 없음 (이번 작업)   ② 실행 로그 → ❌ action_logs 테이블 없음 (이번 작업)   ③ admin-status 하단 최근 활동 박스 → ❌ 없음 (이번 작업
- **최근 변경**: 2026-05-12 — `mail_sent — Resend id: a2bd5e71-f2fd-463f-aa5c-bc5879764acc (bundle 2)` by ops-mail-bot

---

### ✅ P0 — Admin Hotels 상세 패널 매니저 정보 누락 + 모달 닫기 불가

- **ID**: `BL-DONE-001`
- **상태**: `done`
- **카테고리**: bug
- **생성**: 2026-05-02
- **결정 필요 항목**:
  - **sales.html 신설** ⭐ "전세계 1등" 디자인 (Stripe/Notion/Linear 수준)
- **메모**: ## ✅ [DONE 2026-04-29] P0 — Admin Hotels 상세 패널 매니저 정보 누락 + 모달 닫기 불가 > 해결 완료. 상세는 CHANGELOG.md 참조. 본 섹션은 다음 정리 시 DONE 섹션으로 이동.  **배경**: Phase B PayPal 결제 검증 직후 발견. 어드민이 Hotels 탭 → View 클릭 시 호텔 상세 패널이 열리는데, 매니저 정보 3개 필드가 모두 빈 값(`-`)으로 표시됨.  *
- **최근 변경**: 2026-05-12 — `mail_sent — Resend id: 3216ffa5-e5bf-47ec-9f7c-483e0417a339 (bundle 135)` by ops-mail-bot

---

### ✅ P0 — Agoda 예약 검증 시스템 (Booking Verification)

- **ID**: `BL-003`
- **상태**: `done`
- **카테고리**: dev
- **생성**: 2026-05-02
- **메모**: ## 🔴 P0 — Agoda 예약 검증 시스템 (Booking Verification) ⭐⭐ 2026-04-29  **배경** (대표님 핵심 비즈니스 통찰): > "아고다의 본인 확인 할 수 있는 것을 제공해줘야 돼. TW Booking Analytics에서 호텔별로 예약번호, 예약날짜, 시간 등 대조할 수 있는 것."  **핵심 가치**: - 우리가 "예약 N건 발생" 이라고 말로만 하면 매니저는 못 믿음 - 매니저가 본인 
- **최근 변경**: 2026-05-12 — `mail_sent — Resend id: 3216ffa5-e5bf-47ec-9f7c-483e0417a339 (bundle 135)` by ops-mail-bot

---

### 🔴 P1 — 호텔 담당자 교체 시스템 (Manager Handover)

- **ID**: `BL-005`
- **상태**: `blocked`
- **카테고리**: dev
- **생성**: 2026-05-02
- **막힘 사유**: 대표님 결정 대기
- **메모**: ## 🔴 P1 — 호텔 담당자 교체 시스템 (Manager Handover) ⭐ 2026-04-29  **배경** (대표님 통찰): > "호텔 담당자가 바뀔 수 있으니깐. 기존에 누구의 이름으로 결제를 했는지 표시 정리해 놓을. 이분들이 시스템을 계속 이용하면 스토리도 알 수 있잖아."  매니저는 떠나도 호텔은 남는다. 결제 이력은 호텔에 영구 귀속.  **작업 항목**: 1. **`hotel_managers` 테이블 신설**
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### ⏳ P2 — 호텔 스토리 / LTV 추적

- **ID**: `BL-006`
- **상태**: `pending`
- **카테고리**: dev
- **생성**: 2026-05-02
- **메모**: ## 🟡 P2 — 호텔 스토리 / LTV 추적 ⭐ 2026-04-29  **배경**: 장기 고객 = 영업 자산. "Lotte는 3번 결제한 충성 고객" 같은 분석 가능.  **작업 항목**: 1. **DB 뷰**: `hotel_lifetime_stats` (자동 집계) 2. **admin.html 호텔 상세 페이지 강화** — 거래 요약 / 담당자 이력 / 영상 이력 / 영업 인사이트(사실 기반) 3. **marketing.h
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### 🔴 P1 — 자동 알림 메일 시스템 누락

- **ID**: `BL-007`
- **상태**: `blocked`
- **카테고리**: bug
- **생성**: 2026-05-02
- **막힘 사유**: 대표님 결정 대기
- **메모**: ## 🔴 P1 — 자동 알림 메일 시스템 누락  **배경**: 호텔 상태 변경 시 매니저에게 자동 알림 메일이 발송되어야 하는데, `admin.html`의 `changeStatus()` 에서 DB만 업데이트하고 메일 발송 로직 없음.  **현재 동작 중인 메일** (정상): - ✅ 회원가입 인증 메일 - ✅ ops 알림 메일 (`/api/email/ops/notify-claude-work`) - ✅ 결제 완료 시 ops 메일 
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### 🔴 P2 — Phase 3 D단계 — PayPal 검증 후 진행

- **ID**: `BL-012`
- **상태**: `blocked`
- **카테고리**: dev
- **생성**: 2026-05-02
- **막힘 사유**: 대표님 결정 대기
- **메모**: ## ⏳ Phase 3 D단계 — PayPal 검증 후 진행  ### D-1. 회원 탈퇴 기능 - 매니저가 자기 계정 삭제 가능 - 호텔 데이터 처리 (cascade vs soft delete 결정) - Confirm 모달 필수  ### D-2. 이메일 변경 기능 - 매니저 settings에서 이메일 변경 - 새 이메일 인증 필수 - 변경 이력 로그  ### D-3. Custom SMTP (Resend 도메인 인증) - Res
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### 🔴 P2 — Live 전환 작업 (Sandbox 검증 완료 후)

- **ID**: `BL-013`
- **상태**: `blocked`
- **카테고리**: dev
- **생성**: 2026-05-02
- **막힘 사유**: 대표님 결정 대기
- **메모**: ## 🚀 Live 전환 작업 (Sandbox 검증 완료 후)  - `PAYPAL_ENV` 환경변수: `sandbox` → `live` - PayPal Live Webhook 별도 등록 - `PAYPAL_WEBHOOK_ID` 환경변수 갱신 - 실제 결제 1건 테스트 ($1 소액) - 환불 프로세스 검증  ---
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### 🔴 P2 — 보안 — 토큰 폐기

- **ID**: `BL-014`
- **상태**: `blocked`
- **카테고리**: infrastructure
- **생성**: 2026-05-02
- **막힘 사유**: 대표님 결정 대기
- **메모**: ## 🔒 보안 — 토큰 폐기  이전 채팅에서 평문 노출된 토큰 폐기 필요: 1. **GitHub PAT** (`ghp_eLTTsY...`) — GitHub Settings → PAT → Revoke 2. **Supabase MGMT_TOKEN** (`sbp_b9475...`) — Supabase Account → Access Tokens → Revoke 3. **Supabase SERVICE_ROLE** (`sb_secret_
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### ⏳ P2 — BEFORE/AFTER 스크린샷 자동 캡처 시스템 (Page Gallery 통합)

- **ID**: `BL-015`
- **상태**: `pending`
- **카테고리**: dev
- **생성**: 2026-05-02
- **메모**: ## 🟡 P2 — BEFORE/AFTER 스크린샷 자동 캡처 시스템 (Page Gallery 통합)  ### 배경 대표님 메모리 원칙: 모든 페이지 수정 시 ① 수정 전 풀페이지 스크린샷 ② 수정 작업 ③ 수정 후 풀페이지 스크린샷 ④ 작업 기록에 BEFORE/AFTER 비교 등록 ⑤ 관리자 페이지에서 전후 비교 확인 가능. Page Gallery 스크린샷도 수정 시 자동 갱신.  ### 현재 상태 - `admin-galler
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### ✅ P0 — Vercel 12-Function 한도 영구 회피 (admin-* 통합)

- **ID**: `SQ-DONE-C`
- **상태**: `done`
- **카테고리**: dev
- **생성**: 2026-05-02
- **메모**: ### C. 🟢 ✅ **[DONE 8e6e7d80]** — Vercel 12-Function 한도 영구 회피 (admin-* 통합) **완료일**: 2026-04-29  **완료 내역**: - `api/admin.js` 신규 작성 (paypal.js와 동일한 `?action=` 라우터 패턴, ~700 lines) - 4개 admin-* 함수 통합: `booking-upload`, `list-users`, `send-invite
- **최근 변경**: 2026-05-12 — `mail_sent — Resend id: 3216ffa5-e5bf-47ec-9f7c-483e0417a339 (bundle 135)` by ops-mail-bot

---

### 🔴 P1 — admin.html 디자인 개편

- **ID**: `SQ-F`
- **상태**: `blocked`
- **카테고리**: design
- **생성**: 2026-05-02
- **막힘 사유**: 대표님 결정 대기
- **메모**: ### F. 🔴 BLOCKED — admin.html 디자인 개편 **대표님 결정 필요 사항**: 1. 좌측 사이드바 구조 — 현재 OVERVIEW/SALES/OPERATIONS/TOOLS 4그룹 유지? 2. Dashboard 첫 화면 — KPI 카드 우선 vs 활동 피드 우선? 3. 컬러 팔레트 — 현재 보라(#534AB7) 기조 유지 vs 변경?  **예상 시간**: 결정 후 2시간  ---  ## 🟡 P1 — 5/3 이전
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### ⏳ P1 — 자동 알림 메일 시스템 (BACKLOG의 P1)

- **ID**: `SQ-G`
- **상태**: `pending`
- **카테고리**: dev
- **생성**: 2026-05-02
- **메모**: ### G. 🟢 AUTO — 자동 알림 메일 시스템 (BACKLOG의 P1) **작업 내용**: BACKLOG.md L280 참조. 6개 트리거 메일 구현 - 호텔 등록 / 승인 / 거절 / 결제 완료 / 영상 제작 시작 / 영상 게시 - 기존 `sendSystemEmail` 함수 활용 - 영어 본체 + 한국어 토글 (i18n 일괄 작업 시점까지 영어만)  **예상 시간**: 2시간 **자율 진행 사유**: 메일 템플릿은 BU
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### ⏳ P1 — Supabase Management API 토큰 갱신 알림 자동화

- **ID**: `SQ-H`
- **상태**: `pending`
- **카테고리**: infrastructure
- **생성**: 2026-05-02
- **메모**: ### H. 🟢 AUTO — Supabase Management API 토큰 갱신 알림 자동화 **작업 내용**: 토큰 만료 7일 전 ops 메일 자동 발송 (현재 토큰 만료 5/26) - Vercel Cron 또는 Supabase Edge Function 사용 - 현재는 메모리에만 알림 메모, 자동화 안 됨  **예상 시간**: 1시간 **자율 진행 사유**: 인프라 자동화  ---  ## 🟢 P2 — 자투리 시간에
- **최근 변경**: 2026-05-02 — `imported` by claude-builder

---

### ✅ P1 — v2 Aurora 마이그레이션 — 인증 페이지 4종 일괄 적용 (signup/forgot/reset/verify)

- **ID**: `CHG-15`
- **상태**: `done`
- **카테고리**: ux
- **생성**: 2026-05-01
- **최근 변경**: 2026-05-12 — `mail_sent — Resend id: 3216ffa5-e5bf-47ec-9f7c-483e0417a339 (bundle 135)` by ops-mail-bot

---

### ✅ P1 — api/admin.js 통합 라우터 — Vercel 12-function 한도 회피 (Function 카운트 12 → 9)

- **ID**: `CHG-6`
- **상태**: `done`
- **카테고리**: dev
- **생성**: 2026-04-29
- **최근 변경**: 2026-05-12 — `mail_sent — Resend id: 3216ffa5-e5bf-47ec-9f7c-483e0417a339 (bundle 135)` by ops-mail-bot

---

### ✅ P1 — Page Gallery 매니저/어드민 자동 캡처 (Issue #4 부분 해결)

- **ID**: `CHG-5`
- **상태**: `done`
- **카테고리**: dev
- **생성**: 2026-04-29
- **최근 변경**: 2026-05-12 — `mail_sent — Resend id: 3216ffa5-e5bf-47ec-9f7c-483e0417a339 (bundle 135)` by ops-mail-bot

---

### ✅ P1 — Business Docs 사이드바 강화 + Page Gallery iframe 한계 안내

- **ID**: `CHG-4`
- **상태**: `done`
- **카테고리**: ux
- **생성**: 2026-04-29
- **최근 변경**: 2026-05-12 — `mail_sent — Resend id: 3216ffa5-e5bf-47ec-9f7c-483e0417a339 (bundle 135)` by ops-mail-bot

---

<!-- SYNC_ENGINE:DECISIONS_AUTO_END -->
