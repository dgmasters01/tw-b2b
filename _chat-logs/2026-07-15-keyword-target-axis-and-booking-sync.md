---
slug: 2026-07-15-keyword-target-axis-and-booking-sync
title: 키워드 타겟축 정정 + 좌표 로봇 가동 + 아고다 7/13 데이터 반영
date: 2026-07-15
tasks: [BL-HOTEL-GEO, BL-HANDOFF-TRUTH, BL-KEYWORD-TARGET-AXIS, BL-HOTEL-MASTER-RESYNC, BL-LANDING-STATS-AUTO, BL-BOOKING-RAW-KEEP, BL-BOOKING-EARNINGS-IMPORT, BL-MANAGER-COUNTRY-REAL]
commits: [6c15fcfc, 826232dd, f5e783ba, e8822418, 2dc76dc0, d29c98ff, 0cd72393, a4909f2d, b16733ba, 0050a5a3, 0435c523, d4dd9f5d, 47f03238, 148bcb41, cf58932f, 61a3a529, 0bd96c82, ee00bcba, df9050d4]
decisions: [D-065, D-067]
---

## 🎯 한 줄 요약
호텔 좌표 채우는 로봇을 걸어 8월 초까지 자동으로 끝나게 했고, 키워드 겨냥 단위를 "채널"에서 "언어"로 바로잡았으며, 대표님이 올리신 7월 13일치 아고다 데이터가 기존 실적을 안 다치고 들어왔음을 확인했다.

## 📍 왜 발생했나
키워드 화면을 채널별로 나눠 그렸는데, 한국어 채널 3개는 같은 한국 사람을 보므로 같은 조사를 3번 하는 구조였다. 그리고 인계서·비즈니스 독스가 서로 다른 말을 하고 있어 클로드가 매번 다른 방향으로 갔다.

## 🛠 어떻게 해결했나
겨냥 단위를 언어 5개(한국어·일본어·중국어 번체·베트남어·영어)로 확정하고, 대표님의 현지화 전략을 아고다 원본 7,316건으로 검증했다(일본 채널 손님 94%가 일본 사람). 흩어져 있던 방향을 문서 6곳에 한 벌로 맞추고, 인계서가 거짓말하면 기계가 매일 잡아내는 검사 로봇을 붙였다.

## ✅ 결과
- 호텔 좌표 = 사람 손 없이 8월 초 완료(하루 135개 자동)
- 같은 조사를 3번 하던 낭비 제거 → 조사 5회로 축소
- 7월 13일치 데이터 반영 후에도 우리 수익 $36,767 그대로 살아있음 확인
- 다음 클로드가 같은 실수를 못 하도록 문서·검사 로봇으로 막음

## ⏱ 다음 결정 필요
대표님이 아고다에서 **수수료(Earnings) 리포트**를 받아주셔야 최근 3개월 수익이 0원으로 보이는 문제가 풀린다.

---

# 🔧 기술 상세 (개발자용)

## 1. BL-HOTEL-GEO — 좌표 크론 등록
- **덫**: 인계서가 지시한 `/api/cron/hotel-geo-fill` 은 **존재하지 않음(404)**. 실제 `api/hotel-geo-fill.js` 는 POST + `x-ops-token` 전용인데 Vercel 크론은 **GET + Bearer CRON_SECRET** → 그대로 걸면 405/401 로 21일 조용히 실패.
- **구조**: `api/_lib/hotel-geo.js`(로직 단일 진실) ← `api/hotel-geo-fill.js`(수동·30건 상한) / `api/cron/hotel-geo-fill.js`(자동·45건·maxDuration 60).
- **배분(A안)**: 구글 콘솔 SearchTextRequest 하루 150은 `api/google-places.js`(B2B 가입 호텔검색)와 **공유** → 45×3=135, 15건은 가입 몫.
- **스케줄** `0 8,12,16 * * *`(UTC) = KST 17·21·01시. 구글 일 한도는 **태평양 자정(KST 16시경)** 리셋 → 3회가 같은 PT 날에 들어가도록 배치.
- **실측**: 45건=36초(30초 초과 → 수동 입구는 30건 상한). ok 44 / manual_check 1(Osaka Fujiya 334km 밖) / not_found 0.

