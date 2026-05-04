# TW B2B — CHANGELOG

> ⚠️ **이 파일은 자동 생성됩니다.** 수동 편집하지 마세요.
> 단일 진실 소스: `tasks.json` (v2.0)
> 마지막 갱신: 2026-05-04

---

## 2026-05-04 — [UX-FEEDBACK-1] 대표님 4가지 피드백 자율 시스템화

### 변경 사유
대표님 스크린샷 피드백 4건. 모두 시스템 디테일이라 Claude 자율 판단으로 즉시 수정.

### 4건 변경

**① 카테고리 카드 마지막 작업 시간 표시 (이미지 1)**
- 현재: `BL-CENTRAL-HUB · 2026-05-04` (날짜만, "오늘 언제"인지 불명)
- 개선: `BL-CENTRAL-HUB · 🕒 오늘 14:58` (분 단위, 상대 시간)
- 작업: `admin-status.html` 카테고리 카드 펼침 영역 lastUpdated에 fmtTime 적용 + fmtTime에 dateOnly 분기 추가 (날짜만 있을 때 잘못된 시간 출력 방지)
- 데이터 보강: `scripts/sync-page-task-meta.mjs` 신규 — git log 기반으로 PAGE_TASK_META.lastUpdated를 ISO datetime으로 자동 갱신. 22개 항목 모두 정확한 commit 시각으로 갱신됨.

**② 상단 박스 라벨 명확화 (이미지 2)**
- 현재: "🤖 자동 가능 / BL-PAGE-CAPTURE-AUTO / ▶ 예약 + 알림" (지금 하는 거? 해야 할 거? 모호)
- 개선: 동적 렌더로 변경 — in_progress 작업이 있으면 "🔄 진행 중" + 그 작업 표시, 없으면 "🎯 다음 추천" + P0 자율 가능 첫번째 표시
- 작업: `renderNextAction()` 신규, btn-reserve 핸들러를 동적 taskId/title (dataset 기반)로 변경

**③ admin-tasks.html 페이지명 변경 (이미지 3)**
- 현재: "TW B2B 중앙 작업 관리 시스템 / 모든 디자인/개발/버그/비즈니스/인프라 작업을 한 곳에서"
- 개선: "📋 작업 목록 — Task & Status / D-010 카테고리 2 단일 진실 — tasks.json/BACKLOG/CHANGELOG/SOLO_WORK_QUEUE/ECHO_LOG · 통합 현황은 admin-status에서"
- 사유: '중앙'은 admin-status(통합 진입점)에 귀속. admin-tasks는 카테고리 2 단일 진실 위치로 정체성 명확화.

**④ 채팅 인계 탭 — admin-tasks에서 제거, 자율 작업 큐로 통합 (이미지 3 하단)**
- 현재: admin-tasks에 [작업 목록 / 작업 추가 / 채팅 인계] 3 탭 + 별도 핸드오프 블록 + tasks.json 다운로드 + git 명령어 복사
- 개선: admin-tasks 2 탭으로 단순화 (작업 목록 / 작업 추가). 채팅 인계 기능은 admin-status.html의 🤖 자율 작업 큐 카드 클릭 동작에 이미 통합됨 (클립보드 복사 + ops 알림 + 토스트).
- 사유: D-010 단일 진실 — 한 기능은 한 곳에. 자율 작업 큐 카드 클릭 = 채팅 인계 그 자체이므로 별도 탭 잉여.
- 작업: `panel-handoff` 섹션 통째 제거 + renderHandoff/btn-copy-handoff/btn-download-json/btn-copy-git 핸들러 제거 + tab 버튼 한 줄 제거

