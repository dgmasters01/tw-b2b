# INFRA_CLEANUP_REPORT.md — OS 인프라 정석 청소 (BL-OS-PHASE-5 단계 8~9 후속)

> **목적**: BL-OS-PHASE-5 종결 후 발견된 인프라 잔여 결함 3건을 정석대로(의존성 순서대로) 종결
> **작성**: 2026-05-08
> **선행 보고서**: `PHASE_5_VERIFICATION_REPORT.md`

---

## 1. 정석 청소 원칙

**헌법 정석 = 의존성 순서대로 박는다**
- 기반(인프라) → 보안 → 사업 도구 → 수익 측정
- 헌법 위반 상태에서 다른 작업을 쌓으면 부실 공사
- 인프라 카테고리 0건 도달 시 사업 BL 본격 진입

---

## 2. 청소 대상 3건 + 발견 1건

| # | BL | 카테고리 | 종전 status | 종후 status |
|---|---|---|---|---|
| 1 | BL-SYNC-ENGINE-AUTO-STATS | 인프라 (헌법 부칙 11) | pending | ✅ done |
| 2 | BL-CHATLOG-BOT-RACE | 인프라 (봇 동시성) | pending | ✅ done |
| 3 | BL-AUTODETECT-MULTIBRANCH | OS (다중 브랜치 listening) | todo | ✅ done |
| (신규) | BL-WORKFLOW-DEAD-BRANCH-CLEANUP | 인프라 (잔정리) | (없음) | 🆕 pending P3 |

---

## 3. 1번 — BL-SYNC-ENGINE-AUTO-STATS 종결 상세

### 3-1. 결함의 본질

- 헌법 부칙 11(자동 stats 재계산 의무) 위반
- tasks.json 변경 시 stats 자동 재계산 안 됨 → 매 채팅마다 사람이 수동 stats 갱신 의무 발생
- 헌법 1조("AI + 1인 사장 OS — 사람 손 없이 자동 실행") 정면 위배

### 3-2. fix 내용 (`_os/scripts/sync_engine.py`)

**추가 함수**: `recompute_stats(data)` — 신설

- tasks 배열로부터 stats 재계산
- 기존 스키마 보존 (`total / done / in_progress / pending / blocked / autonomous_ready / todo`)
- `autonomous_ready` 정의: `claude_can_auto && !approval_required && status in (pending, todo)`

**main() apply 모드 보강**:

- apply 모드 진입 시 즉시 recompute_stats 호출
- 변경 있으면 tasks.json 자체 갱신 (백업 없이 atomic write)
- 변경 사항을 stdout에 표시 (which key changed)

**verify_sync() 보강**:

- stats 불일치를 errors → warnings로 분리 (auto-recoverable)
- verify 모드는 EXIT 0 (차단 안 함) — apply가 자동 회복할 것이므로
- 차단 결함은 source 필드 누락 같은 사람 개입 필요 결함만

### 3-3. 자체 테스트 (3-cycle)

```
[1] tasks.json stats 의도적 망가뜨림 (total: 110 → 999, done: 79 → 1)

[2] verify 실행 → EXIT 0 + 경고 출력 (차단 안 함, apply가 회복할 것)
    출력: "🔄 stats 재계산 필요: total: 999 → 110, done: 1 → 79"
    출력: "ℹ️ 검증 경고 (auto-recoverable): ..."

[3] apply 실행 → EXIT 0 + tasks.json 자체 갱신
    출력: "🔄 stats 자동 재계산 + tasks.json 갱신 (헌법 부칙 11)"
    출력: "total: 999 → 110 ←, done: 1 → 79 ←, ..."

[4] verify 재실행 → EXIT 0 + "✅ stats 일치 — 재계산 불필요"
```

**판정**: ✅ 자동 회복 사이클 완전 성립.

### 3-4. 영구 효과

- 모든 채팅에서 클로드가 tasks.json 신설/수정 시 sync-bot이 자동으로 stats 재계산
- 사람 의무 1개 영구 제거
- sync.yml `--verify` 단계가 stats 불일치로 차단되는 결함 제거 (BL-OS-PHASE-5 단계 9에서 라이브 재현됐던 결함)

---

## 4. 2번 — BL-CHATLOG-BOT-RACE 종결 상세

### 4-1. 결함의 본질

- chat-log-index 봇이 push 시점에 다른 봇과 race → `! [rejected] main -> main (fetch first)` → 간헐적 failure
- 헌법 5조(무인 검증) 신뢰도 저하
- 자가 회복되긴 하지만 _health.json에 노이즈

### 4-2. fix 내용 (`.github/workflows/chat-log-index.yml`)

