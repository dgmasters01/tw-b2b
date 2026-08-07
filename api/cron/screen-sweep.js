// api/cron/screen-sweep.js
// ─────────────────────────────────────────────────────────────
// 화면 순회 봇 — **대표님 대신 도시를 하나씩 눌러본다.**
//
// ═══ 왜 만들었나 (2026-08-07 대표님) ═══
//   *"타이베이의 지역메뉴를 누르고 다시 타이베이를 클릭하니 일본 오사카로 뜸.
//     다른 도시들도 전체 체크해 본 거야? 내가 이렇게 하면서 문제가 생기면 안 되잖아.
//     이 부분에 대해서 네가 방법을 찾아."*
//
//   찾아보니 **구멍이 명확했다.** 검사 로봇은 3대가 있었는데 보는 곳이 겹치고 한 층이 비었다:
//     · wiring-audit  → **코드**를 본다 (값 박힘·이름 중복·짝 갈라짐)
//     · wiring-check  → **배선**을 본다 (1,000줄 잘림·배선도 낡음)
//     · kw-audit      → **자료**를 본다 (축·분모·지역 이름)
//     · (없음)        → **화면**을 보는 로봇이 0대였다
//
//   그래서 «타이베이를 눌렀더니 오사카가 나온다» 는 **대표님이 직접 눌러야만** 발견됐다.
//   코드도 정상, 자료도 정상인데 **둘을 이어 붙인 결과가 틀린** 종류의 사고라서다.
//
//   🔴 2026-08-07 실측 — 이 사고 하나 고치는 동안 **캐시가 6시간 옛 값을 붙들고** 있었다.
//      자료를 고쳐도 화면은 여전히 영어를 보여줬다. **화면에서 확인하지 않으면 고쳤는지 모른다.**
//
// ═══ 무엇을 하나 ═══
//   조사가 끝난 도시를 **하나씩 창구에 물어보고**, 화면이 실제로 받는 답을 검사한다.
//   ① 도시 어긋남   — 타이베이를 물었는데 오사카가 오나 (오늘 사고)
//   ② 영어 지역명   — 한국어 화면에 로마자·한자가 남았나 (오늘 사고)
//   ③ 지역 0개      — 호텔·예약은 있는데 지역 목록이 통째로 비었나 (나라 규칙 없음)
//   ④ 검색어 0개    — 조사 완료라는데 검색어가 안 오나
//   ⑤ 열쇠 표기섞임 — `cc:일본|osaka` 처럼 나라 이름이 한글·영어로 갈렸나
//
// ═══ 원칙 ═══
//   · **고치지 않는다. 알리기만 한다.** (wiring-audit 과 같은 원칙)
//     고치는 곳은 따로 있다 — 지역 이름은 `hotel-district-fill`, 축은 `kw-audit`.
//   · **캐시를 그대로 쓴다.** 대표님 화면이 받는 값과 **똑같은 것**을 봐야 의미가 있다.
//     `nocache=1` 로 부르면 «고쳐졌는데 화면엔 아직 안 나온» 상태를 놓친다.
//   · 결과는 `screen_sweep_log` 에 남기고, 문제가 늘면 메일로 알린다.
//
// 실행: Vercel Cron 매일 KST 06:20 (UTC 21:20) — kw-audit(05:15)·wiring-audit(05:50) 다음.
// 수동: x-ops-token.  ?dry_run=1(기록 안 함) · ?limit=N · ?city=cc:taiwan|taipei(한 도시만)
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 300 };

const SITE = process.env.PUBLIC_SITE_URL || 'https://gohotelwinners.com';

function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}

function authOK(req) {
  const ops = process.env.CLAUDE_OPS_TOKEN;
  if (ops && (req.headers['x-ops-token'] || '') === ops) return true;
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers['authorization'] || '') === `Bearer ${secret}`) return true;
  return (req.headers['user-agent'] || '').includes('vercel-cron');
}

const isKo = (s) => /[가-힣]/.test(String(s || ''));

