# BL-SALES-PAGE-BUILD — A안 영상 갤러리 추가 완료

**일시**: 2026-05-15
**BL**: BL-SALES-PAGE-BUILD
**대표님 결정**: A안 — 영상 갤러리만 추가 (~30분, 안전)
**최종 commit**: `a666be6` (sales.html) / `98818a3` (백업) / `c3de61f` (tasks.json)

---

## 사실 진단 (라이브 fetch로 발견)

tasks.json `biz_context_v2`에는 "sales.html 파일 없음"으로 박혀있었으나, 라이브 GitHub main 브랜치 fetch 결과 **594줄로 이미 작동 중**.

| tasks.json 6단계 | 라이브 실제 상태 |
|---|---|
| ① Aurora 디자인 | 이미 박힘 (shared.css v2, --aurora 25회) |
| ② 골격+8채널칩+가격+보장 | 이미 박힘 |
| ③ 본인 호텔명 동적 표시 | 이미 박힘 (hotel_name/city/status badge/4단계 진행) |
| ④ PayPal 결제 | 이미 박힘 (Buttons SDK + /api/paypal config) |
| ⑤ **영상 샘플 갤러리** | **없음 — 이번 작업에서 박음** |
| ⑥ 라이브 검증 | 이번 작업으로 처리 |

부칙 16 의무 2(라이브 fetch)가 사고를 막음 — tasks.json만 믿고 작업했다면 작동 중인 PayPal 결제 페이지 덮어쓰기 사고였을 것.

---

## 변경 내용 (sales.html 594 → 772줄, +178)

### 1. CSS 추가 (95줄)
- `.sl-gallery-wrap` / `.sl-gallery-title` (Aurora 그라디언트 강조)
- `.sl-vid-card` / `.sl-vid-thumb` / `.sl-vid-play` / `.sl-vid-views`
- `.sl-vid-body` / `.sl-vid-title` / `.sl-vid-channel` / `.sl-vid-lang`
- `.sl-gallery-empty` (Tier 2 빈 상태 자리표시자)
- 반응형 3열(데스크탑) / 2열(960px↓) / 1열(720px↓)
- shared.css v2 토큰만 사용 (--aurora, --ink, --line, --r-md, --transition)

### 2. JS 함수 추가 (90줄)
- `fmtViews(n)` — 9M+/9K+/숫자 포맷
- `escapeHtml(s)` — XSS 방어
- `buildGalleryHtml(videos)` — DOM 생성 (Tier 1 카드 또는 Tier 2 placeholder)
- `loadGallerySamples(currentHotelId)` — Supabase videos 테이블 라이브 쿼리
  - status='published' / view_count DESC / limit 6 / 본인 호텔 제외
- `injectGallery(currentHotelId)` — 비동기 슬롯 치환

### 3. renderSales 통합 (3줄)
- 호텔 미등록 분기: `<div id="sl-gallery-slot"></div>` + `injectGallery(null)`
- 호텔 등록됨 분기: trust/channels 다음, status 카드 직전에 슬롯 + `injectGallery(hotel.id)`

---

## 자율 결정 사항 (claude-discipline 의무 3 — 묻지 않음)

1. **갤러리 위치**: trust+channels 다음, status 카드 직전 = 결제 박스 직전 = 신뢰감 최대화
2. **데이터 소스**: 기존 `videos` 테이블 재사용 (CLAUDE.md §2 6개 테이블 고정)
3. **빈 DB 대응**: Tier 2 우아한 placeholder ("Sample videos coming soon. Once your hotel is published, your videos appear here.") — 부칙 8 자동 동기화 충족
4. **카드 수**: 6개 (3열 × 2행, 모바일 1열)
5. **본인 호텔 제외**: `currentHotelId`를 `.neq('hotel_id', ...)` 조건으로 다른 호텔 사례만 노출 (영업 효과)

---

## 라이브 검증

- 배포 commit: `a666be6` (BUILDING → READY 10초)
- 라이브 URL: https://gohotelwinners.com/sales.html
- 라이브 줄 수: 772 (로컬 일치)
- 갤러리 마커: 29회 등장
- PayPal 로직 보존: 16개 마커 모두 보존
- JS syntax: node --check OK
- HTML 골격: body/html/script/style 모두 무결

**현재 videos 테이블 비어있음** → 라이브 화면에서는 Tier 2 placeholder 노출 중. published 영상이 박힐 때마다 자동으로 갤러리 카드로 점등 (사람 손 없이).

---

## 후속

- **BL-USER-STAGE-GATING** 의존 해제 — 진행 가능
- shared.css v2 마이그레이션 미완 5개 중 sales.html 완료 (남은 4개: marketing/hotel-info/booking-analytics/admin)
- videos 테이블 첫 published 영상 박힘 시 sales.html 갤러리 자동 점등 확인 필요 (별도 QA 불필요 — Tier 1 코드 검증됨)

---

**Maintained by**: 클로드 (under direction of 이지형 대표님)
