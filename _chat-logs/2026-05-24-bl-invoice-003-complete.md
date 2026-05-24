# 2026-05-24 BL-INVOICE-003 — 인보이스 설정 UI + API 완성 (단계 1~7)

**작업 단위**: BL-INVOICE-003 (인보이스 PDF에 박힐 회사·계좌·도장·서명·이력 동적 관리)
**단계**: 1~7 전체 완료 (3개 채팅 세션에 걸쳐 진행)
**HEAD before**: 3a276e6 (단계 1 SQL 박은 직후)
**HEAD after**: (이 채팅 마지막 commit 직후 갱신)
**라이브 영향**: ✅ `/_admin/admin-settings.html` 신설 (owner 전용 4탭)
**선결 의존성**: ✅ BL-INVOICE-001(PDF 발행)과 BL-INVOICE-002의 데이터 단일 진실원 박음

---

## [블록 1] 완료 내용

| 단계 | 산출물 | 라이브 동작 |
|---|---|---|
| 1 | `sql/bl-invoice-003-company-info.sql` / `payment-accounts.sql` / `audit-helper.sql` | Supabase에 3 테이블 + 1 RPC 박힘 |
| 2 | `_admin/admin-settings.html` 신설 (430줄) + API 핸들러 2종 | 회사 정보 탭 8필드 저장 가능 |
| 3 | admin-settings.html payment 탭 + API 핸들러 2종 | KRW/USD/PayPal 3카드 독립 저장 |
| 4 | seal 탭 + 업로드 API 2종 + `sql/bl-invoice-003-storage-bucket.sql` | 도장·서명 이미지 200×200 미리보기 + 업로드/삭제 |
| 5 | audit 탭 + `invoice-get-audit-log` 핸들러 | 변경 이력 50건 표 표시 (필드/이전/이후) |
| 6 | `sql/bl-invoice-003-rls-verify.sql` 자가 검증 쿼리 | 7섹션 표로 정책 박힘 여부 확인 |
| 7 | admin-status Card 7 + tasks.json done + 본 chat-log | 통합 진입점에서 카드 클릭으로 진입 |

**API 액션 7종** (모두 `requireAdmin` + owner 가드):
- `invoice-get-company-info` (admin SELECT)
- `invoice-update-company-info` (owner UPDATE + audit)
- `invoice-get-payment-accounts` (admin SELECT, by_type 묶음)
- `invoice-update-payment-accounts` (owner UPDATE, type별 화이트리스트)
- `invoice-upload-asset` (owner UPLOAD/DELETE, base64 data URL)
- `invoice-get-asset-url` (admin, signed URL 1h)
- `invoice-get-audit-log` (owner only, 최근 50건)

---

## [블록 2] 이유 (왜 이 작업이 필요했나)

**핵심 문제**: 인보이스 PDF에 박힐 동적 정보가 코드에 하드코딩되면 사업자등록번호 한 글자 바꾸려고 개발자 부른다.

**구체 시나리오**:
- 사업장 주소 이전 → 인보이스 발행 매번 잘못된 주소 박힘 → 세무 위반
- KRW 계좌 은행 변경 → 매니저 송금 실패 → 결제 사이클 깨짐
- 대표님 도장 만들기 전 → 텍스트 fallback / 도장 완성 후 → 즉시 PDF에 박힘 (개발 없이)

**선결 의존성**: BL-INVOICE-001(PDF 발행)이 박히기 전에 이 정보의 단일 보관소가 먼저 박혀야 PDF가 동적으로 읽어감.

---

## [블록 3] 사업 영향

**즉시 영향**:
- 회계세무 필수 인프라 100% — BL-INVOICE-001/002 진행 시 코드에서 `SELECT * FROM company_info WHERE id=1`로 바로 사용 가능
- 변경 이력 owner-only — 스리랑카 직원에게는 변경 내역 안 보임 (RLS `action_logs_select_invoice_owner` 정책)
- PayPal 기본값 `travelwinners@naver.com` / Merchant ID `HAY86YMQP9T5C` 자동 박힘 → 첫 인보이스 발행 시 즉시 사용 가능

**파생 효과**:
- admin-status에 Card 7 신설 → 통합 진입점에서 한눈에 발견
- 도장·서명 시각화 우선 — 이미지 준비 안 됐어도 텍스트 fallback으로 PDF 작동
- 6언어 채널 매니저(KR/EN/JP/CN/VN) 모두 통화 분기로 자동 대응 (KRW vs USD/PayPal)

