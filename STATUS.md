# TW B2B 시스템 - 작업 진행 상황

**마지막 업데이트**: 2026-04-25  
**라이브 사이트**: https://tw-b2b.vercel.app  
**저장소**: dgmasters01/tw-b2b (main)  
**관리자**: dgmasters01@gmail.com

---

## ✅ 완성된 기능

### 인증 시스템
- [x] 회원가입 (signup.html) - 비밀번호 강도 체크, 약관 동의, 이메일 인증 자동 분기
- [x] 로그인 (login.html) - 친절한 에러 메시지, URL 파라미터 자동 채우기
- [x] 비밀번호 찾기 (forgot-password.html) - 이메일로 재설정 링크
- [x] 비밀번호 재설정 (reset-password.html) - PASSWORD_RECOVERY 이벤트 처리
- [x] 이메일 인증 (verify-email.html) - 인증 메일 발송/재발송/확인 처리
- [x] 이미 가입된 이메일 자동 감지 → 로그인 페이지로 안내

### 호텔 관리
- [x] 호텔 자동 정보 수집 (hotel-info.html) - 아고다 URL → 자동 fetch
- [x] 매니저 대시보드 (dashboard.html) - 본인 호텔만 표시, 상태별 분기
- [x] 관리자 패널 (admin.html) - 호텔 검토/승인/상태 변경

### API
- [x] /api/agoda-hotel - Agoda Long-tail API 프록시
- [x] /api/google-places - Google Places API (New) 프록시
- [x] /api/process-hotel - 통합 호텔 정보 수집 (Agoda + Google)

### 인프라
- [x] Vercel 배포 자동화 (GitHub push → 자동 빌드)
- [x] Supabase 6개 테이블 + 트리거 + is_admin() 함수
- [x] PayPal Business 계정 (TRAVELWINNERS INC.)
- [x] Google Cloud + Places API 활성화

---

## ⚠️ 대표님 직접 설정 필요 (SUPABASE 대시보드)

### A. URL Configuration (Authentication → URL Configuration)
```
Site URL: https://tw-b2b.vercel.app

Redirect URLs (모두 추가):
- https://tw-b2b.vercel.app/reset-password.html
- https://tw-b2b.vercel.app/verify-email.html
- https://tw-b2b.vercel.app/**
```

### B. 이메일 인증 ON (Authentication → Providers → Email)
```
Confirm email: ON  ← 현재 OFF, 보안상 켜야 함
```

### C. RLS 정책 적용 (SQL Editor)
- `sql/rls-policies.sql` 파일 전체 복사 → Run
- 6개 테이블 RLS 활성화 + 15개 정책 적용
- 매니저는 본인 호텔 데이터만, 관리자는 전체 접근

### D. 이메일 템플릿 한글화 (Authentication → Email Templates - 선택)
- Confirm signup, Reset Password 템플릿 한글로 수정 권장

---

## 🔴 미완성 / 다음 작업

### 시급도 높음
- [ ] 회원 탈퇴 / 계정 삭제 기능 (mypage.html)
- [ ] 이메일 변경 기능
- [ ] PayPal Checkout 결제 통합

### 시급도 중간
- [ ] 영상 게시 시 videos 테이블 입력 UI
- [ ] 아고다 어필리에이트 클릭 트래킹 → bookings 테이블

### 시급도 낮음 (나중에)
- [ ] 카카오/구글 소셜 로그인
- [ ] "현재 비밀번호 입력 → 새 비밀번호" 방식 추가
- [ ] CAPTCHA (가입 봇 방지)
- [ ] 2FA (2단계 인증)

---

## 📜 커밋 이력

- `cd5300c` - Phase 1: Hotel auto-collection system + dashboard isolation + admin
- `66bdb86` - fix: signup error visibility + already-registered handling
- `1f41cf9` - feat: complete password reset flow + improved auth UX
- `(다음)` - feat: email verification + RLS security policies

---

## 🛡️ 보안 현황

### 자동으로 활성화된 보안
- ✅ HTTPS 강제 (Vercel)
- ✅ 비밀번호 해싱 (Supabase bcrypt)
- ✅ JWT 세션 토큰 (Supabase)
- ✅ XSS/SQL Injection 방어 (구조적)

### 코드/SQL로 추가된 보안
- ✅ 강력한 비밀번호 정책 (8자+, 대소문/숫자/특수문자)
- ✅ Email validation (signup/login/forgot)
- ⚠️ RLS 정책 (SQL 작성 완료, 대표님 적용 필요)
- ⚠️ 이메일 인증 (코드 완료, Supabase 토글 필요)

---

## 🔧 개발 환경

- 작업 디렉토리: `/home/claude/tw-b2b`
- Vercel env: `GOOGLE_PLACES_API_KEY`, `AGODA_API_KEY`
- GitHub PAT: 메모리에 저장 (expires 2026-05-18)
- 작업 워크플로: 메모리 #5 참조 (자동 검증 → push → 체크리스트 제공)