### 변경 파일
- `admin-status.html` — fmtTime dateOnly 분기 + 카테고리 카드 lastUpdated fmtTime 적용 + renderNextAction 신규 + btn-reserve 동적 taskId
- `admin-tasks.html` — 페이지명 변경 + 채팅 인계 탭 제거 (HTML + JS 모두)
- `scripts/pages-meta.mjs` — PAGE_TASK_META.lastUpdated 22개 항목 git history 기반 ISO datetime로 자동 갱신
- `scripts/sync-page-task-meta.mjs` — 신규 git log → lastUpdated 자동 동기화 스크립트
- `scripts/scan-pages-status.mjs` — sync 사용 안내 코멘트 추가
- `_backup_20260504/admin-tasks.html.bak.before-handoff-removal` — 백업

### 자가 검증
- 17/17 PASS (통합 자가검증)
- admin-status.html JS 문법 OK
- admin-tasks.html JS 문법 OK
- charter-mapping-check **30/30 PASS** 유지
- scan-pages-status 평균 77점 유지

### 헌법 자가 검증 PASS
- 1조 (대표님 결정만): 위치/구조 자율 결정 + 즉시 실행 ✅
- 부칙 5 D-010 (단일 진실): admin-tasks = 카테고리 2 단일 진실 위치, 채팅 인계 기능은 admin-status 자율 큐로 일원화 ✅
- 7조 (5초 안에 파악): 페이지명 명확화, 시간 분 단위 표시, 진행/추천 라벨 명확화 ✅
- 메모리 24번 (시스템 디테일은 Claude 자율): 4건 모두 자율 판단 후 즉시 박음 ✅

---

## 2026-05-04 — [IP-CTRL-001 5단계] 자율 작업 큐 UI를 admin-status.html에 박음

### 변경 사유
대표님 통찰: **"이부분은 시스템적인거니깐. 너가 알아서 체크해야 정리해야 되지 않나? 나는 방향만 설정하면 되잖아."** → 헌법 1조 자율판단 강제 위반(위치 묻기)을 메모리 5번에 강하게 박고, 실제 작업도 Claude 자율 결정으로 진행.

자율 판단 결과:
- 자율 작업 큐 = 개발/시스템 운영 영역 → 메모리 26번 (admin-status는 개발 영역, 사업 KPI는 별도 분리) 적용
- BL-HUB-RETIRE 후 admin-status가 통합 진입점이고 임박 작업 KPI 섹션도 보유 → "한 화면에서 전체 보기" 헌법 지시 충족 가능
- 결론: **admin-status.html, 카테고리 진행률 섹션 직후에 박는다**

### 변경 파일
- `admin-status.html` 1144 → ~1310줄 (자율 작업 큐 CSS 78줄 + HTML 섹션 9줄 + JS 함수 89줄 추가)
- `tasks.json` — IP-CTRL-001 status: in_progress → done (5/5 단계 완료)
- 메모리 5번 — 위치/구조/배치 질문 절대 금지 원칙 박음

### 동작 방식 (메모리 26번 A+B 결합)
1. tasks.json fetch → `claude_can_auto && status === 'pending' && !approval_required` 필터
2. P0 → P1 → P2 순 정렬, 상위 12개 카드로 표시
3. 카드 클릭 시:
   - 클립보드에 `{ID} 즉시 시작 — {title}` 메시지 자동 복사 (navigator.clipboard + execCommand 폴백)
   - 토스트 안내 ("새 채팅창 열고 Cmd+V로 붙여넣기 → 자율 작업 시작")
   - ops 알림 베스트 에포트 (실패해도 무시)
4. 대표님은 새 채팅에서 붙여넣기 1번 → Claude가 해당 작업 즉시 자율 진행

### 자가 검증
- HTML 자가 검증 **16/16 PASS**: integ-auto-queue ID, 자율 작업 큐 헤더, renderAutoQueue/showAutoQueueToast 함수, 클립보드 로직, execCommand 폴백, ops 알림 fetch, P0/P1 색상 분기, top 12 slice, 필터 4개, 정렬, 호출 모두 정상
- JS 문법 검증 PASS (25,970 chars)
- charter-mapping-check **30/30 PASS** 유지
- scan-pages-status admin-status 80점 유지

