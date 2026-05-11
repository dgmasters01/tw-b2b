# 2026-05-10 BL-AUTO-REORDER-PAUSE — 자동 재정렬 + 잠시 멈춤 시스템

**작업 단위**: BL-AUTO-REORDER-PAUSE (실시간 우선순위 자동 재정렬 + 작업 길 잃지 않게)
**단계**: 1~7단계 한 commit
**HEAD before**: (이전 commit)
**HEAD after**: 13d50aa
**라이브 영향**: 새 P0 들어오면 자동 재정렬 + 기존 작업 paused 보존 + 이어가기 버튼

---

## [블록 1] 왜 박았나 — 대표님 진단 (2026-05-10)

> "새 P0 들어오면 이전 진행 중이 사라짐. 작업이 길을 잃음. 매번 채팅이 끊겨 어디까지 했는지 모름."

**확인된 사고 패턴**:
1. 채팅 끊김 후 재시작 → 이전 in_progress 작업이 의식에서 사라짐
2. 새 P0 박으면 기존 작업 우선순위 강등 안 됨 → "지금 뭐 해야 하지?" 발생
3. paused 상태 자체가 없어서 "잠시 멈춤"이 시스템에 존재하지 않음

**원인**: tasks.json에 `in_progress`와 `done`만 있고 그 사이 상태 없음.

---

## [블록 2] 무엇을 박았나 — 5개 파일

| # | 파일 | 무엇 |
|---|---|---|
| 1 | `tasks.json` | `paused` 상태 신설 + `paused_at` / `paused_step` / `paused_reason` 필드 |
| 2 | `api/decision.js` | `bl-promote-p0` 액션 — 새 P0 박을 때 기존 in_progress 자동 paused 강등 |
| 3 | `admin-status.html` | ⏸️ "잠시 멈춤" 큰 카드 + 이어가기 버튼 (인계서 자동 복사) |
| 4 | `_os/playbook/auto-reorder-pause.md` | 디테일 룰 (부칙 14 — 헌법 아닌 playbook에 박기) |
| 5 | tasks.json BL-AUTO-REORDER-PAUSE 본체 | 7단계 progress 박기 |

---

## [블록 3] 어떻게 동작하나 — 4줄 요약

- **어디서**: admin-status.html ⏸️ 잠시 멈춤 큰 카드
- **무엇이**: paused 작업 목록 + paused_at / paused_step / paused_reason 표시
- **어떻게**: 이어가기 버튼 클릭 → in_progress 복원 + 인계서 클립보드 자동 복사 + ops 알림
- **결과**: 채팅 끊겨도 작업 길 잃지 않음. 대표님은 admin-status만 보면 다음 작업 즉시 파악

---

## [블록 4] 무엇이 달라지나 — 사업가 시점

| Before | After |
|---|---|
| 채팅 끊기면 "지금 뭐 하던 중이었지?" | admin-status 열면 ⏸️ 카드에 즉시 보임 |
| 새 P0 박으면 기존 작업이 우선순위 표에서 사라짐 | 자동 paused 강등 + 멈춘 이유 기록 |
| 이어가기 = 대표님이 인계서 찾아 복붙 | 이어가기 버튼 한 번 = 인계서 자동 클립보드 |

---

## [블록 5] 다음 행동 — 사후 점검 (2026-05-11)

**라이브 점검에서 발견된 누락 (이 chat-log로 보수)**:
1. ❌ `step 6: 헌법 부칙 — 새 P0 박을 때 자동 재정렬 규칙` 텍스트가 misleading
   - 실제로는 playbook에 박힘 (부칙 14 의무) — 헌법 본문 부칙 신설 아님
   - 정정: "playbook 박기"
2. ❌ chat-log 누락 (부칙 15 위반) → **본 파일이 그 보수**
3. ✅ index.json byTask 매핑 — 본 commit에 포함

**재발 방지 BL 신규 박음**: `BL-STEP-SELF-VERIFY` — step 텍스트에 "헌법/부칙/playbook/chat-log/commit" 키워드 있으면 done 처리 전 실제 파일 변경 자동 검증
