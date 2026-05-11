# step 자가 검증 (Step Self-Verify)

**박힘**: 2026-05-11
**근거**: BL-AUTO-REORDER-PAUSE step 6 거짓 done 사고 (2026-05-10)
**부칙 14 준수**: 헌법 본문에 박지 않고 playbook에 박음

---

## 문제 (2026-05-10 사고)

BL-AUTO-REORDER-PAUSE의 step 6 텍스트:
> "6. 헌법 부칙 — 새 P0 박을 때 자동 재정렬 규칙"

실제 박힌 것:
- ✅ `_os/playbook/auto-reorder-pause.md` 신설 (playbook에 박음)
- ❌ OPERATIONS_CHARTER.md 부칙 17 신설 안 함 (텍스트와 mismatch)
- ❌ chat-log 누락 (부칙 15 위반)

**결과**: step 7 "라이브 검증"까지 done 처리. 다음 날 검증에서 발견.

---

## 규칙 — 키워드별 강제 산출물

step 텍스트에 다음 키워드가 있으면 done 처리 전 실제 파일 변경을 검증한다:

| 키워드 | 필수 산출물 | 검증 방법 |
|---|---|---|
| **헌법 / 부칙 (N 신설)** | `OPERATIONS_CHARTER.md` 변경 | `git diff HEAD~1 -- OPERATIONS_CHARTER.md` 줄 수 ≥ 1 + 새 `**부칙 N`** 패턴 매치 |
| **playbook** | `_os/playbook/*.md` 신규/수정 | `git diff --name-only` 에 `_os/playbook/` 포함 |
| **chat-log** | `_chat-logs/{date}-{slug}.md` + index byTask 매핑 | 파일 존재 + 다음 cron 후 byTask에 task_id 포함 |
| **commit** | git commit subject에 `[step:done:N]` 태그 | `git log -1 --pretty=%s` 매치 |
| **마이그레이션** | 명시된 파일 모두 diff | 텍스트 내 파일명 추출 → 모두 변경 확인 |
| **라이브 검증** | 명시된 URL 모두 fetch 200 | URL 추출 → curl -I 200/302 확인 |

---

## 자동화

`_os/scripts/auto-detect-bot.mjs` (또는 신규 `step-self-verify-bot.mjs`)에서:

1. tasks.json에서 status 트랜지션 감지 (in_progress → done)
2. 해당 task의 steps[].name 텍스트 스캔
3. 위 키워드 테이블 매치
4. 매치된 키워드별 필수 산출물 검증
5. 미충족 시:
   - tasks.json 자동 롤백 (done → in_progress)
   - notes에 ⚠️ 워닝 추가: `"step N: '{키워드}' 명시했으나 산출물 미확인. 보수 필요."`
   - ops 알림 발송 (`POST /api/email/ops/notify-claude-work`)

---

## 예외 / 면책

다음 경우는 검증 통과:
- step 텍스트에 "(자동 생성)" 또는 "(봇 처리)" 명시 — 봇이 별도 commit에서 처리
- step 텍스트에 `--skip-verify` 태그 — 대표님 명시적 우회 (사고 시 인지)

---

## 효과

- step 텍스트와 실제 행동의 불일치 사고 차단
- 부칙 14 (헌법 vs playbook 혼동) 사고 차단
- 부칙 15 (chat-log 누락) 사고 차단
- 라이브 검증 거짓 done 차단
