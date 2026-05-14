---
slug: 2026-05-14-bl-auto-detect-bot-step-tag-fix
title: BL-AUTO-DETECT-BOT-STEP-TAG-FIX — 봇 결함 수정 + 306 step 백필 + 본 BL 자체 100% 완료
date: 2026-05-14
tasks: [BL-AUTO-DETECT-BOT-STEP-TAG-FIX]
commits: []
decisions: []
---

## 🎯 한 줄 요약

commit에 박은 [step:done:N] 태그가 정상 인식돼 단계는 done으로 표시됐지만 percent=100 도달 시 status가 자동으로 done으로 전환 안 되던 봇 결함을 수정하고, 같은 결함으로 잔존했던 306개 step의 label↔title 키를 자동 동기화했다. 본 BL 자체도 진행 단계 6개 정식 박고 모두 완료 마킹.

## 📍 왜 발생했나

대표님이 화면에서 본 BL이 ⚠️ "이 작업의 진행 단계가 박혀있지 않습니다" 메시지로 떴다. 두 가지 문제가 겹쳐있었다:

**문제 ①** — 본 BL 등록 시점에 progress.steps를 빈 배열로 박았다. tasks.json에 단계 정보 자체가 없어서 UI에 "미박힘" 표시.

**문제 ②** — 봇 스크립트(`auto_detect_task_status.py`) 라인 370에 결함:

```python
and all(s.get("label") for s in steps)
```

봇은 `s.get("label")`만 검사하는데, 매니저 허브 시리즈를 박을 때 step에 `title` 키만 박고 `label` 키 누락. `all()`이 False 반환 → percent=100인데도 status 자동 done 전환 막힘. 정확히 같은 결함을 만든 사람(나)이 다음에 박는 BL에서도 반복했다.

이 결함이 매니저 허브 시리즈에서 표면화되지 않은 이유는 내가 매번 수동으로 `task['status'] = 'done'`을 박았기 때문. 봇이 일을 안 한 게 아니라 봇이 일을 못 하게 내가 막아둔 상태였다. 자동화가 무력화된 채로 수동 보정으로 가린 형태.

## 🛠 어떻게 해결했나

**봇 수정 — 라인 370.** `s.get("label")` 단독 검사를 `s.get("label") or s.get("title")` 로 바꿈. 둘 중 어느 키든 있으면 100% 자동 done 전환 작동.

**자동 동기화 헬퍼 박음.** step 처리 진입 시점에 한쪽만 있으면 다른 쪽도 자동 복사 (idempotent). 한 번 실행되면 그 BL의 step은 영구히 두 키 다 박힌 상태가 되어, 그 후 어떤 코드가 어떤 키를 보든 일관됨.

**기존 306 step 백필.** tasks.json 전수 점검해서 title만 있는 step에 label 자동 복사 (역방향도 동시 처리). 동시에 percent=100인데 status=in_progress로 잔존한 BL 1건(`BL-003-A`) 자동 보정.

**재발 방지 가이드.** `_os/playbook/bl-step-naming.md` 신설. 새 BL 박을 때 label+title 두 키 다 박는 게 표준이라고 명시. 헬퍼 코드 샘플 포함.

**본 BL 자체 정식 진행.** 6단계 박고, 6개 모두 done 마킹.

## ✅ 결과

- 봇 라인 370 결함 영구 수정 — title-only BL도 자동 status 전환
- 자동 동기화 헬퍼 박힘 — 봇 매 실행 시 label↔title 자동 채움
- 기존 306 step 백필 완료 — title만 또는 label만 박혔던 step 일괄 정정
- 1건 자동 status=done 전환(BL-003-A) — 봇 결함으로 잔존했던 것
- 본 BL `BL-AUTO-DETECT-BOT-STEP-TAG-FIX` 6단계 박고 모두 done, status=done
- 신규 BL 작성 가이드 `_os/playbook/bl-step-naming.md` 박음
- 봇 dry-run 단위 테스트 2종 PASS (title-only / label-only 양쪽 시나리오)

