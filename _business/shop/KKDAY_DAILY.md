# 🔴 KKday 값 «매일» 받기 — Cowork 예약 작업 명령서 (2026-09-09 신설)

> 대표님: *«호텔은 매일 가격을 체크하잖아. kkday도 매일 체크하자. 한국시간 01:10 에 가격·할인을»*
> *«값을 매일 받을 수 있는 구조를 설계해»*
>
> 🔴 **KKpartners 제휴 상품 피드는 «추후»다** (2026-09-09 대표님 확정: *«kkday도 우리가 판매량이
> 많아져야 제휴가 될 수 있어. 추후 할 수 있게 하자»*). **지금 문의하지 않는다.** 판매가 붙은 뒤에 한다.

---

## 왜 서버 크론이 아니라 «대표님 컴퓨터»인가 — 세 곳에서 재본 결과

| 어디서 부르나 | 결과 |
|---|---|
| 클로드 작업칸 | 🟢 **200** (헤더 풀세트) |
| **Vercel 서버** (크론을 걸 곳) | 🔴 **403** |
| **GitHub Actions 일꾼** | 🔴 **403** |

🔴 **헤더 문제가 아니라 «IP» 문제다.** 똑같은 헤더인데 어떤 곳은 되고 어떤 곳은 안 된다.
Cloudflare(`cf-mitigated: challenge`)가 **데이터센터 IP 를 통째로 막는다.**
→ **서버에 크론을 걸어 01:10 에 도는 방법은 존재하지 않는다. 다시 시도하지 마라.**
증거: `travelwinners-shop` 레포 `_probe/kk-actions-result.json`.

**남은 길은 「사람이 쓰는 인터넷 회선」뿐이다** → 대표님 컴퓨터의 **Cowork 예약 작업**.

---

## 대표님이 한 번만 해두시면 되는 것 (그 뒤로는 매일 저절로)

Cowork 에서 **예약 작업(Scheduled Task)** 을 하나 만들고, 내용에 아래를 넣는다.

```
매일 새벽 1시 10분 (한국시간)

tw-b2b 레포 _business/shop/KKDAY_DAILY.md 를 읽고 KKday 값 매일 받기를 실행해.
창구: https://gohotelwinners.com/api/ops/db-query  (헤더 x-ops-token)
x-ops-token: (열쇠)
```

🔴 **조건 두 가지** — ①노트북이 켜져 있어야 한다 ②Cowork 앱이 열려 있어야 한다.
「컴퓨터 절전 모드 방지」를 켜 둔다. **덮개를 닫으면 멈춘다.**
🔴 밤에 노트북을 끄시면 그날은 건너뛴다 — **건너뛴 날은 다음 날 자동으로 함께 받는다**(아래 §3 장부).

---

## 1) 🔴 먼저 «재 본다» — 두 길 중 어느 쪽인지 30초로 정한다

**빠른 길(bash)** 이 되면 1,097개를 **약 7분**에 끝낸다. 안 되면 브라우저로 **약 25분**이다.

```bash
curl -s -o /dev/null -w "%{http_code}\n" --compressed \
 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" \
 -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" \
 -H "Accept-Language: ko-KR,ko;q=0.9,en;q=0.8" \
 -H 'Sec-Ch-Ua: "Chromium";v="140", "Not_A Brand";v="24"' -H "Sec-Ch-Ua-Mobile: ?0" \
 -H 'Sec-Ch-Ua-Platform: "Windows"' -H "Sec-Fetch-Dest: document" -H "Sec-Fetch-Mode: navigate" \
 -H "Sec-Fetch-Site: none" -H "Sec-Fetch-User: ?1" -H "Upgrade-Insecure-Requests: 1" \
 "https://www.kkday.com/ko/product/18940-kansai-airport-haruka-ticket-japan"
```

| 나온 값 | 어느 길 |
|---|---|
| **200** | 🟢 **A. bash 길** (§2-A) — 약 7분 |
| **403** | 🟡 **B. 브라우저 길** (§2-B) — 약 25분 |

🔴 **헤더 열한 개를 하나라도 빼면 403 이다.** `User-Agent` 만으로는 안 된다 — 실측했다.

## 2-A) 🟢 bash 길 — 100개씩, 4개 동시

각 상품의 **글(HTML)** 안에 이 셋이 그대로 들어 있다. **화면을 그릴 필요가 없다.**

```
lowPrice      → 손님이 보는 「~원 부터」와 «같은 값»  (7개로 대조 확인, 2026-09-08)
ratingValue   → 평점 (소수 첫째 자리로 반올림해 넣는다)
reviewCount   → 후기 수
```

정규식(백슬래시가 섞여 있으니 그대로 쓴다):
```
lowPrice\\?"?\s*:\s*\\?"?([0-9]+)
ratingValue\\?"?\s*:\s*\\?"?([0-9.]+)
reviewCount\\?"?\s*:\s*\\?"?([0-9]+)
```

🔴 **`highPrice` 를 정가로 쓰지 마라.** 그것은 「가장 비싼 옵션 값」이다. 쓰면 **없는 할인이 생긴다.**

## 2-B) 🟡 브라우저 길 — bash 가 403 일 때만

크롬을 아무 KKday 상품 화면에 올려 둔 뒤, 그 안에서 `fetch('/ko/product/'+id)` 로 100개씩.
자세한 코드는 `KKDAY_SYNC.md §2`. **화면을 그리지 않는다 — 글만 읽는다.**

## 3) 다음 차례 — 장부가 기억한다

```json
POST https://gohotelwinners.com/api/ops/db-query     헤더 x-ops-token
{ "project_ref": "jyjcdxdezjfcikqndxeo", "query":
  "select p.ext_id, p.link_url from shop_product p
     left join shop_kk_sync s on s.ext_id=p.ext_id
    where p.source='kkday' and (s.updated_at is null or s.updated_at < now() - interval '20 hours')
    order by p.review_count desc nulls last, p.id asc limit 100" }
```