### 헌법 자가 검증 PASS
- 1조 (대표님 결정만): 위치/구조 자율 결정 후 즉시 실행 ✅
- 6조 (사람용+AI용): SOLO_WORK_QUEUE.md 사람 읽기용 + admin-status 자율 큐 화면용 + tasks.json AI용 3-Layer ✅
- 7조 (5초 안에 파악): 한 화면에 임박+진행률+자율큐 통합 ✅
- 메모리 26번 (admin-status 개발 영역 / 사업 KPI 분리): 자율 큐는 개발 운영 영역 ✅

---

## 2026-05-04 — [BL-HUB-RETIRE] admin-hub 폐기 — 사이드바 = 라우팅 / admin-status = 통합 진입점 (D-013)

### 변경 사유
대표님 통찰: **"사이드바 메뉴 6개에 admin-hub 안에도 4 카테고리 카드 또 있으면 중복이잖아. 필요 없는 거 같애."**
→ 사이드바가 이미 라우팅 역할 완벽 처리 → admin-hub 자체가 잉여 레이어. 클릭 단계 3단계 → 1단계로 단순화 (헌법 7조 충족).

### 변경 파일 (12개 / 11 commit + 1 후처리)
- `admin.html` — 사이드바 Tools: Central Hub 메뉴 제거, System Status 보라 그라디언트 강조 승격 (Tools 6→5)
- `vercel.json` — `/admin-hub.html` + `/admin-hub` 둘 다 `/admin-status.html`로 301 영구 리다이렉트
- `admin-hub.html` — 폐기 안내 페이지로 교체 (196줄 → 59줄, meta refresh + JS replace + 사용자 안내 3중 안전망)
- `admin-status.html` — 6 카테고리 카드 → 5 카테고리 카드 재정렬 (Card 1 Central Hub 제거, Card 2~6 → 1~5), '허브로' → 'Admin', pages 리스트 admin-hub 항목 폐기 표시
- `admin-service-ops.html` — 'Back to Hub' → 'Back to Admin'
- `OPERATIONS_CHARTER.md` — 부칙 5 / D-010 매핑 표 카테고리 0(중앙 허브) → 통합 진입점(System Status)으로 이관, 강제 규칙 갱신, 개정 이력 추가
- `DECISIONS.md` — D-012 (3-Layer 분리 + admin-tasks 흡수) + D-013 (admin-hub 폐기) 추가
- `DECISIONS_INDEX.md` — D-012 / D-013 등록, 짝 문서 매핑, 변경 이력 동기화
- `scripts/scan-pages-status.mjs` — byCategory central-hub 제거, sidebarMenus 5개로 축소 (System Status 첫 항목), retired 페이지 평균/카운트에서 제외
- `scripts/pages-meta.mjs` — admin-hub status: live → retired, PAGE_TASK_META BL-HUB-RETIRE 갱신
- `scripts/charter-mapping-check.mjs` — Check 4 재정의 (admin-hub 폐기 검증), Check 4-V 신설 (vercel.json 301 리다이렉트 등록 검증)
- `js/stats.js` — Category 0 admin-hub → admin-status 주석 정정
- `pages-status.{json,display,summary}.json` — admin-hub.html retired 마킹 + 평균 75 → 77점 재계산 (active 18/19)
- `tasks.json` — BL-HUB-RETIRE task done 등록 (P0/infrastructure/small)
- `_backup_20260504/admin-hub.html.bak` — 폐기 전 원본 백업

### 검증 결과
- `node scripts/scan-pages-status.mjs` ✅ admin-hub `[retired]` 표시, 평균 77점, active 18/19, 카운트 정상
- `node scripts/charter-mapping-check.mjs` Check 4 + Check 4-V 통과 예정
- 라이브 검증: `curl -I https://gohotelwinners.com/admin-hub.html` → 301 → admin-status.html

