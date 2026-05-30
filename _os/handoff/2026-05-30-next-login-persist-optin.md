# 인계 — 2026-05-30 다음 작업: BL-LOGIN-PERSIST-OPTIN

대표님=이지형/여행능력자들. 응답 한국어, "대표님" 호칭.

## 직전 채팅 결과 (BL-ADMIN-SIDEBAR-MISSING-ENTRIES 완전 종결 ✅)
- chat-log 박힘: `_chat-logs/2026-05-30-admin-sidebar-missing-entries.md` (commit 570b3a4), index.json byTask 봇 자동 매핑 확인 (count 79, chatlog_warning 없음)
- 결정 D-050 박힘: DECISIONS.md 최상단 박스(commit 61804a7) + DECISIONS_INDEX.md 3행(commit fa77230) — "impersonate(매니저 시점) 미복원, admin-manager-hub.html로 매니저 진입 단일화"
- tasks.json BL-ADMIN-SIDEBAR-MISSING-ENTRIES → status:done (auto-detect-bot 자동 전환 확인)

## 의무 첫 행동
①_os/INDEX.md + OPERATIONS_CHARTER.md + CLAUDE.md fetch → 헌법 자가검증 → ②작업 시작 전 admin-gallery + tasks.json에서 BL-LOGIN-PERSIST-OPTIN 라이브 확인

## 이번 작업: BL-LOGIN-PERSIST-OPTIN (P1, small)
요지(인계 헤더 기준): 로그인 유지 체크박스 + sessionStorage 분기. 정확한 progress.steps·범위는 tasks.json에서 라이브 fetch해 확인하고 시작할 것(인계서만 믿지 말 것 — 부칙16).

## 환경
- repo `dgmasters01/tw-b2b`(main), raw fetch 무인증
- commit 창구: POST `gohotelwinners.com/api/ops/github-commit`, header `x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK`, body {path,content,message,branch?}
- jq 없음 → python3 / web_fetch 불가시 bash curl

## 인계 원칙
GitHub commit + 대표님 붙여넣기 텍스트 박스 둘 다 제공 (새 Claude 도구환경 차이로 fetch 실패 가능 대비)
