# BL-FLOW-3-DASHBOARD-ROUTING-FIX — dashboard.html 폐기 + 결제 후 manager-dashboard 통합

**날짜**: 2026-05-23
**BL ID**: BL-FLOW-3-DASHBOARD-ROUTING-FIX
**상태**: ✅ done (5/5 steps)
**commit**: `a6f1396acc` ([링크](https://github.com/dgmasters01/tw-b2b/commit/a6f1396acc7c885026bfb73db5ec709df16c25b5))
**선행**: BL-FLOW-2-SALES-COPY-5TIER (commit `6ad12e4b5a`)
**다음**: BL-FLOW-3 완료 → BL-FLOW 시리즈 종결. tasks.json에서 다음 P0 작업 자동 안내.

---

## ① 완료 내용

**dashboard.html을 폐기하고 결제 완료 매니저는 무조건 manager-dashboard.html(진짜 본진)로 가게 통일.**

| # | 파일 | 변경 |
|---|---|---|
| 1 | `sales.html` | `paid/producing/published` 분기 + PayPal 성공 콜백 1.5초 redirect 모두 `marketing.html` → `manager-dashboard.html` |
| 2 | `vercel.json` | `/dashboard.html` + `/dashboard` 둘 다 `/manager-dashboard.html` 301 redirect 추가 |
| 3 | `scripts/pages-meta.mjs` | dashboard.html `status: needs-refactor → retired`, name·purpose·notes 폐기 명시 |

## ② 이유

- `manager-dashboard.html`이 **1964줄, 알림 종 / Videos / Payments / Analytics 탭 / KPI 카드 / Funnel 차트** 다 박힌 진짜 본진
- `dashboard.html`은 620줄 빈약본 — 진행 단계 + 호텔 정보 + 결제 박스(임시)만
- 매니저가 결제 후 두 화면 중 어디로 가야 하는지 혼선 → 한 곳으로 통일

## ③ 사업 영향

- **결제 완료 매니저 동선 단일화** — sales.html에서 결제 → 1.5초 후 manager-dashboard.html로 바로 진입
- **이미 결제한 매니저가 sales.html 다시 들어와도** manager-dashboard.html로 자동 이동
- **누구든 `/dashboard.html` URL 직접 입력해도** 영구 redirect로 manager-dashboard.html 도달
- 매니저 본진(`manager-dashboard.html`)에 한 번에 KPI · 영상 진행 · 결제 내역 · 예약 분석 다 보이므로 결제 후 만족도·재방문 상승 기대

## ④ 다음 행동

BL-FLOW 시리즈(1·2·3) 종결. tasks.json에서 다음 P0 BL 자동 안내 필요 시 "다음 시작해" 한 마디 주시면 됩니다.

남은 정리 작업 후보 (별건 BL):
- `dashboard.html` 파일 자체를 실제 삭제 (현재는 가역성 보존 위해 파일 유지)
- `marketing.html`의 향후 역할 정의 (현재 16KB 페이지 — 결제 후 별도 마케팅 안내용? 미정)

## ⑤ 대표님 결정 필요

**없음** — 자율 진행 완료. 라이브 확인 부탁드립니다:

### 어디 가서 / 무엇을 누르면 / 무엇이 보이는지

1. **https://gohotelwinners.com/dashboard.html** 주소창에 직접 입력 → **즉시 manager-dashboard.html로 자동 이동** (308 redirect)
2. **https://gohotelwinners.com/dashboard** (확장자 없음) → 동일하게 manager-dashboard.html로 자동 이동
3. **결제 완료 매니저**가 sales.html 들어오면 → 자동으로 manager-dashboard.html로 이동
4. **PayPal 결제 성공 시** → "✓ Payment successful! Redirecting…" 표시 → 1.5초 후 manager-dashboard.html 진입
5. **manager-dashboard.html** 도착 → KPI 카드 / Videos 탭 / Payments 탭 / Analytics 탭 / 알림 종 다 보임

---

## 변경 commit
- [`a6f1396acc`](https://github.com/dgmasters01/tw-b2b/commit/a6f1396acc7c885026bfb73db5ec709df16c25b5) — 3개 파일 한 commit

## 헌법 자가 검증 (11개 통과)

1. ✅ GitHub에만 (로컬 없음)
2. ✅ Vercel 자동 배포 (25초 만에 라이브 반영)
3. ✅ 핸드폰만으로도 가능
4. ✅ commit + chat-log + tasks.json로 영구 보존
5. ✅ 자동 검증 (node --check + vercel.json JSON 파싱 + pages-meta.mjs ES 모듈 import)
6. ✅ 다음 세션 Claude도 맥락 파악 (chat-log + BL ID 매핑)
7. ✅ 5초 안에 작업 상태 파악 (tasks.json done)
8. ✅ pages-meta.mjs 갱신으로 admin-gallery 자동 동기화
9. ✅ 되돌릴 수 있음 (commit revert 가능, dashboard.html 파일도 보존)
10. ✅ 헌법 자동 로딩 (boot.md + CHARTER + CLAUDE.md fetch 완료)
11. ✅ 메모리 사이클 내
