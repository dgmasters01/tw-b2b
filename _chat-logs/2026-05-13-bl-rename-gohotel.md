---
slug: 2026-05-13-bl-rename-gohotel
title: BL-RENAME-GOHOTEL — journey 단어 폐기, gohotel 접두사 통일
date: 2026-05-13
tasks: [BL-RENAME-GOHOTEL]
commits: []
decisions: [D-031]
---

## 🎯 한 줄 요약

스리랑카 여행사 브랜드(CEYLON JOURNEY)와 혼동되던 'journey' 단어가 모두 사라지고, 호텔 사업 서비스명(gohotel) 접두사로 통일됐다.

## 📍 왜 발생했나

대표님이 어드민 화면을 보다가 "매니저 여정 / 사용자 여정"이 자꾸 우리 여행사 브랜드와 헷갈리신다고 지적하셨다. 시스템 안에서 두 사업이 같은 단어를 쓰면 운영 중 실수가 생길 수 있어서, 시스템 단어를 서비스명 안에 박는 게 정석이라고 판단했다.

## 🛠 어떻게 해결했나

가장 먼저 어느 단어가 충돌하지 않는지 검색해서 후보를 추렸다 — flow / stages / progress는 다른 곳에서 이미 쓰고 있었고, 결국 gohotel 접두사가 충돌 0건이었다. 그 다음 파일 3개를 새 이름으로 옮기고, 어드민 메뉴와 라우팅 표를 한꺼번에 새 이름으로 바꿨다. 마지막으로 기존 북마크나 외부 링크가 깨지지 않도록 기존 주소는 영구 전환(301)으로 새 주소를 가리키도록 설정했다.

## ✅ 결과

- 어드민 사이드바에서 "🏨 호텔 매니저 단계 / 🗺️ GoHotel 전체 흐름"이라는 명확한 이름으로 보임
- 옛 주소(/admin-manager-journey 등)로 들어와도 자동으로 새 주소로 이동 — 링크 안 깨짐
- CEYLON JOURNEY 브랜드와 시스템 단어가 영원히 분리됨

## ⏱ 다음 결정 필요

추가 결정 없음. 자동으로 다음 추천 BL이 1순위로 등장한다.

---

# 🔧 기술 상세 (개발자용)

## 파일 rename 3개 (git mv — 이력 유지)
- `JOURNEY.md` → `GOHOTEL_FLOW.md`
- `_admin/admin-manager-journey.html` → `_admin/admin-gohotel-manager-stages.html`
- `_admin/admin-user-journey.html` → `_admin/admin-gohotel-overview.html`

## vercel.json — 3개 영역
1. **redirects** — 4쌍 (신규 별칭 2 + 301 영구 redirect 2쌍 = 4)
   - `/admin-gohotel-manager-stages` / `.html` (rewrite)
   - `/admin-gohotel-overview` / `.html` (rewrite)
   - `/admin-manager-journey(.html)` → `/admin-gohotel-manager-stages.html` (**permanent: true**)
   - `/admin-user-journey(.html)` → `/admin-gohotel-overview.html` (**permanent: true**)
2. **rewrites** — `admin-page.js` page 파라미터 갱신
3. **headers** — Cache-Control source 새 파일명

## api/admin-page.js
- `PAGE_HTML`: gohotel-manager-stages / gohotel-overview 추가
- 구 이름 (manager-journey/user-journey)도 매핑 유지 — 호환성

## _os/admin-pages/menu-manifest.json
- id, label, path, source_file 일괄 갱신
- 새 label: "🏨 호텔 매니저 단계" / "🗺️ GoHotel 전체 흐름"

## 그 외 운영 문서
- `_os/manifest.json`, `_os/charter/manifest.json`: JOURNEY.md → GOHOTEL_FLOW.md
- `_os/handoff/current.md`: admin-XXX-journey 페이지 이름
- `_os/playbook/os-philosophy-detail.md`, `admin-lightmode-tokens.md`: 참조 텍스트
- `_admin/admin-business.html`: DOCS 매핑 (실제 fetch 코드)

## 보존 (역사 기록 — 의도적으로 변경 안 함)
- `DECISIONS.md`, `DECISIONS_INDEX.md`, `tasks.json`, `BACKLOG.md`, `CHANGELOG.md`
- `ECHO_LOG.md`, `_chat-logs/`, `PHASE_5_VERIFICATION_REPORT.md`
- `_decisions/pingpong/BL-003.json`
- `OPERATIONS_CHARTER.md` (CEYLON JOURNEY는 별도 브랜드 — 부칙 2)
- `vercel.json` 안 구 URL (301 redirect로 필요)

## 검증
- `vercel.json` JSON valid
- `_os/manifest.json` + `_os/charter/manifest.json` + `_os/admin-pages/menu-manifest.json` JSON valid
- `admin-page.js` Node syntax OK
- 운영 활성 코드 journey 참조 0건

## 영향
- 새 URL 작동: `/admin-gohotel-manager-stages.html`, `/admin-gohotel-overview.html`
- 구 URL: 301 영구 redirect로 자동 이동 (북마크 안 깨짐)
- 사이드바 메뉴 라벨 즉시 갱신
