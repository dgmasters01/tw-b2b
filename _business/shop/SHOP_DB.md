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

---

## 7. 사진 — «공유»가 아니라 «복사» (2026-09-03 · D-112)

> 대표님: *「블로그에서 호텔사진을 미리 받아 놓은 호텔의 경우 이쪽으로 가져올 수 있나? 공유의 개념이라기보다 복사의 개념이라고 해야 될까?」*

**복사가 맞다.** 남의 저장소 주소를 그대로 쓰면 그건 공유이고, 그쪽이 파일을 지우거나 창고가 멈추면 우리 화면이 같이 깨진다.
→ **파일 자체를 우리 저장소로 옮기고, 주소를 우리 것으로 바꾼다.** 옮긴 뒤로는 블로그와 무관하다.

### 실행 결과 (2026-09-03)

| 구분 | 곳 |
|---|---|
| **우리 저장소로 복사 완료** | **1,043** (2026-09-05 전량 이관 · D-115) |
| 남의 주소 참조 | **1** (원본이 401 을 돌려준 곳) |
| 사진 없음 | 6 (아고다가 응답을 주지 않는 호텔) |
| 합계 | 1,050 |

- 저장 위치: shop 창고 Storage 버킷 `hotel-photos` · 경로 `{agoda_hotel_id}/main.jpg` · 공개 버킷
- 복사 창구: `api/admin/import-photos.js` (임시. 출처는 회사 저장소·아고다 도메인만 허용)
- 실측: 복사본 열림 확인(200 · image/jpeg)

### 🔴 2026-09-05 · 보류 해제 (D-115)

대표님: *「약관 확인 뒤에 하자는 부분은 생각하지 말고 우리 서버로 정리해. 블로그도 한 장을 가져오고 나머지는 우리가 수집해서 업로드해 서비스한다. 여행능력자들도 이 방식으로.」*

- 아고다·부킹 참조 **923곳을 전부 우리 Storage 로 이관**(121 → 1,043곳) · 45MB · 추가 비용 0원
- 새벽 봇이 **사진 빈 호텔을 만나면 받아서 우리 저장소에 넣고 우리 주소로 적는다** — 새 호텔도 자동
- 🔴 앞으로 어떤 화면·봇도 `pix*.agoda.net` 주소를 `photo_url` 에 그대로 적지 않는다

### 옛 기록 — 남은 911곳(2026-09-03 시점)

아고다 주소를 그대로 참조한다. **아고다가 주소를 바꾸면 깨진다.**
→ ①매일 깨짐 점검을 봇에 포함 ②깨지면 명부에서 새 주소를 다시 받아 채운다
→ 파일 복사(재호스팅)는 **아고다 약관 확인 전까지 보류**. 용량은 문제가 아니다(1,050장 ≈ 50MB)
→ 블로그가 앞으로 더 받아두는 사진도 **주기적으로 같은 방식으로 복사**해 온다(참조하지 않는다)

---

## 8. 주말 가격 수집 (2026-09-04 가동)

> 대표님: *「목,금,토,일 이렇게 하자. 그리고 너가 파악한 호텔들 오늘부터 가격정보 저장해 놓아라.」*

| 항목 | 값 |
|---|---|
| 대상 | 앞으로 **3달의 목·금·토·일 = 53일** (`v_collect_dates`) |
| 방식 | 🔴 **아고다에 호텔 번호를 60개씩 묶어 조회** — 한 날짜당 17~18회 |
| 하루 호출 | **901회** (한도 2,160의 42%) |
| 첫날 결과 | 49,125줄 · 호텔 985곳 · 창고 6.5MB |
| 자동 | Vercel cron 매시 · 한 번에 날짜 3개씩 (시간당 한도 보호) |
| 기록 | `shop_collect_log` (run_date, stay_date, calls, rows_saved, ok) |

**호텔 하나씩 물으면 하루 40,950회로 한도 19배 초과.** 묶음 조회가 이 기능을 가능하게 만든 열쇠다.

### 화면에 쓰는 값 (v_shop_card)

- `best_date` / `best_price` — 3달 중 가장 싼 주말과 그 값
- `max_price` — 가장 비쌀 때
- `price_at_publish` — 🔴 **영상 숙박일 = 조회 기준일일 때만** 채워진다(옛 영상 453편은 null)
- `price_at_publish_raw` — 참고 표시용 원값

---

## 9. 연관 상품 (KKday · 2026-09-04)

> 대표님: *「우리가 KKDAY 상품들이 있어. 연관 상품들을 이미지로 띄워서 나라 도시별로 맞춤형으로.」*

### 제휴 규칙

| 항목 | 값 |
|---|---|
| CID | **15352** (여행능력자들 웹사이트) |
| 링크 | KKday 페이지 주소 뒤 `?cid=15352` |
| 태그 | `ud1` = 도시 slug · `ud2` = 화면(main/city) |
| 🔴 추적 기간 | **30일** — 아고다(방문 1회)와 결정적으로 다르다. 오늘 안 사도 한 달 안에 사면 우리 몫 |

### 표

`shop_product` — source · ext_id · title · category · country_slug · city_slug · image_url · link_url · price · badge · sort_order · active · synced_at
`shop_product_click` — 어느 도시·어느 화면에서 눌렀는지

### 도시 맞춤 3단계 (`api/products.js`)

1. 그 **도시** 상품 → 2. 없으면 같은 **나라** 상품 → 3. 그것도 없으면 **영역 자체가 사라짐**
🔴 런던 보는 손님에게 오사카 상품을 보여주지 않는다. 억지로 채우느니 안 보이는 게 낫다.

### 수집 (2026-09-04 1차)

- KKday는 **서버 접근을 막는다**(Cloudflare). 우회하지 않는다.
- → **대표님 크롬을 통해 정상 접속**해 화면에 표시된 목록을 읽었다. 사람이 보는 것과 같은 방식.
- 도시 주소 규칙: `kkday.com/ko/destination/{국가코드}-{도시}` (다낭=`vn-da-nang`, 후쿠오카=`jp-hakata`)
- 결과: **129개 · 13개 도시 · 사진 129/129 · 가격 129/129**
- 분류는 제목에서 자동 판정: 유심 / 교통 / 투어 / 입장권
- 이미지는 **참조만**(600px). 우리 저장소로 복사하지 않는다 — 아고다와 같은 원칙

### 표시 규칙 🔴

| 항목 | 규칙 |
|---|---|
| 가격 | **「139,000원부터」** — 우리가 가진 건 사본이라 단정하지 않는다 |
| 제목 | 「[추석 프로모션]」 등 **기간 한정 문구 제거** (지나면 거짓이 됨) |
| 오래된 상품 | `synced_at` 기준 **45일 지나면 자동으로 안 보임**(`v_shop_product`) |
| 고지 | 푸터 한 줄로 통합 — 「가격은 조회 시점과 이용 일자에 따라 달라질 수 있습니다」 |
| 갱신 주기 | **월 1회** (액티비티는 프로모션 단위로 바뀜) |

### 남은 과제

🔴 **KKday에 상품 데이터 피드(XML/CSV)나 API를 요청**해야 한다. 받으면 매일 자동 갱신되고 가격도 「부터」 없이 정확해진다. 지금은 매번 크롬을 거쳐야 해서 자동화가 안 된다.
