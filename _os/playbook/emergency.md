# Playbook — 비상 절차

> **사고 발생 시 이 순서로 대응한다.**
> 헌법 원칙 9 (가역성) + 원칙 5 (무인 검증)의 비상 모드.

---

## 0. 🆕 클로드가 되돌리는 법 (git 없이 — 2026-07-16 신설)

> **문제였던 것**: 아래 절차들은 전부 `git revert`를 쓰라고 한다. **클로드는 git을 못 쓴다.**
> 창구는 저장(PUT)·삭제(DELETE)뿐. 즉 되돌리는 법이 문서엔 있는데 클로드에겐 수단이 없었다.

### 파일 되돌리기 — 3단계 (실측 검증 2026-07-16)
```
1. 되돌릴 시점의 commit_sha 확보 (작업 보고에 항상 적혀 있음)
2. 그 시점 내용을 그대로 가져온다:
   https://raw.githubusercontent.com/dgmasters01/tw-b2b/{commit_sha}/{경로}
3. 그 내용을 창구로 다시 저장(PUT) → 되돌아감. 이력에 "되돌림"으로 남는다.
```
- **지운 파일도 이 방법으로 살아난다.** 삭제 직전 sha로 조회하면 내용이 그대로 있다(실측 확인).
- 그래서 **파일은 백업 걱정이 없다** — GitHub이 모든 커밋을 영구 보관한다. 오늘 v4·v12·v13 전부 조회됨.

### 작업 보고에 commit_sha를 반드시 적는 이유
sha가 없으면 되돌릴 지점을 못 찾는다. **보고에 sha를 안 적으면 그 작업은 되돌릴 수 없는 것과 같다.**

## 0-B. 🔴 DB는 GitHub이 지켜주지 않는다 (2026-07-16 실측)

**파일과 DB는 사정이 완전히 다르다.**

| | 백업 | 되돌리기 |
|---|---|---|
| 파일(GitHub) | ✅ 자동·영구 | ✅ 위 3단계 |
| **DB(Supabase)** | ⚠️ **손으로 만든 백업 테이블 3개뿐** | ❌ **수단 없음** |

- 실측: `_admins_backup_20260513_security_patch` · `bookings_agoda_backup_20260715` · `bookings_agoda_bak_20260710` — 전부 사람이 그때그때 만든 것.
- `api/ops/db-query`는 **쓰기가 나간다.** 막힌 건 `drop database`/`drop schema`뿐. `DELETE FROM …` · `UPDATE …` 는 그대로 실행된다.
- 잃을 것: 예약 **7,316행** · 호텔 **3,185행** = 사업의 전부.

### DB 작업 전 규칙 (헌법 9조 "백업 먼저" 강제)
```
안전 (백업 불필요)   : CREATE TABLE · CREATE INDEX · SELECT
백업 먼저 (의무)     : UPDATE · DELETE · ALTER · DROP TABLE
  → CREATE TABLE {원본}_bak_{YYYYMMDD} AS SELECT * FROM {원본};
  → 행 수 대조 후에만 본 작업 실행
```
- **백업 없이 UPDATE/DELETE 치는 것 = 헌법 9조 위반.** 되돌릴 수 없다.
- Supabase 자체 자동 백업(일일·PITR) 여부는 **대시보드에서만 확인 가능** → 대표님 확인 필요.

## 1. Vercel 배포 실패

```
1. vercel logs 확인
2. 직전 정상 commit으로 롤백:
   git revert HEAD && git push
3. 대표님께 즉시 보고:
   - 실패 사유
   - 롤백 결과 (HTTP 200 복귀 확인)
   - Vercel 라이브 링크
```

## 2. 라이브 페이지 500 에러

```
1. Supabase 상태 확인 (vjsludfjsphwnumuoqaj)
2. Vercel 환경변수 누락 여부 → Vercel 대시보드 확인
3. 직전 정상 commit으로 롤백
4. 보고 + 원인 분석 chat-log 박기
```

## 3. 토큰 한계 임박

```
1. 현재 작업 상태 → _os/handoff/current.md에 저장
2. 부칙 13에 따라 새 채팅 시작 권장
3. 인계 명령문 박스 자동 제공
```

## 4. GitHub PAT 만료·외부 유출 의심

> **개발기간 중 채팅 평문 노출은 사고 아님 (헌법 부칙 4 + `credentials-lifecycle.md`).**
> 이 절차는 **외부 유출 흔적 발견** 또는 **만료** 시에만 발동.

```
1. 즉시 GitHub Settings → Tokens에서 폐기
2. 새 PAT 발급 (workflow 스코프 차단 유지)
3. 환경변수 갱신 (.env*에 저장하지 말고 Vercel 환경변수만)
4. 외부 유출 의심 사고 발생 시 chat-log + DECISIONS에 기록 (재발 방지)
```

## 5. 헌법 자가 검증 실패

```
1. 즉시 작업 중단
2. 위반 원칙 명시 (11개 중 어느 것)
3. 대표님께 보고: "헌법 X조 위반 신호. 다른 길 찾을 때까지 멈춤"
4. 우회 제안 절대 금지 (대표님 명시 허락 시에만)
```

## 6. 봇 5종 다운

| 봇 | 다운 시 영향 | 복구 |
|---|---|---|
| sync-bot | 문서 동기화 끊김 | `.github/workflows/sync.yml` 재실행 |
| auto-detect-task-status | tasks.json 자동 업데이트 끊김 | `auto-detect-task-status.yml` 재실행 |
| page-status-scan | 페이지 점수 갱신 끊김 | `page-status-scan.yml` 재실행 |
| build-activity-feed | 활동 타임라인 갱신 끊김 | `build-activity-feed.yml` 재실행 |
| health-check-admin | 라이브 모니터링 끊김 | `health-check-admin.yml` 재실행 |

워크플로 재실행: GitHub → Actions → 해당 워크플로 → "Run workflow"

## 7. _health.json 빨간 신호

```
1. _health.json 내용 확인 (어느 페이지·컴포넌트가 빨간색인가)
2. 해당 영역 즉시 점검
3. 5분 내 복구 안 되면 대표님께 보고 + 임시 안내 페이지 박기
4. chat-log + DECISIONS에 기록
```

---

**원본 위치**: `CLAUDE.md` 13. 비상 절차 (룰북으로 이전됨)
**Last updated**: 2026-05-07
