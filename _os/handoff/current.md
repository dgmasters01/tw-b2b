# Current Handoff (직전 채팅 → 다음 채팅 인계 슬롯)

> **이 파일은 직전 채팅이 종료될 때 Claude가 자동 갱신한다.**
> 새 채팅에서 이 파일을 읽고 작업을 이어간다.
> 형식 의무 항목은 `_os/playbook/chat-routing.md` 4번 참조.

---

## 직전 채팅 종료 정보

- **종료 일시**: 2026-05-08 (UTC, 세 번째 갱신 — 이번 채팅 종료)
- **종료 사유**: 헌법 D-017 박음 + Vercel Pro 결제 완료 (D-018) → 라이브 sync 정상화 + 다음 채팅이 BL-VERCEL-DEPLOY-RACE-GUARD 즉시 작업 가능. 이번 채팅 토큰 많이 소모.
- **마지막 사업 commit**: (이 commit) `[D-018][인프라] Vercel Pro 결제 활성화 + 다음 채팅 BL-VERCEL-DEPLOY-RACE-GUARD 인계`
- **이번 채팅 누적 성과**:
  1. **헌법 부칙 4 보강 (D-017)** — 토큰 라이프사이클: 개발기간 = 등록·평문 노출 정상 상태, 서비스기간 = 일괄 폐기. 클로드 잔소리 영구 차단.
  2. **`_os/playbook/credentials-lifecycle.md` 신설** (90줄 디테일)
  3. **`_os/playbook/emergency.md` 4번 갱신** — "외부 유출 의심·만료" 시에만 발동
  4. **DECISIONS.md / DECISIONS_INDEX.md** D-017·D-018 박음 + D-015·D-016 누락 보강
  5. **Vercel Pro 업그레이드 (D-018)** — Hobby → Pro $20/월. 헌법 위반(상업 사용 약관) 해소 + 일일 배포 한도 100→3,000개.
  6. **BL-VERCEL-DEPLOY-RACE-GUARD P1→P0 격상** (신설된 BL이 라이브 sync 결함을 헌법 변경에까지 영향 미친 사실 기반).
- **2026-05-08 라이브 결함 시간선 (학습 박힘)**:
  - 17:59:15 UTC: 첫 race (89186e0 + cc12a26 동시 push) → ed1a017 commit으로 우연 복구
  - 18:15 이후: webhook 정지 → 5번 push 모두 deployment 트리거 안 됨 (실제로는 Hobby 일일 100개 한도 초과)
  - 대표님 Vercel Redeploy 1회 → ed1a017 옛 commit 그대로 재배포 (`action: redeploy` 디폴트)
  - **진짜 원인**: Vercel Hobby 일일 100개 배포 한도 + 봇 7개 폭증
  - **해결**: D-018 Pro 업그레이드로 한도 30배 확대 (3,000개/일)

---

## 다음 채팅 인계 명령문 (그대로 복붙)

