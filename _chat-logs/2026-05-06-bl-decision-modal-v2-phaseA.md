---
slug: 2026-05-06-bl-decision-modal-v2-phaseA
title: "결정 입력 모달 V2 Phase A — 결정 맥락 패널 + 5개 신설 필드"
date: 2026-05-06
tasks: [BL-DECISION-MODAL-V2]
phase: A
commits: []
decisions: []
---

## 🎯 한 줄 요약
결정 대기 카드 클릭 시 떴던 모달이 "결정 사유가 명시되지 않았습니다"만 표시하던 한계를 풀고, tasks.json에 5개 신설 필드(`decision_context` / `decision_options` / `decision_recommendation` / `ceo_decision` / `ceo_decision_at`)를 박은 뒤, 모달에 결정 맥락 패널을 추가해서 "무엇을 결정해야 하는지 / 옵션 / 권장안"을 한눈에 보이게 했습니다.

## 📍 왜 발생했나
직전 BL-STATUS-INTERACTIVE Phase A-2에서 만든 결정 입력 모달은, 클릭하면 떠오르긴 했지만 좌측에 표시되는 정보가 `requires_decisions_first` 배열 한 줄(예: "D-005")밖에 없어서, 대표님이 그 모달만 보고는 결정 자체를 할 수가 없었습니다. 결정에 필요한 사업 맥락이 admin-tasks.html / DECISIONS.md / BUSINESS.md에 흩어져 있어서, 결정하려면 매번 다른 페이지로 이동해 컨텍스트를 모아 와야 했습니다.

## 🛠 어떻게 해결했나
**Phase A의 변경 범위**(약 1h, small):
1. tasks.json에 결정 대기 작업 5개(BL-AURORA-MIGRATION / BL-MANAGER-DASH-001 / BL-TRACK-001 / BL-INVOICE-001 / BL-ADMIN-AUTH) 한정으로 5개 신설 필드 박음
2. 그중 2개(BL-AURORA-MIGRATION + BL-ADMIN-AUTH)는 풀 샘플 채워서 모달 동작 검증 가능
3. admin-status.html 모달 InnerHTML에 "🧭 무엇을 결정해야 하는가" 섹션 추가 — `decision_context` 본문 + `decision_options` 옵션 리스트 + `decision_recommendation` 권장안 박스
4. 5개 필드 모두 비어있는 작업(MANAGER-DASH / TRACK / INVOICE 3개)에는 빨간 점선 박스 + [📤 Claude에게 결정 맥락 정리 요청] 버튼 표시 → 클릭 시 클립보드에 정리 요청 인계서 복사 → 새 채팅 붙여넣으면 Claude가 BUSINESS.md/DECISIONS.md 참조해서 3개 필드 채움
5. CSS는 노란 그라데이션(`#fefce8` → `#fef9c3`) 결정 맥락 박스 + 빨간 점선 빈 상태 박스로 시각 구분

**Phase B/C는 다음 단계**: B = 좌우 분할 풀 UI(현재는 위아래 세로형); C = `[💾 결정 저장 + 자율 큐 이관]` 자동 저장 동작(GitHub Contents API).

## ✅ 결과
이제 admin-status.html의 결정 대기 카드 5개 중에서:
- BL-AURORA-MIGRATION 클릭 → 노란 박스에 "8개 admin/index 페이지 중 Aurora 미적용..." 맥락 + 4개 옵션(A안/B안/C안/D안) + 권장안(D안) 풀 표시
- BL-ADMIN-AUTH 클릭 → "정식 오픈 전 admin-* Supabase Auth..." 맥락 + 4개 권한 등급 옵션 + 권장안(B안 3단계) 풀 표시
- 나머지 3개 클릭 → 빨간 빈 상태 박스 + [정리 요청] 버튼 → 클립보드 복사 → 새 채팅 붙여넣어 풀 맥락 채움

## ⏱ 다음 결정 필요
없음. 다음은 Phase B(좌우 분할 풀 UI + 모바일 반응형, ~1h) 진행 가능.

---

# 🔧 기술 상세 (개발자용)

## TASK ID
BL-DECISION-MODAL-V2 (P0, large, Phase A 부분)

## 변경 파일

### 1. tasks.json
- 5개 결정 대기 작업(`status=pending` + `requires_decisions_first` 비어있지 않음)에 `decision_context` / `decision_options` / `decision_recommendation` / `ceo_decision` / `ceo_decision_at` 5개 필드 신설
- 그중 2개(BL-AURORA-MIGRATION / BL-ADMIN-AUTH)는 사업 컨텍스트 풀 샘플 박음

샘플 검증:
```json
"BL-AURORA-MIGRATION": {
  "decision_context": "8개 admin/index 페이지 중 Aurora 디자인 시스템(C3) 미적용 페이지를...",
  "decision_options": [
    "A안: 공개 페이지 우선 (marketing/hotel-info/sales 3개) — 외부 노출 최우선, ~3h",
    "B안: admin 내부 우선 (dashboard/booking-analytics) — 운영자 경험 개선, 단 booking-analytics 무거움 ~6h",
    "C안: 전체 일괄 — 일관성 최대화, 단 8h 풀 소요",
    "D안: booking-analytics 제외 + 나머지 전체 — 비용 대비 효과 최적, ~5h"
  ],
  "decision_recommendation": "권장: D안 — booking-analytics는 minified 거대 파일이라 ROI 낮고...",
  "ceo_decision": "",
  "ceo_decision_at": ""
}
```

