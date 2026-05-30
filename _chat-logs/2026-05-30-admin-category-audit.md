# 2026-05-30 admin 카테고리 전수 점검 라운드

> 채팅 출발점: BL-ADMIN-OPERATIONS-DASHBOARD ("admin.html 맨 위 요약 띠 박기")  
> 대표님 지시: "잠시 멈추고 전체 시스템 연동에서 카테고리 방향 맞는지 다시 체크. 카테고리에 놓친 거 있는지 체크해야."  
> 결과: 원본 BL 보류 마킹 + 신규 8건 BL 박힘.

## 헌법 자가 진단 (시작 시점)

🔴 부칙 18ⓑ 위반 — admin-gallery 점검 없이 "맨 위 요약 띠" 박으려 함. 대표님 캡처(`Hotels` 탭에 이미 카드 6개 존재)로 발각.

## 사업 6단계 ↔ admin 8메뉴 짝맞춤표

| 사업 단계 | 처리 메뉴 | 상태 | 비고 |
|---|---|---|---|
| ① 가입·호텔 등록 | Members | 🟢 | |
| ② 호텔 승인·거절 | Hotels | 🟢 | |
| ② 아고다 짝짓기 | Agoda Matching | 🟢 | |
| ③ 결제 안 한 호텔 푸시 | **없음** | 🔴→`BL-PAYMENT-FOLLOWUP-CONSOLE` | |
| ③ 청구서 발행·미수금 | **메뉴 진입로 없음** | 🔴→`BL-ADMIN-SIDEBAR-MISSING-ENTRIES` | 시스템은 BL-INVOICE 시리즈로 완성. 사이드바만 없음. |
| ④ 영상 제작·게시 | Hotels 내 버튼 | 🟡→`BL-VIDEO-PUBLISH-INPUT-MODAL` | 도장만 찍힘. 실데이터 입력 칸 없음. |
| ⑤ 6개월 노출·매출 추적 | Bookings + Analytics + Video Asset Revenue | 🟢 | |
| ⑥ 재계약 권유 | **없음** | 🔴→`BL-RENEWAL-CONSOLE` | 인박스 숫자만. 액션 없음. |
| (상시) 매니저 시점 보기 | **메뉴 진입로 없음** | 🔴→`BL-ADMIN-SIDEBAR-MISSING-ENTRIES` | dashboard.html?impersonate=ID 시스템은 있음. 메뉴 버튼 없음. |
| (상시) 오늘 할 일 원클릭 | Dashboard 인박스 | 🟡→`BL-INBOX-INLINE-ACTIONS` | 숫자만 + 점프만. 인라인 처리 X. |

## 추가 발견 (대표님 4가지 질문 라운드)

| 대표님 짚음 | 진짜 상태 | 박힌 BL |
|---|---|---|
| ① 승인 전에도 결제유도 페이지, 단 결제는 승인 후 가능 | 🟢 이미 sales.html status별 분기 정상 작동 | 없음 |
| ② 메시지 내용 통일 디자인 정리 | 🟡 approved만 정성, pending/rejected는 한 줄 + 한국어 부족 | `BL-SALES-COPY-PENDING-REJECTED` |
| ③ 재계약 권유 메시지 발송 + 액션 | 🔴 처리 화면·발송기록 전무 | `BL-RENEWAL-CONSOLE` (위 ⑥과 동일) |
| ④ 자동로그인 무조건 영구 = 보안 문제 | 🔴 shared.js persistSession 옵션 미명시, Supabase 기본값 영구 | `BL-LOGIN-PERSIST-OPTIN` |
| 시스템에서 작업 박는 UI 있나? | 🟢 admin-status.html `✏️ 새 작업 박기` 버튼 정상 | 없음 |

## 신규 8건 BL (우선순위 순)

1. `BL-ADMIN-SIDEBAR-MISSING-ENTRIES` (P1, small) — 사이드바 진입로 추가 (청구서·매니저허브·매니저시점)
2. `BL-LOGIN-PERSIST-OPTIN` (P1, small) — 로그인 유지 체크박스
3. `BL-PAYMENT-FOLLOWUP-CONSOLE` (P1, medium) — 결제 안 한 호텔 푸시 화면
4. `BL-RENEWAL-CONSOLE` (P1, large) — 재계약 권유 화면
5. `BL-VIDEO-PUBLISH-INPUT-MODAL` (P2, medium) — 영상 URL 입력 모달
6. `BL-SALES-COPY-PENDING-REJECTED` (P2, small) — 검토중·거절 메시지 통일
7. `BL-INBOX-INLINE-ACTIONS` (P2, large) — 인박스 카드 인라인 처리화
8. `BL-ADMIN-CATEGORY-AUDIT-CHATLOG` (P3, small) — 본 chat-log 박기

## 보류 처리

- `BL-ADMIN-OPERATIONS-DASHBOARD`: in_progress → pending, P0 → P3
  - 이유: 인계서가 본질("admin 운영 단일 진입점")을 "맨 위 요약 띠"로 축소 해석. 위 8건이 본질을 더 정확히 다룸. 위 8건 완료 후 재검토.
- `_os/handoff/2026-05-28-admin-operations-dashboard.md`: 더 이상 유효하지 않음.

## 다음 클로드에게

위 표 한 장이 admin 카테고리 단일 진실. 새 BL 검토 시 이 표 먼저 보고 짝맞춤 확인.
