---
slug: 2026-05-05-status-drill-down-v2
title: admin-status v2 — 결정 대기 동적화 + 진행률 펼침 + 카테고리 통합 + 임박 박스 정의 확장
date: 2026-05-05
commits: []
tasks: [BL-STATUS-DRILL-DOWN-V2]
decisions: [D-010]
auto_migrated: true
---

## 🎯 한 줄 요약
admin-status v2 — 결정 대기 동적화 + 진행률 펼침 + 카테고리 통합 + 임박 박스 정의 확장

## 📍 왜 발생했나
**선행**: BL-STATUS-DRILL-DOWN (작업 db728a7)

## 🛠 어떻게 해결했나
"임박 작업" 자동 클릭 시 0건 — "계속 작업하면 되는거야?" / Image 2 카테고리 카드 4/0/2 정확성 / Image 3 임박 박스 — "어떤 기능?"

## ✅ 결과
작업이 완료되었습니다 (✅ done).

## ⏱ 다음 결정 필요
없음

---

# 🔧 기술 상세 (개발자용)

# 2026-05-05 admin-status v2 5가지 정확성 + 동적화

**TASK**: BL-STATUS-DRILL-DOWN-V2 (신규)
**STATUS**: ✅ done
**선행**: BL-STATUS-DRILL-DOWN (commit db728a7)

## 대표님 5가지 지적 → 박은 fix

### ① "임박 작업" 자동 클릭 시 0건 — "계속 작업하면 되는거야?"

**원인**: 임박 박스 정의가 `P0 + 진행중`. 자동 클릭 시 `(P0 OR 진행중) AND 자동 가능` → 거의 항상 0건.

**Fix**: 필터 모드일 때는 P0+진행중 제약 해제, **미완료 자동 task 13건 전체** 표시.
- 필터 'all' → 기존대로 P0+진행중
- 필터 'auto/staff/ceo' → 미완료 + 해당 role 전체

### ② Image 2 카테고리 카드 4/0/2 정확성

**검증 결과**: 5개 카드 모두 **정확함** ✅
- System Status 🤖4 👥0 👤2 → 검증 통과
- Task Management 🤖6 👥0 👤3 → 검증 통과
- Business Docs 🤖1 → 검증 통과
- Page Gallery 🤖2 → 검증 통과
- Service Operations 🤖0 → 카테고리 task 0건 (정확)
- 합계 = 13 (자동 KPI 일치) / 5 (CEO KPI 일치)

### ③ Image 3 임박 박스 — "어떤 기능?"

**답변**: P0 긴급 + 진행 중 task만 보여주는 박스. KPI 클릭하면 거기에 필터 적용.
**개선**: 필터 시 "P0+진행중" 제약 해제 (위 ① 참조)

### ④ Image 4 KPI 카드 (D+2 / 59% / 18 / 10) 정확성

**검증 결과**: 4개 KPI 모두 **정확** ✅
- 마감 D+2: 데드라인 2026-05-03, 오늘 05-05 → D+2 지남 ✅
- 완료율 59%: 41/69 정확 ✅
- 진행+대기 18: in_progress 2 + pending 16 = 18 ✅
- 막힘 10: status=blocked 10건 ✅

**하지만** 상단 KPI '👤 대표님 결정 5'와 막힘 박스 4건과 막힘 KPI 10이 서로 달라 혼란. 그래서:
- 막힘 KPI sub-label `대표님 결정 대기` → `status=blocked 전체`로 수정 (의미 명확화)
- 결정 대기 박스를 **하드코딩 4건 → 동적 렌더**로 박음

### ⑤ Image 5 카테고리별 진행률 — 세부 못 봄

**문제**: 진행률 바만 표시. 클릭해도 안 펼쳐짐.

**Fix**: `renderIntegratedProgress` 클릭 펼침 박음.
- `STATE.expandedProgressCat` 상태 박음
- 클릭 → ▶/▼ 토글 + 해당 카테고리 task 15건 인라인 표시
- task 행 클릭 → admin-tasks.html?id=... 이동

### 🎁 보너스: 카테고리 중복 통합

**문제**: `infrastructure` (8/12, 67%) + `infra` (1/3, 33%) **둘 다 인프라**인데 분리됨. `documentation` ↔ `docs`, `ops` ↔ `service-ops`도 마찬가지.

**Fix**:
- tasks.json 데이터 정규화 4건 (infra→infrastructure, documentation→docs, ops→service-ops)
- `CATEGORY_ALIAS` 매핑 표 박음 (런타임에도 정규화)
- `normalizeCategory(c)` 함수로 모든 카테고리 정규화 후 카운트
- 11개 → 8개 카테고리로 통합 (인프라 1개로 합쳐짐)

### 🎁 보너스 2: CATEGORY_LABEL_KO 누락 채움

이전엔 design/dev/bug/ux/infra/infrastructure/business/docs/other 9개만 박혀 있었음. 추가:
- service-ops/ops/service-operations → '운영'
- feature → '기능', analytics → '분석', design-system → '디자인 시스템'
- permissions/auth → '권한'
- documentation → '문서'

## 결정 대기 박스 동적 규칙

`renderCeoWait()` 함수:
1. status=blocked + blocker에 "대표님|결정|승인" 정규식 매칭
2. approval_required = true
3. status=pending + autonomous.requires_decisions_first 미해소 + !claude_can_auto

→ 우선순위 정렬 (P0 → P1 → P2)
→ 8건까지 표시 + "+N건 더"
→ 행 클릭 → admin-tasks.html?id=...

## 변경 파일

- `_admin/admin-status.html` (+150줄, 71919 chars)
  - `STATE.expandedProgressCat` 박음
  - `CATEGORY_LABEL_KO` 8개 → 14개
  - `CATEGORY_ALIAS` + `normalizeCategory()` 함수
  - `renderIntegratedUrgent` 필터 모드 시 P0+진행중 제약 해제
  - `renderIntegratedProgress` 클릭 펼침 + task 리스트 + 카테고리 정규화
  - `renderCeoWait()` 신규 함수 (+45줄)
  - 결정 대기 박스 HTML 하드코딩 4건 제거 → id="ceo-wait-list" 동적 슬롯
  - `ik-blocked` sub-label 명확화
- `tasks.json` — 카테고리 4건 정규화 (infra/documentation/ops → 표준명)
- `_chat-logs/2026-05-05-status-drill-down-v2.md` — 본 chat-log

## 진행률 평가

- **이 작업 전: ~75%** (BL-STATUS-DRILL-DOWN 완료 직후)
- **이 작업 후: ~88%**

남은 12%:
- 모바일 700px 이하 진행률 펼침 레이아웃
- chat-log 인덱스 GitHub Actions 자동 트리거
- 임박 박스 ↔ KPI ↔ 결정 대기 박스 시각 강조 통합

## 헌법 적합성

- ✅ 메모리 5번/24번 (위치/구조 자율)
- ✅ 메모리 17번 (str_replace, wholesale rewrite 0건)
- ✅ 헌법 11조 — 데이터 정규화 SQL 대신 tasks.json 직접 정규화 (정적 파일이므로 OK)
- ✅ admin.html 미접근
