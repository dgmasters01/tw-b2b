# TW B2B — 작업 백로그 (이슈 트래킹)

> ⚠️ **이 파일은 자동 생성됩니다.** 수동 편집하지 마세요.
> 변경은 `admin-tasks.html` 화면에서 → tasks.json 갱신 → 이 파일 자동 재생성
> 
> 단일 진실 소스: `tasks.json` (v2.0)

**마지막 업데이트**: 2026-05-11

> 💡 **새 채팅 시작 시**: 다음 5개 문서를 먼저 보면 즉시 컨텍스트 파악 가능.
> 
> | 문서 | 용도 |
> |---|---|
> | **BUSINESS.md** ⭐ | 사업 방향 / 정책 / 가격 / 환불 정책 |
> | **DECISIONS.md** | 의사결정 변경 이력 |
> | **BUSINESS_FLOW.md** | 사용자 여정 (가입 → 결제 → 6개월) |
> | **tasks.json** ⭐ | 모든 작업 + 우선순위 + history (이 파일 자동 생성 소스) |
> | **admin-tasks.html** | 작업관리 화면 (편집 UI) |

---

## ⚡ P0 — BL-003 핑퐁 9라운드 결정 손실 복구 + 확정 흐름 에러 가시화

**요약**: 진단:
- BL-003 라이브 status=blocked, pingpong_rounds=9, pingpong_turn=ceo (확정 안 박힘)
- 최근 commit에 feat(BL-003): 결정 확정 D-NNN 없음 (핸들러 도달 X)
- _decisions/pingpong/BL-003.json에 9라운드 모두 남음 (결정 내용 살아있음)
- 마지막 라운

- **자율성**: 🟡 SEMI
- **예상 시간**: 미정시간
- **카테고리**: fix
- **상태**: in_progress
- **ID**: `BL-DECISION-CONFIRM-RESCUE` (출처: 대표님 직접 보고 (2026-05-11 15:30) — Agoda 예약 검증 핑퐁 다 하고 그림일치 결정확정 눌렀는데 아무 변화 없음)

---

## 🟢 P0 — 통합 To-Do Inbox (관리자 대시보드 재설계)

**요약**: ## 🔴 P0 — 통합 To-Do Inbox (관리자 대시보드 재설계) ⭐⭐⭐ 2026-04-29  **배경** (대표님 핵심 운영 철학): > "한 사람이 처리해야 될 업무는 한 곳에서 우선순위가 표시되어 체크하면 정리할 수 있게 해야 됨. 내가 복잡하게 관리하게 하면 안 됨. 나에게 유리하게 해야 됨."  대표님 1인 운영. 처리 작업이 여러 탭에 흩어

- **자율성**: 🟢 AUTO
- **예상 시간**: 미정시간
- **카테고리**: dev
- **상태**: blocked
- **막힘 사유**: supabase 호텔/예약 인프라 박힌 후 4종 사업 source 연결. 진행률 표시 + 활동이력 결함 4건은 BL-IPB-* / BL-ACT-* 로 분리.
- **ID**: `BL-002` (출처: BACKLOG.md)

---

## 🟢 P0 — Agoda Matching = 호텔 가입 수동 승인 페이지 (매니저 온보딩 게이트)

**요약**: 매니저 가입 시 자동 매칭(agoda_hotels DB + Google Places) 실패한 호텔이 admin Agoda Matching 페이지에 대기 큐로 쌓이고, 대표님이 Agoda URL/주소 보고 hotel_id 수동 매칭 → 승인 → 매니저에게 가입 확정 알림. 매니저 온보딩 게이트 — 안 만들면 매칭 실패 케이스가 가입 자체 불가.

- **자율성**: 🟢 AUTO
- **예상 시간**: 8시간
- **카테고리**: feature
- **상태**: pending
- **ID**: `BL-003-A` (출처: BL-003 핑퐁 9라운드 → D-025 결정 → 쪼개기)

---

## 🟡 P0 — [admin Supabase Auth] 정식 오픈 전 의무 — admin-* 전체 인증 + 권한 등급 (CEO/Staff)

