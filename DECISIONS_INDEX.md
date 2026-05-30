# DECISIONS INDEX (AI용)

**제정일:** 2026-05-03
**용도:** AI 즉시 검색용 의사결정 인덱스 (헌법 6조 본체 — 이중 형식 의무)
**짝 문서:** `DECISIONS.md` (사람용 / 스토리 형식)

---

## ⚠️ 동기화 규칙

- 이 문서는 **AI(Claude)가 30초 안에 의사결정 전체를 스캔**할 수 있도록 구조화된 표 형식으로 보관한다.
- `DECISIONS.md` 가 갱신되면 이 인덱스도 동기화 (sync_engine 책임).
- ID(D-XXX)는 **고정 불변**. 한 번 부여하면 절대 재사용 금지.
- 카테고리: `infra` / `data` / `payment` / `i18n` / `ux` / `analytics` / `feature` / `strategy` / `policy`
- 상태: `확정` / `보류` / `검토중` / `폐기`

---

## 📋 결정 인덱스

| ID | 결정 | 카테고리 | 날짜 | 상태 | 영향받는 작업 / 문서 |
|---|---|:---:|:---:|:---:|---|
| D-001 | 엑셀 업로드 단일 데이터 입수 방식 | data | 2026-04-27 | 확정 | BL-005, BL-008 |
| D-002 | USD / PayPal 결제 (Merchant ID HAY86YMQP9T5C) | payment | 2026-04 | 확정 | BL-013, signup.html |
| D-003 | 영어 우선 + 한국어 토글 (data-ko 일괄 적용) | i18n | 2026-04 | 확정 | 모든 외부 노출 페이지 |
| D-004 | 4 시스템 카테고리 (Business Docs / Task & Status / Page Gallery / Service Ops) | infra | 2026-05-03 | 확정 | 헌법 부칙 5 |
| D-005 | UX/UI 통일 우선, 콘텐츠 디테일 나중 (Aurora Trendy 전면 적용 후 사업 시작) | strategy | 2026-05-03 | 확정 | 헌법 부칙 6, BL-AURORA-MIGRATION |
| D-006 | YouTube 더보기 호텔별 단축 URL 클릭 카운트 (gohotel.win/h/{hotel_id}) | analytics | 2026-05-03 | 확정 | BL-TRACK-001 |
| D-007 | 매니저 대시보드 한 화면 7영역 (헌법 7조 매니저 적용) | ux | 2026-05-03 | 확정 | BL-MANAGER-DASH-001 |
| D-008 | 조회수 보조 지표화, 메인은 채널 노출/예약/매출 추정 | analytics | 2026-05-03 | 확정 | BL-MANAGER-DASH-001 |
| D-009 | 인보이스 / 영수증 PDF 영구 다운로드 (1년 후에도 1클릭) | feature | 2026-05-03 | 확정 | BL-INVOICE-001 |
| D-010 | 카테고리별 단일 진실 파일 매핑 표준 (4 카테고리 각각의 .md/.json 명시) | infra | 2026-05-03 | 확정 (개정) | BL-CATEGORY-REMAP, BL-HUB-RETIRE |
| D-011 | 3-State 권한 시스템 (🤖 자동 / 👥 직원 / 👤 대표님) + 영·한 체계 + admin-status 범위 | infra | 2026-05-04 | 확정 | BL-STATUS-DASH |
| D-012 | 대용량 admin 페이지 3-Layer 분리 (Summary/Display/Full) + admin-tasks 대시보드 흡수 | infra | 2026-05-04 | 확정 | BL-STATUS-DASH, BL-PAGE-DEDUP |
| D-013 | admin-hub.html 폐기 — 사이드바 = 라우팅 / admin-status = 통합 진입점 (클릭 단계 3→1) | infra | 2026-05-04 | 확정 | BL-HUB-RETIRE, D-010 매핑 표 카테고리 0 이관 |
| D-014 | chat-logs 시스템 — 사람용+AI용 이중 형식 강제 (헌법 6조 본체) + 인증 게이트 | infra | 2026-05-04 | 확정 | BL-CHAT-LOG-SYSTEM Phase 1~3 |
| D-015 | BL-ADMIN-AUTH-V2 — 5단계 권한 + 초대 + 즉시 박탈 + 무제한 이력 | policy | 2026-05-05 | 확정 | BL-ADMIN-AUTH-V2 |
| D-016 | BL-ADMIN-AUTH-V2 라우터 통합 — Vercel Hobby 12 함수 한도 회피 | infra | 2026-05-04 | 확정 | BL-ADMIN-AUTH-V2 |
| D-017 | 자격증명 라이프사이클 — 개발기간(등록 정상) → 서비스기간(일괄 폐기) | policy | 2026-05-08 | 확정 | 헌법 부칙 4, `_os/playbook/credentials-lifecycle.md` |
| D-018 | Vercel Hobby → Pro 업그레이드 ($20/월) — 약관 준수 + 일일 배포 한도 30배 + webhook race 차단 | infra | 2026-05-08 | 확정 | BL-VERCEL-DEPLOY-RACE-GUARD, gohotelwinners.com 호스팅 |
| D-019 | admin-status.html 중복 3중 정리 + 작업 지휘소 통합 — ③·⑥·⑦ 제거 | infra | 2026-05-08 | 확정 | BL-DEDUP-CONSOLIDATE (8단계), BL-URGENT-CARD-FLOW 흡수 |
| D-020 | 헌법 자가 검증에 사전 안전장치 3개(북극성/중복점검/한채팅한결정) — 방향 상실 방지 | policy | 2026-05-08 | 확정 | OPERATIONS_CHARTER.md 11조 자가검증, _os/boot.md 5-A |
| D-021 | BL-ADMIN-AUTH-PERF — Edge Middleware 단일 게이트 (A-2 정석, Hobby 12 한도 회피) | infra | 2026-05-09 | 확정 | middleware.ts(신규), admin-* 12개 페이지 인증 코드 제거 (2편) |
| D-022 | BL-ADMIN-LIGHTMODE — 다크/라이트 토큰 한 쌍 + 사이드바 토글 + OS 따라가기 | ux | 2026-05-10 | 확정 | BL-ADMIN-LIGHTMODE, shared.css 토큰 매핑 |
| D-023 | BL-CLAUDE-DISCIPLINE — 헌법 부칙 16 신설 + 인계서 강제 헤더 + 클로드 4개 의무 | policy | 2026-05-10 | 확정 | OPERATIONS_CHARTER.md 부칙 16, `_os/playbook/claude-discipline.md`, `_os/handoff-header.md` |
| D-024 | BL-BASELINE-AUTO-TASK — 헬스체크 결과를 tasks.json에 자동 등록 | infra | 2026-05-11 | 확정 | BL-BASELINE-AUTO-TASK, `_os/scripts/auto-task-from-health.mjs` |
| D-025 | BL-003 분할 — A(Agoda Matching=호텔 가입 승인 게이트, P0) + B(Affiliate 엑셀→예약 검증, P1) | strategy | 2026-05-11 | 확정 | BL-003-A, BL-003-B |
| D-026 | BL-ADMIN-AUTH — A안 2단계 권한 (CEO/Staff) + 로그 3종(접속/실행/admin-status 최근 활동) | policy | 2026-05-11 | 확정 | BL-ADMIN-AUTH |
| D-027 | BL-ADMIN-AUTH 진행 확정 — D-026 그대로 박음 (대표님 한 마디 확정 단계) | policy | 2026-05-11 | 확정 | BL-ADMIN-AUTH |
| D-028 | 갤러리 완성도(흐름·카테고리·빈페이지) + BEFORE/AFTER 자동 이력 보관 봇 복구 | infra | 2026-05-12 | 확정 | BL-GALLERY-FLOW-COMPLETENESS, BL-CAPTURE-BOT-RESTORE |
| D-029 | BL-015 — A안 확정. Playwright 자동 캡처로 admin-status Page Gallery에 BEFORE/AFTER 슬롯 박음 | infra | 2026-05-12 | 확정 | BL-015, BL-CAPTURE-BOT-RESTORE |
| D-030 | BL-GALLERY-FLOW-COMPLETENESS — 진행 승인. BL-SERVICE-MAP-OS 선행 후 갤러리 작업 흡수 | infra | 2026-05-12 | 확정 | BL-SERVICE-MAP-OS, BL-GALLERY-FLOW-COMPLETENESS |
| D-031 | "journey" 단어 폐기 — 서비스명(GoHotel) 접두사로 통일 (Claude 자율 결정) | infra | 2026-05-13 | 확정 | BL-RENAME-GOHOTEL, JOURNEY.md→GOHOTEL_FLOW.md, 13곳 일괄 변경 |
| D-032 | 동남아 1차 타겟 명시 + 영어 default 메일 + 국가 필드 필수 | strategy | 2026-05-13 | 확정 | BL-SIGNUP-COUNTRY-FIELD, BL-EMAIL-LOCALE-ROUTING, BL-ADMIN-COUNTRY-FILTER |
| D-033 | 환불·취소 정책 명확화 + 영수증 5년 영구 보관 | policy | 2026-05-13 | 확정 | BL-REFUND-FLOW, BL-RECEIPT-ARCHIVE |
| D-034 | 이벤트 사이트 = 별도 브랜드/도메인 신설 (B2B와 분리) | strategy | 2026-05-13 | 확정 | BL-EVENT-SITE-FOUNDATION, BL-EVENT-CUSTOMER-DB, BL-EVENT-PAYMENT-PROXY, BL-EVENT-HOTEL-NOTIFY |
| D-035 | 신규 매니저 가입 시 누적 매출 임계값 3구간 분기 노출 ($1,000+/$200~999/<$200) | analytics | 2026-05-13 | 확정 | BL-PAST-VIDEO-RECON, BL-SIGNUP-ENRICHMENT, BL-AGODA-TOS-CHECK |
| D-036 | BL-CHATLOG-BIZ-FORMAT — C안 + 검증 봇 (헌법 손 안 댐, 워닝만) | infra | 2026-05-12 | 확정 | BL-CHATLOG-BIZ-FORMAT |
| D-037 | BL-URGENT-CARD-FLOW — A안 통합 모달 (인계서/결정/핑퐁 분리 X) | infra | 2026-05-13 | 확정 | BL-URGENT-CARD-FLOW |
| D-038 | BL-AGODA-TOS-CHECK — Agoda 약관 검토 완료, D-035 그대로 진행 (4중 안전 구조) | policy | 2026-05-13 | 확정 | BL-AGODA-TOS-CHECK done, BL-SIGNUP-ENRICHMENT 설계 기준 |
| D-039 | BL-PAGE-ROLES-SPLIT — admin-status(시스템 완성도) vs admin.html(운영 대시보드) 책임 분리 | infra | 2026-05-15 | 확정 | BL-PAGE-ROLES-SPLIT, `_os/playbook/page-roles.md` |
| D-047 | BL-INVOICE-001 핑퐁 15라운드 합의 — 인보이스 번호 국가별 분리(INV-KR/INT) + 발행 권한 super_admin 1인 + 도장·서명 admin 업로드 구조 | feature | 2026-05-24 | 확정 | BL-INVOICE-001, BL-INVOICE-002, BL-INVOICE-003, `_os/playbook/invoice-system.md` |
| D-048 | BL-INVOICE-SYSTEM-DOCS — 인보이스 시스템 사업 정책 단일 진실원 문서화(`_os/playbook/invoice-system.md`) + 3개 BL 분담 확정(003 선결 → 001 → 002) + BL-INVOICE-001 progress 12단계 박힘(부칙 7 해소) | policy | 2026-05-24 | 확정 | `_os/playbook/invoice-system.md`, BL-INVOICE-001/002/003, `tasks.json` |
| D-049 | 채팅 끊김 객관 트리거 4종 도입 — 응답 15회 / 파일 10회 / 단계 완료 / 거대 파일 1500줄+ (판단 개입 0%) | policy | 2026-05-26 | 확정 | 헌법 부칙 16.1, `_os/playbook/claude-discipline.md` §8, CLAUDE.md ⑥번 룰 |
| D-050 | impersonate(매니저 시점) 미복원 — admin-manager-hub.html(상세)로 매니저 화면 진입 단일화 (옛 dashboard.html?impersonate 경로 BL-FLOW-3로 단절) | infra | 2026-05-30 | 확정 | BL-ADMIN-SIDEBAR-MISSING-ENTRIES done, `_admin/admin.html`, `admin-manager-hub.html` |

