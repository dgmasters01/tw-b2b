---
slug: 2026-05-10-bl-decision-modal-pingpong
title: 그림 맞추기 핑퐁 시스템 + 결정 확정 자동화 + 빠른 작업 입구
date: 2026-05-10
tasks: [BL-DECISION-MODAL-PINGPONG]
commits:
  - 59383eb
  - 946a0fb
  - dc8c074
decisions: []
---

## 🎯 한 줄 요약
대표님이 그림 맞추기 모달에 글 적으면 GitHub에 진짜 저장되고, 새 채팅 Claude가 자동으로 받아서 답하는 핑퐁 시스템을 박았습니다. 결정 확정 버튼 누르면 DECISIONS.md에 영구 기록되면서 작업이 자동으로 시작됩니다. 추가로 헤더에 ✏️ 버튼으로 한 줄만 적으면 자동으로 새 작업이 박히는 빠른 입구도 만들었습니다.

## 📍 왜 발생했나
지금까지 그림 맞추기 모달은 글 적어도 브라우저 안 메모리에만 저장되어 다른 기기에서 안 보였고, Claude도 그 글을 못 읽었으며, 결정 확정 신호가 시스템에 박히지 않아 활동 이력에도 안 남았습니다. 새 작업이 발생할 때마다 사람이 직접 박아야 했고, 봇·외부 이슈도 자동으로 작업 큐에 올라가지 않았습니다. 활동 이력 본질("대화창 끊겨도 추적 가능")과 헌법 1조("대표님은 결정만, 시스템이 실행")를 정면으로 어기는 상태였습니다.

## 🛠 어떻게 해결했나
세 가지 입구를 박았습니다. 첫째, 그림 맞추기 모달에 "💾 저장하고 Claude에게 전달" 버튼을 박아 GitHub에 라운드를 영구 저장하고 차례를 자동으로 전환합니다. 둘째, 결정 확정 박스에 "💡 Claude 추천 한 줄 받기" 버튼이 마지막 라운드를 보고 본질을 25자 이내로 압축해서 채워주고, "✅ 결정 확정" 버튼 한 번에 D-NNN이 박히고 작업이 진행 중으로 자동 이동합니다. 셋째, 헤더에 "✏️ 새 작업 박기" 버튼을 박아 한 줄만 적으면 자동으로 카테고리·우선순위를 추측해 새 BL이 등록됩니다. 새 채팅을 시작할 때 인계서에 핑퐁 라운드가 자동으로 맨 위에 박혀서, 새 Claude가 한 번에 대표님 그림을 읽고 답할 수 있습니다.

## ✅ 결과
- 대표님이 핸드폰·노트북·PC 어디서든 같은 라운드를 봅니다 (GitHub 단일 진실원)
- Claude 차례 / 대표님 차례가 작업 카드에 자동 배지로 표시됩니다
- 결정 확정 한 번으로 D-NNN 영구 기록 + 작업 시작이 같이 일어납니다
- 빠른 입구로 한 줄만 적으면 작업이 즉시 시스템에 박힙니다 (입구 1·2·4 모두 자동화)

## ⏱ 다음 결정 필요
입구 3 (봇이 결함 자동 감지 → 자동 BL 박기)이 별개 작업으로 남아 있음 — `BL-AUTO-DEFECT-TO-TASK` 박을지 대표님 결정 필요.

---

# 🔧 기술 상세 (개발자용)

## 신규 파일
- `api/decision.js` — 통합 라우터 (Vercel 12-function 한도 도달, 마지막 슬롯)
  - 5개 액션: bl-create / pingpong-round / pingpong-load / decision-confirm / quick-task
  - dual auth: ops-token (Claude/봇) OR Supabase admin JWT (어드민 화면)
  - 직접 GitHub Contents API 호출 (octokit 없이 fetch + Buffer)
  - tasks.json stats 자동 재계산 (recalcStats — 부칙 11)

## 데이터 구조 변경
- `tasks.json` 내 task에 새 필드 2개: `pingpong_turn` (ceo/claude/done), `decision_summary` (string)
- `_decisions/pingpong/{BL-ID}.json` — 라운드 영구 저장: `[{ceo, claude, at}, ...]`

## admin-status.html 신규 함수
- `fetchGrimRoundsFromGitHub()` — 모달 열 때 백그라운드 fetch + render 갱신
- `sendRoundToGitHub(idx, side)` — 라운드 1개 GitHub commit (POST /api/decision?action=pingpong-round)
- `startPingpongPolling()` — 모달 열려 있는 동안 5초마다 fetch (Claude 답 자동 반영)
- `openQuickTaskModal()` — 헤더 ✏️ 버튼 모달 빌더
- 결정 확정 핸들러: 추천 한 줄 (humanizeText 재사용) + decision-confirm POST + reload

## CSS 추가
- `.grim-turn-badge.{ceo-turn,claude-turn,done}` — 라운드 헤더 차례 배지
- `.grim-round-actions / .grim-send-btn` — 전달 버튼
- `.grim-confirm-box` 외 5개 — 결정 확정 박스 (초록 그라디언트)
- `.pp-turn-pill.{claude,ceo}` — 작업 카드 옆 차례 배지 (pulse 애니메이션)

## 인계서 prepend (buildHandoffMessage)
- "## 🎯 어디부터 이어갈지" 직전에 "## 🏓 그림 맞추기 핑퐁" 섹션 자동 박음
- 라운드 N개 + 차례 안내 (🟡 Claude 차례 / 🟢 대표님 차례)

## 12단계 commit 매핑
| step | commit | 내용 |
|---|---|---|
| 1·2·3 | 59383eb | /api/decision 통합 라우터 + 5개 액션 + tasks 등록 |
| 4·5·6 | 946a0fb | dual auth + 모달 GitHub 저장 + 차례 배지 |
| 7·8·9·10·11 | dc8c074 | 빠른 입구 + 인계서 prepend + 모달 폴링 + 결정 확정 |
| 12 | (이번 chat-log) | 라이브 검증 (대표님 화면) |

## Vercel 환경변수 의존
- `CLAUDE_OPS_TOKEN` — Claude/봇이 API 호출 시 x-ops-token 헤더
- `GITHUB_PAT` — GitHub Contents API 쓰기 권한
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — admin JWT 검증
모두 기존 시스템에서 사용 중이므로 추가 설정 불필요.

## 라이브 검증 결과
- `https://gohotelwinners.com/api/decision` → 401 (action 없으니 인증 거치고 정상 응답)
- raw GitHub: btn-quick-task 2회 / "🏓 그림 맞추기 핑퐁" 1회 박힘
- Vercel 배포 35초 후 정상 반영
