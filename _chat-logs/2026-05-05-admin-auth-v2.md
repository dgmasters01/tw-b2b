---
slug: 2026-05-05-admin-auth-v2
title: BL-ADMIN-AUTH-V2 완료 — 5단계 권한 + 초대 시스템 + Owner 삼중 보호 (한 commit 통합)
date: 2026-05-05
commits: []
tasks: [BL-ADMIN-AUTH-V2]
decisions: [D-015]
---

# BL-ADMIN-AUTH-V2 — 한 commit 통합 인계

**시간**: 2026-05-05 KST
**이전 commit**: f9502c4 (임시 비번 시스템 ADMIN_ACCESS_KEY 쿠키)
**이번 commit**: 본 chat-log 박는 commit
**선행 chat-log**: `_chat-logs/2026-05-04-real-system-phase-a.md`

---

## 🎯 한 줄 요약

임시 비번 시스템(ADMIN_ACCESS_KEY) 폐기 + 5단계 권한(Owner/Admin/Staff/ReadOnly/Manager) 정식 박힘.
대표님 결정: 매니저 자유가입(이미 박혀있음) + 직원 초대 전용 + 비번 단순화(Google OAuth 보류).
한 commit에 통합 — 분할 시 거짓 시스템 (Phase α 교훈 D-014 준수).

---

## 📋 선행 점검 (대표님 통찰)

대표님이 작업 시작 전 두 가지 확인 요구하셨음:

### ① "정리가 잘 안 되어 있으면 운영/개발 헷갈린다"
→ 헌법 부칙 5의 4 카테고리 + admin-status 통합 진입점 = **이 헷갈림을 막는 시스템**.
→ BL-ADMIN-AUTH-V2의 모든 결정도 DECISIONS.md(D-015)에 박혀 다음 채팅 Claude도 헤매지 않음.

### ② "호텔 매칭 시스템이 박혀있는지 너가 확인 필요"
→ 라이브 코드 검증 결과: **이미 박혀있음.**
- `hotel-info.html` line 1119~1125: `agoda_match_status: manual_pending / auto_matched`
- `_admin/admin.html` line 580~581: "Manual Pending" / "Auto Matched" 필터 탭
- `_admin/admin.html` line 2719: `<button>Approve</button>` (대표님 최종 승인)

→ 추측 아님. 대표님 기억 100% 정확. **권한 분리만 빠져있어** 이번 작업이 그것을 채움.

### ③ "구글 OAuth 필요한가? 단순가입 보안은?"
→ Claude 분석: 글로벌 매니저 다수가 Gmail 미보유 가능 + 직원 1~2명 단계 ROI 낮음.
→ 단순가입(이메일+비번)도 Supabase가 bcrypt 해싱 + rate limit + HTTPS + JWT 세션 → 표준 SaaS 보안.
→ BL-ADMIN-AUTH-V2가 강한 비번/30일 세션/즉시 박탈/이력 추가하면 Google OAuth와 격차 거의 없음.
→ **A안 (이메일+비번 단순화) 결정.** Google OAuth는 BL-GOOGLE-OAUTH로 별건 등록.

---

## 🛠 박은 변경 (한 commit 통합)

### 1️⃣ DB 스키마 (Supabase Management API로 자동 적용)
**`sql/bl-admin-auth-v2.sql`** — 9개 섹션:

1. **admins 테이블 확장**: `super_admin → owner` 마이그레이션, 5단계 CHECK 제약, invited_by/invited_at/last_login_at/revoked_at/revoked_by 컬럼 추가
2. **admin_invitations 테이블**: 초대 토큰 7일 만료, accepted/cancelled 추적
3. **role_change_log 테이블**: 무제한 영구 이력 (10가지 action 추적)
4. **handle_new_user 트리거** (Owner 삼중 보호 #1): dgmasters01@gmail.com 자동 owner / invitation_token 메타 → role 박힘 / 그 외 → manager
5. **protect_owner_account 트리거** (삼중 보호 #2): UPDATE 시 role/email/is_active 변경 차단, DELETE 차단
6. **Helper 함수**: `is_admin / is_owner / is_manager / can_read_admin / current_user_role`
7. **RLS 정책** (삼중 보호 #3): admins / admin_invitations / role_change_log 모두 활성, role 기반 분리
8. **백필**: auth.users에는 있지만 admins에 없는 사용자 → manager로 자동 박힘
9. **updated_at 자동 갱신** 트리거 (조건부 박힘)

**라이브 검증 8/8 PASS**:
- Owner 1명 (dgmasters01@gmail.com)
- 5단계 role 인프라 박힘 (현재 owner + manager 2종 활성, admin/staff/readonly는 초대 시 생성)
- 트리거 4개 활성: `on_auth_user_created` / `protect_owner_update` / `protect_owner_delete` / `set_updated_at_admins`
- 함수 7개: `is_admin / is_owner / is_manager / can_read_admin / current_user_role / handle_new_user / protect_owner_account`
- RLS 3개 테이블 활성

### 2️⃣ API 5개 신규
| 파일 | 역할 |
|---|---|
| `api/auth/session.js` | Supabase 토큰 검증 + admins.role 반환 |
| `api/admin/invite.js` | 초대 메일 발송 (Resend, ko/en 분기, 7일 토큰) |
| `api/admin/accept-invite.js` | GET=토큰 검증 / POST=가입 (트리거가 role 박음) |
| `api/admin/change-role.js` | role 변경 / revoke (즉시 세션 종료) / restore |
| `api/admin/users-list.js` | 권한 화면 데이터 (admins + invitations + 최근 로그 50건 + stats) |

### 3️⃣ admin-page.js 재작성
임시 비번(ADMIN_ACCESS_KEY 쿠키) 완전 폐기. 신규 흐름:
1. 토큰 추출: 쿠키 `sb-access-token` → Authorization Bearer → x-admin-token
2. Supabase auth.getUser() 검증
3. admins.role 확인 (revoked 차단)
4. manager → /dashboard.html 리다이렉트
5. role hierarchy 체크: PAGE_MIN_ROLE 매트릭스 (status=readonly / admin=staff / permissions=admin)

### 4️⃣ 사용자 화면 3개
- **`/admin-login.html`**: 이메일+비번 로그인. 세션 쿠키 박음. manager면 자동 차단.
- **`/admin-accept-invite.html`**: 초대 메일 링크 도착 → 토큰 검증 → 비번 설정 → 가입.
- **`/_admin/admin-permissions.html`**: 대표님 통합 화면 — 6 stats 카드 + 직원 초대 폼 + 대기 초대 + 등록 계정(필터 7종) + 활동 이력 50건. role-pill 색상 분리 (Owner=골드, Admin=보라, Staff=하늘, ReadOnly=회색, Manager=초록).

### 5️⃣ 라우팅 통합
- `vercel.json`: `/admin-permissions.html` rewrite 추가, `/admin-permissions` redirect 추가
- `admin-status.html`: Card 6 "🛡️ 권한 관리" 추가 (대표님이 통합 진입점에서 한 클릭에 진입)

### 6️⃣ 매니저 흐름 변경 없음
**signup.html 그대로 유지**. handle_new_user 트리거가 자동으로 role='manager' 박음.
호텔 매칭/승인 흐름(hotel-info.html → admin.html)도 그대로. 권한만 RLS로 강제됨.

---

## ✅ 라이브 검증 체크리스트 (deploy 후 대표님 직접 확인)

### A. 임시 비번 시스템 폐기 확인
```bash
# 기존 ADMIN_ACCESS_KEY 쿠키로는 더 이상 진입 불가
curl -I https://gohotelwinners.com/admin-status.html
# 기대: 401 + 로그인 페이지 (이전: 401 + 비번 입력 폼)
```

### B. 대표님 본인 로그인 흐름
1. https://gohotelwinners.com/admin-login.html 접속
2. dgmasters01@gmail.com + 기존 비번 입력
3. 로그인 성공 → admin-status.html로 이동
4. Card 6 "🛡️ 권한 관리" 클릭 → admin-permissions.html 진입
5. 화면 상단 "이지형 (owner)" 표시 확인

### C. 직원 초대 흐름 (실제 사용 가능)
1. admin-permissions에서 staff 이메일 입력 → "초대 발송" 클릭
2. 토스트 "○○님께 초대 발송됨" 확인 (Resend 작동)
3. "대기 중인 초대" 패널에 항목 추가됨
4. 받은 메일 → 링크 클릭 → admin-accept-invite.html 자동 진입
5. 비번 설정 → 가입 완료 → admin-login.html로 이동
6. 로그인 후 admin-status 진입 가능 (staff 권한)
7. admin-permissions는 admin/owner 전용이라 staff는 접근 차단됨

### D. 박탈 → 즉시 세션 종료
1. admin-permissions에서 staff 계정 "박탈" 클릭
2. 해당 staff가 다른 탭에서 admin-status 새로고침 → 401 + 로그인 페이지

### E. Owner 삼중 보호
- DB 트리거 차단 검증: `UPDATE admins SET role='admin' WHERE email='dgmasters01@gmail.com'` → ERROR
- UI에서 owner 옆 "보호됨" 표시, 박탈/변경 버튼 없음

---

## ⚠️ 알려진 한계 / 후속 작업

### deploy 후 검증 필요
- **Resend 메일 발송 환경변수**: `RESEND_API_KEY` Vercel 등록 확인 필요. 미등록이면 invite API가 invitation은 박지만 메일은 안 보내고 `preview_url` 반환.
- **SUPABASE_SERVICE_ROLE_KEY**: invite/accept/change-role/users-list가 service role로 동작. Vercel env 등록 확인 필요.
- **SUPABASE_ANON_KEY**: 클라이언트가 sb_publishable_... 사용. shared.js에 박혀있는지 확인.

### Phase β로 미룬 것
- **BL-GOOGLE-OAUTH**: 직원 5명 넘어가면 별건 등록.
- **BL-2FA**: 대표님 owner 계정 2FA 의무화 (Supabase TOTP).
- **BL-XSS-AUDIT**: 모든 admin 페이지 XSS 점검.
- **manager-dashboard 분리**: 현재 dashboard.html을 매니저가 사용. 별도 manager-dashboard.html 분리는 BL-MANAGER-DASH-001과 합쳐서 진행.

### 헌법 11조 준수
- 토큰 메모리 제거: 운영 진입(gohotelwinners.com 정식 오픈) 시점에만 비움. 현재는 개발 단계 = 토큰 활성 유지.
- **이번 작업 후 즉시 토큰 폐기는 "운영 진입"이 아님** → 메모리 그대로 유지.

---

## 🚨 헌법/메모리 준수 점검

- ✅ **헌법 1조**: 대표님은 사업 정책(매니저 자유가입 / 직원 초대 / Google OAuth 보류)만 결정. 시스템 디테일 100% Claude 자율.
- ✅ **메모리 5번/24번**: 위치/구조 질문 없음. admins 단일 진실(users 신설 안 함), API 폴더 구조, RLS 정책 위치, page rewrite 패턴 전부 Claude 결정.
- ✅ **메모리 17번**: 분량 큼 — SQL → API 5개 → 페이지 3개 → 통합 4개 단계로 박되 끊지 않고 한 commit 직전까지 도달.
- ✅ **메모리 25번**: chat-log 박음 + commit `[변경사유]` 박을 예정.
- ✅ **D-014**: 큰 단위 commit 직전 chat-log 박기 (이 파일).
- ✅ **D-015**: 결정사항 DECISIONS.md 영구 박힘.
- ✅ **메모리 #10 (메일 발신자)**: ko='여행능력자들 <noreply@>' / 그외='TravelWinners <noreply@>' 분기 박힘.

---

## 🔚 다음 채팅 Claude에게

이번 작업의 핵심: **"임시 비번 폐기 = 진짜 시스템 박힘"**.

운영 진입 전 필수 후속:
1. Vercel env 검증: SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY / SUPABASE_ANON_KEY
2. 대표님이 직접 admin-login.html → admin-permissions에서 첫 직원 초대 발송 검증
3. 검증 통과하면 BL-MANAGER-DASH-001 진입 (매니저 대시보드 신규 제작)

**호텔 매칭/승인 흐름은 이미 라이브에서 작동 중** — admin.html의 Approve 버튼 그대로 사용. 권한만 staff 이상으로 강제됨 (PAGE_MIN_ROLE['admin']='staff').
