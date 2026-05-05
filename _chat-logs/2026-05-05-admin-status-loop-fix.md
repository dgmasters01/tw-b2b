# 2026-05-05 admin-status 무한루프 fix + RLS hotfix 영구 박기

**TASK**: BL-ADMIN-STATUS-LOOP-FIX (신규, parent: BL-ADMIN-AUTH-V2)
**STATUS**: ✅ done
**COMMIT**: (이 chat-log 박은 직후 박힘)

## 선행 컨텍스트

- BL-ADMIN-AUTH-V2 + D-016 라우터 통합 commit `c56885c` ✅
- RLS 무한 재귀 fix (Supabase Management API 라이브 적용) ✅
- admins.id ↔ auth.users.id 동기화 ✅
- admin.html 정상 작동 (Owner 인식 + Hotels/Members/Team 메뉴 OK)
- **admin-status.html 카테고리 카드까지 표시되지만 자율 작업 큐 + 활동 이력 + 다음 추천 박스에서 무한루프** → "응답없는 페이지" 경고

## 진단

### 코드 정적 분석

`_admin/admin-status.html` 줄 2099-2106:

```js
const modalObserver = new MutationObserver(() => {
  const hasModal = !!document.querySelector('.modal[style*="block"], [aria-modal="true"], .activity-expand-wrap');
  if (hasModal) pollPause('모달/펼침');
  else pollResume('모달/펼침');
});
modalObserver.observe(document.body, { childList: true, subtree: true });
```

`pollPause/Resume` → `updatePollStatus()` → `POLL.statusEl.textContent` / `classList` 변경.

`POLL.statusEl`은 `document.body.appendChild` 박힌 자식이므로 **자기 텍스트 변경이 MutationObserver를 재발화**.

### 무한루프 메커니즘

```
MutationObserver 발화
  → pollPause/Resume (호출 시 항상 DOM 변경)
    → updatePollStatus → POLL.statusEl.textContent 변경
      → MutationObserver 재발화
        → pollPause/Resume 또 호출
          → 무한 반복
```

추가 강화 요인:
- `setInterval(pollTick, 5000)`이 매 5초마다 `.poll-toast` DOM 생성/제거 → 루프 가속
- `showAutoQueueToast`도 매 클릭마다 `.auto-queue-toast` 생성 → 루프 가속

### 왜 admin.html은 멀쩡한가

admin.html에는 MutationObserver를 쓰지 않음. 이 패턴은 admin-status.html의 BL-REAL-SYSTEM Phase α "5초 폴링" 구현에서만 박힘.

## Fix (3중 안전망)

`_admin/admin-status.html` 변경 2곳:

### ① pollPause/Resume에 가드 추가

이미 같은 reason으로 일시정지된 상태면 DOM 손대지 않음:

```js
function pollPause(reason) {
  if (POLL.pauseReasons.has(reason)) return;  // ★ 가드
  POLL.pauseReasons.add(reason);
  POLL.paused = true;
  updatePollStatus();
}
function pollResume(reason) {
  if (!POLL.pauseReasons.has(reason)) return;  // ★ 가드
  POLL.pauseReasons.delete(reason);
  if (POLL.pauseReasons.size === 0) POLL.paused = false;
  updatePollStatus();
}
```

### ② MutationObserver 자기 변경 무시 + debounce + 상태 비교

```js
let modalCheckTimer = null;
let lastHasModal = false;
const SELF_DOM_CLASSES = ['poll-status', 'poll-toast', 'auto-queue-toast', 'activity-expand-wrap'];
const isSelfMutation = (m) => {
  const targets = [m.target, ...Array.from(m.addedNodes || []), ...Array.from(m.removedNodes || [])];
  return targets.some(n => {
    if (!n || n.nodeType !== 1) return false;
    const cls = n.className || '';
    if (typeof cls !== 'string') return false;
    return SELF_DOM_CLASSES.some(c => cls.includes(c));
  });
};
const modalObserver = new MutationObserver((mutations) => {
  if (mutations.every(isSelfMutation)) return;        // ★ 자기 변경 즉시 무시
  if (modalCheckTimer) return;                        // ★ debounce
  modalCheckTimer = setTimeout(() => {
    modalCheckTimer = null;
    const hasModal = !!document.querySelector('.modal[style*="block"], [aria-modal="true"], .activity-expand-wrap');
    if (hasModal === lastHasModal) return;            // ★ 상태 변화 시에만
    lastHasModal = hasModal;
    if (hasModal) pollPause('모달/펼침');
    else pollResume('모달/펼침');
  }, 300);
});
modalObserver.observe(document.body, { childList: true, subtree: true });
```

## RLS hotfix 영구 박음

**파일**: `sql/bl-admin-auth-v2-rls-hotfix.sql` (신규)

원인 정리:
- bl-admin-auth-v2.sql 박은 직후 PostgreSQL `42P17 infinite recursion in policy for relation "admins"`
- admins RLS 정책이 is_admin() 호출 → is_admin()이 admins SELECT → RLS 다시 평가 → 무한 재귀

해결 원리:
1. `is_admin()` / `is_owner()` 함수에 `SECURITY DEFINER` 박음 → RLS bypass
2. admins 셀프 SELECT 정책은 `auth.uid() = id` 만 비교 (함수 호출 0회)
3. `handle_new_auth_user()` 트리거로 auth.users → admins 자동 동기화 + Owner 이메일 자동 owner 승격

이 SQL을 git에 박아둠으로써:
- 신규 환경에서 재현 가능
- Supabase 프로젝트 재생성 시 즉시 복구 가능
- 헌법 11조 부칙 (DB 변경 사항 SQL 영구 박기) 준수

## 검증

- JS 문법: `new Function(scriptBody)` 통과 (54180 chars)
- JSON: tasks.json `python3 -m json.tool` 통과
- (라이브 검증은 Vercel deploy 후 admin-status.html 직접 확인 필요)

## 변경 파일

- `_admin/admin-status.html` — MutationObserver 무한루프 fix 3중 안전망
- `sql/bl-admin-auth-v2-rls-hotfix.sql` — RLS 무한 재귀 hotfix 영구 박음 (신규)
- `tasks.json` — BL-ADMIN-STATUS-LOOP-FIX done 박음 + BL-ADMIN-AUTH-V2 progress에 RLS hotfix 정보 추가
- `_chat-logs/2026-05-05-admin-status-loop-fix.md` — 본 chat-log

## 다음 단계 (대표님 결정 필요 X — 자율 진행)

1. commit + push (커밋 메시지에 [변경사유] 태그)
2. Vercel 자동 deploy 대기 (~1분)
3. 라이브 검증: https://gohotelwinners.com/admin-status.html 접속
   - 예상 화면: 카테고리 카드 + 자율 작업 큐 + 활동 이력 + 다음 추천 모두 정상 렌더, 응답없음 경고 사라짐
   - 콘솔: `[admin-status] BL-PAGE-DEDUP + IP-CTRL-001 + BL-REAL-SYSTEM Phase α loaded` 로그 확인
4. ops 알림 발송 (`/api/email/ops/notify-claude-work`)

## 헌법 적합성

- ✅ 메모리 5번 (위치/구조 질문 금지) — 진단/fix 모두 자율 결정
- ✅ 메모리 17번 (분량 자체 끊기, str_replace만) — 1줄도 wholesale rewrite 없음
- ✅ 헌법 11조 부칙 — DB 변경 SQL 영구 박음
- ✅ admin.html 절대 미접근 — 정상 작동 페이지 보호
