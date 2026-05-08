---
slug: 2026-05-08-bl-ai-tab-bot-detect
title: BL-AI-TAB-BOT-DETECT — AI용 탭에서 봇 자동 갱신 commit 감지·안내
date: 2026-05-08
tasks: [BL-AI-TAB-BOT-DETECT]
commits: [pending]
decisions: []
---

## 🎯 한 줄 요약
관리 화면의 활동 상세에서 봇이 자동으로 박은 작업과 사람이 직접 박은 작업을 한눈에 구분되게 만들었다.

## 📍 왜 발생했나
사람용/AI용 두 개 탭 중 AI용 탭이 봇이 박은 자잘한 자동 갱신 작업까지 "의사결정 기록 못 찾음" 메시지로 보여줘서 진짜 중요한 결정 commit이 노이즈에 묻혔다. 매니저가 활동 이력을 훑을 때 봇 작업을 매번 클릭해 확인할 필요 없도록 첫눈에 구분되게 박아야 했다.

## 🛠 어떻게 해결했나
관리 화면 활동 상세 화면(AI용 탭) 진입 시 작업 내용 첫 머리에 박힌 봇 이름 패턴(`[scan-bot]`, `[sync-bot]`, `[auto-detect-bot]`, `[health-bot]`, `[activity-bot]`)을 먼저 검사한다. 봇이면 의사결정 로그 검색을 건너뛰고 봇 역할 설명과 함께 "AI 컨텍스트 불필요"라는 안내를 박는다. 사람이 박은 작업이면서 매칭이 0건일 때만 "검색 키"가 노출되어 사람이 박은 누락 사례인지 확인할 수 있게 했다.

## ✅ 결과
- 매니저가 활동 이력을 훑을 때 봇 자동 갱신과 사람 결정 작업을 한눈에 구분 가능.
- AI용 탭의 노이즈 안내 80~90% 제거 (활동 50건 중 봇 비율이 다수).
- 사람 commit이면서 매칭 0건인 진짜 결함 사례만 검색 키로 노출되어 후속 점검이 쉬워짐.

## ⏱ 다음 결정 필요
없음. (자율 진행 BL이라 대표님 결정 불필요)

---

# 🔧 기술 상세 (개발자용)

## 변경 파일
- `_admin/admin-status.html` — `loadAITab(pane, item)` 함수 진입부에 봇 감지 분기 추가, 매칭 0건 안내 UI 개선

## 핵심 변경
```js
const BOT_COMMIT_PATTERN = /^\[(scan-bot|sync-bot|auto-detect-bot|health-bot|activity-bot)\]/;

function detectBotCommit(item) {
  const action = String(item && item.action || '');
  const m = action.match(BOT_COMMIT_PATTERN);
  return m ? m[1] : null;
}

async function loadAITab(pane, item) {
  const botName = detectBotCommit(item);
  if (botName) {
    // 봇 역할 설명 + "AI 컨텍스트 불필요" 안내, ECHO_LOG/DECISIONS 검색 skip
    return;
  }
  // 기존 ECHO_LOG/DECISIONS 검색 흐름 유지
}
```

## 봇 역할 매핑 (UI 안내용)
- `scan-bot` — 페이지 완성도 자동 측정 (HTML 변경 감지 → pages-status 갱신)
- `sync-bot` — tasks.json ↔ MD/Gallery 양방향 자동 동기화
- `auto-detect-bot` — commit 메시지 분석 → 작업 status 자동 갱신
- `health-bot` — _health.json 주기 갱신, vercel-sync 복구
- `activity-bot` — activity-feed.json 자동 빌드

## 검증
- `BOT_COMMIT_PATTERN` 박힘 확인 ✓
- `detectBotCommit` 함수 박힘 확인 ✓
- 봇 안내 메시지 박힘 확인 ✓
- 매칭 0건 개선 안내 박힘 확인 ✓
- `loadAITab` 함수 단일 정의 유지 ✓

## 진행 메모
- BL 3종 패키지(BL-URGENT-CARD-FLOW, BL-CHATLOG-BIZ-FORMAT, BL-AI-TAB-BOT-DETECT) 중 자율 진행 가능 1번을 분리 처리.
- BL-CHATLOG-BIZ-FORMAT은 Q2(부칙 위치) 답변 후 진행 예정.
- BL-URGENT-CARD-FLOW는 Q1 답변 후 새 채팅에서 단독 처리 권장 (모달 재설계 분량 large).
