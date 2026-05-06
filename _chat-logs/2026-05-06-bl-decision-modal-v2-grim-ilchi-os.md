---
slug: 2026-05-06-bl-decision-modal-v2-grim-ilchi-os
title: "그림 일치 OS 발견 — 헌법 12조/13조 + 9개 새 작업 큐"
date: 2026-05-06
tasks: [BL-DECISION-MODAL-V2, BL-LIVE-STATUS-PANEL, BL-LIVE-STATUS-AUTO-DETECT, BL-MODAL-COPY-REWRITE, BL-DECISION-MODAL-V2-PHASE-B, BL-DECISION-MODAL-V2-PHASE-C, BL-ACTIVITY-LOG-DUAL-LANG, BL-MODAL-EMPTY-FILL, BL-OS-DETAILS-DOC, BL-OS-5MENU-EXPAND, BL-CATEGORY-UNIFY]
phase: discovery
commits: []
decisions: ["헌법 12조 (그림 일치)", "헌법 13조 (순서 정리 자동화)"]
---

## 🎯 한 줄 요약
대표님이 BL-DECISION-MODAL-V2 모달 라이브 검증 도중 12단계에 걸쳐 통찰을 누적해 주셨고, 그 누적 끝에 '그림 일치 OS'라는 더 큰 그림이 발견됐습니다. 헌법 12조(그림 일치) + 13조(순서 정리 자동화)를 박고, 9개 새 작업을 시스템 완성도 의존성 순서대로 tasks.json에 등록했습니다.

## 📍 왜 발생했나
원래 계획은 BL-DECISION-MODAL-V2 Phase A → B → C 순차 진행이었습니다. Phase A를 push한 직후 대표님이 라이브 화면을 검증하면서 다음 12단계 통찰을 차례로 주셨어요:

1. "이거 맞는거야?" — 빨간 빈 박스 + 정리 요청 버튼이 헌법 1조 위반
2. "초등학생도 읽게" — 옵션이 'Supabase Auth' 'ACL 매핑' 같은 개발자 톤
3. "요약되면 오해" — 자세히 풀어쓰기 필요 (요약은 위험)
4. "내 의견 적으면 피드 주나?" — 결정 흐름에 대화 없음
5. "여기서 이야기, 한창에서 마무리" — 결정의 본질 발견
6. "공통 방향 맞추기" — 헌법 만드는 것도 그림 일치
7. "활동이력 / 동기화 / 다른 프로젝트" — 그림 일치 OS 정체 발견
8. "5개 카테고리 + 세부 카테고리" — OS 적용 범위
9. "헌법은 짧게, 세부는 별도" — 헌법 구조 원칙
10. "진행 중 표시 / 동시 표시 / 클립보드 ≠ 실행" — 진행 현황판
11. "끝나면 자동 새 작업 시작 가능 신호" — 진행 중 영역 진짜 역할
12. "시스템 완성도 기준 작업 / 순서 자동 정리" — 헌법 13조 발견

각 단계마다 제가 추측으로 박고, 대표님이 잘못 짚어주시고, 다시 그림 맞추기 반복. 그 과정에서 '결정 = 옵션 선택'이 아니라 '그림 일치 대화'라는 본질이 드러났고, 이 OS가 TW B2B만이 아니라 모든 사업에 이식 가능한 자산이라는 발견까지 도달.

## 🛠 어떻게 해결했나

### 1. 헌법 12조 (그림 일치) 짧은 버전 박기
대표님 원칙대로 헌법은 핵심 방향만, 세부는 별도 문서. 12조 본문 한 단락 + 5개 불릿 + 발견 경위 한 줄. 한 화면 안에 들어가는 분량.

### 2. 헌법 13조 (순서 정리 자동화) 박기
"새 작업 발견 시 Claude가 알아서 의존성 분석 + 전체 순서 재정렬" + "대표님은 진행해/멈춰/수정 세 마디만". 헌법 1조 강화.

### 3. 9개 새 작업 tasks.json 등록 (시스템 완성도 순서)

Layer 1 — OS 골격 (P0):
- BL-LIVE-STATUS-PANEL (실시간 진행 현황판 + 활동 이력 연동)
- BL-LIVE-STATUS-AUTO-DETECT (commit 자동 감지)

Layer 2 — 모달 완성 (P0):
- BL-MODAL-COPY-REWRITE (8개 작업 풀어쓰기)
- BL-DECISION-MODAL-V2-PHASE-B (좌우 분할 + 그림 맞추기 시작 버튼)
- BL-DECISION-MODAL-V2-PHASE-C (자동 저장)

Layer 3 — 활동 이력 확장 (P1):
- BL-ACTIVITY-LOG-DUAL-LANG (두 언어 자동 변환)
- BL-MODAL-EMPTY-FILL (빈 8개 풀 맥락)

Layer 4 — 확장 (P2):
- BL-OS-DETAILS-DOC (그림 일치 OS 세부 문서)
- BL-OS-5MENU-EXPAND (5개 카테고리 메뉴 적용)

### 4. 카테고리 통일 (BL-CATEGORY-UNIFY 즉시 실행)
한글 '기능' 카테고리 → 영어 'feature'로 통일. 헌법 D-010 (카테고리-파일 단일 매핑) 정합성 회복. BL-DECISION-MODAL-V2가 한글 '기능'으로 박혀 있던 문제 해결.

## ✅ 결과
- 헌법 12조 + 13조 박힘 → 다음 채팅에서 같은 실수 재발 방지
- 9개 작업이 시스템 완성도 순서로 큐 등록 → "다음 뭐?" 질문 사라짐
- 카테고리 한글/영어 혼재 해결 → 카테고리 진행률 정확
- 다음 채팅 시작 시 1번 작업(BL-LIVE-STATUS-PANEL)부터 자동 진행 가능

## ⏱ 다음 결정 필요
없음. 다음 채팅에서 BL-LIVE-STATUS-PANEL부터 자율 시작.

---

# 🔧 기술 상세

## 변경 파일

### 1. OPERATIONS_CHARTER.md
- 헌법 12조 (그림 일치) 신설 — 본문 한 단락 + 5개 핵심 불릿 + 발견 경위
- 헌법 13조 (순서 정리 자동화) 신설 — 본문 한 단락 + 4개 불릿 + 발견 경위
- 한 페이지 요약에 12조 + 13조 한 줄씩 추가

### 2. tasks.json
- 한글 '기능' 카테고리 → 'feature' 통일 (1개 작업 영향)
- 9개 새 작업 등록 (BL-LIVE-STATUS-PANEL 외 8개)
- 총 84개 → 93개

## 자체 검증
- 헌법 12조/13조 분량: 각 한 화면 (대표님 원칙 준수)
- 카테고리 통일: 한글 '기능' 0개 (검증 통과)
- 새 작업 9개 모두 ceo_decision="그림 일치 완료 — 진행" 박힘 → 모달에서 즉시 진행 가능
- 의존성 표시: BL-OS-5MENU-EXPAND가 BL-LIVE-STATUS-PANEL + BL-DECISION-MODAL-V2-PHASE-C 의존 명시

## 다음 채팅 자동 진입 조건 (헌법 13조 적용)
- OPERATIONS_CHARTER.md → CLAUDE.md → tasks.json 순으로 fetch
- pending + ceo_decision 박힌 작업 중 가장 위 순서 = BL-LIVE-STATUS-PANEL
- 자동 진행 (대표님 답변 안 기다림)

## 운영 알림
POST gohotelwinners.com/api/email/ops/notify-claude-work
- step: "헌법 12조/13조 + 9개 작업 큐 등록 — 그림 일치 OS 시작"
