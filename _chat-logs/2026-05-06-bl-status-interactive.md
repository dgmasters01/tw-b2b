---
slug: 2026-05-06-bl-status-interactive
title: "작업 지휘소 클릭이 진짜로 동작하게 — 3 단계 강화"
date: 2026-05-06
tasks: [BL-STATUS-INTERACTIVE]
commits: [3c3d543, 51a91d5, df15de5]
decisions: []
---

## 🎯 한 줄 요약
작업 지휘소 화면에서 클릭하면 "위에서부터 차례로 시스템이 알아서 완성되는 흐름"이 진짜로 작동하도록 3 단계로 강화했습니다.

## 📍 왜 발생했나
직전 작업에서 작업 지휘소 화면을 만들고 영역을 재배치했지만, 막상 클릭해도 동작이 없거나(+N건 더가 글자만 회색), 새 작업이 들어와도 화면이 5초 안에 갱신되지 않거나(폴링이 일부 영역만), 어느 게 1번이고 어느 게 마지막인지 안 보이는(자율 큐 번호 없음) 한계가 있었습니다.

## 🛠 어떻게 해결했나
1단계 — 즉시 클릭 가능: 자율 큐/결정 대기/직원 큐 3 군데 "+N건 더"를 진짜 링크로 바꿨고, 결정 대기 카드를 클릭하면 결정 입력 모달이 떠서 ⓐ 작업 상세 / ⓑ 결정 입력(클립보드 복사) / ⓒ 결정 완료(막힘 해제) 3 가지를 바로 고를 수 있게 했습니다. 2단계 — 5초 갱신: 폴링이 4 개 영역(평균 게이지 / 사이드바 메뉴 / 임박 작업 / 결정 대기)을 추가로 갱신하도록 보강하고, 자율 큐 카드 좌측에 순서 번호(1~12)를 박아 "위에서부터 차례로"가 시각적으로 보이게 했습니다. 3단계 — 인계서 자동 보강: 카드 클릭 시 만들어지는 인계서 맨 위에 작업 사이즈와 예상 시간 기준으로 "이 채팅으로 끝낼 수 있는지" 권장 판단을 자동으로 박았습니다.

## ✅ 결과
대표님이 작업 지휘소를 보고 위에서부터 클릭하기만 하면 시스템이 알아서 진행됩니다. 결정 대기는 클릭 한 번으로 모달이 뜨고, 자율 큐는 1번부터 12번까지 순서대로 보이며, 새 작업이 들어오면 5초 안에 화면이 갱신됩니다. 카드 클릭으로 받은 인계서를 새 채팅에 붙여넣으면, 새 채팅 Claude가 첫 줄에 ✅/⚠️/🚨 판단을 즉시 박을 수 있습니다.

## ⏱ 다음 결정 필요
없음. 다음은 admin-tasks.html에서 `?category=` / `?filter=ceo_wait` / `?filter=staff` URL 쿼리 파라미터 처리 추가가 필요합니다. 현재 admin-tasks.html에서 이 쿼리들을 받지 못하면 +N건 더 클릭 시 페이지로 이동은 되지만 필터링은 안 됩니다.

---

# 🔧 기술 상세 (개발자용)

## TASK ID
BL-STATUS-INTERACTIVE (P0)

## Phase 별 변경

### Phase A — 즉시 동작 가능한 클릭 (commit 3c3d543)

**A-1: "+N건 더" 3 군데 진짜 링크화**

| 좌표 | 영역 | URL |
|---|---|---|
| line 1424 | 자율 큐 펼침창 (12+) | `/admin-tasks.html?category={ts[0].category}` |
| line 2052 | 결정 대기 (8+) | `/admin-tasks.html?filter=ceo_wait` |
| line 3258 | 직원 큐 (6+) | `/admin-tasks.html?filter=staff` |

기존 `<div>` → `<a href>` 교체. 시각: text-muted 회색 → `var(--aurora-2)` 보라 + 점선 테두리 + cursor:pointer.

