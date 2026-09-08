# 🔴 KKday 값 받아오기 — 새 대화에서 이어받는 법 (2026-09-08 · 방법 교체)

> 대표님: *«대화가 막히면 안되니깐. 새대화창에서 해야 되면 너가 새로운 명령어를 제공해줘.
> 어차피 다해 해야 되는거 아니야? 그래야 다른 도시들도 상품에 볼수 있는거 아니야»*
>
> **왜 다 해야 하나** — 상품 1,097개는 **59개 도시**에 흩어져 있다. 일부만 받으면
> **어떤 도시는 옛 값 그대로**가 되어 손님이 도시마다 다른 정확도를 보게 된다.

## 🟢 2026-09-08 1차 완주 기록

| | |
|---|---|
| 전체 | **1,097개** |
| 값 갱신 | **1,053개** |
| 값이 «없는» 상품 | **44개** (아래 §4 — 상품 성격상 화면에 값이 없다) |
| 평점·후기 수 | **517개** (후기 없음 542 · 화면 없음 38 — §5) |
| 걸린 시간 | 값 **약 25분** · 후기 **약 40분**(중간에 20분 잠김) |

---

## 대표님이 새 대화에서 하실 말 (이 한 줄이면 됩니다)

```
KKday 값 이어서 받아와
```

클로드는 이 문서를 읽고 아래대로 진행한다.

---

## 1) 다음 차례를 받는다

창구 열쇠(ADMIN_TOKEN)가 있으면:
```
GET https://travelwinners-shop.vercel.app/api/admin?tab=kknext&n=100
헤더 x-admin-token: (ADMIN_TOKEN)
```

🔴 **열쇠가 없으면 창고에서 바로 받는다** (2026-09-08 실측 — 이 길이 더 확실하다):
```
POST https://gohotelwinners.com/api/ops/db-query   헤더 x-ops-token
{ "project_ref": "jyjcdxdezjfcikqndxeo", "query":
  "select p.ext_id, p.link_url from shop_product p
     left join shop_kk_sync s on s.ext_id=p.ext_id and s.synced_on=current_date and s.ok is true
    where p.source='kkday' and s.ext_id is null
    order by p.review_count desc nulls last, p.id asc" }
```

## 2) 🔴 크롬 «안에서» 상품 페이지를 불러 값을 읽는다 (2026-09-08 교체)

**옛 방식**(상품마다 화면을 열고 3.8초 기다리기)은 1,097개에 **3~4시간**이 걸렸다.
지금은 **크롬을 KKday 화면에 한 번만 올려놓고, 그 안에서 상품 주소를 불러 읽는다.**
KKday 화면 안에서 부르는 것이라 **차단되지 않는다**(서버에서 부르면 차단된다 — 그건 그대로다).

크롬을 아무 KKday 상품 화면에 한 번 올려둔 뒤, `javascript_tool` 로 **100개씩**:

```js
const ids="<ext_id 를 쉼표로>".split(',');const out={};let i=0;
async function one(id){try{
  const r=await fetch('/ko/product/'+id,{credentials:'include'});
  if(!r.ok){out[id]='E'+r.status;return}
  const h=await r.text();
  const m=h.match(/lowPrice\\?":\s*(\d+)/);
  const c=(h.match(/priceCurrency\\?":\\?"([A-Z]{3})/)||[])[1];
  out[id]=m?(+m[1])+(c&&c!=='KRW'?':'+c:''):'E0';
}catch(e){out[id]='EX';}}
async function w(){while(i<ids.length){await one(ids[i++]);}}
await Promise.all([w(),w(),w(),w(),w(),w()]);JSON.stringify(out)
```

**`lowPrice` 가 손님이 보는 「~원 부터」와 같은 값이다** — 화면에 그려진 값과
7개 상품에서 **하나도 틀리지 않고 똑같았다**(86,961 / 209,124 / 3,833 / 3,833 / 7,638 / 47,924 / 20,324).

- **100개에 약 25초** · 한 번에 6개씩 동시에 부른다
- 🔴 **1,000원 미만은 버린다** — 맞춤 견적 상품이 104원·203원처럼 «값이 아닌 값»을 보여준다
  (2026-09-08 실제로 두 건을 잘못 넣었다가 옛 값으로 되돌렸다)
- 🔴 900만원을 넘으면 넣지 않는다 (창구 규칙과 동일)

## 3) 받은 것을 넣는다

창구가 열려 있으면 `POST /api/admin {act:'prod_price', rows:[…]}`.
창고로 바로 넣을 때는 **한 번에 100개씩** (세 곳에 함께 남긴다):

