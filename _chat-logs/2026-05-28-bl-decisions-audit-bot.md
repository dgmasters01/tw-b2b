---
slug: 2026-05-28-bl-decisions-audit-bot
title: 결정 기록 누락 자동 감지 봇 (D5 위반 잡기)
date: 2026-05-28
tasks: [BL-DECISIONS-AUDIT-BOT]
commits: [00db903]
decisions: [D5, D15]
---

## 🎯 한 줄 요약
결정을 박고서 기록(사람용·검색용 2벌)을 깜빡하면, 매일 밤 자동 점검 일꾼이 잡아서 관리 화면 맨 위에 빨갛게 띄워줍니다.

## 📍 왜 발생했나
어제(5/27) 사고가 증거였습니다. "결정 생기면 2벌로 기록하기" 규칙은 있었는데, 5개 채팅 동안 한 번도 안 지켜져서 밀린 일이 7건 쌓였습니다. 사람 의지에 기대는 규칙은 깨집니다. 그래서 사람 손 없이 자동으로 잡는 장치를 박았습니다.

## 🛠 어떻게 해결했나
이미 10분마다 돌고 있는 건강 검진 일꾼 안에 점검 항목 하나를 더 끼웠습니다. 최근 하루치 작업 기록을 훑어서 "결정"이라는 신호가 보이는데 결정 기록 파일이 함께 저장 안 됐으면 빨간불을 켭니다. 새 일꾼을 따로 만들지 않고 기존 일꾼에 합쳐서, 관리 화면이 별도 손질 없이도 자동으로 빨간불을 보여줍니다.

## ✅ 결과
이제 결정 기록을 빠뜨리면 → 관리 화면 맨 위 띠가 빨갛게 바뀌고 어느 작업에서 빠뜨렸는지까지 표시됩니다. 다음 채팅이 헤맬 일이 줄어듭니다.
→ 어디 가서 뭐 누르면 뭐 보임: gohotelwinners.com/admin-status.html 맨 위 상태 띠 — 결정 기록 누락 시 빨간색 + "결정 N건 기록 안 됨" 표시.

## ⏱ 다음 결정 필요
한 가지 작은 선택지가 있습니다. 지금은 빨간불이 화면 맨 위 "상태 띠"에 섞여 나옵니다. 이걸 따로 큰 빨간 카드로 더 눈에 띄게 만들지 여부 — 다만 그 작업은 관리 화면 파일이 9천 줄짜라 별도 채팅에서 하는 게 안전합니다. (지금 핵심 기능은 다 작동)

---

# 🔧 기술 상세 (개발자용)

## 작업
- **task**: BL-DECISIONS-AUDIT-BOT (P1, order 1)
- **commit**: `00db903` — `_os/scripts/health_check_admin.mjs` (253 → 350줄)

## 설계 결정
- **신규 워크플로 안 만듦**: GitHub PAT `workflow` 스코프 차단(CLAUDE.md §2) → `.github/workflows/*.yml` 자동 창구 push 불가. 정석은 이미 10분 cron으로 도는 `health-check-admin.yml`이 실행하는 `health_check_admin.mjs`에 체크 함수 1개 추가.
- **단일 진실원 유지**: 별도 `_decisions-audit.json` 안 만들고 기존 `_admin/_health.json` checks 배열에 `decisions_sync` 항목 추가. admin-status `render()`가 이미 `d.checks` 순회 + `missing_source`를 "누락 ID 예시"로 표출 → admin-status.html 무수정(부칙 19 폴링 등록 불필요, 기존 단일 render 경로 재사용).

## checkDecisionsSync() 로직
1. `git log --since="24 hours ago"` subject+body 수집 (workflow checkout = fetch-depth:0이라 동작)
2. 결정 신호 키워드 grep: `\bD\d{1,3}\b`, `[헌법변경]`, `\bAGR-\d{3,4}\b`, `결정`, `decision`, `정책`, `합의`
3. 봇 commit 제외(`[sync-bot]`/`[scan-bot]`/`[health-bot]`/`[auto-detect-bot]`/`[activity-bot]`/`[chat-log-bot]`)
4. 같은 24h 내 `_os/charter/decisions-index.md` OR `_business/decisions/` 변경 commit 존재 여부(`git log --name-only`)
5. 결정 신호 있음 + 기록 파일 미변경 → `status:'red'` + `missing_source`에 누락 commit sha 담음
6. git 조회 실패 시 `status:'unknown'` graceful skip

## Self-QA (4종 시나리오, 전부 통과)
- A 결정commit + 기록저장 → 🟢 green
- B 결정commit + 기록누락 → 🔴 red + missing_source
- C 무결정 일반commit → 🟢 green
- D 봇 commit만(결정 신호 위장) → 🟢 green (노이즈 제외)
- `node --check` 문법 통과

## 미완 / 후속
- admin-status.html 전용 빨간 "결정 누락 카드" 강조 — 9358줄 거대 파일이라 부칙 16.1ⓓ에 따라 별도 채팅 권장. 현재는 상단 health 배너에 자동 통합 표출됨(기능 완결).
