# `_os/` — TW OS 진입 인덱스 (Single Source of Truth)

> 전체 지도 — 깊이 필요할 때 본다. **새 채팅 첫 fetch는 `_os/boot.md` 1개**(출발선 경량화, BL-CONTEXT-STARTUP-DIET). 헌법 부칙 16 — 메모리 의존 금지, 상태는 GitHub 실시간 조회.

## 0. 새 채팅 진입 순서 (필수, 헌법 자가 검증 진입)

1. **`_os/boot.md` 1개만** fetch — 이거 1개로 룰 90% 복원 (출발선 경량화).
2. 작업 종류 확인 → boot.md §4 표 따라 필요 시 1~2개만 추가 fetch (깊이 필요 시 `/OPERATIONS_CHARTER.md`, `/CLAUDE.md`, 이 INDEX).
3. 헌법 자가 검증 모드 진입 → 응답 시작.

→ 결과: 슬림 메모리 3줄(MS1~MS3) + boot.md 1개 = 모든 룰 복원. 나머지는 on-demand fetch.

## 1. 시급 작업 1개

소스: [`/tasks.json`](../tasks.json) — `status="in_progress"` 또는 `priority="P0" && status="pending"` 최상위 1개.

조회: `curl -s https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/tasks.json | jq '.tasks[] | select(.status=="in_progress" or (.priority=="P0" and .status=="pending"))' | head -20`

라이브: <https://gohotelwinners.com/admin-status.html#current-task>

## 2. 작업별 분기표

| 의도 | 진입점 |
|---|---|
| 헌법 11대 원칙 + 부칙 | [`/OPERATIONS_CHARTER.md`](../OPERATIONS_CHARTER.md) |
| Claude 작업 룰 (새 채팅 자동로드 #3) | [`/CLAUDE.md`](../CLAUDE.md) |
| 의사결정 이력 (D-001~) | [`/DECISIONS_INDEX.md`](../DECISIONS_INDEX.md) |
| Claude 압축 결정 인덱스 | [`./charter/decisions-index.md`](./charter/decisions-index.md) |
| 사람용 결정 풀버전 | [`/_business/decisions/`](../_business/decisions/) |
| 전체 작업 큐 (257건) | [`/tasks.json`](../tasks.json) |
| OS 본체 자산 카탈로그 | [`./manifest.json`](./manifest.json) |
| 페이지 역할 (sales/admin/dashboard) | [`./playbook/page-roles.md`](./playbook/page-roles.md) |
| 작업별 커넥터 ON/OFF 정책 | [`./playbook/connector-policy.md`](./playbook/connector-policy.md) |
| 채팅 간 컨텍스트 인계 | [`./handoff/`](./handoff/) |
| 진행 중 작업 (work-in-progress) | [`./work-in-progress/`](./work-in-progress/) |

## 3. 메모리 아카이브 (2026-05-27 압축)

메모리 27 → 7줄로 압축. 상세 원문은 아래 5개 파일에 영구 보관:

| 카테고리 | 진입점 | 원본 메모리 |
|---|---|---|
| 인프라 + 토큰 (마스킹) | [`./memory-archive/2026-05-27-infra-tokens.md`](./memory-archive/2026-05-27-infra-tokens.md) | 4, 6, 7, 8, 9, 10 |
| TW B2B 제품 정책 | [`./memory-archive/2026-05-27-tw-b2b-product.md`](./memory-archive/2026-05-27-tw-b2b-product.md) | 2, 5, 12, 16, 18, 23 |
| 운영 룰 풀버전 | [`./memory-archive/2026-05-27-operations-rules.md`](./memory-archive/2026-05-27-operations-rules.md) | 3, 20, 22, 25 |
| Command Center 시스템 | [`./memory-archive/2026-05-27-command-center.md`](./memory-archive/2026-05-27-command-center.md) | 26, 27 |
| M5에 흡수된 원문 | [`./memory-archive/2026-05-27-redundant-merged-into-m5.md`](./memory-archive/2026-05-27-redundant-merged-into-m5.md) | 11, 14, 17, 19, 21, 24 |
| **재비대 9줄 전문 (2026-05-30)** | [`./memory-archive/2026-05-30-memory-rebloat.md`](./memory-archive/2026-05-30-memory-rebloat.md) | 압축 직전 9줄 전문 + 슬림 3줄 |

**현재 메모리 3줄 매핑 (2026-05-30 재압축, BL-CONTEXT-STARTUP-DIET):**
- MS1: 대표님 핵심 (한국어, 호칭, 사업 한 줄, 8채널) — 인사·톤 즉시용
- MS2: 부팅 트리거 (새 채팅 첫 행동 = boot.md 1개 fetch → 90% 복원, "헌법 확인"=정지·재독)
- MS3: commit 창구 (github-commit endpoint + ops-token + 메일알림 — 자동저장 부트스트랩)

→ 상세 룰(끊김 트리거·초등학생 언어·정석 5기준·외부약속/내부운영·인계메모법 등)은 메모리에 안 둠. boot.md → 부칙 16/18 + playbook + BUSINESS.md + 2026-05-30 아카이브에서 fetch.

## 4. 봇 상태 (GitHub Actions)

소스: `_health.json` (`health_check_admin.mjs` 산출물) — **현재 미생성**. 봇 카탈로그: [`./manifest.json` → assets.scripts](./manifest.json). 실시간 결과: [Actions](https://github.com/dgmasters01/tw-b2b/actions).

| 봇 | 트리거 | 산출물 |
|---|---|---|
| sync_engine + build_tasks_json | push (md 변경) | `tasks.json` |
| auto_detect_task_status | push (`[step:done:N]`) | tasks.json 진행률 |
| scan-pages-status | push + daily 03:00 KST | `pages-status.*` |
| build-activity-feed | push | `activity-feed.*` |
| health_check_admin | daily | `_health.json` (미생성) |

## 5. MCP 상태

현재 활성: **Gmail / Google Drive / Vercel** (호출 전 `tool_search` 선행). 채팅별 상시 점검: 새 채팅 진입 시 시스템 프롬프트 MCP 목록 확인.

---

**갱신 규칙**: 링크와 진입점만 관리. 동적 상태(작업/봇 결과)는 박지 않음 — 봇 산출물(tasks.json, _health.json) 참조.

**최근 갱신**: 2026-05-30 — BL-CONTEXT-STARTUP-DIET: 진입 순서 boot.md 1개로 경량화, 메모리 9→3줄 재압축, 2026-05-30 아카이브 추가
