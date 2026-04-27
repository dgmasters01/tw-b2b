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
| **1** | STATUS.md 시스템 구축 | 30분 | ✅ 완료 |
| 1-1 | STATUS.md 작성 + GitHub 푸시 | | |
| 1-2 | 작업 단계 마스터 리스트 포함 | | |
| **2** | Supabase 스키마 설계 | 30분 | ✅ 완료 (a39b5bc) |
| 2-1 | `bookings_self` 테이블 (자체 영업) | | |
| 2-2 | `bookings_agoda` 테이블 (아고다 채널) | | |
| 2-3 | `channels` 테이블 (채널 마스터 + 6개 시드) | | |
| 2-4 | RLS 정책 적용 + `bookings_unified` VIEW + `v_channel_stats` VIEW | | |
| **3** | admin.html 메뉴 재구조화 | 1시간 | ✅ 완료 (a39b5bc) |
| 3-1 | 좌측 사이드바 6메뉴 (Dashboard/Bookings/Analytics/Hotels/Members/Team) | | |
| 3-2 | 기존 hotels/members/admins 위치 이동 (모든 ID 보존) | | |
| 3-3 | 빈 탭 자리 만들기 (Dashboard/Bookings/Analytics placeholder) | | |
| **4** | 자체 예약 등록 폼 | 1시간 | ✅ 완료 |
| 4-1 | 신규 예약 입력 폼 UI | | |
| 4-2 | Supabase INSERT 로직 | | |
| 4-3 | 예약 목록·검색·수정 화면 | | |
| **5** | 아고다 엑셀 업로드 기능 | 1시간 30분 | ✅ 완료 |
| 5-1 | 채널 드롭다운 + 다중 파일 드래그 UI | | |
| 5-2 | XLSX 파싱 로직 | | |
| 5-3 | 중복 감지 + INSERT/UPDATE | | |
| 5-4 | 결과 리포트 화면 | | |
| **6** | 분석 대시보드 8탭 이식 | 2시간 | ✅ 완료 |
| 6-1~7 | 전체현황/채널/나라/도시/호텔/패턴/성급/B2B | | |
| **7** | 메인 페이지 라이브 예약 피드 | 30분 | ✅ 완료 |
| 7-1 | 카운터 위젯 | | |
| 7-2 | Activity Stream 컨셉 (실제 데이터 셔플) | | |
| **8** | 테스트 및 배포 | 30분 | ✅ 완료 |

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
| **진행 단계** | **Phase 1 전체 완료 (8단계 / 8단계)** |
| **다음 작업** | Phase 1 운영 시작 — 실제 예약 누적 → Phase 2 (아고다 Long Search API) 검토 |
| **이번 채팅** | TW Booking Analytics 11 |
| **다음 채팅** | (Phase 1 완료, Phase 2 별도 채팅 시작 시 STATUS.md 갱신) |
| **마지막 커밋** | d9fcb4e (Phase 1 Step 8 완료 — Phase 1 전체 완료) |
| **최종 업데이트** | 2026-04-27 |

### 8단계 완료 산출물 (테스트 및 배포 — 운영 검증)
- **Vercel 배포 검증**: 최신 커밋 `dd0d5fa` 자동 배포 READY 확인 (Vercel API)
- **라이브 사이트 응답 검증**: gohotelwinners.com HTTP 200, 45.7KB, 1초 이내 응답
- **공개 VIEW PII 보안 최종 재검증** (anon 키 + PostgREST):
  - 더미 예약 1건 INSERT (booking_code=`STEP8-TEST-DELETE-ME`, guest_name=`PII_GUEST_DELETE_KIM_HONG`, guest_email=`pii_step8@delete.test`, guest_phone=`+82-PII-DELETE`)
  - `v_public_recent_bookings` 응답 컬럼: unified_id / source / channel_code / channel_name / channel_language / hotel_name / hotel_country / hotel_city / hotel_star / nights / num_rooms / booking_amount_usd / booked_at — **PII 0건**
  - `v_public_stats` 카운터 정상 반영 (1 / $350 / $35 / 1 / 1 / 1 / 1)
  - anon 키 → `bookings_self`, `bookings_agoda`, `bookings_unified` 직접 호출 모두 빈 배열 (RLS 차단)
  - 테스트 후 DELETE 완료, stats 0 복귀 확인