---

## 🔗 짝 문서 매핑 (DECISIONS.md 위치)

| ID | DECISIONS.md 섹션 / 라인 | 비고 |
|---|---|---|
| D-001 | 2026-04-26~28 (Phase 3 Step 4) | 엑셀 매칭 정책 본문 |
| D-002 | 2026-03 ~ 2026-04 (Phase 1~2 인프라) L629 | PayPal USD 결제 |
| D-003 | 2026-03 ~ 2026-04 (Phase 1~2 인프라) L165 | 영문 우선 + 한국어 토글 |
| D-004 | 2026-05-03 신규 (Charter v2 통합) | 부칙 5 신설과 동시 |
| D-005 | 2026-05-03 신규 (Charter v2 통합) | 부칙 6 신설과 동시 |
| D-006 | 2026-05-03 신규 (Charter v2 통합) | BUSINESS.md 15-A 통찰 6 |
| D-007 | 2026-05-03 신규 (Charter v2 통합) | BUSINESS.md 15-A 통찰 4 |
| D-008 | 2026-05-03 신규 (Charter v2 통합) | BUSINESS.md 15-A 통찰 5 |
| D-009 | 2026-05-03 신규 (Charter v2 통합) | BUSINESS.md 15-A 통찰 7 |
| D-010 | 2026-05-03 신규 (Charter v2 통합) + 2026-05-04 D-013로 개정 | BL-CENTRAL-HUB 1단계 후 발견된 카테고리 어긋남 해결 + admin-hub 폐기로 카테고리 0 이관 |
| D-011 | 2026-05-04 신규 | 대표님 병목 해제 — 단순 작업은 권한 직원이 트리거, 결정은 대표님 |
| D-012 | 2026-05-04 신규 | 대용량 fetch 분리 + admin-tasks 흡수 |
| D-013 | 2026-05-04 신규 | admin-hub 폐기 — 잉여 레이어 제거 (대표님 통찰 직접 반영) |
| D-014 | 2026-05-04 신규 | 헌법 6조(사람용+AI용 이중) 본체 — chat-logs/ 풀 디테일 + 인증 게이트 + 활동 이력 ↔ chat-log 4중 연결 |
| D-015 | 2026-05-05 신규 | BL-ADMIN-AUTH-V2 권한 정책 본체 |
| D-016 | 2026-05-04 신규 | Vercel Hobby 12 함수 한도 회피 위한 라우터 통합 |
| D-017 | 2026-05-08 신규 (최상단) | 토큰·키 라이프사이클 — 헌법 부칙 4 보강 + `_os/playbook/credentials-lifecycle.md` 신설 |
| D-018 | 2026-05-08 신규 (최상단) | Vercel Pro 결제 활성화 — 호스팅 인프라 안정화 + 헌법 위반(상업 사용) 해소 |
| D-021 | 2026-05-09 신규 (최상단) | BL-ADMIN-AUTH-PERF Edge Middleware 정석 — A-1 비정석 옵션 자가 반성 포함 |
| D-028 | 2026-05-12 신규 (Pending 섹션 직전) | 갤러리 완성도 + BEFORE/AFTER 이력 — 대표님 매니저 체험 중 발견 |
| D-047 | 2026-05-24 (DECISIONS.md L288~355) | BL-INVOICE-001 핑퐁 15라운드 합의 본체 — 핑퐁 원본은 `_decisions/pingpong/BL-INVOICE-001.json` |
| D-048 | 2026-05-24 (DECISIONS.md D-047 박스 직후) | 인보이스 시스템 단일 진실원 문서화 + 3개 BL 분담 확정 — 단일 진실원은 `_os/playbook/invoice-system.md` |
| D-049 | 2026-05-26 (DECISIONS.md 신규 박스) | 채팅 끊김 객관 트리거 4종 — 추상 규칙 → 객관 카운트 전환, 부칙 16.1 신설 |
| D-050 | 2026-05-30 (DECISIONS.md 최상단 신규 박스) | impersonate 미복원 — admin-manager-hub.html 단일화 / 매니저 화면 진입 통로 정리 |

