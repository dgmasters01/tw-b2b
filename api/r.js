// 클릭 추적 리다이렉트 — gohpik.com/r/{R코드} (또는 gohotelwinners.com/r/{R코드})
//   눌리면: 그 «자리(R코드)» 클릭 +1 세고 → 아고다로 넘긴다.
//   R코드 = 어느 영상의 · 몇 등 자리에 · 어느 호텔 (채널·영상별로 클릭이 안 섞인다).
//   봇/프리페치는 세지 않는다(정확한 사람 클릭만).

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // /r/R-00001  또는  /r?c=R-00001
  let rc = '';
  const m = String(req.url || '').match(/\/r\/([A-Za-z0-9-]+)/);
  if (m) rc = m[1];
  if (!rc && req.query && req.query.c) rc = String(req.query.c);
  rc = (rc || '').toUpperCase().trim();

  const FALLBACK = 'https://www.agoda.com/';
  if (!rc || !url || !key) return res.redirect(302, FALLBACK);

  // 대상 아고다 URL 조회
  let dest = FALLBACK;
  try {
    const r = await fetch(`${url}/rest/v1/content_clicks?r_code=eq.${encodeURIComponent(rc)}&select=agoda_url`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    const rows = await r.json();
    if (Array.isArray(rows) && rows[0] && rows[0].agoda_url) dest = rows[0].agoda_url;
  } catch { /* 조회 실패해도 아고다로는 보낸다 */ }

  // 사람 클릭만 센다 (검색봇·미리보기 프리페치 제외)
  const ua = String(req.headers['user-agent'] || '');
  const purpose = String(req.headers['purpose'] || req.headers['sec-purpose'] || '');
  const isBot = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|headless/i.test(ua);
  const isPrefetch = /prefetch|preview/i.test(purpose);

  if (!isBot && !isPrefetch) {
    // 클릭 기록: 리다이렉트 전에 «완료를 기다린다». await 없으면 서버리스가
    //   fetch 끝나기 전에 함수를 죽여 집계가 누락된다(2026-07-26 실측 버그).
    const kind = /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop';
    try {
      await Promise.all([
        fetch(`${url}/rest/v1/content_click_log`, {
          method: 'POST',
          headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ r_code: rc, ua_kind: kind, ref: String(req.headers['referer'] || '').slice(0, 200) || null }),
        }),
        fetch(`${url}/rest/v1/rpc/bump_click`, {
          method: 'POST',
          headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ rc: rc }),
        }),
      ]);
    } catch { /* 기록 실패해도 아고다 이동은 막지 않는다 */ }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.redirect(302, dest);
}
