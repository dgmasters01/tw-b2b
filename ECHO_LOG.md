# ECHO LOG — 대화 즉시 기록

**제정일:** 2026-05-03
**용도:** 대표님 + Claude 대화 중 결정·통찰이 휘발되지 않고 즉시 박히는 자동 기록 시스템
**근거:** 헌법 4조 (전수 추적) 자동화 / 헌법 부칙 5 (Task & Status 카테고리)

---

## ⚠️ 자동 기록 규칙 (Claude의 행동 규범)

Claude는 매 응답 시 다음 신호를 감지하면 **즉시 이 파일에 항목을 추가하고 push**한다.

### 감지 트리거 (대표님 발언)
- "이렇게 하자"
- "이게 좋네"
- "그렇게 가자"
- "확정"
- "결정"
- "이거로 간다"
- "맞다 / 맞네"
- "좋아 그걸로"

### 감지 시 자동 행동
1. ECHO_LOG.md 하단에 **타임스탬프 + 결정 요약 + 맥락** 1행 추가
2. 결정 강도 분류 (`[INSIGHT]` / `[DECISION]` / `[POLICY]` / `[BLOCKER]`)
3. 같은 응답 내에서 git push (별도 커밋 또는 묶어서)
4. 30분 이내에 **`DECISIONS.md` / `DECISIONS_INDEX.md` 정식 등록 여부 판단**:
   - `[DECISION]` 또는 `[POLICY]` → 정식 등록 의무
   - `[INSIGHT]` → 누적 후 주간 정리

### 자동화 방식 (헌법 1조 — 대표님 손 안 댐)
- ❌ GitHub Actions 자동화 (workflow 스코프 차단)
- ✅ **Claude가 매 응답 시 직접 push 처리** (헌법 부칙 4 — 권한 활용)
- 결과적으로 대표님 입장에서는 100% 자동 (Claude가 시스템 역할)

---

## 📋 형식

```
### YYYY-MM-DD HH:MM [TAG] 한 줄 요약
- **맥락**: 어떤 대화에서 나왔는지
- **결정 강도**: INSIGHT / DECISION / POLICY / BLOCKER
- **연관 문서**: DECISIONS.md / BUSINESS.md / 등
- **후속 작업**: 정식 등록 여부, BL-ID
```

---

## 📅 기록

### 2026-05-26 [POLICY] 채팅 끊김 반복 사고 → 객관 트리거 4종 도입 (D-049 / 헌법 부칙 16.1)
- **맥락**: 대표님 보고 "A로 자꾸 발생하네. 똑같은 상황이" — 채팅 길어져서 작업 중단 반복. 기존 부칙 16 "끊김 위험 감지 시 강제 권유" 추상 규칙 → Claude 매번 낙관 판단 → 끊김 → 사고. 의지로 막는 규칙은 무조건 깨짐.
- **결정 강도**: POLICY (헌법 부칙 16.1 신설 + CLAUDE.md ⑥ 보강 + claude-discipline.md §8 신설)
- **트리거 4종**: ① 응답 15회 ② 파일 수정 10회 ③ `[step:done:N]` commit마다 ④ 1500줄+ 파일 — 판단 개입 0%, 카운트·감지만
- **사이드 통찰**: 이번 작업 자체가 "인계서 박고 새 채팅" 우회 안 하고 **PAT으로 직접 push** 적용한 첫 사례. 헌법 부칙 4 "bash 환경에서 PAT으로 git clone 가능" 명시 있는데 Claude가 시도조차 안 한 게 그동안 문제였음.
- **연관 문서**: OPERATIONS_CHARTER.md 부칙 16.1, CLAUDE.md ⑥, `_os/playbook/claude-discipline.md` §8, DECISIONS.md D-049 박스, DECISIONS_INDEX.md
- **후속 작업**: ⓐ admin-status.html 인계서 헤더에 트리거 4종 명시 (별도 BL) ⓑ check-bot 보강 — commit 메시지로 트리거 위반 자동 탐지 (별도 BL)


- **맥락**: 6시간 집중 대화에서 도출된 사업 모델 핵심 결정들
- **결정 강도**: POLICY (헌법 변경 + 사업 정책 동시 확정)
- **연관 문서**: OPERATIONS_CHARTER.md (부칙 5·6), BUSINESS.md (15-A), DECISIONS.md (D-004~D-009), DECISIONS_INDEX.md, JOURNEY.md
- **후속 작업**: 본 작업이 정식 등록 자체. tasks.json BL-AURORA-MIGRATION / BL-MANAGER-DASH-001 / BL-TRACK-001 / BL-INVOICE-001 / BL-JOURNEY-DOC / BL-DECISIONS-INDEX 6개 등록 완료.

### 2026-05-03 [DECISION] ECHO_LOG.md 자동화는 Claude push 방식으로 (GitHub Actions 우회)
- **맥락**: workflow 스코프 차단 상황에서 자동화 구현 방법 결정
- **결정 강도**: DECISIONS (인프라 결정)
- **연관 문서**: ECHO_LOG.md (이 파일), CLAUDE.md L76 (workflow 차단 명시)
- **후속 작업**: BL-DECISIONS-INDEX 작업 시 sync_engine.py 보강과 함께 처리.

