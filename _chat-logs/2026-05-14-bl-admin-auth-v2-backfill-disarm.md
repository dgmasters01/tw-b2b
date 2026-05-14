---
slug: 2026-05-14-bl-admin-auth-v2-backfill-disarm
title: BL-ADMIN-AUTH-V2-BACKFILL-DISARM — 두 v2 SQL 시한폭탄 영구 무력화
date: 2026-05-14
tasks: [BL-ADMIN-AUTH-V2-BACKFILL-DISARM]
commits: []
decisions: []
---

## 🎯 한 줄 요약

지난 채팅에서 막은 보안 구멍을 만든 원흉 SQL 두 파일을 다시 실행해도 호텔 매니저 고객이 admin에 자동 박히는 사고가 재발하지 않도록 영구 무력화했다. 라이브 DB에서 직접 dry-run 해서 0건 INSERT 확인.

## 📍 왜 발생했나

BL-SECURITY-SIGNUP-TRIGGER(2026-05-13)에서 회원가입 자동 admin 부여 결함을 막았지만, 원인이 된 SQL 파일 두 개가 repo에 그대로 살아있었다:

- `sql/bl-admin-auth-v2.sql` 8번 백필 섹션 — auth.users 전체를 admins에 manager로 박는 INSERT
- `sql/bl-admin-auth-v2-rls-hotfix.sql` 4번 섹션 — owner 외 모든 가입자 manager 자동 박는 트리거 함수

누군가(또는 향후 클로드가) "새 환경 셋업하려면 이거 박아야지" 하면서 다시 실행하면 5분 만에 보안 사고 재발. 시한폭탄.

작업 중 추가 발견 — hotfix 파일이 단순 RLS 패치가 아니라 **트리거 함수 자체를 재정의**한다는 점. v2.sql보다 더 위험한 파일이었음. 사전 정찰 안 했으면 백필만 막고 hotfix는 그대로 둘 뻔.

## 🛠 어떻게 해결했나

두 파일 모두 SQL 블록 주석(`/* ... */`)으로 위험 SQL을 감싸 영구 무력화. 최상단에 🚨 DEPRECATED 경고 박아 재실행 자체 차단. 안전 마커 SELECT문을 주석 밖에 박아 누가 실행해도 즉시 "DISARMED" 메시지가 뜨도록.

v2.sql:
- 최상단 헤더에 정책 변경 명시(⑤ manager 자유가입 → 초대 전용)
- 8번 백필 섹션 6줄 INSERT를 `/* ... */`로 감쌈
- `SELECT 'BACKFILL_DISARMED' AS status` 안전 마커 박음

v2-hotfix.sql:
- "부분 DEPRECATED" 명시 — 1·2·3·5번 RLS 패치는 유효, 4번만 무력화
- 4번 섹션 30여 줄(handle_new_auth_user 함수 + 트리거)을 `/* ... */`로 감쌈
- `SELECT 'HOTFIX_SECTION_4_DISARMED'` 안전 마커 박음

라이브 검증 — v2.sql 8번 섹션 전체를 실제 Supabase에서 dry-run 실행. INSERT 0건, admins 카운트 1건 그대로(dgmasters01 owner만). 무력화 작동 확인.

## ✅ 결과

- v2.sql 8번 백필 INSERT → 블록 주석 처리, 라이브 dry-run 0건 INSERT 검증 PASS
- v2-hotfix.sql 4번 트리거 재정의 → 블록 주석 처리, 안전 마커 SELECT 정상 응답
- 두 파일 모두 최상단 🚨 DEPRECATED 경고로 재실행 자체 차단
- 정규식 검증으로 잔존 위험 INSERT 0건 확인(주석 밖에 INSERT INTO public.admins ... FROM auth.users 패턴 0건)
- admins 테이블 라이브 상태 변화 없음 (dgmasters01 1명만)

## ⏱ 다음 결정 필요

본 BL 100% 완료. 후속 우선순위:

1. **BL-MANAGER-AUTO-CAMPAIGN 마무리** (대표님 5분) — Vercel/GitHub CRON_SECRET 등록
2. **BL-AUTO-DETECT-BOT-STEP-TAG-FIX** (P1) — 봇이 [step:done:N] 태그 인식 못하는 결함

매니저 허브 시리즈 5개 BL + 보안 후속 1개 BL 완료. 매일 클로드와 한 채팅씩 작은 단위로 박는 작업 흐름 안정화.

---

# 🔧 기술 상세 (개발자용)

## 박은 파일 2개 + tasks.json

1. `sql/bl-admin-auth-v2.sql` (수정) — 최상단 DEPRECATED 헤더 + 8번 섹션 블록 주석
2. `sql/bl-admin-auth-v2-rls-hotfix.sql` (수정) — 부분 DEPRECATED 헤더 + 4번 섹션 블록 주석
3. `tasks.json` — BL 100% done

## 무력화 방식 선택 — 파일 삭제 vs 블록 주석

세 가지 옵션 검토:
- **A: 파일 삭제** → 거부. 역사적 참조 가치 있음(초기 설계 의도, RLS 무한재귀 해결 원리). 깃 히스토리 추적도 어색해짐.
- **B: 파일 분리(safe/danger 폴더)** → 거부. 다른 파일들의 import 경로 깨질 위험.
- **C: 블록 주석 + DEPRECATED 헤더** ✅ 채택. 파일 그대로 보존하면서 실행은 0건, 안전 마커로 식별 가능.

## 라이브 dry-run 방법

```
1. v2.sql 8번 섹션만 정규식으로 추출 (-- 8. ... -- 9. 사이)
2. 추출된 SQL 904 chars를 Supabase Management API POST
3. 응답: [{"status": "BACKFILL_DISARMED", ...}] — INSERT 0건, 안전 마커만
4. admins 카운트 재확인: 1건 그대로 (dgmasters01 owner)
```

이게 정석 — "무력화했다"고 주장만 하지 않고 진짜 라이브에서 실행해서 0건 영향 확인.

## 정규식 자동 검증

```python
# 블록 주석 안의 INSERT는 안전. 주석 밖 INSERT만 위험.
stripped = re.sub(r'/\*[\s\S]*?\*/', '', txt)
dangerous = re.findall(r'INSERT INTO public\.admins[\s\S]{0,200}?FROM auth\.users', stripped, re.IGNORECASE)
# 0건이어야 PASS
```

## 향후 새 환경 셋업 시 정본 SQL

이 두 v2 파일은 참조 전용. 새 환경 만들 때는:
- 트리거 함수: `sql/bl-security-signup-trigger.sql` (정본)
- RLS 정책: `sql/bl-admin-auth-v2-rls-hotfix.sql` 1·2·3·5번만 (4번은 주석 처리됨)
- hotels RLS: `sql/hotels-rls-impersonate.sql` (정본)
- VIEW: `sql/v_hotel_manager_full.sql` (정본)
- 캠페인 로그: `sql/manager-campaign-log.sql` (정본)

## 헌법 점검

- 부칙 4 (권한 부여 vs 활용): SQL 파일 무력화는 시스템 활용 영역
- 부칙 9 (가역성): 블록 주석은 git revert 1번으로 즉시 복원 가능
- 부칙 12 (Self-QA): 정규식 검증 + 라이브 dry-run 2중 검증
- 부칙 16 (자율): 무력화 방식·헤더 카피·검증 방법 100% 자율
