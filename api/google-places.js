// /api/google-places.js
// Google Places API (New) 프록시
// 호텔명/위치로 검색하여 주소·전화·홈페이지·사진 자동 수집

// 🔴 2026-09-01 요금 등급 분리 (대표님 «구글 평점 필요 없어 · 사진도 필요 없잖아»)
//
//   구글 Places API (New) 는 «FieldMask 에 든 필드 중 가장 비싼 등급»으로 요청 전체를 과금한다.
//   2025-03-01 부터 $200 통합 크레딧이 폐지되고 SKU 별 무료 한도로 바뀌었다.
//
//     Essentials              무료 10,000/월
//     Pro                     무료  5,000/월   $32/1,000
//     Enterprise              무료  1,000/월   $35/1,000   ← rating·openingHours 넣으면
//     Enterprise+Atmosphere   무료  1,000/월   $40/1,000   ← reviews·photos 넣으면
//
//   🔴 2026-08 사고: 검색·상세 양쪽에 rating·photos·reviews 를 넣어 «모든 호출»이 최고 등급이었다.
//      좌표 하나 채우는 호출까지 $40 구간. 8월 2,744회 → 95,911원 청구.
//      평점은 아고다 자료에 있고, 사진은 아고다 Lite API 로 받는다 — 구글에서 받을 이유가 없었다.
//
//   그래서 부르는 «목적»별로 나눈다. 호출자는 mode 를 지정한다.
//     basic    (기본)  공식주소·좌표·place_id            — 평점·사진 없음
//     status   (상태)  + 영업중인지                      — 폐업 확인용
//     reviews  (후기)  + 후기                            — google-reviews 만 쓴다
//   mode 를 안 주면 basic 이다. 🔴 비싼 쪽이 기본이 되지 않게.

const SEARCH_MASK = {
  basic:   'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.types,places.websiteUri,places.internationalPhoneNumber,places.nationalPhoneNumber,places.googleMapsUri',
  status:  'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.types,places.websiteUri,places.googleMapsUri,places.businessStatus,places.regularOpeningHours',
  reviews: 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.websiteUri,places.googleMapsUri'
};

const DETAIL_MASK = {
  basic:   'id,displayName,formattedAddress,shortFormattedAddress,location,types,websiteUri,internationalPhoneNumber,nationalPhoneNumber,googleMapsUri',
  status:  'id,displayName,formattedAddress,location,websiteUri,googleMapsUri,businessStatus,regularOpeningHours',
  reviews: 'reviews,id,displayName,formattedAddress,location,websiteUri,googleMapsUri'
};

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const PLACES_DETAIL_URL = 'https://places.googleapis.com/v1/places/';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY not configured' });
  }

  try {
    const { query, latitude, longitude, placeId, languageCode } = req.body || {};
    // 🔴 mode 를 안 주면 basic (가장 싼 등급). 비싼 쪽이 기본이 되지 않게 한다
    const mode = ['basic', 'status', 'reviews'].includes(req.body?.mode) ? req.body.mode : 'basic';
    // 누가 불렀는지 — 계량기를 서비스별로 나눠 세기 위해
    const caller = String(req.body?.caller || req.headers['x-caller'] || 'unknown').slice(0, 40);

    // 🔴 한도 확인 — 넘으면 부르지 않는다 (2026-09-01 대표님 «절대 절대 안 됨»)
    const gate = await checkQuota(mode);
    if (!gate.ok) {
      return res.status(429).json({
        error: 'quota_stop',
        message: `이번 달 ${mode} 무료 한도(${gate.cap})에 닿아 멈췄습니다. 돈이 나가지 않습니다.`,
        used: gate.used, cap: gate.cap, mode
      });
    }

    // 케이스 1: placeId로 직접 상세 조회
    if (placeId) {
      // 🔴 languageCode 를 주면 그 언어 후기를 우선으로 돌려준다 (한국인 후기 확보용)
      const detail = await getPlaceDetail(placeId, apiKey, languageCode, mode);
      await meter(mode, caller, 1);
      return res.status(200).json({
        success: true,
        place: normalizePlace(detail)
      });
    }

    // 케이스 2: 검색
    if (!query) {
      return res.status(400).json({ error: 'query or placeId is required' });
    }

    const searchBody = {
      textQuery: query,
      maxResultCount: 1,   // 🔴 첫 번째만 쓴다 — 5개 받아 4개 버리던 것을 고침
      languageCode: 'en'
    };

    // 위치 바이어스가 있으면 추가
    if (latitude && longitude) {
      searchBody.locationBias = {
        circle: {
          center: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
          radius: 5000.0
        }
      };
    }

    // 호텔만 검색
    searchBody.includedType = 'lodging';

    const response = await fetch(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': SEARCH_MASK[mode] || SEARCH_MASK.basic
      },
      body: JSON.stringify(searchBody)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Google Places API error',
        details: data
      });
    }

    const places = (data.places || []).map(normalizePlace);
    await meter(mode, caller, 1);

    return res.status(200).json({
      success: true,
      count: places.length,
      places: places
    });

  } catch (err) {
    console.error('Google Places error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
}

async function getPlaceDetail(placeId, apiKey, languageCode, mode) {
  let url = PLACES_DETAIL_URL + encodeURIComponent(placeId);
  if (languageCode) url += '?languageCode=' + encodeURIComponent(languageCode);
  const r = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': DETAIL_MASK[mode] || DETAIL_MASK.basic
    }
  });
  return r.json();
}