**A-2: 결정 대기 카드 → 결정 입력 모달 신설**

`renderCeoWait` 종료 직후에 `openCeoDecisionModal(taskId)` 함수 추가 (line ~2069). 모달 구성:

- 헤더: 우선순위 pill (P0~P3) / 카테고리 pill / 작업 ID / X 닫기
- 작업 제목
- 📍 결정이 필요한 이유 (`task.autonomous.requires_decisions_first` 리스트)
- 🎯 3 액션 버튼:
  - **ⓐ detail**: `location.href = /admin-tasks.html?id={taskId}`
  - **ⓑ input**: textarea 펼침 → `📋 복사 + Claude 인계서로 사용` 클릭 → `[대표님 결정 사항 — {id}]` 포맷으로 클립보드 복사
  - **ⓒ resolve**: `[결정 완료 — {id} 막힘 해제 요청]` 포맷 클립보드 복사 (approval_required=false 처리 요청 메시지)
- ESC / backdrop 클릭 / X 버튼으로 닫기
- `copyToCb` 헬퍼 (clipboard API + textarea 폴백)

기존 ceo-wait-item 클릭 핸들러 (line 2055-2060) 수정: `openCeoDecisionModal` 정의 시 모달 호출, 미정의 시 기존 동작(`?id=`) 폴백.

CSS 추가 (line 870 근처, 기존 `.cc-toast.success` 직후):
- `.ceo-decision-modal{position:fixed;inset:0;z-index:10000;display:none;opacity:0}`
- `.ceo-decision-modal.show{display:block;opacity:1}`
- `.ceo-decision-panel` 중앙 정렬, max-width 560px, max-height calc(100vh - 64px), overflow-y:auto
- 모바일 (max-width:640px) 반응형

### Phase B — 실시간 동기화 + 시각 정리 (commit 51a91d5)

**B-1: 5초 폴링에 4 영역 추가**

`pollTick` 함수 (line 3322) 의 tasks.json 변경 감지 블록에 추가:

```js
// ★ STATE.data 동기화 (renderAvg/Sidebar/TopUrgent가 STATE.data 의존)
try { STATE.data = data; } catch (_) {}
// ★ 4 영역 추가 갱신 (try-catch 개별 보호)
try { renderAvg(data); } catch (e) { console.warn('[poll] renderAvg 실패', e); }
try { renderSidebarMenus(data); } catch (e) { console.warn('[poll] renderSidebarMenus 실패', e); }
try { renderTopUrgent(data); } catch (e) { console.warn('[poll] renderTopUrgent 실패', e); }
try { renderCeoWait(data); } catch (e) { console.warn('[poll] renderCeoWait 실패', e); }
```

`STATE`는 `const`지만 객체 속성 변경이라 합법.

**B-2: 자율 큐 카드 순서 번호 (1~12)**

`renderAutoQueue` (line 2474)의 map 콜백에 idx 추가:
- `queue.map((t, idx) => { ... const orderNum = idx + 1; ... })`
- 카드 안에 `<span class="auto-queue-order">${orderNum}</span>` 추가

CSS (line 274 근처):
- `.auto-queue-card { position: relative; padding: 10px 12px 10px 32px; }` (기존 padding 좌측 32px로)
- `.auto-queue-order { position:absolute; top:8px; left:8px; width:18px; height:18px; border-radius:50%; background: rgba(34,197,94,0.20); color: #86efac; }`
- P0/P1 배지 색상 차이 (rgba(239,68,68,0.20) / rgba(249,115,22,0.20))
- 모바일 (line 600): padding `8px 8px 8px 28px`, order 16px

### Phase C — 인계서 12조 라우팅 신호 (commit df15de5)

**C-6: 카드 클릭 인계서에 0단계 라우팅 판단 블록 추가**

두 인계서 함수 모두에 헤더 직후 블록 추가:
- `buildHandoffMessage` (자율 큐용, line 2630 근처) — 헤더 직후
- `buildHandoff` (직원 + claude 카드용, line 3697) — claude type 헤더 직후

