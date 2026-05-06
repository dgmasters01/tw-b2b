---
slug: 2026-05-06-bl-progress-sync-os-handoff-sync
title: "BL-PROGRESS-SYNC-OS — 작업 단계 진행률 + 어드민 화면 자동 동기화 시스템"
date: 2026-05-06
tasks: [BL-DECISION-MODAL-V2-PHASE-B, BL-PROGRESS-BAR-OS, BL-PROGRESS-SYNC-OS]
phase: implementation
related_decisions: ["헌법 12조 (그림 일치)", "헌법 부칙 7 (단계 단위 commit + step 태그 의무)"]
---

## 🎯 한 줄 요약
대표님이 "이어가기 붙여 넣고 다른 일 하다 돌아왔는데 어디까지 했는지 몰라서 잘못되면 중복이 된다"는 문제 제기. 이 문제를 풀기 위해 (1) 진행률 바 UI + 단계 체크리스트 (2) 봇 자동 step 갱신 (3) 인계서 라이브 fetch + 다음 시작 단계 명시 — 3단 동기화 시스템을 한 채팅에서 박았습니다. 헌법 부칙 7로 영구 의무화.

## 📍 왜 발생했나
PHASE-B 작업 시작 후 대표님이 화면 보고 단계별 진행률 표시 요청 → 진행률 바 UI 박았으나 → 옆에 깔끔하게 접고 펼치는 토글 추가 → 인계서에 [object Object] 깨짐 발견 → 그 과정에서 대표님이 본질적 통찰:

> "이어가기를 붙여 넣고 다른 작업을 하다가 왔어. 다시 시작할려고 하는데 어디까지 했는지 몰라서 현황판을 보고 진행중인거를 이어가기를 붙어 넣어서 그러면 그다음을 진행되어야 되는지 지금처럼 잘못되면 중복이 되잖아."

이 통찰은 단순 버그 리포트가 아니라 **"무인 운영의 본질이 뭔지"** 를 지적. Claude가 작업했어도 화면이 모르면 = 그림 깨짐 = 헌법 12조 본질 위반.

## 🛠 어떻게 해결했나

### 1. 진행률 바 UI (commit a371f03)
- tasks.json progress 스키마 확장: steps[], percent, completed_count, total_count
- 진행 중 박스에 진행률 영역 추가 (헤드 + 바 + 단계 리스트)
- 헤드 클릭 = 단계 펼침/접음 토글 (기본 접힘 — 화면 길이 200px → 50px)
- PHASE-B 8단계 박힘

### 2. 인계서 [object Object] 버그 수정 (commit 6c43364)
- buildHandoffMessage가 progress 객체를 toString해서 [object Object] 깨짐
- 객체이면 단계 체크리스트 마크다운으로 풀어 출력
- 다음 시작 단계는 ⏳ + 굵게 표시

### 3. 봇 자동 step 갱신 (commit 591fd71 — 핵심)
**scripts/auto_detect_task_status.py**:
- STEP_DONE_PATTERN 정규식 추가: `\[step:done:([\d,\s]+)\]`
- update_task에 step 갱신 로직: subject에 태그 있으면 progress.steps[idx].done = true + at + percent 재계산
- history event에 단계 완료 기록 ('단계 3 완료 (auto-detected)')
- 4 케이스 테스트 통과:
  1. `[step:done:3]` → step3 done + percent 38%
  2. `[step:done:3,4]` → step3, step4 둘 다 + percent 50%
  3. 태그 없음 → 변화 없음
  4. 인덱스 99 → 안전 처리

### 4. 인계서 진행률 요약 섹션 (commit 591fd71)
**buildHandoffMessage**에 라우팅 신호 직후 새 섹션:
- '## 🎯 어디부터 이어갈지 (라이브 tasks.json 기준)'
- 라이브 fetch (cache buster) 로 받은 최신 데이터 기반
- 다음 시작 단계 명시 + 멱등성 의무 + commit 의무 + 예시 박힘

### 5. 인계서 최근 commit hash 라이브 fetch (이번 commit)
- tasksData.head_commit은 Actions 갱신 시점 기준이라 한 박자 늦음
- GitHub API에서 진짜 최신 commit 직접 fetch
- 실패 시 fallback (rate limit 등)
- commit 메시지도 같이 박힘

### 6. 헌법 부칙 7 신설 (이번 commit)
**OPERATIONS_CHARTER.md 부칙 7**:
- 모든 작업 시작 = 단계 박는다 의무
- 단계 1개 = commit 1개 (큰 묶음 push 금지)
- commit subject에 [step:done:N] 태그 박는다
- 이어가기 = 라이브 fetch + 다음 시작 단계부터 (이미 done은 안 건드림)

## ✅ 결과 — 동기화 작동 흐름

대표님이 이제 겪을 흐름:
1. 어드민에서 ▶ 이어가기 클릭
2. 인계서 클립보드 복사 — 라이브 fetch 기준 최신 상태:
   - 진행률 25% (2/8)
   - 다음 시작 단계: ⏳ 3. 결정 모달 V2 좌우 분할
   - 최근 commit: 591fd71 (실시간)
3. 새 채팅 붙여넣기 → 단계 3 작업
4. 단계 3 끝 → commit subject `fix(...): 좌우 분할 완성 [step:done:3]` → push
5. **봇 자동으로** progress.steps[2].done = true + percent 38%
6. 어드민 5초 폴링 → 화면 자동 갱신
7. 대표님 다시 이어가기 누르면 → 단계 4가 다음 시작 단계로 자동 표시
8. **중복 0, 누락 0, 동기화 자동**

## 🚀 다음 단계
PHASE-B 단계 3 본 작업 시작. 끝나면 `[step:done:3]` 태그로 commit → 봇 자동 갱신 라이브 검증.

## 자체 검증 (헌법 12조)
- ✅ JS 문법 통과 (node --check)
- ✅ Python 문법 통과 (ast.parse)
- ✅ 봇 4 케이스 테스트 통과
- ✅ 인계서 시뮬레이션 정상 출력
- ✅ 라이브 main raw에 모든 코드 박힘 확인
- ✅ PHASE-B in_progress 1개 + 25% 유지 (봇이 어떤 commit도 안 망침)

## commits
- a371f03 — fix(admin-status): 진행률 단계 리스트 기본 접힘 + 클릭 펼침
- 6c43364 — fix(admin-status): 인계서 빌더 progress 객체 처리 — [object Object] 버그 수정
- 591fd71 — feat(progress-sync): 봇 step 자동 갱신 + 인계서 다음 시작 단계 명시
- (이 commit) — feat(charter): 부칙 7 + 인계서 최근 commit 라이브 fetch + chat-log
