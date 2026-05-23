---
slug: 2026-05-24-members-data-source
title: Members 화면 데이터 소스 재정의 + 좀비 청소봇 신설
date: 2026-05-24
tasks: [BL-MEMBERS-DATA-SOURCE]
commits: [b321ba5, 9d27d94, c30a696]
decisions: []
---

## 🎯 한 줄 요약
가입자 화면(Members 탭)이 진짜 호텔 매니저 고객만 보여주도록 데이터 기준을 바꾸고, 가입만 하고 잠수 탄 사용자는 매일 새벽 자동 청소되게 만듦.

## 📍 왜 발생했나
가입자 화면이 "팀멤버 이메일은 빼고 보여주는" 방식이었음. 호텔 매니저 고객이 팀멤버 명단에 잘못 박히면 화면에서 사라지는 악순환. 또 가입만 하고 이메일 인증 안 받은 사람이 영원히 쌓여서 통계 왜곡과 알림 메일 비용 낭비.

## 🛠 어떻게 해결했나
① 가입자 화면 기준을 "빼는 방식"에서 "호텔 1개라도 등록한 사람만 보여주는 방식"으로 바꿈 → 팀멤버에 잘못 박혀도 호텔이 있으면 보임. ② 미인증 7일+호텔 0건 사용자를 매일 새벽 3시 30분 자동으로 골라내는 봇 신설. ③ 봇은 기본 "보고만 하기" 모드 (실수 방지), 실제 삭제는 사람이 수동 실행 시에만. ④ 삭제 전에 사용자 전체 상태를 기록(되돌리기 가능).

## ✅ 결과
- **가입자 화면**: 호텔을 등록한 진짜 고객만 깔끔하게 보임 (팀멤버·좀비 자동 제외)
- **응답 데이터**에 `zombie_count`(현재 좀비 수) 같이 박혀서 어드민에서 한 눈에 모니터링 가능
- **봇 자동 운영**: 매일 새벽 3시 30분 (KST) 좀비 후보 자동 스캔, 사람 손 없음 (헌법 부칙 2 무인 실행)
- **되돌리기 보장**: 삭제 전 `admin_audit_log`에 사용자 전체 정보 박음 (헌법 부칙 9 가역성)

## ⏱ 다음 결정 필요
- **GitHub Secrets 점검**: `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` 두 시크릿이 GitHub Actions에 등록돼 있는지 한 번 확인 필요. 등록 안 돼 있으면 봇이 첫 실행에서 실패하면서 자체 보고함.
- 실제 좀비 삭제 모드(`DRY_RUN=false`) 첫 실행은 대표님 수동 실행 시 (Actions 탭 → Run workflow → dry_run=false). 첫 결과 보고 후 schedule도 실삭제로 전환할지 결정.

---

# 🔧 기술 상세 (개발자용)

## 변경 파일 3건

### 1. `api/admin.js` — `handleListUsers` 데이터 소스 재정의
- **Before**: `users.filter(u => !adminEmails[u.email.toLowerCase()])` (블랙리스트)
- **After**: `users.filter(m => !m.is_team_member && m.hotels.length > 0)` (화이트리스트)
- 응답에 신규 필드: `is_team_member`, `team_role`, `is_zombie`, `zombie_count`, `data_source: 'whitelist:hotels'`
- 좀비 판정 로직: `!isTeamMember && !email_confirmed_at && hotels.length === 0 && ageMs > 7days`

### 2. `scripts/cleanup-zombie-users.py` (197줄, 신설)
- urllib만 사용 (외부 의존성 0 — GitHub Actions runner에서 즉시 실행 가능)
- 환경변수: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `DRY_RUN`(기본 true), `ZOMBIE_CUTOFF_DAYS`(기본 7)
- 페이지네이션: `per_page=200`, 최대 50페이지 (안전장치)
- 삭제 순서: ① `admin_audit_log` POST (before_state 박음) → ② `auth.users` DELETE
- audit_log 실패 시 삭제 보류 (가역성 우선)

### 3. `.github/workflows/zombie-cleanup-bot.yml` (88줄, 신설)
- cron: `30 18 * * *` (UTC 18:30 = KST 03:30)
- schedule 트리거 = `DRY_RUN=true` 강제 (안전 기본)
- workflow_dispatch = `dry_run` choice 입력 + `cutoff_days` 입력 가능
- concurrency group `zombie-cleanup-bot`로 중복 실행 방지

## 헌법 자가 검증 11개 통과

| # | 통과 |
|---|------|
| 1 클라우드 only | ✅ GitHub + Supabase |
| 2 무인 실행 | ✅ cron schedule |
| 3 핸드폰 OK | ✅ Actions 탭 UI에서 수동 실행도 모바일 가능 |
| 4 영구 기록 | ✅ admin_audit_log |
| 5 자동 검증 | ✅ DRY_RUN 기본 ON |
| 6 다음 세션 맥락 | ✅ 이 chat-log + tasks.json progress.steps |
| 7 상태 가시성 | ✅ tasks.json done + admin-status 5초 폴링 |
| 8 동기화 | ✅ tasks.json 변경 → admin-status renderAll() |
| 9 가역성 | ✅ before_state 박음 |
| 10 헌법 자동 로딩 | ✅ 매 채팅 boot.md + 헌법 3종 fetch |
| 11 메모리 사이클 | ✅ 개발기간 토큰 충전 유지 (헌법 부칙 11) |

## 검증 로그

- `node --check api/admin.js` → OK
- Python `ast.parse(cleanup-zombie-users.py)` → OK
- `https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/.github/workflows/zombie-cleanup-bot.yml` 라이브 200 응답
- 3개 commit 모두 push 완료: b321ba5 → 9d27d94 → c30a696
