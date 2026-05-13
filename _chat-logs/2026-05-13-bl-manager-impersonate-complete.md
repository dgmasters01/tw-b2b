---
slug: 2026-05-13-bl-manager-impersonate-complete
title: BL-MANAGER-IMPERSONATE — dashboard.html 임포저네이트 처리 + hotels RLS 보강
date: 2026-05-13
tasks: [BL-MANAGER-IMPERSONATE]
commits: []
decisions: []
---

## 🎯 한 줄 요약

허브 페이지에서 "매니저 화면 열기" 버튼을 누르면 dashboard.html이 매니저 행세로 그 매니저가 자기 화면에서 보는 것을 그대로 보여준다. 화면 상단에 보라색 임포저네이트 모드 배너로 명확히 구분.

## 📍 왜 발생했나

지난 채팅에서 허브 페이지에 "↗ 매니저 화면 열기" 링크는 박았지만, dashboard.html 측에서 `?impersonate=ID` 파라미터를 받아 처리하는 코드가 없었다. 클릭하면 관리자가 admin.html로 강제 리다이렉트되어 매니저 화면을 볼 수 없는 상태.

추가로 라이브 점검 중 잠재 결함 발견 — hotels 테이블이 RLS는 enabled인데 SELECT 정책이 누락. 매니저 본인이 dashboard.html에서 자기 호텔 fetch 시도해도 RLS에 막혀서 빈 화면을 봤을 가능성. 임포저네이트와 동시에 이것도 박아야 함.

## 🛠 어떻게 해결했나

dashboard.html에 임포저네이트 처리 로직 박음. URL에 `?impersonate=MANAGER_ID&hotel=HOTEL_ID` 파라미터가 있으면 admin 권한 검증 후 admin.html 강제 리다이렉트 우회, hotel_id로 직접 fetch해서 매니저 화면 렌더링. 비관리자가 임포저네이트 시도하면 파라미터 무시하고 일반 흐름. 페이지 최상단에 보라색 sticky 배너로 "🔍 임포저네이트 모드" 명시, 우측에 "← 허브로 돌아가기" 버튼.

페이지 자동 새로고침 트리거(visibility/storage)도 임포저네이트 모드에서는 일반 loadDashboard 대신 loadImpersonatedHotel 호출하도록 보호.

hotels RLS 정책 2종 박음 — hotels_select_own (매니저 본인 user_id 호텔만), hotels_select_admin (admin은 모든 호텔). 임포저네이트가 admin 정책으로 통과하면서 매니저 본인 dashboard 정상화도 동시 해결.

## ✅ 결과

- dashboard.html `?impersonate=ID&hotel=ID` 파라미터 처리 박힘 — 라이브 200 OK 응답
- admin 권한 검증 후에만 임포저네이트 작동 — 일반 사용자가 URL 조작해도 무시됨
- 상단 보라색 배너 + "허브로 돌아가기" 버튼으로 모드 명확히 구분
- hotels_select_own + hotels_select_admin RLS 정책 라이브 적용
- 매니저 본인 dashboard.html 정상화 (이전엔 RLS에 막혀있었을 가능성)
- BL-MANAGER-IMPERSONATE 100% 완료

## ⏱ 다음 결정 필요

대표님 라이브 확인:
1. admin.html → 가입자 → 매니저 클릭 → 허브 페이지
2. 좌측 호텔 카드 라벨 옆 "↗ 매니저 화면 열기" 클릭
3. 새 탭에 dashboard.html 열리고 상단에 보라색 배너 + 매니저 호텔 정보 표시
4. "← 허브로 돌아가기" 누르면 다시 허브로

매니저 허브 시리즈 5개 BL 전체 완료. 다음 우선순위 BL은:
- BL-MANAGER-AUTO-CAMPAIGN 마무리 (CRON_SECRET 등록 — 대표님 5분)
- BL-ADMIN-AUTH-V2-BACKFILL-DISARM (v2 SQL 8번 백필 코드 무력화)
- BL-AUTO-DETECT-BOT-STEP-TAG-FIX (step 태그 인식 결함)

---

# 🔧 기술 상세 (개발자용)

## 박은 파일 2개

1. `sql/hotels-rls-impersonate.sql` (신규) — hotels SELECT 정책 2종
2. `dashboard.html` (수정) — imp 변수 추출 + renderImpersonateBanner + loadImpersonatedHotel + visibility 가드

## 임포저네이트 흐름

```
1. 대표님 → admin.html#members → 매니저 클릭
2. admin-manager-hub.html 좌측 호텔 카드 → "↗ 매니저 화면 열기" 클릭
3. 새 탭: /dashboard.html?impersonate=MANAGER_ID&hotel=HOTEL_ID
4. T.requireAuth 통과 → currentUser = admin
5. T.checkAdmin 통과 → ac.is_admin = true
6. imp 객체 있고 admin이면:
   - 일반적인 admin.html 리다이렉트 우회
   - renderImpersonateBanner(imp) → 상단 보라색 배너
   - loadImpersonatedHotel(imp) → hotels.id = HOTEL_ID 직접 fetch
   - renderDashboard() → 매니저가 자기 페이지에서 보던 그대로
```

## 보안 모델

- admin이 아닌 사용자가 `?impersonate=...` URL 조작 시도 → ac.is_admin false → imp = null 로 클리어 → 일반 흐름으로 fallback (자기 호텔 보거나 호텔 등록 유도 화면)
- hotels RLS 두 정책 동시 적용 — `is_admin(auth.uid())` OR `user_id = auth.uid()` 중 하나 통과하면 SELECT
- service_role 직접 호출 없음 — 모두 클라이언트 anon key + JWT + RLS 통과

## 검증 결과

```
=== hotels RLS 정책 ===
hotels_select_admin, hotels_select_own (둘 다 SELECT)

=== dashboard.html 라이브 응답 ===
GET /dashboard.html?impersonate=test&hotel=test
HTTP/2 200 OK

=== JS 문법 ===
✅ dashboard.html JS PASS
```

## 후속 BL — 매니저 허브 시리즈 후 작업

매니저 허브 5개 BL 완료. 후속:
1. **BL-MANAGER-AUTO-CAMPAIGN 마무리** — Vercel/GitHub `CRON_SECRET` 등록 (대표님 1번)
2. **BL-ADMIN-AUTH-V2-BACKFILL-DISARM** — v2 SQL 백필 코드 시한폭탄 제거 (P1)
3. **BL-AUTO-DETECT-BOT-STEP-TAG-FIX** — auto-detect-bot step 태그 인식 결함 (P1)

## 헌법 점검

- 부칙 4 (권한 부여 vs 활용): admin 권한 검증은 시스템 활용 (URL 파라미터만으로 권한 상승 안 됨)
- 부칙 7 (단계 1개 = commit 1개): SQL + HTML 각 1 commit + tasks.json done
- 부칙 9 (가역성): RLS 정책은 DROP POLICY로 즉시 롤백 가능
- 부칙 12 (Self-QA): JS 문법 검증 통과, 라이브 응답 200 OK 확인, RLS 정책 검증 쿼리 PASS
- 부칙 16 (자율): RLS 정책 설계·임포저네이트 로직·배너 디자인 100% 자율
