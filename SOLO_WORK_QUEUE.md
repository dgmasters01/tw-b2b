# TW B2B — 자율 작업 큐 (Solo Work Queue)

> ⚠️ **이 파일은 자동 생성됩니다.** 수동 편집하지 마세요.
> 단일 진실 소스: `tasks.json` (v2.0)
> **데드라인**: 2026-05-03
> **갱신**: 2026-05-12
> **목적**: 대표님 외근/자리비움 시 Claude 자율 처리 가능 작업

## 작업 분류 체계

| 마크 | 의미 | Claude 자율 처리 |
|---|---|---|
| 🟢 **AUTO** | 즉시 자율 진행 가능 | ✅ |
| 🟡 **SEMI** | 일부 자율, 디자인/문구는 보수적 | ✅ (검수 표시) |
| 🔴 **BLOCKED** | 대표님 결정 후에만 진행 | ❌ |

---

## 🔥 P0 — 데드라인 직결 작업

### A. 🔴 BLOCKED — 통합 To-Do Inbox (관리자 대시보드 재설계)

**ID**: `BL-002`  
**카테고리**: dev  
**예상 시간**: 미정시간  
**막힘 사유**: supabase 호텔/예약 인프라 박힌 후 4종 사업 source 연결. 진행률 표시 + 활동이력 결함 4건은 BL-IPB-* / BL-ACT-* 로 분리.  

**메모**: ## 🔴 P0 — 통합 To-Do Inbox (관리자 대시보드 재설계) ⭐⭐⭐ 2026-04-29  **배경** (대표님 핵심 운영 철학): > "한 사람이 처리해야 될 업무는 한 곳에서 우선순위가 표시되어 체크하면 정리할 수 있게 해야 됨. 내가 복잡하게 관리하게 하면 안 됨. 나에게 유리하게 해야 됨."  대표님 1인 운영. 처리 작업이 여러 탭에 흩어져 있으면 누락 발생. 한 곳에 통합 필요.  **작업 항목**: 1. **admin.html Dashboard 탭 = To-Do Inbox** 으로 재설계    - 모든 처리 작

---

### B. 🟢 AUTO — Agoda Matching = 호텔 가입 수동 승인 페이지 (매니저 온보딩 게이트)

**ID**: `BL-003-A`  
**카테고리**: feature  
**예상 시간**: 8시간  

**메모**: 매니저 가입 시 자동 매칭(agoda_hotels DB + Google Places) 실패한 호텔이 admin Agoda Matching 페이지에 대기 큐로 쌓이고, 대표님이 Agoda URL/주소 보고 hotel_id 수동 매칭 → 승인 → 매니저에게 가입 확정 알림. 매니저 온보딩 게이트 — 안 만들면 매칭 실패 케이스가 가입 자체 불가.

---

### C. 🟢 AUTO — [자동] 자동 일꾼 1명이 멈췄어요: sync-bot

**ID**: `BL-AUTO-BOTS-SYNC-BOT`  
**카테고리**: infrastructure  
**예상 시간**: 1시간  

**메모**: 점검 봇 자동 등록 (2026-05-11T20:24:23.985Z)

check_name: bots
status: red
detail: 자동 일꾼 1명이 멈췄어요: sync-bot

진단 hint: 룰북 _os/playbook/auto-task-registry.md 참조. 해소 시 점검 봇이 green으로 박으면 자동 done.

---

## 🟡 P1 — 데드라인 이전에 있으면 좋음

### A. 🟢 AUTO — [YouTube 더보기 단축 URL 클릭 카운트] 호텔별 진성 관심 측정 시스템

**ID**: `BL-TRACK-001`  
**카테고리**: analytics  
**예상 시간**: 6시간  
**결정 필요 사항**:
- D-006

**메모**: gohotel.win/h/{hotel_id} → Supabase 카운트 +1 → Agoda 어필리에이트 리디렉션. 호텔별/순위별 분리.

---

### B. 🟢 AUTO — [인보이스/영수증 PDF 자동 생성·다운로드] 영구 보관 (1년+)

**ID**: `BL-INVOICE-001`  
**카테고리**: feature  
**예상 시간**: 5시간  
**결정 필요 사항**:
- D-009

**메모**: 결제 직후 자동 발송 + 매니저 대시보드 별도 탭에서 1클릭 다운로드. PDF 3종: 인보이스/영수증/6개월리포트.

---

### C. 🟢 AUTO — Agoda 예약검증 페이지 — Affiliate 엑셀 업로드 → 호텔별 매출 자동 정리

**ID**: `BL-003-B`  
**카테고리**: feature  
**예상 시간**: 6시간  

