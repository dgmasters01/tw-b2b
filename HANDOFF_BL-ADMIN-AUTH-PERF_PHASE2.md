# BL-ADMIN-AUTH-PERF 2편 인계서 — 새 채팅 시작용

**작업 ID**: BL-ADMIN-AUTH-PERF
**결정**: D-021 (Edge Middleware 단일 게이트, A-2 정석)
**1편 완료일**: 2026-05-09
**2편 시작 권장 환경**: 새 채팅 (1편에서 토큰 안전 분할)

---

## 🚦 0단계 — 채팅 라우팅 자가 판단 (CLAUDE.md 부칙 13)

**권장**: ✅ 새 채팅 적합 (medium 작업, 4단계, 라이브 배포·검증 포함)

**자가 판단 명령**: 새 Claude는 응답 첫 줄에 부칙 12 (작업 소요 선보고) + 부칙 13 (채팅 라우팅) 박음.

**예시:**
```
[작업 소요: 약 2h / 4단계 / 변경 파일: admin-* 12개, shared.js, ops 메일]
🚦 ✅ 새 채팅 시작 — 토큰 여유 충분
```

---

## 1편에서 이미 박은 것 (재작업 금지)

| Step | 작업 | Commit | 파일 |
|---|---|---|---|
| 1 | D-021 결정 레코드 박음 | `4463709` | `DECISIONS.md`, `DECISIONS_INDEX.md` |
| 2 | tasks.json progress_steps 박음 (1편 5단계 + 2편 4단계) | `5a98aef` | `tasks.json` |
| 3 | middleware.js 작성 (Vercel Routing Middleware 정석) | `c974059` | `middleware.js` (신규) |
| 4 | vercel.json↔middleware 충돌 검증 (수정 불필요 결정) | `a01c579` | `_os/BL-ADMIN-AUTH-PERF_step4_collision_check.md` |
| 5 | 본 인계서 작성 + push | (이 commit) | 본 파일 |

---

## 2편에서 박을 것 (4단계)

### Step 6 — admin-* 12개 페이지 클라이언트 인증 코드 제거

**대상 파일** (`grep -l "checkAdmin\|getSession" _admin/`):
1. `_admin/admin-business.html` — L140-160 init() 인증 블록 제거
2. `_admin/admin-gallery.html` — L108-120 인증 블록 제거
3. `_admin/admin-permissions.html` — L240-270 인증 블록 제거
4. `_admin/admin.html` — L1067 checkAdmin / L2305, L2329, L2553, L3480 getSession 제거
5. (다른 페이지들에도 잔존 가능 — 다시 grep 후 처리)

**제거 패턴 예시 (admin-business.html L140-160):**

```js
// BEFORE — 클라이언트 인증 (제거)
(async function init(){
  if (!window.TW || !window.TW.sb) {
    renderDeny('Supabase 클라이언트 로드 실패');
    return;
  }
  const { data: { session } } = await window.TW.sb.auth.getSession();
  if (!session) { window.location.href = '/login.html'; return; }
  const ac = await window.TW.checkAdmin(session.user);
  if (!ac || !ac.is_admin) {
    renderDeny('관리자만 접근 가능한 페이지입니다.', session.user.email);
    return;
  }
  renderShell(session.user.email);
  await loadDoc(DOCS[0].file);
})();
```

```js
// AFTER — middleware가 인증 보장. 페이지는 user 정보만 가져옴
(async function init(){
  if (!window.TW || !window.TW.sb) {
    console.warn('Supabase 클라이언트 로드 실패 — 페이지 일부 기능 제한');
  }
  // middleware가 이미 검증 통과시킴 — getSession은 user 정보 표시용으로만 사용
  let userEmail = '';
  try {
    const { data: { session } } = await window.TW.sb.auth.getSession();
    if (session) userEmail = session.user.email;
  } catch (e) { /* user 정보 없어도 페이지는 표시 */ }
  renderShell(userEmail);
  await loadDoc(DOCS[0].file);
})();
```

**중요**:
- `renderDeny` 호출 코드는 제거 (middleware가 이미 차단)
- `getSession()`은 user 정보 표시용으로 남김 (선택 — 헤더에 이메일 표시 등)
- `checkAdmin()` 호출은 100% 제거 (RPC 왕복 제거 = 속도 개선의 핵심)

---

