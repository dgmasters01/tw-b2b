# TW B2B — 작업 백로그 (이슈 트래킹)

> 라이브 사이트 검증 중 발견된 모든 이슈/누락사항을 추적합니다.
> 우선순위: P0(긴급) > P1(중요) > P2(개선)
> 처리 완료 시 `[DONE]` 마크 후 하단으로 이동.

**마지막 업데이트**: 2026-04-28 (PayPal 결제 테스트 진행 중)

---

## 🔴 P0 — Vercel 환경변수 SUPABASE_ANON_KEY 누락 (2026-04-28 발견, 해결 진행 중)

**현상**: 매니저가 로그인 직후에도 PayPal 결제 시 `/api/paypal?action=create-order` 가 401 Unauthorized 반환. PayPal SDK는 createOrder 실패 시 결제 창 즉시 닫음.

**진짜 원인**: `api/paypal.js`의 `verifyUser()` 함수가 Supabase Auth 토큰 검증 시 `apikey` 헤더에 `process.env.SUPABASE_ANON_KEY` 또는 `SUPABASE_PUBLISHABLE_KEY` 사용. 그러나 Vercel에 둘 다 등록되어 있지 않아 빈 문자열로 호출 → Supabase Auth가 401 거부.

**해결**:
- Vercel 환경변수 추가: `SUPABASE_ANON_KEY=sb_publishable_IluITb52iuwwHf9xgP99MA__KX-sNM6` (Production+Preview+Development)
- Vercel 재배포 (Deployments → Redeploy)
- ⚠️ 다른 API endpoint (admin, hotels CRUD 등)에서도 같은 패턴 사용한다면 함께 영향. 모든 endpoint 점검 필요.

---

## 🔴 P1 — 세션 토큰 자동 갱신 실패 (2026-04-28 발견)

**현상**: 매니저 로그인 후 30분~1시간 정도 페이지에 머물면, PayPal 결제 시도 시 `/api/paypal?action=create-order` 가 **401 Unauthorized** 반환. PayPal Buttons error: "Unauthorized".

**원인 추정**: Supabase JS SDK의 자동 토큰 갱신 (`auto_refresh_token`)이 dashboard.html에서 작동하지 않거나, refresh token 만료. 사용자가 수동으로 sign out → 재로그인 해야 복구됨.

**임시 해결**: 사용자에게 재로그인 요청.

**근본 해결 필요**:
1. `T.sb` 초기화 시 `autoRefreshToken: true` 명시 확인
2. `getAuthHeader()` 함수에서 토큰 만료 감지 → 자동 refresh 시도 → 그래도 실패하면 강제 로그아웃 + 재로그인 안내
3. 또는 PayPal create-order 401 응답 시 프론트에서 토큰 refresh 후 재시도

**관련 파일**: `dashboard.html` line 422 (`getAuthHeader`), `assets/js/sb.js` 또는 Supabase 초기화 부분

---

## 🔴 P1 — 자동 알림 메일 시스템 누락

**배경**: 호텔 상태 변경 시 매니저에게 자동 알림 메일이 발송되어야 하는데, admin.html의 `changeStatus()` 함수에서 DB만 업데이트하고 메일 발송 로직이 없음.

**현재 동작 중인 메일** (정상):
- ✅ 회원가입 인증 메일
- ✅ ops 알림 메일 (`/api/email/ops/notify-claude-work`)
- ✅ 결제 완료 시 PayPal 인보이스 메일 (paypal.js의 capture-order에 구현됨)

**누락된 매니저 알림 메일** (Resend 통한 sendSystemEmail 추가 필요):
1. 호텔 등록 시 → "Hotel registered, under review"
2. 호텔 승인 시 (`approved`) → "Approved! Please complete payment"
3. 호텔 거절 시 (`rejected`) → "Registration not approved — reason"
4. review 전환 시 → "Your hotel is being reviewed"
5. production 시작 시 (`producing`) → "Production started! Estimated delivery: X days"
6. published 시 → "🎉 Your video is live!"

**작업 위치**:
- `admin.html` line 1767 `changeStatus()` 함수에 메일 발송 추가
- `hotel-info.html` line 918 `btn-save` 핸들러의 createHotel 직후
- 새 파일: `api/email/system/notify-status-change.js` (Resend 연동)
- 또는 기존 ops endpoint 패턴 재사용

---

## 🟡 P2 — 호텔 검색 UX 이슈