**기존**:
```yaml
git push origin main
echo "✅ index.json 자동 갱신 + push 완료"
```

**fix 후**:
```yaml
# Race condition 방지 — push 직전 원격 변경 흡수 (BL-CHATLOG-BOT-RACE)
for attempt in 1 2 3; do
  if git push origin main; then
    echo "✅ index.json 자동 갱신 + push 완료 (시도 ${attempt})"
    break
  fi
  echo "⚠️ push 실패 (시도 ${attempt}) — pull --rebase 후 재시도"
  git pull --rebase --strategy-option=ours origin main || {
    echo "❌ rebase 충돌 — 수동 개입 필요"; exit 1;
  }
done
```

### 4-3. 봇 7개 race 가드 통일 검증

| 봇 | retry-rebase 박힘 |
|---|---|
| auto-detect-task-status.yml | ✅ |
| build-activity-feed.yml | ✅ |
| chat-log-index.yml | ✅ (이번 fix) |
| health-check-admin.yml | ✅ |
| page-status-scan.yml | ✅ |
| sync.yml | ✅ |
| charter-length-bot.yml | N/A (commit 안 함) |

**판정**: ✅ 봇 6/6 race 가드 통일 (charter-length는 read-only로 무관).

---

## 5. 3번 — BL-AUTODETECT-MULTIBRANCH 종결 상세

### 5-1. 결함의 본질

- auto-detect-bot이 main 외 브랜치 commit 못 잡던 결함
- restructure-os-modularization 브랜치 작업 시 progress 자동 갱신 실패

### 5-2. 라이브 검증 결과

- `auto-detect-task-status.yml`: `branches: [main, restructure-os-modularization]` 박힘 ✅
- 실제 fix는 PHASE-1A commit `705c9e9`에서 박혔으나 status가 todo에 남아있던 상태
- 이번 청소에서 status: todo → done 마킹

### 5-3. 추가 발견 — BL-WORKFLOW-DEAD-BRANCH-CLEANUP (신규 P3)

**발견 경위**: 5개 봇(auto-detect/build-activity-feed/health-check/page-status-scan/sync)이 여전히 `restructure-os-modularization` 브랜치 listen 박혀있지만, PHASE-4에서 main 통합 후 해당 브랜치 삭제됨.

- 동작상 무해 (존재하지 않는 브랜치 listen은 그냥 무시됨)
- 정석 청소 대상 — `branches: [main]`으로 통일
- 우선순위: P3 (긴급 X)
- 다음 인프라 정리 사이클에서 처리

---

## 6. tasks.json 갱신 결과

| 항목 | 종전 | 종후 |
|---|---|---|
| total | 110 | 111 |
| done | 79 | 82 (+3) |
| pending | 20 | 18 (-3 + 1 신규) = 18 |
| todo | 1 | 0 (-1) |
| 인프라 카테고리 (infra) pending | 2 | 1 (BL-WORKFLOW-DEAD-BRANCH-CLEANUP만 잔여 P3) |

**stats는 sync-bot이 자동 재계산할 것** (BL-SYNC-ENGINE-AUTO-STATS fix 효과 첫 가동 시점 — 이번 commit이 라이브 검증).

---

## 7. 헌법 자가 검증 (정석 청소 후)

| # | 질문 | PASS |
|---|---|---|
| 1 | 부칙 11(자동 stats 재계산) 박힘? | ✅ recompute_stats 신설 |
| 2 | 봇 race 가드 7/7 통일? | ✅ 6/6 commit 봇 + charter는 N/A |
| 3 | tasks.json todo 상태 0건? | ✅ BL-AUTODETECT-MULTIBRANCH done |
| 4 | 사람 손 없이 자동 실행되는가? (1조) | ✅ stats 재계산 자동화로 사람 의무 1개 제거 |
| 5 | 무인 검증이 차단 결함만 막는가? | ✅ stats 불일치 = warning, source 누락 = error |

**총 5/5 PASS.**

---

## 8. 다음 단계

**남은 인프라**: BL-WORKFLOW-DEAD-BRANCH-CLEANUP (P3) — 긴급도 낮음, 다음 사이클에서 처리

**사업 BL 진입 준비 완료**:
- 1순위 권장: **BL-ADMIN-AUTH** — admin Supabase Auth 정식 박기 (사이트 정식 오픈 전제 조건)
- 2순위: BL-DECISIONS-INDEX — 의사결정 추적 자동화
- 3순위: BL-TRACK-001 — YouTube 클릭 카운트 (수익 측정 시작점)

**OS 인프라 무결 상태 도달.**

---

**작성**: 클로드 (under direction of 이지형 대표님)
