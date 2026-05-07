# Current Handoff (직전 채팅 → 다음 채팅 인계 슬롯)

> **이 파일은 직전 채팅이 종료될 때 Claude가 자동 갱신한다.**
> 새 채팅에서 이 파일을 읽고 작업을 이어간다.
> 형식 의무 항목은 `_os/playbook/chat-routing.md` 4번 참조.

---

## 직전 채팅 종료 정보

- **종료 일시**: 2026-05-08 (UTC, 두 번째 갱신)
- **종료 사유**: D-017 헌법 부칙 4 보강 박음 + Vercel webhook 죽음 사고 + 대표님 Redeploy 1회 실시 + 라이브 sync 미완 확인. BL-VERCEL-DEPLOY-RACE-GUARD가 더 시급해짐.
- **마지막 사업 commit**: (본 commit) `[handoff] Vercel webhook 사고 + Redeploy 학습 + 라이브 sync 강제 갱신`
- **이번 채팅 성과**:
  - **헌법 부칙 4 보강 (D-017 명문화)** — 토큰 라이프사이클: 개발기간 = 등록·평문 노출 정상 상태, 서비스기간 = 일괄 폐기. 클로드 잔소리 영구 차단.
  - `_os/playbook/credentials-lifecycle.md` 신설 (90줄 디테일)
  - `_os/playbook/emergency.md` 4번 갱신 — "외부 유출 의심·만료" 시에만 발동
  - DECISIONS.md / DECISIONS_INDEX.md D-017 박음 + D-015·D-016 누락 보강
  - 헌법 163줄 유지 (부칙 14: 200줄 한계 내)
  - **BL-VERCEL-DEPLOY-RACE-GUARD P1→P0 격상** — 라이브 sync 결함이 헌법 변경에까지 영향 미쳐 시스템 신뢰도 직격
- **Vercel webhook 사고 시간선**:
  - 2026-05-07 17:59:15: 첫 race (89186e0 누락) → ed1a017 commit으로 우연히 복구
  - 2026-05-08: 18:15 이후 webhook 완전 정지 → 5번 push 모두 deployment 트리거 안 됨
  - 대표님이 Vercel 대시보드 Redeploy 1회 누름 → `dpl_C8tgVXRKCcxmnrnheYuPWZ6vCgEE` 생성됐으나 `action: redeploy` + `originalDeploymentId: dpl_71XFz6VfnDRYahe7V9zZaNg2buqh` (= ed1a017 옛 commit 그대로 재배포) → 라이브 여전히 옛 버전
- **학습 박힘**: Vercel "Redeploy" 버튼은 기본 = 같은 deployment 재현 (최신 commit 안 봄). 다음 채팅 BL 구현 시 이 동작 명시 + "Use existing build cache 해제 + Redeploy with latest commit" 옵션 고려.
- **잔여 BL**:
  - **BL-VERCEL-DEPLOY-RACE-GUARD (P0, 다음 채팅 즉시 1순위)** — webhook 죽음 감지 + 자동 복구 (단순 commit 트리거가 아닌, latest commit 강제 빌드까지)
  - BL-002 통합 To-Do Inbox (P0 in_progress, 2순위)
  - BL-WORKFLOW-DEAD-BRANCH-CLEANUP (P3)

---

## 다음 채팅 인계 명령문 (그대로 복붙)

