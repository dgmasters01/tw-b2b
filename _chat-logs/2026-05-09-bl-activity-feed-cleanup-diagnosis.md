---
slug: 2026-05-09-bl-activity-feed-cleanup-diagnosis
title: BL-ACTIVITY-FEED-CLEANUP — 활동 이력 시스템 전수 진단 (실행은 다음 채팅)
date: 2026-05-09
commits: []
tasks: [BL-ACTIVITY-FEED-CLEANUP]
decisions: [D-023]
status: diagnosis_complete
related: [BL-AI-TAB-BOT-DETECT, BL-ACT-INDEX-RESTORE, BL-GALLERY-PAGES-META-FIX]
---

# BL-ACTIVITY-FEED-CLEANUP — 진단 인계서

## 🎯 무엇을

대표님이 admin-status.html ⑨ 활동 이력 펼침 패널에서 scan-bot commit(`901d313`) 클릭 시 사람용 탭에 "작업 번호 901d313이 인덱스에 등록되지 않았거나 매핑에 실패했습니다" 빈 메시지가 노출되는 문제를 발견. **부분 fix는 또 다른 부분 fix를 부르므로 정석은 전체 정리** — 활동 이력 시스템 5개 영역 전수 진단 완료.

## 📍 왜 (결함의 본질 + 시스템 정합성)

활동 이력 = **"대화창 끊겨도 추적 가능"이 존재 이유**. 새 채팅의 Claude가 인계서·DECISIONS·chat-log 없이도 활동 이력만 보고 "직전에 무엇이 결정·실행됐는가"를 즉시 파악해야 함. 봇 commit 클릭이 빈 메시지로 끝나면, 새 Claude는 "이거 봇이 한 건가? 사람이 한 건가? 왜 매핑 안 되지?"로 시간 낭비. 시그널·노이즈비 망가짐.

## 🛠 진단 결과 (전수 점검 — 5개 영역)

### 영역별 상태

| 영역 | 파일·라인 | 상태 |
|---|---|---|
| ① 데이터 분류 (CEO/Staff/Bot 판별) | `_os/scripts/build-activity-feed.mjs:53~88` | ✅ 정상 |
| ② 데이터 결과 | `activity-feed.display.json` byRole | ✅ 정상 (CEO 85 / Staff 0 / Bot 288) |
| ③ 인계서 자동 생성 | `_admin/admin-status.html:4297~4344` | ✅ 정상 (사람·봇 명확 분리) |
| ④ 활동 행 시각 구분 (cls) | `_admin/admin-status.html:2506` | ✅ 정상 (role별 'ceo'/'staff'/'bot' 클래스) |
| ⑤ 필터 ([전체]/CEO/Staff/Bot) | `_admin/admin-status.html:2498~2500` | ✅ 정상 (의도된 동작) |
| ⑥ AI용 탭 봇 분기 | `_admin/admin-status.html:4794~4826` | ✅ 정상 (BL-AI-TAB-BOT-DETECT) |
| ⑦ 코드 변경 탭 | `_admin/admin-status.html:4892~` | ✅ 정상 (commit이면 GitHub diff) |
| **⑧ 사람용 탭 봇 분기** | `_admin/admin-status.html:4488~4553` | ❌ **결함** |
| **⑨ 디폴트 탭 자동 선택** | `_admin/admin-status.html:4482~4485` | ❌ **결함** |

### ❌ 결함 1 — `loadHumanTab()` 봇 사전 분기 누락

**위치**: `_admin/admin-status.html:4488~4553`

