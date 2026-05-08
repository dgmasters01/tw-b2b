# Chat-Log 박기 자동 강제 게이트 (부칙 15)

**신설**: 2026-05-08 (BL-CHATLOG-AUTO-GATE)
**근거 사고**: BL-ACT-INDEX-RESTORE 진행 중 chat-log를 박지 않아 4개 commit 모두 `byCommit` 매핑 실패 → 활동이력 펼침에서 "기록 못 찾음" 발생.

---

## 1. 의무

**BL 작업이 `status: done`으로 트랜지션될 때**, 다음 두 항목이 함께 박혀야 한다:

1. `_chat-logs/{YYYY-MM-DD}-{slug}.md` 파일 존재
2. `_chat-logs/index.json`의 `byTask[BL-ID]` 배열에 위 파일명(확장자 제외) 매핑

둘 다 박혀야만 부칙 15 충족. 한 쪽만 박혀 있으면 위반.

---

## 2. 자동 검증 게이트

`_os/scripts/auto_detect_task_status.py`가 commit 처리 중 `pending|in_progress → done` 트랜지션을 감지하면, 즉시 `_chat-logs/index.json`의 `byTask[task.id]` 존재 여부를 확인한다.

- **매핑 있음** → 정상 done 처리, 기존 워닝 있으면 자가 치유.
- **매핑 없음** → done은 박되, task에 `chatlog_warning` 신호 박음:

```json
{
  "code": "MISSING_CHATLOG_MAPPING",
  "rule": "부칙 15 — done 트랜지션 시 _chat-logs/index.json byTask 매핑 의무",
  "detected_at": "...",
  "detected_by_commit": "...",
  "message": "done 처리됐으나 byTask 매핑 없음. _chat-logs/{date}-{slug}.md 박고 index.json byTask에 추가."
}
```

`admin-status.html`은 이 신호를 카드 헤더에 ⚠️ 배지로 노출 (별도 BL로 UI 후속, 1차는 신호만 박음).

---

## 3. 자가 치유

다음 commit 시점에 `byTask` 매핑이 박혀 있으면 봇이 `chatlog_warning`을 자동 제거한다. 사람이 수동으로 워닝 지울 필요 없음.

---

## 4. 예외

다음 카테고리는 chat-log 의무 면제:

- **봇 자동 commit** (scan-bot / health-bot / charter-length-bot 등) — 봇 commit은 BL과 직접 매핑되지 않음.
- **`size: trivial`** 작업 — 1 commit 1줄 fix처럼 채팅 자체가 없는 경우. tasks.json에 명시.
- **메타 작업** (BL ID 자체에 `META-` prefix) — 헌법·OS 자체 정비 작업 중 일회성.

면제 대상은 `chatlog_warning`을 박지 않는다.

---

## 5. chat-log 작성 형식

`_os/playbook/chat-log-format.md` 참조. 핵심:

- 파일명: `{YYYY-MM-DD}-{kebab-case-slug}.md` (BL ID 포함 권장)
- frontmatter `task_ids:` 배열에 BL ID 박으면 `chat-log-index-bot`이 자동 `byTask` 매핑.
- 수동 매핑 필요 시 `_chat-logs/index.json`의 `byTask[BL-ID]`에 직접 추가.

---

## 6. 운영 흐름 (Claude 행동 절차)

작업 done 박기 직전에 Claude가 자율 수행:

1. `_chat-logs/{date}-{slug}.md` 생성 (이번 채팅에서 무엇을 했는지 — 결정·구현·검증 요약)
2. frontmatter에 `task_ids: [BL-XXX]` 박기
3. (선택) `index.json byTask`에도 직접 추가 (봇 갱신 대기 없이 즉시 반영하려면)
4. tasks.json `status: done` + `[done]` 또는 `[step:done:N]` 태그 commit

봇이 done 트랜지션 감지 → byTask 검증 → 매핑 있으면 워닝 없이 통과.

---

## 7. 위반 추적

`chatlog_warning`이 박힌 task는 `admin-status.html`의 **위반 작업** 섹션에 별도 노출. 사람이 사후라도 chat-log 박으면 자가 치유.

---

## 8. 관련 부칙·BL

- **부칙 7** (단계 commit + step 태그) — chat-log는 채팅 단위, step은 commit 단위. 둘 다 박힌다.
- **부칙 8** (자동 동기화) — chat-log 박기는 활동이력 펼침의 데이터 소스. 박지 않으면 그림 일치 위반.
- **BL-ACT-INDEX-RESTORE** (선행) — byCommit 시간근접 fallback 매핑 도입. 부칙 15는 byTask 매핑 강제로 보완.
