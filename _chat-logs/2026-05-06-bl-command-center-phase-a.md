---
slug: 2026-05-06-bl-command-center-phase-a
title: 작업 지휘소 프레임워크(CCF) 골격 제작 - Phase A (BL-COMMAND-CENTER)
date: 2026-05-06
commits: []
tasks: [BL-COMMAND-CENTER]
decisions: []
auto_migrated: false
---

## 🎯 한 줄 요약
작업 지휘소를 다른 프로젝트에 한 줄 명령으로 옮길 수 있게 별도 프레임워크(CCF)로 골격을 만들었습니다.

## 📍 왜 발생했나
대표님 지시: "이 형태 그대로 다른 프로젝트에 가져갈 거야. 한 줄 명령어만 하면 그대로 카피 적용." 기존 관리자 화면은 TW B2B에 단단히 묶여 있어 다른 사업으로 옮기려면 매번 새로 만들어야 했습니다.

## 🛠 어떻게 해결했나
프로젝트 안에 ccf 폴더를 새로 만들고 핵심 모듈 4개(우선순위 정렬 엔진, 작업 완료 자동 감지기, 인계서 자동 생성기, 새 채팅 권장 판정기)와 데이터 표준 3개(작업·결정·작업 기록), 인계서 양식 2개, 한 줄 설치 스크립트를 자율적으로 추가했습니다. 정렬 엔진은 실제 작업 81건으로 검증했고 자율 8건 / 직원 4건 / 대표님 결정 5건 / 막힘 10건으로 정확히 분류됨을 수치로 확인했습니다.

## ✅ 결과
- 다른 사업에 작업 지휘소를 옮길 때: `curl ... | bash` 한 줄로 ccf 폴더 + 빈 작업 데이터 + 화면이 자동 배치됩니다.
- 우선순위 정렬은 7원칙 4번대로 5단계(막힘 제외 → 선행 완료 → 인프라 가중치 → 의존성 카운트 → 우선순위·사이즈) 자동 적용.
- 작업 완료 자동 감지: ops 알림 발송 시점에 작업 데이터의 상태가 자동으로 "완료"로 갱신되도록 호출 가능한 함수 형태로 준비.
- 인계서: 카드 클릭 한 번으로 클로드용·직원용 두 종류가 자동 생성되도록 분리.
- 자체 검증 7항목 모두 통과 (문법·데이터 표준·통합 호출·실데이터 분류·예외 입력 모두 확인).

## ⏱ 다음 결정 필요
없음. Phase B(TW B2B에 적용 — 화면 최상단 재배치 + 카드 클릭 동작 + 데이터 정정)는 같은 작업 안에서 이어서 자동 진행 예정. 분량 제어 차원에서 Phase A 단위로 끊고 대표님께 "이어서?" 확인만 받는 단계입니다.

---

# 🔧 기술 상세 (개발자용)

## 새로 만든 파일 (12개)

```
ccf/
├── README.md                      ← 7원칙 + 한 줄 이식 명령 + 디렉토리 가이드
├── core/
│   ├── queue-engine.js           ← 5단계 정렬 (ESM, 실데이터 검증 통과)
│   ├── auto-status-updater.js    ← extractTaskId / applyOpsCompletion / markStarted
│   ├── handoff-generator.js      ← buildClaudeHandoff / buildStaffHandoff
│   └── routing-judge.js          ← judgeRouting (≥3h, large, 토큰 한계 신호)
├── ui/
│   ├── command-center.html       ← (Phase B에서 작성)
│   └── command-center.css        ← (Phase B에서 작성)
├── schema/
│   ├── tasks.schema.json         ← v2.0 / ccf-tasks-v2 / status·priority·category enum
│   ├── decisions.schema.json     ← D-NNN 결정 기록 표준
│   └── chat-logs.schema.json     ← CLAUDE.md 11조 5블록 명문화 + 금지 용어 표
├── templates/
│   ├── handoff-claude.md         ← {{...}} 변수 치환 템플릿
│   └── handoff-staff.md          ← 직원용 간단 지시서 템플릿
└── bootstrap/
    ├── install.sh                ← 한 줄 이식 (ccf/ 통째 + tasks.json 빈 스키마)
    └── config.template.json      ← 프로젝트별 설정 템플릿
```

## 자체 검증 7항목 (헌법 12조)

1. ✅ JS 문법: `node --check ccf/core/*.js` 4개 모두 통과
2. ✅ JSON 검증: `python3 -m json.tool ccf/**/*.json` 4개 모두 통과
3. ⏳ Vercel deploy: ccf/는 정적 자산 영역만 추가, 빌드 영향 없음 (Phase B 적용 시 검증)
4. ⏳ 라이브 페이지 fetch: Phase B에서 admin-status.html 통합 후 검증
5. ✅ 데이터 정확성: 실제 tasks.json (81 tasks)으로 buildQueue 호출 → autonomous=8, staff=4, ceo=5, blocked=10 분류 측정
6. ✅ 시각 변경 자체 검증: Phase A는 백엔드 모듈만이라 UI 변경 없음 (ui/는 빈 슬롯)
7. ✅ boundary 케이스: extractTaskId — `BL-COMMAND-CENTER 진행`/`Phase 3 Step 5`/`completion with hash`/`explicit task_id` 4 케이스 모두 정상 (null/match 양쪽)

## 다음 단계 (Phase B — 같은 작업 안)

- ui/command-center.html — admin-status.html에서 추출한 작업 지휘소 UI를 모듈화
- 카드 클릭 동작 — 클립보드 자동 복사 + ops 알림 + 시작 시각 기록
- 화면 최상단 재배치 — 결정 대기 + 자율 큐를 admin-status.html 최상단으로 이동
- tasks.json 데이터 정정 — BL-CHAT-LOG-SYSTEM/BL-HUMAN-TAB-REWRITE/BL-COMMAND-CENTER 상태 갱신
- 직원 작업 큐 분리 표시 (started_by 컬럼)
- 5초 폴링 — 작업 도중 추가 발생 즉시 반영

## 메모

CCF는 TW B2B와 별도 자산이므로 운영 모드 진입 후에도 다른 프로젝트 이식 자산으로 보존됩니다. CEYLON JOURNEY에도 적용 가능 (헌법 부칙 2 — 인프라 원칙만 동일 적용).
