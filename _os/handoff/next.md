# 다음 작업 인계 (가벼움 — 의무 헤더 prepend 금지)

일호기/여행능력자들. 한국어, "대표님" 호칭.

## 첫 행동
_os/INDEX.md + OPERATIONS_CHARTER.md + CLAUDE.md fetch → 헌법 자가검증.

## 직전 완료 (2026-05-30, BL-AUTO-DECISIONS-SYNC-GENERAL 해소)
- D-050·D-051을 _os/charter/decisions-index.md(D17·D18) + _business/decisions/2026-05-30-handoff-d050-d051.md 둘 다 2벌저장.
- health_check_admin.mjs BOT_PREFIXES에 verification-gap-bot·decision-tracking-bot·auto-task-bot 추가(오탐 fix).
- commit·라이브검증 완료. decisions_sync 점검봇 green 자동 done 대기.

## 다음 작업
tasks.json raw fetch → pending 중 priority(P0→P3)·order 오름차순 최소 1건 자동 선정.
※ approval_required=true는 거를 것. (BL-PRELAUNCH-CLEANUP은 승인 필요라 자동 진행 금지 — 메모리상 과거 위반 작업.)
선정 후 북극성·중복점검·한채팅한결정 박고 시작.

## 끊김 근본 fix (별도 BL 후보)
새 채팅이 인계문 무게로 정지하는 사고 반복. 원인: ①도구 자동 로드 ②handoff-header 자동 prepend로 인계문 비대.
→ 해결 방향: 채팅 붙여넣기는 한 줄(이 파일 포인터)만, 의무 헤더는 INDEX.md가 담당(인계문에 중복 prepend 금지). admin-status '다음추천 복사' 기능도 헤더 안 붙게 다이어트.

## 환경
repo dgmasters01/tw-b2b(main). raw=bash curl 무인증. commit창구 POST gohotelwinners.com/api/ops/github-commit, header x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK, body{path,content,message}. content=plain text(base64 금지 D12). jq 없음→python3. GitHub API 한도낮음→raw·.patch 우선.
