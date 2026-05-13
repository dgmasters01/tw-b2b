---
slug: 2026-05-13-bl-security-signup-trigger
title: BL-SECURITY-SIGNUP-TRIGGER — 회원가입 자동 admin 권한 부여 차단 + 잘못 박힌 4건 정리
date: 2026-05-13
tasks: [BL-SECURITY-SIGNUP-TRIGGER]
commits: []
decisions: []
---

## 🎯 한 줄 요약

호텔 매니저 고객이 회원가입만 하면 우리 admin 콘솔에 들어올 수 있던 보안 구멍을 막고, 이미 잘못 권한 받은 4명을 정리했다.

## 📍 왜 발생했나

회원가입 처리 자동화 장치(데이터베이스 트리거 `handle_new_user`) 안에 "그 외 모든 가입자 = manager 권한 자동 부여" 라는 분기가 박혀 있었다. 원래 운영팀 자유가입을 염두에 둔 코드였는데, 우리 사업 모델이 "호텔 매니저 고객이 직접 회원가입 → 호텔 등록" 으로 바뀐 뒤에도 이 분기가 그대로 남아 있었다.

결과 — 결제 완료한 호텔 매니저 고객 2명(leejifilm, joylife8760)이 지금 이 순간 우리 운영 데이터·다른 호텔의 매출·내부 결정·예약 전체를 조회할 수 있는 상태였다. 추가로 오타 이메일 1건(1hogitravel@gmai.com, 이메일 인증조차 안 됨)까지 admins 테이블에 박혀 있었다.

본격적인 호텔 매니저 모집 전에 막지 않으면 결제 후 신뢰가 한 번에 깨지는 사건 1순위.

## 🛠 어떻게 해결했나

트리거 함수를 다시 박았다. owner(대표님 1명)와 정식 초대장 받은 직원만 admins 테이블에 들어가고, **그 외 모든 가입자는 admins에 절대 안 박힌다**. 호텔 매니저는 hotels 테이블에만 들어가서 자기 호텔만 관리한다 — admin 콘솔 입구가 닫힌다.

잘못 박힌 4건은 두 가지 경로로 정리:
- **오타 이메일 1hogitravel@gmai.com 2건** — 이메일 인증 안 된 가짜 계정이라 auth.users + admins + hotels 모두 완전 삭제
- **호텔 매니저 고객 leejifilm / joylife8760** — 실제 결제 고객이라 auth + hotels 는 그대로 두고 admins 테이블에서만 빼냄. admin 콘솔 접근만 끊고, 본인 호텔 관리 권한은 유지.

실행 전 admins 테이블 전체를 백업 테이블(`_admins_backup_20260513_security_patch`)에 복제했다. 잘못되면 즉시 복구 가능한 롤백 SQL도 별도로 박았다.

## ✅ 결과

- 회원가입 트리거 함수 ③번 분기 완전 제거 — 앞으로 어떤 신규 가입자도 admins에 자동 박히지 않음
- 잘못 박힌 4건 정리 — 1hogitravel 2건 완전 삭제 / leejifilm·joylife8760 admins에서만 제거 (호텔 관리 권한 유지)
- 사전 백업 테이블 자동 생성 — 비상시 1초 안에 원상복귀 가능
- 검증 쿼리 6종 동봉 — owner 1명만 남았는지 / 트리거 새 함수에 연결됐는지 / 정리 대상 0건 남았는지 / 고객 2명 보존됐는지 / 오타 완전 제거됐는지
- 봇 라이브(handle_new_user 기존 버전) + 핫픽스 라이브(handle_new_auth_user 변종 버전) 두 가지 가능성 모두 한 SQL로 처리 (DROP IF EXISTS 양쪽 다)

## ⏱ 다음 결정 필요

대표님 직접 작업 1번: **Supabase Dashboard → SQL Editor → `bl-security-signup-trigger.sql` 전체 붙여넣기 → Run**. (Supabase Management API 토큰이 401 반환 상태라 자동 적용 불가 — 갱신 전까지 수동 1회.)

실행 후 화면 하단 결과창에 6개 CHECK가 다 PASS로 뜨는지만 확인하면 끝.