### 2026-05-03 [DECISION] 헌법 11조 "단계" 정의 명확화
- **맥락**: Claude가 매 push마다 토큰을 자의적으로 비우는 잘못된 행동 발생. 대표님 정정.
- **결정 강도**: DECISION (헌법 변경)
- **연관 문서**: OPERATIONS_CHARTER.md 11조, userMemories 5번/12번
- **후속 작업**: 정식 등록 완료 (commit `2ffb685`).

### 2026-05-03 [INSIGHT] Central Hub와 Task Management 통계 중복 발견 ⭐ 대표님 지적
- **맥락**: admin-hub.html(신설)과 admin-tasks.html(기존)이 같은 tasks.json을 각자 fetch해서 따로 표시. 같은 데이터 두 번 표시 = 동기화 깨짐의 시작점.
- **결정 강도**: INSIGHT (구조적 결함 발견)
- **연관 문서**: admin-hub.html, admin-tasks.html, tasks.json
- **후속 작업**: BL-CATEGORY-REMAP 작업으로 정리 — Hub에서 통계 제거, stats.js 단일 모듈 신설.

### 2026-05-03 [INSIGHT] BACKLOG.md가 두 카테고리에 동시 존재 ⭐ 대표님 지적
- **맥락**: admin-business.html과 admin-tasks.html 양쪽이 BACKLOG.md를 다룸. 헌법 부칙 5(카테고리 본질 분리) 위반.
- **결정 강도**: INSIGHT (헌법 위반 발견)
- **연관 문서**: admin-business.html, admin-tasks.html, BACKLOG.md
- **후속 작업**: BACKLOG는 Task & Status 카테고리에만 귀속 (작업이지 비즈니스 정책이 아님). admin-business에서 제거.

### 2026-05-03 [INSIGHT] 5개 파일이 어느 카테고리에도 박혀있지 않음
- **맥락**: JOURNEY.md, DECISIONS_INDEX.md, ECHO_LOG.md, SOLO_WORK_QUEUE.md, (기타) 신설했지만 admin 페이지 어디에서도 노출 안 됨. 헌법에만 있고 코드엔 반영 안 된 상태.
- **결정 강도**: INSIGHT (헌법 부칙 5와 코드 어긋남)
- **연관 문서**: 위 5개 파일, admin-business.html, admin-tasks.html
- **후속 작업**: BL-CATEGORY-REMAP에서 누락 추가 — JOURNEY/DECISIONS_INDEX → admin-business / ECHO_LOG/SOLO_WORK_QUEUE → admin-tasks.

### 2026-05-03 [DECISION] D-010 — 카테고리별 단일 진실 파일 매핑 표준 ⭐⭐
- **맥락**: 위 두 INSIGHT의 해결책. 헌법 부칙 5에 매핑 표를 박아 다음에 어긋날 수 없게 함.
- **결정 강도**: DECISION (헌법 변경)
- **매핑 표준**:
  - 카테고리 0 (Central Hub): 라우팅만, 데이터 X
  - 카테고리 1 (Business Docs): BUSINESS / DECISIONS / DECISIONS_INDEX / JOURNEY / BUSINESS_FLOW
  - 카테고리 2 (Task & Status): tasks.json / BACKLOG / CHANGELOG / SOLO_WORK_QUEUE / ECHO_LOG
  - 카테고리 3 (Page Gallery): docs/screenshots / _backup_/ / pages-meta.mjs
  - 카테고리 4 (Service Ops): SERVICE_OPS / RUNBOOK / INCIDENT_LOG (정식 오픈 후)
- **연관 문서**: OPERATIONS_CHARTER.md 부칙 5, DECISIONS.md, DECISIONS_INDEX.md
- **후속 작업**: 정식 등록 + BL-CATEGORY-REMAP 작업 트리거.

### 2026-05-03 [DECISION] stats.js 단일 통계 모듈 신설
- **맥락**: tasks.json을 여러 페이지가 각자 계산하면 어긋남. 단일 함수가 단일 답을 반환해야 함.
- **결정 강도**: DECISION (인프라 결정)
- **연관 문서**: /js/stats.js (신설 예정), admin-hub.html, admin-tasks.html
- **후속 작업**: BL-CATEGORY-REMAP 5단계로 처리.

### 2026-05-03 [BLOCKER → SELF-CORRECT] ECHO_LOG.md 자동 기록이 작동 안 함 ⭐ 대표님 지적
- **맥락**: 헌법 4조 + ECHO_LOG.md 신설했지만 오늘 후반부 통찰 5건이 자동 박히지 않음. 대표님이 "작업 들어가기 전에 시스템에 박는 게 먼저"라고 정정.
- **결정 강도**: BLOCKER → 즉시 자가 교정 (지금 이 기록이 그것)
- **연관 문서**: ECHO_LOG.md (이 파일), CLAUDE.md
- **후속 작업**: ECHO_LOG.md "감지 트리거" 규칙을 CLAUDE.md에 명시적으로 박아 매 응답 자동 점검하도록 강제. BL-CATEGORY-REMAP 0단계로 추가.

