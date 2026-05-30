# 인계 — 2026-05-30 다음 1순위: BL-AUTO-DECISIONS-SYNC-GENERAL (자동 선정)

대표님=이지형/여행능력자들. 응답 한국어, "대표님" 호칭.

## 다음 1순위는 어떻게 골랐나 (임의 추천 아님 — 헌법 부칙1)
admin-status `renderNextAction` 알고리즘 그대로 적용: status=pending && taskRole(t)==='auto' 중 priority 오름차순 → order 오름차순 첫 번째. 결과 = **BL-AUTO-DECISIONS-SYNC-GENERAL (P0)**. in_progress 0건, 이 BL이 유일한 P0 auto.

## 이번 작업: BL-AUTO-DECISIONS-SYNC-GENERAL (P0, small, auto)
- 점검봇(decisions_sync)이 빨간불로 자동 등록(2026-05-29): "결정 1건이 박혔는데 결정 기록(사람용/검색용 2벌)이 저장 안 됨 (D5 룰)".
- 해야 할 일: 누락된 결정을 찾아 **`_os/charter/decisions-index.md`(검색용 압축 인덱스) + `_business/decisions/`(사람용 풀버전)** 둘 다에 박기.
- 진단 hint(BL notes): 룰북 `_os/playbook/auto-task-registry.md` 참조. **해소되면 점검봇이 green으로 바꾸며 자동 done** (수동 done 불필요 — commit만 박으면 다음 점검에서 green).
- 첫 행동: `_os/playbook/auto-task-registry.md` + `_os/charter/decisions-index.md` + `_business/decisions/` 라이브 fetch해서 어느 결정이 2벌 저장 누락인지 grep으로 특정.

## 주의 — 직전 채팅에서 D-050·D-051 신규 발생
- 직전 채팅에서 결정 2건을 `DECISIONS.md` + `DECISIONS_INDEX.md`(루트, D-### 체계)에 박음:
  - D-050: impersonate 미복원 — admin-manager-hub.html 매니저 진입 단일화 (commit 61804a7, fa77230)
  - D-051: 로그인 유지 옵트인 — 자동로그인 기본 미영구 전환 (commit 9b90a35, 0246bc5)
- 단, `_os/charter/decisions-index.md`(D1~D15 별도 감사 번호체계) + `_business/decisions/`에는 안 박음(그 체계와 D-### 체계가 다름).
- → 이 BL 해소 시: 빨간불의 원인 결정이 D-050/D-051인지, 아니면 2026-05-29 이전 결정인지 먼저 특정할 것. 빨간불은 2026-05-29 등록이라 D-050/D-051 이전 건일 가능성 높음. auto-task-registry.md 규칙 확인 후 정석대로 2벌 저장.

## 직전 2개 BL 종결 완료 (참고)
- BL-ADMIN-SIDEBAR-MISSING-ENTRIES: done (chat-log 570b3a4, D-050)
- BL-LOGIN-PERSIST-OPTIN: done 100% (코드 3f31e1a/17cfa80/06592db, chat-log 570a33a, D-051) — 라이브 검증 완료

## 의무 첫 행동
①_os/INDEX.md + OPERATIONS_CHARTER.md + CLAUDE.md fetch → 헌법 자가검증 → ②위 진단 hint 파일들 라이브 fetch

## 환경
- repo `dgmasters01/tw-b2b`(main), raw fetch 무인증 (bash curl 권장 — web_fetch는 사전검색 URL만 허용)
- commit 창구: POST `gohotelwinners.com/api/ops/github-commit`, header `x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK`, body {path,content,message,branch?}
- jq 없음 → python3. GitHub API(api.github.com)는 비인증 한도 낮음 — raw CDN 우선. raw 캐시 지연 시 commit 응답의 sha로 반영 확정 판단.

## 인계 원칙
GitHub commit + 대표님 붙여넣기 텍스트 박스 둘 다 제공.