```
[새 채팅 인계서 — Vercel race 가드 정석 구현 + BL-002 이어가기]

대표님은 이지형 (여행능력자들 / TravelWinners 1인 기업 대표).
TW OS는 "AI + 1인 사장이 사업 운영하는 OS".

【의무 첫 행동】
1. raw fetch 1개: https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/_os/boot.md
2. 추가 fetch:
   · https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/_os/handoff/current.md
   · https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/tasks.json (BL-VERCEL-DEPLOY-RACE-GUARD + BL-002 grep)
3. 6줄 자가 검증 보고
4. "BL-VERCEL-DEPLOY-RACE-GUARD 정석 구현 시작 → BL-002 이어가기 준비 완료" + "시작" 대기

【작업 환경】
- Repo: dgmasters01/tw-b2b (브랜치 main)
- PAT 토큰: 대표님이 채팅 시작 시 1회 주입 (개발기간 한정, 서비스 시 폐기 — 헌법 명시)
- commit 패턴: git CLI HTTPS + 환경변수 PAT (대표님이 매 채팅 주입)

【1순위 작업: BL-VERCEL-DEPLOY-RACE-GUARD (P1, ~1h)】

배경: 2026-05-08 발견. 봇 commit 다수가 같은 초에 push될 때 Vercel webhook이 일부 commit의 deployment를 만들지 않는 race. 사람이 발견하기 전까지 라이브 = 옛 상태. 

구현 항목 (3개):
1. `_os/scripts/health_check_admin.mjs`에 `checkVercelSync()` 추가
   - 비교 1: GITHUB_SHA env (Actions 환경에서 git HEAD)
   - 비교 2: Vercel API GET /v6/deployments (latest production deployment의 githubCommitSha)
   - 불일치 시 yellow (red 아님 — 차단 X)
   - VERCEL_TOKEN secret 필요 (Actions secrets에 등록 필요)
2. `.github/workflows/health-check-admin.yml`에 자동 복구 단계 추가
   - checkVercelSync yellow 감지 → 빈 commit 자동 push (`[health-bot] vercel-sync 복구 트리거`)
   - 무한 루프 방지: 이미 [health-bot] prefix 가드 박혀 있음
3. `_admin/_health.json`에 `vercel_sync` 필드 신설 → admin-status가 빨강/노랑 표시

대표님 결정 1회 필요:
- VERCEL_TOKEN을 Actions secrets에 등록할 권한. 대표님이 1번 클릭으로 등록(GitHub repo Settings > Secrets > Actions > New > VERCEL_TOKEN). 
  · 토큰 발급: Vercel 대시보드 > Account Settings > Tokens > Create > Scope: 본 프로젝트만 권장.

【2순위 작업: BL-002 통합 To-Do Inbox (P0, 60~90분)】
(직전 직전 채팅 인계서 그대로 — admin.html Dashboard 탭 = To-Do Inbox 재설계, 4종 source 매핑, 우선순위 정렬, 체크박스 완료. 이전 인계서 백업: git log --oneline로 974dc86 commit 메시지 참조)

【핵심 절대 원칙】
1. 부칙 12·13·14 의무 준수
2. _backup_YYYYMMDD 자동 백업
3. 매 commit 후 라이브 검증 (gohotelwinners.com tasks.json sha 비교까지)
4. commit subject에 [step:done:N] 태그 박기 (부칙 7)
5. 시스템 디테일 질문 금지 — D-010 매핑 + 클릭 최소 동선 기준 자율 결정
6. 토큰 압박 신호 시 자체 끊기 + 새 채팅 인계 자율 판단

지금 의무 첫 행동(1~3번) 시작.
```

---

## 큰 그림 진행도

| 단계 | 상태 |
|---|---|
| 1. OS 완성 | ✅ 완료 (헌법 27/27 PASS, 인프라 0 결함) — Vercel race 1건 발견되어 P1 신설로 추가 보강 중 |
| 2. gohotelwinners 시스템 완성도 100% | ⏳ BL-002 (다음 채팅 2순위) |
| 3. OS 다른 프로젝트 복제 (CEYLON / 호텔이야) | ⏳ 2단계 후 |

---

**갱신 규칙**: 매 채팅 종료 시 Claude가 위 두 섹션을 갱신하고 commit. 빈 상태일 때는 "직전 채팅 정상 종료, 인계 없음"이라고 명시.

**Last updated**: 2026-05-08 (Vercel race 결함 발견 + BL 신설 + 라이브 복구 트리거)
