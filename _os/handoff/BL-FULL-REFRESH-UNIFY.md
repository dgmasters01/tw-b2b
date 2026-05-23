# BL-FULL-REFRESH-UNIFY — admin-status 전체 갱신 통일

**대표님 원칙**: "전체가 서로 연계되어서 모두가 갱신되어야 됨. 부분 갱신만 하는 건 의미 없음. 전체가 하나로 안 돌아가면 안 됨."

**왜 이 작업**: admin-status.html 5초 폴링이 13개 render 함수만 호출 → 15개 함수(카테고리별 진행률 카드·페이지 블록·활동 이력 등) 빠짐 → 작업 끝나도 화면 부분만 바뀌고 카테고리 카드는 안 바뀜.

---

## 🚨 새 채팅 클로드 — 작업 시작 전 의무 (헌법 부칙 16)

### 의무 1: 첫 응답 5줄 양식 강제
```
① [작업 소요: 약 X분 / N단계 / 변경 파일: ...]
② 🚦 ✅ 이 채팅 진행 가능 (또는 ⚠️ 새 채팅 권장)
③ 📚 fetch 완료: boot.md / [작업파일] / 라이브 상태
④ 🧭 북극성: 전체 갱신 통일 + 🎯 한 채팅 한 결정: 본질 결정 한 줄
⑤ 🔍 중복 점검 grep 결과 한 줄
```

### 의무 2: 라이브 fetch 3종 (요약본 의존 금지)
1. `OPERATIONS_CHARTER.md` (헌법 본문 전체)
2. `CLAUDE.md` (행동 매뉴얼)
3. `_os/playbook/claude-discipline.md` + `_os/playbook/claude-plain-lang-and-gallery.md` (부칙 18)

### 의무 3: 절대 금지
- ❌ "MCP 없어서 못 합니다" → bash + PAT으로 git clone 가능
- ❌ "어느 방식 원하세요? A/B/C" → 개발 자율 (부칙 16)
- ❌ commit subject에 BL ID 박을 때 [status:keep] 누락 시 봇이 in_progress 자동 박음

### 의무 4: 묻는 것 4가지만
- ✅ 사업 정책 / 서비스 방향 / 전체 틀 변화 / 디자인 큰 방향
- ❌ 기술·개발·순서 질문 금지

---

## 📋 작업 정의

### 목적
**작업 끝낼 때마다 admin-status 시스템 완성도 화면 전체가 5초 안에 자동 반영되게**

### 대표님 원칙 (헌법급)
> "전체가 서로 연계되어서 모두가 갱신되어야 됨"
> "비즈니스 독스 뿐만 아니고 모든 것들이 하나로 돌아가야 됨"
> "활동 이력도 갱신 안 되고 어렵게 만들어 놓으면 의미 없음"

→ 헌법에 박을 정책: **"전체 갱신 원칙"** (부칙 19 신설)

### 현재 상태 (라이브 fetch 결과)

**5초 폴링이 갱신하는 함수 (13건, 작동):**
- renderIntegratedKPI / Urgent / Progress / renderAutoQueue / renderNextAction
- renderInProgressBox / PausedBox / renderAvg / SidebarMenus / TopUrgent
- renderCeoWait / FlowGuide / renderStaffQueue

**갱신 안 되는 함수 (15건, 빠짐):**
- ❌ renderAll (메인 렌더 통합 함수)
- ❌ renderCard / renderCardDetail (카테고리 카드)
- ❌ renderCategoryTasksBlock / renderCategoryPagesBlock (카테고리 안 작업·페이지)
- ❌ renderFooter (푸터)
- ❌ renderActivity (활동 이력)
- ❌ renderPageMap (페이지 맵)
- ❌ renderInProgressProgress / renderInProgressCommits (진행 중 상세)
- ❌ renderBusinessCard / renderTechDetailsCollapsed / renderFrontmatterBox / renderMarkdown
- ❌ renderMenu (메뉴)

### 위치
- 파일: `_admin/admin-status.html`
- 폴링 호출부: line 8322~8340 (pollTick 안)
- 통합 렌더 함수: line 2978 `renderAll()`

---

## 🎯 작업 단계 (5단계)