**현 동작**:
```js
async function loadHumanTab(pane, item) {
  try {
    // index 캐시
    if (!ACTIVITY_CACHE.chatLogIndex) {
      const res = await fetch('/chat-logs/index.json?t=' + Date.now());
      if (res.ok) ACTIVITY_CACHE.chatLogIndex = await res.json();
    }
    const idx = ACTIVITY_CACHE.chatLogIndex;
    let slug = null;
    // commit hash로 매핑  ← ❌ 봇 commit도 여기로 들어옴
    if (item.target_type === 'commit' && item.target_id && idx && idx.byCommit) {
      const shortHash = String(item.target_id).slice(0, 7);
      ...
    }
    // task ID로 매핑  ← 봇 commit은 BL- 태그 없으므로 매칭 실패
    if (!slug && idx && idx.byTask) {
      const match = (item.action || '').match(/(BL-[A-Z0-9-]+|...)/);
      ...
    }
    if (!slug) {
      pane.innerHTML = `... 작업 번호 ${item.target_id}가 인덱스에 등록되지 않았거나...`;
      // ↑ 스크린샷 1번에서 본 빈 메시지
      return;
    }
```

**문제**: 봇 commit은 본질적으로 chat-log에 매핑되는 사람 작업 기록이 없음. "매핑 실패" 메시지가 정직하긴 하지만 **봇 활동에 대해서는 처음부터 사람 작업 기록을 찾는 시도 자체가 부적절**.

**정답 패턴이 코드에 이미 있음** — AI용 탭의 `detectBotCommit()`:
```js
// admin-status.html:4792~4798
const BOT_COMMIT_PATTERN = /^\[(scan-bot|sync-bot|auto-detect-bot|health-bot|activity-bot)\]/;
function detectBotCommit(item) {
  const action = String(item && item.action || '');
  const m = action.match(BOT_COMMIT_PATTERN);
  return m ? m[1] : null;
}
```
+ `BOT_INFO` 매핑 (`admin-status.html:4804~4810`).

### ❌ 결함 2 — 디폴트 탭이 항상 사람용

**위치**: `_admin/admin-status.html:4482~4485`

```js
// 첫 탭(사람용) 즉시 로드
const humanPane = wrap.querySelector('.activity-tab-pane[data-pane="human"]');
loadHumanTab(humanPane, item);
humanPane.dataset.loaded = '1';
```

**문제**: 봇 commit이어도 무조건 사람용 탭이 디폴트 활성. 봇 활동의 본질은 **"무엇이 바뀌었는가" (코드 변경)**이고 **"왜 결정했는가" (사람 컨텍스트)**가 아님. 디폴트 탭이 봇한테 의미 없는 정보를 강제로 노출.

## ✅ 정석 fix 설계 (다음 채팅에서 실행)

### Step 1 — `loadHumanTab()` 사전 분기 추가

함수 시작에 `detectBotCommit()` 호출. 봇이면 chat-log 매핑 건너뛰고 친화적 안내:

```js
async function loadHumanTab(pane, item) {
  // BL-ACTIVITY-FEED-CLEANUP: 봇 commit은 사람 작업 기록 없음
  const botName = detectBotCommit(item);
  if (botName) {
    pane.innerHTML = `
      <div class="activity-tab-empty" style="text-align:left;padding:14px 16px;">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px;">
          🤖 이 활동은 봇 자동 갱신 — 사람 작업 기록 없음
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;line-height:1.5;">
          <strong style="color:var(--aurora-2);">[${escapeHtml(botName)}]</strong>이 자동으로 박은 commit이라 chat-log(사람 작업 기록)가 없습니다.
        </div>
        <div style="font-size:10px;color:var(--text-muted);background:rgba(255,255,255,0.03);padding:8px 10px;border-radius:6px;line-height:1.5;">
          기술적 세부사항은 <strong>🔧 코드 변경 탭</strong>에서 commit diff로,<br>
          봇 자체 설명은 <strong>🤖 AI용 탭</strong>에서 확인하세요.
        </div>
      </div>
    `;
    return;
  }
  // 기존 chat-log 매핑 로직 그대로...
  try {
    if (!ACTIVITY_CACHE.chatLogIndex) { ... }
    ...
```

### Step 2 — `toggleActivityExpand()` 디폴트 탭 자동 선택

봇 commit이면 디폴트 탭을 'code'(코드 변경)로 전환:

```js
function toggleActivityExpand(row, items) {
  // ... 기존 펼침/wrap 생성 코드 ...

  // BL-ACTIVITY-FEED-CLEANUP: 봇 commit이면 디폴트 탭을 'code'로
  const botName = detectBotCommit(item);
  const defaultTab = botName ? 'code' : 'human';

  // 디폴트 탭 활성화 변경
  wrap.querySelectorAll('.activity-tab').forEach(b => b.classList.remove('active'));
  wrap.querySelectorAll('.activity-tab-pane').forEach(p => p.classList.remove('active'));
  wrap.querySelector(`.activity-tab[data-tab="${defaultTab}"]`).classList.add('active');
  wrap.querySelector(`.activity-tab-pane[data-pane="${defaultTab}"]`).classList.add('active');

  // 디폴트 탭 즉시 로드
  const defaultPane = wrap.querySelector(`.activity-tab-pane[data-pane="${defaultTab}"]`);
  if (defaultTab === 'code') loadCodeTab(defaultPane, item);
  else loadHumanTab(defaultPane, item);
  defaultPane.dataset.loaded = '1';
}
```

(주의: 기존 코드는 사람용 탭이 HTML에서 `active` 클래스가 박힌 상태로 시작. 봇이면 이걸 동적으로 'code' 탭으로 옮겨야 함.)

### Step 3 — 라이브 배포 + 검증

배포 후 라이브에서 직접 확인:
1. scan-bot commit(예: `901d313`) 클릭 → **코드 변경 탭이 디폴트** ✓
2. 사람용 탭 클릭 → "🤖 이 활동은 봇 자동 갱신 — 사람 작업 기록 없음" 안내 ✓
3. AI용 탭 클릭 → 기존 BL-AI-TAB-BOT-DETECT 동작 (회귀 0) ✓
4. CEO commit 클릭 → 사람용 탭이 디폴트, 기존 동작 그대로 (회귀 0) ✓

각 단계 후 commit 1개 + `[step:done:N]` 태그 박음 (헌법 부칙 7).

## ⏱ 예상 시간

약 0.5h. 코드 변경량 미미 (±30줄), 정석 패턴이 같은 파일에 이미 있음.

## 🚀 새 채팅 Claude에게 — 이어서 갈 시작점

새 채팅 시작 시 OPERATIONS_CHARTER.md → CLAUDE.md fetch (헌법) 후, 이 chat-log + DECISIONS.md D-023 + tasks.json BL-ACTIVITY-FEED-CLEANUP을 차례로 fetch. 그 외 추가 진단 불필요. 위 Step 1~3을 즉시 실행 가능.

**참조 라인 정확 위치** (이 문서 작성 시점 기준 main HEAD):
- `_admin/admin-status.html:4488~4553` (loadHumanTab — 결함 1)
- `_admin/admin-status.html:4482~4485` (toggleActivityExpand 디폴트 — 결함 2)
- `_admin/admin-status.html:4792~4798` (detectBotCommit — 정답 패턴, 재사용)
- `_admin/admin-status.html:4804~4810` (BOT_INFO — 재사용)

**중복 방지**: 이미 박힌 BL-AI-TAB-BOT-DETECT 영역은 건드리지 말 것. AI용 탭은 정상 작동 중.

## 🔗 연관

- 진단 commit: 이 chat-log를 박은 commit (다음 line에서 실행)
- D-023: 정석 fix 설계 결정 (DECISIONS.md)
- BL-AI-TAB-BOT-DETECT: 정답 패턴 출처
- BL-ACT-INDEX-RESTORE: 봇 vs CEO 분류 정상화 (선행)
- BL-GALLERY-PAGES-META-FIX: 직전 채팅 작업 (별개)

## 📝 누가

이지형 대표님 (정석 우선 + "전체 정리가 정석" 결정 + 응답 끊김 방지 위해 진단·실행 분리 결정) / Claude (5개 영역 전수 코드 진단 + 설계).
