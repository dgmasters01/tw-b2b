---
slug: 2026-05-15-bl-gallery-flow-completeness
title: BL-GALLERY-FLOW-COMPLETENESS — 갤러리 흐름 순서 그룹화 + 빈 단계 placeholder
date: 2026-05-15
tasks: [BL-GALLERY-FLOW-COMPLETENESS]
commits: []
decisions: []
---

## 🎯 한 줄 요약

갤러리 페이지에서 매니저가 가입~6개월 보장 종료까지 거치는 BUSINESS_FLOW 7단계 순서대로 페이지들을 한눈에 볼 수 있도록 박았다. 빈 단계는 placeholder로 표시해 만들어야 할 페이지 위치까지 가시화.

## 📍 왜 발생했나

지금까지 갤러리는 완성도(live/partial/planned)별로만 그룹화됐다. 문제는 — 페이지가 매니저 여정 어느 단계에 속하는지, 단계 간 빠진 페이지가 어디 있는지는 보이지 않았다. sales.html과 marketing.html이 'planned'로 박혀있어도 전체 흐름 안에서 어느 위치에 들어갈지 시각화 안 됨.

핑퐁 기록 보니 본 BL은 BL-SERVICE-MAP의 후속 — 서비스 맵이 OS에 박힌 다음, 그 지도 안에 갤러리가 흐름 정보를 표시하는 게 본 BL의 본질이었다.

## 🛠 어떻게 해결했나

pages-meta.mjs의 PAGES 배열 각 항목에 flow, flowOrder, flowLabel 세 필드를 박았다. flow 값은 BUSINESS_FLOW.md의 stage0~6 + 흐름 외(extra/admin-tools/retired)로 매핑. Python 정규식으로 19개 페이지 일괄 박음(중복 검사 + 빈 줄 청소 + node 라이브 import 검증으로 안전성 확보).

admin-gallery.html의 render 함수를 renderByMode로 분기. flow 모드는 7단계 + 흐름 외 순서대로 sections 렌더링, status 모드는 기존 그룹화. localStorage에 모드 저장해 새로고침 시 유지. 토글 버튼 상단 툴바에 박음(파란색 active).

카드에 flowLabel 뱃지 추가(보라색 outline 스타일). planned 페이지는 이름 옆에 '⭐ 신설 예정' 노란 라벨로 즉시 식별. 빈 flow 단계는 점선 박스 placeholder로 표시 — '이 단계 페이지가 아직 없습니다' 메시지.

## ✅ 결과

- pages-meta.mjs 19개 페이지 모두 flow/flowOrder/flowLabel 박힘 (node 라이브 import 검증 PASS)
- stage0:1 / stage1:6 / stage2:1 / stage3:1 / stage4:1 / stage5:2 / extra:1 / admin-tools:5 / retired:1 분포
- admin-gallery.html에 flow/status 모드 토글 박힘 (localStorage 유지)
- flow 모드는 7단계 + 흐름 외 순서대로 sections 렌더링
- 빈 단계는 점선 placeholder 박스로 BACKLOG 가시화
- planned 페이지는 ⭐신설예정 노란 라벨로 즉시 식별
- 라이브 응답 검증 PASS: pages-meta.mjs에서 flow: 매칭 19건

## ⏱ 다음 결정 필요

본 BL 완료. 갤러리 흐름 그룹화가 OS에 박힘. 후속 결정 사항:

- 매니저 허브 시리즈 5개 페이지(admin-manager-hub.html 등)가 pages-meta.mjs에 미등록. 별도 BL로 등록 권장 (BL-PAGES-META-MANAGER-HUB-SYNC).
- stage6(6개월 종료) 단계에 페이지 0건. dashboard.html에 rebill CTA가 박혀있지만 별도 페이지로 분리할지 결정 필요.

---

# 🔧 기술 상세 (개발자용)

## 박은 파일 2개 + tasks.json

1. `scripts/pages-meta.mjs` (수정) — 19개 페이지에 flow/flowOrder/flowLabel 필드 일괄 박음
2. `_admin/admin-gallery.html` (수정) — renderByMode 함수 분기 + flow 모드 + 토글 + 뱃지 + placeholder
3. `tasks.json` — BL 100% done

## flow 필드 매핑 (BUSINESS_FLOW.md 7단계 기반)

```
stage0 — 비회원 진입         : index.html
stage1 — 가입~호텔 등록      : signup / login / forgot / reset / verify-email / hotel-info (6개)
stage2 — 관리자 검증         : admin.html
stage3 — 결제 유도           : sales.html (planned)
stage4 — 영상 제작·진행      : dashboard.html
stage5 — 6개월 노출·성과     : marketing.html (planned) / booking-analytics.html
stage6 — 6개월 종료 결정     : (없음 — dashboard 내 rebill CTA)
extra  — 매니저 부가         : settings.html
admin-tools — 관리자 도구    : admin-gallery / admin-business / admin-tasks / admin-service-ops / admin-status
retired — 폐기               : admin-hub.html
```

## 갤러리 토글 모드

```
localStorage key: gh_group_mode
값: 'flow' (기본) | 'status'

토글 버튼 click → localStorage 저장 → render(adminEmail, blByPage) 재호출
```

## flow 그룹 정렬 규칙

- 그룹 순서: stage0 → stage1 → stage2 → ... → stage6 → extra → admin-tools → retired
- 그룹 내부: flowOrder 오름차순 → name 알파벳순

## 빈 단계 placeholder

flow 그룹에 페이지 0건일 때:
```html
<div class="gh-grid-empty" style="...점선 박스...">
  📝 이 단계 페이지가 아직 없습니다 — 만들 페이지를 BACKLOG에 등록하면 여기 표시됩니다
</div>
```

stage6이 현재 빈 상태로 표시되어 만들어야 할 페이지가 명확히 보임.

## 라이브 검증

```
curl https://gohotelwinners.com/scripts/pages-meta.mjs | grep -c "flow:"
→ 19 (예상치 정확 일치)

curl -I https://gohotelwinners.com/_admin/admin-gallery.html
→ HTTP/2 307 (로그인 보호 정상)
```

## 헌법 점검

- 부칙 7 (단계 = commit): 4단계 모두 commit 박음
- 부칙 9 (가역성): 모든 변경 git revert 1번으로 복원 가능
- 부칙 12 (Self-QA): node 라이브 import 검증 + JS 문법 검증 + 라이브 응답 검증 3중
- 부칙 16 (자율): 데이터 구조·UI 토글·placeholder 디자인 100% 자율
- 부칙 17 (사업가 V2 컨텍스트): 본 BL은 인프라 BL로 컨텍스트 미박음
