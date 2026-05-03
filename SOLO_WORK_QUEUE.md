# TW B2B — 자율 작업 큐 (Solo Work Queue)

> ⚠️ **이 파일은 자동 생성됩니다.** 수동 편집하지 마세요.
> 단일 진실 소스: `tasks.json` (v2.0)
> **데드라인**: 2026-05-03
> **갱신**: 2026-05-03
> **목적**: 대표님 외근/자리비움 시 Claude 자율 처리 가능 작업

## 작업 분류 체계

| 마크 | 의미 | Claude 자율 처리 |
|---|---|---|
| 🟢 **AUTO** | 즉시 자율 진행 가능 | ✅ |
| 🟡 **SEMI** | 일부 자율, 디자인/문구는 보수적 | ✅ (검수 표시) |
| 🔴 **BLOCKED** | 대표님 결정 후에만 진행 | ❌ |

---

## 🔥 P0 — 데드라인 직결 작업

### A. 🟢 AUTO — [Aurora 통일 캠페인] 디자인 시스템 미적용 페이지 일괄 마이그레이션

**ID**: `BL-AURORA-MIGRATION`  
**카테고리**: design-system  
**예상 시간**: 8시간  
**결정 필요 사항**:
- D-005

**메모**: Aurora Trendy(C3) 전면 적용. 사업 시작 전 완료 의무. 임시 디자인 금지.

---

### B. 🟢 AUTO — [매니저 대시보드 신규 제작] 한 화면 7영역 (5초 파악)

**ID**: `BL-MANAGER-DASH-001`  
**카테고리**: feature  
**예상 시간**: 12시간  
**결정 필요 사항**:
- D-007
- D-008

**메모**: 7영역: 진행단계 / 호텔정보 / 콘텐츠 / 노출채널 / 예약결과 / 6개월보장+재제작 / 매출추정. 조회수는 보조.

---

### C. 🟢 AUTO — 통합 To-Do Inbox (관리자 대시보드 재설계)

**ID**: `BL-002`  
**카테고리**: dev  
**예상 시간**: 미정시간  

**메모**: ## 🔴 P0 — 통합 To-Do Inbox (관리자 대시보드 재설계) ⭐⭐⭐ 2026-04-29  **배경** (대표님 핵심 운영 철학): > "한 사람이 처리해야 될 업무는 한 곳에서 우선순위가 표시되어 체크하면 정리할 수 있게 해야 됨. 내가 복잡하게 관리하게 하면 안 됨. 나에게 유리하게 해야 됨."  대표님 1인 운영. 처리 작업이 여러 탭에 흩어져 있으면 누락 발생. 한 곳에 통합 필요.  **작업 항목**: 1. **admin.html Dashboard 탭 = To-Do Inbox** 으로 재설계    - 모든 처리 작

---

### D. 🟢 AUTO — TW B2B 중앙 작업 관리 시스템 구축 (1단계: 데이터 통합 + 백업)

**ID**: `IP-CTRL-001`  
**카테고리**: dev  
**예상 시간**: 2시간  

**메모**: 1단계 완료 후 다음 채팅에서 화면 통합 + 자율 큐 + 진행률 + 롤백 UI 작업

---

## 🟡 P1 — 데드라인 이전에 있으면 좋음

### A. 🟢 AUTO — [YouTube 더보기 단축 URL 클릭 카운트] 호텔별 진성 관심 측정 시스템

**ID**: `BL-TRACK-001`  
**카테고리**: analytics  
**예상 시간**: 6시간  
**결정 필요 사항**:
- D-006

**메모**: gohotel.win/h/{hotel_id} → Supabase 카운트 +1 → Agoda 어필리에이트 리디렉션. 호텔별/순위별 분리.

---

### B. 🟢 AUTO — [인보이스/영수증 PDF 자동 생성·다운로드] 영구 보관 (1년+)

**ID**: `BL-INVOICE-001`  
**카테고리**: feature  
**예상 시간**: 5시간  
**결정 필요 사항**:
- D-009

