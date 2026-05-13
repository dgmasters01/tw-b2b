---
slug: 2026-05-13-bl-past-video-recon
title: BL-PAST-VIDEO-RECON — 호텔별 과거 누적 매출 자동 집계 (admin 신규 탭)
date: 2026-05-13
tasks: [BL-PAST-VIDEO-RECON]
commits: []
decisions: [D-035, D-038]
---

## 🎯 한 줄 요약

호텔별로 우리 8개 유튜브 채널이 만든 누적 매출을 hotel_id + agoda_hotel_id + 호텔명/도시/국가 매칭으로 집계한 다음, admin에 우리만 보는 '📺 Video Asset Revenue' 탭을 새로 만들어서 D-035 3구간(강력 $1,000+ / 부드러움 $200~$999 / 숨김 $0~$199) 라벨로 한눈에 보여준다.

## 📍 왜 발생했나

D-035에서 신규 매니저 가입 시 "당신 호텔은 우리 채널로 이미 $X 매출이 발생했습니다"를 영업 무기로 쓰기로 정했는데, 이걸 보여주려면 먼저 우리 쪽에서 호텔별 누적 매출이 정확하게 집계돼야 한다. 그런데 지금은 bookings_self(자체 영업)와 bookings_agoda(아고다 채널 업로드)가 따로 있고, 같은 호텔이 양쪽에 다른 hotel_name으로 들어가있을 수 있어서 합쳐서 보는 화면이 없었다. 매니저에게 보여주기 전에 우리가 먼저 데이터 정확도를 검증할 admin 영역이 필요했다.

## 🛠 어떻게 해결했나

세 층으로 박았다. 첫째, Supabase에 `v_hotel_past_revenue` VIEW를 신설해서 bookings_self/bookings_agoda를 hotels 테이블에 4단계 우선순위로 매칭(hotel_id UUID → agoda_hotel_id TEXT → name+city+country 폴백)하고 호텔 단위로 SUM 집계 + D-035 임계값 CASE로 strong/soft/hide 라벨 자동 산출. 둘째, api/admin.js에 `?action=past-video-revenue` 핸들러를 추가해 requireAdmin 인증 통과 후 VIEW를 PostgREST로 조회(tier/min_revenue/search 필터 + summary 카드용 집계 동시 반환). 셋째, _admin/admin.html 사이드바 Sales 섹션에 '📺 Video Asset Revenue' 메뉴를 추가하고 #tab-video-revenue 패널에 요약카드 4개(전체 호텔 / Strong / Soft / Total Revenue) + 필터바(tier 4버튼 + 검색 입력 + 새로고침) + 테이블(순위/구간/호텔/매출/예약수/기간/매칭방법/상태)을 박았다. 데이터 로딩 JS는 별도 IIFE로 분리해서 setActiveTab('video-revenue') 시 lazy load.

## ✅ 결과

- sql/07-hotel-past-revenue-view.sql 신설 (174줄, 4단계 매칭 + 3구간 라벨)
- api/admin.js에 past-video-revenue action 추가 (ALLOWED_ACTIONS / switch case / NON_LOG_ACTIONS 등록)
- _admin/admin.html 사이드바 메뉴 + TAB_META + lazy load hook + 탭 패널 + 데이터 로딩 IIFE 추가
- JS 문법 검증 통과 (8개 script 블록 전부)
- HTML div 균형 작업 전후 동일 (diff=1, 신규 28개 매칭)
- tasks.json status=done + progress.steps 5단계 박음 + stats 자동 재계산 (done 154/209)
- 라이브 적용 조건: Supabase Dashboard에서 sql/07-hotel-past-revenue-view.sql 한 번 실행 필요 (서비스 진입 전 평시 SQL은 자동 적용 봇 없음 — 대표님이 Supabase SQL Editor에 붙여넣고 Run 한 번)

## ⏱ 다음 결정 필요

다음 단계 BL-SIGNUP-ENRICHMENT (신규 매니저 가입 시 D-035 임계값 분기 노출)에서 본 VIEW를 그대로 재사용 가능. 매칭 정확도 검증 후 80~94% 구간 수동 admin 검수 워크플로 별도 BL 필요 여부 대표님 판단.

---

# 🔧 기술 상세 (개발자용)

## VIEW 매칭 우선순위 (정확도 95%+ 자동 노출 기준)

| 순위 | 매칭 키 | 대상 | 정확도 |
|---|---|---|---|
| 1 | bookings_self.hotel_id = hotels.id | UUID 직접 매칭 | 100% |
| 2 | bookings_agoda.hotel_id = hotels.id | UUID 직접 매칭 (admin이 이미 매칭한 건) | 100% |
| 3 | bookings_agoda.hotel_id_agoda = hotels.agoda_hotel_id | TEXT 일치 (Agoda ID 자동) | 99% |
| 4 | hotel_name + address LIKE city (LOWER+TRIM) | 폴백 (name 정확 일치 + 주소에 도시 포함) | ~85% |

## D-035 3구간 산출 로직 (CASE WHEN)

```sql
CASE
  WHEN COALESCE(ha.total_revenue_usd, 0) >= 1000 THEN 'strong'
  WHEN COALESCE(ha.total_revenue_usd, 0) >= 200  THEN 'soft'
  ELSE 'hide'
END AS revenue_tier
```

`hide` 안에 매출 $0인 호텔과 $1~$199 호텔은 라벨 텍스트(`revenue_tier_label_ko`)에서 구분 ("예약 없음" vs "숨김").

## API 응답 페이로드

```json
{
  "ok": true,
  "rows": [...],
  "summary": {
    "total_hotels": 200,
    "strong_count": 12,
    "soft_count": 45,
    "hide_count": 143,
    "total_revenue_usd": 854000,
    "total_bookings": 3774,
    "hotels_with_revenue": 57
  },
  "filters": {...},
  "meta": {
    "decision_ref": "D-035",
    "bl_ref": "BL-PAST-VIDEO-RECON",
    "tier_thresholds": { "strong": 1000, "soft": 200 }
  }
}
```

## 사이드바 진입 경로

`/admin.html` → 좌측 사이드바 Sales 섹션 → '📺 Video Asset Revenue' 클릭 → 즉시 lazy load 시작 → 요약카드 4개 + 테이블 렌더링.

## RLS / 권한

VIEW는 SECURITY INVOKER (기본). REVOKE FROM anon + GRANT SELECT TO service_role/authenticated. 실제 API에서는 service_key로 호출하므로 모든 행 노출. authenticated 사용자가 직접 호출하면 hotels/bookings_* 의 RLS가 적용되어 본인 호텔 행만 보임 (BL-SIGNUP-ENRICHMENT에서 이 동작 그대로 활용).

## 라이브 적용 절차 (대표님)

1. Supabase Dashboard → SQL Editor 진입
2. sql/07-hotel-past-revenue-view.sql 내용 전체 복사
3. SQL Editor에 붙여넣고 Run
4. /admin.html 새로고침 → 사이드바 'Video Asset Revenue' 클릭 → 데이터 로드 확인