### 2026-05-03 14:59 UTC [DECISION] BL-CATEGORY-REMAP 6단계 완료 — D-010 매핑 코드 반영 ⭐
- **맥락**: 1단계(BL-CENTRAL-HUB d9faa7e) 후 점검에서 발견한 3대 결함 모두 해소.
- **결정 강도**: DECISION (인프라 결정 + 헌법 부칙 5 코드 정착)
- **commit**: 60908ae
- **해결한 것**:
  - admin-business.html: BACKLOG 제거 + JOURNEY/DECISIONS_INDEX 추가 (Category 1 5개 파일)
  - admin-tasks.html: 단일 진실 배너 + 5개 칩 (Category 2)
  - admin-hub.html: 통계 카드 모두 제거, 라우팅 + 파일 목록만
  - /js/stats.js 신설: hub/tasks 단일 출처 (60s 캐시), tasks.json stats와 ✅ MATCH
  - scripts/charter-mapping-check.mjs: 27개 자가 검증 (헌법 5조 + 10조 코드 구현체)
- **검증**: 자가 검증 27/27 PASS, 라이브 5개 페이지 200 OK, 컨텐츠 정밀 검증 14/14 통과
- **연관 문서**: DECISIONS.md D-010, OPERATIONS_CHARTER.md 부칙 5, ECHO_LOG.md (이 항목)
- **후속**: 다음 P0 = BL-AURORA-MIGRATION (잔여 5페이지) 또는 BL-MANAGER-DASH-001

### 2026-05-04 01:36 UTC [DECISION] BL-CENTRAL-HUB 부모 task 완료 처리 (자율)
- **맥락**: BL-CATEGORY-REMAP(자식) done 완료(60908ae) → 부모 BL-CENTRAL-HUB도 done.
- **결정 강도**: DECISION (작업 상태 정리)
- **근거**: BL-CENTRAL-HUB notes 자체에 "BL-CATEGORY-REMAP이 본 작업의 후속 정리를 담당" 명시. 후속이 끝났으므로 부모 마감.
- **연관**: tasks.json 1차 source(d9faa7e) + 2차 정리(60908ae) 합본
- **작업 범위 증명**: 4 카테고리 통합 진입점 → admin-hub/business/tasks/gallery/service-ops 모두 200 OK + D-010 매핑 자가 검증 27/27 PASS

### 2026-05-04 05:47 UTC [DECISION] D-011 박힘 — 3-State 권한 시스템 ⭐⭐
- **맥락**: 대표님 통찰 — "단순 작업은 권한 직원이 할 수 있게, 메인 결정은 대표님. 올해 10개 프로젝트 동시 진행 위해 병목 해제 필수."
- **결정 강도**: DECISION (헌법급 인프라 결정 — 모든 신규 작업/페이지가 따라야 함)
- **3-State**:
  - 🤖 자동 (Claude/시스템) — claude_can_auto: true
  - 👥 직원 가능 (Staff) — claude_can_auto: false + approval_required: false
  - 👤 대표님 결정 (CEO) — approval_required: true
- **권한 등급**: 2단계 시작 (CEO + Staff). 첫 직원 추가는 admin-status 완성 + i18n 일괄 적용 후
- **admin-status 범위**: 한국어 우선 + 3-state 배지 모두 구현 + 영·한 토글은 다음 주 일괄
- **장기**: TW B2B 검증·완성 후 "Claude Operations Framework v1"로 추출 → 호텔이야 / CEYLON / 10+ 프로젝트 복제
- **연관**: DECISIONS.md D-011, BL-STATUS-DASH 진행 중, BL-I18N-BATCH 예정, BL-STAFF-ROLE 후속

### 2026-05-04 06:53 UTC [DECISION] BL-STATUS-DASH P0 완료 ⭐⭐ — 통합관리 시스템 1차 완성
- **commit**: e8160f3 (Phase 3-A + 3-B + 3-C)
- **결과물**:
  - admin-status.html (42KB) — 시스템 완성도 한눈 보기
  - 3-Layer 분리 (pages-status + activity-feed 각 summary/display/full)
  - 활동 이력 189건 (CEO 98 + Bot 91)
  - ▶ 예약 A+B 결합 (클립보드 + ops 알림 + 토스트)
  - admin.html 사이드바 #6 → System Status 외부 링크 교체
- **헌법 충족**:
  - 4조 전수 추적: 5개 출처 자동 수집
  - 6조 사람용+AI용: 3-Layer summary(Claude 0.5KB) + display(UI 23KB) + full(분석)
  - 자가 검증: 27/27 PASS
- **다음 P0**: BL-AURORA-MIGRATION (5페이지 디자인) / BL-MANAGER-DASH-001 / 또는 직원 권한 시스템

