// api/_lib/hotel-geo.js
// 호텔 마스터에 주소·좌표·지역 채우기 — 공용 로직 (BL-HOTEL-GEO)
// 결정문서: _business/decisions/2026-07-14-keyword-menu-redesign-wip.md · D-065
//
// 입구 2개가 이 파일 하나를 같이 쓴다 (진실 1개):
//   1) api/hotel-geo-fill.js        수동 (POST + x-ops-token)
//   2) api/cron/hotel-geo-fill.js   자동 (Vercel Cron GET + Bearer CRON_SECRET)
//
// ═══════════════════════════════════════════════════════════════
// ⚠️⚠️  FIELD_MASK 절대 건드리지 말 것  ⚠️⚠️
//
//   Pro        = 이름·주소·좌표·types           → 무료 5,000건/월  ← 지금 이것
//   Enterprise = 위 + rating/phone/website/hours → 무료 1,000건/월  (5배 축소 + $35/1,000)
//
//   rating 하나만 추가해도 무료 한도가 5,000 → 1,000 으로 떨어지고 요금이 붙는다.
//   평점은 이미 hotels.star_rating (아고다) 에 있으므로 구글에서 받을 이유가 없다.
//   B2B 가입 흐름은 api/google-places.js 를 계속 쓴다(평점·사진 필요). 이 파일과 무관.
// ═══════════════════════════════════════════════════════════════
//
// 안전장치 4중:
//   1) 구글 콘솔 SearchTextRequest per day = 150   (하드 스톱, 2026-07-14 대표님 설정)
//      ⚠️ 이 150 은 api/google-places.js(B2B 가입 호텔검색)와 **같이 쓰는 한도**다.
//         그래서 크론은 하루 135(45×3)만 쓰고 15건을 가입 흐름 몫으로 남긴다. (2026-07-15 대표님 확정 A안)
//   2) DB 카운터 api_usage_monthly, 월 4,500 상한   ← 이 파일
//      ※ globalThis 금지 — Vercel 서버리스는 인스턴스 재시작/동시실행 시 카운터가
//        초기화·분산되어 돈 방어에 부적합. 반드시 DB.
//   3) 1회 배치 상한 MAX_BATCH = 50  (Vercel 30초 제한 대응)
//   4) 크론 기본 배치 45 (CRON_BATCH) — 하루 3회 = 135

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';

// ⚠️ Pro 등급 고정. 필드 추가 금지 (위 경고 참조).
//
// ✅ 2026-07-17 `places.businessStatus` 추가 — **Pro 등급 안이다. 요금 안 오른다.**
//    근거: 구글 공식 문서 "Text Search (New)" — *"The following fields trigger the **Text Search Pro SKU**:
//      … places.**businessStatus** … places.formattedAddress, places.location, places.types …"*
//      Enterprise 로 올리는 건 rating · phone · openingHours · priceLevel 이다(위 경고의 그 목록).
//    왜 필요한가 (2026-07-17 대표님이 직접 구글 검색해서 잡음):
//      `ibis Styles Osaka Namba`(예약 1건) · `Agora Place Osaka Namba`(예약 7건) → **둘 다 「폐업」**.
//      그런데 우리 장부는 3,185곳 **전부 `active`** 라고 알고 있었다 — **한 번도 확인한 적이 없다.**
//      폐업 호텔로 콘텐츠를 만들면 예약이 **0**이다. 돈을 버리는 게 아니라 시간을 버린다.
const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.businessStatus';

export const API_NAME = 'google_places_text_search';
export const MONTHLY_CAP = 4500;   // 구글 무료 5,000 대비 여유 500
export const MAX_BATCH = 50;       // 구글 호출 ~0.3초 × 50 = 15초 (Vercel 30초 제한 안)
export const CRON_BATCH = 45;      // 크론 1회 기본 — 45×3회=135/일, 15건은 가입검색 몫
const MAX_DIST_KM = 30;            // 도시 중심 초과 = 동명 호텔 오매칭 의심

