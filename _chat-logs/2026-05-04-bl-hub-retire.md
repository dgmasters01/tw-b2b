---
slug: 2026-05-04-bl-hub-retire
title: BL-HUB-RETIRE — admin-hub 폐기, admin-status 통합 진입점 승격
date: 2026-05-04
commits: [4d04557, 25615af]
tasks: [BL-HUB-RETIRE]
decisions: [D-013, D-012]
---

# BL-HUB-RETIRE — admin-hub 폐기

**시간**: 2026-05-04 (1차 ~09:00 UTC + 마무리 ~09:30 UTC)
**Commits**: `4d04557` (1차 11파일), `25615af` (마무리 8파일)
**연관 결정**: D-013 (admin-hub 폐기), D-012 (3-Layer 분리 + admin-tasks 흡수)

---

## 대표님이 하신 말씀 (원문)

> "사이드바 메뉴 6개에 admin-hub 안에도 4 카테고리 카드 또 있으면 중복이잖아. 필요 없는 거 같애."

## Claude의 자율 판단

**핵심 통찰**: 사이드바 자체가 카테고리 라우팅을 완벽히 처리하는데, admin-hub가 똑같은 카드를 한 번 더 보여주는 건 클릭 단계만 늘리는 잉여 레이어. 헌법 7조 "5초 안에 파악" 위배.

**자율 결정 사항** (대표님께 묻지 않고 Claude가 정한 것):
- vercel.json에 301(308) 영구 리다이렉트 박을 위치
- admin-hub.html을 폐기 안내 페이지로 교체 시 3중 안전망 (meta refresh + JS replace + 사용자 안내)
- admin-status.html 6 카드 → 5 카드 재정렬 시 카테고리 0(Central Hub) 제거 후 Card 2~6 → 1~5 재번호
- 헌법 부칙 5 D-010 매핑 표 카테고리 0을 admin-status.html로 이관
- scripts/scan-pages-status.mjs에 retired 페이지 평균/카운트 제외 로직 추가

## 변경 파일 (총 19개)

**1차 commit (4d04557)**:
1. admin.html — 사이드바 Tools 6→5 (Central Hub 제거, System Status 보라 그라디언트 강조)
2. vercel.json — /admin-hub.html + /admin-hub 둘 다 301 리다이렉트
3. admin-hub.html — 폐기 안내 페이지 (196 → 59줄)
4. admin-status.html — 6 카테고리 카드 → 5 카드 재정렬, '허브로' → 'Admin'
5. admin-service-ops.html — 'Back to Hub' → 'Back to Admin'
6. OPERATIONS_CHARTER.md — 부칙 5 / D-010 매핑 표 카테고리 0 이관 + 개정 이력
7. DECISIONS.md — D-012 + D-013 추가
8. DECISIONS_INDEX.md — D-012/D-013 등록 + 짝 문서 매핑
9. scripts/scan-pages-status.mjs — sidebarMenus 5개로 축소
10. scripts/pages-meta.mjs — admin-hub status: live → retired
11. scripts/charter-mapping-check.mjs — Check 4 재정의 + Check 4-V 신설

**마무리 commit (25615af)**:
12. js/stats.js — Category 0 admin-hub → admin-status 주석 정정
13-15. pages-status.{json, display, summary}.json — retired 마킹 + 평균 75→77 재계산
16. scripts/scan-pages-status.mjs — retired 페이지 평균/카운트 제외 로직 박음
17. tasks.json — BL-HUB-RETIRE done 등록
18. CHANGELOG.md
19. ECHO_LOG.md

## 막혔던 지점

**없음**. 1차 commit 후 새 채팅 시작했을 때 컨텍스트 부족으로 마무리 분리 진행. (대표님이 "지금 이 상태 그대로 commit/push만 해" 라고 결정해 주셔서 무사히 마무리)

## 검증 결과

- charter-mapping-check **30/30 PASS**
- scan-pages-status admin-hub `[retired]` 표시, 평균 77점, active 18/19
- 라이브 검증: `gohotelwinners.com/admin-hub.html` → 308 → `/admin-status.html` → 200 OK 체인 정상
- ops 메일은 토큰 인증 때문에 Claude가 직접 발송 불가, 대표님께 명령어 제공

## 다음 채팅에 인계할 메모

- IP-CTRL-001 5단계 (admin-tasks 4탭 → 단일 통합 뷰)는 이미 BL-PAGE-DEDUP에서 dashboard 탭 제거로 부분 진행됨
- 실질 잔여 = "자율 작업 큐 UI 추가"만 남음
- 다음 P0 후보: BL-AURORA-MIGRATION (5페이지 디자인) 또는 BL-MANAGER-DASH-001 (D-007/D-008 결정 필요)