### Issue #1: 호텔 검색 결과 정렬 부정확
**현상**: `Lotte Hotel S` 입력 시 결과 순서: Seattle → New York → Chicago → New York → Seoul (5번째). 한국 사용자에게 Seoul이 가장 마지막에 표시.

**해결**: 가입 시 country 받아 location bias로 사용 / 기본 location bias를 한국 좌표로 / review_count DESC 정렬.

**관련 파일**: `api/google-places.js`, `hotel-info.html`

### Issue #2: 짧은 검색어로 결과 0건
**현상**: `Lotte` (5글자) → "No results". `Lotte Hotel S` → 5개 결과.

**해결**: 짧은 검색어 시 자동 city 추론 / 결과 0건 시 친절한 안내 / lodging 필터 완화.

**관련 파일**: `api/google-places.js`, `hotel-info.html`

---

## 🟡 P2 — Admin Console UI 버그

### Issue #3: Hotels 목록의 MANAGER 컬럼 비어있음
**현상**: Admin Console > Hotels > Hotel Partners 목록에서 MANAGER 컬럼이 "-"로 표시됨. 매니저 정보(이지형 / leejifilm@hanmail.net)가 표시되어야 함.

**원인 추정**: `loadAll()` 또는 `renderHotels()`에서 contact_name/contact_email 필드 누락. 또는 manager_email JOIN 누락.

**관련 파일**: `admin.html`

---

## 🟡 P2 — Chrome 안전 브라우징 경고

**현상**: 대표님 Chrome 일반 모드에서 `gohotelwinners.com` 접속 시 "위험한 사이트" 경고. 시크릿 모드/Edge에서는 정상.

**진단**: Google Safe Browsing — 2020-04-08 멀웨어 페이지 보관 이력 (이전 도메인 소유자 흔적). 현재 데이터 없음. Chrome 캐시 잔존.

**해결 옵션**:
- **A. Chrome 캐시 정리** (5분): `chrome://safebrowsing/` → Refresh Lists
- **B. Google Search Console 재검토 요청** (24~72시간)
- **C. 새 도메인 전환** (가장 안전, $10~20): `travelwinners.io` 등

**현재 영향**: 대표님 본인 환경만. 다른 사용자에게는 영향 없음 추정.
**결정 시점**: 매니저 영업 시작 전 (B 또는 C 권장)

---

## 🟢 P3 — Chrome 확장 프로그램 간섭 (사용자 환경)

**현상**: `subtitle.js` 확장 프로그램(자막/번역)이 페이지 JS에 간섭. 콘솔 에러 `Extension context invalidated`.

**영향**: 사이트 동작에는 영향 없음. 디버깅 시 노이즈만 증가.

**해결**: 대표님 환경에서 확장 프로그램 비활성화. 코드 수정 불필요.

---

## ⏳ Phase 3 D단계 — PayPal 검증 후 진행

### D-1. 회원 탈퇴 기능
- 매니저가 자기 계정 삭제 가능
- 호텔 데이터 처리 (cascade vs soft delete 결정)
- Confirm 모달 필수

### D-2. 이메일 변경 기능
- 매니저 settings에서 이메일 변경
- 새 이메일 인증 필수
- 변경 이력 로그

### D-3. Custom SMTP (Resend 도메인 인증)
- Resend → Domains → gohotelwinners.com 추가
- DNS 레코드 추가 (Vercel 도메인 관리)
- 발신자 `noreply@gohotelwinners.com` 통일

---

## 🚀 Live 전환 작업 (Sandbox 검증 완료 후)

- `PAYPAL_ENV` 환경변수: `sandbox` → `live`
- PayPal Live Webhook 별도 등록
- `PAYPAL_WEBHOOK_ID` 환경변수 갱신
- 실제 결제 1건 테스트 ($1 소액)
- 환불 프로세스 검증

---

## 🔒 보안 — 토큰 폐기

이전 채팅에서 평문 노출된 토큰 폐기 필요:
1. **GitHub PAT** (`ghp_eLTTsY...`) — GitHub Settings → PAT → Revoke
2. **Supabase MGMT_TOKEN** (`sbp_b9475...`) — Supabase Account → Access Tokens → Revoke
3. **Supabase SERVICE_ROLE** (`sb_secret_Gbyfly...`) — Settings → API Keys → Rotate (Vercel 갱신)
4. **CLAUDE_OPS_TOKEN** (`sV1IWuv...`) — Vercel 환경변수 변경

**Supabase 토큰 만료**: 2026-05-26 (D-28). 5월 19일 알림.

---

## ✅ DONE
(완료 항목은 날짜와 함께 여기로 이동)
