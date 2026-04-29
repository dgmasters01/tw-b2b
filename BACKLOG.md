# TW B2B — 작업 백로그 (이슈 트래킹)

> 라이브 사이트 검증 중 발견된 모든 이슈/누락사항을 추적합니다.
> 우선순위: **P0(긴급)** > **P1(중요)** > **P2(개선)**
> 처리 완료 시 `[DONE]` 마크 후 하단 DONE 섹션으로 이동.

**마지막 업데이트**: 2026-04-29

> 💡 **새 채팅 시작 시**: 다음 5개 문서를 먼저 보면 즉시 컨텍스트 파악 가능.
>
> | 문서 | 용도 |
> |---|---|
> | **BUSINESS.md** ⭐ | 사업 방향 / 정책 / 가격 / 환불 정책 |
> | **DECISIONS.md** | 의사결정 변경 이력 (왜 이렇게 됐는가) |
> | **BUSINESS_FLOW.md** | 사용자 여정 (가입 → 결제 → 6개월) |
> | **BACKLOG.md** (이 파일) | 할 일 목록 (P0~P3) |
> | **admin-gallery.html** | 페이지 시각 갤러리 (라이브) |

---

## ✅ [DONE 2026-04-29] P0 — Admin Hotels 상세 패널 매니저 정보 누락 + 모달 닫기 불가
> 해결 완료. 상세는 CHANGELOG.md 참조. 본 섹션은 다음 정리 시 DONE 섹션으로 이동.

**배경**: Phase B PayPal 결제 검증 직후 발견. 어드민이 Hotels 탭 → View 클릭 시 호텔 상세 패널이 열리는데, 매니저 정보 3개 필드가 모두 빈 값(`-`)으로 표시됨.

**현상** (스크린샷 검증):
- ❌ Manager Email: `-` (실제 매니저 `joylife8760@naver.com` 미표시)
- ❌ Manager Name: `-`
- ❌ Manager Phone: `-`
- ❌ Review, Agoda URL, Agoda Hotel ID, Amenities도 동일하게 누락
- ❌ **모달 우상단 X 버튼 클릭 안 됨** — 모달이 닫히지 않아 다른 호텔 보려면 ESC 또는 새로고침 필요 (UX 치명적)
- ✅ 호텔 기본 정보(이름/주소/사진/좌표/Daily Rate)는 정상 표시

**비즈니스 임팩트**:
- 어드민이 결제한 호텔의 담당자에게 연락할 수 없음 → 영상 제작 진행/검수 단계에서 커뮤니케이션 단절
- "매니저=보고하는 사람(사장에게 PDF 전달)" 정책 (BUSINESS.md) 운영 불가
- 매니저 인수인계 워크플로(P1)도 이 정보 없으면 작동 안 함

**원인 추정** (실측 필요):
1. `admin.html`의 호텔 상세 패널 fetch 쿼리가 `hotels.user_id`를 통해 `auth.users` JOIN을 안 하고 있을 가능성
2. 또는 hotels 테이블에 매니저 정보 캐시 컬럼(manager_email/name/phone)이 있는데 회원가입 시점에 안 채워지고 있을 가능성
3. RLS 정책이 admin이 auth.users 조회를 막고 있을 가능성 (Phase 3에서 admin 전용 정책 추가했지만 누락된 케이스일 수 있음)

**작업 항목** (다음 채팅에서):
1. [실측] admin.html에서 hotel 상세 fetch 쿼리 확인 (어떤 컬럼/JOIN 쓰는지)
2. [실측] hotels 테이블에 manager_email/name/phone 컬럼 존재 여부 확인
3. [수정] 가장 단순한 해결: hotels 테이블 INSERT 시점(hotel-info.html `btn-save` 핸들러)에서 auth.users의 email/name/phone을 hotels의 캐시 컬럼에 함께 저장
4. [검증] admin.html View 클릭 시 매니저 3개 필드가 채워지는지 확인
5. [추가 누락 필드 검토]: Review, Agoda URL/Hotel ID, Amenities는 별도 수동 입력 필드일 수 있음 — 이 필드들이 매니저 또는 어드민 어느 쪽 책임인지 BUSINESS.md에서 정책 확정 필요
6. **[모달 X 버튼 수정]** admin.html 호텔 상세 모달의 우상단 닫기 버튼(`×`)이 클릭되지 않음. 이벤트 핸들러 미연결 또는 z-index 이슈 추정. 추가로 ESC 키 / 모달 외부 클릭 시 닫힘도 함께 구현 (UX 표준).
7. **[통합 작업]** 이 이슈와 동일 뿌리: 하단 P2 Issue #3 (Hotels 목록의 MANAGER 컬럼 비어있음). 같은 PR로 함께 해결할 것 — 목록 화면(`renderHotels`)과 상세 패널(View) 양쪽에 동일한 데이터 흐름 적용.

