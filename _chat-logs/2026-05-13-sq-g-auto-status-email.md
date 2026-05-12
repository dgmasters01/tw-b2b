---
slug: 2026-05-13-sq-g-auto-status-email
title: SQ-G — 호텔 status 변할 때 매니저에게 자동 메일 6종 발송
date: 2026-05-13
tasks: [SQ-G]
commits: []
decisions: [D-032]
---

## 🎯 한 줄 요약

호텔 매니저가 등록·승인·결제·게시 같은 단계 넘어갈 때마다 자동으로 6종 안내 메일이 발송된다.

## 📍 왜 발생했나

대표님이 호텔 매니저 화면에서 "승인" 버튼을 누르면 데이터베이스만 바뀌고 매니저에게 알림이 안 갔다. 매니저는 우리 화면에 직접 들어와야만 진행 상황을 알 수 있었고, 이 불편함은 매니저 이탈로 직결됐다. 6개 단계 모두 자동 메일이 필요했다.

## 🛠 어떻게 해결했나

서버에 자동 메일 발송용 함수를 신설하고, 관리자 화면의 status 변경 버튼이 눌리면 그 함수를 자동 호출하도록 연결했다. 발송 권한은 관리자 로그인 토큰으로 검증해서 외부에서 호출할 수 없게 했다. 메일 6종은 영어 본체로 작성됐고(한국어 분기는 다음 단계에서 추가), TravelWinners 사업 톤(따뜻함 + 명확함 + 전문성)으로 통일했다.

## ✅ 결과

- 매니저가 "등록 → 승인 → 결제 → 제작 → 게시" 5단계 전부 메일로 자동 통보받음
- 거절된 매니저도 사유 안내와 재신청 경로를 받음
- 대표님이 매번 메일 작성·발송할 일이 0건으로 줄어듦
- 관리자 인증으로 외부 무단 발송 차단

## ⏱ 다음 결정 필요

다음 단계 BL-EMAIL-LOCALE-ROUTING에서 한국 매니저 대상 한국어 분기 추가. 그 외 추가 결정 없음.

---

# 🔧 기술 상세 (개발자용)

## 변경 파일
- `api/email/hotel-status-notify.js` (신규, 245줄) — POST endpoint
- `_admin/admin.html` line 2757~ `changeStatus()` 함수 — 메일 발송 hook

## 인증 방식
- Supabase admin Bearer 토큰 검증 (`api/admin.js` requireAdmin 패턴 동일)
- 관리자 role: `owner | admin | staff` 만 호출 가능
- 환경변수: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` 필요

## 6개 트리거 status
1. `registered` — 등록 접수 안내
2. `approved` — 승인 + 결제 페이지 안내
3. `rejected` — 거절 사유 + 재신청 안내
4. `paid` — 결제 완료 + 6개월 보장 시작 안내
5. `producing` — 영상 제작 시작 안내
6. `published` — 영상 게시 + 대시보드 링크 안내

## 매니저 이메일 폴백 체인
`hotel._resolvedManagerEmail || hotel.manager_email || hotel.contact_email`
(admin.html line 2591에서 이미 박혀있는 폴백 체인 재사용)

## 메일 발송 인프라
- `sendSystemEmail()` 함수 재사용 (`api/_lib/email-sender.js`)
- FROM: `TravelWinners B2B <noreply@gohotelwinners.com>`
- Reply-To: `support@gohotelwinners.com`
- Resend API endpoint 사용

## 실패 처리
- 메일 발송 실패해도 status 변경은 정상 진행 (비동기)
- 매니저 이메일 없으면 console.warn + 발송 스킵 (status 변경은 유효)
- 발송 성공/실패 toast로 admin에게 알림

## 영향 BL
- D-032: 동남아 1차 타겟 + 영어 default → 영어 본체 적용 ✓
- BL-EMAIL-LOCALE-ROUTING: 한국어 분기 (다음 작업)
- BL-RENAME-GOHOTEL: 메일 본문 URL은 gohotelwinners.com 그대로 (영향 없음)
