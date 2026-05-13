---
slug: 2026-05-13-bl-dependency-map
title: BL-DEPENDENCY-MAP — BL과 페이지 의존성 매핑 시각화
date: 2026-05-13
tasks: [BL-DEPENDENCY-MAP]
commits: []
decisions: []
---

## 🎯 한 줄 요약

각 BL이 어느 페이지에 박힐지 매핑하고 admin-gallery에 "이 페이지에 박힐 BL N건"으로 한눈에 보이게 만들었다.

## 📍 왜 발생했나

대표님이 정확히 짚으셨다: "매니저가 보는 최종 페이지도 만들지 않았는데 영수증 자동발행을 만들면 안 되잖아. 어디에 넣을 건지 모르지 않나?" 진단해 보니 admin-gallery에 19개 페이지 시각은 있었지만 각 BL이 어느 페이지에 박힐지 매핑이 0건이었고, 그 결과 BL-INVOICE-001(영수증) 같은 BL이 떠다녔다. sales.html과 marketing.html이 planned 상태인데 영수증 BL이 자율 큐에 박혀 있어서 박힐 자리가 없는 상황. 페이지 의존성 무시.

## 🛠 어떻게 해결했나

37개 pending BL 전부를 target_pages 필드로 매핑했다. 사용자 페이지(sales/marketing/signup/admin 등)와 인프라(__os__/__email__/__event-site__) 구분. admin-gallery.html에 tasks.json fetch + 페이지별 BL 카운트 로직 박았다. 각 페이지 카드에 "🧩 이 페이지에 박힐 BL N건"이 우선순위(P0/P1/P2) + 예상 시간 합계와 함께 표시된다. BL 없는 페이지는 "✅ 대기 중인 BL 없음 (정상 운영 중)" 표시.

## ✅ 결과

- 37개 BL 전부 target_pages 매핑 완료 (누락 0건)
- admin-gallery 카드에 BL 카운트 박스 표시
- P0 BL 개수 빨간 배지 별도 표시
- 예상 시간 합계 자동 계산
- 캐시 우회 (cache:no-store) 박혀서 항상 최신 상태
- 대표님이 페이지 보면서 "여기에 박힐 작업 무엇 있는지" 즉시 파악 가능

## ⏱ 다음 결정 필요

추가 결정 없음. 다음 단계 추천: sales.html과 marketing.html planned → live 전환 작업 시작 (이게 5건 P0 BL이 박힐 자리).

---

# 🔧 기술 상세 (개발자용)

## 박은 파일 2개
1. `tasks.json` — 37개 BL에 target_pages 필드 추가
2. `_admin/admin-gallery.html` — tasks.json fetch + BL 카운트 박스 (line ~123 + cardHtml 함수)

## target_pages 매핑 규칙

| 종류 | 매핑값 예시 | 의미 |
|---|---|---|
| 실제 페이지 | `/sales.html`, `/marketing.html` | 그 페이지 카드에 박힘 |
| `__os__` | OS 인프라 BL | 페이지 카드 안 박음 (Claude 자율 영역) |
| `__email__` | 메일 시스템 BL | 페이지 아님 |
| `__event-site__` | 별도 도메인 (D-034) | TW B2B 페이지 아님 |
| `__user-env__` | 사용자 환경 (Chrome 등) | 우리 영역 외 |
| `__docs__` | 문서 작업 | 페이지 아님 |

## BL 카운트 박스 디자인
- 보라색 (rgba(99,102,241,0.08)) 배경 + 좌측 #6366f1 border-left
- 헤더: 🧩 이 페이지에 박힐 BL {count}건 [P0 N] · 약 Xh
- BL 리스트: 5개까지 + "+ N개 더" 표시
- 우선순위별 색상 (P0 빨강 #dc2626, P1 노랑 #f59e0b, P2+ 회색)

## 페이지별 BL 분포 (현재)
- `/sales.html` (planned): 3건 — INVOICE-001, PAST-VIDEO-RECON, SIGNUP-ENRICHMENT
- `/marketing.html` (planned): 6건 — HOTEL-DETAIL-PAGE, REVENUE-DASHBOARD, INVOICE-001, RECEIPT-ARCHIVE, REFUND-FLOW, TRACK-001
- `/admin.html` (live): 5건+ — PAST-VIDEO-RECON, HOTEL-DETAIL-PAGE, REFUND-FLOW, RENEWAL-WATCH, ADMIN-COUNTRY-FILTER 등
- `/signup.html` (live): 2건 — SIGNUP-ENRICHMENT, SIGNUP-COUNTRY-FIELD
- `/booking-analytics.html` (live): 1건 — REVENUE-DASHBOARD

## 검증
- ✅ JS 문법 모듈 syntax OK
- ✅ 변경 마커 17건
- ✅ 37개 BL 전부 매핑 (누락 0건)
- ✅ 캐시 우회 cache:no-store 박힘

## 효과
- 대표님이 "이 페이지에 박힐 작업 있나?" 즉시 확인 가능
- 매니저 여정 페이지(sales/marketing)의 의존성 BL이 한눈에 보임 → 페이지 먼저 만들지 영수증 먼저 만들지 판단 가능
- BL 자율 큐 순서가 정상화될 기반 (다음 작업: sales.html 만들기 자동 추천)
