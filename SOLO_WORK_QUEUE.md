# TW B2B — 자율 작업 큐 (Solo Work Queue)

> ⚠️ **이 파일은 자동 생성됩니다.** 수동 편집하지 마세요.
> 단일 진실 소스: `tasks.json` (v2.0)
> **데드라인**: 2026-05-03
> **갱신**: 2026-05-02
> **목적**: 대표님 외근/자리비움 시 Claude 자율 처리 가능 작업

## 작업 분류 체계

| 마크 | 의미 | Claude 자율 처리 |
|---|---|---|
| 🟢 **AUTO** | 즉시 자율 진행 가능 | ✅ |
| 🟡 **SEMI** | 일부 자율, 디자인/문구는 보수적 | ✅ (검수 표시) |
| 🔴 **BLOCKED** | 대표님 결정 후에만 진행 | ❌ |

---

## 🔥 P0 — 데드라인 직결 작업

### A. 🟢 AUTO — 통합 To-Do Inbox (관리자 대시보드 재설계)

**ID**: `BL-002`  
**카테고리**: dev  
**예상 시간**: 미정시간  

**메모**: ## 🔴 P0 — 통합 To-Do Inbox (관리자 대시보드 재설계) ⭐⭐⭐ 2026-04-29  **배경** (대표님 핵심 운영 철학): > "한 사람이 처리해야 될 업무는 한 곳에서 우선순위가 표시되어 체크하면 정리할 수 있게 해야 됨. 내가 복잡하게 관리하게 하면 안 됨. 나에게 유리하게 해야 됨."  대표님 1인 운영. 처리 작업이 여러 탭에 흩어져 있으면 누락 발생. 한 곳에 통합 필요.  **작업 항목**: 1. **admin.html Dashboard 탭 = To-Do Inbox** 으로 재설계    - 모든 처리 작

---

### B. 🟢 AUTO — TW B2B 중앙 작업 관리 시스템 구축 (1단계: 데이터 통합 + 백업)

**ID**: `IP-CTRL-001`  
**카테고리**: dev  
**예상 시간**: 2시간  

**메모**: 1단계 완료 후 다음 채팅에서 화면 통합 + 자율 큐 + 진행률 + 롤백 UI 작업

---

## 🟡 P1 — 데드라인 이전에 있으면 좋음

### A. 🟢 AUTO — 자동 알림 메일 시스템 (BACKLOG의 P1)

**ID**: `SQ-G`  
**카테고리**: dev  
**예상 시간**: 미정시간  

**메모**: ### G. 🟢 AUTO — 자동 알림 메일 시스템 (BACKLOG의 P1) **작업 내용**: BACKLOG.md L280 참조. 6개 트리거 메일 구현 - 호텔 등록 / 승인 / 거절 / 결제 완료 / 영상 제작 시작 / 영상 게시 - 기존 `sendSystemEmail` 함수 활용 - 영어 본체 + 한국어 토글 (i18n 일괄 작업 시점까지 영어만)  **예상 시간**: 2시간 **자율 진행 사유**: 메일 템플릿은 BUSINESS.md 정책 그대로 사용  ---

---

### B. 🟢 AUTO — Supabase Management API 토큰 갱신 알림 자동화

**ID**: `SQ-H`  
**카테고리**: infra  
**예상 시간**: 미정시간  

**메모**: ### H. 🟢 AUTO — Supabase Management API 토큰 갱신 알림 자동화 **작업 내용**: 토큰 만료 7일 전 ops 메일 자동 발송 (현재 토큰 만료 5/26) - Vercel Cron 또는 Supabase Edge Function 사용 - 현재는 메모리에만 알림 메모, 자동화 안 됨  **예상 시간**: 1시간 **자율 진행 사유**: 인프라 자동화  ---  ## 🟢 P2 — 자투리 시간에

---

## 🟢 P2 — 자투리 시간에

### A. 🟢 AUTO — BEFORE/AFTER 스크린샷 자동 캡처 시스템 (Page Gallery 통합)

