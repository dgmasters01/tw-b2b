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

  let countable = true;          // 이 클릭을 실적으로 셀 것인가 (발행 전이면 false)

  // 대상 아고다 URL 조회
  let dest = FALLBACK;
  try {
    const H = { apikey: key, Authorization: `Bearer ${key}` };
    const r = await fetch(
      `${url}/rest/v1/content_clicks?r_code=eq.${encodeURIComponent(rc)}&select=agoda_url,publication_id`, { headers: H });
    const rows = await r.json();
    if (Array.isArray(rows) && rows[0]) {
      if (rows[0].agoda_url) dest = rows[0].agoda_url;
      /* 아직 발행 안 한 영상의 링크는 «사람이 볼 수 없다» → 눌렸다면 점검이다. 세지 않는다.
         (외래키가 없어 PostgREST 조인이 안 된다 → 따로 조회한다) */
      if (rows[0].publication_id) {
        try {
          const pr = await fetch(
            `${url}/rest/v1/publications?id=eq.${rows[0].publication_id}&select=published_at`, { headers: H });
          const ps = await pr.json();
          const at = Array.isArray(ps) && ps[0] ? ps[0].published_at : null;
          if (at) countable = new Date(at).getTime() <= Date.now();
        } catch { /* 못 읽으면 세는 쪽으로 둔다(실적을 놓치지 않는다) */ }
      }
    }
  } catch { /* 조회 실패해도 아고다로는 보낸다 */ }

  // 사람 클릭만 센다 (검색봇·미리보기 프리페치·점검 제외)
  const ua = String(req.headers['user-agent'] || '');
  const purpose = String(req.headers['purpose'] || req.headers['sec-purpose'] || '');
  const isBot = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|headless/i.test(ua);
  const isPrefetch = /prefetch|preview/i.test(purpose);

  /* 🔴 2026-07-31: 점검하느라 누른 것이 «진짜 실적»에 섞여 들어갔다.
     아직 영상을 올리지도 않았는데 클릭 5가 잡혀 대표님이 발견. 세 가지로 막는다.
       ① ?check=1 을 붙이면 세지 않는다 — 앞으로 점검은 반드시 이걸로 한다
       ② 명령줄 도구(curl·wget·python 등)는 사람이 아니다
       ③ 그 영상이 «아직 발행 전»이면 세지 않는다 (아래 pubOk) */
  const isCheck = String(req.query?.check || '') === '1';
  const isTool = /^(curl|wget|python|node|axios|go-http|java|okhttp|libwww|httpie|postman|insomnia)/i.test(ua) || !ua;

  if (!isBot && !isPrefetch && !isCheck && !isTool && countable) {
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
