# 인계서 — BL-HOTEL-MASTER 뿌리+확인함 완료 (다음=검증로봇/성과표 호텔연결)

**작성**: 2026-07-13
**다음 채팅 첫 fetch = boot.md → 이 파일.**

---

## ✅ 완료 — 호텔 마스터 뿌리 + 확인함 (전부 라이브)

결정문서 `_business/decisions/2026-07-13-hotel-master-direction.md`. 상세 `…-schema-applied.md`.

### 1·2단계 — 스키마 + 자동 통합
- hotels 확장 6칸: hotel_code(H-00001 UNIQUE)·agoda_hotel_ids(jsonb 다:1)·merge_status·operating_status·former_names·booking_count.
- 번호 = 뜻 없는 고유 연번. 나라/도시/성급/유형은 칸+화면배지(번호에 안 넣음).
- status에 catalog 추가. 자동 마스터=status catalog. v_manager_hotels에 user_id IS NOT NULL 격리(매니저 화면 오염 방지).
- 자동 통합: 이름+도시 정규화 그룹 → **마스터 3,182개(H-00001~H-03182)**. 아고다ID 3,903→3,182. 예약 7,169건 전부 hotel_id 연결(누락0). 성급=mode 보정.

### 3단계 — 자동 확정 + 확인함 (사람 검수 최소화)
- **대표님이 3,000개를 검수하지 않는다.** 시스템이 신뢰도 판정: 오병합 신호(나라/도시 섞임·이름≤4자) 없는 것 = merge_status **confirmed 자동**(3,181개). 의심만 **ambiguous**(현재 1개: H-02862 SuYi).
- 오병합 실측: 나라섞임 0·도시섞임 0·짧은이름 1. 큰 호텔(예약≥10)은 89개뿐, 나머지는 예약1~2건 롱테일.
- **확인함**(BL-HOTEL-MASTER):
  - API `api/hotel-review.js` — GET 목록(is_editor↑)·POST {hotel_code,action:'confirm'}(admin전용, ambiguous→confirmed). content-hotels.js 인증패턴 복제. 라이브 GET 검증됨.
  - UI: studio.html 호텔 메뉴 상단 [확인함 N] 버튼 → 모달에 의심 호텔 목록(코드·이름·메타·사유) → [맞음·확정]. reviewIsAdmin이면 버튼, 아니면 "대표님만". **기존 6메뉴 무변경, JS 문법 통과.**
  - 대표님 동선: 스튜디오 로그인 → 호텔 메뉴 → [확인함] → SuYi에 [맞음·확정] → 확인함 비워짐. 안 눌러도 시스템 정상.
- 커밋: hotel-review.js 0845d83 / studio.html e5422822.

## 📋 다음
1. **검증 로봇(과소병합 탐지)**: 정규화가 못 잡은 미묘한 이름차이(ZONK/ZONK HOTEL, 리브랜딩)를 마스터끼리 유사도 비교로 찾아 확인함에 ambiguous 추가. + 확인함 **합치기(merge) 액션**(from→into: agoda_hotel_ids 합치고 예약 재연결, from archived). 지금 확인함은 confirm만.
2. **성과표 호텔별 렌즈 연결**(D-063→D-062): content-hotels(현재 hid=아고다ID 기준)를 hotel_code 마스터 위에서 돌게 → 호텔별 성과.
3. **매니저용(나중)**: 가입 호텔 agoda_hotel_id 채워 예약 매칭. 같은 명단·번호라 결합작업 없음.

## ⚠️ 알아둘 것
- property_type(호텔/리조트)은 예약데이터에 없어 자동 마스터 NULL. 성급도 예약기준이라 부정확 가능 → 확정/검증 단계 교정.
- studio.html은 로그인 게이트라 curl 검증 불가 → raw GitHub SHA로 대체. API는 ops-token으로 검증.
- 매니저 가입 hotels 3행=개발 테스트용 임시(user_id 있음), 자동 마스터와 분리됨.

---
(이전 이력은 git 히스토리·decisions 문서 참조)
