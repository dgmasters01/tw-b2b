# TW-B2B Project Status

> **이 파일은 새 채팅에서 작업 컨텍스트를 즉시 복구하기 위한 인수인계 문서입니다.**
> 새 채팅을 열 때 첫 메시지: `tw-b2b STATUS.md 읽고 [N]단계 작업해줘`

---

## 1. SERVICE CONTEXT

| 항목 | 내용 |
|---|---|
| **서비스명** | gohotelwinners.com B2B 마켓 |
| **프로젝트** | tw-b2b (이 저장소만 해당, ceylon-journey와 호텔이야는 별도 프로젝트) |
| **사업 모델** | 호텔 콘텐츠 마케팅 → 예약 연결 → 수수료 + 패키지 판매 |
| **타겟 고객** | B2B 호텔 매니저, 글로벌 (영어 우선) |
| **운영자** | 이지형 대표 (1인 기업, 스리랑카 직원 1명) |
| **최종 비전** | 세계 호텔 시장 글로벌 검색·예약 엔진으로 진화 |

---

## 2. CURRENT GOALS

### 단기 (4-5월, 이번 작업 범위)
- admin.html과 booking-analytics.html 통합
- 50채널 확장 가능한 데이터 수집 시스템 구축
- 호텔 데이터 단일 소스(Supabase) 통일
- 실제 데이터 기반 라이브 예약 피드 (B2B 신뢰 확보용)

### 중기 (6-8월)
- 아고다 Long Search API 도입 (메인 채널 1개 시범)
- 전환율 검증 후 다른 채널 확대 결정

### 장기 (9월 이후)
- 채널 50개+ 확장 시 자동 다운로드 도구
- 글로벌 검색·예약 엔진
- B2B 화이트라벨 모델

---

## 3. SYSTEM ARCHITECTURE

| 구성 | 정보 |
|---|---|
| **GitHub** | dgmasters01/tw-b2b (main 브랜치) |
| **호스팅** | Vercel (tw-b2b 프로젝트) |
| **메인 도메인** | gohotelwinners.com |
| **백업 도메인** | tw-b2b.vercel.app |
| **DB** | Supabase (vjsludfjsphwnumuoqaj.supabase.co) |
| **인증** | Supabase Auth + 관리자: dgmasters01@gmail.com |
| **이메일 발송** | Resend SMTP (noreply@gohotelwinners.com) |

### 현재 Supabase 테이블 (6개)
- `hotels` (호텔 마스터)
- `bookings` (예약 — 현재 0건, 신규 설계 예정)
- `payments`, `videos`, `admins`, `hotel_status_history`, `admin_notes`

### 현재 HTML 파일 (11개)
- 인증: signup, login, forgot-password, reset-password, verify-email
- 관리: admin (호텔/회원/관리자 3탭), settings, hotel-info
- 분석: booking-analytics (정적 데이터 1MB)
- 기타: index, dashboard

---

## 4. KEY DECISIONS (확정된 결정사항)

| 항목 | 결정 | 결정일 |
|---|---|---|
| 데이터 수집 방식 | **엑셀 업로드** 단일 방식 (월 1회) | 2026-04-27 |
| 채널 확장 계획 | 현재 6개 → 연말 50개+ | 2026-04-27 |
| API 실시간 연동 | Phase 2 이후 (효과 검증 후 단계적) | 2026-04-27 |
| admin과 analytics | 통합 (한 페이지) | 2026-04-27 |
| 호텔 데이터 소스 | Supabase `hotels` 테이블 단일 소스 | 2026-04-27 |
| 라이브 피드 디자인 | **컨셉 1 (Activity Stream — 깔끔한 신뢰형)** | 2026-04-27 |
| 라이브 피드 위치 | 시스템 완성 후 결정 | 2026-04-27 |
| UI 언어 | 영어 우선 + 한국어 토글 | 기존 방침 |
| 결제 | USD / PayPal | 기존 방침 |
| 한국 전용 기능 | 도입 안 함 (KakaoTalk 등) | 기존 방침 |

