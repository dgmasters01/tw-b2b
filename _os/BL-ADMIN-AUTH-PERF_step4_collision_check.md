# BL-ADMIN-AUTH-PERF Step 4 검증 결과

**일시**: 2026-05-09
**작업**: vercel.json admin-* redirect ↔ middleware.js matcher 충돌 검증
**결정**: 수정 불필요 (Vercel 처리 순서로 자연 해결)

---

## Vercel 처리 순서 (공식)

```
요청 → redirects → rewrites → middleware → static/functions
```

middleware는 redirect 이후에 호출되므로, 단축 URL이 `.html`로 정규화된 후에 middleware가 실행됨. 충돌 없음.

---

## 케이스별 동작 검증 (논리 검증, 라이브 검증은 2편)

| 입력 | redirect | middleware | 결과 |
|---|---|---|---|
| `/admin-status` | → `/admin-status.html` | 검증 | 통과 시 HTML / 실패 시 login |
| `/admin-status.html` | (변경 없음) | 검증 | 통과 시 HTML / 실패 시 login |
| `/admin-hub.html` | → `/admin-status.html` | 검증 | 통과 시 HTML / 실패 시 login |
| `/admin-hub` | → `/admin-status.html` | 검증 | 통과 시 HTML / 실패 시 login |
| `/_admin/admin-status.html` | → `/admin-status.html` | 검증 | 통과 시 HTML / 실패 시 login |
| `/admin-login.html` | (변경 없음) | path 분기 통과 | 정적 HTML (인증 전 페이지) |
| `/admin-accept-invite.html` | (변경 없음) | path 분기 통과 | 정적 HTML (인증 전 페이지) |
| `/api/admin-page` | matcher 미해당 | 호출 안됨 | API 함수 정상 작동 |

---

## 매처 패턴 검증

```js
matcher: [
  '/admin-:path*.html',  // /admin-status.html, /admin-tasks.html 등
  '/admin.html',         // 단일 admin.html
  '/admin-:path*',       // 단축 URL (/admin-status, /admin-tasks)
  '/admin',              // 단일 단축
  '/_admin/:path*',      // 안전망 (vercel.json이 이미 리디렉트)
]
```

api/* 와 정적 자산은 matcher에 명시 안 했으므로 자동 제외.

---

## 라이브 검증 항목 (2편에서 박을 것)

1. `vercel dev` 로컬에서 admin-status 접근 시 middleware 호출 로그 확인
2. 비로그인 상태로 admin-status.html 직접 입력 → /login.html 리디렉트 확인
3. 로그인 상태로 admin-status.html 접근 → 정상 표시 확인 (200ms 이내)
4. admin 권한 없는 일반 유저로 접근 → /login.html?reason=not_admin 리디렉트 확인
5. admin-login.html 비로그인 접근 → 정적 HTML 정상 서빙 확인
6. /api/admin-page 호출 → middleware 우회 확인

---

**결론**: 1편에서 vercel.json 수정 없음. middleware.js만 박은 상태로 push 후, 2편에서 라이브 검증.
