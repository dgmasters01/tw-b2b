---
slug: 2026-05-05-status-drill-down
title: admin-status 카테고리 매핑 정확화 + KPI 클릭 필터 + 시급 페이지 drill-down + chat-log 자동 매핑
date: 2026-05-05
commits: []
tasks: [BL-STATUS-DRILL-DOWN]
decisions: [D-010]
auto_migrated: true
---

## 🎯 한 줄 요약
admin-status 카테고리 매핑 정확화 + KPI 클릭 필터 + 시급 페이지 drill-down + 작업 기록 자동 매핑

## 📍 왜 발생했나
**선행**: BL-ADMIN-STATUS-LOOP-FIX (작업 73a0ec2)

## 🛠 어떻게 해결했나
카테고리 카드 값 부정확 (System Status 0/0/0) / KPI 4카드 클릭 → 임박 박스 필터 (원클릭 관리) / 카테고리 카드 펼침 = 세부 task + 페이지 리스트

## ✅ 결과
작업이 완료되었습니다 (✅ done).

## ⏱ 다음 결정 필요
없음

---

# 🔧 기술 상세 (개발자용)

# 2026-05-05 admin-status 원클릭 통합 관리 박기

**TASK**: BL-STATUS-DRILL-DOWN (신규)
**STATUS**: ✅ done
**선행**: BL-ADMIN-STATUS-LOOP-FIX (commit 73a0ec2)

## 대표님 4가지 지적 → 박은 fix

### ① 카테고리 카드 값 부정확 (System Status 0/0/0)

**원인**: `countByState`가 임시 휴리스틱 (`lastTask.taskCount`만 사용). tasks.json에서 카테고리별로 실제 카운트 안 함.

**Fix**:
- `MENU_KEY_TO_CATEGORIES` 매핑 표 박음 (D-010 단일 진실)
  - system-status ← infrastructure, infra, design-system
  - task-management ← dev, feature, bug, analytics
  - business-docs ← docs, documentation
  - page-gallery ← ux, design
  - service-operations ← service-ops, ops
  - permissions ← permissions, auth
- `tasksByMenuKey(menuKey)` 함수로 tasks.json에서 직접 카운트
- `STATE.tasksData`에 캐시, `loadIntegratedTasks` 끝에 카테고리 카드 재렌더

### ② KPI 4카드 클릭 → 임박 박스 필터 (원클릭 관리)

**문제**: 자동 16/직원 8/CEO 4 카운트가 하드코딩. 클릭해도 아무 일 없음.

**Fix**:
- `taskRole(t)` 함수로 task를 auto/staff/ceo/blocked/done 5분류
  - approval_required = true → ceo
  - autonomous.requires_decisions_first 미해소 + !claude_can_auto → ceo
  - blocked → blocked
  - claude_can_auto = true → auto
  - 그 외 → staff
- `renderIntegratedKPI` 동적 계산 (tasks.json 미완료 task 카운트)
- KPI 카드 4개에 `data-role-filter` 속성 박음
- 클릭 시 `STATE.urgentFilter` 갱신 → 임박 박스 필터 + 부드러운 스크롤
- 임박 박스 상단에 필터 표시바 + "필터 해제 ✕" 버튼 박음
- 임박 박스 카드에 🤖 AUTO / 👥 STAFF / 👤 CEO 역할 배지 박음
- 데드라인 배너의 "잔여 작업 분포" 텍스트도 동적 갱신

### ③ 카테고리 카드 펼침 = 세부 task + 페이지 리스트

**문제**: 카드 펼치면 5차원 점수 + 마지막 작업 1건만 보임. "어떤 task들이 있는지" 안 보임.

**Fix**:
- `renderCategoryTasksBlock(menuKey)`: 해당 카테고리 task 12건까지 표시
  - 행마다 역할 아이콘 + 우선순위 + 상태 + 제목 + ID + 시간
  - 행 클릭 → admin-tasks.html?id=...로 이동
  - 헤더에 "📋 task N건 — ✅ N · 🔄 N · ⏳ N · 🚫 N" 카운트 박음