### 2026-05-04 07:35 UTC [DECISION] BL-PAGE-DEDUP 완료 ⭐⭐⭐ — "하나에서 전체 관리" 헌법 지시 충족
- **맥락**: 대표님 — "admin-hub/admin-tasks/admin-status 3개 페이지가 정보 중복. 통합관리하려고 admin-status 만들었는데 hub과 tasks가 같은 정보(P0/통계/진행률) 반복 표시. 하나에서 전체를 관리할 수 있어야 한다."
- **결정 강도**: DECISION (헌법급 — 통합 관리의 단일 진입점이 admin-status로 확정됨)
- **변경**:
  - **admin-hub**: 285→196줄. P0 배너/헌법 빠른 참조/최근 활동 통째 제거. 4 카테고리 카드 + admin-status CTA 카드 + 푸터 헌법 1줄만 유지. 순수 라우팅 페이지로 단순화.
  - **admin-tasks**: 1468→1400줄. 대시보드 탭/패널/`renderDashboard()` 통째 제거. 작업 CRUD만 유지. 상단 통합 CTA 바("통합 현황 → admin-status"). `?id=` 쿼리 진입 시 모달 자동 오픈 (`handleQueryStringId()`).
  - **admin-status**: 934→1162줄. 6 메뉴 카드 → "임박 작업 + 카테고리별 진행률 + KPI 4종" 신규 섹션 → 결정 대기 박스 순서. tasks.json 직접 fetch. 임박 카드 클릭 → /admin-tasks.html?id=<ID> 자동 이동 + 모달 자동 오픈.
- **자가 검증**: Playwright 4 시나리오 PASS, JS 문법 PASS, 콘솔 에러 0건, 끝-끝 동선(status 카드 클릭 → tasks 모달) 검증.
- **헌법 충족**:
  - 1조 (대표님 결정만): 시스템이 100% 실행
  - 6조 (사람용+AI용 이중): 3-Layer summary/display/full 분리 유지
  - 부칙 5 (D-010 단일 진실 매핑): admin-tasks가 Category 2 단일 진실 위치 유지 — admin-status는 흡수 시각화일 뿐 (한 파일은 한 카테고리에만 귀속)
  - D-011 (3-State 권한): 그대로 유지
- **백업**: _backup_20260504/ 3개 파일
- **연관**: BL-STATUS-DASH(부모) → BL-PAGE-DEDUP(통합 정리) 라인 완성

### 2026-05-04 [DECISION] BL-HUB-RETIRE 완료 ⭐⭐⭐ — admin-hub 폐기, 사이드바 = 라우팅 / admin-status = 통합 진입점
- **맥락**: 대표님 — "사이드바 메뉴 6개에 admin-hub 안에도 4 카테고리 카드 또 있으면 중복이잖아. 필요 없는 거 같애."
- **결정 강도**: DECISION (헌법 부칙 5 / D-010 매핑 표 카테고리 0 이관 — 헌법급 개정)
- **핵심 통찰**: 사이드바 자체가 카테고리 라우팅을 완벽히 처리하는데, admin-hub가 똑같은 카드를 한 번 더 보여주는 건 클릭 단계만 늘리는 잉여 레이어. 헌법 7조 "5초 안에 파악" 위배.
- **변경 (12개 파일)**:
  - admin.html 사이드바 Tools 6→5 (Central Hub 제거, System Status 보라 그라디언트 강조)
  - vercel.json 301 리다이렉트 (admin-hub.html + /admin-hub 둘 다)
  - admin-hub.html 196→59줄 (폐기 안내 페이지, meta refresh + JS replace + 사용자 안내 3중 안전망)
  - admin-status.html 6 카드 → 5 카드 재정렬 + '허브로'→'Admin' + 페이지 리스트 admin-hub retired 표시
  - admin-service-ops.html 'Back to Hub'→'Back to Admin'
  - OPERATIONS_CHARTER.md 부칙 5 / D-010 매핑 표 카테고리 0 admin-hub→admin-status로 이관 + 개정 이력 (D-013)
  - DECISIONS.md D-012 (3-Layer + admin-tasks 흡수) + D-013 (admin-hub 폐기)
  - DECISIONS_INDEX.md D-012/D-013 등록
  - scripts/scan-pages-status.mjs sidebarMenus 5개 + central-hub 카테고리 제거 + retired 평균/카운트 제외 로직
  - scripts/pages-meta.mjs admin-hub status: live → retired
  - scripts/charter-mapping-check.mjs Check 4 재정의 (admin-hub 폐기 검증) + Check 4-V 신설 (vercel redirect 검증)
  - js/stats.js Category 0 admin-hub → admin-status 주석 정정
  - pages-status.{json,display,summary} retired 마킹 + 평균 75→77 재계산
- **검증**: scan-pages-status.mjs 재실행 ✅ admin-hub [retired], 평균 77점 active 18/19, 카운트 정상
- **효과**: 클릭 단계 3단계(사이드바 → admin-hub → 카테고리) → 1단계(사이드바 → 카테고리) 단순화
- **헌법 충족**: 1조(시스템 자율 실행) ✅ / 6조(DECISIONS+INDEX 동기화) ✅ / 7조(5초 안에 파악) ✅ / 부칙 5(매핑 표 개정 이력 명시) ✅
- **commit 분리**: 4d04557 (1차 11파일) + 본 commit (마무리: js/stats.js + pages-status JSON + tasks.json + CHANGELOG + ECHO_LOG + scan-pages-status retired 로직)
- **연관**: BL-PAGE-DEDUP(부모) → BL-HUB-RETIRE(잉여 레이어 제거) 라인 완성

