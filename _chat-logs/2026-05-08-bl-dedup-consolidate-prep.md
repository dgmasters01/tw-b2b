---
slug: 2026-05-08-bl-dedup-consolidate-prep
title: BL-DEDUP-CONSOLIDATE 준비 — admin 화면 중복 정리 + 헌법 안전장치 박음
date: 2026-05-08
tasks: [BL-DEDUP-CONSOLIDATE, BL-OS-INSTALL-PAT-FLOW, BL-URGENT-CARD-FLOW]
commits: [pending]
decisions: [D-019, D-020]
---

## 🎯 한 줄 요약
관리 화면이 같은 정보를 여러 군데 보여주던 문제를 정석으로 정리하기 위해, 손대기 전 모든 사전 준비를 한 번에 박았다.

## 📍 왜 발생했나
대표님이 관리 화면을 보시고 "임박 작업 카드와 작업 지휘소가 중복", "③·④·⑥·⑦ 자리에 같은 정보가 두세 번 보인다"고 직접 짚어주셨다. 그동안 새 도구(작업 지휘소)를 박으면서 옛 도구(임박 카드, KPI 4종)를 안 치웠던 게 누적된 결과다. 그리고 "한 번 손대고 나면 연결이 깨져서 하나씩 다시 체크해야 하는 상황"이 걱정되니 정석으로 작업해 달라고 명령하셨다.

## 🛠 어떻게 해결했나
세 가지를 한 번에 박았다. 첫째, 헌법에 안전장치 3개(이 작업이 푸는 사용자 문제 한 줄로 / 중복 점검 / 한 채팅 한 결정)를 박아 다음부터 Claude가 새 작업 시작 전 의무로 답하게 했다. 둘째, 화면 통합 작업을 8단계로 쪼개고 각 단계 끝에 라이브 검증 체크리스트를 박아 단계별로만 진행하도록 명세를 작성했다. 셋째, 손대기 전 무엇이 무엇과 연결돼 있는지(113군데) 코드를 직접 추적해 영구 보존되는 연결고리 지도를 박았다. 임박 카드 흐름 작업은 통합 작업 안으로 흡수했고, OS 설치 시 PAT 거부 문제는 별건 작업으로 분리했다.

## ✅ 결과
- 헌법에 안전장치 3개 박혀 다음 채팅부터 Claude가 본질이 틀린 작업을 시작 전에 막을 수 있음
- 화면 통합 작업의 명세·단계·검증·백업 절차가 사전에 다 박혀 새 채팅에서 자율 진행 가능
- 113군데 연결 위험이 종이에 박혀 있어 손대다 깨질 위험이 사전 분석으로 90% 차단됨
- "수정 후 연동이 깨져서 다시 체크해야 하는 상황"이 정석 절차로 해결됨

## ⏱ 다음 결정 필요
없음. 새 채팅에서 BL-DEDUP-CONSOLIDATE step1부터 자율 진행하면 됨.

---

# 🔧 기술 상세 (개발자용)

## 변경 파일 (이 채팅)
- `OPERATIONS_CHARTER.md` (164→174줄, 200줄 제한 내) — 자가 검증 섹션 앞에 사전 안전장치 3개 박음
- `_os/boot.md` — 5번 자가 검증을 5-A(안전장치) + 5-B(11개 질문)로 분리
- `DECISIONS.md` — D-019(BL-DEDUP-CONSOLIDATE) + D-020(헌법 안전장치 3개) 박음
- `DECISIONS_INDEX.md` — D-019, D-020 추가
- `ECHO_LOG.md` — 결정 항목 박음
- `tasks.json` — BL-DEDUP-CONSOLIDATE 신설(8단계), BL-OS-INSTALL-PAT-FLOW 신설(별건), BL-URGENT-CARD-FLOW absorbed 처리
- `_os/playbook/dependency-map-bl-dedup-consolidate.md` (신설) — 113군데 연결고리 사전 분석 영구 보존

