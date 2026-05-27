# 다음 채팅 인계 메모 — BL-ADMIN-OPERATIONS-DASHBOARD 본작업

**작성일**: 2026-05-27
**이전 채팅**: BL-ADMIN-OPS-DASHBOARD 진단 (5시간, 응답 11회)
**상태**: 진단 100% 끝, 본작업 0% 시작 안 함

---

## 🟢 새 채팅 첫 행동 (Claude가 자동)

부칙 16.2 자가 검사 4종 첫 줄 박기:
- ① 결정 다 읽었나 (DECISIONS + business-agreements grep)
- ② 어려운 말 있나 (부칙 18 금지 단어 grep)
- ③ 중복 만들고 있나 (admin-gallery grep)
- ④ 채팅 끝나기 전 다 박았나 (끝낼 때만)

---

## 🟢 이번 채팅에서 박힌 것 (이미 GitHub에 commit됨)

| commit | 무엇 |
|---|---|
| `3395d63b` | CHARTER 부칙 16.2 신설 (자가 검사 3종) |
| `0f703257` | CHARTER 부칙 16.2 ④ 추가 (채팅 끝나기 전 정리) |
| `b5c62708` | business-agreements AGR-0017~0022 추가 (6개 합의) |
| `d1e22e10` | tasks.json BL 3개 추가 (스티키/hi-card/매니저페이지) |

---

## 🟢 이번 채팅에서 확정된 사실 (다음 Claude 절대 잊지 말 것)

1. **외부약속 vs 내부운영 분리** — 환불 100%는 외부 약속, 내부는 대표님이 Agoda 직접 예약하므로 환불 미발동
2. **admin dashboard 인박스** — "환불 위기" 카드 ❌ / "이벤트 예약 처리 대기"·"D-30 누적성과 메일"·"D-Day 재계약 권유" ✅
3. **analytics 8서브탭** (overview/channel/country/city/hotel/pattern/stars/sales) 이미 다 박혀있음, 메뉴 스티키만 빠짐
4. **fillHotelInfo는 rr() 라우터에서 자동 호출** — 호출 자체는 정상, 다만 8필드만 표시 (32필드 중)
5. **stars 성급 데이터** — 등록 호텔=진짜값(매니저 입력) / 미등록=평균단가 추정
6. **project-status 탭** — admin.html에 그대로 둠 (이주 안 함, 대표님 직접 결정)
7. **결제 후 매니저 페이지** — manager-dashboard.html(v_manager_* 8뷰 연동) / dashboard.html·marketing.html은 hotels만

---

## 🔴 다음 채팅에서 결정 필요한 것 4개

새 채팅 첫 작업 = 이 4개를 한 번에 그림으로 정리해서 대표님께 질문:

1. **dashboard 인박스 7항목** — BUSINESS.md §0 그대로 / +배경숫자 / -자동화 가능한 것 빼기
2. **스티키 메뉴 패치 시점** — 즉시 / dashboard 작업과 묶음
3. **hi-card 호텔 필드 개수** — 8개 그대로 / 핵심 15개 / 전체 32개 (BL-ANALYTICS-HOTEL-INFO-WIRE에는 15개 가정)
4. **dashboard.html·marketing.html 예약 보강 여부** — 보강 / 안 함 (BL-MANAGER-PAGES-BOOKING-WIRE 등록됨, 우선순위 P2)

---

## 🟢 다음 채팅 자율 진행 순서

1. 자가 검사 4종 첫 줄 박기
2. 위 4개 결정을 그림 1장으로 정리 → 대표님 탭 받기
3. 결정 받으면 BL 3개(스티키/hi-card/매니저페이지) 순서대로 박기
4. dashboard 인박스 7항목 박기 (BUSINESS.md §0 그대로 가정)
5. 라이브 검증 → admin-status 자동 갱신 → 채팅 종료
6. 종료 직전 16.2 ④ 자동 발동 — 새 사실 있으면 또 박기

---

## 🔴 다음 Claude가 절대 하면 안 되는 것

- 임의로 만든 카드/숫자 박기 (이번 채팅에서 4번 어김)
- DECISIONS 안 보고 추측하기 (이번 채팅에서 5번 어김)
- 어려운 말 쓰기 (commit SHA, etag, raw URL 등 → "저장번호", "캐시 지연" 등으로)
- 채팅 끝나는데 새 사실 안 박기 (이번 채팅 1번 어김 → 대표님 지적으로 수정)

---

**단일 진실원**: `_decisions/business-agreements.json` (21개 합의) + `tasks.json` (260개 BL) + `OPERATIONS_CHARTER.md` (부칙 1~20 + 16.2)