**요약**: 헌법 11조 운영 진입 의무. 단순 토큰 + Referer는 임시 수단.

- **자율성**: 🟡 SEMI
- **예상 시간**: 8시간
- **카테고리**: infrastructure
- **상태**: pending
- **결정 필요**:
  - 권한 등급 정책 결정 필요
- **ID**: `BL-ADMIN-AUTH` (출처: 운영 중 발견 — admin 인증 시스템 초기 구축)

---

## 🟡 P0 — chat-log 사업가 5블록 표준 강제 (사람용 탭 가독성 fix)

**요약**: 사람용 탭이 chat-log를 보여줄 때 사업가 용어가 아닌 개발자 용어 가득. 원인: 표준(_os/playbook/chat-log-format.md)은 박혀있는데 작성 시 미준수. fix: (1) 부칙에 5블록 표준 준수 명문 (2) auto-detect-bot이 chat-log 박힐 때 5블록 헤딩 + 사업가 용어 검증 (3) 검증 실패 시 워닝, 자가

- **자율성**: 🟡 SEMI
- **예상 시간**: 1시간
- **카테고리**: infra
- **상태**: pending
- **막힘 사유**: Q2 결정 대기 — 부칙 합치기 vs 분리
- **결정 필요**:
  - Q2: 부칙 15에 합칠지 vs 부칙 16 신설할지 (제안: 부칙 15에 합치기)
- **ID**: `BL-CHATLOG-BIZ-FORMAT` (출처: BL-CHATLOG-AUTO-GATE 검증 중 발견 (대표님 이미지 1))

---

## 🟡 P0 — [서비스 페이지 전체 지도] 페이지 골격 + 진행률 표시 — 모든 작업의 부모

**요약**: 대표님 통찰 (2026-05-10) — 서비스 페이지 전체 지도 + 진행률 표시.

핵심 본질: "어느 페이지에 무엇을 박을지" 모르면 자율 작업 못 박음. 페이지 = 모든 작업의 부모.

## 📋 Phase 1~3 페이지 우선순위 (Claude 자율 판단 — 사업 매출 흐름 기준)

### Phase 1 — 매출 직결 흐름 (사업 시작 가능 상태 만들기)

- **자율성**: 🟡 SEMI
- **예상 시간**: 8시간
- **카테고리**: infrastructure
- **상태**: pending
- **막힘 사유**: 디자인 큰 방향 결정 대기
- **결정 필요**:
  - 디자인 큰 방향 검수 (대표님 그림)
- **ID**: `BL-SERVICE-MAP` (출처: ceo_insight_2026-05-10)

---

## 🟢 P1 — [YouTube 더보기 단축 URL 클릭 카운트] 호텔별 진성 관심 측정 시스템

**요약**: gohotel.win/h/{hotel_id} → Supabase 카운트 +1 → Agoda 어필리에이트 리디렉션. 호텔별/순위별 분리.

- **자율성**: 🟢 AUTO
- **예상 시간**: 6시간
- **카테고리**: analytics
- **상태**: pending
- **결정 필요**:
  - D-006
- **ID**: `BL-TRACK-001` (출처: BUSINESS.md 15-A 통찰 6)

---

## 🟢 P1 — [인보이스/영수증 PDF 자동 생성·다운로드] 영구 보관 (1년+)

**요약**: 결제 직후 자동 발송 + 매니저 대시보드 별도 탭에서 1클릭 다운로드. PDF 3종: 인보이스/영수증/6개월리포트.

- **자율성**: 🟢 AUTO
- **예상 시간**: 5시간
- **카테고리**: feature
- **상태**: pending
- **결정 필요**:
  - D-009
- **ID**: `BL-INVOICE-001` (출처: BUSINESS.md 15-A 통찰 7 + JOURNEY.md D단계)

---

## 🟢 P1 — Agoda 예약검증 페이지 — Affiliate 엑셀 업로드 → 호텔별 매출 자동 정리

