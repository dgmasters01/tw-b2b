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

### 2026-05-03 [POLICY] Charter v2 통합 — 부칙 5·6 신설 + 통찰 7개 영구 보존
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
