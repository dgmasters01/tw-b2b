# 다음 작업 인계 (가벼움 — 의무 헤더 prepend 금지)

일호기/여행능력자들. 한국어, "대표님" 호칭.

## 첫 행동
_os/INDEX.md + OPERATIONS_CHARTER.md + CLAUDE.md fetch → 헌법 자가검증.

## 🔴 1순위 작업: 새 채팅 출발선 비대 해결 (BL-CONTEXT-STARTUP-DIET 제안)
**증상:** 빈 새 채팅에 한 줄만 붙여도 "대화가 너무 길어 계속 불가" 경고. 인계문 길이는 원인 아님(한 줄에도 발생, 검증됨).
**진단(과거 이력 근거):** 2026-04-23 동일사고 → 당시 원인=새 채팅이 누적 컨텍스트를 시작부터 통째 로드. 2026-05-26~27 메모리 27→7줄 압축으로 완화했으나, 이후 메모리가 다시 수십 줄로 비대해짐 → 출발선 재포화.
**해야 할 일 (출발선 오버헤드 줄이기):**
1. memory_user_edits view로 현재 메모리 점검 → 비대분 식별.
2. 핵심만 메모리에 남기고 나머지는 _os/memory-archive/ 로 보냄(과거 패턴 재적용, INDEX.md 경유 복원). ※remove는 비가역 — 아카이브 commit·검증 후 삭제.
3. 작업별 커넥터 정책 문서화: TW B2B 코드작업=커넥터 0개(bash curl+commit창구로 충분), 메일/Drive/Vercel은 해당 작업 시에만 켬. _os/playbook/ 에 박고 INDEX.md 링크.
4. 압축 후 새 채팅 시뮬레이션으로 출발선 여유 회복 검증.
※시작 전: 북극성("새 채팅이 시작부터 꽉 차 작업 불가" 문제 해소)·중복점검(과거 memory-archive 5종 이미 존재)·한채팅한결정.

## 직전 완료 (2026-05-30, BL-AUTO-DECISIONS-SYNC-GENERAL 해소)
- D-050·D-051 → _os/charter/decisions-index.md(D17·D18) + _business/decisions/2026-05-30-handoff-d050-d051.md 2벌저장.
- health_check_admin.mjs BOT_PREFIXES에 verification-gap-bot·decision-tracking-bot·auto-task-bot 추가(오탐 fix). commit·검증 완료. decisions_sync green 자동 done 대기.

## 그 다음 작업(출발선 해결 후)
tasks.json raw fetch → pending 중 priority·order 최소 자동 선정. approval_required=true 제외(BL-PRELAUNCH-CLEANUP 승인필요라 자동 진행 금지).

## 환경
repo dgmasters01/tw-b2b(main). raw=bash curl 무인증. commit창구 POST gohotelwinners.com/api/ops/github-commit, header x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK, body{path,content,message}. content=plain text(base64 금지 D12). jq 없음→python3. GitHub API 한도낮음→raw·.patch 우선.