**요약**: Agoda Affiliate 엑셀 업로드 → 호텔명·예약번호·체크인/아웃·금액·상태·tag 파싱 → 호텔별 그룹핑 → 매출 검증. analytics 페이지 구조 그대로 차용. 매출 본격 발생 시 필요 — BL-003-A 다음 우선순위.

- **자율성**: 🟢 AUTO
- **예상 시간**: 6시간
- **카테고리**: feature
- **상태**: pending
- **ID**: `BL-003-B` (출처: BL-003 핑퐁 9라운드 → D-025 결정 → 쪼개기)

---

## 🔴 P1 — 매니저 정보 변경 시스템 (3-Tier 차등)

**요약**: ## 🔴 P1 — 매니저 정보 변경 시스템 (3-Tier 차등) ⭐ 2026-04-29  **배경** (대표님 통찰): > "매니저 가입하면 내용이 잘못 되었을 경우, 변경해야 될 경우, 승인 필요할까?"  호텔 바꿔치기 / 영상 재제작 비용 방지 위해 비즈니스 영향도에 따라 차등 처리.  **3-Tier 정책** (BUSINESS.md §7-A 참조): 

- **자율성**: 🔴 BLOCKED
- **예상 시간**: 미정시간
- **카테고리**: dev
- **상태**: blocked
- **막힘 사유**: 대표님 결정 대기
- **ID**: `BL-004` (출처: BACKLOG.md)

---

## 🔴 P1 — 호텔 담당자 교체 시스템 (Manager Handover)

**요약**: ## 🔴 P1 — 호텔 담당자 교체 시스템 (Manager Handover) ⭐ 2026-04-29  **배경** (대표님 통찰): > "호텔 담당자가 바뀔 수 있으니깐. 기존에 누구의 이름으로 결제를 했는지 표시 정리해 놓을. 이분들이 시스템을 계속 이용하면 스토리도 알 수 있잖아."  매니저는 떠나도 호텔은 남는다. 결제 이력은 호텔에 영구 귀속.  *

- **자율성**: 🔴 BLOCKED
- **예상 시간**: 미정시간
- **카테고리**: dev
- **상태**: blocked
- **막힘 사유**: 대표님 결정 대기
- **ID**: `BL-005` (출처: BACKLOG.md)

---

## 🔴 P1 — 자동 알림 메일 시스템 누락

**요약**: ## 🔴 P1 — 자동 알림 메일 시스템 누락  **배경**: 호텔 상태 변경 시 매니저에게 자동 알림 메일이 발송되어야 하는데, `admin.html`의 `changeStatus()` 에서 DB만 업데이트하고 메일 발송 로직 없음.  **현재 동작 중인 메일** (정상): - ✅ 회원가입 인증 메일 - ✅ ops 알림 메일 (`/api/email/ops/

- **자율성**: 🔴 BLOCKED
- **예상 시간**: 미정시간
- **카테고리**: bug
- **상태**: blocked
- **막힘 사유**: 대표님 결정 대기
- **ID**: `BL-007` (출처: BACKLOG.md)

---

## 🔴 P1 — sales.html 디자인 전면 개편

**요약**: ### D. 🔴 BLOCKED — sales.html 디자인 전면 개편 **대표님 결정 필요 사항**: 1. 디자인 톤: "Stripe 풍 / Notion 풍 / Linear 풍 / Apple 풍" 중 어느 쪽? (BACKLOG에 'Stripe/Notion/Linear 수준'이라고 적혀있는데 셋 중 하나로 좁혀야 함) 2. 5개 채널 시각화 — 실제 채널 

- **자율성**: 🔴 BLOCKED
- **예상 시간**: 미정시간
- **카테고리**: design
- **상태**: blocked
- **막힘 사유**: 대표님 결정 대기
- **ID**: `SQ-D` (출처: SOLO_WORK_QUEUE.md)

---

## 🔴 P1 — marketing.html 대시보드 디자인 개편