🔴 **「날짜」가 아니라 「20시간 전」으로 센다 — 이것이 핵심이다.**
창고 시계는 **UTC** 이고 우리는 **한국시간 01:10** 에 돈다. 한국 1월 2일 01:10 = UTC 1월 1일 16:10 이라
`current_date` 로 세면 **창고에게는 아직 「1일」** 이다. 1일 낮에 한 번 받았다면
**「오늘 다 했다」로 읽혀 0개가 나오고 그날은 통째로 건너뛴다.**
🔴 실제로 재보다가 이 함정에 걸렸다(2026-09-09 · 「오늘 안 받음 0개」가 나왔다).
`updated_at < now() - interval '20 hours'` 는 **시간대와 무관하다.** 20시간으로 둔 이유는
새벽 1시 10분이 조금 밀려도(1시 30분 등) 그날 몫이 빠지지 않게 여유를 준 것이다.

🔴 어제 노트북이 꺼져 있었어도 오늘 돌리면 전부 다시 나온다 — **놓친 날을 따로 챙길 필요가 없다.**
🔴 **후기 많은 것부터** 나온다. 중간에 멈춰도 손님이 실제로 누르는 상품부터 새 값이 된다.

## 4) 창고에 넣는다 — 100개씩

```sql
with v(ext_id, price, rating, review_count) as (
  values ('18940', 11311, 4.8, 23114), ('19691', 13573, 4.8, 13215)
),
t as (select p.id, v.* from v join shop_product p on p.ext_id=v.ext_id and p.source='kkday'),
u as (update shop_product p set price=t.price, synced_at=now(),
        rating       = coalesce(t.rating, p.rating),
        review_count = coalesce(t.review_count, p.review_count)
      from t where p.id=t.id returning p.id),
d as (insert into shop_product_price (product_id, checked_on, price, currency, active)
        select t.id, (now() at time zone 'Asia/Seoul')::date, t.price, 'KRW', true from t
        on conflict (product_id, checked_on) do update set price=excluded.price, active=true returning 1),
k as (insert into shop_kk_sync (ext_id, product_id, synced_on, price, ok, updated_at)
        select t.ext_id, t.id, (now() at time zone 'Asia/Seoul')::date, t.price, true, now() from t
        on conflict (ext_id) do update set synced_on=excluded.synced_on,
          price=excluded.price, ok=true, updated_at=now() returning 1)
select (select count(*) from u) 갱신
```

🔴 **날짜 칸(`synced_on`)에는 «한국 날짜»를 넣는다**(`(now() at time zone 'Asia/Seoul')::date`).
안 그러면 새벽에 받은 것이 **전날 자리**에 쌓여 「어제와 오늘」 비교가 하루씩 밀린다.
🔴 **버리는 것** — `1,000원 미만`(맞춤 견적이 104원·203원을 보여준다) · `900만원 초과` · 값이 안 잡힌 것.
🔴 **평점·후기는 «있을 때만» 덮는다**(`coalesce`). 못 읽었다고 빈 값으로 지우면 안 된다.
🔴 **할인율·정가·예약 수는 여기서 «건드리지 않는다».** 글에 없어서 못 받는다 — 월 1회 `KKDAY_SYNC2.md` 몫이다.

## 5) 속도 — 1차에서 실제로 잠겼다

| | |
|---|---|
| 동시에 | **4개** (6개는 429 를 불렀다) |
| 100개 묶음 사이 | **60초** 쉰다 |
| 429 「System busy」 | **즉시 멈추고 20분** 기다린다. 계속 두드리면 더 길어진다 |
| 예상 | bash 약 **7분** · 브라우저 약 **25분** |

## 6) 끝나면 한 줄로 남긴다

```sql
select count(*) filter (where updated_at > now() - interval '20 hours') 이번회차받음,
       count(*) filter (where updated_at is null or updated_at <= now() - interval '20 hours') 못받음
  from shop_kk_sync
```
🔴 여기서도 **날짜가 아니라 「20시간」으로 센다** — 위와 같은 이유다.
**80% 미만이면 대표님께 알린다.** 그 아래면 무언가 막힌 것이다.

---

## 🔴 무엇을 얼마나 자주 받나 (2026-09-09 실측으로 정함)

인기 상품 20개를 **하루 뒤 다시 재본 결과**:

| | 하루 만에 바뀐 것 | 그래서 |
|---|---|---|
| 값 | **17 / 20** | **매일** |
| 평점 | **0 / 20** | 값과 같은 글에 있어 **덤으로 매일** (따로 받는 비용 0) |
| 후기 수 | **2 / 20** (+1씩) | 〃 |
| 할인율·정가·예약 수 | — | 🔴 **월 1회** (`KKDAY_SYNC2.md` · 브라우저 필요) |

🔴 **값이 바뀐 17개를 뜯어보니 거의 전부 −0.14% 나 −0.39% 였다** — 값 인하가 아니라 **환율**이다
(KKday 는 외화로 팔고 원화로 환산해 보여준다).
**매일 받는 진짜 이유는 「어느 날 프로모션이 시작될지 몰라서」다.** 그 하루를 놓치면
「가장 싼 값을 추천 드립니다」라는 우리 약속이 깨진다.

---

**만든 날** 2026-09-09 · **형제 문서** `KKDAY_SYNC.md`(1차 방법) · `KKDAY_SYNC2.md`(월 1회 할인·조건)
**되돌리기** `SHOP_ROLLBACK.md §17` · **왜 서버가 안 되나** `SHOP_TECH.md §37-C`
