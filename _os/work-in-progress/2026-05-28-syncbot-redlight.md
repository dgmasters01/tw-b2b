# WIP: sync-bot 멈춤 빨간불 — ✅ 해소 완료 (2026-05-28 갱신)

## 한 줄 결론 (최종)
**빨간불 2개(tasks_schema + bots/sync-bot) 둘 다 이미 사라짐. 점검판 🔴 0건 확인.**
원인은 "구조적 덮어쓰기"가 **아니라** autoheal 봇과 내 commit 사이의 **시간차(race)** 오인이었음.
내 마지막 commit(6804256) → `health-autoheal-on-push` 봇 트리거 → 봇이 04:59에 source 누락분
전부 자동 박음(fallback 포함) → tasks.json 정상화 → tasks_schema green + sync-bot green.

## 검증된 최종 상태 (2026-05-28 라이브)
- tasks.json: updated_at 2026-05-28T04:59:38, 총 262건, **source 누락 0건** 🟢
- _admin/_health.json: overall=yellow, **🔴 0건**
  - 🟢 tasks_schema / bots / vercel_quota
  - 🟡 admin_baseline(관리자 페이지 원본과 차이 — 정보성, 대표님 의도 점검 안내)
  - 🟡 vercel_sync(라이브가 최신 commit 못 따라잡음 — 5~10분 후 자동 정상화, 시간이 해결)

## "범인" 진상 (재발 방지용 사실 기록)
- 진짜 범인은 없었음. tasks.json을 통째로 덮는 악성 워크플로 없음.
- tasks.json을 직접 write+commit 하는 워크플로 5개(auto-detect-task-status / auto-task-from-health /
  health-autoheal-on-push / ops-mail-on-task-done / step-self-verify) + sync.yml(git add -A) 전수 확인.
  → 전부 정상 자동화. 특히 **scripts/tasks-source-autoheal.js**는 source 박는 우리 편(L106 fallback으로
  매핑 없어도 `autoheal:category-date` 무조건 박음 → source 누락 0 보장).
- 직전 채팅에서 "내 commit이 즉시 04:34 버전으로 덮어써짐"으로 본 증상 = autoheal 봇이 아직 안 돈
  시점의 스냅샷을 본 것. 봇이 몇 분 뒤 끝까지 일을 마치며 정상화함. race를 구조적 덮어쓰기로 오인.

## 남은 후속 (선택, 시급도 낮음)
1. tasks.json `head_commit` 필드가 13def26로 고정 — updated_at(04:59)과 불일치. 어느 봇도 이 필드를
   갱신 안 하는 듯. 점검 판정에는 안 쓰이므로(미사용 필드) 영향 없음. 정리하려면 sync_engine 출력단 점검.
2. admin_baseline yellow: 관리자 페이지 3개 원본 차이 — 대표님이 의도한 수정인지만 확인하면 green 처리 가능.

## 결론
이 WIP 건은 종료. 다음 채팅 1순위에서 제외. 빨간불 추적 목표 달성.
