// /api/ops/yt-probe.js
// 유튜브 데이터 API 창구 — 정찰(whoami·비교) + 경쟁 전수 측정(count).
// 인증: x-ops-token 헤더 = process.env.CLAUDE_OPS_TOKEN (github-commit / db-query 와 동일)
//
// 왜 있나 (D-065 ㊺ · 2026-07-16 대표님 지적):
//   경쟁(유튜브 영상 수)을 "전체 기간"으로 재고 있었다. 유튜브는 오래된 영상을 잘 추천하지 않으므로
//   실제 경쟁 상대는 최근 영상이다. 그런데 유튜브 웹 검색 필터는 달력(올해/이번달)뿐이라 매년 1월에 무너진다.
//   달력이 아닌 "오늘부터 뒤로 N일" 고정 창을 주는 것은 Data API 의 publishedAfter 하나뿐 → 이걸 쓴다.
//
// DB 도 파일도 안 건드린다. 재보고 숫자만 돌려준다. (담는 건 부르는 쪽 책임)
//
// 3가지 모드
//   GET  ?mode=whoami                     열쇠들이 유튜브에 열리나 + 어느 구글 프로젝트 것인가
//   GET  ?q=오사카 호텔&years=1            전체 기간 vs N년 창 비교 (정찰 · 200 units/개)
//   POST ?mode=count  {q:[...], window_days:365, region, lang}
//                                         ㊺ 잣대로 경쟁 전수 측정 (100 units/개 · 최대 100개)
//
// 할당량: search.list = 100 units/호출. 무료 10,000/일. 넘으면 403 quotaExceeded — 막힐 뿐 청구 없음.
//   오사카 68개 = 6,800 = 하루의 68% → 하루 1도시.
//
// 🔴 이 레포는 ESM(package.json: type=module). module.exports 금지 — export default 로 쓸 것.

const API = 'https://www.googleapis.com/youtube/v3/search';

// ㊺ 잣대 도장 — 재는 방법이 바뀌면 이 두 값도 같이 바뀌어야 한다 (㊶-6)
const COMP_METHOD = 'api_search_list';
const DEFAULT_WINDOW_DAYS = 365;

function windowFrom(days) {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
}

async function count(key, q, publishedAfter, region = 'KR', lang = 'ko') {
  const p = new URLSearchParams({
    part: 'id', type: 'video', maxResults: '1',
    q, key, regionCode: region, relevanceLanguage: lang,
  });
  if (publishedAfter) p.set('publishedAfter', publishedAfter);
  const r = await fetch(`${API}?${p}`, { headers: { 'User-Agent': 'tw-b2b-yt-probe' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { error: j?.error?.errors?.[0]?.reason || j?.error?.message || `http_${r.status}` };
  return { total: j?.pageInfo?.totalResults ?? null };
}

// 이미 있는 구글 열쇠로도 유튜브가 열리는지 본다.
// 안 열리면 구글이 에러에 "project NNNN" 을 적어준다 = 그 열쇠가 어느 프로젝트 것인지 알아내는 방법.
// ⚠️ 열쇠 값은 절대 응답에 담지 않는다. 이름과 결과만.
async function identify(name, key) {
  const p = new URLSearchParams({ part: 'id', type: 'video', maxResults: '1', q: 'test', key });
  const r = await fetch(`${API}?${p}`, { headers: { 'User-Agent': 'tw-b2b-yt-probe' } });
  const j = await r.json().catch(() => ({}));
  if (r.ok) return { env: name, youtube: 'works', total_sample: j?.pageInfo?.totalResults ?? null };
  const msg = j?.error?.message || `http_${r.status}`;
  const proj = (msg.match(/project[ _](\d{6,})/i) || [])[1] || null;
  return { env: name, youtube: 'blocked', google_project_number: proj, reason: j?.error?.errors?.[0]?.reason || null, message: msg.slice(0, 300) };
}

export default async function handler(req, res) {
  if ((req.headers['x-ops-token'] || '') !== process.env.CLAUDE_OPS_TOKEN) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  // mode=whoami : 있는 열쇠들을 유튜브에 대보고 어느 프로젝트 것인지 알아낸다
  if (req.query.mode === 'whoami') {
    const cands = ['YOUTUBE_API_KEY', 'GOOGLE_PLACES_API_KEY', 'GOOGLE_MAPS_API_KEY', 'GOOGLE_API_KEY'];
    const present = cands.filter(n => !!process.env[n]);
    const out = [];
    for (const n of present) out.push(await identify(n, process.env[n]));
    return res.status(200).json({ ok: true, env_present: present, env_missing: cands.filter(n => !present.includes(n)), probe: out });
  }

  const key = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return res.status(200).json({ ok: false, reason: 'no_key', note: 'YOUTUBE_API_KEY · GOOGLE_PLACES_API_KEY 둘 다 없음' });

  // ── mode=count : ㊺ 잣대로 경쟁 전수 측정. 잣대 도장을 값과 같이 돌려준다(㊶-6) ──
  if (req.query.mode === 'count') {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const raw = Array.isArray(body.q) ? body.q : String(body.q || req.query.q || '').split(',');
    const qs = raw.map(s => String(s).trim()).filter(Boolean).slice(0, 100);
    if (!qs.length) return res.status(400).json({ ok: false, error: 'q_required' });

    const days = Math.min(Math.max(parseInt(body.window_days ?? req.query.window_days ?? DEFAULT_WINDOW_DAYS, 10) || DEFAULT_WINDOW_DAYS, 1), 3650);
    const region = String(body.region || req.query.region || 'KR');
    const lang = String(body.lang || req.query.lang || 'ko');
    const from = windowFrom(days);

    const results = [];
    let used = 0, blocked = null;
    for (const q of qs) {
      if (blocked) { results.push({ q, competition: null, skip_reason: blocked }); continue; }
      const r = await count(key, q, from, region, lang);
      used += 100;
      if (r.error) {
        // 할당량이 끝났으면 남은 것은 더 두드리지 않는다 (막힐 뿐 청구는 없지만 무의미)
        if (String(r.error).includes('quota')) blocked = r.error;
        results.push({ q, competition: null, skip_reason: r.error });
      } else {
        results.push({
          q,
          competition: r.total,
          comp_method: COMP_METHOD,
          comp_window_days: days,
          measured_at: new Date().toISOString(),
        });
      }
    }
    return res.status(200).json({
      ok: true, mode: 'count',
      comp_method: COMP_METHOD, comp_window_days: days, window_from: from, region, lang,
      asked: qs.length,
      measured: results.filter(r => r.competition !== null && r.competition !== undefined).length,
      quota_units_used: used,
      blocked,
      results,
    });
  }

  // ── 기본 : 전체 기간 vs N년 창 비교 (정찰) ──
  const qs = String(req.query.q || '오사카 호텔,오사카 숙소,난바 호텔').split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
  const years = Math.min(Math.max(parseInt(req.query.years || '1', 10) || 1, 1), 10);
  const from = windowFrom(years * 365);

  const results = [];
  for (const q of qs) {
    const all = await count(key, q, null);
    const win = await count(key, q, from);
    results.push({
      q,
      all: all.total ?? all.error,
      within: win.total ?? win.error,
      ratio: (all.total && win.total) ? +(all.total / win.total).toFixed(1) : null,
    });
  }
  return res.status(200).json({
    ok: true, key: 'present', years, window_from: from,
    results, quota_units_used: qs.length * 200,
  });
}