**메모**: Agoda Affiliate 엑셀 업로드 → 호텔명·예약번호·체크인/아웃·금액·상태·tag 파싱 → 호텔별 그룹핑 → 매출 검증. analytics 페이지 구조 그대로 차용. 매출 본격 발생 시 필요 — BL-003-A 다음 우선순위.

---

### D. 🟢 AUTO — 자동 알림 메일 시스템 (BACKLOG의 P1)

**ID**: `SQ-G`  
**카테고리**: dev  
**예상 시간**: 미정시간  

**메모**: ### G. 🟢 AUTO — 자동 알림 메일 시스템 (BACKLOG의 P1) **작업 내용**: BACKLOG.md L280 참조. 6개 트리거 메일 구현 - 호텔 등록 / 승인 / 거절 / 결제 완료 / 영상 제작 시작 / 영상 게시 - 기존 `sendSystemEmail` 함수 활용 - 영어 본체 + 한국어 토글 (i18n 일괄 작업 시점까지 영어만)  **예상 시간**: 2시간 **자율 진행 사유**: 메일 템플릿은 BUSINESS.md 정책 그대로 사용  ---

---

### E. 🟢 AUTO — Supabase Management API 토큰 갱신 알림 자동화

**ID**: `SQ-H`  
**카테고리**: infrastructure  
**예상 시간**: 미정시간  

**메모**: ### H. 🟢 AUTO — Supabase Management API 토큰 갱신 알림 자동화 **작업 내용**: 토큰 만료 7일 전 ops 메일 자동 발송 (현재 토큰 만료 5/26) - Vercel Cron 또는 Supabase Edge Function 사용 - 현재는 메모리에만 알림 메모, 자동화 안 됨  **예상 시간**: 1시간 **자율 진행 사유**: 인프라 자동화  ---  ## 🟢 P2 — 자투리 시간에

---

### F. 🟢 AUTO — [건강검진 사람 말] 점검 결과를 사업가 언어로 풀어줌

**ID**: `BL-BASELINE-HUMAN-LANG`  
**카테고리**: ux  
**예상 시간**: 4시간  

**메모**: 대표님 통찰 (2026-05-10): 건강검진(health-check) 결과가 개발자 용어로 박혀있음. 사람 말로 풀어줘야 대표님이 즉시 판단 가능. BL-BASELINE-AUTO-TASK(자동 작업 등록)와 짝꿍 — 둘이 함께 박혀야 점검→이해→작업 흐름 완성.

범위: _admin/_health.json + admin-status 빨간 배너 + 점검 결과 메시지 전체.

---

### G. 🟢 AUTO — [결정 → 페이지 → 작업 흐름 시각화] 대표님 판단 도구

**ID**: `BL-DEPENDENCY-GRAPH`  
**카테고리**: ux  
**예상 시간**: 4시간  

**메모**: 대표님 통찰 (2026-05-10): 어느 결정부터 해야 어느 페이지가 만들어지고, 그 위에 어느 자율 작업이 박히는지 한 화면에 보이게. BL-SERVICE-MAP(페이지 지도) done 후 그 위에 의존성 그래프 그림.

표시 요소: D-XXX (결정) → 페이지 (Phase 1~3) → BL-XXX (세부 작업) 3단 트리. 막힌 결정 클릭 시 결정 모달 자동 열기.

---

### H. 🟢 AUTO — [일일 건강 카드] 위 4개(사람말 + 자동등록 + 지도 + 의존성)를 한 줄로 압축

**ID**: `BL-DAILY-HEALTH-CARD`  
**카테고리**: ux  
**예상 시간**: 2시간  
**막힘 사유**: BL-BASELINE-HUMAN-LANG + BL-BASELINE-AUTO-TASK + BL-SERVICE-MAP + BL-DEPENDENCY-GRAPH done 대기  

**메모**: 대표님 통찰 (2026-05-10): 위 4개를 한눈에 보는 통합 카드. admin-status 최상단에 박힘. 'X점 / 페이지 N개 / 결정 M개 대기 / 자동등록 K건' 한 줄.

선행: 1~4 done. 단독으로는 의미 없음 — 위 4개가 박혀야 압축할 정보가 생김.

---

### I. 🟢 AUTO — [자동] 관리자 페이지 7개가 원본과 살짝 달라요 (대표님이 일부러 고친 건지 점검 필요)

**ID**: `BL-AUTO-ADMIN-BASELINE-7FILES`  
**카테고리**: infrastructure  
**예상 시간**: 1시간  

**메모**: 점검 봇 자동 등록 (2026-05-11T03:56:28.755Z)

check_name: admin_baseline
status: yellow
detail: 관리자 페이지 7개가 원본과 살짝 달라요 (대표님이 일부러 고친 건지 점검 필요)