// 도시 중심 좌표 (좌표 검증용)
const CITY_CENTER = {
  'osaka': [34.6937, 135.5023],
  'tokyo': [35.6812, 139.7671],
  'kyoto': [35.0116, 135.7681],
  'fukuoka': [33.5904, 130.4017],
  'nagoya': [35.1815, 136.9066],
  'da nang': [16.0544, 108.2022],
  'hanoi': [21.0285, 105.8542],
  'ho chi minh city': [10.8231, 106.6297],
  'nha trang': [12.2388, 109.1967],
  'bangkok': [13.7563, 100.5018],
  'chiang mai': [18.7883, 98.9853],
  'pattaya': [12.9236, 100.8825],
  'taipei': [25.0330, 121.5654],
  'cebu': [10.3157, 123.8854],
  'singapore': [1.3521, 103.8198],
  'hong kong': [22.3193, 114.1694],
};

// 지역 사전: [지역명, 위도, 경도, 반경km]
// 확장 원칙: 미리 다 만들지 말 것. 구글 트렌드로 수요가 측정되는 지역만 추가.
// (우메다 5.7 / 신사이바시 7.2 = 측정 한계 아래. 난바 42.5 = 살아있음)
const DISTRICTS = {
  'osaka': [
    ['난바', 34.6659, 135.5015, 1.2],
    ['우메다', 34.7025, 135.4959, 1.2],
    ['신사이바시', 34.6748, 135.5011, 0.8],
    ['덴노지', 34.6465, 135.5133, 1.2],
    ['요도야바시', 34.6928, 135.5010, 0.8],
  ],
  'tokyo': [
    ['신주쿠', 35.6896, 139.7006, 1.5],
    ['시부야', 35.6580, 139.7016, 1.2],
    ['긴자', 35.6717, 139.7650, 1.0],
    ['아사쿠사', 35.7148, 139.7967, 1.0],
    ['도쿄역', 35.6812, 139.7671, 1.0],
  ],
  'da nang': [
    ['미케비치', 16.0544, 108.2470, 2.0],
    ['한강', 16.0678, 108.2240, 1.5],
  ],
};