```sql
with v(ext_id, price) as (values ('770676',86961), …),
t as (select p.id, v.ext_id, v.price from v join shop_product p
        on p.ext_id=v.ext_id and p.source='kkday'),
u as (update shop_product p set price=t.price, synced_at=now() from t where p.id=t.id returning p.id),
d as (insert into shop_product_price (product_id, checked_on, price, currency, active)
        select t.id, current_date, t.price, 'KRW', true from t
        on conflict (product_id, checked_on) do update set price=excluded.price, active=true returning 1),
k as (insert into shop_kk_sync (ext_id, product_id, synced_on, price, ok, updated_at)
        select t.ext_id, t.id, current_date, t.price, true, now() from t
        on conflict (ext_id) do update set synced_on=excluded.synced_on,
          price=excluded.price, ok=true, updated_at=now() returning 1)
select (select count(*) from u) updated
```

## 4) 🔴 값이 «없는» 상품 44개 — 실패가 아니다

아래는 **KKday 화면 자체에 「부터 값」이 없는** 상품이다. 몇 번을 받아와도 값이 없다.
진행 장부(`shop_kk_sync`)에 **`ok=false` 와 이유**를 적어 두었으니, 새 대화의 클로드는
**이유를 먼저 읽고 「왜 안 되나」를 다시 헤매지 않는다.**

| 무리 | 수 | 왜 값이 없나 |
|---|---|---|
| 공항 픽업(전세차) | 18 | 주소가 공항픽업 «검색 화면»으로 넘어간다. 출발·도착을 골라야 값이 나온다 |
| 호텔 상품 | 12 | 날짜를 골라야 값이 나온다 (`/ko/hotel/product/…`) |
| 맞춤 견적·쿠폰 상품 | 7 | 화면에 값을 아예 표시하지 않는다 |
| 크루즈 | 2 | 크루즈 화면이라 「부터 값」이 없다 (`/ko/cruises/…`) |
| 1,000원 미만 표시 | 2 | 104원·203원 — 값이 아니다. 옛 값을 그대로 둔다 |
| 900만원 초과(확인 필요) | 2 | 24241·24248 — KKday 화면이 5,940만·1억8,277만원을 보여준다 |
| 상품 삭제됨(404) | 1 | 22173 |

**대표님 판단이 필요한 것은 마지막 두 무리뿐이다.** 나머지는 손님 화면에서
「값 없음」이 정상인 상품이다.

## 5) 🟢 평점·후기 수 받는 법 (2026-09-08 신설 · 1,097개 완주)

값과 **따로** 받는다. KKday 는 후기를 화면 그린 뒤에 부르므로, **그 부르는 창구를 직접 부른다.**

🔴 **상품 번호가 두 개다.** 주소의 번호(mid, 예 2247)와 KKday 속 번호(oid, 예 35992)가 **다르다.**
후기 창구는 **oid** 로만 받는다. **mid 를 넣으면 «엉뚱한 상품의 후기»가 200 OK 로 돌아온다**
(2247 을 넣으면 4,657건짜리 남의 후기가 온다). 반드시 아래 두 걸음을 지킨다.

```js
// 1걸음 — 상품 화면 글에서 oid 를 집는다
const h = await (await fetch('/ko/product/'+id,{credentials:'include'})).text();
const oid = (h.match(/product-number[^>]*>[^#<]*#(\d+)/)||[])[1];   // 「상품 번호 #35992」
// 2걸음 — oid 로 후기를 받는다
const j = await (await fetch('/api/_nuxt/cpath/fetch-product-comment-summary?prodId='+oid,
                             {credentials:'include'})).json();
j.data.rating        // "4.81"  → 소수 첫째 자리로 반올림해 넣는다(화면 표시와 같게)
j.data.totalCount    // 14466
```

- 이미 들어 있던 11개로 대조해 **11개 전부 똑같았다**(4.81/14466 등)
- `rating` 이 `0` 이면 **평점은 비우고 후기 수만** 넣는다
- `totalCount` 가 0 이면 **후기가 없는 상품** — 넣을 것이 없다(실패가 아니다)

**결과(2026-09-08)**: 1,097개 중 **517개에 평점·후기 수**를 넣었다. 542개는 후기가 아직 없고,
38개는 상품 화면이 없어(공항픽업·호텔·크루즈·삭제) 받을 수 없다.

## 5-1) 🔴 너무 빨리 두드리면 KKday 가 잠근다 (2026-09-08 실측)