- **End-to-end 라이브 사이트 검증** (Playwright Chromium 1280x900 + Mobile 390x844):
  - 데스크톱: 카운터 4개 정상 표시 (1 / $350 / 1 / 1), Activity Stream 8행 (셔플 윈도우), 호텔명/국가/도시 정상 렌더, 콘솔 에러 0건, PII 누출 0건
  - 모바일 (iPhone 12 viewport): 카운터 2x2 그리드 확정 (c0/c1 같은 행, c2 다음 행), 라이브 피드 정상 노출, 콘솔 에러 0건
  - 한·영 토글 작동 확인
- **운영 워크플로 검증 완료**: admin.html Bookings 탭 → Self-Sourced 등록 → bookings_self INSERT → v_public_recent_bookings/v_public_stats 자동 반영 → index.html 라이브 피드에서 PII 없이 즉시 노출 → 5분마다 자동 갱신

### 8단계 알려진 이슈 (Phase 2 처리 권장)
- 기존 `bookings_unified`, `v_channel_stats` view는 PII 컬럼을 view 정의에 포함하지 않아 누출은 없지만, security_invoker가 false 라 메타 컬럼(unified_id 등)을 anon이 조회 가능. Phase 2 첫 작업으로 `ALTER VIEW ... SET (security_invoker = true);` 적용 권장.
- hotels 테이블이 비어있는 상태 — 운영 시작 시 호텔 마스터부터 등록 필요 (admin.html Hotels 탭 활용)
- 회원탈퇴 / 이메일변경 / PayPal 결제 통합 / Custom SMTP 자체 도메인 발신 — Phase 2 범위

### Phase 1 전체 완료 요약
- **단계 1-8**: STATUS.md 시스템 / Supabase 스키마 / admin 사이드바 6메뉴 / Self-Sourced 예약 폼 / 아고다 엑셀 업로드 / Analytics 8탭 / 라이브 피드 / 운영 검증 — 모두 완료
- **신규 SQL VIEW 4개**: bookings_unified / v_channel_stats / v_public_recent_bookings / v_public_stats
- **신규 테이블 3개**: channels (6개 시드) / bookings_self / bookings_agoda
- **수정 페이지**: admin.html (사이드바 + Bookings + Analytics) / index.html (라이브 피드)
- **운영 준비 완료**: 자체 영업 예약 등록 + 6채널 아고다 엑셀 월간 업로드 + 메인 페이지 신뢰형 라이브 피드 + 8탭 분석 대시보드 — 모든 데이터 흐름이 Supabase 단일 소스에서 흐름

### 7단계 완료 산출물
- **신규 SQL VIEW 2개** (`sql/06-public-feed-views.sql`, Supabase Management API로 자동 적용)
  - `v_public_recent_bookings`: 최근 50건 공개 피드, **PII 컬럼(guest_name/email/phone/booking_code) 완전 제외**, 호텔/도시/국가/금액/박/객실/채널/날짜만 노출
  - `v_public_stats`: 누적 카운터 (총 예약/금액/수수료/호텔수/도시수/국가수/활성채널수/최근 예약일)
  - anon, authenticated 에 GRANT SELECT (베이스 테이블 RLS 는 보호 유지)