### Step 7 — shared.js 정리 (선택적, 신중하게)

**옵션 A**: `_adminCache` 그대로 유지 (다른 곳에서 사용할 수 있으므로)
**옵션 B**: `window.TW.checkAdmin` / `window.TW.isAdmin` / `_adminCache` 모두 제거 (단일 게이트 강화)

**정석은 B** — middleware가 단일 진실원이므로 클라이언트 인증 함수는 제거가 정석. 단, 사용처 grep 필수:

```bash
grep -rn "TW.checkAdmin\|TW.isAdmin\|window.TW.clearAdminCache" --include="*.html" --include="*.js" .
```

사용처 0개면 제거. 잔존하면 같이 정리.

**BL-AUTH-COOKIE-SYNC (shared.js L21-48)는 유지 필수** — middleware가 이 쿠키 읽음.

---

### Step 8 — Vercel 배포 + 라이브 검증

**배포:**
```bash
git push origin main  # 1편 5개 commit + 2편 step6, 7 commit이 push되면서 자동 배포
```

**라이브 검증 항목 (`_os/BL-ADMIN-AUTH-PERF_step4_collision_check.md` 참조):**

| # | 케이스 | 기대 결과 | 측정 |
|---|---|---|---|
| 1 | 비로그인 → `/admin-status.html` 직접 입력 | `/login.html?reason=no_session` 즉시 리디렉트 (HTML 안 받음) | Network 탭 302 + 0.1초 이내 |
| 2 | 로그인+admin → `/admin-status.html` | 정상 표시, 페이지 안 인증 RPC 호출 0건 | Network 탭 점검, BEFORE/AFTER 로딩 시간 비교 |
| 3 | 로그인+non-admin → `/admin-status.html` | `/login.html?reason=not_admin` 리디렉트 | Network 탭 302 |
| 4 | `/admin-login.html` 비로그인 접근 | 정상 표시 (인증 전 페이지) | 200 + HTML 정상 |
| 5 | `/api/admin-page` 호출 | middleware 미실행, API 정상 응답 | matcher 우회 확인 |
| 6 | BEFORE/AFTER 로딩 시간 측정 | admin-status 첫 표시까지: 1~2초 → 0.2초 이하 | Lighthouse FCP 측정 |

**스크린샷 의무** (헌법 부칙 8 통합 관리):
- BEFORE: 현재 admin-status.html Network 탭 (직렬 4건 RPC)
- AFTER: middleware 적용 후 Network 탭 (RPC 0건)

---

### Step 9 — ops 메일 + chat-log + tasks.json done 처리

**ops 메일 발송:**
```bash
curl -X POST https://gohotelwinners.com/api/email/ops/notify-claude-work \
  -H "Authorization: Bearer sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "BL-ADMIN-AUTH-PERF 완료 — admin 페이지 로딩 즉시화",
    "summary": "Edge Middleware 단일 게이트 적용. admin-* 12개 페이지의 직렬 인증 RPC 4건 제거.",
    "before_after": {
      "before": "1~2초 (Supabase JS 로드 → getSession → checkAdmin RPC → admins SELECT)",
      "after": "0.2초 이하 (Edge에서 검증 완료, HTML 받자마자 표시)"
    },
    "live_check_url": "https://gohotelwinners.com/admin-status.html",
    "screenshots": ["before.png", "after.png"]
  }'
```

**chat-log 박음** (헌법 부칙 15 chat-log 자동 게이트):
- 파일: `_chat-logs/2026-05-09-bl-admin-auth-perf.md` (또는 2편 시작일)
- 내용: 1편+2편 통합. 사람용 + AI용 이중 형식 (`_os/playbook/chat-log-format.md` 참조)
- index.json `byTask` 매핑 갱신

**tasks.json done 처리:**
```python
import json, datetime
with open('tasks.json') as f: d = json.load(f)
for t in d['tasks']:
  if t['id'] == 'BL-ADMIN-AUTH-PERF':
    t['status'] = 'done'
    t['updated_at'] = datetime.datetime.now(datetime.UTC).isoformat()
    # progress_steps 모두 done으로 갱신
    for s in t['progress_steps']['phase1_in_this_chat']: s['status'] = 'done'
    for s in t['progress_steps']['phase2_in_new_chat']: s['status'] = 'done'
    t['history'].append({...완료 이벤트...})
```

---

## 핵심 인프라 (인계용)