권장 판단 알고리즘:

```js
const sizeKey = String(task.size || '').toLowerCase();
const estH = parseFloat(hours);
let routingSignal = '✅ 이 채팅 진행 가능';
let routingReason = '작은~중간 규모 — 새 채팅에서 끝까지 갈 수 있는 분량';
if (sizeKey === 'xlarge' || estH >= 5) {
  routingSignal = '🚨 새 채팅 강제';
  routingReason = `초대형 작업 (size=${task.size}, 예상 ${hours}h) — 새 채팅 필수.`;
} else if (sizeKey === 'large' || estH >= 3) {
  routingSignal = '⚠️ 새 채팅 권장';
  routingReason = `큰 규모 작업 (size=${task.size}, 예상 ${hours}h) — 토큰 압박 가능성.`;
}
```

블록 내용:
- `## 🚦 0단계: 채팅 라우팅 판단 (CLAUDE.md 12조 의무)`
- 권장 판단 + 사유
- 작업 핵심 메타: ID / 카테고리 / 우선순위 / 사이즈 / 예상 시간 / 의존성 / 선행 결정
- "응답 첫 줄에 위 판단 그대로 또는 자체 재판단해서 박을 것" 명시

## 자체 검증 (헌법 12조 7항목)

| # | 항목 | 결과 |
|---|---|---|
| 1 | JS 문법 (`node --check extracted.js`) | ✅ 3 Phase 모두 통과 |
| 2 | JSON 검증 | (HTML만 변경, JSON 수정 없음) |
| 3 | Vercel deploy state: READY | ✅ 3c3d543 / 51a91d5 / df15de5 모두 READY |
| 4 | 라이브 페이지 fetch | ✅ HTTP 401 (인증 보호 정상) |
| 5 | 데이터 정확성 | ✅ 좌표 1424/2052/3258 정확, 라인 수 3508→3897 (+389) |
| 6 | 시각 변경 자체 검증 | ✅ a href / 모달 CSS / 순서 번호 CSS 풀 trace |
| 7 | boundary 케이스 | ✅ 0건 early return / NaN 시 기본 분기 / 모바일 반응형 / ESC 닫기 / 클립보드 폴백 |

## 알려진 한계 / 추정 사항

1. **+N건 더 링크의 쿼리 파라미터(`?category=`, `?filter=ceo_wait`, `?filter=staff`)**는 admin-tasks.html에서 처리 로직이 아직 없어서, 이동은 되지만 필터링은 안 됩니다. 다음 작업으로 admin-tasks.html에 쿼리 파싱 추가 필요.
2. **자율 큐 순서 번호는 1~12까지** (인계서에 13이라고 적혔지만 실제 코드는 `slice(0, 12)`).
3. **결정 입력 모달의 ⓒ resolve 버튼**은 클립보드 복사만 함. tasks.json을 자동으로 변경하지 않음 (Claude가 채팅에서 받아서 처리).
4. **STATE.data = data 동기화**는 const 객체 속성 변경이라 합법이지만, STATE 구조가 바뀌면 추적 필요.

## 대표님 검증 요청

- gohotelwinners.com/admin-status.html 접속
- **결정 대기 카드 하나 클릭** → 모달이 정상 표시되는지 (P0~P3 색상 / 3 버튼 / ESC 닫힘)
- **자율 큐 카드** → 좌측 상단 1, 2, 3 ... 번호 보이는지 (P0는 빨강, P1은 주황, 그 외 초록)
- **자율 큐 카드 클릭** → 클립보드 복사된 인계서 첫 부분에 `🚦 0단계: 채팅 라우팅 판단` 블록이 들어있는지

## 운영 알림

POST gohotelwinners.com/api/email/ops/notify-claude-work
- step: "BL-STATUS-INTERACTIVE 완료"
- email_id: e44c7985-ae56-4a89-9c58-853514e7a4d8
- ccf_detected_task_id: BL-STATUS-INTERACTIVE → tasks.json done 자동 갱신
