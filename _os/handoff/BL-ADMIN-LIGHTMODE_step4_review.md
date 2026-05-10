# BL-ADMIN-LIGHTMODE step 4 검토 결과 — FAIL

**검토일**: 2026-05-10 01:30 KST
**검토자**: Claude (3번 정석 — 새 채팅에서 fix 진행 결정)
**기준 commit**: `848963f` (라이브)
**검토 방법**: 로컬 정적 서버 + Playwright 다크/라이트 4종 풀페이지 캡처 + 픽셀 비교

---

## 🚦 판정: ❌ FAIL

step 5 (검토 통과 토큰만 commit) 진행 불가. **결함 3개 fix 후 재검토 필요**.

---

## 🔴 결함 1: admin-status.html 라이트 모드 자체가 작동 안 함 (치명)

### 증거
- `admin-status.html` `<head>`에 **`<link rel="stylesheet" href="/shared.css">` 누락**.
- 다른 admin 페이지 5개(tasks/business/service-ops/gallery/...)는 모두 link 박혀있음.
- 로컬 서버 요청 로그에 admin-status는 shared.css fetch 없음. admin-tasks는 있음.

### 결과
- `:root` 안 alias (`--panel: var(--bg-2)` 등)가 가리킬 shared.css 토큰이 없어 빈 값 fallback.
- `data-theme="light"` 박아도 다크 본문 하드코딩 색이 그대로 떠서 다크와 100% 동일.

### Fix
```html
<head>
  ...
  <link rel="stylesheet" href="/shared.css">  <!-- ← 14번째 줄 직전 추가 -->
  <style>
    :root {
      --panel: var(--bg-2);
      ...
```

---

## 🟡 결함 2: admin-tasks.html 라이트 모드 — 다크 잔재 색 30+곳

### 증거 (admin-tasks__light__top.png 기준)
- 흰 배경에 흰/연한 글자 라벨 → 거의 안 보임:
  - "CATEGORY 2 · TASK & STATUS"
  - "tasks.json", "BACKLOG.md", "CHANGELOG.md", "SOLO_WORK_QUEUE.md", "ECHO_LOG.md" 캡슐
  - "(미분류)" 카드 노란 글자
- 좌측 빨간 테두리(P0/P1 카드) → 라이트에서 너무 강함, 채도 낮춰야 함
- 시간 표시 캡슐 "오늘 10:17" → 다크 배경 그대로, 흰 배경에 둥둥 떠 있음

### Fix 방향
admin-tasks.html `<style>` 본문 grep:
```bash
grep -n "color:[[:space:]]*#[a-fA-F0-9]" _admin/admin-tasks.html
grep -n "background:[[:space:]]*rgba\|background:[[:space:]]*#" _admin/admin-tasks.html
```
하드코딩 색 → shared.css 토큰(`var(--ink)`, `var(--ink-3)`, `var(--bg-2)`, `var(--glass-2)` 등)으로 1:1 변환.

---

## 🟡 결함 3: 진행률 바 채도 깨짐 (라이트)

### 증거
- 다크: 보라→마젠타 그라디언트 또렷
- 라이트: 채도 잃음 → 시각 위계 무너짐

### 원인 추정
admin-tasks.html에 `linear-gradient(90deg, #a855f7 0%, #ec4899 100%)` 같은 하드코딩 헥스 사용 중 (admin-status.html 258번째 줄 패턴). shared.css `--aurora-1/2/3` 또는 새 토큰 `--progress-grad`로 교체 필요.

---

## 🟢 통과 항목

- 시그니처 그라디언트(타이틀, 핑크 배지) — 양쪽 다 정상. step3 D-022 단일 진실원 결정 통과.
- admin-tasks 배경 전환 자체 — `--bg`, `--bg-2`는 정확히 라이트로 반전됨.

---

## 📂 캡처 산출물 (로컬 — 채팅 세션 끝나면 삭제됨)

```
/home/claude/shots2/admin-status__dark.png      518K  ← 정상 다크
/home/claude/shots2/admin-status__light.png     589K  ← 다크와 동일 (결함 1)
/home/claude/shots2/admin-tasks__dark.png       (10963px) 정상 다크
/home/claude/shots2/admin-tasks__light.png      (10963px) 라이트 부분 작동, 결함 2·3
```

새 채팅에서 fix 진행 시 동일 스크립트(`/home/claude/shoot_local.py`)로 재캡처 후 BEFORE/AFTER 비교 의무.

---

## 다음 단계 (새 채팅 인계)

1. **결함 1**: admin-status.html `<head>`에 shared.css link 1줄 추가 (5분, 1 commit `[step:done:5a]`)
2. **결함 2**: admin-tasks.html 본문 다크 잔재 색 → shared.css 토큰 변환 (20~30분, 1 commit `[step:done:5b]`)
3. **결함 3**: 진행률 바 그라디언트 → shared.css 토큰 (5분, 결함 2와 합쳐 commit 가능)
4. **재검토**: 4종 재캡처 → 통과 시 step 5 done
5. **step 6**: 사이드바 하단 토글 박음 + localStorage 동작 검증

진행률: 50% (3/6) → step 4 done 처리 후 67% (4/6)로 갱신.