**요약**: ### E. 🔴 BLOCKED — marketing.html 대시보드 디자인 개편 **대표님 결정 필요 사항**: 1. 4개 헤드라인 카드의 배경/색감 — sales.html과 동일 톤? 2. 6개월 D-Day 카운트의 시각적 강조 정도 — 큰 숫자? 진행 바? 둘 다? 3. PDF 보고서 다운로드 버튼 위치/강조도  **자율 진행 가능한 부분 (🟡 SEM

- **자율성**: 🔴 BLOCKED
- **예상 시간**: 미정시간
- **카테고리**: design
- **상태**: blocked
- **막힘 사유**: 대표님 결정 대기
- **ID**: `SQ-E` (출처: SOLO_WORK_QUEUE.md)

---

## 🔴 P1 — admin.html 디자인 개편

**요약**: ### F. 🔴 BLOCKED — admin.html 디자인 개편 **대표님 결정 필요 사항**: 1. 좌측 사이드바 구조 — 현재 OVERVIEW/SALES/OPERATIONS/TOOLS 4그룹 유지? 2. Dashboard 첫 화면 — KPI 카드 우선 vs 활동 피드 우선? 3. 컬러 팔레트 — 현재 보라(#534AB7) 기조 유지 vs 변경?  **

- **자율성**: 🔴 BLOCKED
- **예상 시간**: 미정시간
- **카테고리**: design
- **상태**: blocked
- **막힘 사유**: 대표님 결정 대기
- **ID**: `SQ-F` (출처: SOLO_WORK_QUEUE.md)

---

## 🟢 P1 — 자동 알림 메일 시스템 (BACKLOG의 P1)

**요약**: ### G. 🟢 AUTO — 자동 알림 메일 시스템 (BACKLOG의 P1) **작업 내용**: BACKLOG.md L280 참조. 6개 트리거 메일 구현 - 호텔 등록 / 승인 / 거절 / 결제 완료 / 영상 제작 시작 / 영상 게시 - 기존 `sendSystemEmail` 함수 활용 - 영어 본체 + 한국어 토글 (i18n 일괄 작업 시점까지 영어만) 

- **자율성**: 🟢 AUTO
- **예상 시간**: 미정시간
- **카테고리**: dev
- **상태**: pending
- **ID**: `SQ-G` (출처: SOLO_WORK_QUEUE.md)

---

## 🟢 P1 — Supabase Management API 토큰 갱신 알림 자동화

**요약**: ### H. 🟢 AUTO — Supabase Management API 토큰 갱신 알림 자동화 **작업 내용**: 토큰 만료 7일 전 ops 메일 자동 발송 (현재 토큰 만료 5/26) - Vercel Cron 또는 Supabase Edge Function 사용 - 현재는 메모리에만 알림 메모, 자동화 안 됨  **예상 시간**: 1시간 **자율 진행 사유

- **자율성**: 🟢 AUTO
- **예상 시간**: 미정시간
- **카테고리**: infrastructure
- **상태**: pending
- **ID**: `SQ-H` (출처: SOLO_WORK_QUEUE.md)

---

## 🟡 P1 — OS 설치 시 PAT/시크릿 자동 박기 흐름 — install_os.sh 보강

**요약**: BL-DEDUP-CONSOLIDATE와 별건. install_os.sh에 PAT 처리 로직이 박혀있지 않음 (현재 224줄, grep 확인). 설치 후 새 프로젝트에서 GitHub push·workflow 트리거 시 거부됨. Q 답변 후 진행.

- **자율성**: 🟡 SEMI
- **예상 시간**: 1.5시간
- **카테고리**: infra
- **상태**: pending
- **결정 필요**:
  - Q: PAT 박는 방식 — 환경변수 vs .env.local vs GitHub Secrets API
- **ID**: `BL-OS-INSTALL-PAT-FLOW` (출처: 대표님 진단 (2026-05-08) — OS 설치 시 PAT 거부됨, 설치 자체가 안 됨)

---

## 🟢 P1 — [건강검진 사람 말] 점검 결과를 사업가 언어로 풀어줌

