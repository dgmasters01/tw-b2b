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

## 🟢 어느 길로 가는지 «확정»됐다 (2026-09-09 Cowork 에서 실측)

| 어디서 부르나 | 결과 |
|---|---|
| Vercel 서버 | 🔴 403 |
| GitHub Actions | 🔴 403 |
| **Cowork 클라우드 컨테이너 (curl)** | 🔴 **403** |
| 🟢 **대표님 컴퓨터 · Claude 데스크톱 앱 내장 브라우저** | 🟢 **200** (값 11,311 · 평점 4.76 · 후기 23,114 — 창고와 일치) |

🔴 **`curl` 은 쓸 수 없다. 무조건 «내장 브라우저 안에서» `fetch` 한다.**
클라우드에서 부르는 것은 네 번 다 막혔다 — **다시 시도하지 마라.**
🔴 그래서 **노트북이 켜져 있고 Claude 데스크톱 앱이 열려 있어야 한다.** 이것이 이 작업의 «조건»이다.

**⚠️ 아직 모르는 것 하나** — 예약 작업이 «원격으로도 돈다»고 지원 문서에 적혀 있다.
원격으로 도는 회차가 **대표님 컴퓨터의 브라우저를 쓸 수 있는지**는 **첫 회차 결과로만 알 수 있다.**
그래서 아래 명령문은 **실패해도 그 사실을 창고에 남기게** 짜여 있다(§7).

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

## 1) 🔴 내장 브라우저를 KKday 화면에 올린다

```
https://www.kkday.com/ko/product/18940-kansai-airport-haruka-ticket-japan
```

🔴 **`curl` 로 시도하지 마라 — 403 이다(2026-09-09 Cowork 에서 확인).**
🔴 화면을 **그릴 필요는 없다.** 한 장만 올려 두고, **그 안에서 다른 상품 주소를 불러 «글»만 읽는다.**

## 2) 값·평점·후기를 읽는다 — 100개씩, 4개 동시

```js
const ids="<link_url 을 쉼표로 최대 100개>".split(',');const out={};let i=0;
async function one(u){
  const id=(u.match(/\/product\/(\d+)-/)||[])[1];
  try{
    const r=await fetch(u.replace('https://www.kkday.com',''),{credentials:'include'});
    if(!r.ok){out[id]={e:r.status};return}
    const h=await r.text();
    const g=p=>{const m=h.match(p);return m?m[1]:null};
    out[id]={price:g(/lowPrice\\?"?\s*:\s*\\?"?([0-9]+)/),
             rating:g(/ratingValue\\?"?\s*:\s*\\?"?([0-9.]+)/),
             reviews:g(/reviewCount\\?"?\s*:\s*\\?"?([0-9]+)/)};
  }catch(e){out[id]={e:'X'}}}
async function w(){while(i<ids.length){await one(ids[i++]);}}
await Promise.all([w(),w(),w(),w()]);
JSON.stringify(out)
```

**이 셋은 화면을 그리지 않아도 글 안에 그대로 있다** (2026-09-09 재확인 · 값 11,311 = 창고 값과 일치).
🔴 **`highPrice` 를 정가로 쓰지 마라.** 그것은 「가장 비싼 옵션 값」이다 — 쓰면 **없는 할인이 생긴다.**
🔴 **평점은 소수 첫째 자리로 반올림**해 넣는다(화면 표시와 같게). `4.76` → `4.8`

## 3) 다음 차례 — 장부가 기억한다

```json
POST https://gohotelwinners.com/api/ops/db-query     헤더 x-ops-token
{ "project_ref": "jyjcdxdezjfcikqndxeo", "query":
  "select p.ext_id, p.link_url from shop_product p
     left join shop_kk_sync s on s.ext_id=p.ext_id
    where p.source='kkday'
      and (s.synced_on is null or s.synced_on < (now() at time zone 'Asia/Seoul')::date)
    order by p.review_count desc nulls last, p.id asc limit 100" }
```

🔴 **「한국 날짜」로 센다 — 이것이 핵심이다.**
창고 시계는 **UTC** 이고 우리는 **한국시간 01:10** 에 돈다. 한국 9월 9일 01:10 = UTC 9월 8일 16:10 이라
그냥 `current_date` 로 세면 **창고에게는 아직 「8일」** 이다. 8일 낮에 한 번 받았다면
**「오늘 다 했다」로 읽혀 0개가 나오고 그날이 통째로 날아간다.**