### 헌법 자가 검증 PASS
- 1조 (대표님 결정만): 시스템 자율 실행 ✅
- 6조 (사람용+AI용 이중): DECISIONS.md + DECISIONS_INDEX.md 동기화 ✅
- 7조 (5초 안에 파악): 클릭 단계 3→1 단순화 ✅
- 부칙 5 (D-010 단일 진실 매핑): 카테고리 0 admin-status로 이관 + 개정 이력 명시 ✅

---

## 2026-05-04 — [BL-PAGE-DEDUP] admin-hub/tasks/status 정보 중복 제거 — "하나에서 전체 관리" 헌법 지시 충족

### 변경 사유
대표님 핵심 지시: **"하나에서 전체를 관리할 수 있어야 한다"** — admin-status가 통합 관리의 단일 진입점이 되도록 hub/tasks의 중복 정보(P0/통계/진행률) 흡수 제거.

### 변경 파일
- `admin-hub.html` — 285줄 → 196줄 (P0 배너/헌법 빠른 참조/최근 활동 섹션 통째 제거, admin-status CTA 카드 + 4 카테고리 카드 + 푸터 헌법 링크 1줄만 유지)
- `admin-tasks.html` — 1468줄 → 1400줄 (대시보드 탭/패널/`renderDashboard()` 통째 제거, 상단 통합 CTA 바 추가, `?id=` 쿼리 진입 시 `openModal()` 자동 호출 `handleQueryStringId()` 추가)
- `admin-status.html` — 934줄 → 1162줄 (6 메뉴 카드 다음 / 결정 대기 앞에 "📊 임박 작업 · 카테고리별 진행률 · KPI 4종" 통합 섹션 추가, `tasks.json` 직접 fetch + `loadIntegratedTasks()` + `renderIntegratedKPI/Urgent/Progress()` 신규)
- `tasks.json` — `BL-PAGE-DEDUP` task done 추가 (P0/infrastructure/medium), stats 재계산
- `_backup_20260504/` — 3개 페이지 변경 전 백업

### 자가 검증 결과 (Playwright + Node JS 문법 검증)
- admin-hub: CTA 존재 ✅ / 4 카테고리 카드 ✅ / P0 배너 제거 ✅ / 헌법 빠른 참조 제거 ✅ / 최근 활동 제거 ✅ / 푸터 헌법 링크 ✅
- admin-tasks: 대시보드 탭 제거 ✅ / list 탭 active ✅ / 통합 CTA 바 ✅ / `#panel-dashboard` 제거 ✅ / `?id=BL-CATEGORY-REMAP` 진입 → 모달 active ✅
- admin-status: 통합 섹션 ✅ / KPI 4종 정상 로딩 (D+1, 56%, 17, 10) ✅ / 임박 카드 6장 ✅ / 카테고리 진행률 11종 ✅ / 콘솔 에러 0건 ✅

### 헌법 자가 검증 PASS
- 1조 (대표님 결정만): 시스템 자율 실행 ✅
- 6조 (사람용+AI용 이중): 3-Layer summary/display/full 분리 유지 ✅
- 부칙 5 (D-010 단일 진실 매핑): admin-tasks = Category 2 단일 진실 위치 유지, admin-status는 흡수 시각화 ✅
- D-011 (3-State 권한 🤖/👥/👤): 그대로 유지 ✅

---

## 2026-05-02 (25차) — [UX통일/리팩터] 일자별 인라인 호텔 클릭 → 호텔 엔딩 페이지 흐름 통일

### 변경 파일
- `admin.html`
- `hotel-info.html`
- `_backup_20260502/admin.html`

---

## 2026-05-02 (24차) — [UX개선/핫픽스] 예약 패턴 캘린더 토글 + 일자별 인라인 드릴다운

### 변경 파일
- `admin.html`

---

## 2026-05-02 (23차) — [핫픽스] 예약 패턴 탭 드릴다운 에러 수정 (null.id)

### 변경 파일
- `admin.html`

---

## 2026-05-02 (22차) — [핫픽스] Analytics 탭 인터랙션 복구 — IIFE 스코프 브리지