진단 hint: 룰북 _os/playbook/auto-task-registry.md 참조. 해소 시 점검 봇이 green으로 박으면 자동 done.

---

## 🟢 P2 — 자투리 시간에

### A. 🟢 AUTO — [DECISIONS_INDEX.md 자동 동기화] sync_engine 보강

**ID**: `BL-DECISIONS-INDEX`  
**카테고리**: infrastructure  
**예상 시간**: 2시간  

**메모**: DECISIONS.md 변경 감지 → DECISIONS_INDEX.md 자동 갱신. ID 고정 불변 규칙.

---

### B. 🟢 AUTO — BEFORE/AFTER 스크린샷 자동 캡처 시스템 (Page Gallery 통합)

**ID**: `BL-015`  
**카테고리**: dev  
**예상 시간**: 4-6시간  

**메모**: ## 🟡 P2 — BEFORE/AFTER 스크린샷 자동 캡처 시스템 (Page Gallery 통합)  ### 배경 대표님 메모리 원칙: 모든 페이지 수정 시 ① 수정 전 풀페이지 스크린샷 ② 수정 작업 ③ 수정 후 풀페이지 스크린샷 ④ 작업 기록에 BEFORE/AFTER 비교 등록 ⑤ 관리자 페이지에서 전후 비교 확인 가능. Page Gallery 스크린샷도 수정 시 자동 갱신.  ### 현재 상태 - `admin-gallery.html`은 존재하나 BEFORE/AFTER 비교 기능 미구현 - 자동 캡처 인프라(Playwright 

---

### C. 🟢 AUTO — README.md 업데이트

**ID**: `SQ-J`  
**카테고리**: docs  
**예상 시간**: 미정시간  

**메모**: ### J. 🟢 AUTO — README.md 업데이트 **작업 내용**: 현재 어떤 시스템들이 라이브에 있는지, 각 페이지 목적, 환경변수 목록 등을 한 페이지에 정리.  **예상 시간**: 30분 **가치**: 새 채팅에서 컨텍스트 파악 시간 단축  ---  ## 🚫 데드라인 후 (5/3 이후)  - 호텔 검색 UX 이슈 (BACKLOG P2 Issue #1, #2) - 호텔 스토리 / LTV 추적 (BACKLOG P2) - Phase 3 D단계 (회원 탈퇴 / 이메일 변경) - i18n 한국어 일괄 적용  ---  ## 자율 

---

### D. 🟢 AUTO — [그림 일치 OS] In-Progress 박스 commit 자동 갱신 누락 fix

**ID**: `BL-SYNC-INPROGRESS-COMMITS`  
**카테고리**: fix  
**예상 시간**: 0.25시간  
**결정 필요 사항**:
- BL-OS-AUTO-SYNC-CHARTER

---

### E. 🟢 AUTO — 활동이력 — 봇 commit 클릭 시 사람용 탭 노출 결함 fix

**ID**: `BL-ACTIVITY-MODAL-BOT-FIX`  
**카테고리**: bug  
**예상 시간**: 0.5시간  

**메모**: 결함: 봇 commit (예: auto-detect-bot, charter-length-bot)은 사람용 narrative가 없는데, 활동이력 모달이 default로 사람용 탭을 띄움 → 사용자에게 빈 모달처럼 보임. 정석: 봇 출처 commit은 AI raw 탭을 default로 (또는 사람용 탭 자동 hide).

---

### F. 🟢 AUTO — 작업 시작 시 progress.steps 미박힘 자동 감지·자동 채움 + step:done:N 범위 자동 검증

**ID**: `BL-PROGRESS-STEPS-AUTOFILL`  
**카테고리**: infra  
**예상 시간**: 1시간  

**메모**: 정석: 헌법 부칙 7(단계 단위 commit) + 시행령 5번(무인 검증) 통합. 봇이 자동 강제. 사람이 매번 박는 게 아님. BL-ADMIN-AUTH-PERF의 progress_warning(MISSING_PROGRESS_STEPS) 트리거가 이미 있으니 그걸 확장.

---

### G. 🟡 SEMI — 호텔 스토리 / LTV 추적

**ID**: `BL-006`  
**카테고리**: dev  
**예상 시간**: 미정시간  

**메모**: ## 🟡 P2 — 호텔 스토리 / LTV 추적 ⭐ 2026-04-29  **배경**: 장기 고객 = 영업 자산. "Lotte는 3번 결제한 충성 고객" 같은 분석 가능.  **작업 항목**: 1. **DB 뷰**: `hotel_lifetime_stats` (자동 집계) 2. **admin.html 호텔 상세 페이지 강화** — 거래 요약 / 담당자 이력 / 영상 이력 / 영업 인사이트(사실 기반) 3. **marketing.html "호텔 스토리" 섹션** — 우리와 함께한 시간 (등급 표시 X) 4. **영업 자료 CSV expo

