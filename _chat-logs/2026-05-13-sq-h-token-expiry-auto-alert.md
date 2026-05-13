---
slug: 2026-05-13-sq-h-token-expiry-auto-alert
title: SQ-H — Supabase 토큰 만료 7일 전 자동 알림 박음
date: 2026-05-13
tasks: [SQ-H]
commits: []
decisions: [D-017]
---

## 🎯 한 줄 요약

토큰이 만료되기 7일 전에 대표님 이메일로 자동 알림이 발송된다 — 매일 새벽에 자동 점검.

## 📍 왜 발생했나

Supabase 데이터베이스 관리 토큰이 2026-06-04에 만료되는데, 지금까지는 알림이 0건이었다. 만료되면 봇·자동화·배포가 전부 멈추고, 대표님이 깜빡하면 시스템이 통째로 다운된다. 다른 토큰(GitHub·Vercel·Cloudflare·Resend)도 똑같이 위험했는데 만료일이 어디에도 박혀 있지 않았다.

## 🛠 어떻게 해결했나

먼저 모든 토큰의 만료일을 한 파일(`_data/tokens-registry.json`)에 모아 단일 진실원으로 박았다. 그 다음 매일 새벽 9시(한국 시간)에 자동으로 돌아가는 점검 봇을 만들어서, 만료까지 7일 이하 남은 토큰이 있으면 대표님 이메일로 알림을 보낸다. 같은 날 같은 토큰은 1번만 보내도록 중복 방지 장치도 박았다.

## ✅ 결과

- 6개 토큰 자동 추적 시작 — Supabase / GitHub PAT / Vercel / Cloudflare / Resend / PayPal
- 매일 09:00 KST 자동 점검 — 대표님 손 안 댐
- 만료 7일 이하 남으면 대표님 이메일로 알림 (긴급도 색 + 갱신 페이지 링크 포함)
- 시뮬레이션 검증 완료 — D-3 시나리오에서 봇이 정확히 알림 단계까지 도달
- Supabase 토큰(D-22) → 5/28에 자동 알림 예정

## ⏱ 다음 결정 필요

추가 결정 없음. 시스템이 알아서 매일 점검한다.

---

# 🔧 기술 상세 (개발자용)

## 박은 파일 3개
- `_data/tokens-registry.json` (신규, 6개 토큰 등록)
- `scripts/token-expiry-check.js` (신규, 217줄, ESM Node 20)
- `.github/workflows/token-expiry-cron.yml` (신규, cron + push 트리거)

## tokens-registry.json 구조
```json
{
  "tokens": [
    {
      "id": "supabase-management-api",
      "name": "Supabase Management API Token",
      "expires_at": "2026-06-04T00:00:00.000Z",
      "renewal_url": "https://supabase.com/dashboard/account/tokens",
      "warn_days_before": 7,
      "active": true,
      "env_var": "SUPABASE_MGMT_TOKEN"
    },
    ...
  ]
}
```

## 봇 작동 흐름
1. registry 읽기 → active 토큰만 필터
2. 각 토큰별 `daysUntil(expires_at)` 계산
3. `warn_days_before` 이하면 expiring 목록에 추가
4. `_data/token-alert-log.json` 확인 → 같은 날 같은 토큰 중복 차단
5. Resend API → `ops@gohotelwinners.com` → `dgmasters01@gmail.com` 발송
6. 발송 이력 박음 (90일 보관)

## GitHub Actions cron
- 매일 UTC 00:00 = KST 09:00 자동 실행
- `_data/tokens-registry.json` 변경 시 즉시 push 트리거 (만료일 추가/수정 즉시 검증)
- `workflow_dispatch` 수동 실행 가능
- self-trigger 방지: `[token-expiry-bot]` commit message 필터

## 환경변수
- `RESEND_API_KEY`: GitHub Secrets에 등록 (이미 박혀있음 — `secrets.RESEND_API_KEY`)
- 추가 환경변수 불필요

## 검증
- ✅ Node syntax OK
- ✅ 로컬 dry-run: 6개 토큰 정상 추적, OK 상태 6/6
- ✅ 시뮬레이션 (D-3 시나리오): URGENT 표시 정상, 메일 단계 도달
- ✅ 원복 (Supabase 만료일 2026-06-04 그대로 유지)

## D-017 부합
- "개발기간(등록 정상) → 서비스기간(일괄 폐기)" 라이프사이클의 첫 단계
- 만료 7일 전 알림 = 대표님 갱신 시간 충분히 확보

## 영향 BL
- D-017 자격증명 라이프사이클: 알림 자동화 부분 완성
- BL-OS-INSTALL-PAT-FLOW: 별도 작업 (OS 설치 시 토큰 박기)
- 향후 토큰 추가 시 `_data/tokens-registry.json`에 1줄 추가만 하면 자동 추적