**메모**: 결제 직후 자동 발송 + 매니저 대시보드 별도 탭에서 1클릭 다운로드. PDF 3종: 인보이스/영수증/6개월리포트.

---

### C. 🟢 AUTO — [JOURNEY.md 매니저 여정 정리] 비즈니스 독스 카테고리 강화

**ID**: `BL-JOURNEY-DOC`  
**카테고리**: documentation  
**예상 시간**: 1시간  
**결정 필요 사항**:
- D-004

**메모**: 8단계 매니저 여정 (A 결제전 → B 결제직후 → C 대시보드 → D 서류 → E 6개월 종료).

---

### D. 🟢 AUTO — 자동 알림 메일 시스템 (BACKLOG의 P1)

**ID**: `SQ-G`  
**카테고리**: dev  
**예상 시간**: 미정시간  

**메모**: ### G. 🟢 AUTO — 자동 알림 메일 시스템 (BACKLOG의 P1) **작업 내용**: BACKLOG.md L280 참조. 6개 트리거 메일 구현 - 호텔 등록 / 승인 / 거절 / 결제 완료 / 영상 제작 시작 / 영상 게시 - 기존 `sendSystemEmail` 함수 활용 - 영어 본체 + 한국어 토글 (i18n 일괄 작업 시점까지 영어만)  **예상 시간**: 2시간 **자율 진행 사유**: 메일 템플릿은 BUSINESS.md 정책 그대로 사용  ---

---

### E. 🟢 AUTO — Supabase Management API 토큰 갱신 알림 자동화

**ID**: `SQ-H`  
**카테고리**: infra  
**예상 시간**: 미정시간  

**메모**: ### H. 🟢 AUTO — Supabase Management API 토큰 갱신 알림 자동화 **작업 내용**: 토큰 만료 7일 전 ops 메일 자동 발송 (현재 토큰 만료 5/26) - Vercel Cron 또는 Supabase Edge Function 사용 - 현재는 메모리에만 알림 메모, 자동화 안 됨  **예상 시간**: 1시간 **자율 진행 사유**: 인프라 자동화  ---  ## 🟢 P2 — 자투리 시간에

---

## 🟢 P2 — 자투리 시간에

### A. 🟢 AUTO — [DECISIONS_INDEX.md 자동 동기화] sync_engine 보강

**ID**: `BL-DECISIONS-INDEX`  
**카테고리**: infrastructure  
**예상 시간**: 2시간  

**메모**: DECISIONS.md 변경 감지 → DECISIONS_INDEX.md 자동 갱신. ID 고정 불변 규칙.

---

### B. 🟢 AUTO — BEFORE/AFTER 스크린샷 자동 캡처 시스템 (Page Gallery 통합)

**ID**: `BL-015`  
**카테고리**: dev  
**예상 시간**: 4-6시간  

**메모**: ## 🟡 P2 — BEFORE/AFTER 스크린샷 자동 캡처 시스템 (Page Gallery 통합)  ### 배경 대표님 메모리 원칙: 모든 페이지 수정 시 ① 수정 전 풀페이지 스크린샷 ② 수정 작업 ③ 수정 후 풀페이지 스크린샷 ④ 작업 기록에 BEFORE/AFTER 비교 등록 ⑤ 관리자 페이지에서 전후 비교 확인 가능. Page Gallery 스크린샷도 수정 시 자동 갱신.  ### 현재 상태 - `admin-gallery.html`은 존재하나 BEFORE/AFTER 비교 기능 미구현 - 자동 캡처 인프라(Playwright 

---

### C. 🟢 AUTO — README.md 업데이트

**ID**: `SQ-J`  
**카테고리**: docs  
**예상 시간**: 미정시간  

**메모**: ### J. 🟢 AUTO — README.md 업데이트 **작업 내용**: 현재 어떤 시스템들이 라이브에 있는지, 각 페이지 목적, 환경변수 목록 등을 한 페이지에 정리.  **예상 시간**: 30분 **가치**: 새 채팅에서 컨텍스트 파악 시간 단축  ---  ## 🚫 데드라인 후 (5/3 이후)  - 호텔 검색 UX 이슈 (BACKLOG P2 Issue #1, #2) - 호텔 스토리 / LTV 추적 (BACKLOG P2) - Phase 3 D단계 (회원 탈퇴 / 이메일 변경) - i18n 한국어 일괄 적용  ---  ## 자율 

