# TW B2B — 작업 백로그 (이슈 트래킹)

> 라이브 사이트 검증 중 발견된 모든 이슈/누락사항을 추적합니다.
> 우선순위: **P0(긴급)** > **P1(중요)** > **P2(개선)**
> 처리 완료 시 `[DONE]` 마크 후 하단 DONE 섹션으로 이동.

**마지막 업데이트**: 2026-04-29

> 💡 **새 채팅 시작 시**: 다음 5개 문서를 먼저 보면 즉시 컨텍스트 파악 가능.
>
> | 문서 | 용도 |
> |---|---|
> | **BUSINESS.md** ⭐ | 사업 방향 / 정책 / 가격 / 환불 정책 |
> | **DECISIONS.md** | 의사결정 변경 이력 (왜 이렇게 됐는가) |
> | **BUSINESS_FLOW.md** | 사용자 여정 (가입 → 결제 → 6개월) |
> | **BACKLOG.md** (이 파일) | 할 일 목록 (P0~P3) |
> | **admin-gallery.html** | 페이지 시각 갤러리 (라이브) |

---

## 🔴 P0 — 페이지 흐름 재설계 (2026-04-29 결정)

**배경**: 결제 검증 중 발견 — 현재 dashboard.html에 결제 박스가 노출되는 흐름이 비즈니스적으로 비효율. 결제 후에도 결제 박스가 그대로 보여 중복 결제 위험.

**대표님이 원하는 흐름**:
```
가입 → 호텔 등록 → 관리자 승인
  → [세일즈 페이지] (sales.html) — 우리 가치 어필 + 결제 CTA
  → 결제
  → [매니저 성과 페이지] (marketing.html) — 영상 진행 / 채널 통계 / 인보이스 다운로드
```

**작업 항목**:
1. **sales.html 신설** — 6언어 채널 / 1회 투자 영구 노출 / 신뢰 지표 / 결제 CTA. status=approved 매니저가 보는 페이지.
2. **marketing.html 신설** — 영상 제작 진행 / 채널별 노출 통계 / 인보이스 PDF 다운로드. status=paid/producing/published 매니저가 보는 페이지.
3. **dashboard.html 단순화** — 진행 단계 + 호텔 정보 + status별 "다음 단계로" 버튼만. 결제 박스 제거 (sales.html로 이전).
4. **status별 자동 라우팅** —
   - `pending`/`review` → dashboard
   - `approved` → sales.html (자동 redirect)
   - `paid`/`producing`/`published` → marketing.html

**참고**: 이전 채팅에서 비슷한 페이지를 만든 적이 있다고 대표님이 기억하셨으나, GitHub repo 검색 결과 존재하지 않음. 작업 도중 손실되었거나 다른 repo였을 가능성. 새로 깨끗하게 만드는 것으로 결정.

**관련 파일**: `dashboard.html`, `admin-gallery.html` (planned 상태로 표시)

---

## 🔴 P1 — 자동 알림 메일 시스템 누락

**배경**: 호텔 상태 변경 시 매니저에게 자동 알림 메일이 발송되어야 하는데, `admin.html`의 `changeStatus()` 에서 DB만 업데이트하고 메일 발송 로직 없음.

**현재 동작 중인 메일** (정상):
- ✅ 회원가입 인증 메일
- ✅ ops 알림 메일 (`/api/email/ops/notify-claude-work`)
- ✅ 결제 완료 시 ops 메일 (`/api/paypal` capture-order)
- ✅ DB 저장 실패 시 ops 긴급 메일

**누락된 매니저 알림 메일**:
1. 호텔 등록 시 → "Hotel registered, under review"
2. 호텔 승인 시 (`approved`) → "Approved! Please complete payment" + sales.html 링크
3. 호텔 거절 시 (`rejected`) → "Registration not approved — reason"
4. 결제 완료 시 (`paid`) → 인보이스 PDF 첨부 + marketing.html 링크
5. production 시작 시 (`producing`) → "Production started! Estimated delivery: X days"
6. published 시 → "🎉 Your video is live!" + 영상 링크

**작업 위치**:
- `admin.html` `changeStatus()` 함수에 메일 발송 추가
- `hotel-info.html` `btn-save` 핸들러의 createHotel 직후
- `api/paypal.js` capture-order 성공 후 매니저 인보이스 메일 발송
- 새 파일: `api/email/system/notify-status-change.js` (Resend 연동)

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
- A. Chrome 캐시 정리 (5분): `chrome://safebrowsing/` → Refresh Lists
- B. Google Search Console 재검토 요청 (24~72시간)
- C. 새 도메인 전환 (가장 안전, $10~20): `travelwinners.io` 등

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

### 2026-04-29
- ✅ **PayPal 결제 시스템 완전 작동 검증**
  - 첫 결제 성공: $200 USD, capture_id `85V07166676483251`, hotel `Lotte Hotel Seattle`
  - 결제 데이터 DB 정상 저장 (수동 복구 후 자동 표시)
  - 호텔 status: approved → paid 자동 변경 트리거 작동 (수정 후)

- ✅ **PayPal 통합 4가지 critical 버그 수정**
  1. `SUPABASE_ANON_KEY` Vercel 환경변수 추가 (401 해결)
  2. `payee.merchant_id`를 sandbox에서는 보내지 않도록 수정 (PAYEE_ACCOUNT_INVALID 해결)
  3. payment status 매핑: `'completed'` → `'succeeded'` (DB CHECK 제약 위반 해결)
  4. 트리거 함수 `sync_hotel_paid_status` 조건 `'completed'` → `'succeeded'` 동기화

- ✅ **`mapPayPalStatusToDb()` 헬퍼 추가** — PayPal status 5종을 DB 허용 status 5종으로 안전 매핑

- ✅ **Page Gallery 시스템 신설** (admin-gallery.html)
  - 모든 페이지 시각적 한눈 보기 + status 분류 + 라이브 링크 + BEFORE/AFTER 모달
  - 자동 캡처 스크립트 (`scripts/capture-pages.mjs`) - Playwright 기반
  - 페이지 메타데이터 단일 소스 (`scripts/pages-meta.mjs`)
  - admin.html 사이드바에 Page Gallery 메뉴 추가
  - **6개 public 페이지 자동 캡처 완료** (index/signup/login/forgot/reset/verify)

### 2026-04-28
- ✅ **Phase 3 Step C — PayPal Checkout 통합** (단일 router, 67/67 검증 통과)
- ✅ Supabase Management API 자동 SQL 실행 워크플로 정착
- ✅ Vercel 환경변수 5종 등록 (PayPal sandbox+live + merchant ID)
- ✅ PayPal Sandbox Webhook 등록 + 5개 이벤트 구독
- ✅ 호텔 등록 → 관리자 승인 → 결제 흐름 라이브 검증
