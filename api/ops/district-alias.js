/**
 * api/ops/district-alias.js — 지역 이름을 **타겟 언어로** 받아 `city_alias` 에 채운다.
 *
 * 왜 (D-065 60 · 2026-07-17 대표님):
 *   *"한국어 페이지 다 만들면 영어 페이지 만들 거야 … 외국 직원도 다른 채널을 맡아서 작업할 수 있게."*
 *   → 지역 이름은 **타겟마다 다르다**: 난바 / Namba / 難波. **8채널·6언어.**
 *   🔴 `hotels.address`(영어 원본)를 **덮어쓰면 안 된다** — 다음 언어를 못 만든다.
 *      원본은 그대로 두고 **번역만 `city_alias` 에 따로** 쌓는다.
 *
 * 🔴 왜 지역만 부르나:
 *   클로드는 처음에 **호텔 252곳을 다시 부르려 했다.** 지역은 **11개**뿐이다 — **23배** 낭비.
 *   "N개를 위해 M번 부르나"를 먼저 센다.
 *
 * 값: 구글 Places Text Search **Pro 등급**(FIELD_MASK = displayName 만) — 무료 5,000/월 안.
 *     지역 11개 = 11번. 오사카 전체를 채워도 한 달 예산의 0.2%.
 *
 * 쓰는 법:
 *   GET /api/ops/district-alias?city=Osaka&target=ko            ← 실제로 채움
 *   GET /api/ops/district-alias?city=Osaka&target=ko&dry_run=1  ← 대상만 봄
 *   header: x-ops-token
 */

import { MONTHLY_CAP } from '../_lib/hotel-geo.js';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';

// ⚠️ Pro 등급 고정 — `places.types` 도 Pro 다(구글 공식문서 확인 · D-065 59). rating/phone/hours 는 금지.
const FIELD_MASK = 'places.displayName,places.formattedAddress,places.types';

// 🔴 2026-07-17 실측 — **구글은 「모른다」고 안 하고 「가장 가까운 장소」를 준다.**
//    `덴노지` → `덴노지 동물원`(zoo) · `요도야바시` → `요도야바시 스카이 테라스`(shopping_mall)
//    `신사이바시` → `신사이바시스지`(상점가) · `난바` → `Namba`(영어)
//    → **행정구역인 것만 받는다.** 동물원·가게·건물은 지역 이름이 아니다.
const PLACE_OK = ['political', 'sublocality', 'sublocality_level_1', 'sublocality_level_2',
                  'sublocality_level_3', 'locality', 'administrative_area_level_1',
                  'administrative_area_level_2', 'administrative_area_level_3',
                  'administrative_area_level_4', 'neighborhood'];

