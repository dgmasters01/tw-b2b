# 2026-05-09 BL-VERCEL-DEPLOY-RACE-GUARD 운영 진입 + 헌법 메시지 정정

**작업 단위**: BL-VERCEL-DEPLOY-RACE-GUARD (Vercel 빌드 큐 누락 감지·자동 복구 가드), BL-HEALTH-MSG-PLAIN (별건 — _health.json 메시지 사람말로)
**단계**: 직전 채팅 단계 1.5+2+3 인계 받음 → 진짜 원인 3가지 해결 → 라이브 노출 정상화 → 메시지 헌법 위반 정정
**commits**: 533e542 / 1d860d3 / c09d4a5 / 2ba0473 / bd7f82a / d582300
**HEAD before**: 70524c5 (직전 채팅 마지막)
**HEAD after**: d582300 (이 채팅 마지막)
**라이브 URL**: https://gohotelwinners.com/admin-status.html, https://gohotelwinners.com/_admin/_health.json

---

## [블록 1] 인계 진단 + 디버그 step으로 진짜 원인 추적

직전 채팅 인계 받음:
- BL-VERCEL-DEPLOY-RACE-GUARD pending, P0, claude_can_auto=true
- 라이브 _health.json: vercel_sync=yellow (Vercel API 403 Forbidden)
- 추정 원인: yml의 vars.VERCEL_TEAM_ID가 환경변수로 주입 안 됨
- 직전 세션 주장: Vercel MCP로 team_3jWCv2XBc0vzUB8PYsPTGtLB scope에서 tw-b2b 정상 조회됨

세션 환경: GitHub MCP 미노출, Chrome javascript_tool 권한 거부됨 → 컨테이너에서 직접 GitHub Contents API + Vercel API 호출 우회 (PAT 인증).

**진단 첫 단계**: yml에 임시 디버그 step 1개 추가 (commit caa3aed). VERCEL_TOKEN 길이/앞5자 echo + 4가지 직접 API 호출 (with teamId / no teamId / /v2/user / /v2/teams).

**디버그 결과**:
- 환경변수 주입 정상 (TOKEN 길이 82, TEAM_ID `team_3jWCv2XBc0vzUB8PYsPTGtLB` 정확)
- 모든 API 호출 → `403 Forbidden, {"invalidToken":true}`
- 즉 yml/주입 문제 아님. 토큰 자체가 죽었거나 team scope 가정 자체가 틀림

---

## [블록 2] 진짜 원인 3가지 — 직전 인계의 잘못된 전제 발견

**원인 ①** — 잘못된 team scope 가정:
대표님 화면(vercel.com/account/tokens)에서 직접 확인 결과 **「여행능력자들」이라는 Vercel 팀이 존재하지 않음**. 대표님은 처음부터 끝까지 개인 계정 `dgmasters01-9797` (Hobby 플랜)으로만 운영. 직전 세션 인계서에 박힌 `team_3jWCv2XBc0vzUB8PYsPTGtLB`는 **Vercel이 Hobby 계정에도 내부적으로 자동 부여하는 가상 ID**였음(API의 user.defaultTeamId로 확인). 실제 팀 아님.

**원인 ②** — VERCEL_TOKEN 만료:
team scope 분기 제거 후에도 여전히 `403 invalidToken`. GitHub Secrets의 토큰 자체가 죽음.

**원인 ③** — vercel.json redirect 룰 광범위:
검증 단계에서 발견. admin-status.html이 `/_admin/_health.json` fetch → `/_admin/:path*` redirect 룰이 잡아 `/_health.json`으로 보냄 → 루트에 파일 없음 → 404. 라이브 검진표 노출 자체가 막혀있었음.

**대표님 운영 원칙 확정**: 모든 Vercel 프로젝트를 개인 계정 안에서 각각 독립 운영. 팀 사용 안함, 프로젝트끼리 토큰/환경변수 섞지 않음. teamId 사용 절대 금지.

---

## [블록 3] 정석 해결 — team scope 완전 제거 + 토큰 재발급 + 지도 정정

**파일 정정**:
1. `_os/scripts/health_check_admin.mjs` (commit 533e542): checkVercelSync/Quota에서 VERCEL_TEAM_ID 분기 + teamId 파라미터 완전 제거. quota limit 3000→100 (Hobby 플랜 실제 한도)
2. `.github/workflows/health-check-admin.yml` (commit 1d860d3): 디버그 step 제거 + env에서 VERCEL_TEAM_ID 주입 제거
3. GitHub Variables `VERCEL_TEAM_ID` API DELETE
4. `vercel.json` (commit 2ba0473): redirect source `/_admin/:path*` → `/_admin/:path(.+\\.html)`로 좁힘. html 파일만 redirect, 데이터 파일(_health.json 등)은 filesystem 직접 노출

