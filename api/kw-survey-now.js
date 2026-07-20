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

    // 오사카 구조 그대로: 여행 축 + 숙박 축, 띄어쓰기 메인 + 붙여쓰기 짝.
    // 숙박이 주력 → 숙박 씨앗 먼저(구글 제한 전에), 여행은 하나만. 호출 수를 줄여 429 회피.
    const gl = market.toLowerCase();
    // 도시명 정리: "도쿄 / 동경"·"상하이 / 상해" 처럼 슬래시·괄호 별칭이 붙으면 자동완성이 0개가 된다 → 앞 이름만 씨앗으로.
    const seedCity = ((cityKo.split(/[\/(]/)[0] || cityKo).trim()) || cityKo;
    const seeds = [
      { q: `${seedCity} 호텔`, axis: 'stay' },
      { q: `${seedCity} 숙소`, axis: 'stay' },
      { q: `${seedCity} 여행`, axis: 'travel' },
    ];
    const joinedSeeds = [`${seedCity}호텔`, `${seedCity}숙소`];
    const seen = new Set();
    const mains = [];          // { text(띄어쓰기), axis }
    const joinedSet = new Set();
    try {
      for (const s of seeds) {                 // 띄어쓴 메인 발굴 (숙박 먼저)
        let f = [];
        try { f = await harvest(s.q, 1, target, gl); } catch { f = []; }
        for (const t0 of [s.q].concat(f)) {
          const t = String(t0 || '').trim();
          if (t && t.includes(seedCity) && t.includes(' ') && !seen.has(t)) { seen.add(t); mains.push({ text: t, axis: s.axis }); }
        }
      }
      for (const q of joinedSeeds) {            // 붙여쓴 짝 후보 발굴
        let f = [];
        try { f = await harvest(q, 1, target, gl); } catch { f = []; }
        for (const t0 of [q].concat(f)) { const t = String(t0 || '').trim().replace(/\s+/g, ''); if (t.includes(seedCity)) joinedSet.add(t); }
      }
    } catch (e) { return res.status(200).json({ ok: false, step: 'harvest', error: '발굴 실패: ' + String(e.message || e) }); }
    if (mains.length < 2) return res.status(200).json({ ok: false, step: 'harvest', error: '자동완성에서 이 도시 검색어를 충분히 못 찾았습니다. 도시명을 확인하세요.' });

    // 축별 상한: 숙박 28 · 여행 8 (숙박 주력)
    const stayMains = mains.filter((m) => m.axis === 'stay').slice(0, 28);
    const travelMains = mains.filter((m) => m.axis === 'travel').slice(0, 8);
    const capped = stayMains.concat(travelMains);

    // 일반 검색어 판별 (호텔 고유명과 가르기)
    const GENERIC = ['호텔','숙소','추천','가성비','조식','위치','온천','대욕장','뷔페','뷰페','가족','여행','자유여행','코스','여행지','커플','아이','뷰','야경','시내','역','근처','저렴','예약','후기','비즈니스','료칸','게스트하우스','민박','캡슐','펜션','리조트','전망','오션뷰','금연','흡연','주차','조용한','신상','신축','중심','번화가','베스트','인기','럭셔리','고급','수영장','노천탕','객실','일정','당일치기','자유','관광'];
    const isGeneric = (term) => {
      const toks = term.split(new RegExp('\\s+|' + seedCity)).map((x) => x.trim()).filter(Boolean);
      if (!toks.length) return true;
      return toks.every((t) => GENERIC.some((g) => t === g || t.includes(g) || g.includes(t)));
    };

    const country = ck.replace(/^cc:/, '').split('|')[0];
    const now = new Date().toISOString();
    const anchorText = `${seedCity} 여행`;
    const base = { target_code: target, market, country, city_key: ck, alive: true, source: 'harvest-now', alive_source: 'suggest', created_at: now, last_seen_at: now };
    const pushed = new Set();
    const rows = [];
    for (const m of capped) {
      if (pushed.has(m.text)) continue; pushed.add(m.text);
      const isAnchor = m.text === anchorText;
      const kind = isAnchor ? 'city_head' : (isGeneric(m.text) ? 'city_sub' : 'hotel');
      rows.push({ ...base, text: m.text, axis: m.axis, kind, is_anchor: isAnchor, morph_axis: null });
      // 붙여쓰기 짝: 일반 검색어이고 붙여쓴 형태가 자동완성에 살아있으면 짝으로 함께
      const j = m.text.replace(/\s+/g, '');
      if (isGeneric(m.text) && joinedSet.has(j) && !pushed.has(j)) {
        pushed.add(j);
        rows.push({ ...base, text: j, axis: m.axis, kind: 'joined', is_anchor: false, morph_axis: 'spacing' });
      }
    }
    if (!rows.some((r) => r.is_anchor) && rows.length) rows[0].is_anchor = true;

    // ── 품질 게이트: 제대로 발굴됐나 판단 (오사카 65·후쿠오카 39·타이베이 38 vs 도쿄 3 = 불량) ──
    //    미달이면 저장 안 하고 city_alias 를 지워 「미조사」로 되돌린다 → "완성"으로 안 넘어간다.
    const stayN = rows.filter((r) => r.axis === 'stay').length;
    const travelN = rows.filter((r) => r.axis === 'travel').length;
    if (rows.length < 12 || stayN < 6 || travelN < 1) {
      try { await sb.from('city_alias').delete().eq('target_code', target).eq('city_key', ck); } catch { /* 무시 */ }
      // 봇이 이 도시를 계속 재시도하지 않도록 건너뛰기 목록에 기록 (도시명 고치면 풀 수 있음)
      try {
        await sb.from('survey_skip').upsert({ target_code: target, label: cityKo, reason: `발굴 불량 ${rows.length}개(숙박 ${stayN}·여행 ${travelN})` }, { onConflict: 'target_code,label' });
      } catch { /* 무시 */ }
      return res.status(200).json({ ok: false, step: 'harvest', insufficient: true, city_key: ck,
        harvested: rows.length, stay: stayN, travel: travelN,
        error: `발굴 불량 — 검색어 ${rows.length}개(숙박 ${stayN}·여행 ${travelN})로 기준(총≥12·숙박≥6·여행≥1) 미달. 도시명 "${cityKo}" 확인 필요. 저장 안 함(건너뛰기 등록).` });
    }

    // 이미 있는 text 는 빼고 삽입(유령 중복 방지)
    const { data: exist } = await sb.from('keyword').select('text')
      .eq('target_code', target).eq('market', market).eq('city_key', ck);
    const has = new Set((exist || []).map((r) => r.text));
    const fresh = rows.filter((r) => !has.has(r.text));
    if (fresh.length) {
      const { error: iErr } = await sb.from('keyword').insert(fresh);
      if (iErr) return res.status(500).json({ ok: false, step: 'harvest', error: '검색어 저장 실패: ' + iErr.message });
    }
    return res.status(200).json({ ok: true, step: 'harvest', city_key: ck, harvested: rows.length, saved: fresh.length, anchor: anchorText,
      travel: rows.filter((r) => r.axis === 'travel').length, stay: rows.filter((r) => r.axis !== 'travel').length,
      pairs: rows.filter((r) => r.kind === 'joined').length, sample: rows.slice(0, 10).map((r) => r.text + (r.kind === 'joined' ? '(짝)' : '·' + r.axis)) });
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
