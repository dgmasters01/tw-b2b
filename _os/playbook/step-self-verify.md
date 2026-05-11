# step 자가 검증 (Step Self-Verify)

**박힘**: 2026-05-11
**근거**: BL-AUTO-REORDER-PAUSE step 6 거짓 done 사고 (2026-05-10)
**부칙 14 준수**: 헌법 본문에 박지 않고 playbook에 박음

---

## 문제 (2026-05-10 사고 — 봇 실증 검증 통과)

BL-AUTO-REORDER-PAUSE의 step 6 텍스트:
> "6. 헌법 부칙 — 새 P0 박을 때 자동 재정렬 규칙"

실제 박힌 것:
- ✅ `_os/playbook/auto-reorder-pause.md` 신설 (playbook에 박음)
- ❌ OPERATIONS_CHARTER.md 부칙 17 신설 안 함 (텍스트와 mismatch)
- ❌ chat-log 누락 (부칙 15 위반)

**결과**: step 7 "라이브 검증"까지 done 처리. 다음 날 검증에서 발견.

**봇 실증 (2026-05-11)**: 봇이 commit `09cc72b..13d50aa` dry-run 실행 결과:
```
❌ BL-AUTO-REORDER-PAUSE step 6 (chat-log): _chat-logs/*.md 신규 없음
⚠️ BL-AUTO-REORDER-PAUSE step 7: "라이브 검증" 키워드 — 봇이 검증 못 함
```
→ **어제 봇이 있었다면 사고 자동 차단했음**.

---

## 키워드 → 산출물 매핑 표

`_os/scripts/step-self-verify-bot.mjs`의 `KEYWORD_RULES`에 정의된 5개 룰:

| 룰 이름 | step 텍스트 매칭 패턴 | 필수 산출물 | 검증 방법 |
|---|---|---|---|
| **charter** | `헌법 부칙 N 신설/추가/박음`, `OPERATIONS_CHARTER.md`, `부칙 신설` | `OPERATIONS_CHARTER.md` 변경 + 새 `**부칙 N` 패턴 | `git diff` 파일 + diff 내용 정규식 |
| **playbook** | `playbook`, `_os/playbook` | `_os/playbook/*.md` 신규/수정 | `git diff --name-only` 매치 |
| **chat-log** | `chat-log`, `chat_log`, `_chat-logs` | `_chat-logs/*.md` 신규 | 파일 존재 (index.json byTask는 scan-bot이 5분 후 자동 처리) |
| **commit-step-tag** | `단계 commit`, `step commit`, `[step:done` | commit subject에 `[step:done:N]` 태그 | commit msg 정규식 |
| **live-verify** | `라이브 검증`, `live verify`, `production verify` | (봇 검증 불가) | ⚠️ 보고용 워닝만 — 채팅에서 curl 결과 확인 의무 |

---

## 동작 흐름

```
main push (사람 commit, [step:done:N] 태그 포함)
   ↓
GitHub Actions: step-self-verify.yml 트리거
   ↓
봇 commit 필터 (auto-detect-bot, step-verify-bot 등 6개 제외)
   ↓
step-self-verify-bot.mjs --since-commit <BEFORE>
   ↓
commit 범위 분석 → commit msg에서 task ID + [step:done:N] 추출
   ↓
해당 task의 progress.steps[N-1].name 텍스트 스캔
   ↓
KEYWORD_RULES 매칭 → verify(diffFiles, gitDiff) 호출
   ↓
미충족 시:
  - step.status: done → pending
  - step.verification_failed = {rule, reason, sha, at}
  - task.status: done → in_progress (롤백)
  - task.history += {event: 'step_verification_failed', ...}
  - task.notes 머리에 ⚠️ 워닝 prepend
   ↓
변경 있으면 [step-verify-bot] commit + push
   ↓
ops 알림 발송 (POST /api/email/ops/notify-claude-work)
   ↓
admin-status 5초 폴링이 변경 감지 → ⚠️ 워닝 작업 카드 노출
```

---

## 예외 / 면책

다음 경우는 검증 통과 또는 스킵:

| 상황 | 처리 |
|---|---|
| 봇 commit ([auto-detect-bot] 등 6개) | workflow `if` 조건으로 스킵 |
| step 텍스트에 키워드 없음 | 검증 대상 아님 — 통과 |
| commit msg에 `[step:done:N]` 태그 없음 | 자동 검증 안 함 — 부칙 7 위반 (별도 봇이 잡음) |
| `live-verify` 키워드 | 봇이 직접 검증 못 함 — 보고용 워닝만 발행, done 차단 안 함 |

**우회 태그**: step 텍스트에 `--skip-verify`를 명시하면 봇이 스킵 (대표님 명시적 우회용, 사고 시 인지).

---

## 위반 시 복구 절차 (대표님/Claude용)

봇이 ⚠️ 워닝 박았을 때:

1. **admin-status 열어서 ⚠️ 표시된 task 확인**
2. **`task.notes` 머리의 ⚠️ 워닝 메시지 읽기** — 어떤 step의 어떤 룰이 어떤 이유로 실패했는지
3. **누락 산출물 박기**:
   - `charter` 위반 → OPERATIONS_CHARTER.md에 부칙 추가 (부칙 14 확인: 정말 헌법에 박아야 하는지 vs playbook이 맞는지)
   - `playbook` 위반 → `_os/playbook/*.md` 신규/수정
   - `chat-log` 위반 → `_chat-logs/{date}-{slug}.md` 박기
   - `commit-step-tag` 위반 → 다음 commit subject에 태그 박기
4. **다시 done 처리하는 commit 박기** — `fix(BL-XXX): 누락분 보수 [step:done:N]`
5. **봇이 재검증** → 통과 시 정상 진행

---

## 향후 확장 후보

- **decision** 룰 — `D-XXX 확정` 키워드 → DECISIONS.md 변경 검증
- **vercel-deploy** 룰 — `배포` 키워드 → vercel API로 deployment status 검증
- **screenshot** 룰 — `Before/After` 키워드 → `docs/screenshots/` 신규 파일 검증

(BL-STEP-SELF-VERIFY-V2로 별도 박을 것 — 본 BL은 핵심 5개 룰만)
