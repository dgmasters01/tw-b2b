# WIP: sync-bot 멈춤 빨간불 — 근본원인 규명, 해소 미완 (2026-05-28)

## 한 줄 결론
점검판 빨간불 2개(tasks_schema + bots/sync-bot)는 **같은 뿌리** = tasks.json에 "출처(source) 없는 작업 3건"이 있어서 발생. **출처만 채우면 둘 다 풀림.** GitHub 설정파일·대표님 수동작업 불필요 — 우리 자동 창구로 됨. (대표님 지적이 맞았음)

## 출처 없는 작업 3건 (점검봇 missing_source)
- BL-ADMIN-ANALYTICS-STICKY-MENU (=직전 B작업, 실작업 완료 commit dc5fb10)
- BL-ANALYTICS-HOTEL-INFO-WIRE (=직전 C작업, 실작업 완료 commit 035cf27)
- BL-MANAGER-PAGES-BOOKING-WIRE
→ 셋 다 auto-detect-bot이 commit 보고 자동생성한 작업이라 source 필드가 빔.

## 점검봇 판정 기준 (확인 완료)
- _os/scripts/health_check_admin.mjs L86: `tasks.filter(t => !t.source)` → 출처없는 작업 0건이면 green.
- bots check L100~: sync-bot 죽음은 워크플로 env(SYNC_BOT_STATUS=failure)로 주입. 출처누락이 직접 원인 표시됨.

## ⚠️ 미해소 — 막힌 지점 (다음 채팅 1순위)
tasks.json에 source 박아서 commit 2번 시도(4443992, 6804256) 했으나 **둘 다 즉시 덮어써짐.**
- 증상: 내 commit 직후 라이브 tasks.json이 head_commit=13def26 / updated_at=2026-05-28T04:34:09Z 로 **계속 되돌아감.**
- 내 commit 시점(4443992) 스냅샷은 출처 0건으로 완벽했음 → 쓰기는 됐는데 누가 옛 버전(04:34)으로 되돌림.
- race 최소화(받기→고치기→즉시쓰기) 재시도도 동일 실패 → race 아니라 **구조적 덮어쓰기**.

## 다음 채팅 해야 할 일
1. 누가 04:34 버전 tasks.json을 계속 되돌리는지 범인 특정:
   - 의심: GitHub Actions 워크플로 중 tasks.json을 자기 캐시본으로 재커밋하는 step (sync_engine --apply? build_tasks_json? auto-task-bot?)
   - 확인법: github actions 실행 로그 또는 .github/workflows/*.yml 에서 tasks.json write+commit 하는 워크플로 찾기 (※ 워크플로 파일 수정은 PAT 막힘 → 읽기만, 수정필요시 대표님께 보고)
2. 범인이 tasks.json을 통째로 덮으면 → source 보강이 그 워크플로 입력단(소스 .md 또는 봇 생성 로직)에서 이뤄져야 영구 반영됨.
3. 또는: 점검봇 기준을 "source==auto_from_commit 도 정상 인정"으로 두고, 봇 생성 작업에 자동으로 그 값 박게 (근본).

## 검증된 사실 (재사용)
- sync_engine.py(_os/scripts/, 600줄)는 tasks.json을 **읽기만** 함(단방향). 얘가 덮는 범인은 아님.
- build_tasks_json.py(487줄)는 소스 .md(BACKLOG/CHANGELOG/SOLO_WORK_QUEUE) → tasks.json 초기 변환기. BL-고유ID는 못 만들고 BL-순번/CHG-N만 생성.
- 자동 창구: POST gohotelwinners.com/api/ops/github-commit, x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK, body{path,content,message,branch}. 정상작동 확인.

## 같이 끝낸 것 (이번 채팅)
- ✅ A작업 인박스 7카드 = 직전 채팅 commit 991c874 (완료, 별개)
- ✅ B/C chat-log 2개 박음: 41df840, 06c8d23 (이건 안 덮임, 살아있음)