---

### D. 🟡 SEMI — 호텔 스토리 / LTV 추적

**ID**: `BL-006`  
**카테고리**: dev  
**예상 시간**: 미정시간  

**메모**: ## 🟡 P2 — 호텔 스토리 / LTV 추적 ⭐ 2026-04-29  **배경**: 장기 고객 = 영업 자산. "Lotte는 3번 결제한 충성 고객" 같은 분석 가능.  **작업 항목**: 1. **DB 뷰**: `hotel_lifetime_stats` (자동 집계) 2. **admin.html 호텔 상세 페이지 강화** — 거래 요약 / 담당자 이력 / 영상 이력 / 영업 인사이트(사실 기반) 3. **marketing.html "호텔 스토리" 섹션** — 우리와 함께한 시간 (등급 표시 X) 4. **영업 자료 CSV expo

---

### E. 🟡 SEMI — 호텔 검색 UX 이슈

**ID**: `BL-008`  
**카테고리**: ux  
**예상 시간**: 미정시간  

**메모**: ## 🟡 P2 — 호텔 검색 UX 이슈  ### Issue #1: 호텔 검색 결과 정렬 부정확 **현상**: `Lotte Hotel S` 입력 시 결과 순서: Seattle → New York → Chicago → New York → Seoul (5번째). 한국 사용자에게 Seoul이 가장 마지막에 표시.  **해결**: 가입 시 country 받아 location bias로 사용 / 기본 location bias를 한국 좌표로 / review_count DESC 정렬.  **관련 파일**: `api/google-places.js`

---

### F. 🟡 SEMI — Admin Console UI 버그

**ID**: `BL-009`  
**카테고리**: bug  
**예상 시간**: 미정시간  

**메모**: ## 🟡 P2 — Admin Console UI 버그  ### Issue #3: Hotels 목록의 MANAGER 컬럼 비어있음 ✅ [DONE 2026-04-29] **현상**: Admin Console > Hotels > Hotel Partners 목록에서 MANAGER 컬럼이 "-"로 표시됨. 매니저 정보(이지형 / leejifilm@hanmail.net)가 표시되어야 함.  **원인**: 컬럼명 불일치 — hotel-info.html은 `contact_name`/`contact_email`/`contact_phone` 저장, 

---

### G. 🟡 SEMI — Chrome 안전 브라우징 경고

**ID**: `BL-010`  
**카테고리**: ux  
**예상 시간**: 미정시간  

**메모**: ## 🟡 P2 — Chrome 안전 브라우징 경고  **현상**: 대표님 Chrome 일반 모드에서 `gohotelwinners.com` 접속 시 "위험한 사이트" 경고. 시크릿 모드/Edge에서는 정상.  **진단**: Google Safe Browsing — 2020-04-08 멀웨어 페이지 보관 이력 (이전 도메인 소유자 흔적). 현재 데이터 없음. Chrome 캐시 잔존.  **해결 옵션**: - A. Chrome 캐시 정리 (5분): `chrome://safebrowsing/` → Refresh Lists - B. Goog

---

## ⚪ P3 — 여유 시간

### A. 🟢 AUTO — Chrome 확장 프로그램 간섭 (사용자 환경)

**ID**: `BL-011`  
**카테고리**: dev  
**예상 시간**: 미정시간  

**메모**: ## 🟢 P3 — Chrome 확장 프로그램 간섭 (사용자 환경)  **현상**: `subtitle.js` 확장 프로그램(자막/번역)이 페이지 JS에 간섭. 콘솔 에러 `Extension context invalidated`.  **영향**: 사이트 동작에는 영향 없음. 디버깅 시 노이즈만 증가.  **해결**: 대표님 환경에서 확장 프로그램 비활성화. 코드 수정 불필요.  ---

---

