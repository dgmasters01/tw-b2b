# 🔴 KKday 2차 — 할인·조건 받아오기 (2026-09-09 신설 · 같은 날 완주)

## 🔴 shop 작업은 «shop 전용 창구»로 한다 (2026-09-12 · SHOP_ROLLBACK §71·§72)

| 무엇 | 주소 | 열쇠(머리말) |
|---|---|---|
| shop 창고 SQL | `POST https://travelwinners-shop.vercel.app/api/ops/sql` · 몸통 `{"query": "..."}` | `x-shop-ops-token` |
| shop 레포 읽기 | `GET  https://travelwinners-shop.vercel.app/api/ops/repo?path=…` | 〃 |
| shop 레포 쓰기 | `POST https://travelwinners-shop.vercel.app/api/ops/repo` · 몸통 `{"path","content","message"}` | 〃 |

🔴 **`project_ref` 를 적지 않는다** — 이 창구는 shop 창고(C) 하나만 연다.
🔴 **`repo` 를 적지 않는다** — travelwinners-shop 하나만 연다.
🔴 **스튜디오 공용 창구(gohotelwinners.com/api/ops/…)로 shop 을 만지지 않는다.** 공용 열쇠가 새면 shop 까지 열린다(2026-09-11 사고 · §68·§70).
🔴 열쇠 «값»은 어떤 문서에도 적지 않는다. 모든 호출은 `shop_ops_log` 에 남는다.

## 🟢 끝났다 (2026-09-09) — 결과와 «문서가 틀렸던 곳»

| | |
|---|---|
| 진행 장부 `deal_on` | **1,097 / 1,097** (받음 1,059 · 못 받음 38) |
| `list_price`·`discount_pct` | **127개** — 손님 화면에 딱지·취소선으로 **실제로 나온다** |
| `booked_text` | **371개** |
| 걸린 시간 | **약 35분** |

🔴 **아래 §2-A 의 `list_price: n(/highPrice/)` 는 틀린 지시였다.** `highPrice` 는 정가가 아니라
**「가장 비싼 옵션 값」**이라, 그대로 넣으면 **없는 할인**이 1,000개 상품에 붙는다
(18940: 화면은 11,311원 부터·딱지 없음인데 highPrice 26,103 → 「57% 할인」이 만들어진다).
**진짜 정가는 `official_price`** 다. 자세한 것과 대조표는 `SHOP_TECH.md §38`.

```js
// 정답 — 상품 화면 속 __NUXT_DATA__ 에서
const D = JSON.parse(h.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]);
// official_price 와 min_price 를 가진 «첫 번째» 객체가 그 상품의 값이다
// list_price = official_price (min 보다 클 때만) · discount_pct = round((1-min/off)*100)
// booked_text = order_num 을 앞자리만 남기고 내림 (432,431 → "400K+")
```

🔴 **조건 3칸(무료취소·즉시확인·바우처)은 일부러 안 넣었다** — 화면 글 낱말 검사는 **오탐**이 난다
(안내문·FAQ·번역 사전에 그 낱말이 늘 있다). `.product-tags__tag` 는 **추천 상품 것이 섞인다**.
`SHOP_TECH.md §38-5` 참고.

🔴 **뷰를 잊지 말 것** — 자료를 넣어도 `v_shop_product` 에 칸이 없으면 손님에게 안 보인다.
이번에도 그것이 원인이었다. 뷰 수정 뒤 `notify pgrst, 'reload schema'`.

---


> 대표님: *«자료 수집이 덜 되었다며. 코워크에 이걸 하기 위해 해야 되는 다음 명령문을 제공해줘»*
>
> 1차(2026-09-08)에서 **값 1,053개 · 평점 517개**를 받았다. 하지만 **할인 전 값·할인율은 0개**,
> **무료취소·즉시확인·바우처는 12개**, **예약 수는 3개**뿐이다. 이 문서는 그 나머지를 받는 명령서다.

## 🟢 이 작업을 지금 하는 이유 — 화면 자리가 다 만들어졌다 (2026-09-08~09)

`KKDAY_SYNC.md §5-2` 가 *«먼저 칸을 열고 상품 카드에 표시한 뒤에 받는 것이 순서다»* 라고 적어 두었다.
그 자리를 어제·오늘 다 만들었다:

| 자료 | 화면 어디에 나오나 | 상태 |
|---|---|---|
| `rating`·`review_count` | 이름 아래 `★ 4.8 (23,114)` | ✅ 살아 있음 (516개) |
| `list_price` | 값 옆 취소선 `20,128원 부터 ~~22,393원~~` | 🟡 **코드 준비 완료 · 자료 0개** |
| `discount_pct` | 사진 안 오른쪽 아래 `15%` 딱지 | 🟡 **코드 준비 완료 · 자료 0개** |
| `free_cancel`·`instant`·`voucher`·`booked_text` | 🔴 **아직 화면에 자리 없음** | 받아만 둔다(자료가 쌓이면 자리를 만든다) |

→ **할인 두 칸이 이 작업의 목표다.** 조건 네 칸은 같은 화면에서 함께 나오므로 덤으로 받는다.

---

## 대표님이 Cowork 에 붙여 넣으실 한 줄

```
tw-b2b 레포 _business/shop/KKDAY_SYNC2.md 를 읽고 KKday 할인·조건 2차 수집을 진행해.
창구: https://travelwinners-shop.vercel.app/api/ops/sql  (헤더 x-shop-ops-token)
```

클로드는 이 문서를 읽고 아래 순서대로 진행한다. **대화가 끊겨도 같은 한 줄로 이어받는다** —
진행은 창고 `shop_kk_sync.deal_on` 이 기억한다.

---

## 0) 🔴 시작 전 30초 — 크롬을 KKday 화면에 올려 둔다

```
아무 KKday 상품 화면 하나를 연다 (예: https://www.kkday.com/ko/product/18940-kansai-airport-haruka-ticket-japan)
```

🔴 **서버에서 부르면 KKday 가 막는다(403 — 2026-09-09 다시 실측했다).**
반드시 **크롬 안에서** `fetch` 로 부른다. 이건 1차와 똑같다.

---

## 1) 🔴 먼저 «재 본다» — 빠른 길이 되는지 3개로 확인한다 (5분)

1차에서 값은 **화면을 안 그리고 글(HTML)만 읽어** 100개에 25초로 끝냈다.
할인·조건도 **글 안에 들어 있다면 같은 속도**로 끝난다 — **40분 대 3~4시간의 차이다.**

🔴 **짐작하지 않는다. 아래를 먼저 돌려 「글 안에 있나」를 눈으로 본다.**

```js
// 크롬(KKday 화면)에서 실행 — 상품 3개의 글 안에 무엇이 있는지 본다
const ids=['18940','19691','4835'];const out={};
for(const id of ids){
  const h=await (await fetch('/ko/product/'+id,{credentials:'include'})).text();
  out[id]={
    len:h.length,
    lowPrice:(h.match(/lowPrice\\?":\s*(\d+)/)||[])[1]||null,
    highPrice:(h.match(/highPrice\\?":\s*(\d+)/)||[])[1]||null,
    OFF:(h.match(/(\d+)\s*%\s*OFF/i)||[])[1]||null,
    할인말:/할인|정가|원가|sale_price|salePrice|originalPrice|marketPrice|listPrice/i.test(h),
    무료취소:/무료\s?취소|freeCancel|free_cancel/i.test(h),
    즉시확인:/즉시\s?확인|instantConfirm/i.test(h),
    바우처:/바우처|voucher/i.test(h),
    예약수:(h.match(/([\d.]+K\+|[\d,]{2,}\+)\s*(예약|booked)/i)||[])[1]||null,
    NUXT:/__NUXT_DATA__|window\.__NUXT__/.test(h),
    누트창구:[...new Set((h.match(/\/api\/_nuxt\/[a-z\/-]+/gi)||[]))].slice(0,8)
  };
}
JSON.stringify(out,null,1)
```

**결과를 보고 갈림길을 정한다**

| 보이는 것 | 어느 길 | 걸리는 시간 |
|---|---|---|
| `highPrice` 나 `할인말`·`무료취소` 가 **true** | 🟢 **A. 빠른 길** (§2-A) | **약 40분** |
| 전부 `null`·`false` 인데 `NUXT` 가 true | 🟡 **A′.** `__NUXT_DATA__` 덩어리를 파싱해 본다 (§2-A 주석) | 약 50분 |
| 아무것도 없음 | 🔴 **B. 옛 길** — 화면을 하나씩 그린다 (§2-B) | **3~4시간** |

🔴 **A 로 갔더라도 «대조»를 한다.** 1차에서 Cowork 가 빠른 길을 찾았을 때
**7개를 두 방식으로 대조해 값이 같은 것을 확인한 뒤** 썼다. 그것이 옳았다.
**할인율 3개를 손님 화면(눈으로 보이는 딱지)과 맞춰 본 뒤** 본작업에 들어간다.