// 타겟 코드 → 구글 languageCode. 새 채널이 생기면 여기 한 줄.
const LANG = { ko: 'ko', en: 'en', ja: 'ja', zh: 'zh-TW', th: 'th', vi: 'vi' };

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
  const target = String(req.query.target || 'ko');
  const kind = String(req.query.kind || 'ward');   // ward = 구 · town = 동네(町)
  const dryRun = req.query.dry_run === '1';
  const lang = LANG[target];
  if (!lang) return res.status(400).json({ ok: false, error: `모르는 타겟: ${target}. 아는 것: ${Object.keys(LANG).join(',')}` });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: 'GOOGLE_PLACES_API_KEY 없음' });

  try {
    // ── 대상 = 이 도시 호텔의 주소에 든 「구」 + `hotels.district`. **목록을 적지 않는다. 센다.**
    const hs = await sb(`hotels?city=eq.${encodeURIComponent(city)}&select=district,address,country&limit=2000`);
    const names = new Set();
    let country = null;
    // 🔴 2026-07-17 실측 — **이미 그 언어인 이름은 구글에 묻지 않는다.**
    //    `난바`(한국어)를 한국어로 물었더니 구글이 **`Namba`**(영어)를 줬다.
    //    `요도야바시` → **`요도야바시 스카이 테라스`**(건물) · `덴노지` → **`덴노지 동물원`**(동물원).
    //    구글 Text Search 는 **가장 가까운 「장소」**를 준다 — 행정구역 이름이 아니면 엉뚱한 걸 준다.
    //    → **행정구역 이름(`… Ward`)만** 묻는다. 이미 한국어인 지역명은 그대로 쓴다.
    const isTargetLang = (t) => (target === 'ko' ? /[가-힣]/.test(t) : /^[A-Za-z0-9 .'-]+$/.test(t));
    const ctx = new Map();          // 이름 → 물어볼 때 붙일 맥락(구). 동네만으로 물으면 엉뚱한 걸 준다
    hs.forEach((h) => {
      if (h.country) country = h.country;
      const w = h.address && (h.address.match(/([A-Za-z]+) Ward/) || [])[1];
      if (kind === 'ward') {
        if (h.district && !isTargetLang(h.district)) names.add(h.district);
        if (w) { names.add(`${w} Ward`); ctx.set(`${w} Ward`, city); }
      } else {
        // 동네 = 주소 첫 부분. **구를 같이 붙여 묻는다** — `Daikoku, Naniwa Ward, Osaka`
        const t = h.address && (h.address.match(/(?:me-[\d-]+ |^[\d-]+ )([A-Za-zōūā-]+),/) || [])[1];
        if (t && !isTargetLang(t)) { names.add(t); ctx.set(t, w ? `${w} Ward, ${city}` : city); }
      }
    });
    const cityKeyBase = `cc:${String(country || '').toLowerCase()}|${city.toLowerCase()}`;

    // 이미 있는 것은 안 부른다 — 돈이다
    const pfx = kind === 'town' ? 't' : 'd';
    const have = await sb(`city_alias?target_code=eq.${target}&city_key=like.${encodeURIComponent(`${cityKeyBase}|${pfx}:%`)}&select=city_key,label`);
    const haveKeys = new Set(have.map((r) => r.city_key));
    const todo = [...names].filter((n) => !haveKeys.has(`${cityKeyBase}|${pfx}:${n}`));

    if (dryRun) {
      return res.status(200).json({ ok: true, dry_run: true, city, target, lang, kind,
        would_call: todo.length, targets: todo, already: have.length });
    }

    const out = [], rows = [];
    for (const n of todo) {
      let label = null, addr = null, types = [], why = null;
      try {
        const r = await fetch(PLACES_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELD_MASK },
          body: JSON.stringify({ textQuery: `${n}, ${ctx.get(n) || city}`, maxResultCount: 1, languageCode: lang }),
        });
        if (r.ok) {
          const d = await r.json();
          const p = (d.places && d.places[0]) || null;
          label = p && p.displayName && p.displayName.text;
          addr = p && p.formattedAddress;
          types = (p && p.types) || [];
        }
      } catch (e) { /* 못 받으면 안 넣는다. 지어내지 않는다 */ }

      // ── 받은 걸 그대로 믿지 않는다. 세 가지를 본다.
      if (label && !types.some((t) => PLACE_OK.includes(t))) { why = `행정구역이 아님(${types.slice(0, 2).join(',')})`; label = null; }
      else if (label && !isTargetLang(label)) { why = `${target} 가 아님`; label = null; }
      out.push({ src: n, label: label || null, addr: addr || null, types: types.slice(0, 3), why });
      if (label) {
        rows.push({
          target_code: target, country, city_key: `${cityKeyBase}|${kind === 'town' ? 't' : 'd'}:${n}`,
          label, source: `google_places_${lang} 2026-07-17`, updated_at: new Date().toISOString(),
        });
      }
    }
    if (rows.length) await sb('city_alias', { method: 'POST', body: JSON.stringify(rows) });

    return res.status(200).json({
      ok: true, city, target, lang, kind, called: todo.length, saved: rows.length,
      // 🔴 못 받은 건 **안 넣는다.** 클로드가 번역해서 채우면 그게 지어내기다(54-0V)
      missed: out.filter((o) => !o.label).map((o) => o.src),
      results: out, quota_note: `구글 Places Pro · 월 ${MONTHLY_CAP} 상한과 같은 지갑`,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
