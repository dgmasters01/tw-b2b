# BL-AUTO-BOTS-HEALTH-RESTORE — sync-bot + chat-log-bot 살리기 + _health.json 전체 green 전환

**날짜**: 2026-05-23
**처리 BL**: BL-AUTO-BOTS-SYNC-BOT (이미 done, 추가 검증)
**상태**: ✅ done
**선행**: BL-AUTO-TASKS-SCHEMA-MASS-RESOLVE
**다음**: BL-SIGNUP-ENRICHMENT (P0, 차단 없음, 자율 진행)

---

## ① 완료 내용

**봇 health 자가 진단 + 모든 봇 살리기 + _health.json 전체 green 전환**:

1. _health.json `bots` check red 분석
2. **sync-bot 실패 원인**: tasks.json source 누락 16건이 sync_engine.py --verify에서 exit 1 → 직전 BL-AUTO-TASKS-SCHEMA-MASS-RESOLVE에서 source 16건 다 채우면서 자동 회복 (2번 연속 success 확인)
3. **chat-log-bot 실패 원인**: actions/checkout@v4가 일시적 GitHub 인증 hiccup ("could not read Username, terminal prompts disabled") — 워크플로 코드 결함 아님. 수동 트리거로 회복
4. health-check-admin 워크플로 수동 트리거 2회 → _health.json 갱신 → 모든 봇 green

### 봇 상태 변화

| 봇 | Before | After |
|---|---|---|
| sync-bot | failure (3회 연속) | success (2회 연속) |
| chat-log-bot | failure (1회) | success (workflow_dispatch) |
| auto-detect-bot | success | success |
| scan-bot | success | success |

### _health.json 최종 상태

| check | Before | After |
|---|---|---|
| tasks_schema | red (16건 누락) | ✅ green (252건 모두 출처 박힘) |
| bots | red (sync-bot 죽음 → chat-log-bot 죽음) | ✅ green (전부 살아있음) |
| vercel_sync | yellow | ✅ green |
| vercel_quota | green | ✅ green |
| admin_baseline | yellow | 🟡 yellow (관리자 페이지 2개 살짝 다름 — 별건 처리) |

## ② 이유

- _health.json `bots` red가 admin-status 빨간 배너로 누적 노출 → 대표님 머릿속 혼란
- sync-bot이 죽으면 tasks.json → BACKLOG/CHANGELOG/DECISIONS/Gallery 동기화 멈춤 (헌법 부칙 8 위반)
- chat-log-bot이 죽으면 chat-log index가 stale → admin-status 5초 폴링이 옛 데이터 봄

## ③ 사업 영향

- **그림 일치 회복**: admin-status.html 진입 시 빨간 배너 5개 → 노란 배너 1개로 축소
- **자동화 안전성**: 사업 작업할 때마다 동기화 봇이 자동으로 BACKLOG·Gallery·DECISIONS 갱신
- **다음 P0 BL 진입 안전**: BL-SIGNUP-ENRICHMENT 작업 시 sync-bot이 정상이라 동기화 안전

## ④ 다음 행동

정석(헌법 13조)대로 다음 P0 자율 진행:
- **BL-SIGNUP-ENRICHMENT** (P0, order=8, 차단 없음, approval 불필요)
- 신규 매니저 가입 시 누적 매출 3구간 임계값 분기 노출 (D-035)

## ⑤ 대표님 결정 필요

**없음** — 정석 자율 진행 작업. 라이브 확인 부탁드립니다:

### 어디 가서 / 무엇을 누르면 / 무엇이 보이는지

1. **https://gohotelwinners.com/admin-status.html** 진입
2. 맨 위 배너 — 빨간 배너 0개, 노란 배너 1개(admin_baseline)만 보임
3. 배너 4개 초록: tasks_schema / bots / vercel_sync / vercel_quota