function haversine(a, b) {
  const R = 6371;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function judgeDistrict(cityKey, lat, lng) {
  const list = DISTRICTS[cityKey];
  if (!list) return null;
  let best = null, bd = 999;
  for (const [name, dlat, dlng, r] of list) {
    const d = haversine([dlat, dlng], [lat, lng]);
    if (d < r && d < bd) { best = name; bd = d; }
  }
  return best;
}

/**
 * 좌표 채우기 1회 실행.
 * @param {{city?:string|null, limit?:number, dry_run?:boolean}} opts
 * @returns {Promise<{status:number, body:object}>}  입구(수동/크론)가 그대로 res 로 내보낸다.
 */
export async function runGeoFill(opts = {}) {
  const { city = null, limit = 10, dry_run = false, retry = false } = opts;   // retry=1 → not_found 도 다시 본다

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return { status: 500, body: { ok: false, error: 'GOOGLE_PLACES_API_KEY not configured' } };

  const SB_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SB_KEY) return { status: 500, body: { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' } };

  const H = {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
  };

  const sbGet = async (path) => {
    const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H });
    if (!r.ok) throw new Error(`DB GET ${r.status}: ${(await r.text()).slice(0, 120)}`);
    return await r.json();
  };
  const sbPatch = async (path, body) => {
    const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`DB PATCH ${r.status}: ${(await r.text()).slice(0, 120)}`);
  };
  const sbPost = async (path, body, prefer = 'return=minimal') => {
    const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
      method: 'POST', headers: { ...H, Prefer: prefer }, body: JSON.stringify(body),
    });
    if (!r.ok && r.status !== 409) throw new Error(`DB POST ${r.status}: ${(await r.text()).slice(0, 120)}`);
    return r.ok ? await r.json().catch(() => null) : null;
  };

  const batch = Math.min(parseInt(limit) || 10, MAX_BATCH);
  const ym = new Date().toISOString().slice(0, 7);

  try {
    // ── 안전장치 2: 월 카운터
    await sbPost('api_usage_monthly', {
      api_name: API_NAME, year_month: ym, call_count: 0, monthly_cap: MONTHLY_CAP,
    }, 'resolution=ignore-duplicates');

    const rows = await sbGet(`api_usage_monthly?api_name=eq.${API_NAME}&year_month=eq.${ym}&select=id,call_count`);
    const counter = rows[0] || { id: null, call_count: 0 };
    const used = counter.call_count || 0;
    const remain = MONTHLY_CAP - used;

    if (remain <= 0) {
      return {
        status: 429,
        body: {
          ok: false, error: 'monthly_cap',
          message: `이번 달 ${MONTHLY_CAP}건 한도 도달. 다음 달 1일 리셋.`,
          quota: { used, cap: MONTHLY_CAP },
        },
      };
    }

    const take = Math.min(batch, remain);

    // ── 대상: 좌표 없는 호텔, 예약 많은 순
    // 🔴 2026-07-17 대표님: *"이런 경우 추후 따로 찾아서 줄 수 있도록 무언가 장치가 필요할 것 같은데."*
    //    옛 대상 = `geo_status 가 비었거나 pending` 뿐 → **한 번 못 찾으면(not_found) 영영 안 본다.**
    //    실측: 전 세계 not_found 6곳 · manual_check 3곳이 **다시 볼 길이 없이 갇혀 있었다.**
    //    → `retry=1` 이면 not_found 도 대상에 넣는다. 구글이 못 찾은 게 아니라 **우리 이름이 틀렸을 수도** 있다.
    const statusFilter = retry
      ? `or=(geo_status.is.null,geo_status.eq.pending,geo_status.eq.not_found)`
      : `or=(geo_status.is.null,geo_status.eq.pending)`;
    let q = `hotels?latitude=is.null&${statusFilter}`
          + `&select=id,hotel_name,city,booking_count&order=booking_count.desc.nullslast&limit=${take}`;
    if (city) q += `&city=ilike.*${encodeURIComponent(city)}*`;
    const targets = await sbGet(q);

    if (!targets.length) {
      return { status: 200, body: { ok: true, message: '채울 호텔 없음', processed: 0, quota: { used, cap: MONTHLY_CAP } } };
    }
    if (dry_run) {
      return {
        status: 200,
        body: {
          ok: true, dry_run: true, would_process: targets.length,
          targets: targets.map(t => `${t.hotel_name} (${t.booking_count || 0}건)`),
          quota: { used, cap: MONTHLY_CAP, remain },
        },
      };
    }

    const result = { ok: 0, manual_check: 0, not_found: 0, districts: {}, samples: [] };
    let calls = 0;

    for (const h of targets) {
      const cityKey = (h.city || '').toLowerCase().trim();
      const center = CITY_CENTER[cityKey];
      let place = null;

      try {
        const r = await fetch(PLACES_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': FIELD_MASK,   // ⚠️ Pro 고정 — 추가 금지
          },
          body: JSON.stringify({
            textQuery: `${h.hotel_name}, ${h.city}`,
            maxResultCount: 1,
            includedType: 'lodging',
            languageCode: 'en',
          }),
        });
        calls++;
        if (r.ok) {
          const d = await r.json();
          place = (d.places && d.places[0]) || null;
        }
      } catch (e) { /* not_found 로 처리 */ }

      if (!place || !place.location) {
        await sbPatch(`hotels?id=eq.${h.id}`, { geo_status: 'not_found', geo_checked_at: new Date().toISOString() });
        result.not_found++;
        continue;
      }

      const lat = place.location.latitude;
      const lng = place.location.longitude;

      // ── 좌표 검증: 동명 호텔 오매칭 방지 (시험에서 10건 중 1건 검출됨)
      if (center && haversine(center, [lat, lng]) > MAX_DIST_KM) {
        await sbPatch(`hotels?id=eq.${h.id}`, {
          geo_status: 'manual_check',
          address: place.formattedAddress || null,
          geo_checked_at: new Date().toISOString(),
        });
        result.manual_check++;
        result.samples.push(`⚠️ ${h.hotel_name} → ${Math.round(haversine(center, [lat, lng]))}km 밖`);
        continue;
      }

      const district = judgeDistrict(cityKey, lat, lng);
      // 구글이 알려주는 영업 상태 → 우리 장부에 박는다. 폐업 호텔로 콘텐츠를 만들면 예약이 0이다.
      const bs = place.businessStatus || null;
      const opStatus = bs === 'CLOSED_PERMANENTLY' ? 'closed'
        : (bs === 'CLOSED_TEMPORARILY' ? 'temp_closed'
        : (bs === 'OPERATIONAL' ? 'active' : null));
      const patch = {
        latitude: lat, longitude: lng,
        address: place.formattedAddress || null,
        google_place_id: place.id || null,
        district,
        geo_status: 'ok',
        geo_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (opStatus) patch.operating_status = opStatus;   // 구글이 말해줄 때만 바꾼다
      await sbPatch(`hotels?id=eq.${h.id}`, patch);
      result.ok++;
      if (opStatus && opStatus !== 'active') {
        result.closed = (result.closed || 0) + 1;
        if (result.samples.length < 8) result.samples.push(`🔴 ${h.hotel_name} → ${opStatus === 'closed' ? '폐업' : '임시휴업'}`);
      }
      if (district) result.districts[district] = (result.districts[district] || 0) + 1;
      if (result.samples.length < 5) result.samples.push(`✅ ${h.hotel_name} → ${district || '기타'}`);
    }

    // ── 카운터 반영
    if (counter.id) {
      await sbPatch(`api_usage_monthly?id=eq.${counter.id}`, {
        call_count: used + calls,
        last_call_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return {
      status: 200,
      body: {
        ok: true,
        processed: targets.length,
        calls,
        result,
        quota: { used: used + calls, cap: MONTHLY_CAP, remain: MONTHLY_CAP - used - calls },
        note: 'Pro 필드마스크(이름·주소·좌표) — 무료 5,000/월',
      },
    };
  } catch (e) {
    return { status: 500, body: { ok: false, error: String(e.message || e).slice(0, 300) } };
  }
}

/** 진행 상황 한 묶음 (메일 보고용) — BL-HOTEL-GEO-MAIL 2026-07-16 */
export async function geoStats() {
  const SB_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SB_KEY) return null;
  const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'count=exact', Range: '0-0' };

  const countOf = async (filter) => {
    const r = await fetch(`${SB_URL}/rest/v1/hotels?select=id${filter ? '&' + filter : ''}`, { headers: H });
    const n = parseInt(((r.headers.get('content-range') || '').split('/')[1] || '').trim());
    return Number.isFinite(n) ? n : null;
  };

  const [total, filled, remaining, manualCheck, notFound, withAddress] = await Promise.all([
    countOf(''),
    countOf('latitude=not.is.null'),
    countOf('latitude=is.null&or=(geo_status.is.null,geo_status.eq.pending)'),
    countOf('geo_status=eq.manual_check'),
    countOf('geo_status=eq.not_found'),
    countOf('address=not.is.null'),
  ]);

  let used = null;
  try {
    const ym = new Date().toISOString().slice(0, 7);
    const r = await fetch(
      `${SB_URL}/rest/v1/api_usage_monthly?api_name=eq.${API_NAME}&year_month=eq.${ym}&select=call_count`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    const rows = await r.json();
    used = rows[0] ? rows[0].call_count : 0;
  } catch (e) { /* 보고용일 뿐 */ }

  const daysLeft = remaining != null ? Math.ceil(remaining / (CRON_BATCH * 3)) : null;
  let eta = null;
  if (daysLeft != null) {
    const d = new Date(Date.now() + daysLeft * 86400000);
    eta = d.toISOString().slice(0, 10);
  }
  return { total, filled, remaining, manual_check: manualCheck, not_found: notFound,
           with_address: withAddress, monthly_used: used, monthly_cap: MONTHLY_CAP,
           days_left: daysLeft, eta };
}

/** 남은 대상 수 (보고용) */
export async function countRemaining() {
  const SB_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SB_KEY) return null;
  const r = await fetch(
    `${SB_URL}/rest/v1/hotels?latitude=is.null&or=(geo_status.is.null,geo_status.eq.pending)&select=id`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'count=exact', Range: '0-0' } }
  );
  const cr = r.headers.get('content-range') || '';
  const n = parseInt((cr.split('/')[1] || '').trim());
  return Number.isFinite(n) ? n : null;
}
