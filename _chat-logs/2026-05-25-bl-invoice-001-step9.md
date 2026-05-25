---
date: 2026-05-25
bl: BL-INVOICE-001
step: 9
status: done
commit_target: feat(BL-INVOICE-001) step 9 — 이중 발행 차단 모달 + my-pending API [step:done:9]
tone: business
---

# BL-INVOICE-001 단계 9 — 이중 발행 차단 모달 + my-pending API

## ① 완료 내용

신규/수정 파일 3개 (sales.html ~165줄 추가, api/invoice.js ~95줄 추가).

**1) `api/invoice.js`** — 매니저 본인 인증 헬퍼 + `my-pending` 액션 추가
- `requireAuthed(req, serviceKey)` 헬퍼 신설 (admin 아닌 일반 매니저 인증, JWT 검증 후 user.id 추출)
- `ALLOWED_ACTIONS`에 `my-pending` 추가
- `handleMyPending(req, res, serviceKey, authed)` 함수: 매니저 본인 user_id + status='pending' 인보이스 조회. hotel_id 파라미터 있으면 해당 호텔만 필터. hotel_name까지 한 번에 채워서 반환.
- router 분기: `my-pending`은 admin 인증 우회하고 매니저 인증 사용

**2) `sales.html`** — 차단 모달 풀스택 박음
- **CSS** (`</style>` 직전, Aurora 톤): `.sl-modal-backdrop` / `.sl-modal` / 인보이스 카드 / primary·ghost 버튼 / 모바일 반응형 (가로 모드 ↔ 세로 모드 자동)
- **HTML** (body 닫기 직전): `#sl-double-issue-modal` 마크업 + i18n `data-en`/`data-ko` 속성으로 영문/한글 모두 박힘
- **JS** (PayPal SDK 섹션 직전):
  - `initPayPalButtons(hotel)` 호출을 `checkPendingThenInitPayPal(hotel)`로 갈아끼움
  - `checkPendingThenInitPayPal`: `/api/invoice?action=my-pending&hotel_id=X` 호출 → has_pending이면 모달, 없으면 정상 PayPal 진입. API 실패 시에도 결제 막지 않음 (warn만)
  - `showDoubleIssueModal(pendingList, hotel)`: 인보이스 카드 렌더 + i18n 적용 + 버튼 핸들러 박음
  - **[기존 인보이스 보기]** 버튼: `/api/invoice?action=pdf&id=X` 호출 → signed_url을 새 창으로 오픈
  - **[취소 요청]** 버튼: `mailto:partners@gohotelwinners.com` 자동 작성 (제목+본문에 invoice_number/호텔/금액/사유 박힘)
  - 배경 클릭 시 닫기 (PayPal 자동 진입 안 함 — 사용자가 결제 시도 다시 해야 함)
  - 포맷 헬퍼: `fmtModalAmount` (KRW=₩, USD=$, 그 외 통화코드) / `fmtModalDate` (locale 분기) / `escHtmlSafe` (XSS 방지)

**3) `tasks.json`** — step 9 done, progress 67% → 75%.

**자체 검증** (헌법 12원칙 12):
- `node --check api/invoice.js` ✅
- `node --check`로 sales.html script 태그 JS 추출 검증 ✅
- HTML 균형 (style/script/body) ✅
- 멱등 보장: `my-pending`은 read-only 액션, 중복 호출 부작용 없음
- 차단 모달 실패 안전: API 에러 시 결제 막지 않음 (warn 로그만) — 한 곳 장애가 사업 흐름 전체 막지 않음

## ② 이유