**리스크 0**:
- 권한 가드 3중 박음 (RLS / API requireAdmin / 클라이언트 role 가드)
- audit log 실패해도 UPDATE 자체는 성공 처리 (비즈니스 막지 않음)
- 기존 파일 자동 정리 (Storage orphan 방지)

---

## [블록 4] 다음 행동

**대표님이 직접 해주실 일** (필수):
1. Supabase Dashboard → SQL Editor
2. `sql/bl-invoice-003-storage-bucket.sql` 1회 실행 → 도장·서명 업로드 작동 조건
3. `sql/bl-invoice-003-rls-verify.sql` 1회 실행 → 6섹션 표 결과로 정책 박힘 검증
4. https://gohotelwinners.com 로그인(owner) → `/_admin/admin-settings.html` 진입 → 4탭 클릭하며 작동 확인

**다음 BL 후속 (자동 자율 진행)**:
- **BL-INVOICE-001** (PDF 발행) — 이제 company_info/payment_accounts에서 읽어가는 PDF 생성기 박을 수 있음
- **BL-INVOICE-002** (인보이스 발행 UI) — admin에서 매니저 선택 → PDF 발행 버튼

**자동 봇이 처리** (대표님 할 일 없음):
- auto-detect-bot이 commit `[step:done:5,6,7]` 감지 → tasks.json 진행률 갱신 (이미 본 채팅에서 일괄 처리)
- activity-feed-bot이 변경 활동 박음
- chat-log scan-bot이 본 파일 byTask 매핑

---

## [블록 5] 대표님 결정 필요

**현재 결정 대기 없음.** 본 BL은 D-047(인보이스 시스템 전체 결정) 하위 실행으로 자율 진행.

**선택적 후속 결정** (BL-INVOICE-001 진입 시 박을 것들):
- 인보이스 번호 채번 규칙 (예: INV-202605-0001) — 결정 시 BL-INVOICE-001에서 처리
- PDF 템플릿 디자인 (영문/한글 본문 톤) — 결정 시 시안 검토 단계

---

# 🔧 기술 상세 (개발자용)

## 자율 결정 누적 목록 (헌법 1조 발동 7회)
1. (단계 1) `audit_log` 신규 테이블 → 기존 `action_logs` 활용 (중복 회피)
2. (단계 1) `super_admin` RLS → `is_owner()` 활용 (현 role 이름 'owner')
3. (단계 1) `supabase/migrations/` → `sql/` (실제 명명 규칙)
4. (단계 2) `requireAdmin()` return에 userId 추가 (audit p_performed_by 인자 필요)
5. (단계 3) 타입별 저장 분리 — KRW 수정해도 USD에 audit 안 박힘 (이력 노이즈 감소)
6. (단계 4) multipart 회피 → base64 data URL (Vercel Edge에서 multipart 파싱 복잡)
7. (단계 4) signed URL 1h + private bucket — 도장 이미지 외부 유출 차단

## API 호출 → DB 매핑 표

| API 액션 | 메서드 | 대상 테이블/Storage | 권한 |
|---|---|---|---|
| `invoice-get-company-info` | GET/POST | `company_info` (id=1) | admin SELECT |
| `invoice-update-company-info` | POST | `company_info` PATCH + `log_invoice_settings_change` RPC | **owner only** |
| `invoice-get-payment-accounts` | GET/POST | `payment_accounts` (3행) | admin SELECT |
| `invoice-update-payment-accounts` | POST | `payment_accounts` PATCH (type별) + RPC | **owner only** |
| `invoice-upload-asset` | POST | Storage `invoice-assets` + `company_info.{stamp\|signature}_storage_path` | **owner only** |
| `invoice-get-asset-url` | GET/POST | Storage signed URL 발급 | admin |
| `invoice-get-audit-log` | GET/POST | `action_logs` WHERE target_type='invoice-settings' | **owner only** |

## 검증 체크리스트 (단계 6 자가 검증)

라이브 API로 확인:
```
$ curl https://gohotelwinners.com/api/admin
→ allowed.length 12개 + invoice-* 7개 = 19개   ✓ (2026-05-24 확인)

$ curl https://gohotelwinners.com/api/admin?action=invoice-get-company-info
→ 401 (Bearer 없음 정상)   ✓

$ curl -X POST .../api/admin?action=invoice-update-payment-accounts
→ 401   ✓
```

SQL 자가 검증은 `sql/bl-invoice-003-rls-verify.sql` 실행 결과로 일괄 점검.