**요약**: 대표님 통찰 (2026-05-10): 건강검진(health-check) 결과가 개발자 용어로 박혀있음. 사람 말로 풀어줘야 대표님이 즉시 판단 가능. BL-BASELINE-AUTO-TASK(자동 작업 등록)와 짝꿍 — 둘이 함께 박혀야 점검→이해→작업 흐름 완성.

범위: _admin/_health.json + admin-status 빨간 배너 + 점검 결

- **자율성**: 🟢 AUTO
- **예상 시간**: 4시간
- **카테고리**: ux
- **상태**: pending
- **ID**: `BL-BASELINE-HUMAN-LANG` (출처: ceo_insight_2026-05-10)

---

## 🟢 P1 — [결정 → 페이지 → 작업 흐름 시각화] 대표님 판단 도구

**요약**: 대표님 통찰 (2026-05-10): 어느 결정부터 해야 어느 페이지가 만들어지고, 그 위에 어느 자율 작업이 박히는지 한 화면에 보이게. BL-SERVICE-MAP(페이지 지도) done 후 그 위에 의존성 그래프 그림.

표시 요소: D-XXX (결정) → 페이지 (Phase 1~3) → BL-XXX (세부 작업) 3단 트리. 막힌 결정 클릭 시 결정 

- **자율성**: 🟢 AUTO
- **예상 시간**: 4시간
- **카테고리**: ux
- **상태**: pending
- **ID**: `BL-DEPENDENCY-GRAPH` (출처: ceo_insight_2026-05-10)

---

## 🟢 P1 — [일일 건강 카드] 위 4개(사람말 + 자동등록 + 지도 + 의존성)를 한 줄로 압축

**요약**: 대표님 통찰 (2026-05-10): 위 4개를 한눈에 보는 통합 카드. admin-status 최상단에 박힘. 'X점 / 페이지 N개 / 결정 M개 대기 / 자동등록 K건' 한 줄.

선행: 1~4 done. 단독으로는 의미 없음 — 위 4개가 박혀야 압축할 정보가 생김.

- **자율성**: 🟢 AUTO
- **예상 시간**: 2시간
- **카테고리**: ux
- **상태**: pending
- **막힘 사유**: BL-BASELINE-HUMAN-LANG + BL-BASELINE-AUTO-TASK + BL-SERVICE-MAP + BL-DEPENDENCY-GRAPH done 대기
- **ID**: `BL-DAILY-HEALTH-CARD` (출처: ceo_insight_2026-05-10)

---

## 🟢 P1 — [자동] 관리자 페이지 7개가 원본과 살짝 달라요 (대표님이 일부러 고친 건지 점검 필요)

**요약**: 점검 봇 자동 등록 (2026-05-11T03:56:28.755Z)

check_name: admin_baseline
status: yellow
detail: 관리자 페이지 7개가 원본과 살짝 달라요 (대표님이 일부러 고친 건지 점검 필요)

진단 hint: 룰북 _os/playbook/auto-task-registry.md 참조. 해소 시 점검 봇이 gr

- **자율성**: 🟢 AUTO
- **예상 시간**: 1시간
- **카테고리**: infrastructure
- **상태**: pending
- **ID**: `BL-AUTO-ADMIN-BASELINE-7FILES` (출처: auto_from_admin_baseline)

---

## 🟢 P2 — [DECISIONS_INDEX.md 자동 동기화] sync_engine 보강

**요약**: DECISIONS.md 변경 감지 → DECISIONS_INDEX.md 자동 갱신. ID 고정 불변 규칙.

- **자율성**: 🟢 AUTO
- **예상 시간**: 2시간
- **카테고리**: infrastructure
- **상태**: pending
- **ID**: `BL-DECISIONS-INDEX` (출처: 헌법 6조 보강 (이중 형식 의무))

---

## 🟡 P2 — 호텔 스토리 / LTV 추적

**요약**: ## 🟡 P2 — 호텔 스토리 / LTV 추적 ⭐ 2026-04-29  **배경**: 장기 고객 = 영업 자산. "Lotte는 3번 결제한 충성 고객" 같은 분석 가능.  **작업 항목**: 1. **DB 뷰**: `hotel_lifetime_stats` (자동 집계) 2. **admin.html 호텔 상세 페이지 강화** — 거래 요약 / 담당자 이력 /