**토큰 재발급**:
대표님이 vercel.com/account/tokens에서 신규 발급 (tw-b2b-health-bot, Full Account scope, No Expiration). 신규 토큰 `vcp_2hBB...`. 검증: GET /v2/user → 200, GET /v6/deployments → 200. PyNaCl sealed_box로 암호화 후 GitHub Secrets `VERCEL_TOKEN` PUT.

**Vercel API 평가 순서 발견** (web_search 검증): redirects > filesystem > rewrites. 처음 시도한 rewrites 예외(0cfcdb5)는 redirects보다 후순위라 효과 없었음. redirect source 자체를 좁히는 것이 정석.

---

## [블록 4] 라이브 검증 + 헌법 15번 위반 발견·정정 (별건 BL-HEALTH-MSG-PLAIN)

**라이브 검증**:
- GET https://gohotelwinners.com/_admin/_health.json → HTTP 200 ✅
- GET https://gohotelwinners.com/_admin/admin-status.html → HTTP 307 (옛 호환 redirect 그대로 유지) ✅
- _health.json 내용: vercel_sync=🟢 (84e5b0b 동기화), vercel_quota=🟢 (24h 20건/100), tasks_schema=🟢, bots=🟢, admin_baseline=🟡 (별건)
- admin-status.html 상단 배너: 빨간 "건강 검진 데이터 없음" → 노란 정상 표시로 변경

**별건 결함 — BL-HEALTH-MSG-PLAIN**:
대표님 지적 "이부분을 너만 알아 볼수있는 언어로 표기하면 나는 알수가 없잖아"
- 라이브 배너 텍스트: `[yellow] vercel_sync: Vercel 미동기화 — git=bd7f82a vs vercel=2e318f9 (자동 복구 필요)`
- 헌법 15번 위반: "대표님께 선택 요청 시 절대 전문용어 금지. 초등학생도 알아듣게 비유·일상언어로 설명" — 대표님 노출 메시지에도 동일 적용 필수

**정정 (commit d582300)**:
health_check_admin.mjs의 result.detail 메시지 20개 전부 일상 한국어로 재작성:
- `Vercel 미동기화 — git=X vs vercel=Y` → `라이브 사이트가 GitHub 새 버전(X)을 아직 못 따라잡았어요 (현재 라이브: Y). 5~10분 후 자동 정상화 예정`
- `VERCEL_TOKEN env 없음` → `Vercel 출입카드(토큰)가 없어서 라이브 동기화 점검을 못해요`
- `24h 배포 N건 / limit (P%)` → `최근 24시간 동안 N번 배포 (한도 limit번 중 P% 사용, 여유 있음)`
- 모든 봇 정상 → 자동 일꾼들(봇) 전부 살아있어요

봇 수동 트리거 후 라이브 검증: 배너가 사람말로 정상 표시됨.

---

## [블록 5] tasks.json done 처리 + ops 알림 + 운영 원칙 헌법화

**tasks.json**:
- BL-VERCEL-DEPLOY-RACE-GUARD: status=done, completed_at=2026-05-09T06:14:02+00:00 (commit c09d4a5)
- history 추가: 단계 5/5 완료 + 별건 vercel.json redirect 블로커 해결 기록 (commit bd7f82a)
- files_changed: health_check_admin.mjs / health-check-admin.yml / _admin/_health.json / vercel.json
- 최종 commit: d582300 (BL-HEALTH-MSG-PLAIN)

**ops 알림 2회 발송**:
- 1차 (c09d4a5): BL-VERCEL-DEPLOY-RACE-GUARD 운영 진입
- 2차 (bd7f82a): vercel.json redirect 블로커 해결 + 라이브 200 OK 확인
- email_id: 67101a1c..., 2db6ec8e... (ccf_detected_task_id 자동 매칭됨)

**메모리 한도 도달**:
새 운영 원칙(Vercel 개인 계정 독립 운영) 메모리 박으려 했으나 30개 슬롯 꽉 참. 다음 채팅 시작 시 옛 메모리 정리 후 박기. 이번 세션은 chat-log + tasks.json history에 기록으로 보존.

**헌법 15번 강화 제안**: admin-status 화면 노출 메시지(_health.json detail 등)는 사람 말로만 작성. 영문 변수명·해시값·기술용어 금지. 다음 채팅에서 헌법 부칙에 정식 추가 권장.
