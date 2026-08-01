// /api/cron/hotel-fill.js
// 콘텐츠에 나온 호텔 중 «우리 DB에 없는 것»을 찾아 채운다. 1시간마다 조금씩.
//
// 왜 필요한가 (2026-08-01 대표님):
//   *"이제 알아서 정리된다고 생각하고 있으면 되나?"*
//   \u2192 아고다 파일 대량 적재는 **한 번 하면 끝나는 일**이라 사람이 돌린다.
//      그러나 **새 콘텐츠가 나올 때마다 생기는 새 호텔**은 사람이 못 따라간다.
//      그건 이 봇이 한다. 이게 있어야 「알아서 된다」가 참이 된다.
//
// 무엇을 하나
//   1. publications 의 hid_top1/2/3 을 모은다 (원고가 지목한 호텔)
//   2. 그중 agoda_hotel 에 «없는» 것만 고른다
//   3. 아고다에 물어 이름·성급·좌표를 받아 agoda_hotel 에 넣는다
//   4. 아고다에도 없으면 → 원고 이름으로 넣고 `source='manuscript'` 로 표시한다.
//      🔴 지어내지 않는다. 모르는 건 「모른다」로 남긴다 (HOTEL_MATCH.md 원칙 ④)
//
// 원칙 (HOTEL_MATCH.md)
//   ① 아고다 API 는 **채울 때만** 부른다. 찾을 때는 우리 DB 를 본다.
//   ③ 우리 번호가 주민번호다. 아고다 번호는 딸린 정보.
//
// 한 번에 최대 20곳만 채운다 — 몰아치지 않는다. 남으면 다음 시간에 이어한다.

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 120 };

const PER_RUN = 20;
const SITE = process.env.SITE_URL || 'https://gohotelwinners.com';

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
  const auth = req.headers['authorization'] || '';
  if (secret && auth === `Bearer ${secret}`) return true;
  if ((req.headers['user-agent'] || '').includes('vercel-cron')) return true;
  return false;
}

/** 아고다에 hotelId 로 물어본다. 없으면 빈 배열. */
async function askAgoda(ids) {
  try {
    const r = await fetch(`${SITE}/api/agoda-hotel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotelId: ids }),
    });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j.results) ? j.results : [];
  } catch { return []; }
}

export default async function handler(req, res) {
  if (!authOK(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });

  let sb;
  try { sb = admin(); } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }

  const dry = req.query.dry_run === '1';

  // ① 원고가 지목한 호텔 번호를 모은다
  const { data: pubs, error: e1 } = await sb.from('publications')
    .select('code,city,country,hotel_names,hid_top1,hid_top2,hid_top3')
    .not('hid_top1', 'is', null);
  if (e1) return res.status(500).json({ ok: false, error: e1.message });

  const want = new Map();   // hid → { name, city, country }
  for (const p of pubs || []) {
    // 🔴 2026-08-01 실측 — **hotel_names 순서와 hid 순서가 다른 원고가 있다.**
    //   HT-0002: hotel_names = [프리미어, ANA, JR타워] / hid = [JR타워, ANA, 프리미어] — 앞뒤가 바뀌어 있었다.
    //   순서를 믿고 이름을 붙이면 **엉뚱한 호텔 이름이 박힌다.**
    //   → 이름은 「후보」로만 다룬다. 아고다가 이름을 주면 아고다 것을 쓴다 (원칙 ④).
    const names = Array.isArray(p.hotel_names) ? p.hotel_names : [];
    [p.hid_top1, p.hid_top2, p.hid_top3].forEach((h, i) => {
      const id = String(h || '').trim();
      if (!id || !/^\d+$/.test(id)) return;
      if (!want.has(id)) want.set(id, {
        name_guess: names[i] || null,          // ⚠ 순서가 보장 안 된다 — 확정 이름이 아니다
        names_all: names,                       // 원고에 있던 이름 전부(사람이 나중에 맞추기용)
        city: p.city || null, country: p.country || null, code: p.code });
    });
  }
  if (!want.size) return res.status(200).json({ ok: true, idle: true, note: '원고에 붙은 호텔이 없습니다.' });

  // ② 이미 우리 DB 에 있는 것은 뺀다
  const ids = [...want.keys()];
  const have = new Set();
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await sb.from('agoda_hotel').select('hotel_id').in('hotel_id', ids.slice(i, i + 500));
    for (const r of data || []) have.add(String(r.hotel_id));
  }
  const missing = ids.filter((x) => !have.has(x));
  if (!missing.length) {
    return res.status(200).json({ ok: true, idle: true, checked: ids.length, note: '콘텐츠에 나온 호텔이 전부 우리 DB 에 있습니다.' });
  }

  const todo = missing.slice(0, PER_RUN);
  if (dry) return res.status(200).json({ ok: true, dry_run: true, checked: ids.length, missing: missing.length, would_fill: todo });

  // ③ 아고다에 물어 채운다
  const got = await askAgoda(todo.map(Number));
  const byId = {};
  for (const h of got) byId[String(h.hotelId)] = h;

  const rows = [];
  for (const id of todo) {
    const a = byId[id], w = want.get(id) || {};
    rows.push(a ? {
      hotel_id: Number(id),
      name_en: a.hotelName || null,
      // 아고다가 이름을 줌 → **원고 추측 이름을 붙이지 않는다.** 잘못 붙으면 자료가 망가진다.
      name_ko: null,
      city: w.city || null,
      country: w.country || null,
      star: a.starRating != null ? Number(a.starRating) : null,
      lat: a.latitude != null ? Number(a.latitude) : null,
      lng: a.longitude != null ? Number(a.longitude) : null,
      url: a.landingURL || null,
      source: 'agoda_api',
    } : {
      // 🔴 아고다에도 없다 → 원고 이름만 넣고 「아고다 정보 없음」으로 남긴다. 지어내지 않는다.
      hotel_id: Number(id),
      name_ko: w.name_guess || null,            // ⚠ 추측 이름 — source 가 manuscript 면 「확인 필요」로 읽는다
      city: w.city || null,
      country: w.country || null,
      source: 'manuscript',
    });
  }

  const { error: e2 } = await sb.from('agoda_hotel').upsert(rows, { onConflict: 'hotel_id', ignoreDuplicates: false });
  if (e2) return res.status(500).json({ ok: false, error: e2.message });

  const fromApi = rows.filter((r) => r.source === 'agoda_api').length;
  return res.status(200).json({
    ok: true,
    checked: ids.length,
    missing_before: missing.length,
    filled: rows.length,
    from_agoda: fromApi,
    from_manuscript: rows.length - fromApi,
    left: missing.length - todo.length,
    note: missing.length > todo.length ? '남은 건 다음 시간에 이어서 채웁니다.' : '이번에 전부 채웠습니다.',
  });
}