값 1,097개 + 후기 550개를 30분 안에 받았더니 **모든 요청이 429 «System busy»** 로 막혔고
**약 20분** 뒤에 풀렸다. 다음부터는 이렇게 한다:

| | |
|---|---|
| 동시에 | **4개까지** (값만 받을 때는 6개) |
| 사이 쉬는 시간 | 요청마다 **0.2초** |
| 한 번에 | **70개** (`javascript_tool` 이 45초에서 끊긴다 — 30초 넘으면 스스로 멈추게 짠다) |
| 429 를 보면 | **즉시 멈추고 20분 기다린다.** 계속 두드리면 더 길어진다 |

## 5-2) 예약 수·무료취소·즉시확인·바우처·할인율은 아직 못 받는다

이 다섯은 **화면을 그려야만** 나온다(글에도, 창구에도 없다). 옛 방식으로 상품마다 화면을 열어야 하고
1,053개면 **3~4시간**이다. 🔴 **그 전에 할 일이 있다** — 손님 화면에 상품을 내보내는 창구
`v_shop_product` 에 **평점·후기·조건 칸이 없다.** 지금 받아 놔도 **손님에게 안 보인다.**
**먼저 칸을 열고 상품 카드에 표시한 뒤**에 받는 것이 순서다.

---

## 옛 방식 (지금도 쓸 수 있다 — 후기까지 받을 때)

`browser_batch` 로 **navigate → javascript_tool** 을 짝으로 6개까지. 각 상품에서:

```js
await new Promise(r=>setTimeout(r,3800));
const t=document.body.innerText,
 u=(location.pathname.match(/\/product\/(\d+)-/)||[])[1]||null,
 b=document.querySelector('.price-info'),
 es=b?[...b.querySelectorAll('.kk-price-local__normal')]:[],
 vs=es.map(e=>Number((e.textContent||'').replace(/[^\d]/g,''))).filter(x=>x>=1000),
 pr=vs.length?Math.min(...vs):0, li=vs.length>1?Math.max(...vs):null,
 bt=b?b.innerText:'', off=(bt.match(/(\d+)\s*%\s*OFF/i)||[])[1],
 rt=t.match(/([0-5]\.\d)\s*\n?\s*(?:매우 우수|우수|훌륭|좋음)?\s*\n?\s*\((\d[\d,]*)\)/);
JSON.stringify({ urlId:u, ok:u==='<그 상품의 ext_id>'&&pr>0, price:pr,
 list_price: li&&li>pr?li:null, discount_pct: off?Number(off):null,
 rating: rt?Number(rt[1]):null, review_count: rt?Number(rt[2].replace(/,/g,'')):null,
 booked:(t.match(/([\d.]+K\+|[\d,]+\+?)\s*예약/)||[])[1]||null,
 free_cancel:/무료\s*취소/.test(t), instant:/즉시\s*확인/.test(t),
 voucher:/바우처/.test(t), sold_out:/매진/.test(t) });
```

## 🔴 반드시 지킬 것 (다 실측으로 배운 것)

| | 왜 |
|---|---|
| **빠른 길은 «크롬 안에서» 부른다** | 서버에서 부르면 KKday 가 막는다(403). 크롬 안에서는 통과한다 |
| **3.8초 기다린다** (옛 방식만) | 덜 그려진 채 읽으면 **앞 상품 값**이 남아 있다(유레일 449,500 → 17,979 사고) |
| **`.price-info` 안만** 읽는다 (옛 방식만) | 페이지 아래쪽 **「추천 상품」 값**이 섞인다 |
| **1,000원 미만은 버린다** | 두 방식 모두 해당. 104원·203원 같은 «값 아닌 값»이 섞인다 |
| **주소로 확인한다** | 🔴 화면의 「상품 번호」는 **KKday가 바꾼다**(2247 → 35992). 주소로 봐야 한다 |
| **한 번에 100개까지** (빠른 길) | 옛 방식은 6개. 더 넣으면 크롬이 멈춘다 |
| **넣기 전에 이상값을 본다** | 1,000원 미만 · 900만원 초과 · 앞 상품과 같은 값이 여러 개 |

## 진행 확인

```
GET /api/admin?tab=kknext&n=1   → done / left / total
```
또는 창고에서:
```sql
select count(*) filter (where ok) 받음, count(*) filter (where not ok) 값없음, count(*) 전체
from shop_kk_sync where synced_on = current_date
```
관리자 **「마케팅 → 값 변동 → 상품」** 에서도 마지막으로 받은 날이 보인다.
자가 점검 **「상품 값」** 항목이 **14일 넘으면 빨간불**을 띄운다.