---

## 5. CHANNEL LIST (현재 운영 채널)

| # | 채널명 | 언어 | API 키 | 비고 |
|---|---|---|---|---|
| 1 | 여행능력자들 (TRAVELWINNERS) | 한국어 | 보유 (TW) | 메인 채널 |
| 2 | 호텔이야 | 한국어 | 미보유 (HT) | |
| 3 | Kotel | 영어 | 미보유 (KT) | |
| 4 | 호텔닷컴 (Trip.com) | 한국어 | 미보유 (TC) | |
| 5 | ホテルだ | 일본어 | 미보유 (JP) | |
| 6 | 世界就是家 | 중국어 | 미보유 (ZH) | |

**확장 계획**: 2026년 연말까지 50개+ 채널로 확장 예정.
**채널 코드 (CH)**: TW, HT, KT, TC, JP, ZH 등 2자 약어로 관리.

---

## 6. WORK PLAN — Phase 1 (4-5월)

전체 7시간 30분 / 5개 채팅에 분산.

| 단계 | 내용 | 예상 시간 | 상태 |
|---|---|---|---|
| **1** | STATUS.md 시스템 구축 | 30분 | 🟡 진행 중 |
| 1-1 | STATUS.md 작성 + GitHub 푸시 | | |
| 1-2 | 작업 단계 마스터 리스트 포함 | | |
| **2** | Supabase 스키마 설계 | 30분 | ⬜ 대기 |
| 2-1 | `bookings_self` 테이블 (자체 영업) | | |
| 2-2 | `bookings_agoda` 테이블 (아고다 채널) | | |
| 2-3 | `channels` 테이블 (채널 마스터) | | |
| 2-4 | RLS 정책 적용 | | |
| **3** | admin.html 메뉴 재구조화 | 1시간 | ⬜ 대기 |
| 3-1 | 좌측 사이드바 메뉴 (대시보드/예약/분석/호텔/회원) | | |
| 3-2 | 기존 hotels/members/admins 위치 이동 | | |
| 3-3 | 빈 탭 자리 만들기 | | |
| **4** | 자체 예약 등록 폼 | 1시간 | ⬜ 대기 |
| 4-1 | 신규 예약 입력 폼 UI | | |
| 4-2 | Supabase INSERT 로직 | | |
| 4-3 | 예약 목록·검색·수정 화면 | | |
| **5** | 아고다 엑셀 업로드 기능 | 1시간 30분 | ⬜ 대기 |
| 5-1 | 채널 드롭다운 + 다중 파일 드래그 UI | | |
| 5-2 | XLSX 파싱 로직 | | |
| 5-3 | 중복 감지 + INSERT/UPDATE | | |
| 5-4 | 결과 리포트 화면 | | |
| **6** | 분석 대시보드 8탭 이식 | 2시간 | ⬜ 대기 |
| 6-1~7 | 전체현황/채널/나라/도시/호텔/패턴/성급/B2B | | |
| **7** | 메인 페이지 라이브 예약 피드 | 30분 | ⬜ 대기 |
| 7-1 | 카운터 위젯 | | |
| 7-2 | Activity Stream 컨셉 (실제 데이터 셔플) | | |
| **8** | 테스트 및 배포 | 30분 | ⬜ 대기 |

### 채팅 분배 가이드
- TW Booking Analytics 8 (현재): 1단계
- TW Booking Analytics 9: 2-3단계
- TW Booking Analytics 10: 4-5단계
- TW Booking Analytics 11: 6단계
- TW Booking Analytics 12: 7-8단계

---

## 7. CURRENT STATUS (현재 작업 위치)