🔴 **넣을 때도 «한국 날짜»로 넣는다**(`(now() at time zone 'Asia/Seoul')::date`). 재는 자와 적는 자가
같아야 한다. 하나라도 UTC 를 쓰면 새벽에 받은 것이 **전날 자리**에 쌓여 「어제와 오늘」이 하루씩 밀린다.

🔴 **「20시간 전」 같은 시간 셈으로 하지 마라 — 재보다가 걸렸다**(2026-09-09).
대표님이 낮에 한 번 수동으로 돌리시면 그날 밤 01:10 까지 **18시간 25분**밖에 안 지나
**첫날부터 통째로 건너뛴다.** 「하루 한 번」은 시간이 아니라 **날짜**로 세야 지켜진다.

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
select count(*) filter (where synced_on = (now() at time zone 'Asia/Seoul')::date) 오늘받음,
       count(*) filter (where synced_on is null
                          or synced_on < (now() at time zone 'Asia/Seoul')::date) 못받음
  from shop_kk_sync
```
🔴 여기서도 **한국 날짜**로 센다 — 위와 같은 이유다.
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

## 7) 🔴 «실패해도» 창고에 한 줄 남긴다 — 이것이 제일 중요하다

예약 작업은 대표님이 주무시는 동안 돈다. **아무 흔적이 없으면 「돌았는데 실패」와 「아예 안 돌았다」를 구분할 수 없다.**
그래서 **시작할 때 한 줄, 끝날 때 한 줄**을 반드시 남긴다.

**시작할 때**
```sql
insert into shop_kk_log (route, note) values ('시작', '예약 작업 · 대상 <N>개') returning id
```

**끝날 때 (성공이든 실패든)**
```sql
update shop_kk_log set finished_at=now(), route='<브라우저 | 실패>',
       done=<받은 수>, failed=<못 받은 수>, ok=<true|false>,
       note='<무슨 일이 있었는지 한 줄. 403 이면 「내장 브라우저에서도 403 — 원격 회차로 보임」처럼 적는다>'
 where id=<위에서 받은 id>
```

🔴 **브라우저가 없거나 403 이면 «조용히 끝내지 마라».** `ok=false` 와 이유를 적고 끝낸다.
그래야 다음 날 클로드가 아래 한 줄로 확인해 대표님께 알린다:

```sql
select run_on, route, done, failed, ok, note from shop_kk_log order by id desc limit 7
```

## 8) 첫 회차 뒤 갈림길 (실패했을 때 헤매지 않게 미리 정해 둔다)

| 첫 회차 기록 | 뜻 | 그러면 |
|---|---|---|
| `ok=true` · done 이 대상의 80% 이상 | 원격 회차도 대표님 브라우저를 쓴다 | 🟢 **끝. 매일 저절로 돈다** |
| `ok=false` · note 에 403 | 원격 회차는 클라우드 브라우저라 막힌다 | 아래로 |
| **기록이 아예 없다** | 예약이 안 돌았다(노트북 꺼짐 등) | 노트북·앱을 켜 두고 하루 더 본다 |

**막혔을 때 (0원짜리 순서대로)**

| 안 | 내용 |
|---|---|
| **A** | 예약 작업에 **「내 컴퓨터에서 실행」 선택**이 있는지 본다. 있으면 그것으로 바꾼다 |
| **B** | **주 1회로 낮추고 대표님이 직접 한 줄 붙여넣기.** 값은 하루 0.14%씩만 흔들려 **일주일 밀려도 1% 안쪽**이다 |
| **C** | **Claude for Chrome** — 확실히 대표님 회선이다 |

🔴 **B 가 보장선이다.** A·C 가 다 안 돼도 **주 1회는 반드시 굴러간다.**
🔴 **돈 드는 길(프록시)은 A·B·C 를 다 해보기 전에 꺼내지 않는다.**

---

**만든 날** 2026-09-09 · **형제 문서** `KKDAY_SYNC.md`(1차 방법) · `KKDAY_SYNC2.md`(월 1회 할인·조건)
**되돌리기** `SHOP_ROLLBACK.md §17` · **왜 서버가 안 되나** `SHOP_TECH.md §37-C`
