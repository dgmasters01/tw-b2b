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

  // Google 주소에서 city 추출 → cityId 매핑
  const cityId = resolveCityIdFromGoogle(googlePlace);
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
        maxResult: 100,
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
        'Accept': 'application/json'
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
  // 동남아
  'singapore': 9395,
  'bangkok': 4064,
  'pattaya': 16579,
  'phuket': 17196,
  'krabi': 16578,
  'chiang-mai': 16193,
  'kuala-lumpur': 13388,
  'penang': 17104,
  'langkawi': 17184,
  'jakarta': 9595,
  'bali': 17193,
  'denpasar': 17193,
  'ubud': 17191,
  'seminyak': 17190,
  'yogyakarta': 17178,
  'manila': 9531,
  'cebu': 17192,
  'boracay': 18002,
  'palawan': 17170,
  'ho-chi-minh-city': 9590,
  'ho-chi-minh': 9590,
  'hanoi': 22834,
  'da-nang': 18074,
  'nha-trang': 17120,
  'phu-quoc': 19132,
  'hoi-an': 18075,
  // 동아시아
  'tokyo': 14266,
  'osaka': 14267,
  'kyoto': 14268,
  'fukuoka': 14269,
  'sapporo': 14270,
  'okinawa': 17134,
  'nagoya': 14271,
  'yokohama': 14272,
  'seoul': 14179,
  'busan': 14180,
  'jeju': 14181,
  'jeju-island': 14181,
  'incheon': 14182,
  'taipei': 9598,
  'taichung': 17117,
  'kaohsiung': 17118,
  'hong-kong': 9540,
  'macau': 14250,
  'macao': 14250,
  // 남아시아
  'colombo': 17137,
  'kandy': 17139,
  'galle': 17140,
  'bentota': 17141,
  'negombo': 17142,
  'mumbai': 9560,
  'new-delhi': 9561,
  'delhi': 9561,
  'goa': 17150,
  'bengaluru': 17151,
  'bangalore': 17151,
  'kathmandu': 17160,
  'male': 17170,
  'maldives': 17170,
  // 중동
  'dubai': 9395,
  'abu-dhabi': 17175,
  'doha': 17177,
  // 유럽 주요
  'london': 4084,
  'paris': 9395,
  'rome': 17200,
  'barcelona': 17201,
  'madrid': 17202,
  'amsterdam': 17203,
  'berlin': 17204,
  // 미주 주요
  'new-york': 9395,
  'los-angeles': 17220,
  'san-francisco': 17221,
  'las-vegas': 17222,
  'honolulu': 17223,
  'hawaii': 17223,
  'toronto': 17230,
  'vancouver': 17231,
  // 오세아니아
  'sydney': 17240,
  'melbourne': 17241,
  'brisbane': 17242,
  'gold-coast': 17243,
  'auckland': 17250,
  'queenstown': 17251
};