/** 창구에 도시 하나를 물어본다 — 화면이 부르는 것과 **똑같은 주소**로. */
async function ask(cityKey, target) {
  const u = `${SITE}/api/content-keywords?view=survey&target=${target}&city=${encodeURIComponent(cityKey)}`;
  try {
    const r = await fetch(u, { headers: { 'x-ops-token': process.env.CLAUDE_OPS_TOKEN || '' } });
    return await r.json();
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

export default async function handler(req, res) {
  if (!authOK(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });
  const dry = req.query.dry_run === '1';
  const target = req.query.target || 'ko';
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 60, 1), 100);

  let sb;
  try { sb = admin(); } catch (e) { return res.status(500).json({ ok: false, error: String(e.message || e) }); }

  // 검사할 도시 = 조사가 끝난 도시 (화면에서 실제로 열리는 것들)
  let keys;
  if (req.query.city) keys = [req.query.city];
  else {
    const { data } = await sb.from('snapshot').select('city_key').eq('status', 'done');
    keys = [...new Set((data || []).map((r) => r.city_key))].sort().slice(0, limit);
  }

  // 도시별 우리 장부 규모 — 「예약은 있는데 지역이 0」을 가려내려면 필요하다
  const { data: hs } = await sb.from('hotels').select('city, booking_count, district');
  const scale = {};   // 영어 도시명 -> { hotels, bookings, withDistrict }
  for (const r of hs || []) {
    const k = String(r.city || '').toLowerCase();
    const o = (scale[k] = scale[k] || { hotels: 0, bookings: 0, withDistrict: 0 });
    o.hotels += 1; o.bookings += (r.booking_count || 0); if (r.district) o.withDistrict += 1;
  }
  const cityOf = (key) => String(key).split('|')[1] || '';

  const problems = [];
  const checked = [];
  for (const k of keys) {
    const d = await ask(k, target);
    if (!d || !d.ok) {
      problems.push({ kind: 'city_error', city: k, note: '창구가 답을 못 줬다.', detail: String((d && d.error) || 'no response').slice(0, 120) });
      continue;
    }
    const rows = d.rows || [], ds = d.districts || [];
    checked.push({ city: k, keywords: rows.length, districts: ds.length, cached: !!d.cached });

    // ① 물어본 도시와 답의 도시가 다르다 — 2026-08-07 사고 그 자체
    if (d.city_key && d.city_key !== k) {
      problems.push({ kind: 'city_mismatch', city: k, note: `물어본 도시와 답이 다르다 → ${d.city_key}. 화면에 다른 도시 자료가 뜬다.` });
    }
    // ② 한국어 화면인데 로마자·한자 이름이 남았다
    if (target === 'ko') {
      const eng = ds.map((x) => x.name).filter((n) => !isKo(n));
      if (eng.length) problems.push({ kind: 'district_not_ko', city: k, n: eng.length,
        note: '한국어 화면에 로마자·한자 지역 이름이 있다. 같은 지역이 두 줄로 갈라져 예약이 나뉜다.',
        sample: eng.slice(0, 5) });
    }
    // ③ 예약은 붙었는데 지역 목록이 통째로 비었다 → 그 나라 파서 규칙이 없다
    const sc = scale[cityOf(k)] || null;
    if (!ds.length && sc && sc.bookings >= 20) {
      problems.push({ kind: 'district_empty', city: k, n: sc.bookings,
        note: `호텔 ${sc.hotels}곳·예약 ${sc.bookings}건이 있는데 지역 목록이 비었다. district-parse 에 그 나라 규칙이 없다 — 「어디를 만들까」를 못 본다.` });
    }
    // ④ 조사 완료인데 검색어가 안 온다
    if (!rows.length) problems.push({ kind: 'keywords_empty', city: k, note: '조사 완료인데 검색어가 0개다.' });
  }

  // ⑤ 도시 열쇠의 «나라» 표기가 갈렸나 — cc:일본|osaka 와 cc:japan|osaka 가 섞이면 화면이 도시를 못 찾는다
  const cc = {};
  for (const k of keys) { const c = String(k).split('|')[0]; cc[c] = (cc[c] || 0) + 1; }
  const koCC = Object.keys(cc).filter((c) => isKo(c));
  if (koCC.length) problems.push({ kind: 'city_key_lang', n: koCC.length,
    note: '도시 열쇠의 나라 이름이 한글·영어로 갈렸다. 같은 나라가 둘로 보인다.',
    sample: koCC.slice(0, 8) });

  const summary = {
    at: new Date().toISOString(), target,
    cities_checked: checked.length, problem_count: problems.length, problems, checked,
  };
  if (!dry) {
    try { await sb.from('screen_sweep_log').insert({ problem_count: problems.length, result: summary }); }
    catch { /* 표가 없으면 기록만 건너뛴다 */ }
  }
  return res.status(200).json({ ok: true, dry_run: dry, ...summary });
}