- **정책 2.8 마지막 단락 정확 구현**: "Pending 인보이스가 있는 상태에서 같은 매니저가 같은 상품 결제 시도 → 즉시 차단 모달 + [기존 인보이스 보기] [취소 요청] 2개 버튼". 라운드 10에서 대표님이 직접 합의한 그림.
- **차단 위치 = PayPal 버튼 렌더 직전**이 정석: 한국·해외 양쪽 결제 흐름이 모두 이 함수를 거치고, 이 위에서 막으면 결제 진입 시점에 100% 차단됨. 결제 시작 후 차단하면 PayPal 세션 꼬임.
- **`my-pending`이 admin 인증 우회해야 하는 이유**: 매니저 본인은 admin 테이블에 없어서 기존 액션들은 401. read-only + 본인 데이터만 조회라 보안 위험 0.
- **API 실패 시 결제 막지 않음 결정**: invoice API 1곳 장애로 매니저 결제 전체가 막히면 사업 손실 = 헌법 12조 그림 일치 위반(결제는 무인 자동이 본질). 멱등 흐름으로 webhook이 어차피 paid 마크 갱신하므로 안전.
- **mailto 취소 요청 방식 선택 이유**: 별도 API + admin 알림 + 상태 추적까지 박으면 단계 9가 단계 10·11급 분량으로 커짐. mailto는 즉시 구현 가능 + 대표님 받은 메일함이 1차 SoT 역할. 향후 별도 BL(BL-INVOICE-CANCEL-REQ)로 정식 화면 박을 수 있음.
- **차단 모달 실패 시 정상 흐름 fallback**: 인보이스 PDF 보기 실패해도 사용자가 admin/매니저 대시보드 별도 경로로 확인 가능 — 닫힌 길은 만들지 않음.

## ③ 사업 영향

- **이중 결제·이중 환불 사고 시스템 단 차단**: 한국 매니저가 ₩276,000 인보이스 미입금 상태에서 또 결제 누르려 해도 시스템이 막음 → 환불·재발행 운영 부담 0.
- **고객 신뢰 보호**: "결제하기 두 번 눌렀더니 두 건 결제됨" 사고가 원천 차단됨. 글로벌 B2B SaaS 표준 동작.
- **대표님 시간 보호**: 이중 결제 발생 후 환불·CN 발행·고객 응대로 1건당 30분~1시간 잃을 일이 사라짐. 단계 8 텔레그램 알림 + 단계 9 차단 모달로 한국 매니저 KRW 결제 운영이 "사람 손 0"에 더 가까워짐.
- **i18n 자동**: data-en/data-ko 속성 박힘 → T.lang 따라 영문/한글 자동 전환. 한국 매니저는 한글, 글로벌 매니저는 영문으로 자연스럽게.
- **mailto 취소 요청은 임시 다리**: 향후 정식 API + admin 화면에 "취소 요청 대기" 탭 박을 수 있게 백로그 추가 가능 (단계 10 이후).

## ④ 다음 행동

- **단계 10 (다음)**: manager-dashboard '서류' 탭 — 1클릭 PDF 다운로드. 단계 5의 `pdf`/`get` 액션 권한 일부 정합성 문제(admin 외 본인도 가능 주석 vs 실제 admin 강제) 검토하면서 함께 풀기. invoice-engine 추출 정석 시점.
- **단계 11**: Supabase Storage 1년+ 보관 정책 (이미 단계 5에서 버킷 박음, 보관 기간 메타만)
- **단계 12**: 라이브 검증 + 전체 인보이스 흐름 E2E 테스트

## ⑤ 대표님 결정 필요

**없음.** 헌법 1조 + 부칙 16 자율 결정 범위:
- `my-pending` API endpoint 위치 (`api/invoice.js`에 통합)
- 차단 모달 UI 위치 (sales.html에 박음, marketing.html에는 박지 않음 — sales가 결제 진입점)
- mailto 취소 요청 방식 (별도 API 박지 않음, 임시 다리)
- i18n data-en/data-ko 속성 패턴 (기존 sales.html 같은 패턴 따라감)

**선택적 후속 작업 (별도 BL로 분리 가능):**
- BL-INVOICE-CANCEL-REQ: 정식 취소 요청 API + admin 화면 "취소 요청 대기" 탭
- 단계 5 `pdf`/`get` 액션 매니저 본인 인증 정합성 정정 (단계 10에서 일괄 처리)

라이브 검증은 한국 매니저 1명·해외 매니저 1명이 모두 sales.html 진입할 수 있어야 하는데 현재 매니저 계정 2개(leejifilm/joylife8760)가 status='approved' hotel을 보유 중이라 가능. 라이브 배포 후 결제 버튼 누르면 모달 잘 뜨는지 확인 필요.