---

## 2-A) 🟢 빠른 길 — 글만 읽어 100개씩

```js
const ids="<ext_id 를 쉼표로 최대 100개>".split(',');const out={};let i=0;
async function one(id){try{
  const r=await fetch('/ko/product/'+id,{credentials:'include'});
  if(!r.ok){out[id]={e:r.status};return}
  const h=await r.text();
  const n=s=>{const m=h.match(s);return m?Number(String(m[1]).replace(/[^\d]/g,'')):null};
  out[id]={
    price:n(/lowPrice\\?":\s*(\d+)/),
    list_price:null,   // 🔴 highPrice 를 쓰면 «없는 할인»이 생긴다 — 위 §완주 기록 참고
    discount_pct:n(/(\d+)\s*%\s*OFF/i),
    free_cancel:/무료\s?취소/.test(h), instant:/즉시\s?확인/.test(h),
    voucher:/바우처/.test(h), sold_out:/매진|sold\s?out/i.test(h),
    booked:(h.match(/([\d.]+K\+|[\d,]{2,}\+)\s*예약/)||[])[1]||null
  };
}catch(e){out[id]={e:'X'}}}
async function w(){while(i<ids.length){await one(ids[i++]);}}
await Promise.all([w(),w(),w(),w()]);            // 🔴 4개씩 (1차의 6개는 429 를 불렀다)
JSON.stringify(out)
```

🟡 **A′ (글에는 없고 `__NUXT_DATA__` 만 있을 때)** — `h.match(/__NUXT_DATA__[^>]*>(.+?)<\/script>/s)` 로
덩어리를 꺼내 `JSON.parse` 한 뒤, 그 안에서 `할인`·`정가` 에 해당하는 숫자를 **3개 상품으로 먼저 찾아
자리를 확정하고** 나머지에 적용한다. 자리를 확정하기 전에 1,000개를 돌리지 않는다.

## 2-B) 🔴 옛 길 — 화면을 그려 읽는다 (빠른 길이 안 될 때만)

`browser_batch` 로 **navigate → javascript_tool** 짝을 **6개까지.** 각 상품에서:

```js
await new Promise(r=>setTimeout(r,3800));                     // 🔴 3.8초 — 덜 그려진 채 읽으면 앞 상품 값이 남는다
const t=document.body.innerText,
 u=(location.pathname.match(/\/product\/(\d+)-/)||[])[1]||null,
 b=document.querySelector('.price-info'),                     // 🔴 이 안만 — 아래 「추천 상품」 값이 섞인다
 es=b?[...b.querySelectorAll('.kk-price-local__normal')]:[],
 vs=es.map(e=>Number((e.textContent||'').replace(/[^\d]/g,''))).filter(x=>x>=1000),
 pr=vs.length?Math.min(...vs):0, li=vs.length>1?Math.max(...vs):null,
 bt=b?b.innerText:'', off=(bt.match(/(\d+)\s*%\s*OFF/i)||[])[1];
JSON.stringify({ urlId:u, price:pr, list_price:(li&&li>pr)?li:null,
 discount_pct: off?Number(off):null,
 booked:(t.match(/([\d.]+K\+|[\d,]+\+?)\s*예약/)||[])[1]||null,
 free_cancel:/무료\s*취소/.test(t), instant:/즉시\s*확인/.test(t),
 voucher:/바우처/.test(t), sold_out:/매진/.test(t) });
```

---

## 3) 다음 차례를 받는다 (진행 장부가 기억한다)

```json
POST https://travelwinners-shop.vercel.app/api/ops/sql      헤더 x-shop-ops-token
{ "query":
  "select p.ext_id, p.title, p.price from shop_product p
     left join shop_kk_sync s on s.ext_id=p.ext_id
    where p.source='kkday' and s.deal_on is null
    order by p.review_count desc nulls last, p.id asc limit 100" }
```

🔴 **`deal_on` 이 2차 전용 장부다.** 1차의 `synced_on` 과 **다른 칸이다** — 섞지 않는다.
🔴 **후기 많은 것부터** 나온다. 중간에 끊겨도 **손님이 실제로 누르는 상품부터** 채워져 있다.

- 시작 시점 남은 수: **1,064개** (전체 1,097 − 미리 제외 33)
- 미리 제외 33개 = 공항픽업 18 · 호텔 12 · 크루즈 2 · 삭제 1 — **상품 화면 자체가 없어 2차도 못 받는다.**
  1차에서 확인된 것이라 **다시 열어보지 않는다**(`deal_ok=false` 로 이미 적어 두었다)

