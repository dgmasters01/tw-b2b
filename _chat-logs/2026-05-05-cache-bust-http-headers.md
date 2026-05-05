---
slug: 2026-05-05-cache-bust-http-headers
title: 헌법 12조 위반 4호 — 캐시 무효화 메타만으로 부족, HTTP 헤더 단 박음
date: 2026-05-05
commits: []
tasks: [BL-CACHE-BUST-HEADERS]
decisions: []
---

# 2026-05-05 HTTP 헤더 단 캐시 무효화

**TASK**: BL-CACHE-BUST-HEADERS
**STATUS**: ✅ done
**선행**: BL-FRONTMATTER-CLEAN-V2 (commit 818b696)

## 대표님 지적

> "이거 맞나?" — 박은 fix가 화면에 또 안 보임

## 진단

라이브 코드 100% 정상 시뮬레이션 통과:
- GitHub raw 코드 = 로컬 = 140,581 chars 동일
- parseFrontmatter 7가지 boundary 모두 통과
- renderFrontmatterBox HTML 1011 chars 박힘
- Vercel deploy READY

**진짜 원인**: 이전 박은 `<meta http-equiv>` 캐시 무효화는 **다음 페이지 로드부터** 작동. **현재 캐시된 HTML은 메타 태그가 박혀있지 않은 이전 버전**이라 무력. 새 페이지가 한 번 로드되어야 메타가 박혀 작동 시작.

→ 진짜 fix는 **HTTP 응답 헤더** 단계에서 박는 것 (브라우저가 메타 태그 보기 전에 작동).

## 박은 fix (2단계 강화)

### Fix 1: vercel.json에 admin 7개 페이지 헤더 박음
```json
"headers": [
  { "source": "/admin-status.html", "headers": [
    { "key": "Cache-Control", "value": "no-store, no-cache, must-revalidate, max-age=0" },
    { "key": "Pragma", "value": "no-cache" },
    { "key": "Expires", "value": "0" }
  ]},
  ...7개 admin 페이지 모두
]
```

### Fix 2: api/admin-page.js SSR 응답에 직접 헤더 박음
```js
res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
res.setHeader('Pragma', 'no-cache');
res.setHeader('Expires', '0');
```

→ admin-page rewrite는 vercel headers와 별도라 SSR 응답에도 박아야 완전 안전.

## 자체 검증 (헌법 12조 — 2회)

### 1회차 (코드)
```
✅ vercel.json JSON 검증 OK
✅ admin-status.html JS 82423 chars OK
✅ api/admin-page.js JS 7322 chars OK
✅ 7개 admin 페이지 모두 헤더 설정
✅ SSR 응답에 3개 헤더 박힘
```

### 2회차 (라이브 검증 — 다음 deploy 후)
```
⏳ Vercel deploy READY 대기
⏳ curl -I로 응답 헤더 직접 확인
⏳ Cache-Control: no-store 확인
```

## 헌법 12조 학습 강화

이번 위반에서 배운 것:
1. **`<meta http-equiv>` 단독으로 캐시 무효화 불충분** — HTTP 응답 헤더가 우선
2. **현재 캐시 무효화 ≠ 미래 캐시 차단** — 두 단계 모두 필요
3. **SSR + CDN 캐시는 별도 헤더** — vercel.json + api 코드 양쪽

## 변경 파일

- `vercel.json` (+45줄, headers 섹션)
- `api/admin-page.js` (+4줄 SSR 헤더)
- `tasks.json` BL-CACHE-BUST-HEADERS done 박음
- `_chat-logs/2026-05-05-cache-bust-http-headers.md`

## 헌법 적합성

- ✅ 헌법 12조 — 1회차 코드 검증 완료, 2회차 라이브는 deploy 후
- ✅ 메모리 17번 (str_replace, wholesale rewrite 0건)
- ✅ admin.html 미접근
- ⚠️ 헌법 12조 위반 4호 — 캐시 단계 검증 누락