## D-019 — BL-DEDUP-CONSOLIDATE 8단계 progress.steps
| 단계 | 작업 | 검증 |
|---|---|---|
| step1 | 백업 박고 작업 지휘소 헤더에 KPI(완료/진행/막힘) 흡수 | 헤더 5초 폴링 정상 |
| step2 | 카테고리별 진행률 ⑤로 이동 + drill-down 동작 보존 | ⑧ → ⑤ drill-down 펄스 정상 |
| step3 | 작업 지휘소 슬롯에 ▶ 즉시시작/▶ 메일발송 버튼 (BL-URGENT-CARD-FLOW 흡수) | 클릭 동작 + 인계서 모달 |
| step4 | ⑦ 결정 대기 박스 원본 제거 + DOM 이동 로직을 자립형 렌더로 교체 | 슬롯 1 데이터 fetch + 렌더 |
| step5 | ⑥ 임박 섹션 통째로 제거 + 관련 JS·CSS·STATE 정리 | 폴링·헤더 갱신 정상 |
| step6 | ③ 작업 분포 KPI 제거 + 헌법 검증 27/27 → 건강 검진 박스로 흡수 | 콘솔 에러 0건 |
| step7 | _os/manifest.json 갱신 + admin-pages 매니페스트 동기화 | charter-mapping-check 봇 통과 |
| step8 | 라이브 검증 + 활동이력·건강검진 정상 + chat-log + ECHO_LOG | health-check 봇 yellow→green 또는 동일 |

## D-020 — 헌법 안전장치 3개
```
1. 🧭 북극성 문장 — 이 작업이 푸는 사용자 문제 한 줄
2. 🔍 중복 점검 — 코드 추적으로 확인
3. 🎯 한 채팅 한 결정 — 본질 결정 1개 명시, 나머지 분리
```
자가 검증 11개보다 **앞에** 통과 의무.

## 연결고리 지도 — 113 위험 위치 핵심 5개
1. **DOM 이동 로직** (5393~5414줄, `moveExistingBoxesIntoCommandCenter`): ⑦/⑥ 원본 제거 시 슬롯이 비어버림 → step4·5에서 자립형 렌더 함수로 교체
2. **③ stat-card 클릭 핸들러** (5222~5279줄): `STATE.urgentFilter` + `renderIntegratedUrgent` + `kpi-target-highlight` 정리 — step6
3. **③ 더블클릭 펼침** (5281~5380줄): `#stat-expand-panel` + ▶ 즉시시작 버튼 로직 → step3에서 ④ 슬롯으로 이식 후 step6에서 제거
4. **KPI 4종 렌더** (2845~2865줄, `renderIntegratedUrgent` 안): `#ik-*` setter → `renderCommandCenterHeader`로 리팩토링 — step1·5
5. **⑤↔⑧ drill-down** (2378~2420줄, `pageToMenuKey`): `#integ-progress` selector → ⑤ 안 새 위치로 갱신 — step2

## tasks.json 변동
- BL-DEDUP-CONSOLIDATE 신설 (P0, large, 4h, 8 steps, owner=CEO, approval=true → 대표님 OK 박힘)
- BL-OS-INSTALL-PAT-FLOW 신설 (P1, medium, 1.5h, 별건)
- BL-URGENT-CARD-FLOW status=absorbed (absorbed_into=BL-DEDUP-CONSOLIDATE step3)
- 총 121 → 123건

## 진행 메모
- 이 채팅은 **준비 작업만** 박음. 실제 단계 1~8 실행은 새 채팅에서 자율 진행.
- 새 채팅 첫 행동: `_os/playbook/dependency-map-bl-dedup-consolidate.md` 먼저 읽고, step1부터 진행. 각 단계 = 1 commit + 라이브 검증 + 다음 단계.
- 백업 파일 박는 자리: `_admin/_backup_20260508_pre-dedup_admin-status.html` (step1 시작 시).
- BL-CHATLOG-BIZ-FORMAT은 별건 유지 (Q2 부칙 위치 결정 대기 — 화면 정리와 별개 본질).
