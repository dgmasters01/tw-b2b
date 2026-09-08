# 🔴 KKday 값 받아오기 — 새 대화에서 이어받는 법 (2026-09-08)

> 대표님: *«대화가 막히면 안되니깐. 새대화창에서 해야 되면 너가 새로운 명령어를 제공해줘.
> 어차피 다해 해야 되는거 아니야? 그래야 다른 도시들도 상품에 볼수 있는거 아니야»*
>
> **왜 다 해야 하나** — 상품 1,097개는 **59개 도시**에 흩어져 있다. 일부만 받으면
> **어떤 도시는 옛 값 그대로**가 되어 손님이 도시마다 다른 정확도를 보게 된다.

---

## 대표님이 새 대화에서 하실 말 (이 한 줄이면 됩니다)

```
KKday 값 이어서 받아와
```

클로드는 이 문서를 읽고 아래대로 진행한다.

---

## 클로드가 하는 일

### 1) 다음 차례를 받는다
```
GET https://travelwinners-shop.vercel.app/api/admin?tab=kknext&n=6
헤더 x-admin-token: (ADMIN_TOKEN)
```
→ `{ done, left, total, items:[{ext_id, url, title, now}] }`
🔴 **후기 많은 순**으로 준다 — 손님이 실제로 누르는 것부터.

### 2) 크롬으로 상품 페이지를 하나씩 연다
`browser_batch` 로 **navigate → javascript_tool** 을 짝으로 6개까지. 각 상품에서 읽는 코드:

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

### 3) 받은 것을 넣는다
```
POST /api/admin  헤더 x-admin-token
{ "act":"prod_price", "rows":[ {ext_id, price, ...}, ... ] }
```
→ `{ ok, skip, left }`. **값·평점·후기·할인·조건을 함께 넣고**, `shop_product_price` 에 그날 줄과
`shop_kk_sync` 에 진행을 남긴다. **넣은 것은 다시 안 받는다.**

### 4) `left` 가 0이 될 때까지 1~3을 되풀이한다
대화가 끊기면 **새 대화에서 1번부터** 다시 하면 된다. 이미 넣은 것은 건너뛴다.

---

## 🔴 반드시 지킬 것 (다 실측으로 배운 것)

| | 왜 |
|---|---|
| **3.8초 기다린다** | 덜 그려진 채 읽으면 **앞 상품 값**이 남아 있다(유레일 449,500 → 17,979 사고) |
| **`.price-info` 안만** 읽는다 | 페이지 아래쪽 **「추천 상품」 값**이 섞인다 |
| **1,000원 미만은 버린다** | 화면에 **안 보이는 659원** 같은 것이 섞여 있다 |
| **주소로 확인한다** | 🔴 화면의 「상품 번호」는 **KKday가 바꾼다**(2247 → 35992). 주소로 봐야 한다 |
| **한 번에 6개까지** | 더 넣으면 크롬이 멈춘다 |
| **서버에서 `fetch` 하지 않는다** | 첫 화면에는 값이 없다. 화면이 그려진 뒤 채워진다 |

---

## 진행 확인

```
GET /api/admin?tab=kknext&n=1   → done / left / total
```
관리자 **「마케팅 → 값 변동 → 상품」** 에서도 마지막으로 받은 날이 보인다.
자가 점검 **「상품 값」** 항목이 **14일 넘으면 빨간불**을 띄운다.
