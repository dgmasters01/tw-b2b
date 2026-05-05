---
slug: 2026-05-04-admin-auth-v2-router-consolidation
title: BL-ADMIN-AUTH-V2 라우터 통합 — Vercel Hobby 12 함수 한도 회피 (D-016)
date: 2026-05-04
commits: []
tasks: [BL-ADMIN-AUTH-V2]
decisions: [D-016]
---

# BL-ADMIN-AUTH-V2 라우터 통합 (D-016)

**시간**: 2026-05-04 (이전 채팅 인계)
**선행 commit**: 1f2387a (Vercel redeploy 트리거, 그러나 ERROR 상태)
**선행 chat-log**: `2026-05-04-real-system-phase-a.md`
**관련 task**: BL-ADMIN-AUTH-V2

---

## 🚨 발생한 문제

이전 채팅에서 BL-ADMIN-AUTH-V2 핵심 작업(8d3f2b8 + fc560c8) 완료 후 **Vercel Build Failed** 발생.

```
No more than 12 Serverless Functions can be added to a Deployment 
on the Hobby plan. Create a team (Pro plan) to deploy more.
```

원인 — BL-ADMIN-AUTH-V2가 추가한 신규 5개 함수:
- `api/admin/accept-invite.js`
- `api/admin/change-role.js`
- `api/admin/invite.js`
- `api/admin/users-list.js`
- `api/auth/session.js`

기존 10개 + 신규 5개 = 15개 → Hobby 한도(12) 초과 → Build Failed.

**대표님 결정**: C 옵션 — 지금 라우터 통합으로 무료 유지 + 정식 오픈 직전 Pro 전환.

---

## 🛠 박은 변경

### 1. 5개 신규 함수 → 라우터 패턴 통합

**`api/admin-actions.js` 생성 후 `api/_lib/admin-auth-handlers.js`로 이동** (라이브러리, 함수 카운트 제외):

```
api/admin/{accept-invite, change-role, invite, users-list}.js (4개)
                       ↓ 통합
            api/_lib/admin-auth-handlers.js (1개 모듈)
                       ↓ import
            api/admin.js (기존 운영 라우터에 흡수)
                action: auth-* 분기

api/auth/session.js (1개)
                       ↓ 변환
            api/auth.js (라우터 패턴, 추후 oauth-callback 등 확장 대비)
```

### 2. `api/admin.js` 라우터 확장

기존 4개 action (`booking-upload`, `list-users`, `send-invite`, `update-match`) 유지.
새 4개 action 추가 (`auth-users-list`, `auth-invite`, `auth-accept-invite`, `auth-change-role`).

핵심 — `auth-*` action은 **requireAdmin 우회**:
- 기존 운영 핸들러는 admins 테이블 인증 통과 후 진입
- BL-ADMIN-AUTH-V2 핸들러는 자체 Bearer JWT 인증 (특히 accept-invite는 가입 전이라 인증 없이 토큰만 검증)
- admin.js 라우터에서 `action.startsWith('auth-')` 분기 → adminAuthHandler 호출

```javascript
if (action.startsWith('auth-')) {
  const subAction = action.slice('auth-'.length);  // auth-invite → invite
  req.query = { ...req.query, action: subAction };
  return await adminAuthHandler(req, res);
}
```

### 3. `api/auth.js` 신규 (확장 대비)

session 1개만 들어있지만 라우터 패턴으로 작성. 추후 oauth-callback / verify-email / reset-password 추가 시 case만 추가.

### 4. vercel.json rewrites — 클라이언트 코드 변경 0

기존 클라이언트가 `/api/admin/invite`, `/api/auth/session` 같은 URL로 호출 중. rewrites로 흡수:

```json
"rewrites": [
  { "source": "/api/admin/users-list",   "destination": "/api/admin?action=auth-users-list" },
  { "source": "/api/admin/invite",       "destination": "/api/admin?action=auth-invite" },
  { "source": "/api/admin/accept-invite","destination": "/api/admin?action=auth-accept-invite" },
  { "source": "/api/admin/change-role",  "destination": "/api/admin?action=auth-change-role" },
  { "source": "/api/auth/session",       "destination": "/api/auth?action=session" }
]
```

영향받은 클라이언트 (모두 코드 수정 없이 작동):
- `_admin/admin-permissions.html`: 4군데
- `admin-login.html`: 1군데
- `admin-accept-invite.html`: 2군데