---

## 📅 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-05-03 | 최초 작성 (Charter v2 통합 — D-001~D-009 등록) |
| 2026-05-04 | D-010 D-011 등록 (3-State 권한 + admin-status 범위) |
| 2026-05-04 | D-012 등록 (3-Layer 분리 + admin-tasks 흡수) |
| 2026-05-04 | D-013 등록 (admin-hub.html 폐기 + D-010 카테고리 0 이관 개정) |
| 2026-05-04 | D-014 등록 (chat-logs 시스템 — 사람용+AI용 이중 형식 강제 + 인증 게이트) |
| 2026-05-12 | D-028 등록 (갤러리 완성도 + BEFORE/AFTER 자동 이력 — 대표님 매니저 체험 중 발견) |
| 2026-05-24 | D-022~D-027 + D-029 + D-030 + D-039 9건 누락분 소급 등록 (자율 진행 중 INDEX-DECISIONS 동기화 검증 후 보강) |
| 2026-05-24 | D-047 등록 (BL-INVOICE-001 핑퐁 15라운드 합의 본체 — 인덱스 누락분 소급 등록) |
| 2026-05-24 | D-048 등록 (인보이스 시스템 단일 진실원 `_os/playbook/invoice-system.md` 신설 + 3개 BL 분담 확정) |
| 2026-05-26 | D-049 등록 (채팅 끊김 객관 트리거 4종 도입 — 부칙 16.1 신설 / CLAUDE.md ⑥ 보강 / discipline.md §8 신설) |
| 2026-05-30 | D-050 등록 (impersonate 미복원 — admin-manager-hub.html 단일화 / BL-ADMIN-SIDEBAR-MISSING-ENTRIES done) |