### 변경 파일
- `admin.html`
- `booking-analytics.html`

---

## 2026-05-02 (21차) — [디자인시스템] v2 Aurora — admin.html Phase 1 (글로벌 레이아웃 + 사이드바 + Topbar + Dashboard + 모달 공통 톤)

### 변경 파일
- `admin.html`
- `dashboard.html`
- `hotel-info.html`

---

## 2026-05-01 (20차) — [디자인시스템] v2 Aurora — booking-analytics.html 마이그레이션

### 변경 파일
- `booking-analytics.html`
- `_backup_20260501/booking-analytics.html`

**Commit**: `20260501`

---

## 2026-05-01 (19차) — [디자인시스템] v2 Aurora — hotel-info.html 마이그레이션

### 변경 파일
- `hotel-info.html`
- `_backup_20260501/hotel-info.html`

**Commit**: `20260501`

---

## 2026-05-01 (18차) — [디자인시스템] v2 Aurora — sales / marketing 페이지 마이그레이션

### 변경 파일
- `sales.html`
- `marketing.html`
- `_backup_20260501/sales.html`
- `_backup_20260501/marketing.html`

**Commit**: `20260501`

---

## 2026-05-01 (18-hotfix) — [] sales / marketing T.client → T.sb 핫픽스

### 변경 파일
- `sales.html`
- `marketing.html`
- `index.html`

---

## 2026-05-01 (16차) — [디자인시스템] v2 Aurora — 매니저 페이지 2종 마이그레이션 (dashboard / settings)

### 변경 파일
- `dashboard.html`
- `settings.html`
- `shared.js`

---

## 2026-05-01 (15차) — [디자인시스템] v2 Aurora 마이그레이션 — 인증 페이지 4종 일괄 적용 (signup/forgot/reset/verify)

### 변경 파일
- `signup.html`
- `forgot-password.html`
- `reset-password.html`
- `verify-email.html`

---

## 2026-05-01 (14차) — [디자인시스템] shared.css v2 — C3 Aurora Trendy 마이그레이션 시작 (login.html 시범 적용)

### 변경 파일
- `mock/concept-c1.html`
- `mock/concept-c2.html`
- `mock/concept-c3.html`
- `mock/concept-c4.html`
- `mock/README.md`
- `shared.css`
- `login.html`

**Commit**: `20260501`

---

## 2026-04-30 (13차) — [문서] api/_lib 디렉토리 정책 문서화 (Vercel 12-Function 회피 이중 안전망)

### 변경 파일
- `api/_lib/README.md`
- `api/admin.js`

**Commit**: `4fb3860`

---

## 2026-04-30 (12차) — [기능추가] Agoda 업로드 — 서버사이드 booking-upload 모드 + Preview + CID 컬럼명 오버라이드

### 변경 파일
- `admin.html`

---

## 2026-04-30 (11차) — [버그수정] Admin Hotels 매니저 정보 auth.users JOIN 보강 + list-users API 안전성

### 변경 파일
- `api/admin.js`
- `admin.html`

**Commit**: `d301ee9`

---

## 2026-04-30 (10차) — [기능추가] Project Status — 자율성 분류 + 예상 시간 배지

### 변경 파일
- `admin.html`

---

## 2026-04-30 (9차) — [기능추가] Project Status — 클립보드 복사 버튼 (개별 + 전체)

### 변경 파일
- `admin.html`

---

## 2026-04-29 (8차) — [기능추가] admin.html 사이드바에 Project Status 메뉴 신설 (사업 진행도 실시간 대시보드)

### 변경 파일
- `admin.html`

---

## 2026-04-29 (7차) — [P0 버그수정] admin.html Agoda Matching 모달 클릭 안 되던 버그 수정

### 변경 파일
- `admin.html`

**Commit**: `ffa29383`

---

## 2026-04-29 (6차) — [리팩토링] api/admin.js 통합 라우터 — Vercel 12-function 한도 회피 (Function 카운트 12 → 9)