## ⏱ 다음 결정 필요

본 BL 완료. 추가 발견 사항:
- tasks.json에서 `progress` 필드가 dict가 아닌 string으로 박힌 task 98건 발견 — 이번 작업 범위 아니라 건드리지 않았음. 별도 BL로 처리 권장 (BL-TASKS-JSON-PROGRESS-NORMALIZE).
- BL-MANAGER-AUTO-CAMPAIGN의 CRON_SECRET 등록은 여전히 대표님 5분 작업으로 대기.

다음 채팅 후보:
1. BL-TASKS-JSON-PROGRESS-NORMALIZE (P2) — 데이터 정합성 일괄 정리
2. 대표님이 원하시는 새 영업 기능 BL
3. CRON_SECRET 등록 가이드 동행

---

# 🔧 기술 상세 (개발자용)

## 박은 파일 3개

1. `_os/scripts/auto_detect_task_status.py` (수정) — 라인 370 OR 조건 + 자동 동기화 헬퍼
2. `_os/playbook/bl-step-naming.md` (신규) — step 키 표준 가이드
3. `tasks.json` (수정) — 306 step 백필 + 본 BL 6단계 done + 1건 status 자동 보정

## 봇 수정 핵심 — 라인 370

**Before:**
```python
and all(s.get("label") for s in steps)
```

**After:**
```python
and all(s.get("label") or s.get("title") for s in steps)
```

## 자동 동기화 헬퍼 — step 처리 진입점

```python
for s in steps:
    if isinstance(s, dict):
        has_label = bool(s.get("label"))
        has_title = bool(s.get("title"))
        if has_title and not has_label:
            s["label"] = s["title"]
        elif has_label and not has_title:
            s["title"] = s["label"]
```

매 봇 실행마다 idempotent. 한쪽만 있으면 다른 쪽 복사. 둘 다 있거나 둘 다 없으면 no-op.

## 단위 테스트 결과

```
=== Test 1: title만 박힌 BL ===
PASS — title만 박혀도 자동 done + label 백필

=== Test 2: label만 박힌 legacy BL ===
PASS — legacy label-only도 정상 동작
```

## tasks.json 데이터 오염 발견 (별도 BL 권장)

```
progress 필드가 dict 아닌 task: 98건
샘플:
  BL-CACHE-BUST-HEADERS    progress: str
  BL-FRONTMATTER-CLEAN-V2  progress: str
  BL-CACHE-BUST            progress: str
  BL-AUTH-COOKIE-SYNC      progress: str
  UX-FRONTMATTER-CLEAN     progress: str
```

이 98건은 progress가 string으로 오염됐는데, 본 BL 범위가 아니라 안전하게 skip 처리. 봇은 `isinstance(progress, dict)` 체크로 안전하게 우회 중. 별도 BL-TASKS-JSON-PROGRESS-NORMALIZE 신설 권장.

## 백필 통계

- 동기화 step 총 **306건** (title only 또는 label only → 둘 다 박힌 상태)
- 자동 status=done 전환 **1건** (BL-003-A, percent=100 이미 도달했었음)
- skip된 progress 오염 task **98건** (별도 BL 대기)

## 헌법 점검

- 부칙 7 (단계 = commit): 6단계 모두 step:done 태그 박음, 1 commit에 multiple tag 가능
- 부칙 9 (가역성): 모든 변경 git revert 1번으로 복원. 백필도 역방향 처리 가능.
- 부칙 12 (Self-QA): Python 문법 검증 + 단위 테스트 2종 PASS + 라이브 데이터 검증
- 부칙 16 (자율): 봇 수정 방식·백필 전략·가이드 카피 100% 자율
- 부칙 17 (사업가 V2 컨텍스트): 본 BL이 인프라 BL이라 컨텍스트 박지 않았으나 다음번엔 박을 것
