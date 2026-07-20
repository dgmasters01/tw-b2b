// api/kw-survey-now.js
// ─────────────────────────────────────────────────────────────
// "지금 조사하기" — 브라우저(로그인 세션)에서 한 도시를 즉시 조사한다.
//   전체 조사 = ① 발굴(harvest: 자동완성으로 그 도시 검색어 생성) → ② 측정(트렌드·경쟁).
//   측정 엔진은 새로 만들지 않고 기존 api/cron/kw-survey.js 를 그대로 내부 호출해서 재사용한다(중복 0).
//
// 두 단계로 나눠 서버리스 타임아웃(각 5분)을 안전하게 넘긴다:
//   POST { step:'harvest', city_key, city_ko, target?, market? }  → 검색어 생성·저장 (없을 때만)
//   POST { step:'measure', city_key, target?, market? }           → 측정 한 회차(≤15개) · 이어하기
//   프론트가 harvest 한 번 → measure 를 done 될 때까지 반복 호출한다.
//
// 신분증: 쿠키 sb-access-token 또는 Authorization: Bearer (is_editor 이상) / 또는 x-ops-token.
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import { harvest } from './_lib/kwtool.js';

export const config = { maxDuration: 300 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SITE_URL = process.env.SITE_URL || 'https://gohotelwinners.com';

function accessToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const raw = req.headers['cookie'] || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === 'sb-access-token') return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
// is_editor 이상(콘텐츠 담당·관리자) 또는 서버 시크릿(x-ops-token)만 통과
async function authOK(req) {
  const ops = process.env.CLAUDE_OPS_TOKEN;
  if (ops && (req.headers['x-ops-token'] || '') === ops) return true;
  const token = accessToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON) return false;
  const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON, 'Content-Type': 'application/json' };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_editor`, { method: 'POST', headers: H, body: '{}' });
    return r.ok && (await r.json()) === true;
  } catch { return false; }
}
function admin() {
  const url = SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'POST only' }); }
  if (!(await authOK(req))) return res.status(403).json({ ok: false, error: '조사는 콘텐츠 담당·관리자만 할 수 있습니다.' });

  const body = req.body || {};
  const step = String(body.step || '');
  const cityKey = String(body.city_key || '').trim();
  const target = String(body.target || 'ko');
  const market = String(body.market || 'KR');
  if (!cityKey) return res.status(400).json({ ok: false, error: 'city_key 가 필요합니다 (예: cc:japan|fukuoka).' });

  let sb;
  try { sb = admin(); } catch (e) { return res.status(500).json({ ok: false, error: String(e.message || e) }); }

  // ── ① 발굴 (harvest) ──────────────────────────────────────
  if (step === 'harvest') {
    const cityKo = String(body.city_ko || '').trim();
    if (!cityKo) return res.status(400).json({ ok: false, error: '발굴하려면 도시 한국어 이름(city_ko)이 필요합니다.' });

    // 이미 검색어 있으면 발굴 건너뜀(중복 방지·비용 0)
    const { data: cur } = await sb.from('keyword').select('id')
      .eq('target_code', target).eq('market', market).eq('city_key', cityKey).eq('alive', true).limit(1);
    if (cur && cur.length) {
      const { count } = await sb.from('keyword').select('id', { count: 'exact', head: true })
        .eq('target_code', target).eq('market', market).eq('city_key', cityKey).eq('alive', true);
      return res.status(200).json({ ok: true, step: 'harvest', already: true, keyword_count: count || cur.length, note: '이미 검색어가 있어 발굴을 건너뛰었습니다.' });
    }

    // 씨앗 = "{도시} 호텔" · 자동완성 발굴 (한국어)
    const seed = `${cityKo} 호텔`;
    let found = [];
    try { found = await harvest(seed, 1, target, market.toLowerCase()); }
    catch (e) { return res.status(200).json({ ok: false, step: 'harvest', error: '발굴 실패: ' + String(e.message || e) }); }

    // 그 도시와 관련된 것만(도시명 포함) · 중복 제거 · 씨앗을 앵커로 · 최대 30개
    const seen = new Set();
    const kept = [];
    const push = (t) => { t = String(t || '').trim(); if (t && t.includes(cityKo) && !seen.has(t)) { seen.add(t); kept.push(t); } };
    push(seed);
    for (const f of found) push(f);
    const texts = kept.slice(0, 30);
    if (texts.length < 2) return res.status(200).json({ ok: false, step: 'harvest', error: '자동완성에서 이 도시 검색어를 충분히 못 찾았습니다. 도시명을 확인하세요.' });

    const country = cityKey.replace(/^cc:/, '').split('|')[0];
    const now = new Date().toISOString();
    const rows = texts.map((t) => ({
      target_code: target, market, country, city_key: cityKey, text: t,
      kind: 'stay', is_anchor: t === seed, alive: true, source: 'harvest-now',
      alive_source: 'suggest', created_at: now, last_seen_at: now,
    }));
    // 이미 있는 text 는 빼고 삽입(유령 중복 방지)
    const { data: exist } = await sb.from('keyword').select('text')
      .eq('target_code', target).eq('market', market).eq('city_key', cityKey);
    const has = new Set((exist || []).map((r) => r.text));
    const fresh = rows.filter((r) => !has.has(r.text));
    if (fresh.length) {
      const { error: iErr } = await sb.from('keyword').insert(fresh);
      if (iErr) return res.status(500).json({ ok: false, step: 'harvest', error: '검색어 저장 실패: ' + iErr.message });
    }
    return res.status(200).json({ ok: true, step: 'harvest', harvested: texts.length, saved: fresh.length, anchor: seed, sample: texts.slice(0, 8) });
  }

  // ── ② 측정 (measure) — 기존 kw-survey 엔진 내부 호출(재사용) ──
  if (step === 'measure') {
    const secret = process.env.CRON_SECRET;
    const ops = process.env.CLAUDE_OPS_TOKEN;
    const url = `${SITE_URL}/api/cron/kw-survey?city=${encodeURIComponent(cityKey)}&target=${encodeURIComponent(target)}&market=${encodeURIComponent(market)}&limit=15`;
    const headers = secret ? { Authorization: `Bearer ${secret}` } : (ops ? { 'x-ops-token': ops } : {});
    if (!secret && !ops) return res.status(500).json({ ok: false, error: '내부 호출 시크릿(CRON_SECRET/CLAUDE_OPS_TOKEN)이 없습니다.' });
    try {
      const r = await fetch(url, { headers });
      const j = await r.json();
      return res.status(200).json({ ...j, step: 'measure' });
    } catch (e) {
      return res.status(200).json({ ok: false, step: 'measure', error: '측정 호출 실패: ' + String(e.message || e) });
    }
  }

  return res.status(400).json({ ok: false, error: "step 은 'harvest' 또는 'measure' 여야 합니다." });
}
