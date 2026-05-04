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
| D-010 | 카테고리별 단일 진실 파일 매핑 표준 (4 카테고리 각각의 .md/.json 명시) | infra | 2026-05-03 | 확정 | BL-CATEGORY-REMAP |
| D-011 | 3-State 권한 시스템 (🤖 자동 / 👥 직원 / 👤 대표님) + 영·한 체계 + admin-status 범위 | infra | 2026-05-04 | 확정 | BL-STATUS-DASH |

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
| D-010 | 2026-05-03 신규 (Charter v2 통합) | BL-CENTRAL-HUB 1단계 후 발견된 카테고리 어긋남 해결 |
| D-011 | 2026-05-04 신규 | 대표님 병목 해제 — 단순 작업은 권한 직원이 트리거, 결정은 대표님 |

---

## 📅 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-05-03 | 최초 작성 (Charter v2 통합 — D-001~D-009 등록) |