- **자율성**: 🟡 SEMI
- **예상 시간**: 미정시간
- **카테고리**: dev
- **상태**: pending
- **ID**: `BL-006` (출처: BACKLOG.md)

---

## 🟡 P2 — 호텔 검색 UX 이슈

**요약**: ## 🟡 P2 — 호텔 검색 UX 이슈  ### Issue #1: 호텔 검색 결과 정렬 부정확 **현상**: `Lotte Hotel S` 입력 시 결과 순서: Seattle → New York → Chicago → New York → Seoul (5번째). 한국 사용자에게 Seoul이 가장 마지막에 표시.  **해결**: 가입 시 country 받아 loc

- **자율성**: 🟡 SEMI
- **예상 시간**: 미정시간
- **카테고리**: ux
- **상태**: pending
- **ID**: `BL-008` (출처: BACKLOG.md)

---

## 🟡 P2 — Admin Console UI 버그

**요약**: ## 🟡 P2 — Admin Console UI 버그  ### Issue #3: Hotels 목록의 MANAGER 컬럼 비어있음 ✅ [DONE 2026-04-29] **현상**: Admin Console > Hotels > Hotel Partners 목록에서 MANAGER 컬럼이 "-"로 표시됨. 매니저 정보(이지형 / leejifilm@hanmail.ne

- **자율성**: 🟡 SEMI
- **예상 시간**: 미정시간
- **카테고리**: bug
- **상태**: pending
- **ID**: `BL-009` (출처: BACKLOG.md)

---

## 🟡 P2 — Chrome 안전 브라우징 경고

**요약**: ## 🟡 P2 — Chrome 안전 브라우징 경고  **현상**: 대표님 Chrome 일반 모드에서 `gohotelwinners.com` 접속 시 "위험한 사이트" 경고. 시크릿 모드/Edge에서는 정상.  **진단**: Google Safe Browsing — 2020-04-08 멀웨어 페이지 보관 이력 (이전 도메인 소유자 흔적). 현재 데이터 없음. 

- **자율성**: 🟡 SEMI
- **예상 시간**: 미정시간
- **카테고리**: ux
- **상태**: pending
- **ID**: `BL-010` (출처: BACKLOG.md)

---

## 🔴 P2 — Phase 3 D단계 — PayPal 검증 후 진행

**요약**: ## ⏳ Phase 3 D단계 — PayPal 검증 후 진행  ### D-1. 회원 탈퇴 기능 - 매니저가 자기 계정 삭제 가능 - 호텔 데이터 처리 (cascade vs soft delete 결정) - Confirm 모달 필수  ### D-2. 이메일 변경 기능 - 매니저 settings에서 이메일 변경 - 새 이메일 인증 필수 - 변경 이력 로그  ##

- **자율성**: 🔴 BLOCKED
- **예상 시간**: 미정시간
- **카테고리**: dev
- **상태**: blocked
- **막힘 사유**: 대표님 결정 대기
- **ID**: `BL-012` (출처: BACKLOG.md)

---

## 🔴 P2 — Live 전환 작업 (Sandbox 검증 완료 후)

**요약**: ## 🚀 Live 전환 작업 (Sandbox 검증 완료 후)  - `PAYPAL_ENV` 환경변수: `sandbox` → `live` - PayPal Live Webhook 별도 등록 - `PAYPAL_WEBHOOK_ID` 환경변수 갱신 - 실제 결제 1건 테스트 ($1 소액) - 환불 프로세스 검증  ---

- **자율성**: 🔴 BLOCKED
- **예상 시간**: 미정시간
- **카테고리**: dev
- **상태**: blocked
- **막힘 사유**: 대표님 결정 대기
- **ID**: `BL-013` (출처: BACKLOG.md)

---

## 🔴 P2 — 보안 — 토큰 폐기

