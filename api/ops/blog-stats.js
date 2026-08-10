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
  { key: 'gu|guam',       city_id: 6126,   ko: '괌',           country: '미국' },
  { key: 'my|kk',         city_id: 5070,   ko: '코타키나발루', country: '말레이시아' },
  { key: 'ph|boracay',    city_id: 15903,  ko: '보라카이',     country: '필리핀' },
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

  // 도시·성급별 자격 통과 수 — 집계 뷰에서 (PostgREST 행 제한 우회)
  const stock = await get(`v_city_stock?select=city_id,s3,s4,s5,total&city_id=in.(${ids.join(',')})`);
  const byCity = {};
  for (const r of stock) byCity[r.city_id] = { 3: r.s3 || 0, 4: r.s4 || 0, 5: r.s5 || 0, t: r.total || 0 };
  const stockAll = await get(`v_city_all?select=city_id,total&city_id=in.(${ids.join(',')})`);
  const allBy = {};
  for (const r of stockAll) allBy[r.city_id] = r.total || 0;
  const mk = (list, forKR) => list.map(c => {
    const b = byCity[c.city_id] || { 3: 0, 4: 0, 5: 0, t: 0 };
    const ok = [b[3], b[4], b[5]].filter(n => n >= 7).length;
    return { ...c, s3: b[3], s4: b[4], s5: b[5], qualified: b.t,
             collected: allBy[c.city_id] || 0, publishable: ok, kr_only: !!forKR };
  });

  const cities = mk(CITY30, false);
  const krCities = mk(KR_ONLY, true);

  const [masterTotal, masterQ, poolTotal, postCount, subCount, alertOpen, usageCount, imgCount] = await Promise.all([
    count('hotel_master?select=agoda_hotel_id'),
    count('hotel_master?select=agoda_hotel_id&review_score=gte.8&review_count=gte.400'),
    count('hotel_pool?select=agoda_hotel_id'),
    count('blog_post?select=id&site_id=eq.staycurate'),
    count('blog_subscriber?select=id&site_id=eq.staycurate'),
    count('blog_alert?select=id&resolved=is.false'),
    count('blog_hotel_usage?select=id&site_id=eq.staycurate'),
    count('blog_hotel_image?select=id'),
  ]);

  // ── 재료 창고 블록 ─────────────────────────────
  // 새 포맷 규격이 확정되면 여기에 블록을 추가한다 (STOCK.md §7)
  const blocks = [
    {
      id: 'monthly',
      title: '월간형 — 성급별 베스트 7',
      status: 'live',                       // live · spec_wait · data_wait
      basis: '평점 8.0 이상 · 후기 400건 이상 · 성급별 7곳',   // 500→400 (2026-08-10 D-B88)
      note: '후보는 아고다 전체에서 뽑습니다. 예약을 받았던 호텔이라고 빼지도, 밀어주지도 않습니다.',
      kpis: [
        { label: '쓸 수 있는 호텔', value: masterQ, unit: '자격 통과' },
        { label: '3편 다 가능', value: cities.filter(c => c.publishable === 3).length, unit: '도시' },
        { label: '부족한 도시', value: cities.filter(c => c.publishable < 3).length, unit: '더 모아야 합니다' },
        { label: '월 발행 가능', value: cities.reduce((a, c) => a + c.publishable, 0), unit: '편' },
      ],
      cities, krCities,
    },
  ];

  // ── 발행 일정 ↔ 재고 (2026-08-10) ─────────────
  // 화면(발행 일정 탭)은 날짜별 도시가 이미 정해져 있다. 여기서는 "그 도시가 지금 몇 편 낼 수 있나"만 준다.
  // 화면은 표에 적힌 도시 한글 이름(ko)으로 찾는다.
  // ⛔ 재고가 모자란 칸은 비운다. hotels 같은 다른 표로 대체하지 않는다 (D-B81).
  const SCHEDULE_NEED = 7;                        // 한 편 = 성급별 7곳
  const scheduleStock = {};
  for (const c of [...cities, ...krCities]) {
    scheduleStock[c.ko] = {
      city_id: c.city_id, s3: c.s3, s4: c.s4, s5: c.s5,
      ready: c.publishable, kr_only: !!c.kr_only,
    };
  }
  const schedule = {
    need: SCHEDULE_NEED,
    slots: [                                       // 하루 3칸 (PUBLISHING §6-2 · 화면과 같은 순서)
      { star: 3, time: '07:00' },
      { star: 4, time: '12:00' },
      { star: 5, time: '19:00' },
    ],
    stock: scheduleStock,
    basis: `성급마다 자격 통과 ${SCHEDULE_NEED}곳 이상이어야 한 칸이 채워집니다`,
    note: '재고는 hotel_master 자격 통과분입니다. 모자란 칸은 비워 둡니다 — 다른 호텔로 메우지 않습니다.',
  };

  // ── 도시 순위 (2026-08-10 · D-B89·D-B90) ─────
  // 수요(출국 규모 × 시즌) × 공급(성급별 재고) 를 한 곳에서 준다.
  // 시즌은 한국관광공사 전수 통계 실측. 12개월치가 없는 나라는 reliable=false 로 표시한다(D-B57).
  const [rankRows, seasonRows] = await Promise.all([
    get('v_city_rank?select=*&order=y2025.desc.nullslast'),
    get('v_country_season?select=country,month,season_mult,reliable'),
  ]);
  const seasonBy = {};
  for (const r of seasonRows || []) {
    (seasonBy[r.country] = seasonBy[r.country] || { mult: Array(12).fill(null), reliable: r.reliable })
      .mult[r.month - 1] = Number(r.season_mult);
  }
  const cityrank = {
    updated: new Date().toISOString().slice(0, 10),
    need_per_month: 90,
    total_slots: (rankRows || []).filter(r => !r.kr_only).reduce((a, r) => a + (r.slots || 0), 0),
    cities: (rankRows || []).map(r => ({
      city_id: r.city_id, ko: r.ko, country: r.country_ko, tier: r.tier, kr_only: r.kr_only,
      s3: r.s3, s4: r.s4, s5: r.s5, slots: r.slots,
      size: r.y2025, yoy: r.yoy === null ? null : Number(r.yoy),
      est: r.est_visitors === null ? null : Number(r.est_visitors),   // 나라 규모 × 도시 몫
      weight: r.city_weight === null ? null : Number(r.city_weight),
      wsrc: r.weight_src,
      season: r.stat_country && seasonBy[r.stat_country] ? seasonBy[r.stat_country].mult : null,
      season_reliable: !!(r.stat_country && seasonBy[r.stat_country] && seasonBy[r.stat_country].reliable),
    })),
  };

  return res.status(200).json({
    ok: true,
    blocks,
    schedule,
    cityrank,
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
