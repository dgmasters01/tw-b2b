---
slug: 2026-05-05-status-final-v2-ux-clarity
title: admin-status v2 UX 명확성 — KPI 클릭 시 강한 시각 안내 + 0건 메시지 의미화 + 활동 이력 시간근접 매핑
date: 2026-05-05
commits: []
tasks: [BL-STATUS-FINAL-V2]
decisions: []
---

# 2026-05-05 admin-status UX 명확성 강화

**TASK**: BL-STATUS-FINAL-V2 (신규)
**STATUS**: ✅ done
**선행**: BL-STATUS-FINAL (commit c545cd9)

## 대표님 4가지 지적 → 박은 fix

### ① "KPI 4곳 클릭하면 같은 곳으로 가는 것 같다 — 어디인지 표시 없음"

**원인**: 모든 KPI가 `integ-urgent` 박스로 스크롤되는데 시각 표시가 약함. 박스 자체는 강조 없음.

**박은 fix (4중 시각 안내)**:
1. **화살표 마커 떨어짐** — KPI 카드 위치에서 `👇` 이모지가 1.3초간 fly-down 애니메이션
2. **임박 박스 자체 펄스** — `kpi-target-pulse` 2초 애니메이션 (보라/분홍 그라데이션 box-shadow)
3. **"👈 여기가 클릭한 KPI 결과입니다" 텍스트** — 임박 박스 헤더에 4초 표시 후 자동 숨김
4. **scrollIntoView block 'start'** — 헤더부터 보이게 (이전엔 'center')

### ② "활동 이력 chat-log 못 찾음" — 작업 안 된거지?

**진단**: `6501578` commit이 **repo에 존재하지 않는 commit**. 다른 branch였거나 force-push로 사라진 듯.

**박은 fix (시간 근접성 매핑)**:
- `build-chat-log-index.mjs`에 **4단계 매핑** 박음:
  1. chat-log 파일 변경 commit (git log -- _chat-logs/{slug}.md)
  2. commit message에 slug 직접 매칭
  3. commit message에 task ID 매칭
  4. **★ 시간 근접성 fallback** — 같은 날짜의 chat-log로 자동 매핑 (suffix `(시간근접)`)
- git log 깊이 500 → 2000
- byCommit **18 → 42건**으로 2배 이상 증가
- admin-status.html에 `isApprox` 플래그 추가 — 시간근접 매핑 시 노란 안내 박스 표시 ("⚠️ 정확한 매핑 아님 — 같은 날짜의 chat-log를 추정 표시")

### ③ "임박 작업 (P0+진행중) — 직원 트리거 가능 전체 0건" 무슨 의미?

**박은 fix (의미 있는 안내)**:
- 빈 메시지를 역할별로 의미화:
  - 자동 0건: "🎉 자동 진행 가능한 P0/진행중 작업 없음 → 자동 13건 모두 P1/P2 우선순위"
  - 직원 0건: "👥 직원에게 부탁할 작업이 0건입니다 → 모든 미완료가 자동 또는 CEO 결정"
  - CEO 0건: "👤 결정 필요 P0/진행중 없음 → 결정 대기 5건은 P1/P2. 하단 '결정 대기' 박스 확인"
- 다음 액션 안내 박음

### ④ "시급 페이지 클릭 → 카테고리 + 진행률 펼침 — 어디?"

**원인**: 페이지 맨 아래 박스인데 대표님이 못 찾으심.

**박은 fix**:
1. 시급 페이지 박스 헤더 아래 **큰 안내 박스** 박음:
   - "💡 각 행 클릭 → 위쪽 '사이드바 5개 메뉴' 카드와 '📂 카테고리별 진행률' 동시에 펼쳐지면서 분홍 펄스로 표시됩니다"
   - aurora-2 색 배경 + border (눈에 띄게)
2. **호버 효과 강화** — `.top-row[data-page-path]:hover` border-color + transform translateX(2px)
3. **호버 시 "👉 클릭하면 카테고리 + 진행률 펼침" 툴팁** ::after 박음

## 변경 파일

- `_admin/admin-status.html` (+250줄, 76316 chars)
  - CSS: `.urgent-section-header` `.kpi-target-pulse` `.kpi-arrow-marker` `slide-in-right` `arrow-fly` 애니메이션
  - CSS: `.top-row:hover` 강조 + `::after` 툴팁
  - HTML: 시급 페이지 박스 헤더 안내 박스 박음
  - HTML: 임박 박스 헤더에 `urgent-jump-hint` span 박음
  - JS: KPI 클릭 핸들러 강화 (4중 시각 안내)
  - JS: `renderIntegratedUrgent` 0건 메시지 역할별 의미화
  - JS: `isApprox` 플래그 추가 + 시간근접 매핑 안내 표시
- `scripts/build-chat-log-index.mjs` (+30줄)
  - `buildAutoCommitMap`에 시간 근접성 fallback 박음 (4단계 매핑)
  - git log 깊이 500 → 2000
- `tasks.json` BL-STATUS-FINAL-V2 done 박음
- `_chat-logs/index.json` byCommit 42건으로 갱신 (git log 자동)

## 진행률 평가

- **이 작업 전: 100%** (BL-STATUS-FINAL 직후, 기능적 완성)
- **이 작업 후: 100% + UX 명확성 강화**

기능 완성도는 동일하지만 **사용자 경험**이 크게 개선됨:
- 클릭 → "어디로 갔는지" 명확 (4중 안내)
- 0건 → "왜 0건인지" 명확 (역할별 메시지)
- 시급 페이지 → "클릭 가능" 명확 (호버 + 안내 박스)

## 헌법 적합성

- ✅ 메모리 5번/24번 (위치/구조 자율)
- ✅ 메모리 17번 (str_replace, wholesale rewrite 0건)
- ✅ 헌법 7조 — 5초 파악 (UX 명확성 강화로 더 빨라짐)
- ✅ admin.html 미접근