**검증 데이터** (현재 기준):
- 매니저 계정: joylife8760@naver.com (시크릿 창에서 가입 + 결제까지 완료)
- 호텔: The Westin Tokyo (status=paid, $480 daily rate)
- 결제: 2026-04-29 / $200 / paypal / succeeded
- 이 데이터로 수정 후 회귀 테스트 가능

**관련 메모리**: `[TW B2B 핵심 데이터 흐름 원칙]` (#15) — hotels 테이블이 single source of truth, 매니저 정보가 어드민/매니저 양쪽에 즉시 자동 반영되어야 함. 이 원칙이 매니저 정보에 대해서는 깨져 있는 상태.

---



**배경**: 결제 검증 중 발견 — 현재 dashboard.html에 결제 박스가 노출되는 흐름이 비즈니스적으로 비효율. 결제 후에도 결제 박스가 그대로 보여 중복 결제 위험.

**대표님이 원하는 흐름**:
```
가입 → 호텔 등록 → 관리자 승인
  → [세일즈 페이지] (sales.html) — 우리 가치 어필 + 결제 CTA
  → 결제
  → [매니저 성과 페이지] (marketing.html) — 영상 진행 / 채널 통계 / 인보이스 다운로드
```

**작업 항목**:
1. **sales.html 신설** ⭐ "전세계 1등" 디자인 (Stripe/Notion/Linear 수준)
   - 전체화면 히어로 + 그라데이션 배경
   - 실시간 통계 카운트 애니메이션 (영상 수 / 조회수 / 채널 수)
   - 프로세스 시각적 타임라인 (결제 → 제작 → 노출 → 보장)
   - 5개 언어 채널 강력한 시각화 (각 채널 구독자 / 예시 영상)
   - 6개월 보장 배지/도장
   - 호텔 후기 카루셀
   - FAQ 아코디언
   - PayPal 결제 (두 번째 CTA 포함)
   - 영문 우선 + 한국어 토글

2. **marketing.html 신설** ⭐ "전세계 1등" 대시보드 디자인
   - 큰 숫자 3개 (조회수 / 예약 / 누적 매출)
   - 시각적 프로세스 진행 바 (6개월 D-Day)
   - 6채널 그리드 (각 채널별 조회수 카드)
   - 시간별 조회수 차트 (우상향 그래프)
   - PDF 보고서 다운로드 (강조 버튼)
   - 호텔 스토리 섹션 (우리와 함께한 시간) ⭐
   - 빠른 액션 (담당자 변경 / 정보 수정)

3. **dashboard.html 단순화** — status별 redirect 페이지로

4. **status별 자동 라우팅** —
   - `pending`/`review` → hotel-info.html (검수 모드)
   - `approved` → sales.html (자동 redirect)
   - `paid`/`producing`/`published` → marketing.html

**참고**: 이전 채팅에서 비슷한 페이지를 만든 적이 있다고 대표님이 기억하셨으나, GitHub repo 검색 결과 존재하지 않음. 새로 깨끗하게 만드는 것으로 결정.

**관련 파일**: `dashboard.html`, `hotel-info.html`, `admin-gallery.html`

**예상 작업 시간**: 1.5~2시간 (큰 작업 — 새 채팅 권장)

---

## 🔴 P0 — 통합 To-Do Inbox (관리자 대시보드 재설계) ⭐⭐⭐ 2026-04-29

**배경** (대표님 핵심 운영 철학):
> "한 사람이 처리해야 될 업무는 한 곳에서 우선순위가 표시되어 체크하면 정리할 수 있게 해야 됨. 내가 복잡하게 관리하게 하면 안 됨. 나에게 유리하게 해야 됨."

대표님 1인 운영. 처리 작업이 여러 탭에 흩어져 있으면 누락 발생. 한 곳에 통합 필요.

**작업 항목**:
1. **admin.html Dashboard 탭 = To-Do Inbox** 으로 재설계
   - 모든 처리 작업이 한 곳에 모임
   - 우선순위 자동 정렬 (긴급 → 중요 → 일반)
   - 체크박스로 완료 처리

2. **표시될 작업 목록**:
   - 🔴 호텔 승인 대기 (status=pending/review)
   - 🟠 Agoda 매칭 실패 (manual_pending)
   - 🟡 호텔 정보 변경 신청 (Tier 3)
   - 🟢 영상 제작 시작 대기 (status=paid)
   - 🔵 영상 노출 시작 대기 (status=producing)
   - ⚪ 담당자 교체 신청
   - 📊 6개월 보장 D-30 임박 호텔 (영업 우선)

3. **각 작업 클릭 시**:
   - 모달 또는 새 탭으로 처리 화면 즉시 표시
   - 처리 완료 → 인박스에서 자동 사라짐
   - 처리 이력은 별도 로그 테이블에 보존

4. **관련 작업 위치 통합**:
   - "Agoda Matching" 별도 탭 → Dashboard 인박스로 흡수 (필요 시 상세 보기만 분리)
   - "변경 승인" 별도 탭 신설 X → Dashboard 인박스에 포함
   - Hotels / Members 탭은 "조회/검색용" 으로만 유지

**관련 파일**: `admin.html` 대대적 재설계, 새 API: `/api/admin-todo.js`

**예상 작업 시간**: 1.5~2시간 (큰 작업)

---

## 🔴 P0 — Agoda 예약 검증 시스템 (Booking Verification) ⭐⭐ 2026-04-29

**배경** (대표님 핵심 비즈니스 통찰):
> "아고다의 본인 확인 할 수 있는 것을 제공해줘야 돼. TW Booking Analytics에서 호텔별로 예약번호, 예약날짜, 시간 등 대조할 수 있는 것."

**핵심 가치**:
- 우리가 "예약 N건 발생" 이라고 말로만 하면 매니저는 못 믿음
- 매니저가 본인 Agoda Partner Hub에서 직접 대조 가능 → 완벽한 증거
- 신뢰 = 비즈니스의 생존

**작업 항목**:
1. **DB 통합**: TW B2B ↔ TW Booking Analytics 데이터 연결
   - hotels.agoda_hotel_id ↔ booking.hotel_id 매칭
   - 매니저 결제 호텔에 한해서만 노출

2. **채널 매핑 시스템** ⭐ 2026-04-29 추가
   - `channel_cid_map` 테이블 신설
   - 5개 채널 ↔ Agoda CID 매핑
   - bookings.cid → bookings.channel_id 자동 변환
   - "기타 채널" 폴백 처리

3. **API 신설**: `/api/hotel-bookings.js`
   - 본인 호텔 예약만 조회 (RLS)
   - 개인정보 자동 마스킹 (이름/이메일/전화 제거)
   - 예약번호/날짜/금액/국가/**채널/유입 영상** 반환

4. **marketing.html 핵심 섹션**:
   - "📞 8건의 예약이 발생했습니다" (1순위, 가장 크게)
   - "💰 추정 매출 / ROI"
   - "[예약 상세 보기]" 펼침 → 예약번호 + **채널 정보** 목록
   - **채널별 전환 분석** (한국어 5건, 영어 3건...) ⭐
   - "Agoda Partner Hub에서 직접 확인하세요" 링크

5. **자동 매출 계산**:
   - 평균 객실 단가 × 박수 × 예약 건수
   - ROI = 추정 매출 / $200
   - **채널별 매출 합계** 자동 계산 ⭐

6. **개인정보 처리**:
   - GDPR / 개인정보보호법 준수
   - 매니저는 본인 호텔만 (RLS 정책)

**관련 문서**: BUSINESS.md §7-D 신설, 결정 1-J + 1-K

**관련 파일**: `api/hotel-bookings.js` (신설), `marketing.html` (예약 섹션), TW Booking Analytics DB 연결, `channel_cid_map` 테이블

**예상 작업 시간**: 2~3시간 (중간 작업)

---

## 🔴 P1 — 매니저 정보 변경 시스템 (3-Tier 차등) ⭐ 2026-04-29

**배경** (대표님 통찰):
> "매니저 가입하면 내용이 잘못 되었을 경우, 변경해야 될 경우, 승인 필요할까?"

호텔 바꿔치기 / 영상 재제작 비용 방지 위해 비즈니스 영향도에 따라 차등 처리.

**3-Tier 정책** (BUSINESS.md §7-A 참조):
- Tier 1 (즉시 변경): 비밀번호, 휴대폰, 직책, 마케팅 동의
- Tier 2 (즉시 + 알림): 이메일, 사진, 이름 오타
- Tier 3 (관리자 승인 필수): 호텔명, 주소, Agoda 링크, 등급

**작업 항목**:
1. **settings.html 강화**
   - 휴대폰 / 직책 / 마케팅 동의 변경 (Tier 1)
   - 이메일 변경 (Tier 2, 재인증 필수)
   - "호텔 정보 변경 신청" 버튼 (Tier 3)
   - 변경 이력 로그 표시

2. **`hotel_change_requests` 테이블 신설**
   - 매니저 변경 신청 → 관리자 승인 큐

3. **admin.html "변경 승인" 탭 신설**
   - Tier 3 신청 목록
   - 승인/거절 + 사유 입력

4. **변경 이력 로그 시스템** — 누가/언제/무엇을/왜

**관련 파일**: `settings.html`, `admin.html`, `api/hotel-change-request.js` (신설)

---

## 🔴 P1 — 호텔 담당자 교체 시스템 (Manager Handover) ⭐ 2026-04-29

**배경** (대표님 통찰):
> "호텔 담당자가 바뀔 수 있으니깐. 기존에 누구의 이름으로 결제를 했는지 표시 정리해 놓을. 이분들이 시스템을 계속 이용하면 스토리도 알 수 있잖아."

매니저는 떠나도 호텔은 남는다. 결제 이력은 호텔에 영구 귀속.

**작업 항목**:
1. **`hotel_managers` 테이블 신설**
   - 한 호텔에 여러 매니저 가능 (primary + secondary)
   - current / former 구분
   - started_at / ended_at / handover_from

2. **데이터 마이그레이션**
   - 기존 hotels.manager_id → hotel_managers 테이블
   - 모든 기존 매니저 → role=primary, current=true

3. **`payments.paid_by_user_id`** 컬럼 추가
   - 결제 당시 매니저 ID 영구 보존

4. **인수인계 워크플로**
   - settings.html "호텔 담당 인수인계" 버튼
   - 새 담당자 이메일 → 초대 메일
   - handover-accept.html (초대 수락 페이지)
   - 권한 자동 이관

5. **권한 매트릭스 적용 + RLS 업데이트**
   - primary / secondary / former 구분

6. **이전 담당자 read-only 접근** — marketing.html 평생 조회

**관련 파일**: `settings.html`, `handover-accept.html` (신설), `api/hotel-handover.js` (신설)

**예상 작업 시간**: 2~3시간 (중간 작업)

---

## 🟡 P2 — 호텔 스토리 / LTV 추적 ⭐ 2026-04-29

**배경**: 장기 고객 = 영업 자산. "Lotte는 3번 결제한 충성 고객" 같은 분석 가능.

**작업 항목**:
1. **DB 뷰**: `hotel_lifetime_stats` (자동 집계)
2. **admin.html 호텔 상세 페이지 강화** — 거래 요약 / 담당자 이력 / 영상 이력 / 영업 인사이트(사실 기반)
3. **marketing.html "호텔 스토리" 섹션** — 우리와 함께한 시간 (등급 표시 X)
4. **영업 자료 CSV export** — 재계약 후보 리스트

**제외**: 고객 등급 시스템(Bronze/Silver/Gold/Platinum) — 대표님 결정으로 폐기 (호텔 매니저 자존심 문제)

**관련 파일**: SQL 마이그레이션, `admin.html`, `marketing.html`

---

## 🔴 P1 — 자동 알림 메일 시스템 누락

**배경**: 호텔 상태 변경 시 매니저에게 자동 알림 메일이 발송되어야 하는데, `admin.html`의 `changeStatus()` 에서 DB만 업데이트하고 메일 발송 로직 없음.

**현재 동작 중인 메일** (정상):
- ✅ 회원가입 인증 메일
- ✅ ops 알림 메일 (`/api/email/ops/notify-claude-work`)
- ✅ 결제 완료 시 ops 메일 (`/api/paypal` capture-order)
- ✅ DB 저장 실패 시 ops 긴급 메일

**누락된 매니저 알림 메일**:
1. 호텔 등록 시 → "Hotel registered, under review"
2. 호텔 승인 시 (`approved`) → "Approved! Please complete payment" + sales.html 링크
3. 호텔 거절 시 (`rejected`) → "Registration not approved — reason"
4. 결제 완료 시 (`paid`) → 인보이스 PDF 첨부 + marketing.html 링크
5. production 시작 시 (`producing`) → "Production started! Estimated delivery: X days"
6. published 시 → "🎉 Your video is live!" + 영상 링크

**작업 위치**:
- `admin.html` `changeStatus()` 함수에 메일 발송 추가
- `hotel-info.html` `btn-save` 핸들러의 createHotel 직후
- `api/paypal.js` capture-order 성공 후 매니저 인보이스 메일 발송
- 새 파일: `api/email/system/notify-status-change.js` (Resend 연동)

---

## 🟡 P2 — 호텔 검색 UX 이슈

### Issue #1: 호텔 검색 결과 정렬 부정확
**현상**: `Lotte Hotel S` 입력 시 결과 순서: Seattle → New York → Chicago → New York → Seoul (5번째). 한국 사용자에게 Seoul이 가장 마지막에 표시.

**해결**: 가입 시 country 받아 location bias로 사용 / 기본 location bias를 한국 좌표로 / review_count DESC 정렬.

**관련 파일**: `api/google-places.js`, `hotel-info.html`

### Issue #2: 짧은 검색어로 결과 0건
**현상**: `Lotte` (5글자) → "No results". `Lotte Hotel S` → 5개 결과.

**해결**: 짧은 검색어 시 자동 city 추론 / 결과 0건 시 친절한 안내 / lodging 필터 완화.

**관련 파일**: `api/google-places.js`, `hotel-info.html`

---

## 🟡 P2 — Admin Console UI 버그

### Issue #3: Hotels 목록의 MANAGER 컬럼 비어있음 ✅ [DONE 2026-04-29]
**현상**: Admin Console > Hotels > Hotel Partners 목록에서 MANAGER 컬럼이 "-"로 표시됨. 매니저 정보(이지형 / leejifilm@hanmail.net)가 표시되어야 함.

**원인**: 컬럼명 불일치 — hotel-info.html은 `contact_name`/`contact_email`/`contact_phone` 저장, admin.html은 `manager_email`/`manager_name`/`manager_phone` 조회 → admin.html에 fallback 추가로 해결 (CHANGELOG 2026-04-29 참조).

**관련 파일**: `admin.html`

---

## 🟡 P2 — Chrome 안전 브라우징 경고

**현상**: 대표님 Chrome 일반 모드에서 `gohotelwinners.com` 접속 시 "위험한 사이트" 경고. 시크릿 모드/Edge에서는 정상.

**진단**: Google Safe Browsing — 2020-04-08 멀웨어 페이지 보관 이력 (이전 도메인 소유자 흔적). 현재 데이터 없음. Chrome 캐시 잔존.

**해결 옵션**:
- A. Chrome 캐시 정리 (5분): `chrome://safebrowsing/` → Refresh Lists
- B. Google Search Console 재검토 요청 (24~72시간)
- C. 새 도메인 전환 (가장 안전, $10~20): `travelwinners.io` 등

**현재 영향**: 대표님 본인 환경만. 다른 사용자에게는 영향 없음 추정.
**결정 시점**: 매니저 영업 시작 전 (B 또는 C 권장)

---

## 🟢 P3 — Chrome 확장 프로그램 간섭 (사용자 환경)

**현상**: `subtitle.js` 확장 프로그램(자막/번역)이 페이지 JS에 간섭. 콘솔 에러 `Extension context invalidated`.

**영향**: 사이트 동작에는 영향 없음. 디버깅 시 노이즈만 증가.

**해결**: 대표님 환경에서 확장 프로그램 비활성화. 코드 수정 불필요.

---

## ⏳ Phase 3 D단계 — PayPal 검증 후 진행

### D-1. 회원 탈퇴 기능
- 매니저가 자기 계정 삭제 가능
- 호텔 데이터 처리 (cascade vs soft delete 결정)
- Confirm 모달 필수

### D-2. 이메일 변경 기능
- 매니저 settings에서 이메일 변경
- 새 이메일 인증 필수
- 변경 이력 로그

### D-3. Custom SMTP (Resend 도메인 인증)
- Resend → Domains → gohotelwinners.com 추가
- DNS 레코드 추가 (Vercel 도메인 관리)
- 발신자 `noreply@gohotelwinners.com` 통일

---

## 🚀 Live 전환 작업 (Sandbox 검증 완료 후)

- `PAYPAL_ENV` 환경변수: `sandbox` → `live`
- PayPal Live Webhook 별도 등록
- `PAYPAL_WEBHOOK_ID` 환경변수 갱신
- 실제 결제 1건 테스트 ($1 소액)
- 환불 프로세스 검증

---

## 🔒 보안 — 토큰 폐기

이전 채팅에서 평문 노출된 토큰 폐기 필요:
1. **GitHub PAT** (`ghp_eLTTsY...`) — GitHub Settings → PAT → Revoke
2. **Supabase MGMT_TOKEN** (`sbp_b9475...`) — Supabase Account → Access Tokens → Revoke
3. **Supabase SERVICE_ROLE** (`sb_secret_Gbyfly...`) — Settings → API Keys → Rotate (Vercel 갱신)
4. **CLAUDE_OPS_TOKEN** (`sV1IWuv...`) — Vercel 환경변수 변경

**Supabase 토큰 만료**: 2026-05-26 (D-28). 5월 19일 알림.

---

## ✅ DONE

### 2026-04-29
- ✅ **[P0 버그수정] Admin Hotels 상세 패널 매니저 정보 누락 + 모달 X 버튼 미동작**
  - 모달 X 버튼 핸들러 capture 단계 + stopPropagation으로 강화
  - ESC 키 닫기 추가, 외부 overlay 클릭 닫기 유지
  - Hotels 목록 + 상세 패널의 매니저 정보 fallback 추가 (`contact_*` 컬럼 우선 활용)
  - 컬럼명 불일치 문제 해결 (DB 변경 없이 코드만 수정)
  - 동시 해결: P2 Issue #3 (Hotels 목록 MANAGER 컬럼 비어있음)
  - 변경 파일: `admin.html`, `CHANGELOG.md` 신설

- ✅ **PayPal 결제 시스템 완전 작동 검증**
  - 첫 결제 성공: $200 USD, capture_id `85V07166676483251`, hotel `Lotte Hotel Seattle`
  - 결제 데이터 DB 정상 저장 (수동 복구 후 자동 표시)
  - 호텔 status: approved → paid 자동 변경 트리거 작동 (수정 후)

- ✅ **PayPal 통합 4가지 critical 버그 수정**
  1. `SUPABASE_ANON_KEY` Vercel 환경변수 추가 (401 해결)
  2. `payee.merchant_id`를 sandbox에서는 보내지 않도록 수정 (PAYEE_ACCOUNT_INVALID 해결)
  3. payment status 매핑: `'completed'` → `'succeeded'` (DB CHECK 제약 위반 해결)
  4. 트리거 함수 `sync_hotel_paid_status` 조건 `'completed'` → `'succeeded'` 동기화

- ✅ **`mapPayPalStatusToDb()` 헬퍼 추가** — PayPal status 5종을 DB 허용 status 5종으로 안전 매핑

- ✅ **Page Gallery 시스템 신설** (admin-gallery.html)
  - 모든 페이지 시각적 한눈 보기 + status 분류 + 라이브 링크 + BEFORE/AFTER 모달
  - 자동 캡처 스크립트 (`scripts/capture-pages.mjs`) - Playwright 기반
  - 페이지 메타데이터 단일 소스 (`scripts/pages-meta.mjs`)
  - admin.html 사이드바에 Page Gallery 메뉴 추가
  - **6개 public 페이지 자동 캡처 완료** (index/signup/login/forgot/reset/verify)

### 2026-04-28
- ✅ **Phase 3 Step C — PayPal Checkout 통합** (단일 router, 67/67 검증 통과)
- ✅ Supabase Management API 자동 SQL 실행 워크플로 정착
- ✅ Vercel 환경변수 5종 등록 (PayPal sandbox+live + merchant ID)
- ✅ PayPal Sandbox Webhook 등록 + 5개 이벤트 구독
- ✅ 호텔 등록 → 관리자 승인 → 결제 흐름 라이브 검증
