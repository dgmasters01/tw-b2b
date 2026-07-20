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
import { harvest, suggest, politeSleep } from './_lib/kwtool.js';

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
  if (step === 'measure' && !cityKey) return res.status(400).json({ ok: false, error: 'measure 에는 city_key 가 필요합니다 (harvest 응답의 city_key 를 쓰세요).' });

  let sb;
  try { sb = admin(); } catch (e) { return res.status(500).json({ ok: false, error: String(e.message || e) }); }

  // 한국어 도시·나라 → 영문 city_key 해석 (+ city_alias 지연 생성). 없으면 만들어 이후 조사가 이어지게.
  const KO2EN_COUNTRY = { '일본': 'japan', '대만': 'taiwan', '베트남': 'vietnam', '미국': 'usa', '한국': 'korea', '태국': 'thailand', '홍콩': 'hongkong', '중국': 'china', '싱가포르': 'singapore', '필리핀': 'philippines', '말레이시아': 'malaysia', '인도네시아': 'indonesia' };
  async function resolveCityKey(cityKo, countryKo) {
    // 1) 이미 alias 있으면 그대로
    const { data: al } = await sb.from('city_alias').select('city_key, country')
      .eq('target_code', target).eq('label', cityKo).not('city_key', 'like', '%|d:%').not('city_key', 'like', '%|t:%').limit(1);
    if (al && al.length) return { city_key: al[0].city_key, made: false };
    // 2) v_city_inventory + agoda_city 로 영문명 잇기
    const { data: inv } = await sb.from('v_city_inventory').select('city_id, city, country')
      .eq('target_code', target).eq('city', cityKo).limit(1);
    if (!inv || !inv.length) return { error: `도시 '${cityKo}' 를 도시 목록에서 못 찾았습니다.` };
    const cid = inv[0].city_id;
    const ctryKo = inv[0].country || countryKo || '';
    const { data: ag } = await sb.from('agoda_city').select('city').eq('city_id', cid).limit(1);
    const cityEn = (ag && ag.length && ag[0].city) ? String(ag[0].city) : null;
    if (!cityEn) return { error: `도시 '${cityKo}' 의 영문명을 못 찾았습니다.` };
    const ctryEn = KO2EN_COUNTRY[ctryKo] || KO2EN_COUNTRY[countryKo] || String(ctryKo).toLowerCase();
    const city_key = `cc:${ctryEn}|${cityEn.toLowerCase()}`;
    // 3) alias 지연 생성 (오사카와 같은 방식)
    await sb.from('city_alias').upsert({
      target_code: target, country: ctryEn.charAt(0).toUpperCase() + ctryEn.slice(1),
      city_key, label: cityKo, source: 'survey-now 지연 생성', updated_at: new Date().toISOString(),
    }, { onConflict: 'target_code,city_key' });
    return { city_key, made: true, city_en: cityEn };
  }

  // ── ① 발굴 (harvest) ──────────────────────────────────────
  if (step === 'harvest') {
    const cityKo = String(body.city_ko || '').trim();
    const countryKo = String(body.country_ko || '').trim();
    if (!cityKo) return res.status(400).json({ ok: false, error: '발굴하려면 도시 한국어 이름(city_ko)이 필요합니다.' });

    // city_key 를 안 줬으면 한국어 도시·나라로 해석
    let ck = cityKey;
    if (!ck) {
      const r = await resolveCityKey(cityKo, countryKo);
      if (r.error) return res.status(400).json({ ok: false, step: 'harvest', error: r.error });
      ck = r.city_key;
    }

    // 이미 검색어 있으면 발굴 건너뜀(중복 방지·비용 0)
    const { data: cur } = await sb.from('keyword').select('id')
      .eq('target_code', target).eq('market', market).eq('city_key', ck).eq('alive', true).limit(1);
    if (cur && cur.length) {
      const { count } = await sb.from('keyword').select('id', { count: 'exact', head: true })
        .eq('target_code', target).eq('market', market).eq('city_key', ck).eq('alive', true);
      return res.status(200).json({ ok: true, step: 'harvest', already: true, city_key: ck, keyword_count: count || cur.length, note: '이미 검색어가 있어 발굴을 건너뛰었습니다.' });
    }

    // 씨앗 = "{도시}호텔"(붙여) + "{도시} 호텔"(띄어) 둘 다 뿌린다.
    //   붙여쓴 씨앗이 오사카처럼 자연스러운 붙여쓰기 검색어("...숙소추천")를 준다.
    const gl = market.toLowerCase();
    const seedSpaced = `${cityKo} 호텔`;
    const seedJoined = `${cityKo}호텔`;
    let raw = [];
    try {
      raw = raw.concat(await harvest(seedJoined, 1, target, gl));   // 붙여쓴 자연 검색어
      raw = raw.concat(await harvest(seedSpaced, 1, target, gl));   // 띄어쓴 것 + 호텔 고유명
    } catch (e) { return res.status(200).json({ ok: false, step: 'harvest', error: '발굴 실패: ' + String(e.message || e) }); }
    raw.push(seedJoined);

    // 그 도시 포함 · 중복 제거
    const seen = new Set();
    const all = [];
    for (const t0 of raw) { const t = String(t0 || '').trim(); if (t && t.includes(cityKo) && !seen.has(t)) { seen.add(t); all.push(t); } }
    if (all.length < 2) return res.status(200).json({ ok: false, step: 'harvest', error: '자동완성에서 이 도시 검색어를 충분히 못 찾았습니다. 도시명을 확인하세요.' });
    const foundSet = new Set(all);

    // ㊻ 붙여쓰기 정규화: 붙여쓴 형태가 발굴 결과에 이미 있으면 띄어쓴 건 버린다(일반 검색어=붙여쓰기).
    //    붙여쓸 수 없는 것(자동완성에 붙여쓴 형태가 없는 = 호텔 고유명 등)은 띄어쓰기 유지.
    const normSet = new Set();
    const norm = [];   // { text, kind, is_anchor }
    for (const t of all) {
      if (t.includes(' ')) {
        const j = t.replace(/\s+/g, '');
        if (foundSet.has(j)) continue;                    // 붙여쓴 형태가 이미 있음 → 띄어쓴 건 버림
        if (normSet.has(t)) continue; normSet.add(t);
        norm.push({ text: t, kind: 'hotel', is_anchor: false });   // 고유명 = 띄어쓰기 유지
      } else {
        if (normSet.has(t)) continue; normSet.add(t);
        norm.push({ text: t, kind: 'joined', is_anchor: t === seedJoined });
      }
    }
    // 붙여쓰기(일반 검색어) 먼저, 고유명 뒤로 · 최대 28개
    norm.sort((a, b) => (a.kind === 'joined' ? 0 : 1) - (b.kind === 'joined' ? 0 : 1));
    const kept = norm.slice(0, 28);
    if (!kept.some((n) => n.is_anchor) && kept.length) kept[0].is_anchor = true;

    const country = ck.replace(/^cc:/, '').split('|')[0];
    const now = new Date().toISOString();
    const rows = kept.map((n) => ({
      target_code: target, market, country, city_key: ck, text: n.text,
      kind: n.kind, is_anchor: !!n.is_anchor, alive: true, source: 'harvest-now',
      alive_source: 'suggest', created_at: now, last_seen_at: now,
    }));
    // 이미 있는 text 는 빼고 삽입(유령 중복 방지)
    const { data: exist } = await sb.from('keyword').select('text')
      .eq('target_code', target).eq('market', market).eq('city_key', ck);
    const has = new Set((exist || []).map((r) => r.text));
    const fresh = rows.filter((r) => !has.has(r.text));
    if (fresh.length) {
      const { error: iErr } = await sb.from('keyword').insert(fresh);
      if (iErr) return res.status(500).json({ ok: false, step: 'harvest', error: '검색어 저장 실패: ' + iErr.message });
    }
    return res.status(200).json({ ok: true, step: 'harvest', city_key: ck, harvested: kept.length, saved: fresh.length, anchor: seedJoined, sample: kept.slice(0, 8).map((n) => n.text) });
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
