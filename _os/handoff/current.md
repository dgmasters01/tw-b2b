# 인계서 — 권한 검증 완료(미정③=YES) + 매니저측 이슈 3건 발견 · DB 검증 SQL 실행 대기

**작성**: 2026-06-02 (BL-ADMIN-HOTEL-DETAIL 권한 검증 단계 종료)
**다음 채팅 첫 fetch = boot.md 1개 → 이 파일.**

---

## 🚦 다음 채팅 첫 행동
1. `_os/boot.md` 1개 fetch
2. 이 파일 읽음 → 추가 헌법 fetch 금지
3. 아래 "다음 작업" = 대표님이 Supabase에서 검증 SQL 돌린 결과를 받았는지 확인 → 멱등 수정 → admin 상세 착수
4. 상태는 라이브 tasks.json 재확인 (부칙16)

---

## ✅ 직전 채팅(2026-06-02)에서 한 것 — 미정③ 권한 검증 종료

**결론: admin 토큰으로 임의 호텔 예약 조회 가능 (YES). 별도 admin API 신설 불필요.**

근거 3겹 (코드 정독으로 확인):
- `api/hotel-bookings.js` 는 권한 분기 안 함. 사용자 토큰을 PostgREST에 그대로 전달 → RLS가 판정. `hotelId` 파라미터 그대로 받음 → admin이면 임의 호텔 통과.
- `bookings_agoda` SELECT 정책(phase4-bookings.sql `bagoda_select_manager_completed`): `is_admin() OR (completed AND NOT cancelled AND 본인호텔)`.
- `is_admin()`(00-helpers.sql): 로그인 이메일이 admins 테이블 active면 TRUE, SECURITY DEFINER.
- 뷰 `v_manager_bookings` = `security_invoker=true` (RLS 상속). admin은 전체 통과.

→ **BL-ADMIN-HOTEL-DETAIL: 기존 `/api/hotel-bookings?hotelId=X` 를 admin 토큰으로 재사용.**

## ⚠️ 검증 중 발견한 이슈 3건 (우선 처리 — 대표님 지시 2026-06-02)

1. **매니저 수수료 노출 (실재·심각)**: `marketing.html`(admin은 admin.html로 리다이렉트 → 매니저가 보는 화면)이 line 409에서 `commission_usd`를 "수수료 $"로 화면 출력. D-053 "매니저 비노출" 위반. 화면 코드 + 서버 뷰(v_manager_bookings / v_manager_channel_stats에 commission 포함)에서 둘 다 제거 필요(네트워크 탭 방어). `manager-dashboard.html`도 점검 대상.
2. **RLS 정책 충돌 (코드상 실재, DB확인 필요)**: phase4(completed만) vs `BL-MGR-HOTELS-RLS_step4_bookings_rls.sql`(completed 무관, 본인호텔 전체) 정책이 둘 다 코드에 존재. DB에 둘 다 살아있으면 OR결합 → 매니저가 취소건까지 봄.
3. **is_admin 시그니처 모호성 (실재 위험, DB확인 필요)**: `is_admin()`(인자없음, 00-helpers + _apply-phase1-step2-bundle) 과 `is_admin(uid UUID DEFAULT auth.uid())`(bl-admin-auth-v2.sql:275, hotfix:57) 두 정의 공존. DEFAULT라 둘 다 인자0개 호출 가능 → `is_admin()` 호출 "not unique" 에러로 일부 RLS 무력화 가능.

## 다음 작업 (순서)
① **DB 검증 SQL 실행** (대표님 Supabase SQL Editor, READ ONLY 4블록) → 이슈2·3 실상태 확정. 파일: `verify-rls-commission.sql`.
② 결과 받으면 **멱등 수정 SQL**(충돌정책 전부 DROP→단일 정책, is_admin 통일, 매니저 뷰 commission 제거 + admin용 v_admin_bookings 신설) + **프론트 패치**(marketing/manager-dashboard 수수료 제거).
③ 그 후 BL-ADMIN-HOTEL-DETAIL 본구현: 매니저 형태 미러링 상세 → 회차·기간 4구분 + 마케팅 전 예약 매칭 → 담당 매니저 이름·연락처.

## ❓ 여전히 미정 (BL-ADMIN-HOTEL-DETAIL)
1. "마케팅 전 예약" 명칭 확정 (클로드 추천=「마케팅 전 예약」).
2. `admin.html` members 데이터 구조 직접 확인 (grep 0건, 6225줄 직접).
(미정③ 권한 검증 = 해결됨)

## 다음 채팅 금지
- 헌법 본문 풀 fetch / booking-analytics.html 거대 인라인 통째 출력 / 매니저 화면 수수료 노출 / 메모리만 믿고 작업 대상 확정(tasks.json 우선)

---
**호칭: 대표님. 언어: 한국어. 사업가 언어 강제(부칙18).**