---

### H. 🟡 SEMI — 호텔 검색 UX 이슈

**ID**: `BL-008`  
**카테고리**: ux  
**예상 시간**: 미정시간  

**메모**: ## 🟡 P2 — 호텔 검색 UX 이슈  ### Issue #1: 호텔 검색 결과 정렬 부정확 **현상**: `Lotte Hotel S` 입력 시 결과 순서: Seattle → New York → Chicago → New York → Seoul (5번째). 한국 사용자에게 Seoul이 가장 마지막에 표시.  **해결**: 가입 시 country 받아 location bias로 사용 / 기본 location bias를 한국 좌표로 / review_count DESC 정렬.  **관련 파일**: `api/google-places.js`

---

### I. 🟡 SEMI — Admin Console UI 버그

**ID**: `BL-009`  
**카테고리**: bug  
**예상 시간**: 미정시간  

**메모**: ## 🟡 P2 — Admin Console UI 버그  ### Issue #3: Hotels 목록의 MANAGER 컬럼 비어있음 ✅ [DONE 2026-04-29] **현상**: Admin Console > Hotels > Hotel Partners 목록에서 MANAGER 컬럼이 "-"로 표시됨. 매니저 정보(이지형 / leejifilm@hanmail.net)가 표시되어야 함.  **원인**: 컬럼명 불일치 — hotel-info.html은 `contact_name`/`contact_email`/`contact_phone` 저장, 

---

### J. 🟡 SEMI — Chrome 안전 브라우징 경고

**ID**: `BL-010`  
**카테고리**: ux  
**예상 시간**: 미정시간  

**메모**: ## 🟡 P2 — Chrome 안전 브라우징 경고  **현상**: 대표님 Chrome 일반 모드에서 `gohotelwinners.com` 접속 시 "위험한 사이트" 경고. 시크릿 모드/Edge에서는 정상.  **진단**: Google Safe Browsing — 2020-04-08 멀웨어 페이지 보관 이력 (이전 도메인 소유자 흔적). 현재 데이터 없음. Chrome 캐시 잔존.  **해결 옵션**: - A. Chrome 캐시 정리 (5분): `chrome://safebrowsing/` → Refresh Lists - B. Goog

---

## ⚪ P3 — 여유 시간

### A. 🟢 AUTO — Chrome 확장 프로그램 간섭 (사용자 환경)

**ID**: `BL-011`  
**카테고리**: dev  
**예상 시간**: 미정시간  

**메모**: ## 🟢 P3 — Chrome 확장 프로그램 간섭 (사용자 환경)  **현상**: `subtitle.js` 확장 프로그램(자막/번역)이 페이지 JS에 간섭. 콘솔 에러 `Extension context invalidated`.  **영향**: 사이트 동작에는 영향 없음. 디버깅 시 노이즈만 증가.  **해결**: 대표님 환경에서 확장 프로그램 비활성화. 코드 수정 불필요.  ---

---

### B. 🟢 AUTO — [그림 일치 OS] 챗 로그 / AI 탭 자동 갱신 누락 fix — 탭 활성 시 폴링

**ID**: `BL-SYNC-CHAT-LOGS-TAB`  
**카테고리**: fix  
**예상 시간**: 0.5시간  
**결정 필요 사항**:
- BL-OS-AUTO-SYNC-CHARTER

---

### C. 🟢 AUTO — shared.js dead 인증 함수 제거 — checkAdmin / _adminCache / isAdmin / clearAdminCache

**ID**: `BL-SHARED-AUTH-CLEANUP`  
**카테고리**: infra  
**예상 시간**: 0.5시간  

**메모**: BL-ADMIN-AUTH-PERF (D-021, A-2 정석)에서 admin 페이지의 checkAdmin 호출 100% 제거 후, shared.js에 정의만 남은 dead code. 호출처 0개 확인됨 (2026-05-09). middleware.js가 단일 진실원이므로 정석은 제거이지만, 호출처 0으로 안전하므로 별도 BL로 분리 (대표님 결정 2026-05-09).

---

### D. 🟡 SEMI — OS 봇 스크립트 — repo root 동적 산출 (위치 의존성 제거)

**ID**: `BL-OS-REPO-ROOT-DYNAMIC`  
**카테고리**: infra  
**예상 시간**: 1시간  

---

### E. 🟡 SEMI — 워크플로 dead branch listening 정리 — restructure-os-modularization 통합 후 잔여

**ID**: `BL-WORKFLOW-DEAD-BRANCH-CLEANUP`  
**카테고리**: infra  
**예상 시간**: 0.2시간  

---

