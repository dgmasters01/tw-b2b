// /api/channel-perf-detail.js
// 성과표 채널별 클릭 시 세부 (호텔별 세부의 거울).
//
// 무엇을 주나 (그 채널 + 그 기간 한정):
//   - hotels: 이 채널이 판 호텔. 예약 많은 순 상위 5개 + "그 외 N개 호텔" 한 줄.
//             각 호텔에 이름·나라(한글)·도시·유형·성급·예약·수수료.
//   - recent: 최근 예약 8건. 호텔명·나라·도시·성급·확정취소·금액·수수료.
//   수수료(commission)는 admin(대표님)일 때만.
//
// 왜 이렇게: content-performance / hotel-perf-detail 과 같은 원칙.
//   호텔별은 "이 호텔을 어느 채널이", 채널별은 "이 채널이 어느 호텔을". 대칭.

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 30 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const COUNTRY_KO = {
  'Australia': '호주', 'Austria': '오스트리아', 'Belgium': '벨기에', 'Cambodia': '캄보디아', 'Canada': '캐나다',
  'China': '중국', 'Comoros': '코모로', 'Croatia': '크로아티아', 'Czech Republic': '체코', 'France': '프랑스',
  'Germany': '독일', 'Guam': '괌', 'Hong Kong SAR, China': '홍콩', 'Hungary': '헝가리', 'Indonesia': '인도네시아',
  'Italy': '이탈리아', 'Japan': '일본', 'Laos': '라오스', 'Macau SAR, China': '마카오', 'Malaysia': '말레이시아',
  'Maldives': '몰디브', 'Mongolia': '몽골', 'Myanmar': '미얀마', 'Netherlands': '네덜란드', 'New Zealand': '뉴질랜드',
  'Northern Mariana Islands': '북마리아나제도', 'Philippines': '필리핀', 'Portugal': '포르투갈', 'Singapore': '싱가포르',
  'South Korea': '한국', 'Spain': '스페인', 'Sri Lanka': '스리랑카', 'Switzerland': '스위스', 'Taiwan': '대만',
  'Thailand': '태국', 'Türkiye': '튀르키예', 'United Kingdom': '영국', 'Vietnam': '베트남',
};
const TYPE_KO = { hotel: '호텔', resort: '리조트', apartment: '아파트', villa: '빌라', hostel: '호스텔', ryokan: '료칸', guesthouse: '게스트하우스', other: '기타' };

function accessToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const raw = req.headers['cookie'] || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === 'sb-access-token') return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

async function authorized(req) {
  const expected = process.env.CLAUDE_OPS_TOKEN;
  if (expected && (req.headers['x-ops-token'] || '') === expected) {
    return { ok: true, via: 'ops-token', isAdmin: true };
  }
  const token = accessToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON) return { ok: false };
  const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON, 'Content-Type': 'application/json' };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_editor`, { method: 'POST', headers: H, body: '{}' });
    if (!r.ok || (await r.json()) !== true) return { ok: false };
    let isAdmin = false;
    try {
      const a = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, { method: 'POST', headers: H, body: '{}' });
      isAdmin = a.ok && (await a.json()) === true;
    } catch { /* noop */ }
    return { ok: true, via: 'session', isAdmin };
  } catch {
    return { ok: false };
  }
}

function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}

function hotelMetaFmt(r) {
  return {
    name: r.hotel_name || '(이름 없음)',
    country: r.country ? (COUNTRY_KO[r.country] || r.country) : null,
    city: r.city || null,
    type: r.property_type ? (TYPE_KO[r.property_type] || r.property_type) : null,
    star: r.star_rating || null,
  };
}

export default async function handler(req, res) {
  const who = await authorized(req);
  if (!who.ok) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
  const withComm = !!who.isAdmin;

  let sb;
  try { sb = admin(); } catch (e) {
    return res.status(500).json({ ok: false, error: '서버 설정 오류', detail: String(e.message || e) });
  }

  const code = String((req.query && req.query.channel_code) || '').trim();
  if (!code) return res.status(400).json({ ok: false, error: 'channel_code 가 필요합니다.' });
  const from = (req.query && req.query.from) || null;
  const to = (req.query && req.query.to) || null;

  // 이 채널 + 기간 예약
  let q = sb.from('bookings_agoda')
    .select('hotel_id,booking_amount_usd,commission_usd,is_cancelled,is_completed,booked_at')
    .eq('channel_code', code);
  if (from) q = q.gte('booked_at', from);
  if (to) q = q.lte('booked_at', to + 'T23:59:59');
  const { data: rows, error } = await q.limit(20000);
  if (error) return res.status(500).json({ ok: false, error: String(error.message || error) });

  // 호텔 메타 (등장 hotel_id)
  const hotelIds = [...new Set((rows || []).map((r) => r.hotel_id).filter(Boolean))];
  const meta = {};
  for (let i = 0; i < hotelIds.length; i += 500) {
    const chunk = hotelIds.slice(i, i + 500);
    const { data: hm } = await sb.from('hotels').select('id,hotel_name,property_type,star_rating,country,city').in('id', chunk);
    (hm || []).forEach((r) => { meta[r.id] = hotelMetaFmt(r); });
  }

  // 호텔별 집계
  const m = {};
  for (const r of (rows || [])) {
    const hid = r.hotel_id;
    if (!hid) continue;
    const h = m[hid] || (m[hid] = { hotel_id: hid, bookings: 0, comm: 0 });
    h.bookings++;
    if (!r.is_cancelled) h.comm += Number(r.commission_usd) || 0;
  }
  let arr = Object.values(m).map((h) => {
    const mt = meta[h.hotel_id] || {};
    return { name: mt.name || '(이름 없음)', country: mt.country || null, city: mt.city || null, type: mt.type || null, star: mt.star || null, bookings: h.bookings, commission: Math.round(h.comm) };
  });
  arr.sort((a, b) => (b.bookings - a.bookings) || (b.commission - a.commission));

  const top = arr.slice(0, 5);
  const rest = arr.slice(5);
  let other = null;
  if (rest.length) {
    other = { count: rest.length, bookings: rest.reduce((s, c) => s + c.bookings, 0), commission: rest.reduce((s, c) => s + c.commission, 0) };
  }

  // 최근 예약 8건
  const recent = (rows || []).slice()
    .sort((a, b) => String(b.booked_at || '').localeCompare(String(a.booked_at || '')))
    .slice(0, 8)
    .map((r) => {
      const mt = meta[r.hotel_id] || {};
      const o = {
        date: String(r.booked_at || '').slice(0, 10),
        hotel_name: mt.name || '(이름 없음)',
        country: mt.country || null,
        city: mt.city || null,
        star: mt.star || null,
        status: r.is_cancelled ? '취소' : (r.is_completed ? '확정' : '진행'),
        amount_usd: Math.round(Number(r.booking_amount_usd) || 0),
      };
      if (withComm) o.commission_usd = r.is_cancelled ? 0 : Math.round(Number(r.commission_usd) || 0);
      return o;
    });

  if (!withComm) {
    top.forEach((h) => { delete h.commission; });
    if (other) delete other.commission;
  }

  return res.status(200).json({ ok: true, is_admin: who.isAdmin, total_bookings: (rows || []).length, hotels: top, other, recent });
}
