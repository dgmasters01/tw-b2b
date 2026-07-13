# 인계서 — BL-HOTEL-MASTER 1·2단계 완료 (다음=큰 호텔 확정 UI)

**작성**: 2026-07-13
**다음 채팅 첫 fetch = boot.md → 이 파일.**

---

## ✅ 이번 세션 완료 — 호텔 마스터 자동 통합 (라이브 반영)

결정문서 `_business/decisions/2026-07-13-hotel-master-direction.md` 순서대로 뿌리 완성.
상세 기록: `_business/decisions/2026-07-13-hotel-master-schema-applied.md`.

### 1단계 — hotels 확장 스키마 (새 표 안 만듦, 기존 39칸 무손상)
- 새 칸 6개: `hotel_code`(고유번호 H-00001, UNIQUE 부분인덱스) · `agoda_hotel_ids`(jsonb, 묶인 아고다ID 다:1) · `merge_status`(auto/confirmed/ambiguous) · `operating_status`(active/closed) · `former_names`(jsonb 옛이름) · `booking_count`(예약수).
- 번호 정책 확정: **뜻 없는 고유 연번**. 나라/도시/성급/유형은 번호에 안 넣고 각 칸+화면 배지로. 이유=정보는 바뀌어도 번호는 영구여야 예약·콘텐츠·링크 안 깨짐.
- status CHECK에 `catalog`·`archived` 추가. 예약 기반 자동 마스터 = status `catalog`(매니저 워크플로우 pending~published와 분리).
- **매니저 뷰 격리**: `v_manager_hotels`에 `user_id IS NOT NULL` 조건 추가 → 자동 마스터(user_id 없음)가 매니저 화면에 안 섞임. (v_hotel_manager_full은 user 조인이라 원래 안전.)

### 2단계 — 자동 1차 통합 (라이브 완료)
- 방식: bookings_agoda를 **이름 정규화 + 도시**로 그룹 → 마스터 생성. 정규화 = `lower(regexp_replace(btrim(x),'[[:space:][:punct:]]+','','g'))`.
- 결과: **마스터 3,182개 (H-00001 ~ H-03182)**. 아고다ID 3,903 → 3,182개로 묶임. 예약 7,169건 **전부** bookings_agoda.hotel_id 연결(누락 0).
- 대표이름/도시/나라 = mode(), 성급 = mode()(max는 과대평가라 보정함), agoda_hotel_ids = distinct 배열, booking_count = 예약수, merge_status='auto'.
- 검증 예시: H-00001 Red Roof Inn 오사카 남바 = 아고다ID 14개 통합·예약 83건. H-00005 Sotetsu 13개, H-00007 Keihan Nagoya 14개. 결정문서가 짚은 "14개로 쪼개짐" 문제 해결 확인.

## 📋 다음 (3단계~) — 정석 순서
1. **큰 호텔 확정 UI**: booking_count 상위부터 대표님이 눈으로 "같은 호텔 맞다" 확정 → merge_status='confirmed'. 위치(스튜디오 호텔 메뉴 정리탭 vs admin)는 그때 결정 — 대표님 지시: 지금 미리 정하지 말 것.
2. **검증 로봇**: 정규화가 못 잡는 미묘한 이름차이(ZONK/ZONK HOTEL, 리브랜딩)를 애매 묶음으로 표시 → 점진 정리. merge_status='ambiguous'.
3. **성과표 호텔별 렌즈 연결**(D-063→D-062): 이제 hotel_code 위에서 호텔별 성과 집계 가능.
4. **매니저용(나중)**: 가입 호텔의 agoda_hotel_id 채워 예약 매칭(agoda_match_status). 같은 명단·같은 번호라 결합작업 없음.

## ⚠️ 알아둘 것
- property_type(호텔/리조트)은 예약데이터에 유형 정보 없어 자동 마스터는 NULL. 확정 단계에서 채움.
- 성급은 예약데이터 기준 대표값이라 부정확 가능 — 확정/검증 단계에서 교정.
- 매니저 가입 hotels 3행은 개발 테스트용 임시(user_id 있음). 자동 마스터와 분리돼 있음.

---
(이전 세션 이력은 git 히스토리 및 decisions 문서 참조)