**요약**: ## 🔒 보안 — 토큰 폐기  이전 채팅에서 평문 노출된 토큰 폐기 필요: 1. **GitHub PAT** (`ghp_eLTTsY...`) — GitHub Settings → PAT → Revoke 2. **Supabase MGMT_TOKEN** (`sbp_b9475...`) — Supabase Account → Access Tokens → Revoke 3

- **자율성**: 🔴 BLOCKED
- **예상 시간**: 미정시간
- **카테고리**: infrastructure
- **상태**: blocked
- **막힘 사유**: 대표님 결정 대기
- **ID**: `BL-014` (출처: BACKLOG.md)

---

## 🟢 P2 — BEFORE/AFTER 스크린샷 자동 캡처 시스템 (Page Gallery 통합)

**요약**: ## 🟡 P2 — BEFORE/AFTER 스크린샷 자동 캡처 시스템 (Page Gallery 통합)  ### 배경 대표님 메모리 원칙: 모든 페이지 수정 시 ① 수정 전 풀페이지 스크린샷 ② 수정 작업 ③ 수정 후 풀페이지 스크린샷 ④ 작업 기록에 BEFORE/AFTER 비교 등록 ⑤ 관리자 페이지에서 전후 비교 확인 가능. Page Gallery 스크린샷

- **자율성**: 🟢 AUTO
- **예상 시간**: 4-6시간
- **카테고리**: dev
- **상태**: pending
- **ID**: `BL-015` (출처: BACKLOG.md)

---

## 🟢 P2 — README.md 업데이트

**요약**: ### J. 🟢 AUTO — README.md 업데이트 **작업 내용**: 현재 어떤 시스템들이 라이브에 있는지, 각 페이지 목적, 환경변수 목록 등을 한 페이지에 정리.  **예상 시간**: 30분 **가치**: 새 채팅에서 컨텍스트 파악 시간 단축  ---  ## 🚫 데드라인 후 (5/3 이후)  - 호텔 검색 UX 이슈 (BACKLOG P2 Issue

- **자율성**: 🟢 AUTO
- **예상 시간**: 미정시간
- **카테고리**: docs
- **상태**: pending
- **ID**: `SQ-J` (출처: SOLO_WORK_QUEUE.md)

---

## 🟢 P2 — [그림 일치 OS] In-Progress 박스 commit 자동 갱신 누락 fix

- **자율성**: 🟢 AUTO
- **예상 시간**: 0.25시간
- **카테고리**: fix
- **상태**: pending
- **결정 필요**:
  - BL-OS-AUTO-SYNC-CHARTER
- **ID**: `BL-SYNC-INPROGRESS-COMMITS` (출처: BL-OS-AUTO-SYNC-CHARTER 전수 점검 중 발견)

---

## 🟢 P2 — 활동이력 — 봇 commit 클릭 시 사람용 탭 노출 결함 fix

**요약**: 결함: 봇 commit (예: auto-detect-bot, charter-length-bot)은 사람용 narrative가 없는데, 활동이력 모달이 default로 사람용 탭을 띄움 → 사용자에게 빈 모달처럼 보임. 정석: 봇 출처 commit은 AI raw 탭을 default로 (또는 사람용 탭 자동 hide).

- **자율성**: 🟢 AUTO
- **예상 시간**: 0.5시간
- **카테고리**: bug
- **상태**: pending
- **ID**: `BL-ACTIVITY-MODAL-BOT-FIX` (출처: 대표님 발견 — 자동 봇이 박은 commit (auto-detect-bot 등) 클릭 시 모달이 사람용 설명 탭을 default로 보여주는데, 봇 commit은 사람용 설명이 없어 빈 화면 또는 깨진 표시.)

---

## 🟢 P2 — 작업 시작 시 progress.steps 미박힘 자동 감지·자동 채움 + step:done:N 범위 자동 검증

**요약**: 정석: 헌법 부칙 7(단계 단위 commit) + 시행령 5번(무인 검증) 통합. 봇이 자동 강제. 사람이 매번 박는 게 아님. BL-ADMIN-AUTH-PERF의 progress_warning(MISSING_PROGRESS_STEPS) 트리거가 이미 있으니 그걸 확장.

