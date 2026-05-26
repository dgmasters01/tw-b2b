# `_os/` — TW OS 진입 인덱스 (Single Source of Truth)

> 새 채팅 시작 시 Claude가 가장 먼저 fetch하는 파일. 헌법 부칙 16조 — 메모리 의존 금지, 상태는 GitHub 실시간 조회.

## 0. 새 채팅 진입 순서 (필수, 헌법 자가 검증 진입)

1. **이 파일** (`_os/INDEX.md`) fetch — 전체 지도
2. `/OPERATIONS_CHARTER.md` fetch — 헌법 11대 원칙
3. `/CLAUDE.md` fetch — 프로젝트 컨텍스트
4. 헌법 자가 검증 모드 진입 → 응답 시작

→ 결과: 메모리 7줄(M1~M5) + 위 3개 파일 = 모든 룰 복원 완료

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

**현재 메모리 7줄 매핑:**
- M1: 대표님 핵심 정보 (한국어, 호칭, 8채널, 진행 사업)
- M2: 새 채팅 진입 순서 + 헌법 자가 검증
- M2-B: 분량/끊김 룰 (줄 수 카운트, 끊김 트리거 4종)
- M2-C: 초등학생 검증 + 자율 진행 + admin-status 언어 룰
- M3: 자동화 창구 2개 (ops 메일 + GitHub commit)
- M4: 파일 위치 원칙 (대표님 로컬 X, GitHub fetch 강제)
- M5: 운영 헌법 5축 (정석 5기준 / 사업·시스템 / 번복금지 / admin-status / 2벌저장)

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

**최근 갱신**: 2026-05-27 — 메모리 아카이브 5개 추가, 새 채팅 진입 순서 명문화 (시스템 재설계 3단계)