**ID**: `BL-015`  
**카테고리**: dev  
**예상 시간**: 4-6시간  

**메모**: ## 🟡 P2 — BEFORE/AFTER 스크린샷 자동 캡처 시스템 (Page Gallery 통합)  ### 배경 대표님 메모리 원칙: 모든 페이지 수정 시 ① 수정 전 풀페이지 스크린샷 ② 수정 작업 ③ 수정 후 풀페이지 스크린샷 ④ 작업 기록에 BEFORE/AFTER 비교 등록 ⑤ 관리자 페이지에서 전후 비교 확인 가능. Page Gallery 스크린샷도 수정 시 자동 갱신.  ### 현재 상태 - `admin-gallery.html`은 존재하나 BEFORE/AFTER 비교 기능 미구현 - 자동 캡처 인프라(Playwright 

---

### B. 🟢 AUTO — README.md 업데이트

**ID**: `SQ-J`  
**카테고리**: docs  
**예상 시간**: 미정시간  

**메모**: ### J. 🟢 AUTO — README.md 업데이트 **작업 내용**: 현재 어떤 시스템들이 라이브에 있는지, 각 페이지 목적, 환경변수 목록 등을 한 페이지에 정리.  **예상 시간**: 30분 **가치**: 새 채팅에서 컨텍스트 파악 시간 단축  ---  ## 🚫 데드라인 후 (5/3 이후)  - 호텔 검색 UX 이슈 (BACKLOG P2 Issue #1, #2) - 호텔 스토리 / LTV 추적 (BACKLOG P2) - Phase 3 D단계 (회원 탈퇴 / 이메일 변경) - i18n 한국어 일괄 적용  ---  ## 자율 

---

### C. 🟡 SEMI — 호텔 스토리 / LTV 추적

**ID**: `BL-006`  
**카테고리**: dev  
**예상 시간**: 미정시간  

**메모**: ## 🟡 P2 — 호텔 스토리 / LTV 추적 ⭐ 2026-04-29  **배경**: 장기 고객 = 영업 자산. "Lotte는 3번 결제한 충성 고객" 같은 분석 가능.  **작업 항목**: 1. **DB 뷰**: `hotel_lifetime_stats` (자동 집계) 2. **admin.html 호텔 상세 페이지 강화** — 거래 요약 / 담당자 이력 / 영상 이력 / 영업 인사이트(사실 기반) 3. **marketing.html "호텔 스토리" 섹션** — 우리와 함께한 시간 (등급 표시 X) 4. **영업 자료 CSV expo

---

### D. 🟡 SEMI — 호텔 검색 UX 이슈

**ID**: `BL-008`  
**카테고리**: ux  
**예상 시간**: 미정시간  

**메모**: ## 🟡 P2 — 호텔 검색 UX 이슈  ### Issue #1: 호텔 검색 결과 정렬 부정확 **현상**: `Lotte Hotel S` 입력 시 결과 순서: Seattle → New York → Chicago → New York → Seoul (5번째). 한국 사용자에게 Seoul이 가장 마지막에 표시.  **해결**: 가입 시 country 받아 location bias로 사용 / 기본 location bias를 한국 좌표로 / review_count DESC 정렬.  **관련 파일**: `api/google-places.js`

---

### E. 🟡 SEMI — Admin Console UI 버그

**ID**: `BL-009`  
**카테고리**: bug  
**예상 시간**: 미정시간  

**메모**: ## 🟡 P2 — Admin Console UI 버그  ### Issue #3: Hotels 목록의 MANAGER 컬럼 비어있음 ✅ [DONE 2026-04-29] **현상**: Admin Console > Hotels > Hotel Partners 목록에서 MANAGER 컬럼이 "-"로 표시됨. 매니저 정보(이지형 / leejifilm@hanmail.net)가 표시되어야 함.  **원인**: 컬럼명 불일치 — hotel-info.html은 `contact_name`/`contact_email`/`contact_phone` 저장, 

---

### F. 🟡 SEMI — Chrome 안전 브라우징 경고

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