- **자율성**: 🟢 AUTO
- **예상 시간**: 1시간
- **카테고리**: infra
- **상태**: pending
- **ID**: `BL-PROGRESS-STEPS-AUTOFILL` (출처: 대표님 진단 — BL-ADMIN-AUTH-PERF 시작 시 progress_steps 미박힘 채로 진행됐고 직전 채팅 끝에서야 강제 채움. 부칙 7 (단계=commit) 완전 자동화 미흡.)

---

## 🟢 P3 — Chrome 확장 프로그램 간섭 (사용자 환경)

**요약**: ## 🟢 P3 — Chrome 확장 프로그램 간섭 (사용자 환경)  **현상**: `subtitle.js` 확장 프로그램(자막/번역)이 페이지 JS에 간섭. 콘솔 에러 `Extension context invalidated`.  **영향**: 사이트 동작에는 영향 없음. 디버깅 시 노이즈만 증가.  **해결**: 대표님 환경에서 확장 프로그램 비활성화. 코

- **자율성**: 🟢 AUTO
- **예상 시간**: 미정시간
- **카테고리**: dev
- **상태**: pending
- **ID**: `BL-011` (출처: BACKLOG.md)

---

## 🟢 P3 — [그림 일치 OS] 챗 로그 / AI 탭 자동 갱신 누락 fix — 탭 활성 시 폴링

- **자율성**: 🟢 AUTO
- **예상 시간**: 0.5시간
- **카테고리**: fix
- **상태**: pending
- **결정 필요**:
  - BL-OS-AUTO-SYNC-CHARTER
- **ID**: `BL-SYNC-CHAT-LOGS-TAB` (출처: BL-OS-AUTO-SYNC-CHARTER 전수 점검 중 발견)

---

## 🟡 P3 — OS 봇 스크립트 — repo root 동적 산출 (위치 의존성 제거)

- **자율성**: 🟡 SEMI
- **예상 시간**: 1시간
- **카테고리**: infra
- **상태**: pending
- **ID**: `BL-OS-REPO-ROOT-DYNAMIC` (출처: BL-OS-PHASE-2 단계 2 진행 중 발견 — scripts/ → _os/scripts/ 이동 시 7개 스크립트의 parent.parent / __dirname 패턴이 위치 의존적이라 모두 수정 필요)

---

## 🟡 P3 — 워크플로 dead branch listening 정리 — restructure-os-modularization 통합 후 잔여

- **자율성**: 🟡 SEMI
- **예상 시간**: 0.2시간
- **카테고리**: infra
- **상태**: pending
- **ID**: `BL-WORKFLOW-DEAD-BRANCH-CLEANUP` (출처: BL-OS-PHASE-5 단계 8~9 후속 정석 인프라 청소 중 발견 (2026-05-08))

---

## 🟢 P3 — shared.js dead 인증 함수 제거 — checkAdmin / _adminCache / isAdmin / clearAdminCache

**요약**: BL-ADMIN-AUTH-PERF (D-021, A-2 정석)에서 admin 페이지의 checkAdmin 호출 100% 제거 후, shared.js에 정의만 남은 dead code. 호출처 0개 확인됨 (2026-05-09). middleware.js가 단일 진실원이므로 정석은 제거이지만, 호출처 0으로 안전하므로 별도 BL로 분리 (대표님 결정 2026-

- **자율성**: 🟢 AUTO
- **예상 시간**: 0.5시간
- **카테고리**: infra
- **상태**: pending
- **ID**: `BL-SHARED-AUTH-CLEANUP` (출처: BL-ADMIN-AUTH-PERF (D-021) 완료 후 분리 — 호출처 0개 dead code. 이번 BL의 본질(admin 페이지 RPC 왕복 제거)에서 분리.)

---

## ✅ DONE (자동 정리됨)

- [BL-DONE-001] Admin Hotels 상세 패널 매니저 정보 누락 + 모달 닫기 불가 (2026-05-02)
- [BL-003] Agoda 예약 검증 시스템 (Booking Verification) (2026-05-11)

