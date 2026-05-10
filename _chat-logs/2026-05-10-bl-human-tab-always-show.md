---
slug: 2026-05-10-bl-human-tab-always-show
title: 활동 이력 사람용·AI용 탭 — 모든 활동의 정체를 항상 노출 (3-Layer 강제)
date: 2026-05-10
tasks: [BL-HUMAN-TAB-ALWAYS-SHOW]
commits:
  - cb734e5
  - 86e24ce
  - a4defd1
  - daa08ea
decisions: []
---

## 🎯 한 줄 요약
활동 이력에서 어느 행을 펼쳐도 **그 일이 무엇이었는지 사람이 한눈에 이해할 수 있게** 사람용·AI용 탭을 정석으로 다시 만들었습니다.

## 📍 왜 발생했나
활동 이력은 "대화창이 끊겨도 무슨 일이 있었는지 추적 가능"한 회사의 기억 장치입니다. 그런데 봇이 자동으로 한 작업을 펼치면 "기록 없음" 또는 "AI 컨텍스트 불필요"라고 끝나서, 대표님도 새로 들어온 도우미도 그 활동의 정체를 알 수 없었습니다. 사람용 탭에 들어가는 글도 개발자 용어 그대로라 어머니가 봐도 모르는 상태였습니다.

## 🛠 어떻게 해결했나
세 가지를 새로 박았습니다. 첫째, 사람용 탭에 모든 활동마다 **🎯 무엇 카드 + 📍 왜 카드**가 항상 먼저 나옵니다. 둘째, 카드에 들어가는 글을 **A형 부드러운 설명체로 자동 변환**합니다 (예: "pages-status 3-Layer 자동 갱신" → "사이트의 19개 페이지가 얼마나 잘 만들어졌는지 자동으로 점수를 다시 매겼습니다"). 셋째, AI용 탭에는 새 도우미가 빠르게 컨텍스트 잡을 수 있도록 **활동 메타데이터 카드 + 봇 정의 카드**(임무·트리거·실행 스크립트·생성 파일·영향받는 화면)를 풍부하게 박았습니다. 마지막으로 활동 펼침 시 디폴트 탭을 **항상 사람용**으로 통일했습니다 (이전에는 봇 활동이면 코드 변경 탭으로 자동 전환).

## ✅ 결과
- 봇 활동(scan-bot 19페이지 점수 갱신 등)을 펼치면 어머니가 봐도 무슨 일인지 한 줄로 이해됨
- 새로 들어온 도우미가 활동 1개만 펼쳐도 그 봇이 무엇을 하고 어떤 화면에 영향 주는지 즉시 파악
- 사람용·AI용 양쪽 다 활동 이력의 본질("끊겨도 추적 가능")을 지키게 됨

## ⏱ 다음 결정 필요
없음. 추후 사람이 봐서 어색한 표현이 있으면 humanizeText 사전(20개 키워드)에 추가하면 됨.

---

# 🔧 기술 상세 (개발자용)

## 변경 함수 (admin-status.html)

### 신규 함수
- **`buildActivityIdentityCards(item)`** (~4795줄) — 사람용 탭 🎯/📍 카드 빌더. 모든 분기에서 prepend.
- **`humanizeBotAction(botName, action)`** — 봇 5종별 특화 변환 (scan/sync/auto-detect/health/activity)
- **`humanizeCommitSubject(raw)`** — `feat(BL-XXX): ... [step:done:N]` → 깔끔한 한 줄
- **`humanizeText(text)`** — 20개 키워드 사전 (pages-status → 페이지 완성도 점수, overall=red → 🔴 빨강(문제 있음), commit → 작업 결과 저장, ...)
- **`buildAIContextCard(item)`** (~5260줄) — AI용 탭 메타데이터 카드 (timestamp / actor / target_type / target_id / task_id / steps_done / bot / reason + raw action 전체)
- **`buildBotRawInfo(botName, item)`** — 봇 5종 BOT_RAW_INFO 딕셔너리 (purpose / trigger / scripts[] / outputs[] / affects[] / related_decisions[])

### 재설계 함수
- **`loadHumanTab(pane, item)`** — 모든 분기(봇/사람/D-NNN/매핑실패/HTTP실패/catch)에서 `identityHtml` prepend → 활동 정체 항상 노출
- **`loadAITab(pane, item)`** — `BL-AI-TAB-BOT-DETECT` 봇 차단 분기 완전 제거. `contextCardHtml` 항상 prepend, 봇이면 `botRaw` 추가, 아니면 ECHO_LOG/DECISIONS 매칭 (기존 로직 유지).

### 제거 분기
- 펼침 핸들러의 `defaultBotName` 분기 (봇 → code 탭 자동 전환) 완전 제거. 디폴트 탭은 항상 `human`.

## shared.css 추가
- `.activity-tab-pane div[style*="border-left:3px solid #a855f7"]` (보라 카드) — 라이트 톤
- `.activity-tab-pane div[style*="border-left:3px solid #16a34a"]` (초록 봇 정의 카드) — 라이트 톤
- `.activity-tab-pane div[style*="border-left:2px solid #60a5fa"]` (raw action 박스) — 라이트 톤

## D-023 일부 뒤집음
이전 D-023 (2026-05-09 BL-ACTIVITY-FEED-CLEANUP)의 "봇 활동 디폴트 탭 = code" 결정을 일부 뒤집음. 사유: 사람용·AI용 탭에 봇 활동의 정체를 풍부하게 박았으므로 코드 탭으로 자동 전환할 이유가 사라짐. (D-023 번호가 BL-CLAUDE-DISCIPLINE에도 박혀 있어 충돌 — DECISIONS_INDEX 정리는 별개 작업으로 후속.)

## 7단계 commit 매핑
| step | commit | 내용 |
|---|---|---|
| 1~3 | cb734e5 | 사람용 탭 3-Layer 카드 prepend 구조 |
| 4 | 86e24ce | A형 부드러운 설명체 변환기 + 20개 키워드 사전 |
| 5+6 | a4defd1 | AI용 탭 봇 차단 제거 + AI 컨텍스트 카드 + 봇 정의 카드 |
| 7 | daa08ea | 봇 commit 시 코드 탭 자동 전환 분기 제거 |

## 6 케이스 검증 통과 (라이브 시뮬레이션)
1. `[scan-bot] pages-status 3-Layer 자동 갱신 (19페이지, 평균 53점)` → "사이트의 19개 페이지가..."
2. `[health-bot] _health.json 갱신 (overall=red)` → "현재 상태: 🔴 빨강(문제)."
3. `[auto-detect-bot] commit message → 작업 status 자동 갱신` → "진행 중이던 작업 하나가 끝난 것을..."
4. `[activity-bot] activity-feed 3-Layer 자동 갱신 (총 395건)` → "활동 이력 목록을 새로 정리..."
5. `feat(BL-HUMAN-TAB-ALWAYS-SHOW): ... [step:done:1] [step:done:2] [step:done:3]` → 깔끔한 제목만
6. `fix(BL-ADMIN-LIGHTMODE step9): 라이트 토글 버튼 좌하단 폴링 상태와 겹침 회피 [step:done:9]` → 깔끔한 제목만
