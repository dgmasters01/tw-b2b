# `_os/` — TW OS 진입 인덱스 (Single Source of Truth)

> 새 채팅 시작 시 Claude가 가장 먼저 fetch하는 파일. 헌법 부칙 16조 — 메모리 의존 금지, 상태는 GitHub 실시간 조회.

## 1. 시급 작업 1개

소스: [`/tasks.json`](../tasks.json) — `status="in_progress"` 또는 `priority="P0" && status="pending"` 최상위 1개.

조회: `curl -s https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/tasks.json | jq '.tasks[] | select(.status=="in_progress" or (.priority=="P0" and .status=="pending"))' | head -20`

라이브: <https://gohotelwinners.com/admin-status.html#current-task>

## 2. 작업별 분기표

| 의도 | 진입점 |
|---|---|
| 헌법 11대 원칙 + 부칙 | [`/OPERATIONS_CHARTER.md`](../OPERATIONS_CHARTER.md) |
| Claude 작업 룰 (새 채팅 자동로드 #2) | [`/CLAUDE.md`](../CLAUDE.md) |
| 의사결정 이력 (D-001~) | [`/DECISIONS_INDEX.md`](../DECISIONS_INDEX.md) |
| 전체 작업 큐 (257건) | [`/tasks.json`](../tasks.json) |
| OS 본체 자산 카탈로그 | [`./manifest.json`](./manifest.json) |
| 페이지 역할 (sales/admin/dashboard) | [`./playbook/page-roles.md`](./playbook/page-roles.md) |
| 채팅 간 컨텍스트 인계 | [`./handoff/`](./handoff/) |

## 3. 봇 상태 (GitHub Actions)

소스: `_health.json` (`health_check_admin.mjs` 산출물) — **현재 미생성**. 봇 카탈로그: [`./manifest.json` → assets.scripts](./manifest.json). 실시간 결과: [Actions](https://github.com/dgmasters01/tw-b2b/actions).

| 봇 | 트리거 | 산출물 |
|---|---|---|
| sync_engine + build_tasks_json | push (md 변경) | `tasks.json` |
| auto_detect_task_status | push (`[step:done:N]`) | tasks.json 진행률 |
| scan-pages-status | push + daily 03:00 KST | `pages-status.*` |
| build-activity-feed | push | `activity-feed.*` |
| health_check_admin | daily | `_health.json` (미생성) |

## 4. MCP 상태

현재 활성: **Gmail / Google Drive / Vercel** (호출 전 `tool_search` 선행). 채팅별 상시 점검: 새 채팅 진입 시 시스템 프롬프트 MCP 목록 확인.

---

**갱신 규칙**: 링크와 진입점만 관리. 동적 상태(작업/봇 결과)는 박지 않음 — 봇 산출물(tasks.json, _health.json) 참조.
