# 인계서 — 호텔 마스터 전 과정 완료 (다음=기획 출처 태그)

**작성**: 2026-07-14
**다음 채팅 첫 fetch = boot.md → 이 파일.**

---

## ✅ 완료 — BL-HOTEL-MASTER 전 과정 (라이브)
결정문서: `_business/decisions/2026-07-13-hotel-master-direction.md`, `-schema-applied.md`, `2026-07-13-hotel-type-policy.md`.

### 1~2단계 스키마+통합
- hotels 확장 6칸: hotel_code(고유번호 H-00001, UNIQUE·화면엔 **표시 안 함**, 시스템 식별용)·agoda_hotel_ids(jsonb 다:1)·merge_status·operating_status·former_names·booking_count.
- 자동 통합: 이름+도시 정규화 → 마스터 3,182개(H-00001~H-03182). 아고다ID 3,903→3,182. 예약 7,169건 전부 bookings_agoda.hotel_id 연결(누락0). 성급=mode.
- status에 catalog·archived 추가. 자동마스터 status=catalog. v_manager_hotels에 user_id IS NOT NULL 격리.

### 3단계 자동확정+확인함
- 오병합 신호(나라/도시섞임·이름≤4자) 없는 것 자동 confirmed(3,182개). 애매만 ambiguous(현재 0). 대표님 검수 최소화.
- 확인함: api/hotel-review.js (GET 목록 is_editor↑ / POST confirm admin전용). studio 호텔메뉴 상단 [확인함 N] 버튼→모달. **주 용도=검증로봇이 갈라진 같은 호텔 찾으면 "합칠까?" 뜨는 곳** (지금 비어있는 게 정상).

### 유형 정책
- property_type 7종(호텔·리조트·아파트·빌라·호스텔·료칸·게하) 이름추정으로 채움. "Suites"는 호텔로(아파트 제외).
- **영업(gohotelwinners 가입)=호텔·리조트만**. 명단·예약은 전 유형 유지(안 뺌). 호텔+리조트 2,898개.
- content-hotels.js: 유형·성급 매칭을 agoda_hotel_ids(배열)로 + 유형 7종 한글 표시. studio 호텔메뉴 유형필터 옵션 확장.

### 성과표 호텔별 (D-063 채널탭은 무변경)
- content-performance.js: byHotel 집계 추가(예약을 hotel_id로 묶음). 응답에 hotels[].
- 표시: 2단 레이아웃(이름+나라·도시·유형·성급 / 우측 예약·확정률·예약금·수수료). **나라 38개 한글화**(COUNTRY_KO). 호텔명 소개한 것은 원고 한글명 우선, 없으면 영문. **수수료 admin(대표님)만**(withComm 게이트).
- **소개함/미소개 배지**: 마스터 agoda_hotel_ids가 v_content_hotel_exposure hid에 있으면 소개함. 검증서 상위 예약호텔 다수가 "미소개"=콘텐츠 기회.
- 영상별 탭은 추적링크 전이라 안내 유지.

## 📋 다음 — 기획 출처 태그 (AI추천 vs 직접기획) — 대표님과 방향·디자인 확정됨
**목적**: 내(AI) 추천 기획 콘텐츠 vs 대표님 직접 기획 콘텐츠, 어느 쪽이 예약·수익 잘 나오는지 데이터 비교.
**판정 방식**: 스튜디오 호텔·키워드·전략 메뉴의 [이걸로 만들기]로 전략 큐 진입 = 출처 'ai_추천'(어느 메뉴서 왔는지도 기록: hotel/keyword/strategy). 대표님이 전략에서 직접 입력 = '직접'. 자동 판정(대표님이 매번 안 고름).
**한계(정직히 전달됨)**: 과거 콘텐츠는 출처 기록 없어 소급 불가. **지금부터 쌓아야** 비교 가능(몇 달 후 유의미).
**표시(대표님 확정)**: 성과표 호텔별/영상별에 배지. **소개함·미소개=회색(색 없음), AI추천/직접만 살짝 색**(알록달록 금지). 상단에 "AI추천 N편·예약·확정률 vs 직접 M편" 비교 요약 2칸.
**구현 착수점**: 전략 큐 구조 + [이걸로 만들기] 버튼들(호텔 D-062·키워드 D-065·전략 D-066) 흐름을 **먼저 코드로 확인** → 출처 컬럼(strategy/publications에 plan_source, plan_source_menu) 심기 → 발행 시 승계 → 성과표 집계·배지·비교요약. 콘텐츠 제작 흐름 전체를 건드리므로 뿌리부터 정독 후 진행.

## ⚠️ 알아둘 것
- 고유번호(hotel_code)는 화면에 절대 강조 안 함(대표님 지침). 이름 중심.
- studio.html 로그인 게이트라 curl 검증 불가 → raw GitHub SHA. API는 ops-token 검증.
- 도시는 영문 유지(나라만 한글). 성급 없음=아고다 무성급 숙소.
- 커밋 이력: 확인함 hotel-review.js, content-hotels/performance, studio 다수(git 참조).


---

## ➕ 추가 완료 (2026-07-14) — 성과표 호텔별 클릭 세부 (B안 막대)
- API: **api/hotel-perf-detail.js** 신설. hotel_id+기간(from/to) → 채널별 분해(상위5개+그외 1줄 = 개수 무관 높이 고정) + 최근예약 8건. 수수료 admin전용 게이트. 채널명 v_channel_stats.
- content-performance.js: byHotel 응답에 hotel_id 추가(세부 조회용). period {key,from,to} 그대로 넘김.
- studio.html: 호텔별 행 클릭→아래 펼침(st-pf-hwrap/hdetail). 채널 **막대 비율(B안 확정)** + 최근예약(날짜·채널·확정취소·금액·수수료). "호텔 전체 세부 보기"=switchView(hotel) 이동만(그 호텔 자동선택은 미구현, 다음).
- 대표님 지침 반영: "콘텐츠 만들기" 버튼 제거(성과는 보는 곳), 수수료 표시(admin만), **채널 늘어나도 안 깨지게 상위N+그외 요약으로 높이 고정**.
- 검증: 1위 Red Roof Inn 오사카(83건)=여행능력자들 81(막대100%)·호텔이야 2. 정상.
- 커밋: hotel-perf-detail 33c872dd, content-performance 5135b527, studio 87ede0fce.

## 🎨 기획출처 배지 색 규칙 확정(다음 작업 시 적용)
소개함·미소개=회색(색 없음). AI추천/직접기획만 살짝 색(AI 파랑, 직접 노랑 계열). 알록달록 금지.