- `renderCategoryPagesBlock(menuKey)`: 해당 카테고리 페이지 점수 리스트
  - categoryStats에서 페이지 path 추출
  - 각 페이지 점수 + 가장 약한 부분 hint 표시
  - 페이지 path 클릭 → 해당 페이지로 이동

### ④ 시급 페이지 TOP 10 → 카테고리 drill-down

**문제**: 시급 페이지 클릭해도 아무 일 없음. 메인 통합인데 세부 미연동.

**Fix**:
- `pageToMenuKey(path)` 역매핑 함수 (sidebarMenus + categoryStats 양쪽 검색)
- 시급 row에 `data-page-path` + cursor:pointer 박음
- 클릭 시 해당 카테고리 카드 펼침 + 부드러운 스크롤
- 매핑 없으면 페이지로 직접 이동 (fallback)

## 추가 fix: 활동 이력 chat-log 매핑 (보너스)

**문제**: 활동 이력 클릭하면 "이 활동에 연결된 chat-log를 찾지 못했습니다" 뜸. byCommit 매핑 4건뿐.

**원인**: `build-chat-log-index.mjs`가 frontmatter `commits: [...]`만 읽음. 대부분 chat-log frontmatter에 commits 비어 있음. 신규 chat-log엔 frontmatter 자체도 없음.

**Fix**:
- `build-chat-log-index.mjs`에 `buildAutoCommitMap()` 자동 추출 추가
  - ① `git log -- _chat-logs/{slug}.md` 로 파일 변경 commit 추적
  - ② 최근 200 commit message에 slug 또는 task ID 포함되면 자동 매핑
  - ③ frontmatter 명시된 commits는 우선 유지 (우선순위 ↑)
  - ④ entry.commits에도 자동 매핑 hash 머지 (역추적용)
- 신규 chat-log `2026-05-05-admin-status-loop-fix.md`에 frontmatter 박음
- 라이브 실행 결과: byCommit 4 → **16개**로 4배 증가

## 진행률 평가 (대표님 질문)

**전: ~40%** (UI 골격 + 카테고리 카드 표시 + 폴링 골격)
**후: ~75%** 

남은 25%:
- KPI/카테고리 카드 클릭 시 미세 UX 정제 (좋아요 표시 등)
- chat-log 인덱스 GitHub Actions 자동 트리거 (현재 수동 실행)
- 사이드바 5개 메뉴 ↔ 카테고리 카드 ↔ 시급 페이지 3-way 양방향 연결 완전 자동화
- mobile 700px 이하 카테고리 카드 펼침 레이아웃 검증

## 변경 파일

- `_admin/admin-status.html` — KPI 동적 + KPI 클릭 필터 + 카테고리 매핑 + 카테고리 펼침 task/페이지 리스트 + 시급 페이지 drill-down (+1500자)
- `scripts/build-chat-log-index.mjs` — git log 자동 매핑 (+50줄)
- `_chat-logs/index.json` — byCommit 4 → 16건 자동 갱신
- `_chat-logs/2026-05-05-admin-status-loop-fix.md` — frontmatter 박음
- `_chat-logs/2026-05-05-status-drill-down.md` — 본 chat-log
- `tasks.json` — BL-STATUS-DRILL-DOWN done 박음

## 검증

- JS 문법 OK (65446 chars)
- JSON OK (index.json + tasks.json)
- chat-log index 라이브 실행 통과 (16개 commit 매핑)

## 헌법 적합성

- ✅ 메모리 5번/24번 (위치/구조 질문 금지) — 자율 판단으로 D-010 매핑 박음
- ✅ 메모리 17번 (분량 자체 끊기, str_replace만) — wholesale rewrite 0건
- ✅ 헌법 11조 — 매핑 표를 코드 단일 진실로 박음
- ✅ admin.html 미접근
- ✅ 메모리 25번 — CHANGELOG 정보 commit 메시지에 [변경사유] 태그