## 2. BL-HANDOFF-TRUTH — 인계서 자동 검사
- `api/ops/handoff-verify.js`(하루 1회, UTC 22). 검사 4종: 인계서가 언급한 파일 경로 실존 / **확장자 없는 API 경로 실존** / crons 각 항목의 파일 실존 / Bearer CRON_SECRET 수용 / POST 전용 아님.
- **봇 자체 버그 발견·수정**: raw.githubusercontent CDN 캐시(~5분)로 옛 인계서를 읽고 되써 **앞 커밋을 덮음**(시험 중 실제 발생) → GitHub Contents API 직독으로 교체 후 재시험 통과.
- 규칙: `_os/playbook/handoff-truth.md`. **뿌리 수정**: `_os/boot.md` §4 표에 `BUSINESS.md` 행이 **없어서** 안 읽던 구조 → 추가.

## 3. D-065 ⑮~㉒ — 타겟축·시장
- 타겟 = 언어+시장. 채널 제거(채널은 전개면 = **D-067**).
- 번체 = **대만+홍콩**(TW 66%·HK 15% · 둘이 같은 목적지를 삼 → 한 타겟). 간체=본토=유튜브 차단 → 타겟 없음.
- 영어 = **전세계**(17개국 분산·PH 25%·US 16%). ⚠️ `v_manager_recent_bookings` 는 en→'US' 로 단정 중 → 교체 대상.
- `사이트 주소 위치`(손님 시장) = 아고다 원본 칸. 대표님 업로드(7/15 08:30 UTC)로 `customer_country` 에 이미 적재됨(KR 6,183 → South Korea 6,183 일치) → ⑲의 "customer_country 금지" **해제**.
- 리드타임 재측정: 확정 3,828건·중앙값 19일·3달내 92.2% → **판단 불변**(착수=피크−3달).

## 4. 업로드 후 연동 검증 (7,169 → 7,316)
| 검사 | 결과 |
|---|---|
| cid 12개 × 엑셀 대조 | 전부 차이 0 ✅ |
| 예약금 | $882,203 = 엑셀 합계 ✅ |
| 수수료 | $36,767 / 3,756건 유지 ✅ (엑셀 수수료 칸 0인데 안 덮음) |
| `v_admin_bookings`·`v_admin_channel_stats` 0건 | **정상** — `WHERE is_admin(auth.uid())` |
| 호텔 마스터 | **미연결 78건**(신규 147건 중) = 새 호텔 68개 → BL-HOTEL-MASTER-RESYNC |
| `raw_row_data` | **0건** → BL-BOOKING-RAW-KEEP |

## 5. 신규 3개월 (4/14~7/13, 147건)
ko 95(확정 47·취소 33·$19,166) · zh-tw 28(**취소 22 = 79%**) · ja 21 · en 2 · vi 1
도시: 하노이 21 · 호치민 14 · 파타야 10 · 타이베이 8 · 후쿠오카 7
⚠️ 신규 수수료 합계 **$77** — Earnings 리포트가 4/13까지만 → BL-BOOKING-EARNINGS-IMPORT(대표님 대기)

## 6. 대표님 지적 3건 (전부 클로드 과실)
1. "계속 꼬이면 안 됨" → 인계서를 기억으로 써서 거짓이 박힘 → 검사 봇 + 규칙
2. "추측으로 만들고 나중에 정리한 걸 다시 체크한다" → 문서 3곳에 답이 있는데 안 읽고 목업을 그림 → boot.md §4에 BUSINESS.md 의무 추가
3. "비즈니스 독스 확인했나" → **안 했음**. BUSINESS.md 7-E-3 이 폐기된 역순 공식(자동완성=수요)을 그대로 갖고 있었음 → 교체