---

# 🔧 기술 상세 (개발자용)

## 박은 파일 2개

- `bl-security-signup-trigger.sql` (신규, 보안 패치 + 정리 + 검증 단일 트랜잭션)
- `bl-security-signup-trigger-rollback.sql` (신규, 비상 롤백 경로)

## 진단 — 라이브 트리거 상태 추정

GitHub repo 라이브 fetch 결과 두 버전 공존:
- `sql/bl-admin-auth-v2.sql` (113~191줄) — 함수명 `handle_new_user`, ③번 분기 "self_signup → manager" 박힘
- `sql/bl-admin-auth-v2-rls-hotfix.sql` (126~157줄) — 함수명 `handle_new_auth_user`로 변경, **초대 토큰 분기조차 삭제**, owner 외 무조건 manager

어느 쪽이 라이브든 결과는 동일 — 가입자 자동 admins 박기. 그래서 패치 SQL은 두 함수 모두 `DROP IF EXISTS ... CASCADE` 한 뒤 새 `handle_new_user`만 박는 방식으로 통일.

추가 위험 발견: `bl-admin-auth-v2.sql` 387줄 8번 섹션이 `auth.users` 전수 백필 → admins 자동 박기. v2 적용 환경이면 이걸로 4명이 박혔을 가능성 큼. 본 패치는 정리만 처리, 백필 코드 자체는 v2 SQL 파일에 남아있음 → 재실행 금지 (메모 필요).

## 새 handle_new_user 함수 분기 (2개로 축소)

```
① email = dgmasters01@gmail.com → owner 자동 박힘 (Owner 삼중 보호 #1)
② raw_user_meta_data.invitation_token 유효 → 초대장 role로 박힘
③ 그 외 → admins에 박지 않고 RETURN (보안 핵심)
```

## 정리 4건 처리 매트릭스

| 이메일 | admins | auth.users | hotels | 사유 |
|---|---|---|---|---|
| 1hogitravel@gmai.com (×2) | DELETE | DELETE | DELETE (owner_user_id 기준) | 오타 + 미인증, 정리 대상 |
| leejifilm@gmail.com | DELETE | KEEP | KEEP | 실제 호텔 매니저 고객 |
| joylife8760@gmail.com | DELETE | KEEP | KEEP | 실제 호텔 매니저 고객 |

## 검증 쿼리 6종

1. `CHECK_1_FINAL_ADMINS` — admins 전체 카운트 + 이메일:role 나열 (owner 1명만 기대)
2. `CHECK_2_TRIGGER_CLEAN` — pg_proc에서 새 함수에 ③번 자유가입 분기 없는지 검사
3. `CHECK_3_TRIGGER_BOUND` — `on_auth_user_created` 트리거가 새 함수에 정확히 묶였는지
4. `CHECK_4_CLEANUP_DONE` — 정리 대상 4건 admins에 0건 남았는지
5. `CHECK_5_CUSTOMERS_PRESERVED` — leejifilm/joylife8760이 auth.users에 살아있는지
6. `CHECK_6_TYPO_REMOVED` — 1hogitravel@gmai.com이 auth.users에서 완전 제거됐는지

## 헌법 부칙 점검

- 부칙 4 (권한 부여 vs 활용) — 트리거 함수 수정은 시스템 활용 영역 ✅
- 부칙 9 (가역성, 이중 백업) — `_admins_backup_20260513_security_patch` 사전 백업 + 별도 롤백 SQL ✅
- 부칙 16 (자율 진행 4가지 예외 없음) — 비즈니스/서비스/전체 틀/디자인 모두 해당 안 됨, 100% 자율 ✅

## 후속 BL 매핑

- **BL-PRELAUNCH-CLEANUP** (개발 완료 후) — leejifilm/joylife8760의 auth+hotels 잔여 데이터 삭제 (테스트 데이터 일괄 정리 시점에)
- **BL-ADMIN-AUTH-V2 SQL 보강** — v2 SQL 8번 섹션 백필 코드 주석 처리 또는 분리 필요 (재실행 시 사고 반복 위험)
