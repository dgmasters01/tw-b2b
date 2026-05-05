---
slug: 2026-05-04-ip-ctrl-001-autoqueue
title: IP-CTRL-001 5단계 — 자율 작업 큐 UI + 헌법 1조 자율판단 강제 박음
date: 2026-05-04
commits: [7f340dc]
tasks: [IP-CTRL-001]
decisions: []
auto_migrated: true
---

## 🎯 한 줄 요약
IP-CTRL-001 5단계 — 자율 작업 큐 UI + 헌법 1조 자율판단 강제 박음

## 📍 왜 발생했나
**시간**: 2026-05-04 16:00 KST 전후

## 🛠 어떻게 해결했나
메모리 24번 위반 자가 진단 / 메모리 5번 교체 / 위치 자율 판단

## ✅ 결과
tasks.json: IP-CTRL-001 status: in_progress → done (5/5 단계 완료)

## ⏱ 다음 결정 필요
없음

---

# 🔧 기술 상세 (개발자용)

# IP-CTRL-001 5단계 — 자율 작업 큐 UI

**시간**: 2026-05-04 16:00 KST 전후
**Commit**: `7f340dc`
**연관 작업**: BL-HUB-RETIRE(부모) → BL-PAGE-DEDUP → IP-CTRL-001

---

## 대표님이 하신 말씀 (원문)

Claude가 자율 작업 큐 UI를 어디에 박을지 물어봤음. 대표님 답:

> "이부분은 시스템적인거니깐. 너가 알아서 체크해야 정리해야 되지 않나? 나는 방향만 설정하면 되잖아.
> 이런 세부적인것은 너가 작업시스템을 하기위해 최적이면서 나와 방향에 맞는 정확한 곳에 위치해야 되지 않나?"

## Claude의 자율 판단

### 메모리 24번 위반 자가 진단

이미 메모리 24번에 명시되어 있었음:
> "시스템 디테일은 Claude가 100% 자율 판단·실행. 대표님께 시스템적 분류/위치/방법 묻지 말 것."

그런데 Claude가 같은 채팅 안에서 위치 질문을 두 번이나 함. 메모리 24번 자체("같은 우려 두 번 = 시스템 설계 실패")로 책임 인정.

### 메모리 5번 교체

기존 메모리 5번은 outdated된 헌법 v2 + BL-CENTRAL-HUB 1단계 상태 정보. 이를 다음으로 교체:

> [헌법 1조 자율판단 강제 - 2026-05-04 통합] 위치/구조/배치 질문 절대 금지: "어디 박을까요" "어느 페이지/탭에" "어떤 구조가 좋을까요" 등은 시스템 디테일 = Claude 100% 자율. 부칙5 D-010 매핑 표 + 단일 진실 + 사용자 동선(클릭 최소) 기준으로 즉시 결정 → 박기 → commit/push/검증/보고. 대표님은 "방향/작동" 확인만.

### 위치 자율 판단

**박은 위치**: admin-status.html, 카테고리 진행률 섹션 직후

**근거**:
1. 자율 작업 큐 = 개발 운영 영역 (메모리 26번: admin-status는 개발 영역 / 사업 KPI는 별도 분리)
2. BL-HUB-RETIRE 후 admin-status가 통합 진입점 — "한 화면 전체 보기" 충족
3. 임박 작업 KPI 섹션과 인접 — 흐름 자연스러움

## 기능 설계

- 필터: `claude_can_auto && status === 'pending' && !approval_required`
- 정렬: P0 → P1 → P2
- 상위 12개 카드만 표시
- 카드 클릭 = 클립보드 자동 복사 (메모리 26번 A) + ops 알림 베스트에포트 (B) + 토스트
- 대표님은 새 채팅에서 Cmd+V 한 번 → Claude 자율 작업 즉시 시작

## 변경 파일

- admin-status.html: CSS 78줄 + HTML 9줄 + JS 89줄 (renderAutoQueue + showAutoQueueToast)
- tasks.json: IP-CTRL-001 status: in_progress → done (5/5 단계 완료)
- 메모리 5번 교체

## 검증

- HTML 자가검증 **16/16 PASS**
- JS 문법 검증 PASS (25,970 chars)
- charter-mapping-check **30/30 PASS** 유지
- scan-pages-status admin-status 80점 유지

## 다음 채팅에 인계할 메모

- 자율 작업 큐 카드 클릭은 1줄짜리 메시지만 복사 (`{ID} 즉시 시작 — {title}`)
- 추후 발견된 문제: 채팅 인계 풀 컨텍스트 기능이 사라짐 (UX-FEEDBACK-1 작업 시 panel-handoff 제거하면서 자율 작업 큐로 통합한 게 사실 축소였음)
