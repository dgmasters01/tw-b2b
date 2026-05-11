# 자동 작업 등록 봇 — 운영 룰북 (auto-task-from-health)

**제정일**: 2026-05-11
**발생 BL**: BL-BASELINE-AUTO-TASK
**근거 통찰**: 대표님 (2026-05-10) — "점검 봇이 빨간불 잡아도 BL로 안 박혀 흘러감"
**상위 규범**: `OPERATIONS_CHARTER.md` 부칙 3·8·11 + 시행령 5(무인검증)·7(상태가시성)
**짝꿍 BL**: BL-BASELINE-HUMAN-LANG (점검 결과를 사업가 언어로 풀기)

---

## 0. 왜 이 봇이 필요한가

### 사고 패턴 (2026-05-10 대표님 진단)

기존 봇 3종이 점검 결과를 **파일에만 박고** 끝남:

| 점검 봇 | 출력 파일 | 빨간불 발견 시 |
|---|---|---|
| `health-check-admin` | `_admin/_health.json` | 화면 빨간 배너만 → BL로 안 박힘 |
| `page-status-scan` | `pages-status.json` | 점수 표시만 → BL로 안 박힘 |
| `charter-length-bot` | CI exit 1 | push 차단만 → BL로 안 박힘 |

**결과**: 대표님이 빨간 배너를 보고 "수정해야겠다"고 인지해도, 그게 **시스템 작업 큐(tasks.json)에 안 들어가서 흘러감.** 다음 Claude는 그 빨간불을 모름.

**해결**: `auto-task-from-health` 봇이 점검 결과를 읽어 **자동으로 BL을 tasks.json에 박는다.**

---

## 1. 핵심 원칙

### 1-1. 발견 → 등록 의무
점검 봇이 `yellow` 또는 `red`를 박는 순간 → 자동 BL 등록. 사람 손 안 거침.

### 1-2. dedup 강제
**같은 문제는 BL 하나만.** 동일 사고가 반복 박혀 작업 큐가 부풀지 않게 안정 ID + active 상태(pending/in_progress/paused) 검사.

### 1-3. 사람 말로 박기
title·notes는 부칙 16 의무 4(초등학생 언어). 점검 봇 detail은 이미 사람 말 — 그대로 활용.

### 1-4. 자동 close
이전에 박혔던 BL의 원인이 해소되면(예: `_health.json`에서 해당 check가 green이 되면) → 자동 done 처리.

### 1-5. 시간 가드
같은 BL은 24시간 안에 한 번만 재등록 시도. 무한 commit 루프 방지.

---

## 2. 안정 ID 규칙

```
BL-AUTO-{CHECK_NAME}-{STABLE_KEY}
```

| 변수 | 의미 | 예시 |
|---|---|---|
| `CHECK_NAME` | 점검 봇 check name (대문자, 하이픈) | `ADMIN-BASELINE` / `TASKS-SCHEMA` / `VERCEL-SYNC` / `VERCEL-QUOTA` / `BOTS` / `CHARTER-LENGTH` / `PAGE-STATUS` |
| `STABLE_KEY` | check 안의 고유 식별자 (해시·파일명·없으면 `GENERAL`) | `7FILES` (변경 파일 수 N으로 인코딩) / `13MISSING` / `RED` |

### 예시

| 점검 발견 | 생성되는 BL ID |
|---|---|
| `admin_baseline` yellow / 7개 파일 변경 | `BL-AUTO-ADMIN-BASELINE-7FILES` |
| `tasks_schema` red / source 13건 누락 | `BL-AUTO-TASKS-SCHEMA-13MISSING` |
| `vercel_sync` yellow | `BL-AUTO-VERCEL-SYNC-MISMATCH` |
| `bots` red / sync-bot 죽음 | `BL-AUTO-BOTS-SYNC-BOT` |
| `page-status` critical / admin.html 14점 | `BL-AUTO-PAGE-STATUS-ADMIN-HTML` |
| `charter_length` red / 250줄 초과 | `BL-AUTO-CHARTER-LENGTH-OVER` |

**원칙**: STABLE_KEY는 **숫자(N건)나 카테고리**로 인코딩해서, 같은 종류 사고가 다시 발견될 때 동일 ID로 매칭되게 한다.

---

## 3. dedup 알고리즘

```
새 발견 (check_name, stable_key) 박기 전:

1. tasks.json에서 BL-AUTO-{check_name}-{stable_key} 검색
2. 있으면:
   - status ∈ {pending, in_progress, paused, blocked} → SKIP (이미 작업 큐에 있음)
   - status == done:
     - updated_at < 24h 전 → SKIP (재발 너무 빠름, 같은 사고로 간주)
     - updated_at ≥ 24h 전 → REOPEN (status: pending으로 되살림, history에 reopened 기록)
3. 없으면 → CREATE
```