// 🔴 2026-09-01 계량기를 «창구»에 심는다.
//    전에는 호출자마다 따로 세어서 스튜디오(process-hotel·agoda-search·hotel-closed-check)가
//    아예 안 세어졌다. 여기 두면 누가 부르든 전부 세어진다.
//    호출 1회 = 1건. 호텔 1곳은 검색+상세 2회이므로 2건으로 잡힌다(전에는 1로만 셌다).
const FREE_CAP = { basic: 5000, status: 5000, reviews: 1000 };  // 구글 공식 (2025-03 개편)
const SAFE = 0.9;   // 90% 에서 멈춘다 — 넘을 수가 없게

function ym() { return new Date().toISOString().slice(0, 7); }

async function sb(path, init) {
  const url = process.env.SUPABASE_URL + '/rest/v1/' + path;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return fetch(url, {
    ...init,
    headers: { apikey: key, Authorization: 'Bearer ' + key,
               'Content-Type': 'application/json', ...(init && init.headers) }
  });
}

async function checkQuota(mode) {
  const cap = Math.floor((FREE_CAP[mode] || 1000) * SAFE);
  try {
    const r = await sb(`api_usage?provider=eq.google_places&tier=eq.${mode}&ym=eq.${ym()}&select=used`);
    const rows = await r.json();
    const used = (rows && rows[0] && rows[0].used) || 0;
    return { ok: used < cap, used, cap };
  } catch (e) {
    // 🔴 계량기를 못 읽으면 «멈춘다». 모르는 채로 돈을 쓰지 않는다
    return { ok: false, used: null, cap, unknown: true };
  }
}

async function meter(mode, caller, n) {
  try {
    const r = await sb(`api_usage?provider=eq.google_places&tier=eq.${mode}&ym=eq.${ym()}&select=used`);
    const rows = await r.json();
    if (rows && rows.length) {
      await sb(`api_usage?provider=eq.google_places&tier=eq.${mode}&ym=eq.${ym()}`, {
        method: 'PATCH',
        body: JSON.stringify({ used: (rows[0].used || 0) + n, updated_at: new Date().toISOString() })
      });
    } else {
      await sb('api_usage', { method: 'POST', body: JSON.stringify({
        provider: 'google_places', tier: mode, ym: ym(), used: n,
        free_limit: FREE_CAP[mode] || 1000 }) });
    }
    await sb('api_call_log', { method: 'POST', body: JSON.stringify({
      provider: 'google_places', tier: mode, caller, n, called_at: new Date().toISOString()
    }) }).catch(function(){ /* 기록 실패가 일을 막지 않는다 */ });
  } catch (e) { /* 계량 실패가 일을 막지 않는다 */ }
}

function normalizePlace(p) {
  if (!p) return null;
  
  // 사진 URL 변환 (최대 5장)
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const photos = (p.photos || []).slice(0, 5).map(function (photo) {
    return {
      name: photo.name,
      url: 'https://places.googleapis.com/v1/' + photo.name + '/media?maxWidthPx=800&key=' + apiKey,
      widthPx: photo.widthPx,
      heightPx: photo.heightPx
    };
  });

  return {
    placeId: p.id,
    name: p.displayName ? (p.displayName.text || p.displayName) : '',
    address: p.formattedAddress || '',
    shortAddress: p.shortFormattedAddress || '',
    latitude: p.location ? p.location.latitude : null,
    longitude: p.location ? p.location.longitude : null,
    rating: p.rating || null,
    ratingCount: p.userRatingCount || 0,
    phone: p.internationalPhoneNumber || p.nationalPhoneNumber || '',
    website: p.websiteUri || '',
    googleMapsUrl: p.googleMapsUri || '',
    photos: photos,
    types: p.types || [],
    businessStatus: p.businessStatus || null,
    // 2026-08-14 수정 : 구글은 r.text 에 «번역본», r.originalText 에 «원문»을 준다.
    // 지금까지 번역본(영어)만 담아서 한국인이 한국어로 쓴 후기도 lang='en' 으로 들어갔다.
    // 🔴 말투(voice)는 한국어 원문에서만 배운다 (BOTS §7-4) → 원문을 1순위로 바꾼다.
    reviews: (p.reviews || []).map(function(r){ return {
      text: (r.originalText && r.originalText.text) || (r.text && r.text.text) || '',
      lang: (r.originalText && r.originalText.languageCode)
            || (r.text && r.text.languageCode) || '',
      textTranslated: (r.text && r.text.text) || '',
      langTranslated: (r.text && r.text.languageCode) || '',
      rating: r.rating, when: r.publishTime, ago: r.relativePublishTimeDescription,
      author: r.authorAttribution && r.authorAttribution.displayName
    }; }),
    openingHours: p.regularOpeningHours || null,
    // 🔴 2026-08-16 추가 — «기본»(호텔이 어떤 곳인가) 재료.
    //    구글은 이미 최상위 구간(후기)으로 부르므로 필드를 더 받아도 요금이 늘지 않는다
    editorialSummary: (p.editorialSummary && p.editorialSummary.text) || null,
    editorialLang: (p.editorialSummary && p.editorialSummary.languageCode) || null,
    priceLevel: p.priceLevel || null,
    facts: {
      goodForChildren: p.goodForChildren,
      goodForGroups: p.goodForGroups,
      allowsDogs: p.allowsDogs,
      restroom: p.restroom,
      servesBreakfast: p.servesBreakfast,
      servesBrunch: p.servesBrunch,
      servesDinner: p.servesDinner,
      liveMusic: p.liveMusic,
      outdoorSeating: p.outdoorSeating,
      accessibility: p.accessibilityOptions || null,
      parking: p.parkingOptions || null,
      payment: p.paymentOptions || null
    }
  };
}

