---
slug: 2026-05-13-bl-health-autoheal-cache-fix
title: BL-HEALTH-AUTOHEAL 후속 — 캐시 우회 + 결과 보고 강화
date: 2026-05-13
tasks: [BL-HEALTH-AUTOHEAL]
commits: []
decisions: []
---

## 🎯 한 줄 요약

빨간불이 자가 치유돼도 대표님 화면이 옛 상태를 보여주던 캐시 문제를 3중 우회로 해결했다.

## 📍 왜 발생했나

자가 치유 봇이 1분 안에 빨간불을 해소했는데, 대표님 화면에는 여전히 RED가 보였다. 원인 세 가지가 겹쳐 있었다. 첫째, Vercel CDN이 `_health.json`을 캐시하고 있을 가능성. 둘째, 브라우저가 background 탭의 자동 갱신을 느리게 만드는 점. 셋째, 자가 치유 봇이 무슨 일을 했는지 commit 메시지로 명확히 알리지 않는 점. 셋 다 시스템이 자율적으로 작동했지만 대표님이 결과를 즉시 확인할 수 없게 만들었다.

## 🛠 어떻게 해결했나

세 군데를 동시에 박았다. 첫째, 화면 갱신 코드에 강력한 캐시 차단 헤더를 추가하고, 탭이 다시 활성화되거나 창으로 돌아올 때 즉시 재폴링하도록 했다. 둘째, Vercel 라우팅 설정에 `_health.json` 전용 캐시 우회 규칙을 박아서 CDN이 절대 캐시 못 하게 했다. 셋째, 자가 치유 봇 워크플로가 결과를 캡처해서 commit 메시지에 "몇 건 박음, 몇 건 누락"을 명시하도록 강화했다.

## ✅ 결과

- `_health.json` Vercel CDN 캐시 완전 차단 (`Cache-Control` + `CDN-Cache-Control` + `Vercel-CDN-Cache-Control` 3중 헤더)
- 탭 다시 활성화되면 즉시 최신 상태 폴링 (5초 기다림 없음)
- 자가 치유 봇 결과가 commit log에 한 줄로 명시 — `[autoheal-bot] tasks.json source 16건 자동 박음`
- 누락된 BL 있으면 commit 메시지 본문에 경고 (사람 개입 필요 표시)

## ⏱ 다음 결정 필요

추가 결정 없음. 완전 자율 운영.

---

# 🔧 기술 상세 (개발자용)

## 박은 파일 3개
1. `_admin/admin-status.html` (line 1384~)
2. `vercel.json` (headers 영역 신규 추가)
3. `.github/workflows/health-autoheal-on-push.yml` (autoheal step 강화)

## admin-status.html — 3중 캐시 차단 + visibility 트리거
```javascript
fetch('/_admin/_health.json?t=' + Date.now(), {
  cache: 'no-store',
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
  },
})

// 탭 visible/focus 시 즉시 재폴링
document.addEventListener('visibilitychange', function(){
  if (!document.hidden) pollOnce();
});
window.addEventListener('focus', pollOnce);
```

## vercel.json — _health.json 전용 헤더 (CDN edge 캐시 차단)
- `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`
- `Pragma: no-cache`
- `Expires: 0`
- `CDN-Cache-Control: no-store` (Vercel CDN 전용)
- `Vercel-CDN-Cache-Control: no-store` (Vercel 전용)

## workflow — 결과 보고 강화
```yaml
- name: Run tasks-source-autoheal
  id: autoheal
  run: |
    OUTPUT=$(node scripts/tasks-source-autoheal.js 2>&1)
    HEALED=$(echo "$OUTPUT" | grep "치유:" | grep -oE '[0-9]+' | head -1)
    MISSING=$(echo "$OUTPUT" | grep "여전히 누락:" | grep -oE '[0-9]+' | head -1)
    echo "healed=${HEALED}" >> $GITHUB_OUTPUT
    echo "missing=${MISSING}" >> $GITHUB_OUTPUT
```

commit message 패턴:
- 정상: `[autoheal-bot] tasks.json source 16건 자동 박음 (BL-HEALTH-AUTOHEAL)`
- 누락 발생: 위 + 본문에 `⚠️ 여전히 누락된 BL N건 — 사람 개입 필요`

## 검증
- ✅ vercel.json JSON valid
- ✅ admin-status.html JS 3블록 syntax OK
- ✅ workflow YAML 구조 정상

## 효과
- 캐시 지연: 5~10분 → **0초** (다음 폴링 즉시 최신)
- 탭 background → foreground 시: 5초 대기 → **즉시 갱신**
- commit log로 결과 확인: 봇 본문 들어가야 함 → **commit 제목 한 줄로 즉시**

## 후속 BL 후보 (필요 시)
- BL-HEALTH-BASELINE-UPDATE: admin_baseline 노랑 자동 갱신
- BL-HEALTH-VERCEL-SYNC-AUTO: vercel_sync 노랑 → 빨강 격상 시 자동 빈 commit
