---
slug: 2026-05-08-bl-chatlog-auto-gate
title: BL-CHATLOG-AUTO-GATE — chat-log 박기 자동 강제 게이트 (부칙 15 신설)
date: 2026-05-08
commits: [3cff5c7, cf33be2, 0237893, 6db94ce]
tasks: [BL-CHATLOG-AUTO-GATE]
decisions: [D-014]
---

# BL-CHATLOG-AUTO-GATE — chat-log 박기 자동 강제 게이트

## 🎯 무엇을
BL 작업 done 트랜지션 시 `_chat-logs/index.json byTask` 매핑을 자동 검증하는 게이트를 헌법(부칙 15) + 봇(auto-detect) 양쪽에 박았다.

## 📍 왜 (결함 본질)
선행 작업 **BL-ACT-INDEX-RESTORE** 진행 중 chat-log를 박지 않아서 4개 commit (`67273d8`, `aa5dcd6`, `2ec94a3`, `f1c06fa`) 모두 `byCommit` 매핑 실패 → admin-status 활동이력 펼침에서 "기록 못 찾음" 발생. byCommit 시간근접 fallback이 일부 메웠지만, **byTask 매핑 강제**가 본질 해법.

원인은 단순: 사람이 잊어버려도 시스템이 자동으로 못 막았다. 부칙 7(progress.steps 강제)과 같은 패턴으로 부칙 15 신설 + auto-detect-bot 검증 게이트.

## 🛠️ 구현 (5단계)

**1단계** — `tasks.json` BL-CHATLOG-AUTO-GATE에 progress.steps 5개 박기 + 부칙 7 워닝 자가치유 (commit `3cff5c7`).

**2단계** — `OPERATIONS_CHARTER.md` 부칙 15 신설 (1줄, 200줄 제한 준수, 현재 165줄). 디테일은 playbook 참조 패턴 (commit `cf33be2`).

**3단계** — `_os/playbook/chatlog-auto-gate.md` 신설. 의무·검증게이트·자가치유·예외(`chatlog_exempt: true` / `META-` prefix)·작성형식·운영흐름 모두 박음 (commit `0237893`).

**4단계** — `_os/scripts/auto_detect_task_status.py` 패치 (commit `6db94ce`):
- `update_task()` 시그니처에 `chatlog_by_task: dict | None = None` 추가
- done 트랜지션 직후 `byTask[task.id]` 매핑 검증, 없으면 `task['chatlog_warning']` 박음
- 매핑 박힌 done 작업에 기존 워닝 있으면 자가 치유
- 면제: `chatlog_exempt: true` 또는 `META-` prefix
- `process_commits()`에서 `_chat-logs/index.json` 로드해 인자 전달
- summary에 `chatlog_warnings` 별도 수집 + main에서 콘솔/GitHub Actions Summary 출력
- **단위 테스트 6/6 통과** (매핑없음/매핑있음/자가치유/exempt/META-/in_progress 무영향)

**5단계** — chat-log 박기 + DECISIONS D-014 + tasks.json `[done]` commit (이 commit이 부칙 15 첫 자기검증).

## 🔍 검증

- dry-run: `python3 _os/scripts/auto_detect_task_status.py --dry-run` → 부칙 15 워닝 0건 (정상 in_progress 트랜지션, 아직 done 미발생).
- 단위 테스트 6 케이스 모두 통과 (인라인 Python).
- 라이브 검증: 5단계 commit (`[done]` 태그) 후 `git push` → GitHub Actions의 auto-detect-bot이 BL-CHATLOG-AUTO-GATE done 트랜지션 처리 → 이 chat-log가 byTask에 매핑돼있으므로 부칙 15 워닝 0건이 정답.

## ⚠️ 영향 범위

- 기존 done 작업: 영향 없음 (현재 done 상태는 봇이 자동 리오픈하지 않음 — 2026-05-06 기존 룰).
- 앞으로의 done 트랜지션: chat-log byTask 매핑 의무. 박지 않으면 워닝 노출.
- admin-status UI: `chatlog_warning` 신호를 카드에 ⚠️ 노출하는 UI는 후속 BL로 분리 (1차는 데이터 신호만 박음).

## 🧠 교훈

부칙 7(progress.steps)을 박을 때 동시에 부칙 15(chat-log)도 박았어야 했다. "자동화 게이트는 중복으로 보이더라도 누락보다 낫다." 사람이 잊을 수 있는 모든 의무는 봇이 검증해야 한다 — 헌법에 명문 + 봇 코드 양쪽.