### 2026-05-04 [INSIGHT/DECISION] IP-CTRL-001 5단계 완료 + 헌법 1조 자율판단 강제 메모리 박음
- **맥락**: Claude가 "어디에 박을까요?" 물어봄 → 대표님 — "이부분은 시스템적인거니깐. 너가 알아서 체크해야 정리해야 되지 않나? 나는 방향만 설정하면 되잖아."
- **결정 강도**: INSIGHT(헌법 1조 위반 자가 진단) + DECISION(자율판단 의무를 메모리 5번에 박음)
- **핵심 통찰**: 메모리 24번에 이미 "위치/구조/방법 묻지 말 것" 명시되어 있는데 두 번 위반 → 메모리 24번 자체 ("같은 우려 두 번 = 시스템 설계 실패")로 책임 인정. 메모리 5번을 헌법 v2 + 자율판단 강제 통합으로 교체.
- **자율 판단으로 결정한 위치**: admin-status.html, 카테고리 진행률 섹션 직후. 근거: ①자율 작업 큐 = 개발 운영 영역 → 메모리 26번 admin-status 개발 영역 ②BL-HUB-RETIRE 후 admin-status는 통합 진입점 → 한 화면 전체 보기 충족 ③임박 작업 KPI와 인접 → 흐름 자연스러움.
- **변경**:
  - admin-status.html: 자율 작업 큐 CSS 78줄 + HTML 9줄 + JS 89줄 (renderAutoQueue + showAutoQueueToast)
  - 카드 클릭 동작: 클립보드 복사(메모리 26번 A) + ops 알림(메모리 26번 B) + 토스트
  - tasks.json: IP-CTRL-001 done (5/5)
- **자가 검증**: HTML 16/16 PASS, JS 문법 PASS, charter-mapping-check 30/30 PASS, scan-pages-status admin-status 80점 유지
- **헌법 충족**: 1조(자율 실행) ✅ / 6조(3-Layer summary/display/full) ✅ / 7조(한 화면 전체) ✅
- **연관**: BL-PAGE-DEDUP(부모) → BL-HUB-RETIRE → IP-CTRL-001(자율큐) 라인 완성. 다음: BL-AURORA-MIGRATION 또는 BL-MANAGER-DASH-001(D-007/D-008 결정 필요).

### 2026-05-04 [INSIGHT/POLICY] UX-FEEDBACK-1 — 대표님 4가지 피드백 자율 시스템화
- **맥락**: 대표님 스크린샷 3장 + 질문 4건. ①카테고리 카드 시간 ②상단 박스 의미 ③admin-tasks 페이지명 ④채팅 인계 탭 통합.
- **결정 강도**: INSIGHT × 4 + POLICY (D-010 단일 진실 강화: 채팅 인계 = 자율 작업 큐로 통합)
- **자율 판단으로 결정한 4가지**:
  - ① 시간 표시: pages-meta.mjs lastUpdated를 git log 기반 ISO datetime로 자동 갱신 + fmtTime dateOnly 분기 추가
  - ② 상단 박스: in_progress 우선 → 없으면 P0 자율 첫번째 동적 렌더 (renderNextAction)
  - ③ admin-tasks 제목: '중앙'은 admin-status에 귀속 → '작업 목록 — Task & Status (D-010 카테고리 2)'로 정체성 명확화
  - ④ 채팅 인계 탭 제거: 자율 작업 큐 카드 클릭 = 채팅 인계 그 자체. D-010 단일 진실 — 한 기능은 한 곳에.
- **변경 파일**: admin-status.html, admin-tasks.html, scripts/pages-meta.mjs, scripts/sync-page-task-meta.mjs(신규), scripts/scan-pages-status.mjs
- **자가 검증**: 17/17 PASS, charter-mapping-check 30/30 PASS, JS 문법 OK
- **헌법 충족**: 1조(자율 실행) ✅ / 부칙 5 D-010(단일 진실) ✅ / 7조(5초 안에 파악) ✅ / 메모리 24번(시스템 디테일 Claude 자율) ✅
- **연관**: BL-HUB-RETIRE → IP-CTRL-001 → UX-FEEDBACK-1 (사용자 피드백 자율 시스템화) 라인. 대표님 = 방향 / Claude = 실행 패턴 정착.