---

## 📊 함수 카운트 변화

| 단계 | 함수 갯수 | Hobby 한도 |
|---|:--:|:--:|
| BL-ADMIN-AUTH-V2 박기 전 | 10 | ✅ |
| BL-ADMIN-AUTH-V2 박은 직후 (D-015) | **15** | ❌ |
| 라우터 통합 후 (D-016) | **12** | ✅ |

**정확히 한도에 맞춤.** 추후 함수 추가 시:
- 단순 추가는 불가능 (이미 한도)
- 새 기능은 `?action=` 패턴으로 기존 라우터에 흡수
- 대규모 신기능은 Pro 전환 시점에 별도 함수 분리 가능

---

## ✅ 자가 검증

- [x] JS syntax: admin.js / auth.js / admin-auth-handlers.js 모두 `node --check` 통과
- [x] 함수 카운트: 12개 (Hobby 한도 정확히 맞춤)
- [x] charter-mapping-check 30/30 PASS
- [x] package.json `@supabase/supabase-js` 박혀있음 (fc560c8에서 추가됨)
- [x] vercel.json valid JSON
- [x] 클라이언트 URL 호환: 8개 호출 모두 rewrites로 자동 라우팅
- [x] auth-* 인증 흐름 분리 (accept-invite 무인증 진입 가능)

라이브 검증은 deploy 후:
- [ ] Vercel Build SUCCESS (이전 ERROR → 해결 기대)
- [ ] curl `/api/auth/session` → 401 (no token) 정상
- [ ] curl `/api/admin/users-list` (with token) → admins/invitations/log 반환
- [ ] admin-permissions.html 진입 → 사용자 목록 정상 로드

---

## 🚨 알려진 이슈 / Phase β로 미룬 것

### 정식 오픈 직전 Pro 전환 필수
대표님 사업 단계상 Pro($20/월)는 **매니저 1~2명 들어오면 즉시 회수**. 정식 오픈 1~3개월 전 전환 권장. 그 시점까지는 라우터 패턴 유지.

### admin.js 비대화 위험
admin.js 737줄 + auth-* 분기 = 약 760줄. 추후 새 기능 추가하면 1,000줄 넘어갈 수 있음. Pro 전환 시점에 다시 분리 검토.

### auth.js 단일 함수 임시 보유
session 1개만 있어 라우터 패턴이 약간 과한 상태. 추후 oauth-callback 추가 시 자연스럽게 채워짐.

### Owner 자동 부여 트리거 검증 필요
DB 트리거가 `dgmasters01@gmail.com` 가입 시 자동 owner 부여하는지 라이브 검증 필수. 대표님이 admin-login.html에서 Google OAuth로 첫 로그인할 때 확인.

---

## 📝 다음 채팅 첫 입력 (대표님 붙여넣기용)

```
BL-ADMIN-AUTH-V2 라이브 검증 — 라우터 통합 후 deploy 결과

선행 fetch:
1. https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/_chat-logs/2026-05-04-admin-auth-v2-router-consolidation.md
2. last commit 확인 후 Vercel deploy 상태

검증 사항:
1. Vercel Build SUCCESS 여부
2. curl /api/auth/session → 401 정상
3. https://gohotelwinners.com/admin-login.html 진입
4. Google OAuth로 dgmasters01@gmail.com 로그인
5. 자동 owner 부여 확인 (Supabase admins 테이블)
6. /admin-permissions.html 진입 → 사용자 목록 + 초대 폼 + 권한 변경 작동

이슈 발견 시 자율 진행, chat-log 박고 commit + push.
```

---

## 🔧 헌법/메모리 준수 점검

- ✅ 헌법 1조: 시스템 디테일(라우터 패턴 / 핸들러 분리 / rewrites)은 Claude 자율, 대표님은 비용 정책(C 옵션)만 결정
- ✅ 메모리 5번 / 24번: 위치/구조 질문 안 함, 자율 판단으로 admin.js 흡수 결정
- ✅ 메모리 17번: 분량 자체 끊기 — 큰 패치 직후 검증 + chat-log 박기 분리 진행
- ✅ 메모리 25번: chat-log + commit `[변경사유]` 박음
- ✅ D-014: 큰 단위 commit 직전 chat-log 작성 (이 파일)
- ✅ D-016: 라우터 통합 결정사항 박힘 (DECISIONS.md는 이 commit에 같이 박음)