```
[새 채팅 인계서 — BL-VERCEL-DEPLOY-RACE-GUARD P0 정석 구현]

대표님은 이지형 (여행능력자들 / TravelWinners 1인 기업 대표).
TW OS는 "AI + 1인 사장이 사업 운영하는 OS".

【의무 첫 행동】
1. raw fetch 1개: https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/_os/boot.md
2. 추가 fetch:
   · https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/_os/handoff/current.md
   · https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/tasks.json (BL-VERCEL-DEPLOY-RACE-GUARD + BL-002 grep)
   · https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/_os/scripts/health_check_admin.mjs (checkVercelSync 신설 위치 파악)
   · https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/.github/workflows/health-check-admin.yml (자동 복구 단계 박을 위치)
3. 6줄 자가 검증 보고
4. "BL-VERCEL-DEPLOY-RACE-GUARD 정석 구현 시작 준비 완료" + "시작" 대기

【작업 환경】
- Repo: dgmasters01/tw-b2b (브랜치 main)
- PAT 토큰: 대표님이 채팅 시작 시 1회 주입 (헌법 부칙 4 + D-017 — 평문 정상)
- Vercel 플랜: Pro 활성 (D-018, 일일 배포 3,000개 한도)
- 라이브: gohotelwinners.com — 정상 작동 중 (Pro 결제로 sync 복구됨)

【1순위 작업: BL-VERCEL-DEPLOY-RACE-GUARD (P0, ~1.5h)】

배경: 2026-05-08 발견. Hobby 시절 일일 한도 100개 폭증으로 헌법변경 commit이 라이브에 못 닿음. Pro 업그레이드로 한도 30배 확대됐지만, 봇 7개 commit 폭증 패턴 자체는 그대로 → 비효율 + 미래 race 가능성. 정석 가드 구현 의무.

구현 항목 (4개):

1. **봇 commit 통합·축소** (가장 중요)
   - `.github/workflows/build-activity-feed.yml`: push trigger → schedule trigger (5분마다 1번)으로 변경
   - `.github/workflows/page-status-scan.yml`: 동일 처리
   - `.github/workflows/chat-log-index.yml`: 동일 처리
   - 효과: 사업 commit 1개 push당 봇 commit 4~6개 → 1~2개로 축소
   - 예상 일일 배포: 평일 작업 시 ~80개 → ~30개 (Pro 한도 1%)

2. **`_os/scripts/health_check_admin.mjs`에 `checkVercelSync()` 추가**
   - GITHUB_SHA env (Actions 환경에서 git HEAD)
   - Vercel API GET /v6/deployments?limit=1 (latest production deployment의 githubCommitSha)
   - 불일치 시 yellow 경고 (red 아님, 차단 X)
   - VERCEL_TOKEN secret 필요 → 대표님 1회 등록 (Vercel 대시보드 > Account > Tokens > Create > Repo Settings > Secrets > VERCEL_TOKEN)

3. **`.github/workflows/health-check-admin.yml`에 자동 복구 단계 추가**
   - checkVercelSync yellow 감지 → 빈 commit 자동 push (`[health-bot] vercel-sync 자동 복구`)
   - 무한 루프 방지: [health-bot] prefix 가드 이미 박혀 있음

4. **`_admin/_health.json`에 `vercel_sync` + `vercel_quota` 필드 신설**
   - vercel_sync: green/yellow/red
   - vercel_quota: 일일 배포 사용률 (Vercel API로 조회)
   - admin-status가 빨강/노랑 표시 (5초 polling 자동 반영)

대표님 결정 1회 필요:
- VERCEL_TOKEN을 GitHub Actions Secrets에 등록 (1번 클릭). 토큰 발급은 Vercel > Account Settings > Tokens > Create > 본 프로젝트 Scope.

【2순위 작업: BL-002 통합 To-Do Inbox (P0, 60~90분)】
직전 인계서(commit 974dc86 메시지) 그대로 — admin.html Dashboard 탭 = To-Do Inbox 재설계.

【핵심 절대 원칙】
1. 부칙 12·13·14 의무 준수
2. _backup_YYYYMMDD 자동 백업
3. 매 commit 후 라이브 검증 (gohotelwinners.com sync sha 비교)
4. commit subject에 [step:done:N] 태그 박기 (부칙 7)
5. 시스템 디테일 질문 금지 — D-010 매핑 + 클릭 최소 동선 기준 자율 결정
6. 토큰 폐기·보안 잔소리 금지 (D-017 부칙 4 — 개발기간 정상)
7. 토큰 압박 신호 시 자체 끊기 + 새 채팅 인계 자율 판단

지금 의무 첫 행동(1~3번) 시작.
```

---

## 직전 채팅 commit 5개 (참고)

```
(이 commit) [D-018][인프라] Vercel Pro 결제 활성화 + 다음 채팅 BL-VERCEL-DEPLOY-RACE-GUARD 인계
890955d [activity-bot] activity-feed 3-Layer 자동 갱신 (총 308건)
5983b9c [handoff] Vercel webhook 사고 + Redeploy 학습 + 라이브 sync 강제 갱신
130e846 [sync-bot] tasks.json → MD/Gallery 자동 동기화
529a1a2 [헌법변경][D-017] 자격증명 라이프사이클 명문화 — 부칙 4 보강 + playbook 신설
ec4b194 [BL-VERCEL-DEPLOY-RACE-GUARD] P1→P0 격상 + 재배포 트리거
ed1a017 [BL-VERCEL-DEPLOY-RACE-GUARD] BL 신설 + 라이브 sync 복구 트리거
```

---

## 큰 그림 진행도

| 단계 | 상태 |
|---|---|
| 1. OS 완성 | ✅ 완료 (헌법 27/27 PASS, 인프라 0 결함) |
| 1.5 인프라 안정화 (D-017 토큰 + D-018 Pro) | ✅ 완료 |
| 2. gohotelwinners 시스템 완성도 100% | ⏳ BL-VERCEL-DEPLOY-RACE-GUARD (다음 채팅 1순위) → BL-002 (2순위) → 잔여 P1 |
| 3. OS 다른 프로젝트 복제 (CEYLON / 호텔이야) | ⏳ 2단계 후 |

---

**갱신 규칙**: 매 채팅 종료 시 Claude가 위 두 섹션을 갱신하고 commit. 빈 상태일 때는 "직전 채팅 정상 종료, 인계 없음"이라고 명시.

**Last updated**: 2026-05-08 (Vercel Pro 결제 + D-018 박음 + 다음 채팅 BL-VERCEL-DEPLOY-RACE-GUARD 인계)