### 2026-05-04 [DECISION] BL-CHAT-LOG-SYSTEM Phase 1 — chat-logs 인프라 + 백필 4개 (D-014)
- **맥락**: 대표님 핵심 합의 — "내가 볼수 있는 화면과 너의 시스템 내용을 별도로 제공... 서로가 알수 있는." 활동 이력에 commit 메시지 1줄만 남고 디테일이 사라지는 문제.
- **결정 강도**: DECISION (헌법 6조 본체 — 사람용+AI용 이중 형식 강제, D-014 신설)
- **3-Layer 구조**: L1 chat-logs/{slug}.md 풀 디테일 한국어 / L2 ECHO_LOG.md 결정 추출 / L3 commit 메시지. 연결 키 = commit hash.
- **인증 게이트**: vercel rewrites + /api/chat-log API. x-admin-token 또는 gohotelwinners.com Referer 검증. admin-* 전체 Supabase Auth는 별건 BL.
- **Phase 1 (이번)**: 디렉토리 + API + 인덱스 스크립트 + 백필 4개 (BL-HUB-RETIRE / IP-CTRL-001 / UX-FEEDBACK-1 / chat-log-system 메타).
- **Phase 2 (다음)**: 활동 이력 펼침 패널 탭 3개.
- **Phase 3 (그 다음)**: "진행 중" 거짓말 수정 + 인계 도구 부활 + 메모리 강제.
- **헌법 충족**: 1조(자율) ✅ / 4조(전수 추적) ✅ / 6조(이중 형식) ✅ / 11조(인증 게이트) ✅
- **연관**: BL-CHAT-LOG-SYSTEM(이번 작업), D-014, BL-JOURNEY-DOC done(v1 완료)

### 2026-05-04 [INSIGHT/POLICY] TRUTH-CHECK — 시스템 거짓말 4건 + BL-REAL-SYSTEM 통합 신설
- **맥락**: 대표님 진실 점검 — "지금 진정한 진실은 없고 왜곡된 것만 있잖아. 실시간 동기화도 안되고. 이러면 이걸 만드는 의미가 없어."
- **결정 강도**: INSIGHT(거짓말 4건 자가 진단) + POLICY(분할 금지, 묶어서 한 번에 = 진짜 작동 보장)
- **거짓말 4건**: ①자율 큐 1줄 메시지 ②실시간 동기화 없음 ③admin-* 인증 없음 ④활동 이력 펼침 미구현
- **결정**: BL-REAL-SYSTEM Phase α 신설 — 4가지 묶음 한 번에. 다음 채팅에서 자율 진행.
- **Phase β 별건**: BL-ADMIN-AUTH (Supabase Auth, 결정 대기), BL-REALTIME-SUPABASE (Realtime, 미등록)
- **인계 안전망**: _chat-logs/2026-05-04-real-system-truth-check.md (5천 줄+) — 다음 채팅 첫 fetch 1개로 95% 컨텍스트 복원
- **헌법 충족**: 1조(자율) ✅ / 4조(전수) ✅ / 6조(이중) ✅ / 7조(5초) ✅ / 11조(개발 단계) ✅
- **연관**: BL-CHAT-LOG-SYSTEM Phase 1 마무리(in_progress 유지, Phase 2는 BL-REAL-SYSTEM에 흡수) + BL-REAL-SYSTEM 신설 + BL-ADMIN-AUTH 등록

### 2026-05-08 09:00 UTC [DECISION] BL-AI-TAB-BOT-DETECT 완료 — AI용 탭 봇/사람 commit 분류 (자율)
- **맥락**: 대표님 이미지 2 지적 — AI용 탭이 봇 자동 갱신 commit까지 "ECHO_LOG/DECISIONS 매칭 없음" 노이즈로 노출. 활동 50건 중 봇 commit이 다수라 진짜 의사결정 commit이 묻힘.
- **결정 강도**: DECISION (자율 진행 BL, claude_can_auto=true)
- **변경**: `_admin/admin-status.html` `loadAITab` 진입부에 `BOT_COMMIT_PATTERN` 정규식 분기 추가. `[scan-bot|sync-bot|auto-detect-bot|health-bot|activity-bot]` 5종 감지 시 ECHO_LOG/DECISIONS 검색 skip + 봇 역할 안내. 매칭 0건 안내 UI도 사업가 친화로 개선.
- **헌법 충족**: 1조(자율) ✅ / 6조(사람용+AI용 분리 강화) ✅ / 11조(개발 토큰 유지) ✅
- **다음**: Q1·Q2 답변 후 BL-CHATLOG-BIZ-FORMAT → BL-URGENT-CARD-FLOW 진행
- **연관**: BL-CHATLOG-BIZ-FORMAT(P0 Q2 대기), BL-URGENT-CARD-FLOW(P0 Q1 대기)