- **`index.html` 라이브 피드 섹션 추가** (#live-feed, OTA logos 와 Transparent Data 사이)
  - 7-1: 카운터 위젯 4개 (Total Bookings / Booking Volume / Hotels Booked / Active Channels), odometer easeOutCubic 카운트업 애니메이션, hover 시 forest→gold 그라데이션 라인
  - 7-2: Activity Stream — 좌측 타임라인 라인 + 채널별 색 점 (TW 녹/HT 골드/KT 청/TC 녹/JP 적/ZH 보라) + 호텔명·도시·국가 + 5성/채널/박·실 칩 + 우측 USD 금액
  - Empty state: 데이터 0건 시 "Activity feed warming up" fallback (깨지지 않음)
  - 회전: 4.5초마다 셔플(7건 윈도우, 데이터 7건 초과 시에만), 5분마다 자동 재로드, 30초마다 상대 시간 갱신
  - 언어 토글: 기존 IIFE 에 `tw-lang-change` CustomEvent 발행, 라이브 피드가 listen 해서 시간/메타 텍스트 한·영 즉시 전환
  - 모바일 대응: 카운터 2x2, 타임라인 위치 / 칩 wrap 조정
- **CSS namespace**: 모든 신규 클래스 `lf-` prefix (기존 trust/analytics 와 무충돌)
- **하단 신뢰 노트**: "Customer details are never shown — only verified booking activity."

### 7단계 검증 (Playwright 헤드리스)
- JS 문법: 2개 inline script 모두 통과 (960 / 8826 chars)
- HTML 태그 균형: script 3/3, section 8/8, div 140/140
- DOM 요소 8/8: live-feed, lf-counters, lf-counter(4), lf-stream, lf-stream-empty, lf-pulse-dot, lf-stream-meta
- 콘솔 에러 0건, 경고 0건
- 0건 상태: 카운터 0/$0/0/0, empty 표시, stream 숨김 — 정상
- 8건 더미 데이터 시뮬레이션: 카운터 8/$3.2K/8/6, 7행 정상 렌더, empty 숨김 — 정상
- 한·영 토글: 메타 텍스트 ("실시간 갱신" / "Live · auto-refreshing"), 시간 표시 ("3분 전" / "3m ago") 정확히 전환

### 7단계 PII 보안 검증
- 더미 PII 데이터 INSERT (guest_name='SECRET_PII_김홍길동', guest_email='secret-pii@example.com')
- anon 키 + PostgREST 로 `v_public_recent_bookings`, `v_public_stats` 호출 → PII 컬럼 **0건 노출**
- anon 키로 `bookings_self` 직접 호출 → RLS 차단 (빈 배열) 확인
- 테스트 후 더미 데이터 완전 정리

### 알려진 별도 이슈 (7단계 범위 외, 향후 처리)
- 기존 `bookings_unified`, `v_channel_stats` view 가 SECURITY DEFINER 처럼 작동해 anon 이 일부 메타 컬럼(unified_id, channel_code) 조회 가능. PII 는 view 정의에 미포함이라 직접 누출 없음. 향후 `ALTER VIEW ... SET (security_invoker = true);` 로 강화 권장.

### 6단계 완료 산출물
- `admin.html` Analytics 탭에 8탭 분석 대시보드 통합 (전체현황/채널/나라/도시/호텔/패턴/성급/B2B)
- **정적 1MB JSON → bookings_unified VIEW 동적 쿼리** 전환 완료
- `aggregateAll(rows, channels)` 클라이언트 집계 함수: bookings_unified 행 + channels 마스터를 받아 17개 D 키(sm/yl/ps/ch/co/ci/hf/bk/dv/dvy/dvc/dow/dom/mc/dl/ss/sc) 동시 생성
- Chart.js 4.4.0 CDN 추가
- CSS(5KB) / JS(50KB)를 `bka-` prefix로 namespace 격리 — admin 기존 클래스와 무충돌
- Empty state UI: 데이터 0건 시 8탭 숨김 + "Bookings 탭에서 예약 등록/엑셀 업로드 안내" 표시
- Refresh 버튼: 수동 재로드 (차트 destroy 후 fetch + aggregate + render)
- IIFE 격리 + window.bka_* 노출 (HTML onclick 호환)
- 인증/권한 가드 그대로 유지 (super_admin/admin만 접근)

### 6단계 검증 (Playwright 헤드리스)
- 런타임/콘솔 에러: 0건
- DOM 요소 17개 + 함수 노출 모두 통과
- 8탭 순회 클릭 (3건 샘플 데이터) — 모든 탭 정상 렌더
- Empty state (0건) 정상 작동

### 4-5단계 완료 산출물
- `admin.html` Bookings 탭에 sub-tab 2개 (Self-Sourced / Agoda Channel Upload) 구현
- **Self-Sourced 예약 폼**: 자동 booking_code 생성 (TW-YYYY-NNNN), 채널 연결, 호텔/고객/일정/객실/결제 5섹션, 검색/상태/채널 필터, super_admin만 삭제
- **아고다 엑셀 업로드**: 채널 선택 → 다중 파일 드래그앤드롭 → SheetJS 파싱 (헤더 자동 감지, 25개 컬럼 alias 매핑) → 채널+booking_id 기준 중복 감지 → upsert/insert-only 모드 → 진행률 바 + 결과 리포트 (insert/update/dedup/error 4통계)
- `raw_row_data` JSONB 보존으로 디버깅·필드 확장 대비
- 통계 위젯 4종 (Self: total/confirmed/revenue/commission, Agoda: total/volume/commission/channels)

### 7단계 시작 시 PENDING 확인
- 인프라: 6단계까지 완성, 백엔드 정상, 데이터 입력은 대표님 운영 후 자연스럽게 누적
- 7단계는 메인 페이지(index.html)에 라이브 예약 피드(Activity Stream 컨셉) + 카운터 위젯 추가, bookings_unified의 최근 데이터 셔플 표시

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
| 2026-04-27 | Phase 1 Step 2 완료: schema (channels/bookings_self/bookings_agoda + RLS + unified VIEW) | TW Booking Analytics 9 |
| 2026-04-27 | Phase 1 Step 3 완료: admin.html 좌측 사이드바 6메뉴 재구조화 (커밋 a39b5bc) | TW Booking Analytics 9 |
| 2026-04-27 | Supabase SQL 자동 적용 완료 (Management API): hotel_id UUID 정정 후 bundle 적용, 검증 통과 (커밋 1110926) | TW Booking Analytics 9 |
| 2026-04-27 | Phase 1 Step 4-5 완료: Bookings 탭 sub-tabs (Self-Sourced 등록 폼 + Agoda 엑셀 업로드 SheetJS 통합) | TW Booking Analytics 10 |
| 2026-04-27 | Phase 1 Step 6 완료: 분석 대시보드 8탭 이식 (admin.html Analytics 탭, bookings_unified 동적 쿼리, aggregateAll 집계, bka- namespace, 커밋 86e8ddd) | TW Booking Analytics 11 |
| 2026-04-27 | Phase 1 Step 7 완료: 메인 페이지 라이브 예약 피드 (v_public_recent_bookings + v_public_stats VIEW 신규, PII 0 노출 검증, index.html 카운터 4 + Activity Stream + 한·영 토글) | TW Booking Analytics 11 |
| 2026-04-27 | **Phase 1 Step 8 완료 — Phase 1 전체 완료**: Vercel 배포 검증(dd0d5fa READY) / PII 보안 최종 재검증(더미 INSERT → 공개 VIEW PII 0 노출 → DELETE → 0 복귀) / 데스크톱·모바일 E2E (Playwright Chromium, 콘솔 에러 0건, 카운터 1/$350/1/1, 모바일 2x2 그리드) / 운영 워크플로 end-to-end 검증 | TW Booking Analytics 11 |
| 2026-04-27 | **Phase 2 Step 1 완료**: 사이드바 fixed positioning (스크롤 후 메뉴 클릭 버그 해결). PHASE2.md 신규 작성 (호텔 정보 동기화/성급 매칭/i18n 인수인계 문서) | TW Booking Analytics 12 |
| 2026-04-27 | **Phase 2 Step 2 완료**: hotels DB 라이브 동기화 — booking-analytics에 fillHotelInfo + syncStarRatings + _hotelsCache 후크 (커밋 efb7658) | TW Booking Analytics 13~14 |
| 2026-04-27 | **Phase 3 Step 1 완료**: booking-analytics IIFE 모듈화 — `window.BKA = {init, mount, unmount, invalidateCache}` 노출 (커밋 a2bd697) | TW Booking Analytics 15 |
| 2026-04-27 | **Phase 3 Step 2 완료**: iframe 제거 + booking-analytics 네이티브 통합 — admin.html에 booking IIFE 직접 흡수, CSS는 `#tab-analytics` 스코프 자동 변환 (커밋 66997c6) | TW Booking Analytics 16~17 |
| 2026-04-27 | **Phase 3 Step 3 완료**: i18n 영어/한국어 토글 — admin 우상단 EN/한국어 버튼 추가, booking IIFE 1MB 무수정 + DOM 텍스트 노드 사전 기반 치환 엔진 도입(약 90개 매핑), `BKA.mount` / `setActiveTab` 후크로 자동 재적용, localStorage 영속화. JS 7/7 검증 + jsdom EN↔KO 시뮬레이션 통과 | TW Booking Analytics 19 |

---

**Last updated**: 2026-04-27
**Project owner**: 이지형 대표 (TravelWinners)
**Maintained by**: Claude (Anthropic)
