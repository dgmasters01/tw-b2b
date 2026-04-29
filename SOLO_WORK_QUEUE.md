# TW B2B — 자율 작업 큐 (Solo Work Queue)

> **데드라인**: 2026-05-03 (D-4)
> **작성일**: 2026-04-29
> **목적**: 대표님 자리 비우신 시간(예: 17:30-22:00)에 Claude가 자율로 진행할 수 있는 작업 목록

---

## 작업 분류 체계

| 마크 | 의미 | Claude가 자율 진행? |
|---|---|---|
| 🟢 **AUTO** | 기술/버그/리팩토링 — Claude 자율 결정 가능 | ✅ 즉시 진행 |
| 🟡 **SEMI** | 일부 자율, 디자인/문구는 보수적 기본값 사용 | ✅ 진행 후 대표님 검수 표시 |
| 🔴 **BLOCKED** | 사업방향/디자인 톤 결정 필요 | ❌ 대표님 결정 대기 |

**완료 시**: `[DONE 커밋해시]` 추가 + 하단 "복귀 후 검수 항목"에 옮기기.

---

## 🔥 P0 — 데드라인 직결 작업 (5/3까지 반드시)

### A. 🟢 AUTO — Admin Hotels 상세 패널 + 모달 X 버튼 수정
**작업 내용**: BACKLOG.md 최상단 P0 (커밋 `89b3e49e`) 참조.
- Manager Email / Name / Phone 표시 (auth.users JOIN 또는 캐시 컬럼 추가)
- Review, Agoda URL, Agoda Hotel ID, Amenities 채우기
- X 버튼 클릭 핸들러 연결 + ESC 키 + 모달 외부 클릭 닫힘
- Hotels 목록 MANAGER 컬럼도 같이 (P2 Issue #3 통합)

**예상 시간**: 1.5시간
**자율 진행 사유**: 데이터 흐름 + 이벤트 핸들러 — 기술 영역
**검증**: 대표님 복귀 후 dgmasters01@gmail.com / joylife8760@naver.com 두 계정 모두로 확인

---

### B. 🟢 AUTO — admin.html Excel 업로드 UI (Phase A 백엔드 활용)
**작업 내용**: `api/admin-booking-upload.js`(이미 main에 있음) 호출하는 UI 추가
- admin.html `Bookings` 또는 새 탭에 SheetJS 기반 .xlsx/.csv 업로드 위젯
- 파싱 결과 미리보기 → 확인 버튼 → POST 호출 → 결과 표시(`processed/skipped/errors`)
- skipped CID 목록은 admin이 채널 매핑 보강할 수 있도록 `unknown_cids` 섹션 노출

**예상 시간**: 2시간
**자율 진행 사유**: 백엔드 완성됨, UI는 표준 패턴
**🔴 BLOCKED 부분**: 실제 Agoda Booking Analytics 엑셀의 `cid` 컬럼명 — 대표님 답변 필요. 일단 'cid' 가정으로 작업하고 컬럼명 매핑 설정 UI도 함께 추가해서 나중에 변경 가능하게 함.

---

### C. 🟢 ✅ **[DONE 8e6e7d80]** — Vercel 12-Function 한도 영구 회피 (admin-* 통합)
**완료일**: 2026-04-29

**완료 내역**:
- `api/admin.js` 신규 작성 (paypal.js와 동일한 `?action=` 라우터 패턴, ~700 lines)
- 4개 admin-* 함수 통합: `booking-upload`, `list-users`, `send-invite`, `update-match`
- 공통 어드민 인증 로직 `requireAdmin()`으로 중복 제거
- admin.html 5건 fetch 호출 일괄 변경 (`/api/admin?action=...` 형태)
- 4개 admin-* 원본 파일 삭제, `_backup_20260429/` 폴더에 보존
- 라우터 UX 개선: action 화이트리스트 검증을 인증 전으로 이동 (디버깅 명확화)
- **Function 카운트: 12 → 9** (여유 3슬롯 확보)
- production curl 검증: 4개 action 모두 401 정상, unknown action 즉시 400 차단
- ops 이메일 발송 완료 (email_id: 855532d2-1fb0-47f9-a4f1-b88a4ba1e811)

**관련 commits**: `accacd2d` (admin.js 추가) → `f8e858cd` (4개 원본 삭제) → `edc41924` (CHANGELOG) → `8e6e7d80` (라우터 UX 개선)

**중요 함정 (향후 동일 작업 참고)**: 통합 추가와 원본 삭제를 별도 commit으로 나누면 중간 단계에서 13개 함수로 빌드 실패. 단일 commit에 묶을 것 (이번에 1차 commit accacd2d 빌드 실패 → 2차 commit f8e858cd로 복구).

---

### D. 🔴 BLOCKED — sales.html 디자인 전면 개편
**대표님 결정 필요 사항**:
1. 디자인 톤: "Stripe 풍 / Notion 풍 / Linear 풍 / Apple 풍" 중 어느 쪽? (BACKLOG에 'Stripe/Notion/Linear 수준'이라고 적혀있는데 셋 중 하나로 좁혀야 함)
2. 5개 채널 시각화 — 실제 채널 구독자 수 / 영상 썸네일 사용 여부
3. 호텔 후기 카루셀 — 실제 후기 데이터 있는지, 없으면 placeholder?

**자율 진행 가능한 부분 (🟡 SEMI)**: 문구/구조/CTA는 BUSINESS.md 기준으로 구성 가능. **대표님이 디자인 톤만 정해주시면** Claude가 끝까지 만들 수 있음.

**예상 시간**: 결정 후 3-4시간

---

### E. 🔴 BLOCKED — marketing.html 대시보드 디자인 개편
**대표님 결정 필요 사항**:
1. 4개 헤드라인 카드의 배경/색감 — sales.html과 동일 톤?
2. 6개월 D-Day 카운트의 시각적 강조 정도 — 큰 숫자? 진행 바? 둘 다?
3. PDF 보고서 다운로드 버튼 위치/강조도

**자율 진행 가능한 부분 (🟡 SEMI)**: 데이터 표시 로직, 차트 라이브러리 선택, 반응형 처리는 자율.

**예상 시간**: 결정 후 2-3시간

---

### F. 🔴 BLOCKED — admin.html 디자인 개편
**대표님 결정 필요 사항**:
1. 좌측 사이드바 구조 — 현재 OVERVIEW/SALES/OPERATIONS/TOOLS 4그룹 유지?
2. Dashboard 첫 화면 — KPI 카드 우선 vs 활동 피드 우선?
3. 컬러 팔레트 — 현재 보라(#534AB7) 기조 유지 vs 변경?

**예상 시간**: 결정 후 2시간

---

## 🟡 P1 — 5/3 이전에 있으면 좋음

### G. 🟢 AUTO — 자동 알림 메일 시스템 (BACKLOG의 P1)
**작업 내용**: BACKLOG.md L280 참조. 6개 트리거 메일 구현
- 호텔 등록 / 승인 / 거절 / 결제 완료 / 영상 제작 시작 / 영상 게시
- 기존 `sendSystemEmail` 함수 활용
- 영어 본체 + 한국어 토글 (i18n 일괄 작업 시점까지 영어만)

**예상 시간**: 2시간
**자율 진행 사유**: 메일 템플릿은 BUSINESS.md 정책 그대로 사용

---

### H. 🟢 AUTO — Supabase Management API 토큰 갱신 알림 자동화
**작업 내용**: 토큰 만료 7일 전 ops 메일 자동 발송 (현재 토큰 만료 5/26)
- Vercel Cron 또는 Supabase Edge Function 사용
- 현재는 메모리에만 알림 메모, 자동화 안 됨

**예상 시간**: 1시간
**자율 진행 사유**: 인프라 자동화

---

## 🟢 P2 — 자투리 시간에

### I. 🟢 AUTO — `api/lib/` → `api/_lib/` 후속 정리
**작업 내용**: 디렉토리 rename은 끝났지만 `vercel.json`에 `api/_lib`를 명시적으로 함수에서 제외하는 설정 추가 (이중 안전망)

**예상 시간**: 15분

---

### J. 🟢 AUTO — README.md 업데이트
**작업 내용**: 현재 어떤 시스템들이 라이브에 있는지, 각 페이지 목적, 환경변수 목록 등을 한 페이지에 정리.

**예상 시간**: 30분
**가치**: 새 채팅에서 컨텍스트 파악 시간 단축

---

## 🚫 데드라인 후 (5/3 이후)

- 호텔 검색 UX 이슈 (BACKLOG P2 Issue #1, #2)
- 호텔 스토리 / LTV 추적 (BACKLOG P2)
- Phase 3 D단계 (회원 탈퇴 / 이메일 변경)
- i18n 한국어 일괄 적용

---

## 자율 작업 진행 시 Claude 의무

1. **시작 시**: 이 큐의 최상단 🟢 AUTO 작업부터 진행
2. **각 작업 완료 시**:
   - 자동 검증 (JS 문법 + 페이지 표시 시뮬레이션)
   - git commit (메시지에 [autonomous] 태그)
   - 이 파일에 `[DONE 커밋해시]` 마킹
   - ops 메일 발송 (작업 단위마다)
3. **🔴 BLOCKED 만나면**: 건너뛰고 다음 🟢로 이동, 큐 끝까지
4. **검증 실패 시**: 절대 push 안 함, 큐에 `[FAILED 사유]` 기록 후 다음 작업
5. **마지막에**: 종합 ops 메일 1건 — 완료/실패/대기 항목 체크리스트로 정리

---

## 복귀 후 검수 항목 (대표님 체크리스트)

> Claude가 작업 완료할 때마다 여기에 추가합니다.

### 🟢 [C] api/admin.js 통합 라우터 (2026-04-29 자율 작업 완료)

검수 순서:
1. **admin.html → Members 탭** 클릭 → 매니저 목록 정상 로드 확인 (`?action=list-users`)
2. **admin.html → Agoda Matching 탭** → 임의 호텔 manual match 시도 → 정상 저장 확인 (`?action=update-match` body.action='manual_match')
3. **Agoda Matching → reject 모달** → 거부 사유 입력 → 정상 거부 확인 (`?action=update-match` body.action='reject')
4. **Agoda Invite → Preview Email** 버튼 → dryRun 미리보기 정상 표시 확인 (`?action=send-invite` dryRun=true)
5. **Agoda Invite → Send Invite** 버튼 → 테스트 호텔로 실제 메일 발송 → Resend ID 응답 확인 (`?action=send-invite`)
6. **Vercel Functions** 카운트 9/12 유지 확인 (https://vercel.com/dgmasters01-9797s-projects/tw-b2b)
7. `_backup_20260429/` 폴더 GitHub 보존 확인 (롤백 대비)

**문제 발생 시 롤백 방법**:
```bash
# 4개 원본 파일을 _backup_20260429/에서 api/로 복원하고
# admin.html의 fetch URL을 원복하면 됨
git revert 8e6e7d80 edc41924 f8e858cd accacd2d
```