---

## 4. 자동 close 알고리즘

```
점검 결과가 green으로 돌아왔는데, 같은 check_name 으로 active BL이 있으면:

1. BL-AUTO-{check_name}-* 매칭되는 BL 모두 검색
2. status ∈ {pending, in_progress} 인 것
3. 각각 done 처리 + history에 auto_resolved 기록
4. notes에 "{NOW}에 점검 봇 green 전환으로 자동 해소" 추가
```

---

## 5. 박힌 BL의 표준 schema

| 필드 | 값 |
|---|---|
| `id` | `BL-AUTO-{CHECK}-{KEY}` |
| `title` | `[자동] {check 사람말 detail}` — 예: `[자동] 관리자 페이지 7개가 원본과 살짝 달라요` |
| `category` | `infrastructure` (점검 인프라) |
| `priority` | red → `P0` / yellow → `P1` |
| `status` | `pending` |
| `owner` | `claude` |
| `size` | `small` (점검 사고는 대부분 작은 fix) |
| `claude_can_auto` | `true` (자율 진행 허용) |
| `approval_required` | `false` |
| `source` | `auto_from_{check_name}` |
| `notes` | check 원본 detail + 시점 + 진단 hint |
| `decision_ref` | `D-024` (이 봇 박는 결정 — 다음 항목 참조) |

---

## 6. 트리거 (워크플로 wiring)

```yaml
on:
  push:
    branches: [main]
    paths:
      - '_admin/_health.json'         # health-bot push 시
      - 'pages-status.summary.json'   # scan-bot push 시
  schedule:
    - cron: '*/15 * * * *'            # 15분마다 안전망
  workflow_dispatch:                  # 수동 트리거
```

**무한 루프 방지**:
- 봇 자신의 commit message가 `[auto-task-bot]`으로 시작하면 skip
- concurrency group `auto-task-from-health-${ref}` + `cancel-in-progress: false`

---

## 7. 봇이 박는 commit 메시지 표준

```
[auto-task-bot] BL N건 등록 / M건 해소 (red=A, yellow=B)
```

예시:
```
[auto-task-bot] BL 3건 등록 / 0건 해소 (red=1, yellow=2)
```

---

## 8. 자체 검증 11개 통과 확인

| # | 질문 | 통과 |
|---|---|---|
| 1 | 클라우드(GitHub)에만 존재? | ✅ workflow + script 모두 repo |
| 2 | 사람 손 없이 자동 실행? | ✅ push + cron 트리거 |
| 3 | 핸드폰만으로 가능? | ✅ admin-status 빨간 배너 → BL 카드 자동 등장 |
| 4 | 작업 기록 영구 보존? | ✅ tasks.json history + DECISIONS D-024 |
| 5 | 시스템 자동 검증? | ✅ dedup + 24h 가드 + auto-close |
| 6 | 다음 세션 Claude 맥락 파악? | ✅ 이 룰북 + BL notes에 진단 hint |
| 7 | 작업 상태 5초 파악? | ✅ tasks.json → admin-status 5초 폴링 |
| 8 | 현황표/독스/갤러리 동기화? | ✅ tasks.json 단일 진실원 |
| 9 | 되돌릴 수 있음? | ✅ git revert 1번 + status: cancelled 수동 가능 |
| 10 | 헌법 자동 로딩? | ✅ 워크플로 환경 무관 |
| 11 | 메모리 사이클 안? | ✅ 개발 모드 |

---

## 9. 예외 (BL 안 박는 케이스)

다음은 점검 봇이 yellow/red 박아도 **BL로 등록하지 않음**:

| check | 사유 |
|---|---|
| `vercel_sync == yellow` | 5~10분이면 자동 정상화 (이미 health-bot이 빈 commit 복구 시도) — flapping 방지 |
| `vercel_quota == yellow` | 24h 안에 자연 감소 — 정보성 |
| `bots == unknown` (전체 unknown만) | rate limit 일시 현상 — flapping 방지 |

**원칙**: "사람이 손대야 해소되는" 것만 BL. "기다리면 풀리는" 것은 정보성으로 남김.

---

## 10. 변경 이력

| 날짜 | 변경 | 작성자 |
|---|---|---|
| 2026-05-11 | 초기 제정 (BL-BASELINE-AUTO-TASK) | 클로드 (대표님 결정) |

---

**Last updated**: 2026-05-11
**Maintained by**: 클로드 (under direction of 이지형 대표님)
**Length budget**: 300줄 이하 유지