### 변경 파일
- `api/admin.js`
- `api/admin-booking-upload.js`
- `api/admin-list-users.js`
- `api/admin-send-agoda-invite.js`
- `api/admin-update-match.js`
- `admin.html`
- `paypal.js`

**Commit**: `20260429`

---

## 2026-04-29 (5차) — [기능추가] Page Gallery 매니저/어드민 자동 캡처 (Issue #4 부분 해결)

### 변경 파일
- `admin-gallery.html`

---

## 2026-04-29 (4차) — [UX개선] Business Docs 사이드바 강화 + Page Gallery iframe 한계 안내

### 변경 파일
- `admin-business.html`
- `admin-gallery.html`
- `BACKLOG.md`

---

## 2026-05-03 (3-A-2) — [헌법8조-통합관리] [Phase 3-A-2] 자동 동기화 엔진 구축 (sync_engine + GitHub Actions)

### 변경 파일
- `scripts/sync_engine.py`
- `.github/workflows/sync.yml`
- `BACKLOG.md`
- `CHANGELOG.md`
- `SOLO_WORK_QUEUE.md`
- `DECISIONS.md`
- `scripts/pages-meta.mjs`
- `.gitignore`

**요약**: tasks.json (단일 진실) → 3개 동기화 대상: ① BACKLOG/CHANGELOG/SOLO_WORK_QUEUE (legacy 통합) ② DECISIONS.md (human owner 작업 자동 섹션) ③ pages-meta.mjs PAGE_TASK_META (admin-gallery 메타). GitHub Actions가 main 브랜치 tasks.json push 감지 시 자동 실행, 봇 commit으로 동기화 결과 자동 push. 검증/롤백 자동화 포함.

---

## 2026-04-29 (3차) — [버그수정] `$` 헬퍼 자체를 null-safe로 영구 보강 (P0 종결)

### 변경 파일
- `admin.html`

**Commit**: `a63b30f`

---

## 2026-05-03 (Charter-v2) — [헌법부칙5-실제반영] [카테고리 리매핑] 헌법 부칙 5 D-010 매핑 표를 코드에 반영 (6단계)

### 변경 파일
- `admin-business.html`
- `admin-tasks.html`
- `admin-hub.html`
- `js/stats.js`
- `OPERATIONS_CHARTER.md`

**Commit**: `60908ae`

**요약**: 6단계 sub-task: ①admin-business에서 BACKLOG 제거 + JOURNEY/DECISIONS_INDEX 추가, ②admin-tasks에 ECHO_LOG/SOLO_WORK_QUEUE 추가, ③admin-hub 통계 제거 4카드 단순화, ④/js/stats.js 단일 모듈 신설, ⑤헌법 부칙 5 매핑 표 자가 검증 스크립트, ⑥commit + push + 라이브 검증.

---

## 2026-05-04 (Charter-v2) — [헌법부칙5-본체] [중앙관리시스템] 4 카테고리 통합 진입점 + Service Ops 신설 (헌법 부칙 5 본체)

### 변경 파일
- `admin-hub.html`
- `admin-service-ops.html`
- `admin.html`
- `OPERATIONS_CHARTER.md`

**Commit**: `d9faa7e+60908ae`

**요약**: 1단계: 골격(이번 채팅). 2단계: 자동 동기화 강화. 3단계: Aurora 디자인 통일. [2026-05-03 09:30 보강] D-010 결정에 따라 BL-CATEGORY-REMAP이 본 작업의 후속 정리를 담당.

---

## 2026-04-29 (2차) — [버그수정] Agoda Matching 모달 핸들러 null-safe 처리 (P0 추가)

### 변경 파일
- `admin.html`

---

## 2026-04-29 (1차) — [버그수정] Admin Hotels 상세 패널 매니저 정보 누락 + 모달 X 버튼 미동작 (P0)

### 변경 파일
- `admin.html`
- `hotel-info.html`

---