## 4) 받은 것을 넣는다 — 100개씩

🔴 **창구(`/api/admin {act:'prod_price'}`)는 쓰지 않는다.** 그 창구는 `price` 가 1,000원 이상일 때만
받아 주는데, 2차의 목적은 **할인·조건**이라 값이 없는 상품도 넣어야 한다. 창고로 바로 넣는다.

```sql
with v(ext_id, list_price, discount_pct, free_cancel, instant, voucher, sold_out, booked_text) as (
  values ('18940', 22393, 10, true, true, true, false, '400+'),
         ('19691', null,  null, true, false, true, false, null)      -- 없는 것은 null
),
t as (select p.id, v.* from v join shop_product p on p.ext_id=v.ext_id and p.source='kkday'),
u as (update shop_product p set
        list_price   = case when t.list_price > p.price then t.list_price else null end,
        discount_pct = t.discount_pct,
        free_cancel  = coalesce(t.free_cancel,  p.free_cancel),
        instant      = coalesce(t.instant,      p.instant),
        voucher      = coalesce(t.voucher,      p.voucher),
        sold_out     = coalesce(t.sold_out,     p.sold_out),
        booked_text  = coalesce(t.booked_text,  p.booked_text)
      from t where p.id=t.id returning p.id),
k as (update shop_kk_sync s set deal_on=current_date, deal_ok=true, updated_at=now()
      from t where s.ext_id=t.ext_id returning 1)
select (select count(*) from u) 넣음, (select count(*) from k) 장부기록
```

🔴 **`list_price` 는 «지금 값보다 클 때만» 넣는다** — 위 `case when` 이 그 일을 한다.
같으면 화면에 `22,393원 부터 ~~22,393원~~` 이 나와 손님이 속았다고 느낀다.
🔴 **값(`price`)은 건드리지 않는다.** 1차에서 이미 받았고, 매일 도는 일이 따로 있다.
🔴 **못 받은 상품도 장부에 남긴다** — 안 그러면 다음 차례에 또 나온다:
```sql
update shop_kk_sync set deal_on=current_date, deal_ok=false, deal_note='<이유>'
 where ext_id in ('…','…')
```

## 5) 🔴 속도 — 1차에서 실제로 잠겼다

값 1,097개 + 후기 550개를 **30분 안에** 받았더니 **모든 요청이 429 「System busy」** 로 막혔고 **약 20분** 뒤 풀렸다.

| | |
|---|---|
| 동시에 | **4개** (1차의 6개는 429 를 불렀다) |
| 100개 묶음 사이 | **60초 쉰다** |
| 429 를 보면 | **즉시 멈추고 20분 기다린다.** 계속 두드리면 더 길어진다 |
| 한 번에 | **100개** (`javascript_tool` 이 45초에서 끊긴다 — 30초 넘으면 스스로 멈추게 짠다) |

## 6) 넣기 전에 이상값을 본다

| 버린다 | 왜 |
|---|---|
| `list_price` 가 값보다 **작거나 같다** | 할인이 아니다 |
| `list_price` 가 값의 **10배를 넘는다** | 앞 상품 값이 남았거나 다른 통화다 |
| `discount_pct` 가 **0 이하·100 이상** | 화면 글자를 잘못 집은 것 |
| 앞 상품과 **똑같은 값이 여러 개 연속** | 화면이 덜 그려졌다(옛 길에서만) |

## 7) 끝나면

```sql
select count(*) 전체,
       count(*) filter (where deal_ok) 받음,
       count(*) filter (where deal_ok is false) 못받음,
       count(*) filter (where deal_on is null) 남음
  from shop_kk_sync
```
그리고 **손님 화면에 실제로 나오는지** 확인한다:
`https://travelwinners-shop.vercel.app/japan/kyoto/products` → 사진 안 `%` 딱지 · 값 옆 취소선.

🔴 **끝난 뒤 `SHOP_TECH.md §37` 에 「칸별 채움」 표를 실측값으로 갱신한다.**
다음 대화의 클로드가 그 표를 보고 판단한다 — 옛 숫자를 남겨두면 또 틀린 판단을 한다.

---

**만든 날** 2026-09-09 · **앞 문서** `KKDAY_SYNC.md`(1차 · 값·평점) · **되돌리기** `SHOP_ROLLBACK.md §15`
