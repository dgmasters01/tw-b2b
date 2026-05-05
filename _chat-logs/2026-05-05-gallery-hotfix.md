---
slug: 2026-05-05-gallery-hotfix
title: admin-gallery.html 무한 Loading 핫픽스 — STATUS_BADGES retired 키 누락 + fallback 가드
date: 2026-05-05
commits: []
tasks: [BL-GALLERY-HOTFIX]
decisions: []
---

# 2026-05-05 admin-gallery 무한 Loading 핫픽스

**TASK**: BL-GALLERY-HOTFIX (긴급)
**STATUS**: ✅ done
**선행**: CHARTER-12 박힘 직후 — **헌법 12조 위반 사례 1호**

## 헌법 12조 위반 사례 (제 잘못)

**위반 시점**: 2026-05-05 16:00 (commit 7d9dba2 직후)

**대표님 지적**: System Status 카드 클릭 → `/admin-gallery.html` 이동 → "Loading... 권한 확인 중" 무한 정지

**원인**: `Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'color')` at admin-gallery.html:216

**진짜 원인 (3-Layer)**:
- Layer 1 (즉각): `STATUS_BADGES[p.status]` → `STATUS_BADGES["retired"]` → undefined
- Layer 2 (구조): `STATUS_BADGES`에 `retired` 키 자체가 정의 안 됨 (BL-HUB-RETIRE 작업 시 admin-hub.html을 status: "retired"로 박았는데 BADGES 매핑 누락)
- Layer 3 (방어): cardHtml에 fallback 가드 없음 — 매핑 누락 시 하드 크래시

## 헌법 12조 어디서 실패했나

체크리스트 자체는 7가지 통과했으나 **검증 범위가 좁았음**:

- ✅ ① JS 문법 — admin-status.html만 검증, admin-gallery.html은 안 봄
- ✅ ② 데이터 — tasks.json만, pages-meta.mjs는 안 봄
- ✅ ③ Vercel — admin-status.html만 인증 401 확인, 다른 페이지 동작은 안 봄
- ❌ ⑦ **boundary 케이스** — 클릭 시 이동 페이지가 깨졌는지는 안 봄

→ **헌법 12조 ⑦번 미달**: 카드 클릭 = 페이지 이동 = 다음 페이지 동작도 검증 범위 안에 들어가야 했음.

## 박은 fix (2중 안전망)

### Fix 1: 매핑 누락 보충
`scripts/pages-meta.mjs`:
```js
export const STATUS_BADGES = {
  ...
  'retired': { label: '🚫 폐기', color: '#7f1d1d' },  // ★ 박음
};
```

### Fix 2: fallback 가드 (헌법 12조 영구 적용)
`_admin/admin-gallery.html` cardHtml:
```js
const statusBadge = STATUS_BADGES[p.status] || { label: '❓ ' + (p.status || 'unknown'), color: '#6b7280' };
const audienceBadge = AUDIENCE_BADGES[p.audience] || { label: '❓ ' + (p.audience || 'unknown'), color: '#6b7280' };
```

→ 앞으로 매핑 누락이 있어도 **하드 크래시 대신 ❓ unknown 표시**.

## 자체 검증 (헌법 12조 — 이번엔 제대로)

```
① 매핑 검증: 19/19 페이지 모두 STATUS_BADGES + AUDIENCE_BADGES 매핑 OK
② cardHtml 시뮬레이션: 19/19 페이지 OK / 0 ERR
③ 다른 페이지 동일 패턴 점검: admin-gallery.html만 사용
④ 다른 카드 클릭 대상 페이지 라이브 확인:
   - admin-tasks.html HTTP 401 (정상)
   - admin-business.html HTTP 401 (정상)
   - admin-service-ops.html HTTP 401 (정상)
   - admin-permissions.html HTTP 401 (정상)
```

## 헌법 12조 강화 학습

이번 위반으로부터 배운 것 — 헌법 12조 ⑦번 boundary 케이스 정의 확장:
- "카드 클릭 = 페이지 이동" 시 **이동 페이지의 동작까지 검증**
- 데이터 매핑은 **모든 가능한 키 vs 매핑 정의 cross-check**
- fallback 가드를 **lookup 패턴마다 표준 박음** (방어적 코딩)

이 학습은 다음 chat-log에 남겨두며, 헌법 12조 별도 개정은 안 함 (현재 조항 안에 ⑦번 boundary로 포괄됨).

## 변경 파일

- `scripts/pages-meta.mjs` (+1줄, retired 키)
- `_admin/admin-gallery.html` (+2줄 fallback 가드)
- `_chat-logs/2026-05-05-gallery-hotfix.md` 본 chat-log
- `tasks.json` BL-GALLERY-HOTFIX done 박음

## 헌법 적합성

- ✅ 헌법 12조 — 이번엔 ① ② ③ ④ + 시뮬레이션까지 통과 후 인계
- ✅ 메모리 17번 (str_replace, wholesale rewrite 0건)
- ✅ admin.html 미접근
- ⚠️ 헌법 12조 위반 1호 — 위반 즉시 사과 + 재검증 (조항대로 행동)
