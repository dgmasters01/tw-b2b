---
date: 2026-05-25
bl: BL-INVOICE-001
step: 8
status: done
commit_target: feat(BL-INVOICE-001) step 8 — invoice-expire cron + 텔레그램 4단계 알림 [step:done:8]
tone: business
---

# BL-INVOICE-001 단계 8 — 입금 기한 자동 만료 cron + 텔레그램 4단계 알림

## ① 완료 내용

신규 파일 3개 박음 (총 ~460줄).

**1) `api/_lib/telegram.js`** (69줄, 신설)
- `sendTelegram(text, opts)` 헬퍼 — TELEGRAM_BOT_TOKEN + chat_id로 메시지 전송, Markdown 모드 기본
- 토큰 미박혀있으면 silent skip (`{ ok:false, skipped:'no_token' }`) — cron 자체는 계속 동작
- 기본 chat_id: `8778277875` (메모리상 tw_personal_os_bot)
- `escMd(s)` 헬퍼 — invoice_number / 호텔명 등 동적 값 Markdown escape

**2) `api/cron/invoice-expire.js`** (362줄, 신설)
- 매시 정각 GitHub Actions에서 POST 호출
- 인증: `x-cron-token: $CRON_SECRET`
- 4단계 한 트랜잭션:
  - **STAGE ③ expired**: `due_at < now & status='pending'` → status='expired', voided_at=now, void_reason='입금 기한 경과 자동 만료 (cron)' + KR만 ❌ 알림
  - **STAGE ② 6h**: `due_at - 6h ≤ now < due_at`, KR-pending → 🚨 알림 (멱등)
  - **STAGE ① 24h**: `issued_at + 24h < now`, KR-pending, 기한 6h+ 남음 → ⏰ 알림 (멱등)
  - **STAGE ④ receipt_overdue**: `paid_at + 24h < now & kr_receipt_issued=false`, KR-paid → 📋 알림 (정책 2.10)
- 멱등 보장: `invoices.metadata.telegram_log[]` 배열에 `{ stage, at, telegram_result }` 박음 → 같은 단계 중복 발송 차단
- `?dry_run=1` 옵션 — 후보 카운트만 (DB 전환/알림 안 함)
- 응답: `{ stage_expired_count, stage_24h_sent, stage_6h_sent, stage_receipt_overdue_sent, candidates, errors[] }`

**3) `.github/workflows/invoice-expire-cron.yml`** (신설)
- `schedule: 0 * * * *` (매시 정각 UTC) + `workflow_dispatch` 수동 트리거 (dry_run 입력 토글)
- `gohotelwinners.com/api/cron/invoice-expire` 호출 + 결과 4개 숫자 요약 출력
- `manager-campaign-cron.yml`과 동일 패턴 (CRON_SECRET 인증, HTTP 200 체크)

**4) `tasks.json`**: step 8 done, progress 58% → 67%.

## ② 이유

- **정책 2.8 명시**: "기한 경과 시 cron(매시 정각) 자동 Void/Expired 처리". KR 매니저 KRW 송금 트랙은 사람 손이 안 들어가면 환율 리스크가 회사 손실로 직결 — 자동 만료가 회사 보호 장치.
- **정책 2.13 명시**: 4단계 텔레그램 알림(발행 즉시·24h·6h·만료) 중 단계 8에서 24h/6h/만료/영수증 누락 4개 박음. 발행 즉시 알림은 별도 BL(invoice issue 직후 호출)에서 박을 예정 — issue 흐름과 결합.
- **GitHub Actions cron 선택 이유**: vercel.json crons는 Hobby 한계(매일 1회만 무료). 매시 정각 = 24회/일이라 Actions가 정석. 기존 manager-campaign이 동일 패턴 — 운영자 한 곳에서 모든 cron 통합 가시화.
- **metadata.telegram_log[] 멱등 설계 이유**: 별도 컬럼/테이블 추가하면 마이그레이션 필요. jsonb 안에 박으면 스키마 변경 없이 즉시 박힘 + 추후 다른 알림 단계 추가 시 동일 패턴 재사용. 정책 9(가역성) 만족 — metadata 클리어 1번이면 알림 재발송 가능.
- **dry_run 모드 박은 이유**: 라이브 진입 시 첫 cron 실행 전 후보 건수 확인용. 헌법 12(자체 검증) 시행령.
- **텔레그램 토큰 미설정 silent skip 이유**: 토큰 박기 전에도 cron이 계속 돌면서 status='expired' 전환은 정상 작동. 토큰 박힌 순간부터 알림만 추가됨. 토큰 미설정도 멱등 로그에 박혀 토큰 박힌 후 과거 분 재발송 안 됨.