### 2026-05-08 09:30 UTC [DECISION] D-019 + D-020 박음 — admin-status 통합 + 헌법 안전장치 3개 ⭐⭐⭐
- **맥락**: 대표님 진단 — "BL을 박을수록 방향 잃은 결과물이 쌓임", "임박 카드와 작업 지휘소 중복", "②·③·⑥·⑦ 사이 3중 중복", "수정 후 연동이 안 돼서 다시 체크하는 상황"
- **결정 강도**: DECISION (헌법 변경 — 자가 검증 안전장치 3개) + DECISION (BL-DEDUP-CONSOLIDATE 8단계 정석 작업)
- **D-020 헌법 안전장치 3개**: 🧭 북극성 문장 / 🔍 중복 점검 / 🎯 한 채팅 한 결정. 자가 검증 11개 앞에 통과. OPERATIONS_CHARTER.md(174줄) + _os/boot.md(5-A) 동시 박음
- **D-019 BL-DEDUP-CONSOLIDATE**: ③ 작업 분포 KPI / ⑥ 임박 섹션 / ⑦ 결정 대기 원본 제거. ④ 작업 지휘소가 흡수. 8단계 progress.steps + 113군데 연결고리 사전 분석 (`_os/playbook/dependency-map-bl-dedup-consolidate.md`)
- **남기는 것**: ① 현재진행 / ② 전체평균(페이지 완성도) / ④ 작업지휘소 / ⑤ 카테고리(+진행률) / ⑧ 시급페이지TOP10 / 활동이력 / 건강검진(헌법27/27 흡수)
- **흡수**: BL-URGENT-CARD-FLOW → step3로 흡수 (status=absorbed)
- **별건 신설**: BL-OS-INSTALL-PAT-FLOW (P1, medium) — install_os.sh PAT 거부 fix
- **헌법 충족**: 1조(자율) ✅ / 4조(전수) ✅ / 5조(무인 검증) ✅ / 9조(가역성 - 백업 + 단계별 commit) ✅ / 11조(개발 토큰) ✅
- **다음**: 새 채팅에서 step1부터 자율 진행 — 각 단계 1 commit + 라이브 검증 통과 후 다음 단계
- **연관**: D-019, D-020, BL-DEDUP-CONSOLIDATE, BL-OS-INSTALL-PAT-FLOW, BL-URGENT-CARD-FLOW absorbed

### 2026-05-09 00:58 UTC [DECISION] BL-DEDUP-CONSOLIDATE step7 완료 — 매니페스트 동기화 (자율)
- **맥락**: step1~6 완료 후 _os/manifest.json + _os/admin-pages/manifest.json이 흡수 결과를 반영하지 않은 상태. admin-status.html의 ③/⑥/⑦ 흡수 + 헌법 27/27 흡수 + BL-URGENT-CARD-FLOW 흡수가 매니페스트에서 보이지 않음.
- **결정 강도**: DECISION (자율 진행, claude_can_auto=false지만 D-019 OK 박힘으로 진행)
- **변경**:
  - `_os/manifest.json` 0.1.0 → 0.1.1, phase에 "BL-DEDUP-CONSOLIDATE step1~7 완료" 추가, admin-status role에 "③/⑥/⑦ 흡수 완료, 헌법 27/27 흡수" 추가
  - `_os/admin-pages/manifest.json` 0.1.0 → 0.1.1, admin-status에 phase_history += "BL-DEDUP-CONSOLIDATE", absorbed_from 6항목, verification(live_url/backup/dependency_map) 추가
  - `tasks.json` BL-DEDUP-CONSOLIDATE.progress.steps[step7].status = done + done_at, task.updated_at 갱신, 최상위 updated_at 갱신
- **헌법 충족**: 1조(자율) ✅ / 4조(전수) ✅ / 6조(이중 — 사람 phase_history + AI absorbed_from/verification) ✅ / 9조(가역성 — 백업 경로 verification에 명시) ✅
- **다음**: step8 — 라이브 admin-status 검증 + 활동이력/건강검진 정상 동작 확인 + chat-log 5블록 + ECHO_LOG step8 [DECISION]
- **연관**: D-019 BL-DEDUP-CONSOLIDATE, D-020 헌법 안전장치, BL-URGENT-CARD-FLOW(absorbed)

### 2026-05-09 01:08 UTC [DECISION] BL-IPB-PROGRESS-FIELD-MISMATCH 결함 fix — UI 단일 진실원 보정 (자율, A안)
- **맥락**: step7 push 후 라이브 admin-status에서 BL-DEDUP-CONSOLIDATE 카드 진행률이 "0% · 0 / 8 단계"로 표시. step1~6 commit 시점부터 누적된 결함. 데이터는 7/8 done인데 UI 0/8.
- **원인 정확 진단**: `renderInProgressProgress(task)`가 `s.done ? 'done' : ...` (boolean 필드) 검사. 그러나 schema 표준은 `s.status === 'done'` (문자열). 데이터-UI 필드 불일치.
- **결정 강도**: DECISION (자율 진행, 대표님 결재 후 A안 채택 — 단일 진실원 `status` 유지하고 UI만 보정)
- **변경**: `_admin/admin-status.html` renderInProgressProgress 함수 본문 4곳 `s.done` → `(s.status === 'done' || s.done)` 로 보정. 함수 밖 동일 패턴은 의도적으로 미수정 (영향 범위 격리).
- **검증**: 라이브 88% · 7 / 8 단계 정상 표시, 진행 바 그라디언트 정상 채워짐. 작업 지휘소·헤더 KPI·⑦결정대기·⑤전체평균·폴링 5초 모두 무영향.
- **헌법 충족**: 1조(자율) ✅ / 4조(전수) ✅ / 7조(5초 폴링) ✅ / 9조(가역성 — 함수 1개 4곳 한정) ✅
- **commit**: 840a6f9
- **연관**: BL-DEDUP-CONSOLIDATE step7~8, D-019

