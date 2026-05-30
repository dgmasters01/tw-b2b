# 인계 — 2026-05-30 BL-ADMIN-SIDEBAR-MISSING-ENTRIES 코드 완성, 기록·done 마무리

## 직전 채팅 결과 (코드 완성, 시스템 기록만 남음)

대표님이 ②③ UX/UI 판단을 클로드에 위임 → 정석 5기준으로 결정·구현 완료.

- **①청구서 메뉴**: admin.html 사이드바 Tools에 `/_admin/admin-invoices.html`(인보이스 관리, 미수금/입금확인) 링크 추가. (commit `071ebbf`)
- **③매니저 화면 진입로**: 호텔 행에 「매니저 허브」 버튼(`/admin-manager-hub.html?id={user_id}`, user_id 있는 호텔만) 추가 + 가입자 행 라벨 「상세 →」 → 「매니저 허브 →」 통일. (commit `e13be63`)
- **②사이드바 별도 「매니저 허브」 메뉴**: 가입자(Members)가 이미 허브 입구라 중복 회피 — 의도된 미생성.

## 핵심 결정 (D-### 신설 필요)

impersonate(매니저 시점)는 옛 `dashboard.html`에만 잔존하나 BL-FLOW-3 라우팅 개편으로 단절(라이브 실측: `/dashboard.html?impersonate=` → 308 → `/manager-dashboard.html`, 그 페이지에 impersonate 코드 0건). 복원하지 않고 작동하는 `admin-manager-hub.html`(상세)로 매니저 화면 진입을 단일화. 근거 = 정석 5기준(단일진실/롤백안전/유지보수) + 부칙 18ⓑ 중복 회피.

## 이번 채팅 남은 일 (이걸로 BL 종결)

1. `_chat-logs/2026-05-30-admin-sidebar-missing-entries.md` 박기(부칙 15) + `index.json` byTask 매핑
2. `DECISIONS.md` + `decisions-index.md`에 위 impersonate 미복원 결정 D-### 박기(부칙 20)
3. `tasks.json` BL-ADMIN-SIDEBAR-MISSING-ENTRIES done 처리 — commit msg에 BL id + (완료|done|✅) → auto-detect-bot 자동전환

> 위 마무리는 `_admin/admin.html`(6231줄 거대파일)을 건드리지 않음 — 문서/tasks.json만. 부칙 16.1ⓓ 안전.

## 환경
- repo `dgmasters01/tw-b2b`(main), raw fetch 무인증
- commit 창구: POST `gohotelwinners.com/api/ops/github-commit`, header `x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK`, body {path,content,message,branch?}
- jq 없음 → python3

## 마무리 후 다음 1순위
`BL-LOGIN-PERSIST-OPTIN` (P1, small) — 로그인 유지 체크박스 + sessionStorage 분기.
