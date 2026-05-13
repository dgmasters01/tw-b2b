---
slug: 2026-05-13-bl-urgent-card-flow
title: BL-URGENT-CARD-FLOW — 임박 작업 카드 클릭 흐름 통합
date: 2026-05-13
tasks: [BL-URGENT-CARD-FLOW]
commits: []
decisions: [D-037]
---

## 🎯 한 줄 요약

임박 작업 카드를 클릭하면 다른 페이지로 점프하지 않고 그 자리에서 결정·인계서·핑퐁이 한 화면에 통합 모달로 펼쳐진다.

## 📍 왜 발생했나

이전에는 임박 작업 카드를 클릭하면 갑자기 `/admin-tasks.html` 편집 페이지로 점프했다. 대표님이 작업 흐름을 보고 있다가 다른 화면으로 갈아타야 했고, 결정·인계서·핑퐁이 분리되어 흐름이 깨졌다. BL-CHATLOG-AUTO-GATE 카드는 이미 인계서 모달이 같은 자리에서 떴는데, 임박 카드만 다른 방식이라 일관성도 어긋났다.

## 🛠 어떻게 해결했나

이미 시스템에 박혀있던 통합 모달 함수(`openCeoDecisionModal`)를 임박 카드 클릭에 연결했다. 그 함수는 결정 맥락, 옵션, 추천, 핑퐁 라운드, 인계서 전체를 한 모달 안에 다 보여준다. 임박 카드뿐 아니라 카테고리 진행률 안의 작업 행, 펼침된 카드 안의 작업 행까지 3곳 모두 같은 방식으로 통일했다. 안전망으로 함수가 미정의된 상황에서는 기존 페이지로 점프하도록 폴백도 박았다.

## ✅ 결과

- 임박 작업 카드 클릭 → 같은 자리에서 통합 모달 등장 (페이지 점프 없음)
- 결정·인계서·핑퐁 한 화면에서 동시 작업 가능
- 펼침된 카테고리 안 작업 행도 같은 흐름
- 결정 박힘 → tasks.json 자동 갱신 + 자율 큐 자동 이동 (모달 내부 기존 로직)

## ⏱ 다음 결정 필요

다음 라운드에서 통합 모달의 섹션 구성(인계서 본문 + 결정 입력 + 핑퐁 영역 배치 순서)을 박을지 결정 필요. 지금은 기존 모달 구성 그대로 사용.

---

# 🔧 기술 상세 (개발자용)

## 변경 위치 (admin-status.html 3곳)
1. **line 4056~** `wrap.querySelectorAll('.urgent-card')` 클릭 핸들러
2. **line 3010~** `grid.querySelectorAll('.cat-task-row')` 펼침된 카테고리 안
3. **line 4163~** `document.querySelectorAll('#cat-progress .cat-task-row')`

## 통일된 핸들러 패턴
```javascript
el.addEventListener('click', () => {
  const id = el.dataset.id;  // or el.dataset.taskId
  if (!id) return;
  if (typeof openCeoDecisionModal === 'function') {
    openCeoDecisionModal(id);
  } else {
    location.href = `/admin-tasks.html?id=${encodeURIComponent(id)}`;  // 폴백
  }
});
```

## openCeoDecisionModal (line 4798) — 기존 함수 재사용
- V2 필드 지원: decision_context / options / recommendation
- BL-DECISION-CTX-FROM-NOTES (2026-05-12): notes 자동 빌드 폴백
- BL-PINGPONG-BL-ISOLATION (2026-05-10): 모달 열기 시 이전 폴링 정지
- BL-TASKS-CACHE-BUST (2026-05-11): cache: no-store

## 의도적으로 유지한 location.href
- **line 6239** 모달 내부 "상세보기" 버튼 — admin-tasks 페이지 이동이 의도된 동작
- 3개 폴백 (line 3019, 4074, 4171, 4363) — 함수 미로드 안전망

## 검증
- ✅ JS 문법 3블록 OK
- ✅ openCeoDecisionModal 호출 마커 15회
- ✅ 안전망 폴백 4개 유지
- ✅ 모달 내부 상세보기 버튼 동작 유지

## D-037 결정 흐름
- 핑퐁 1라운드 만에 확정 (대표님 "A안으로 하자")
- A안 = 통합 모달 / B안 = 클립보드 중계 (각각의 차이는 모달이 페이지 안에 떠 있느냐 외부 채팅으로 가느냐)