### Step 1 — 헌법 부칙 19 신설 (전체 갱신 원칙)
`OPERATIONS_CHARTER.md`에 부칙 19 박음:
```
- **부칙 19 — 전체 갱신 원칙 (BL-FULL-REFRESH-UNIFY, 2026-05-23 신설):**
  화면·시스템·문서·봇·작업 추적은 **전체가 서로 연계**되어 하나로 돌아야 함.
  부분 갱신은 금지. tasks.json 변경 시 모든 render 함수 호출.
  activity-feed.json 변경 시 활동 이력 즉시 반영. 비즈니스 문서 변경 시 갤러리·페이지 카드 동시 반영.
  위반 사례(2026-05-23): admin-status 5초 폴링이 13개 함수만 호출 → 15개 빠짐 → 카테고리 카드 안 바뀜.
  디테일: _os/playbook/full-refresh-unify.md
```
디테일 매뉴얼도 박음.

### Step 2 — pollTick에 빠진 15개 render 함수 추가
line 8322~8340의 pollTick 안에 `renderAll()` 호출 + 카테고리 카드 호출 추가:
```javascript
// [BL-FULL-REFRESH-UNIFY 2026-05-23] 전체 갱신 원칙 — 빠진 15개 함수 호출
try { renderAll(); } catch (e) { console.warn('[poll] renderAll 실패', e); }
try { 
  // 카테고리별 카드 일괄 갱신
  ['hotel','booking','sales','marketing'].forEach(m => {
    try { renderCard(m); } catch(_) {}
    try { renderCategoryTasksBlock(m); } catch(_) {}
    try { renderCategoryPagesBlock(m); } catch(_) {}
  });
} catch (e) { console.warn('[poll] 카테고리 카드 갱신 실패', e); }
try { renderActivity(); } catch (e) { console.warn('[poll] renderActivity 실패', e); }
try { renderPageMap(); } catch (e) { console.warn('[poll] renderPageMap 실패', e); }
```

### Step 3 — activity-feed.json 폴링도 통일
line 8344 부근 activity-feed 폴링도 renderActivity 호출 확실히 박혔는지 점검.
activity-feed 변경되면 renderActivity 자동 호출되게 + 다른 영향받는 함수도 함께 호출.

### Step 4 — 라이브 검증 (Playwright)
1. admin-status.html 페이지 열기 (인증 필요)
2. tasks.json에 새 BL push
3. 5초 안에 화면 카테고리 카드 진행률 자동 갱신되는지 확인
4. activity-feed.json 변경 후 활동 이력 5초 안에 반영되는지 확인

### Step 5 — commit + push + chat-log + tasks.json done 마킹
commit subject: `feat(BL-FULL-REFRESH-UNIFY): admin-status 5초 폴링 전체 갱신 통일 [step:done:1][step:done:2][step:done:3][step:done:4][step:done:5]`
변경사유에 대표님 원칙 인용.

---

## 🔧 작업 후 즉시 진행할 BL-FLOW-1 (대표님 매출 흐름)

**전체 갱신 fix 끝나면 BL-FLOW-1 시작.**

### BL-FLOW-1-AGODA-AUTO-APPROVE (P0, small)
- hotel-info.html에서 Agoda 매칭 성공 시 status: pending → approved 자동 박음
- "확인 완료" 버튼 → sales.html 자동 이동
- 5단계 + commit + push

위 BL은 tasks.json에 이미 박혀있음 (pending, order=0). 전체 갱신 fix 끝나면 다음 추천에 자동 1순위로 뜸.

---

## ⚠️ 봇 충돌 주의

auto-detect-bot이 commit subject에 BL ID 박혀있으면 자동 in_progress 박음.
→ Claude가 BL 상태 정정할 때 commit subject에 **[status:keep]** 박기 필수.

예: `chore(tasks): BL-XXX 거짓 in_progress 정정 [status:keep]`

---

## 📦 라이브 상태 (2026-05-23 02:00 시점)

- 최근 commit: `fca17a7` (in_progress 거짓 복귀 [status:keep])
- BL-FLOW-1·2·3: pending, order 0·1·2 박힘 (다음 추천 1순위)
- BL-SIGNUP-ENRICHMENT, BL-AUTO-TASKS-SCHEMA-4MISSING: pending (봇이 더 안 건드림)
- in_progress: 0건

## 🎯 첫 응답 의무

새 채팅 클로드는 첫 응답에:
1. 헌법 3종 fetch
2. _admin/admin-status.html line 8322~8340 fetch
3. 의무 1 5줄 양식 박기
4. Step 1부터 자율 진행

대표님 결정 묻지 말 것 — **대표님 원칙(전체 갱신 통일)은 이미 박힘**. 개발 자율.
