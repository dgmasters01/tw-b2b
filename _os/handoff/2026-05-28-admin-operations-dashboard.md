# 인계 — BL-ADMIN-OPERATIONS-DASHBOARD (2026-05-28)

## 이번 채팅에서 확정된 결정
- **시안 C 확정**: admin.html 맨 위에 "오늘 할 일 + 이번 달 숫자(매출/계약호텔/예약/미수금)" 요약을 좌우 나란히 고정 배치. 메뉴 바뀌어도 이 요약은 항상 보임.
- **메뉴 동작 방식 확정(이미 그렇게 구현돼 있음)**: 페이지 이동 아님. 같은 화면에서 메뉴 누르면 오른쪽 칸 내용만 교체(ad-tab-pane display 토글, 사이드바 .ad-sb-item data-tab 방식). 대표님 이 방식이 이상적이라 동의함.
- **메뉴 위치**: 현행 왼쪽 세로 사이드바 유지(모바일 편의). 위쪽 가로탭으로 바꾸는 건 미채택.

## admin.html 현황 (= _admin/admin.html, 6225줄, 거대파일)
- 라이브: gohotelwinners.com/admin.html (302 = 미로그인 차단 정상)
- 이미 있는 8개 탭(data-tab): dashboard(오늘 할일/Today's Inbox), bookings(예약입력: 직접+아고다리포트), analytics(매출분석), video-revenue(영상매출 등급), hotels(계약호텔/승인거절), agoda-matching(아고다 짝짓기), members(호텔 담당자), admins(팀원/초대)
- 디자인: Aurora 사이드바 이미 적용됨

## 다음 채팅이 할 일 (코드 작업)
1. admin.html 맨 위(탭 영역 위 공통 헤더)에 시안 C 요약 블록 신설: 좌=오늘 할일 N건, 우=이번달 매출/계약호텔/예약/미수금. 실데이터 연결.
2. 요약 블록은 탭 전환과 무관하게 항상 표시(ad-tab-pane 밖, 공통 영역).
3. **인보이스 메뉴 연결 여부 = 대표님 미결정 → 코드 시작 전 1줄 확인 필요.** (BL-INVOICE 시스템은 완성돼 있으나 admin 사이드바에 메뉴 없음. 넣으면 8→9탭)
4. 부칙 16.1ⓓ 준수: 6225줄 거대파일이므로 이 작업 1개만 한 채팅에. str_replace 부분편집만(전체 재작성 금지). 백업 _backup 먼저.
5. 부칙 19 준수: 요약 블록 데이터도 5초 폴링 renderAll 루프에 등록(부분갱신 금지).

## 환경(직전 인계서 동일)
- repo dgmasters01/tw-b2b(main). raw fetch 인증없이 됨, 캐시 최대5분.
- jq 없음 → python3. commit 창구: POST gohotelwinners.com/api/ops/github-commit (헤더 x-ops-token, body{path,content(평문),message,branch}, 30회/시간)
- auto-detect-bot: commit msg에 작업ID+(완료|done|✅) → tasks.json done 자동전환
- _admin/admin.html 경로 주의(루트 admin.html 아님)

## 시스템 상태(이번 채팅 점검)
- tasks.json 262건, done 203(약77%), in_progress 0. 정상.
- BL-AUTO-TASKS-SCHEMA-3MISSING: 출처없는 작업 0건 → 이미 자동해결됨, 할 일 아님.
- _health.json 미생성(404) — 건강검진봇 아직 미실행. 작동 막는 문제 아님.