| 항목 | 값 |
|---|---|
| Repo | `dgmasters01/tw-b2b` (메인 브랜치) |
| 라이브 도메인 | `https://gohotelwinners.com` |
| Vercel 프로젝트 | `tw-b2b` (`prj_KPfzLZaDSaEv6mBdyp3bIpDlPAjY`) |
| Supabase Ref | `vjsludfjsphwnumuoqaj` |
| ops 메일 endpoint | `gohotelwinners.com/api/email/ops/notify-claude-work` |
| ops 토큰 | `sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK` |
| Vercel API Token | (메모리에서 가져옴 — `recent_updates` 항목 "Vercel 운영 원칙 + 토큰" 참조, 충전 상태 확인 후 사용) |

---

## 환경변수 확인 의무 (2편 시작 시 첫 단계)

middleware.js가 작동하려면 Vercel Project Settings에 아래 환경변수가 박혀있어야 함:

```
SUPABASE_URL=https://vjsludfjsphwnumuoqaj.supabase.co
SUPABASE_ANON_KEY=<sb_publishable_xxx 또는 anon JWT>
```

**2편 첫 작업**: Vercel CLI 또는 API로 환경변수 존재 확인. 없으면 박은 후 진행.

```bash
# Vercel CLI (토큰 메모리 사용)
VERCEL_TOKEN=vcp_xxx vercel env ls --scope dgmasters01-9797
```

---

## 검증 11개 + 사전 안전장치 3개 (2편 시작 시 다시 답하기)

**사전 안전장치 3개:**
1. 🧭 북극성: "대표님이 admin-status 들어갈 때마다 1~2초 깜빡임 없이 즉시 표시"
2. 🔍 중복 점검: 1편에서 코드 추적 완료 — middleware.js 단일 진실원, 페이지마다 인증 코드 박힌 것 12개 정리
3. 🎯 한 채팅 한 결정: "페이지 12개에서 클라이언트 인증 제거 + 라이브 배포 검증" — 다른 작업 섞이면 분리

---

## 자가 반성 영구 기록 (D-021 본문 참조)

**1편에서 발생한 헌법 위반:**
- A-1(쿠키만 검증) 옵션을 "정석 비교"에 포함시킨 것 = 헌법 위반.
- 메모리 절대 원칙: "임시방편·수동 우회·하드코딩 옵션은 대표님께 제안조차 금지. 정석 방안만 1~3개 제시."
- 대표님이 "정석은 뭐야"라고 짚어주신 후 자가 교정.

**2편 Claude에게**: 정석 5기준(① 장기 안정성 ② 표준 패턴 ③ 유지보수 비용 ④ 단일 진실원 ⑤ 재발·롤백 안전)으로 옵션을 미리 거른 후에만 대표님께 비교 제시. A-1 같은 비정석 후보를 만드는 것 자체가 위반.

---

## 부칙 8 통합 관리 — Before/After 스크린샷 의무

배포 직후 다음 페이지에서 의무 측정:

| 페이지 | URL | 측정 항목 |
|---|---|---|
| admin-status | https://gohotelwinners.com/admin-status.html | FCP, RPC 호출 수 |
| admin-tasks | https://gohotelwinners.com/admin-tasks.html | FCP, RPC 호출 수 |
| admin-business | https://gohotelwinners.com/admin-business.html | FCP, RPC 호출 수 |
| admin-gallery | https://gohotelwinners.com/admin-gallery.html | FCP, RPC 호출 수 |

Playwright 자동 측정 스크립트는 `scripts/capture-pages.mjs` 활용 가능.

---

**🎯 2편 시작할 때 첫 응답:**

```
[작업 소요: 약 2h / 4단계 / 변경 파일: admin-* 12개, shared.js, ops 메일]
🚦 ✅ 새 채팅 — 토큰 여유 충분

# BL-ADMIN-AUTH-PERF 2편 시작

1편 완료 확인:
- D-021 박음 ✅
- middleware.js 박음 ✅
- vercel.json 충돌 검증 완료 ✅
- 5 commits push 완료 ✅

2편 step 6부터 시작합니다.
```

---

**작성**: 클로드 (1편 마지막 step)
**참조**: D-021, OPERATIONS_CHARTER.md, CLAUDE.md, `_os/BL-ADMIN-AUTH-PERF_step4_collision_check.md`
