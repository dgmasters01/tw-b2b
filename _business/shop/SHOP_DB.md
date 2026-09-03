# travelwinners.shop 창고 설계 — 메인 페이지 1차분

> 작성 2026-09-03 · 결정 D-111(창고 완전 분리) · D-110(가격 기준/딱지) · D-108(호텔 중심)
> 창고: **shop 전용 Supabase 프로젝트** `travelwinners-shop` (생성 대기)
> 원칙: 화면은 계산하지 않는다. 딱지 판정까지 **뷰가 끝내서** 내려준다.

---

## 1. 화면 ↔ 창고 대응표 (이것이 어긋나면 안 된다)

| 메인 화면 요소 | 출처 |
|---|---|
| 「오늘 소개한 호텔 3곳」 · 날짜 · 도시 | `shop_video` |
| TOP 1·2·3 | `shop_video_hotel.rank` |
| 호텔명 · 성급 · 사진 1장 · 위치 · 체크인 | `shop_hotel` |
| 우리 한마디 | `shop_video_hotel.one_liner` |
| 지금 값 | `shop_price_daily` (오늘 조회분) |
| 영상 때 값 | `shop_video_hotel.price_at_publish` |
| 딱지 「한 달 중 제일 쌈」 | `v_shop_card.badge` = `low` (뷰 판정) |
| 딱지 「○○원 내림」 | `v_shop_card.badge` = `drop` + `drop_amount` |
| 「10월 10일(금) 기준」 | `shop_video.stay_date` |
| 도시별 「34곳」 | `v_shop_city` |
| [예약] 클릭 | `shop_click` 기록 → 아고다 |

## 2. 표 6개 + 뷰 2개

```sql
-- 소개한 호텔만 사본 (301만 곳 명부를 통째로 복사하지 않는다 — D-111 ③)
create table shop_hotel (
  agoda_hotel_id bigint primary key,
  hotel_name     text not null,
  hotel_name_ko  text,
  country        text not null,
  country_slug   text not null,
  city           text not null,
  city_slug      text not null,
  star_rating    numeric,
  photo_url      text,
  location_note  text,          -- 「난바역 도보 3분」
  checkin_time   text,
  checkout_time  text,
  synced_at      timestamptz default now()
);
create index on shop_hotel (country_slug, city_slug);

-- 쇼츠 1편 = 호텔 3곳 (D-108)
create table shop_video (
  id            bigserial primary key,
  youtube_id    text unique,
  title         text,
  published_on  date not null,
  country_slug  text not null,
  city_slug     text not null,
  stay_date     date not null,   -- 🔴 그 쇼츠가 말한 그 날짜 (D-110 ①)
  created_at    timestamptz default now()
);
create index on shop_video (published_on desc);

create table shop_video_hotel (
  video_id         bigint references shop_video(id) on delete cascade,
  rank             smallint not null check (rank between 1 and 3),
  agoda_hotel_id   bigint references shop_hotel(agoda_hotel_id),
  one_liner        text,        -- 직접 본 한 문장
  price_at_publish integer,     -- 🔴 발행일에 찍어둔 그 값. 없으면 딱지 안 붙음
  primary key (video_id, rank)
);

-- 매일 같은 날짜를 다시 조회해 쌓는다 (호텔당 하루 1줄)
create table shop_price_daily (
  agoda_hotel_id bigint not null,
  stay_date      date   not null,
  checked_on     date   not null,
  price          integer not null,
  currency       text default 'KRW',
  primary key (agoda_hotel_id, stay_date, checked_on)
);
create index on shop_price_daily (agoda_hotel_id, stay_date, checked_on desc);

create table shop_click (
  id             bigserial primary key,
  agoda_hotel_id bigint,
  video_id       bigint,
  page           text,          -- main / city / search
  session_key    text,
  clicked_at     timestamptz default now()
);

create table shop_search_log (
  id         bigserial primary key,
  keyword    text not null,     -- 다음 영상 주제가 된다
  hit_count  integer,
  searched_at timestamptz default now()
);
```

## 3. 딱지를 판정하는 뷰 — 화면은 계산하지 않는다

```sql
create view v_shop_card as
with latest as (
  select distinct on (agoda_hotel_id, stay_date)
         agoda_hotel_id, stay_date, price, checked_on
  from shop_price_daily
  order by agoda_hotel_id, stay_date, checked_on desc
),
stat as (
  select agoda_hotel_id, stay_date,
         min(price) as min_price,
         count(distinct checked_on) as watched_days
  from shop_price_daily group by 1,2
)
select v.id as video_id, vh.rank, h.*,
       v.published_on, v.stay_date, vh.one_liner, vh.price_at_publish,
       l.price as price_now, s.watched_days,
       case
         when s.watched_days >= 14 and l.price <= s.min_price then 'low'
         when vh.price_at_publish is not null
              and vh.price_at_publish - l.price > 3000       then 'drop'
         else 'none'
       end as badge,
       case when s.watched_days >= 30 then '한 달'
            when s.watched_days >= 14 then '2주' end as badge_window,
       greatest(vh.price_at_publish - l.price, 0) as drop_amount
from shop_video v
join shop_video_hotel vh on vh.video_id = v.id
join shop_hotel h        on h.agoda_hotel_id = vh.agoda_hotel_id
left join latest l on l.agoda_hotel_id = vh.agoda_hotel_id and l.stay_date = v.stay_date
left join stat   s on s.agoda_hotel_id = vh.agoda_hotel_id and s.stay_date = v.stay_date;

create view v_shop_city as
select country_slug, city_slug, country, city, count(*) as hotel_count
from shop_hotel group by 1,2,3,4;
```

🔴 `badge` 는 **`low` 가 `drop` 보다 우선**하지만, 화면에서는 **둘 다 뜰 수 있다**(D-110 C-35).
`low` 일 때도 `drop_amount > 3000` 이면 가격 옆에 연한 초록을 같이 붙인다.
🔴 `watched_days < 14` 면 `low` 를 만들지 않는다 — 거짓 표시 방지(C-39).

## 4. 자물쇠

- 모든 `shop_*` 표는 RLS 켜고 **정책 없음**(기본 거부). 서버 열쇠(service_role)만 접근.
- 손님 화면은 창고를 직접 묻지 않는다 — 새벽에 JSON 으로 구워 CDN 에서 읽는다(D-094).

## 5. 값이 들어오는 길

```
아고다  ──(봇 1개, 하루 1,026회)──▶  수집 결과
                                        ├─▶ 블로그 창고 (기존)
                                        └─▶ JSON 파일 ─▶ shop 창고 shop_price_daily
```

봇은 **하나뿐**이다(D-111 ②). 아고다 호출은 늘지 않는다.

## 6. 아직 만들지 않는 것 (2차)

`shop_member` · `shop_price_alert` · `shop_event` · `shop_event_entry` · `shop_mail_log`
→ 회원가입 화면을 실제로 여는 날 만든다.
