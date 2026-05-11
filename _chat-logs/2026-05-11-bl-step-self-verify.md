# 2026-05-11 BL-STEP-SELF-VERIFY — step 자가 검증 봇 박기

**작업 단위**: BL-STEP-SELF-VERIFY (거짓 done 사고 재발 방지 봇)
**단계**: 1~5단계 5 commit
**HEAD before**: dba57fb
**HEAD after**: (이 commit)
**라이브 영향**: 앞으로 모든 main push에서 step 텍스트와 실제 산출물 자동 검증, 미충족 시 자동 롤백

---

## [블록 1] 왜 박았나 — 어제 사고 (2026-05-10)

> BL-AUTO-REORDER-PAUSE의 step 6 "헌법 부칙 — 새 P0 박을 때 자동 재정렬 규칙"이 done 처리됐지만, 실제로는 헌법에 박지 않고 playbook에 박았음. chat-log도 누락. 다음 날 점검에서야 발견.

**근본 원인**: step 텍스트와 실제 commit 산출물 사이에 자동 검증 장치가 없었음. Claude의 자가 점검에만 의존 → 흘림 사고.

**대표님 지적 (2026-05-11)**: "방향과 기준이 너가 흔들리면 안 되. 규칙의 내용을 잘 파악해고 작업을 해야 되."
→ 사람 의존 검증이 아닌 **시스템 강제 검증**이 답.

---

## [블록 2] 무엇을 박았나 — 3개 파일

| # | 파일 | 무엇 | 줄 수 |
|---|---|---|---|
| 1 | `_os/scripts/step-self-verify-bot.mjs` | 5룰 키워드별 산출물 검증 봇 (Node 20, mjs) | 278 |
| 2 | `.github/workflows/step-self-verify.yml` | push 트리거 + 자동 롤백 + ops 알림 워크플로 | 171 |
| 3 | `_os/playbook/step-self-verify.md` | 디테일 (5룰 매핑·동작 흐름·복구 절차·향후 확장) | 157 |

**합계**: 606줄 / **헌법 본문 0줄 변경** (부칙 14 준수)

---

## [블록 3] 어떻게 동작하나 — 4줄 요약

- **어디서**: main 브랜치 push 시 GitHub Actions 자동 실행
- **무엇이**: 5개 키워드 룰 (charter / playbook / chat-log / commit-step-tag / live-verify) 매칭 + 실제 commit diff 검증
- **어떻게**: 미충족 시 step.status / task.status 자동 롤백 + ⚠️ 워닝 prepend + history 박음 + [step-verify-bot] commit + ops 알림 발송
- **결과**: admin-status 열면 ⚠️ 표시 + notes 머리에 위반 사유. Claude/대표님이 누락분 박고 재commit하면 자동 재검증

---

## [블록 4] 무엇이 달라지나 — 사업가 시점

| Before (어제까지) | After (지금부터) |
|---|---|
| step "헌법 부칙 신설" done 처리해도 실제로 헌법 안 박음 → 사고 | 봇이 OPERATIONS_CHARTER.md diff 검증 → 미충족 시 done 차단 |
| chat-log 누락하고 done — 부칙 15 위반 흘러감 | 봇이 `_chat-logs/*.md` 신규 검증 → 미충족 시 자동 롤백 |
| Claude가 step 거짓 done 처리 가능 | 시스템이 거짓 done 차단. Claude 자가 점검 의존 0 |
| 사고 발견은 다음 날 대표님 점검 | 사고 발견은 push 후 1~2분 (GitHub Actions 자동) |

**핵심**: "방향과 기준이 흔들리면 안 됨"이 시스템으로 박힘. Claude의 의지·기억·규율에 의존하지 않음.

---

## [블록 5] 봇 자기 검증 결과 (2026-05-11)

### 어제 사고 dry-run 결과 (commit 09cc72b..13d50aa)
```
❌ BL-AUTO-REORDER-PAUSE step 6 (chat-log): _chat-logs/*.md 신규 없음
⚠️ BL-AUTO-REORDER-PAUSE step 7: "라이브 검증" 키워드 — 봇이 검증 못 함
📋 [DRY-RUN] 위반 1건 / 워닝 1건 발견
```
→ **어제 봇이 있었다면 step 6 자동 차단**.

### 본 BL-STEP-SELF-VERIFY 박는 동안 봇 자기 검증
- step 1 commit 9a167e2 → 키워드 없음 → 통과
- step 2 commit 3dbd89c (봇 신규) → 키워드 없음 → 통과
- step 3 commit 2b432a5 (workflow 신규) → 키워드 없음 → 통과
- step 4 commit fe1b40d (playbook 키워드) → playbook 룰 매칭 → `_os/playbook/*.md` 변경 확인 → ✅ 통과

GitHub Actions run id 25646643183 → conclusion: success, rollback step: skipped (위반 없음).

---

## 다음 행동

본 BL-STEP-SELF-VERIFY 완료 후 admin-status 자율 작업 큐에 보이는 다음 P0/P1:

- **P1 BL-ONELINE-SUMMARY-CARD** (small, 2h) — admin 전체 페이지 상단 1줄 요약 카드
- **P1 BL-HUMAN-LANG-AUDIT** (medium, 4h) — 개발자톤 → 사업가톤 일괄 정제
- **P1 BL-AUTO-TASK-REGISTER** (medium, 5h) — 점검 봇 결과 tasks.json 자동 BL 등록
- **P1 BL-DECISION-WORK-VIZ** (medium, 4h) — 결정-작업 연결 시각화
- **P0 결정 대기**: BL-ADMIN-AUTH (권한 등급) / BL-CHATLOG-BIZ-FORMAT (부칙 합치기)