| 항목 | 내용 |
|---|---|
| **진행 단계** | 1단계 (STATUS.md 시스템 구축) |
| **다음 작업** | 2단계 - Supabase 스키마 설계 |
| **이번 채팅** | TW Booking Analytics 8 |
| **다음 채팅** | TW Booking Analytics 9 |
| **마지막 커밋** | 14a507d (STATUS.md 마스터 파일 작성) |
| **최종 업데이트** | 2026-04-27 |

---

## 8. CRITICAL CONSTRAINTS (절대 규칙)

1. **코드 푸시 워크플로** (반드시 준수)
   - ① 코드 작성
   - ② 자동 검증 (JS 문법 + 함수 존재 확인 + 페이지 표시 상태 확인)
   - ③ 검증 통과 후 git push
   - ④ 대표님께 (a) 작업 요약 (b) 직접 확인 체크리스트 (c) 막힐 가능성 있는 부분 (d) Vercel 배포 링크 제공
   - ⑤ 검증 실패 시 절대 푸시 금지

2. **언어 정책**
   - 외부 노출 콘텐츠: 영어 우선
   - 채팅 응답: 한국어 (대표님과 대화)
   - UI: 영어/한국어 토글

3. **보안**
   - API 키, PAT, Service Role 키는 STATUS.md에 미기재 (메모리에만 유지)
   - 보안 정보가 필요하면 메모리에서 자동 참조

4. **금지 사항**
   - KakaoTalk 같은 한국 전용 기능 도입 금지
   - 정적 데이터 박은 1MB HTML 재발 방지 (Supabase 연동 필수)
   - APA 호텔 추천 전면 제외

---

## 9. KEY URLS

| 용도 | URL |
|---|---|
| 라이브 메인 | https://gohotelwinners.com/ |
| 관리자 | https://gohotelwinners.com/admin.html |
| 분석 대시보드 (구) | https://gohotelwinners.com/booking-analytics.html |
| GitHub 저장소 | https://github.com/dgmasters01/tw-b2b |
| Vercel 대시보드 | https://vercel.com/dgmasters01-9797s-projects/tw-b2b |
| Supabase | https://supabase.com/dashboard/project/vjsludfjsphwnumuoqaj |
| Resend (이메일) | https://resend.com/ |

---

## 10. COMMAND REFERENCE (대표님 명령어 가이드)

새 채팅에서 사용하는 명령어 패턴:

| 명령어 | 효과 |
|---|---|
| `tw-b2b STATUS.md 읽고 [N]단계 작업해줘` | 표준 명령어 — 컨텍스트 복구 후 즉시 작업 |
| `tw-b2b 다음 단계 진행` | 짧은 버전 — STATUS.md의 다음 미완료 단계 자동 진행 |
| `tw-b2b 현재 상태 확인` | STATUS.md만 읽고 보고, 작업 안 함 |
| `tw-b2b STATUS.md 업데이트` | 현재 진행 상황을 STATUS.md에 반영 후 푸시 |

### 채팅 한계 자동 감지 약속
Claude는 다음 시점에 새 채팅 안내를 먼저 합니다:
- 응답 속도가 느려질 때
- 시스템 컨텍스트 한계 신호
- 한 단계 완료 후 다음 단계 진입 전

안내 멘트 표준:
> "이번 채팅 거의 한계입니다. STATUS.md 업데이트하고 새 채팅 여세요. 다음 채팅에서 'tw-b2b STATUS.md 읽고 [N]단계 작업해줘'라고 하세요."

---

## 11. CHANGE LOG

| 날짜 | 변경사항 | 채팅 |
|---|---|---|
| 2026-04-27 | STATUS.md 신규 작성 (통합 작업 마스터 인수인계) | TW Booking Analytics 8 |
| 2026-04-27 | booking-analytics.html v9.1 복원 (커밋 c7997a1) | TW Booking Analytics 8 |

---

**Last updated**: 2026-04-27
**Project owner**: 이지형 대표 (TravelWinners)
**Maintained by**: Claude (Anthropic)
