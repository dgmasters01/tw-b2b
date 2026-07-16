// /api/ops/yt-probe.js
// 유튜브 데이터 API 정찰 — "열쇠가 있나" + "publishedAfter(기간 고정 창)가 진짜 재지나" 두 가지를 한 번에 확인.
// 인증: x-ops-token 헤더 = process.env.CLAUDE_OPS_TOKEN (github-commit / db-query 와 동일)
//
// 왜 만들었나 (D-065 · 2026-07-16 대표님 지적):
//   경쟁(유튜브 영상 수)을 "전체 기간"으로 재고 있었다. 유튜브는 오래된 영상을 잘 추천하지 않으므로
//   실제 경쟁 상대는 최근 영상이다. 그런데 유튜브 웹 검색 필터는 달력(올해/이번달)뿐이라 매년 1월에 무너진다.
//   달력이 아닌 "오늘부터 뒤로 N년" 고정 창을 주는 것은 Data API 의 publishedAfter 하나뿐 → 되는지 재본다.
//
// 읽기 전용. DB 도 파일도 안 건드린다. 재보고 숫자만 돌려준다.
//
// Query:
//   ?q=오사카 호텔&years=3      (q 는 콤마로 여러 개, 기본 3개 / years 기본 3)
//
// Returns:
//   { ok:true, key:'present', results:[ {q, all, within, ratio, window_from} ], quota_units_used }
//   { ok:false, reason:'no_key' }   ← 열쇠가 Vercel 환경변수에 없음 (이것 자체가 답)
//
// 할당량: search.list = 100 units/호출. 키워드 1개당 2회(전체·기간) = 200. 기본 3개 = 600 units.
//         무료 한도 10,000/일 → 6%. 정찰용이라 자주 안 부른다.

const API = 'https://www.googleapis.com/youtube/v3/search';

async function count(key, q, publishedAfter) {
  const p = new URLSearchParams({
    part: 'id', type: 'video', maxResults: '1',
    q, key, regionCode: 'KR', relevanceLanguage: 'ko',
  });
  if (publishedAfter) p.set('publishedAfter', publishedAfter);
  const r = await fetch(`${API}?${p}`, { headers: { 'User-Agent': 'tw-b2b-yt-probe' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { error: j?.error?.message || `http_${r.status}` };
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

  const qs = String(req.query.q || '오사카 호텔,오사카 숙소,난바 호텔').split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
  const years = Math.min(Math.max(parseInt(req.query.years || '1', 10) || 1, 1), 10);
  const from = new Date(Date.now() - years * 365 * 24 * 3600 * 1000).toISOString().replace(/\.\d+Z$/, 'Z');

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
