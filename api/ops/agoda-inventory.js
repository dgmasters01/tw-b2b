/**
 * api/ops/agoda-inventory.js — **아고다 재고를 받아 우리 창고에 쌓는다.**
 *
 * 왜 (2026-07-17 대표님):
 *   *"난바 지역에 등록된 호텔이 **전체 몇 개**인데 우리는 몇 개를 지금 예약을 받았다 — 이런 표시가 있으면 좋겠다."*
 *   *"이것도 데이터를 가져오면 우리가 **정리해서 자체로 가지고 있어야** 되지 않을까? **API를 실시간으로 연동하면 계속 늦어질 거잖아.**"*
 *
 * 🔴 지금 우리 장부(`hotels` 3,185곳)는 **「예약이 붙은 호텔」만** 모은 것이다(3,182곳이 예약 있음).
 *    **난바에 호텔이 108개인 게 아니라, 우리가 예약을 받아본 곳이 108개다.**
 *    → **분모가 없다.** "이 지역의 몇 %를 먹고 있나"를 말할 수 없다.
 *
 * 왜 아고다인가:
 *   우리가 파는 게 **아고다 재고**다. 구글은 총 개수를 **안 준다**(한 번에 20개·최대 60개까지만 나열).
 *   아고다 어필리에이트 API = **무료**(건당 과금 아님) · `cityId` 로 최대 100개/회.
 *
 * 설계 (D-065 ⑪ "화면은 창고만 읽는다"):
 *   ① 이 창구가 아고다에서 받아 `agoda_inventory` 표에 **쌓는다**  ← 느려도 된다. 봇이 밤에 돈다
 *   ② 화면은 그 표만 읽는다                                      ← 빨라야 한다. API 안 부른다
 *
 * 쓰는 법:
 *   GET /api/ops/agoda-inventory?city=Osaka&dry_run=1   ← 몇 개 오는지만 봄
 *   GET /api/ops/agoda-inventory?city=Osaka             ← 받아서 저장
 *   header: x-ops-token
 */

const AGODA_ENDPOINT = 'https://affiliateapi7643.agoda.com/affiliateservice/lt_v1';
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 도시 번호 — api/agoda-search.js 의 AGODA_CITY_MAP 과 같은 값. 늘리면 둘 다.
const CITY_ID = { osaka: 14267, tokyo: 14266, kyoto: 14268, fukuoka: 14269, taipei: 9598, 'da nang': 18074, bangkok: 4064 };

async function sb(path, opts = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates',
      ...(opts.headers || {}),
    },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`supabase ${r.status}: ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : [];
}

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if ((req.headers['x-ops-token'] || '') !== process.env.CLAUDE_OPS_TOKEN) {
    return res.status(401).json({ ok: false, error: '토큰이 필요합니다.' });
  }
  const city = String(req.query.city || 'Osaka');
  const dryRun = req.query.dry_run === '1';
  const cityId = CITY_ID[city.toLowerCase()];
  if (!cityId) return res.status(400).json({ ok: false, error: `도시 번호를 모릅니다: ${city}. 아는 것: ${Object.keys(CITY_ID).join(', ')}` });

  const apiKey = process.env.AGODA_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: 'AGODA_API_KEY 없음' });

  // 날짜는 아무 날이나 — **재고 목록**을 얻는 게 목적이지 가격이 목적이 아니다
  const d1 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const d2 = new Date(Date.now() + 31 * 864e5).toISOString().slice(0, 10);

  try {
    const body = {
      criteria: {
        additional: {
          currency: 'USD',
          dailyRate: { maximum: 100000, minimum: 1 },
          discountOnly: false,
          language: 'en-us',
          // 🔴 2026-07-17 — 아고다 공식 문서(Affiliate Long Tail Search API v1.0):
          //    `maxResult · Integer (**1-30**) · Default "10" · Max Result for City Search`
          //    우리는 **100** 을 보내고 있었다 → 규격 검사 실패 → `911 No search result`.
          //    ⚠️ `api/agoda-search.js` 도 100 을 보낸다 — **같은 병**이다.
          maxResult: 30,             // 아고다 상한 = 30
          minimumReviewScore: 0,
          minimumStarRating: 0,
          occupancy: { numberOfAdult: 2, numberOfChildren: 0 },
        },
        checkInDate: d1,
        checkOutDate: d2,
        cityId,
      },
    };
    const r = await fetch(AGODA_ENDPOINT, {
      method: 'POST',
      // 문서 요구: `Accept-Encoding: gzip,deflate` (압축 헤더 필수) · `Authorization: siteid:apikey`
      headers: {
        Authorization: apiKey, 'Content-Type': 'application/json',
        Accept: 'application/json', 'Accept-Encoding': 'gzip,deflate',
      },
      body: JSON.stringify(body),
    });
    const raw = await r.text();
    if (!r.ok) return res.status(200).json({ ok: false, step: 'agoda', status: r.status, body: raw.slice(0, 400) });
    let d; try { d = JSON.parse(raw); } catch { return res.status(200).json({ ok: false, step: 'parse', body: raw.slice(0, 400) }); }

    // 🔴 0개가 왔다 — 응답을 그대로 보여준다. "결과 없음"과 "우리가 잘못 물음"은 다르다
    const list = d.results || [];
    if (!list.length && req.query.debug === '1') {
      return res.status(200).json({ ok: true, debug: true, city, cityId, sent: body, agoda_raw: d });
    }
    const sample = list.slice(0, 3).map((h) => ({
      id: h.hotelId, name: h.hotelName, star: h.starRating,
      lat: h.latitude, lng: h.longitude, rate: h.dailyRate,
    }));

    if (dryRun) {
      return res.status(200).json({
        ok: true, dry_run: true, city, cityId,
        agoda_returned: list.length,
        // 🔴 100 이 오면 **더 있는데 잘린 것**이다. 총수가 아니다 — 정직하게 말한다
        is_capped: list.length >= 100,
        keys: list[0] ? Object.keys(list[0]) : [],
        sample,
      });
    }

    const rows = list.map((h) => ({
      city, city_id: cityId,
      agoda_hotel_id: h.hotelId,
      hotel_name: h.hotelName,
      star_rating: h.starRating || null,
      latitude: h.latitude || null,
      longitude: h.longitude || null,
      daily_rate: h.dailyRate || null,
      currency: h.currency || 'USD',
      review_score: h.reviewScore || null,
      fetched_at: new Date().toISOString(),
    }));
    if (rows.length) await sb('agoda_inventory', { method: 'POST', body: JSON.stringify(rows) });

    return res.status(200).json({
      ok: true, city, cityId, agoda_returned: list.length, saved: rows.length,
      is_capped: list.length >= 100,
      note: list.length >= 100
        ? '🔴 100개는 아고다 상한이다. **총수가 아니다** — 더 있다. 나눠 받는 길을 찾아야 한다.'
        : '이 도시 재고를 다 받았다(상한 미만).',
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