### 2. _admin/admin-status.html

**CSS 추가** (line 1067~1146, +80 lines):
- `.ceo-decision-ctx` (노란 그라데이션 본체 박스)
- `.ceo-decision-ctx-h` (섹션 헤더 — `🧭 무엇을 결정해야 하는가`, `📑 옵션`)
- `.ceo-decision-ctx-text` (decision_context 본문)
- `.ceo-decision-ctx-options li` (각 옵션, 좌측 노란 보더)
- `.ceo-decision-ctx-rec` (권장안 박스 — `💡` 프리픽스 + 점선 보더)
- `.ceo-decision-ctx-empty` + `.ceo-decision-ctx-empty-btn` (빨간 빈 상태 + 정리 요청 버튼)

**JS 변경** (line 2310~2342 — InnerHTML 빌더):
```js
const dCtx = (task.decision_context || '').trim();
const dOpts = Array.isArray(task.decision_options) ? task.decision_options : [];
const dRec = (task.decision_recommendation || '').trim();
const hasV2Ctx = !!(dCtx || dOpts.length || dRec);

const ctxHtml = hasV2Ctx ? `
  <div class="ceo-decision-ctx">
    <div class="ceo-decision-ctx-h">🧭 무엇을 결정해야 하는가</div>
    ${dCtx ? `<div class="ceo-decision-ctx-text">${escapeHtml(dCtx)}</div>` : ''}
    ${dOpts.length ? `... 옵션 리스트 ...` : ''}
    ${dRec ? `<div class="ceo-decision-ctx-rec">${escapeHtml(dRec)}</div>` : ''}
  </div>
` : `
  <div class="ceo-decision-ctx-empty">
    <div>이 작업은 결정 맥락이 정리되지 않았습니다...</div>
    <button data-action="request-context">📤 Claude에게 결정 맥락 정리 요청</button>
  </div>
`;
```
모달 본문의 `📍 결정이 필요한 이유` 섹션 직후에 `${ctxHtml}` 박음.

**핸들러 추가** (line ~2440):
- `data-action="request-context"` 클릭 → 클립보드에 `[결정 맥락 정리 요청 — {id}]` 인계서 복사 → `BUSINESS.md / DECISIONS.md / OPERATIONS_CHARTER.md / 기존 chat-log 참조해서 3개 필드 채워달라` 요청 포맷.

## 자체 검증 (헌법 12조 7항목)

| # | 항목 | 결과 |
|---|---|---|
| 1 | JS 문법 (`node --check`) | ✅ inline script 1개 통과 |
| 2 | JSON 검증 (`python -c json.load`) | ✅ 통과 |
| 3 | Vercel deploy state: READY | (commit 후 확인 예정) |
| 4 | 라이브 페이지 fetch | (deploy 후 확인 예정) |
| 5 | 데이터 정확성 | ✅ 5개 결정 대기 작업만 정확히 수정 (status=pending + requires_decisions_first) |
| 6 | 시각 변경 자체 trace | ✅ 노란 박스 + 빨간 빈 상태 박스 풀 trace |
| 7 | boundary 케이스 | ✅ ① 5개 필드 모두 비어있을 때(빨간 박스+버튼) ② 일부만 있을 때(있는 항목만 표시) ③ 매우 긴 옵션(width auto-wrap) ④ V1 호환(reasonHtml 그대로 유지) |

## 알려진 한계 / Phase B/C 이관 사항

1. **현재는 위아래 세로형** — 좌우 분할 풀 UI는 Phase B
2. **결정 저장 자동화 없음** — 현재는 V1처럼 클립보드 복사 + 새 채팅 붙여넣기 동작 유지. `[💾 결정 저장 + 자율 큐 이관]` 자동 저장은 Phase C
3. **5개 결정 대기 작업 중 3개(MANAGER-DASH / TRACK / INVOICE)는 빈 상태** — Phase A는 시스템만 구축, 실제 맥락 채우기는 Phase B/C 또는 별도 작업으로 진행
4. **모바일 반응형은 V1 그대로** — Phase B에서 보강

## 대표님 검증 요청

- gohotelwinners.com/admin-status.html 접속
- 결정 대기 카드 5개 보이는지
- **BL-AURORA-MIGRATION 클릭** → 노란 박스에 맥락/옵션/권장안 풀 표시되는지
- **BL-ADMIN-AUTH 클릭** → 노란 박스에 권한 등급 4개 옵션 + 권장안 표시되는지
- **나머지 3개(MANAGER-DASH / TRACK / INVOICE) 중 하나 클릭** → 빨간 빈 상태 박스 + [정리 요청] 버튼 보이는지 / 버튼 클릭 시 클립보드 복사 토스트 뜨는지

## 운영 알림
POST gohotelwinners.com/api/email/ops/notify-claude-work
- step: "BL-DECISION-MODAL-V2 Phase A 완료"
