// /api/agoda-search.js
// 호텔명 자동완성 검색 (Phase 3 Step 4-3)
// Google Places(lodging)로 호텔 검색 → 각 결과별 Agoda 매칭 여부 병렬 확인
// 매출 보호 핵심: Agoda 미등록 호텔도 검색 결과에 포함시켜 어드민이 수동매칭/등록안내 처리

const AGODA_ENDPOINT = 'https://affiliateapi7643.agoda.com/affiliateservice/lt_v1';
const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, latitude, longitude, maxResults } = req.body || {};

    // 1) 입력 검증 (API 키 체크보다 먼저)
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({
        error: 'query is required (minimum 2 characters)'
      });
    }

    // 2) API 키 체크
    const agodaKey = process.env.AGODA_API_KEY;
    const googleKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!googleKey) {
      return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY not configured' });
    }

    const limit = Math.min(parseInt(maxResults, 10) || 5, 8);

    // === 1. Google Places 호텔 검색 ===
    const googleResults = await searchGooglePlaces(
      query.trim(),
      latitude,
      longitude,
      googleKey,
      limit
    );

    if (!googleResults || !googleResults.places || googleResults.places.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        results: [],
        message: 'No hotels found for the query'
      });
    }

    // === 2. 각 Google 결과별 Agoda 매칭 병렬 처리 ===
    const matchPromises = googleResults.places.map(function (place) {
      return matchAgoda(place, agodaKey, googleKey);
    });

    const matched = await Promise.all(matchPromises);

    return res.status(200).json({
      success: true,
      count: matched.length,
      results: matched
    });

  } catch (err) {
    console.error('agoda-search error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
}

// ============================================================
// Google Places 호텔 검색
// ============================================================
async function searchGooglePlaces(query, lat, lng, apiKey, maxResults) {
  const body = {
    textQuery: query,
    maxResultCount: maxResults,
    languageCode: 'en',
    includedType: 'lodging'
  };

  if (lat && lng) {
    body.locationBias = {
      circle: {
        center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        radius: 10000.0
      }
    };
  }

  try {
    const r = await fetch(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.addressComponents,places.location,places.rating,places.userRatingCount,places.websiteUri,places.internationalPhoneNumber,places.googleMapsUri,places.photos,places.types,places.businessStatus'
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      console.error('Google Places search failed:', r.status);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.error('Google Places fetch error:', e);
    return null;
  }
}

// ============================================================
// 단일 Google 결과에 대해 Agoda 매칭 시도
// ============================================================
async function matchAgoda(googlePlace, agodaKey, googleKey) {
  const normalized = normalizeGoogle(googlePlace, googleKey);

  // 기본 응답 구조: 미매칭 상태
  const result = {
    google: normalized,
    agoda: null,
    matched: false,
    matchScore: 0,
    cityId: null
  };

  if (!agodaKey) {
    return result;
  }

  // 🔑 2026-07-17 — **좌표로 도시를 찾는다.** 이름으로 찾으면 못 찾는다:
  //    구글은 방콕을 `Krung Thep Maha Nakhon`(태국 정식명)이라고 준다 → 우리 표엔 `bangkok` 뿐 → 실패.
  //    아고다 파일이 도시 25,268개의 중심 좌표를 준다(`agoda_city`) → **가장 가까운 도시**를 고른다.
  //    이름 표(AGODA_CITY_MAP)는 **좌표가 없을 때만** 쓰는 폴백으로 남긴다.
  let cityId = await resolveCityIdByGeo(googlePlace);
  if (!cityId) cityId = resolveCityIdFromGoogle(googlePlace);
  if (!cityId) {
    return result;
  }
  result.cityId = cityId;

  // Agoda에서 해당 city의 호텔 풀 조회 (위경도 기반 좁히기)
  const agodaHotels = await fetchAgodaCity(
    cityId,
    normalized.latitude,
    normalized.longitude,
    agodaKey
  );

  if (!agodaHotels || agodaHotels.length === 0) {
    return result;
  }

  // 호텔명 + 위경도 기반 매칭 점수 계산
  const best = findBestMatch(normalized, agodaHotels);
  if (best && best.score >= 0.6) {
    result.agoda = best.hotel;
    result.matched = true;
    result.matchScore = Math.round(best.score * 100) / 100;
  }

  return result;
}

// ============================================================
// Google Place에서 city slug 추출 → Agoda cityId
// ============================================================
// 🔑 좌표로 도시 찾기 — 이름은 나라마다 다르게 오지만 좌표는 안 그렇다 (2026-07-17)
//    `agoda_city` = 아고다 「숙소 데이터 파일」에서 계산한 도시 25,268개의 중심 좌표.
//    150km 안에서 **호텔이 가장 많은** 도시를 고른다(가장 가까운 것이 아니라 — 시골 마을이 잡힌다).
async function resolveCityIdByGeo(place) {
  const la = place && place.location && place.location.latitude;
  const lo = place && place.location && place.location.longitude;
  if (!la || !lo) return null;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const d = 1.4;   // 위경도 ±1.4° ≈ 150km 안에서만 본다
  try {
    const r = await fetch(
      `${url}/rest/v1/agoda_city?latitude=gte.${la - d}&latitude=lte.${la + d}` +
      `&longitude=gte.${lo - d}&longitude=lte.${lo + d}` +
      `&select=city_id,city,hotels,latitude,longitude&order=hotels.desc&limit=40`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) return null;
    const rows = await r.json();
    if (!rows.length) return null;
    const km = (a, b, c, e) => {
      const R = 6371, p = Math.PI / 180;
      return R * Math.acos(Math.min(1, Math.cos(a * p) * Math.cos(c * p) * Math.cos((e - b) * p) + Math.sin(a * p) * Math.sin(c * p)));
    };
    // 🔴 2026-07-17 실측 — "60km 안에서 **호텔이 가장 많은** 도시" 로 했더니 틀렸다:
    //    싱가포르(650곳)가 **말레이시아 조호바루(6,004곳 · 20km)** 에 먹혔다. **가까운 게 아니라 큰 걸 골랐다.**
    //    → **거리를 먼저 본다.** 가장 가까운 도시. 다만 아주 가까운 것들(±8km)끼리는 큰 쪽.
    const scored = rows.map((x) => ({ ...x, d: km(la, lo, x.latitude, x.longitude) }))
      .filter((x) => x.d <= 60)
      .sort((a, b) => a.d - b.d);
    if (!scored.length) return null;
    const best = scored[0];
    const tie = scored.filter((x) => x.d <= best.d + 8).sort((a, b) => b.hotels - a.hotels);
    return tie[0].city_id;
  } catch (e) { return null; }
}

function resolveCityIdFromGoogle(place) {
  if (!place) return null;

  // 1순위: addressComponents에서 locality 찾기
  const components = place.addressComponents || [];
  let cityName = '';

  for (let i = 0; i < components.length; i++) {
    const c = components[i];
    const types = c.types || [];
    if (types.indexOf('locality') >= 0 || types.indexOf('administrative_area_level_1') >= 0) {
      cityName = (c.shortText || c.longText || '').toLowerCase().replace(/\s+/g, '-');
      if (AGODA_CITY_MAP[cityName]) {
        return AGODA_CITY_MAP[cityName];
      }
    }
  }

  // 2순위: formattedAddress에서 city 키워드 매칭
  const addr = (place.formattedAddress || '').toLowerCase();
  const keys = Object.keys(AGODA_CITY_MAP);
  for (let i = 0; i < keys.length; i++) {
    const slug = keys[i];
    const cityWords = slug.replace(/-/g, ' ');
    if (addr.indexOf(cityWords) >= 0) {
      return AGODA_CITY_MAP[slug];
    }
  }

  return null;
}

// ============================================================
// Agoda city 단위 호텔 풀 조회 (위경도 정렬)
// ============================================================
async function fetchAgodaCity(cityId, lat, lng, apiKey) {
  const today = new Date();
  const inDate = addDays(today, 30);
  const outDate = addDays(today, 31);

  const body = {
    criteria: {
      additional: {
        currency: 'USD',
        dailyRate: { maximum: 100000, minimum: 1 },
        discountOnly: false,
        language: 'en-us',
        // 🔴 2026-07-17 — 아고다 공식 문서: `maxResult · Integer (**1-30**) · Default 10`.
        //    **100 을 보내고 있었다** → 규격 검사 실패 → `911 No search result` →
        //    **매니저 가입 흐름에서 아고다 매칭이 통째로 비어 왔다**(= 링크를 못 만든다). 💰
        maxResult: 30,
        minimumReviewScore: 0,
        minimumStarRating: 0,
        occupancy: { numberOfAdult: 2, numberOfChildren: 0 }
      },
      checkInDate: inDate,
      checkOutDate: outDate,
      cityId: parseInt(cityId, 10)
    }
  };

  try {
    const r = await fetch(AGODA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip,deflate'   // 아고다 문서 요구(필수)
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) return [];
    const data = await r.json();
    let hotels = (data.results || []).map(normalizeAgodaHotel);

    // 위경도 있으면 거리순 정렬 후 상위 30개만 비교 (성능 최적화)
    if (lat && lng) {
      hotels.forEach(function (h) {
        if (h.latitude && h.longitude) {
          h._distance = haversine(lat, lng, h.latitude, h.longitude);
        } else {
          h._distance = 999999;
        }
      });
      hotels.sort(function (a, b) { return a._distance - b._distance; });
      hotels = hotels.slice(0, 30);
    }

    return hotels;
  } catch (e) {
    console.error('Agoda city fetch error:', e);
    return [];
  }
}

// ============================================================
// 호텔명 + 위경도 기반 best match 찾기
// ============================================================
function findBestMatch(googleHotel, agodaHotels) {
  let best = null;
  const gName = normalizeName(googleHotel.name);

  for (let i = 0; i < agodaHotels.length; i++) {
    const a = agodaHotels[i];
    const aName = normalizeName(a.hotelName);

    let score = 0;

    // 호텔명 유사도 (0~0.7)
    const nameSim = stringSimilarity(gName, aName);
    score += nameSim * 0.7;

    // 위경도 거리 (0~0.3): 100m 이내 만점, 1km 이상 0
    if (googleHotel.latitude && googleHotel.longitude && a.latitude && a.longitude) {
      const dist = haversine(
        googleHotel.latitude, googleHotel.longitude,
        a.latitude, a.longitude
      );
      let distScore = 0;
      if (dist < 100) distScore = 1.0;
      else if (dist < 300) distScore = 0.8;
      else if (dist < 500) distScore = 0.5;
      else if (dist < 1000) distScore = 0.2;
      score += distScore * 0.3;
    }

    if (!best || score > best.score) {
      best = { hotel: a, score: score };
    }
  }

  return best;
}

// 호텔명 정규화 (소문자, 특수문자 제거, 공통 접미사 제거)
function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(hotel|resort|spa|the|by|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 문자열 유사도 (Dice's coefficient based on bigrams)
function stringSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const bigrams1 = getBigrams(s1);
  const bigrams2 = getBigrams(s2);
  let intersection = 0;

  bigrams1.forEach(function (count, gram) {
    if (bigrams2.has(gram)) {
      intersection += Math.min(count, bigrams2.get(gram));
    }
  });

  const total = sumValues(bigrams1) + sumValues(bigrams2);
  return total === 0 ? 0 : (2 * intersection) / total;
}

function getBigrams(str) {
  const map = new Map();
  for (let i = 0; i < str.length - 1; i++) {
    const gram = str.substring(i, i + 2);
    map.set(gram, (map.get(gram) || 0) + 1);
  }
  return map;
}

function sumValues(map) {
  let total = 0;
  map.forEach(function (v) { total += v; });
  return total;
}

// Haversine 거리 (미터)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = function (d) { return d * Math.PI / 180; };
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// 정규화 함수
// ============================================================
function normalizeGoogle(p, apiKey) {
  if (!p) return null;
  const photos = (p.photos || []).slice(0, 5).map(function (photo) {
    return {
      name: photo.name,
      url: 'https://places.googleapis.com/v1/' + photo.name + '/media?maxWidthPx=800&key=' + apiKey
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
    phone: p.internationalPhoneNumber || '',
    website: p.websiteUri || '',
    googleMapsUrl: p.googleMapsUri || '',
    photos: photos,
    types: p.types || [],
    businessStatus: p.businessStatus || null
  };
}

function normalizeAgodaHotel(h) {
  return {
    hotelId: h.hotelId,
    hotelName: h.hotelName ? h.hotelName.trim() : '',
    starRating: h.starRating,
    reviewScore: h.reviewScore,
    reviewCount: h.reviewCount,
    dailyRate: h.dailyRate,
    crossedOutRate: h.crossedOutRate,
    discountPercentage: h.discountPercentage,
    currency: h.currency,
    imageURL: h.imageURL,
    landingURL: h.landingURL,
    latitude: h.latitude,
    longitude: h.longitude,
    includeBreakfast: !!h.includeBreakfast,
    freeWifi: !!h.freeWifi
  };
}

// ============================================================
// Agoda city slug → cityId 매핑 (process-hotel.js와 동기화 유지)
// ============================================================
const AGODA_CITY_MAP = {
  // 🔴 2026-07-17 — **표 전체가 틀려 있었다.** 아고다 「숙소 데이터 파일」의 city_id 로 전부 바로잡음.
  //    실측: osaka 14267→9590 · tokyo 14266→5085 · kyoto 14268→1784 · fukuoka 14269→16527
  //    🚨 **bangkok(4064) 과 singapore(9395) 가 서로 뒤바뀌어 있었다.**
  //    → 틀린 번호 = 아고다가 `911 No search result` → **매니저 가입 흐름의 아고다 매칭이 계속 실패**했다.
  //    파일이 진짜 번호를 갖고 있다. **손으로 적지 않는다**(D-065 54-0V: 목록은 세는 것).
  //    갱신: `python3 _os/tools/agoda-cityid-sync.py` (파일 받은 뒤 돌린다)
  'abu-dhabi': 10182,   // 🔴 was 17175
  'amsterdam': 13868,   // 🔴 was 17203
  'auckland': 3750,   // 🔴 was 17250
  'bali': 17193,
  'bangalore': 4923,   // 🔴 was 17151
  'bangkok': 9395,   // 🔴 was 4064
  'barcelona': 2002,   // 🔴 was 17201
  'bentota': 14130,   // 🔴 was 17141
  'berlin': 2366,   // 🔴 was 17204
  'brisbane': 9466,   // 🔴 was 17242
  'busan': 17172,   // 🔴 was 14180
  'cebu': 4001,   // 🔴 was 17192
  'chiang-mai': 7401,   // 🔴 was 16193
  'colombo': 7835,   // 🔴 was 17137
  'da-nang': 16440,   // 🔴 was 18074
  'doha': 4472,   // 🔴 was 17177
  'dubai': 2994,   // 🔴 was 9395
  'fukuoka': 16527,   // 🔴 was 14269
  'galle': 19768,   // 🔴 was 17140
  'goa': 11304,   // 🔴 was 17150
  'gold-coast': 16611,   // 🔴 was 17243
  'hanoi': 2758,   // 🔴 was 22834
  'ho-chi-minh-city': 13170,   // 🔴 was 9590
  'hoi-an': 16552,   // 🔴 was 18075
  'hong-kong': 16808,   // 🔴 was 9540
  'incheon': 17234,   // 🔴 was 14182
  'jakarta': 8691,   // 🔴 was 9595
  'jeju': 16901,   // 🔴 was 14181
  'kandy': 11158,   // 🔴 was 17139
  'kaohsiung': 756,   // 🔴 was 17118
  'kathmandu': 2487,   // 🔴 was 17160
  'krabi': 14865,   // 🔴 was 16578
  'kuala-lumpur': 14524,   // 🔴 was 13388
  'kyoto': 1784,   // 🔴 was 14268
  'langkawi': 16928,   // 🔴 was 17184
  'las-vegas': 724103,   // 🔴 was 17222
  'london': 233,   // 🔴 was 4084
  'los-angeles': 19585,   // 🔴 was 17220
  'macau': 21397,   // 🔴 was 14250
  'madrid': 5531,   // 🔴 was 17202
  'male': 176160,   // 🔴 was 17170
  'manila': 1622,   // 🔴 was 9531
  'melbourne': 10372,   // 🔴 was 17241
  'mumbai': 16850,   // 🔴 was 9560
  'nagoya': 13740,   // 🔴 was 14271
  'negombo': 10136,   // 🔴 was 17142
  'new-delhi': 14552,   // 🔴 was 9561
  'nha-trang': 2679,   // 🔴 was 17120
  'osaka': 9590,   // 🔴 was 14267
  'palawan': 16185,   // 🔴 was 17170
  'paris': 15470,   // 🔴 was 9395
  'pattaya': 8584,   // 🔴 was 16579
  'penang': 16087,   // 🔴 was 17104
  'phuket': 16056,   // 🔴 was 17196
  'queenstown': 2566,   // 🔴 was 17251
  'rome': 16594,   // 🔴 was 17200
  'san-francisco': 103114,   // 🔴 was 17221
  'sapporo': 3435,   // 🔴 was 14270
  'seoul': 14690,   // 🔴 was 14179
  'singapore': 4064,   // 🔴 was 9395
  'sydney': 14370,   // 🔴 was 17240
  'taichung': 12080,   // 🔴 was 17117
  'taipei': 4951,   // 🔴 was 9598
  'tokyo': 5085,   // 🔴 was 14266
  'yogyakarta': 14018,   // 🔴 was 17178
  'yokohama': 4590,   // 🔴 was 14272
  // ⚠️ 아고다 파일에서 이름을 못 찾은 도시 — 번호를 **지어내지 않는다**. 확인 후 넣을 것:
  //   'denpasar'
  //   'ubud'
  //   'seminyak'
  //   'boracay'
  //   'ho-chi-minh'
  //   'phu-quoc'
  //   'okinawa'
  //   'jeju-island'
  //   'macao'
  //   'delhi'
  //   'bengaluru'
  //   'maldives'
  //   'new-york'
  //   'honolulu'
  //   'hawaii'
  //   'toronto'
  //   'vancouver'
};
