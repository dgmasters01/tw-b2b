# TW B2B — 작업 백로그 (이슈 트래킹)

> ⚠️ **이 파일은 자동 생성됩니다.** 수동 편집하지 마세요.
> 변경은 `admin-tasks.html` 화면에서 → tasks.json 갱신 → 이 파일 자동 재생성
> 
> 단일 진실 소스: `tasks.json` (v2.0)

**마지막 업데이트**: 2026-05-03

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

## 🟢 P0 — [카테고리 리매핑] 헌법 부칙 5 D-010 매핑 표를 코드에 반영 (6단계)

**요약**: 6단계 sub-task: ①admin-business에서 BACKLOG 제거 + JOURNEY/DECISIONS_INDEX 추가, ②admin-tasks에 ECHO_LOG/SOLO_WORK_QUEUE 추가, ③admin-hub 통계 제거 4카드 단순화, ④/js/stats.js 단일 모듈 신설, ⑤헌법 부칙 5 매핑 표 자가 검증 스크립트, ⑥commit 

- **자율성**: 🟢 AUTO
- **예상 시간**: 2시간
- **카테고리**: infrastructure
- **상태**: pending
- **결정 필요**:
  - D-010
- **ID**: `BL-CATEGORY-REMAP` (출처: D-010 + 대표님 통찰 2건 (Hub-Tasks 중복 / BACKLOG 두 카테고리 중복))

---

## ⚡ P0 — [중앙관리시스템] 4 카테고리 통합 진입점 + Service Ops 신설 (헌법 부칙 5 본체)

**요약**: 1단계: 골격(이번 채팅). 2단계: 자동 동기화 강화. 3단계: Aurora 디자인 통일. [2026-05-03 09:30 보강] D-010 결정에 따라 BL-CATEGORY-REMAP이 본 작업의 후속 정리를 담당.

- **자율성**: 🟢 AUTO
- **예상 시간**: 4시간
- **카테고리**: infrastructure
- **상태**: in_progress
- **결정 필요**:
  - D-004
- **ID**: `BL-CENTRAL-HUB` (출처: 헌법 부칙 5 + 대표님 지시 (2026-05-03 '근본부터'))

---

## 🟢 P0 — [Aurora 통일 캠페인] 디자인 시스템 미적용 페이지 일괄 마이그레이션

**요약**: Aurora Trendy(C3) 전면 적용. 사업 시작 전 완료 의무. 임시 디자인 금지.

- **자율성**: 🟢 AUTO
- **예상 시간**: 8시간
- **카테고리**: design-system
- **상태**: pending
- **결정 필요**:
  - D-005
- **ID**: `BL-AURORA-MIGRATION` (출처: DECISIONS.md L13 (D-005))

---

## 🟢 P0 — [매니저 대시보드 신규 제작] 한 화면 7영역 (5초 파악)

**요약**: 7영역: 진행단계 / 호텔정보 / 콘텐츠 / 노출채널 / 예약결과 / 6개월보장+재제작 / 매출추정. 조회수는 보조.

- **자율성**: 🟢 AUTO
- **예상 시간**: 12시간
- **카테고리**: feature
- **상태**: pending
- **결정 필요**:
  - D-007
  - D-008
- **ID**: `BL-MANAGER-DASH-001` (출처: BUSINESS.md 15-A 통찰 4 + JOURNEY.md C단계)

---

## 🟢 P0 — 통합 To-Do Inbox (관리자 대시보드 재설계)

**요약**: ## 🔴 P0 — 통합 To-Do Inbox (관리자 대시보드 재설계) ⭐⭐⭐ 2026-04-29  **배경** (대표님 핵심 운영 철학): > "한 사람이 처리해야 될 업무는 한 곳에서 우선순위가 표시되어 체크하면 정리할 수 있게 해야 됨. 내가 복잡하게 관리하게 하면 안 됨. 나에게 유리하게 해야 됨."  대표님 1인 운영. 처리 작업이 여러 탭에 흩어

- **자율성**: 🟢 AUTO
- **예상 시간**: 미정시간
- **카테고리**: dev
- **상태**: pending
- **ID**: `BL-002` (출처: BACKLOG.md)

---

## 🔴 P0 — Agoda 예약 검증 시스템 (Booking Verification)

**요약**: ## 🔴 P0 — Agoda 예약 검증 시스템 (Booking Verification) ⭐⭐ 2026-04-29  **배경** (대표님 핵심 비즈니스 통찰): > "아고다의 본인 확인 할 수 있는 것을 제공해줘야 돼. TW Booking Analytics에서 호텔별로 예약번호, 예약날짜, 시간 등 대조할 수 있는 것."  **핵심 가치**: - 우리가 "예

- **자율성**: 🔴 BLOCKED
- **예상 시간**: 미정시간
- **카테고리**: dev
- **상태**: blocked
- **막힘 사유**: 대표님 결정 대기
- **ID**: `BL-003` (출처: BACKLOG.md)

---

## ⚡ P0 — TW B2B 중앙 작업 관리 시스템 구축 (1단계: 데이터 통합 + 백업)

**요약**: 1단계 완료 후 다음 채팅에서 화면 통합 + 자율 큐 + 진행률 + 롤백 UI 작업

- **자율성**: 🟢 AUTO
- **예상 시간**: 2시간
- **카테고리**: dev
- **상태**: in_progress
- **ID**: `IP-CTRL-001` (출처: manual)

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

## ⚡ P1 — [JOURNEY.md 매니저 여정 정리] 비즈니스 독스 카테고리 강화

**요약**: 8단계 매니저 여정 (A 결제전 → B 결제직후 → C 대시보드 → D 서류 → E 6개월 종료).

- **자율성**: 🟢 AUTO
- **예상 시간**: 1시간
- **카테고리**: documentation
- **상태**: in_progress
- **결정 필요**:
  - D-004
- **ID**: `BL-JOURNEY-DOC` (출처: 헌법 부칙 5)

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
- **카테고리**: infra
- **상태**: pending
- **ID**: `SQ-H` (출처: SOLO_WORK_QUEUE.md)

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
- **카테고리**: infra
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

## 🟢 P3 — Chrome 확장 프로그램 간섭 (사용자 환경)

**요약**: ## 🟢 P3 — Chrome 확장 프로그램 간섭 (사용자 환경)  **현상**: `subtitle.js` 확장 프로그램(자막/번역)이 페이지 JS에 간섭. 콘솔 에러 `Extension context invalidated`.  **영향**: 사이트 동작에는 영향 없음. 디버깅 시 노이즈만 증가.  **해결**: 대표님 환경에서 확장 프로그램 비활성화. 코

- **자율성**: 🟢 AUTO
- **예상 시간**: 미정시간
- **카테고리**: dev
- **상태**: pending
- **ID**: `BL-011` (출처: BACKLOG.md)

---

## ✅ DONE (자동 정리됨)

- [BL-DONE-001] Admin Hotels 상세 패널 매니저 정보 누락 + 모달 닫기 불가 (2026-05-02)