## ③ 사업 영향

- **한국 매니저 입금 기한 놓치면 자동 만료 + 대표님 텔레그램에 4단계 알림이 자동 도착**. 대표님이 은행 앱·admin 안 들어가도 텔레그램 한 곳에서 미입금 현황 파악 가능.
- **환율 리스크 자동 차단**: 기한 경과한 미입금 인보이스는 환율 새로 적용한 신규 인보이스로 재발행 흐름 — 회사 손실 0.
- **영수증 발행 누락 방지** (정책 2.10): 입금 확인 후 24시간 내 세금계산서/현금영수증 발행 안 하면 텔레그램 📋 알림 자동 → 세무 신고 누락 사고 차단.
- **부분 자동화/완전 자동화 분리**: cron은 "만료 전환 + 알림"만 자동, 실제 영수증 발행은 대표님이 홈택스에서 수동 후 admin "발행 완료" 체크 (정책 2.11 권한 분리 유지).
- **운영 진입 시 추가 1단계**: GitHub Repo Settings → Secrets에 `TELEGRAM_BOT_TOKEN` 박기 + (옵션) `TELEGRAM_OWNER_CHAT_ID=8778277875`. 박기 전엔 status 전환은 정상, 알림만 silent skip.

## ④ 다음 행동

- **단계 9 (다음)**: sales.html 이중 발행 차단 모달 — 한국 매니저가 Pending 인보이스 있는 상태에서 또 결제하기 누르면 "이미 발행된 미결제 인보이스가 있습니다" 차단 모달 + [기존 인보이스 보기] [취소 요청] 버튼 (정책 2.8 마지막 단락).
- **단계 10**: manager-dashboard '서류' 탭 — 1클릭 PDF 다운로드 (`api/_lib/invoice-engine.js` 추출 정석 시점, 단계 7에서 미룬 작업).
- **단계 11**: Supabase Storage 1년+ 보관 정책 (이미 단계 5에서 버킷 박음, 보관 기간 메타만 박으면 됨).
- **단계 12**: 라이브 검증 + commit + push.

## ⑤ 대표님 결정 필요

**없음.** 헌법 1조 + 부칙 16 자율 결정 범위:
- cron 트리거 방식(GitHub Actions, 기존 manager-campaign 패턴 따라감)
- 텔레그램 헬퍼 위치(`api/_lib/telegram.js`, 다른 헬퍼와 동일 디렉토리)
- 멱등 보장 방식(metadata.telegram_log[] jsonb, 스키마 변경 없음)
- dry_run 옵션 박기(자체 검증 강제)

**선택적 후속 작업** (운영 진입 시):
- GitHub Secrets에 `TELEGRAM_BOT_TOKEN` 박기 (대표님이 BotFather에서 토큰 받아 박으셔야 함 — 부칙 4 권한 부여 영역)
- 박기 전 cron은 status='expired' 전환만 동작, 박은 직후부터 알림 흐름 자동 시작

다음 단계 9 (sales.html 이중 발행 차단 모달) 진입 시 컨텍스트 재판단 — sales.html 라이브 fetch 필요해 분량 큼, 새 채팅 권장 가능.