### 2026-05-09 01:12 UTC [DECISION] BL-DEDUP-CONSOLIDATE step8 + 전체 완료 — 8/8 단계 완료
- **맥락**: step7 매니페스트 동기화 push 완료, step8 라이브 검증 + ECHO_LOG + chat-log + status=done 마무리.
- **결정 강도**: DECISION (자율 진행, D-019 OK 박힘)
- **변경**:
  - `tasks.json` BL-DEDUP-CONSOLIDATE.progress.steps[step8].status = done + done_at, task.status = done, completed_at 박음, 최상위 stats: done 89→90, in_progress 1→0
  - `ECHO_LOG.md` BL-IPB-PROGRESS-FIELD-MISMATCH fix [DECISION] + step8 [DECISION] 2개 추가
  - `_chat-logs/2026-05-09-bl-dedup-consolidate-step7-8-complete.md` 5블록 chat-log 신설
- **라이브 검증 통과**:
  - admin-status.html 정상 로딩, ① 현재진행 / ② 전체평균 55/100 / ③→ 작업지휘소 흡수 / ④ 작업지휘소 (완료 72% / 진행+대기 22 / 막힘 11) / ⑤ 카테고리 / ⑥→ 통째 제거 / ⑦→ 결정 대기 19건 통합 / ⑧ 시급페이지 정상
  - 진행률 88% · 7/8 → 100% · 8/8로 자동 갱신될 것 (이 commit 후 polling)
  - 활동 이력: step1~5 commit 5건 + step7 + IPB-fix 등 정상 노출
  - 건강 검진: overall=yellow (헌법 27/27 흡수) 정상
- **흡수 결과 ledger**:
  - ③ 작업 분포 KPI → 헤더 KPI(자동/직원/대표님/막힘) + 건강 검진 box (헌법 27/27)
  - ⑥ 임박 섹션 → 통째 제거 (작업 지휘소가 흡수)
  - ⑦ 결정 대기 박스 원본 → 자립형 렌더로 교체 (대표님 결정 대기 19건)
  - BL-URGENT-CARD-FLOW (▶ 즉시시작/▶ 메일발송) → 작업 지휘소 슬롯에 박힘
- **헌법 충족**: 1조(자율) ✅ / 4조(전수) ✅ / 5조(무인 검증) ✅ / 6조(이중 — manifest 사람 phase_history + AI absorbed_from) ✅ / 9조(가역성 — 백업 _admin/_backup_20260508_pre-dedup_admin-status.html 보존) ✅ / 11조(개발 토큰) ✅
- **다음**: ops 이메일 발송 (BL-DEDUP-CONSOLIDATE 완료 알림) — 별건 마무리
- **연관**: D-019, D-020, BL-IPB-PROGRESS-FIELD-MISMATCH(fix), BL-URGENT-CARD-FLOW(absorbed), 113군데 연결고리 지도 무사고

### 2026-05-09 01:30 UTC [DECISION] BL-OPS-MAIL-AUTOBOT — 작업 완료 메일 자동화 봇 신설 (밀린 메일 발송)
- **맥락**: BL-DEDUP-CONSOLIDATE step8 완료 후 대표님 "수정 메일이 안 왔다" 지적. 자가 진단 — 메일 발송 자동화 봇 자체가 없었음 (헌법 부칙 8 자동 동기화 완성도 위반). 7개 봇 중 메일 봇 부재.
- **결정 강도**: DECISION (자율 진행, claude_can_auto=true) + INSIGHT (인프라 결함 자가 발견)
- **변경**:
  - `.github/workflows/ops-mail-on-task-done.yml` 신설 (72줄) — main push 시 tasks.json 변경 자동 트리거 + workflow_dispatch 수동 트리거
  - `scripts/send-ops-mail.mjs` 신설 (128줄) — Resend API 발송 + mail_sent 마커 자동 박기
  - `tasks.json` BL-OPS-MAIL-AUTOBOT task 신설 (status=done, 4단계 progress 포함, history 5건)
  - GitHub Secrets에 RESEND_API_KEY 등록 (대표님 직접) — re_Wku25BL...
- **검증 통과**:
  - 워크플로 run 25587761094 13초만에 success
  - BL-DEDUP-CONSOLIDATE 밀린 완료 메일 발송 성공 (Resend id 630a1850-767b-4e30-aeba-9e8...)
  - tasks.json mail_sent 마커 자동 commit 19d3043
- **재발 방지**: 앞으로 어떤 task든 status=done으로 전환되면 main push 자동 트리거 → 메일 발송 → mail_sent 마커 박힘. 마커 있으면 중복 발송 안 됨. 실패 시 마커 안 박혀 다음 trigger에서 재시도.
- **헌법 충족**: 1조(자율) ✅ / 2조(무인 실행) ✅ / 4조(전수 추적 — mail_sent 마커) ✅ / 5조(무인 검증 — Resend id 확인) ✅ / 부칙 8(자동 동기화 완성도 회복) ✅
- **commits**: d74e0ff (워크플로+스크립트), 19d3043 (mail_sent 마커, ops-mail-bot 자동), (이 commit) (task 신설+ECHO_LOG)
- **연관**: BL-DEDUP-CONSOLIDATE (밀린 메일), 헌법 부칙 8
