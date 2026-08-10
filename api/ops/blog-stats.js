// /api/ops/blog-stats.js
// staycurate 관리 화면이 읽는 조회 API — 화면은 이것만 부른다 (D-065 ⑪)
// 인증: x-ops-token = CLAUDE_OPS_TOKEN
const CITY30 = [
  { key: 'jp|osaka',      city_id: 9590,   ko: '오사카',       country: '일본' },
  { key: 'jp|tokyo',      city_id: 5085,   ko: '도쿄',         country: '일본' },
  { key: 'jp|fukuoka',    city_id: 16527,  ko: '후쿠오카',     country: '일본' },
  { key: 'jp|sapporo',    city_id: 3435,   ko: '삿포로',       country: '일본' },
  { key: 'jp|kyoto',      city_id: 1784,   ko: '교토',         country: '일본' },
  { key: 'jp|nagoya',     city_id: 13740,  ko: '나고야',       country: '일본' },
  { key: 'jp|okinawa',    city_id: 717899, ko: '오키나와',     country: '일본' },
  { key: 'vn|nhatrang',   city_id: 2679,   ko: '나트랑',       country: '베트남' },
  { key: 'vn|danang',     city_id: 16440,  ko: '다낭',         country: '베트남' },
  { key: 'vn|phuquoc',    city_id: 17188,  ko: '푸꾸옥',       country: '베트남' },
  { key: 'vn|hochiminh',  city_id: 13170,  ko: '호치민',       country: '베트남' },
  { key: 'vn|hanoi',      city_id: 2758,   ko: '하노이',       country: '베트남' },
  { key: 'th|bangkok',    city_id: 9395,   ko: '방콕',         country: '태국' },
  { key: 'th|chiangmai',  city_id: 7401,   ko: '치앙마이',     country: '태국' },
  { key: 'th|phuket',     city_id: 16056,  ko: '푸켓',         country: '태국' },
  { key: 'th|pattaya',    city_id: 8584,   ko: '파타야',       country: '태국' },
  { key: 'tw|taipei',     city_id: 4951,   ko: '타이베이',     country: '대만' },
  { key: 'tw|kaohsiung',  city_id: 756,    ko: '가오슝',       country: '대만' },
  { key: 'ph|cebu',       city_id: 4001,   ko: '세부',         country: '필리핀' },
  { key: 'id|bali',       city_id: 17193,  ko: '발리',         country: '인도네시아' },
  { key: 'sg|singapore',  city_id: 4064,   ko: '싱가포르',     country: '싱가포르' },
  { key: 'hk|hongkong',   city_id: 16808,  ko: '홍콩',         country: '홍콩' },
  { key: 'cn|shanghai',   city_id: 3987,   ko: '상하이',       country: '중국' },
  { key: 'my|kl',         city_id: 14524,  ko: '쿠알라룸푸르', country: '말레이시아' },
  { key: 'au|sydney',     city_id: 14370,  ko: '시드니',       country: '호주' },
  { key: 'fr|paris',      city_id: 15470,  ko: '파리',         country: '프랑스' },
  { key: 'it|rome',       city_id: 16594,  ko: '로마',         country: '이탈리아' },
  { key: 'gb|london',     city_id: 233,    ko: '런던',         country: '영국' },
];
// 한국어 블로그에 쓰지 않는 도시 (일본어 블로그용) — D-B82
const KR_ONLY = [
  { key: 'kr|seoul', city_id: 14690, ko: '서울', country: '한국' },
  { key: 'kr|busan', city_id: 17172, ko: '부산', country: '한국' },
];

export default async function handler(req, res) {
  if (req.headers['x-ops-token'] !== process.env.CLAUDE_OPS_TOKEN)
    return res.status(401).json({ ok: false, error: 'unauthorized' });

  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
  const sql = async (q) => {
    const r = await fetch(`${SB}/rest/v1/rpc/exec_sql`, { method: 'POST', headers: H, body: JSON.stringify({ q }) });
    if (!r.ok) return null;
    return r.json();
  };
  // rpc가 없으면 PostgREST 직접 조회로 대체
  const get = async (path) => {
    const r = await fetch(`${SB}/rest/v1/${path}`, { headers: H });
    if (!r.ok) return [];
    return r.json();
  };
  const count = async (path) => {
    const r = await fetch(`${SB}/rest/v1/${path}`, { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } });
    const cr = r.headers.get('content-range') || '0/0';
    return parseInt(cr.split('/')[1] || '0', 10);
  };

  const t0 = Date.now();
  const ids = [...CITY30, ...KR_ONLY].map(c => c.city_id);

  // 도시·성급별 자격 통과 수 (한 번에)
  const rows = await get(`hotel_master?select=city_id,star_rating&review_score=gte.8&review_count=gte.500&star_rating=gte.3&city_id=in.(${ids.join(',')})&limit=100000`);
  const byCity = {};
  for (const r of rows) {
    const b = r.star_rating >= 5 ? 5 : (r.star_rating >= 4 ? 4 : 3);
    byCity[r.city_id] = byCity[r.city_id] || { 3: 0, 4: 0, 5: 0 };
    byCity[r.city_id][b]++;
  }
  const mk = (list, forKR) => list.map(c => {
    const b = byCity[c.city_id] || { 3: 0, 4: 0, 5: 0 };
    const ok = [b[3], b[4], b[5]].filter(n => n >= 7).length;
    return { ...c, s3: b[3], s4: b[4], s5: b[5], publishable: ok, kr_only: !!forKR };
  });

  const cities = mk(CITY30, false);
  const krCities = mk(KR_ONLY, true);

  const [masterTotal, masterQ, poolTotal, postCount, subCount, alertOpen, usageCount, imgCount] = await Promise.all([
    count('hotel_master?select=agoda_hotel_id'),
    count('hotel_master?select=agoda_hotel_id&review_score=gte.8&review_count=gte.500'),
    count('hotel_pool?select=agoda_hotel_id'),
    count('blog_post?select=id&site_id=eq.staycurate'),
    count('blog_subscriber?select=id&site_id=eq.staycurate'),
    count('blog_alert?select=id&resolved=is.false'),
    count('blog_hotel_usage?select=id&site_id=eq.staycurate'),
    count('blog_hotel_image?select=id'),
  ]);

  return res.status(200).json({
    ok: true,
    generated_at: new Date().toISOString(),
    ms: Date.now() - t0,
    summary: {
      master_total: masterTotal,
      master_qualified: masterQ,
      pool_total: poolTotal,
      posts: postCount,
      subscribers: subCount,
      alerts_open: alertOpen,
      hotel_usage: usageCount,
      images: imgCount,
      cities_full3: cities.filter(c => c.publishable === 3).length,
      cities_short: cities.filter(c => c.publishable < 3).length,
      monthly_capacity: cities.reduce((a, c) => a + c.publishable, 0),
    },
    cities, krCities,
  });
}
