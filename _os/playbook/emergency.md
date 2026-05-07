# Playbook — 비상 절차

> **사고 발생 시 이 순서로 대응한다.**
> 헌법 원칙 9 (가역성) + 원칙 5 (무인 검증)의 비상 모드.

---

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

## 4. GitHub PAT 만료·노출

```
1. 즉시 GitHub Settings → Tokens에서 폐기
2. 새 PAT 발급 (workflow 스코프 차단 유지)
3. 환경변수 갱신 (.env*에 저장하지 말고 Vercel 환경변수만)
4. 노출 사고 발생 시 chat-log + DECISIONS에 기록 (재발 방지)
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
