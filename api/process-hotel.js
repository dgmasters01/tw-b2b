// /api/process-hotel.js
// 아고다 URL을 받아서 아고다 + Google Places 통합 정보 반환
// 호텔 매니저 가입 시 핵심 호출

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

  const agodaKey = process.env.AGODA_API_KEY;
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;

  try {
    const { agodaUrl, hotelId, cityId, hotelName } = req.body || {};
    
    // 입력 검증
    if (!agodaUrl && !hotelId && !hotelName) {
      return res.status(400).json({
        error: 'Either agodaUrl, hotelId, or hotelName is required'
      });
    }

    // URL에서 hotelId, slug, citySlug 추출
    let parsedHotelId = hotelId;
    let parsedSlug = '';
    let parsedCountry = '';
    let parsedCitySlug = '';
    let resolvedCityId = cityId;  // 입력값 우선, 없으면 자동 매핑
    
    if (agodaUrl) {
      const parsed = parseAgodaUrl(agodaUrl);
      if (parsed.hotelId) parsedHotelId = parsed.hotelId;
      parsedSlug = parsed.slug || '';
      parsedCountry = parsed.country || '';
      parsedCitySlug = parsed.citySlug || '';
      
      // cityId가 없으면 city slug로 자동 매핑
      if (!resolvedCityId && parsedCitySlug) {
        resolvedCityId = AGODA_CITY_MAP[parsedCitySlug.toLowerCase()] || null;
      }
    }

    const result = {
      input: { agodaUrl, hotelId: parsedHotelId, cityId: resolvedCityId, hotelName },
      parsed: { hotelId: parsedHotelId, slug: parsedSlug, country: parsedCountry, citySlug: parsedCitySlug, autoCityId: resolvedCityId !== cityId ? resolvedCityId : null },
      agoda: null,
      google: null,
      merged: null,
      warnings: []
    };

    // === 1. 아고다 정보 조회 ===
    if (parsedHotelId && resolvedCityId && agodaKey) {
      const agodaData = await fetchAgoda(parsedHotelId, resolvedCityId, agodaKey);
      if (agodaData && agodaData.results && agodaData.results.length > 0) {
        result.agoda = normalizeAgoda(agodaData.results[0]);
      } else {
        result.warnings.push('Agoda: hotel not found for given hotelId+cityId (may be no availability for date range)');
      }
    } else if (parsedHotelId && !resolvedCityId) {
      result.warnings.push('Agoda: cityId could not be auto-detected. Add manually for full hotel data.');
    }

    // === 2. Google Places 검색 ===
    let searchQuery = hotelName;
    if (!searchQuery && result.agoda) {
      searchQuery = result.agoda.hotelName;
    }
    if (!searchQuery && parsedSlug) {
      searchQuery = parsedSlug.replace(/-/g, ' ');
    }

    if (searchQuery && googleKey) {
      const lat = result.agoda ? result.agoda.latitude : null;
      const lng = result.agoda ? result.agoda.longitude : null;
      
      const googleData = await searchGooglePlaces(searchQuery, lat, lng, googleKey);
      if (googleData && googleData.places && googleData.places.length > 0) {
        result.google = normalizeGoogle(googleData.places[0], googleKey);
        if (googleData.places.length > 1) {
          result.warnings.push('Google: multiple results found, used first match');
        }
      } else {
        result.warnings.push('Google: no place found for query "' + searchQuery + '"');
      }
    }

    // === 3. 통합 데이터 생성 ===
    result.merged = mergeData(result.agoda, result.google, parsedHotelId, agodaUrl);

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (err) {
    console.error('process-hotel error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
}

// Agoda URL 파싱 (hotelId, slug, country, citySlug 추출)
function parseAgodaUrl(url) {
  const result = { hotelId: null, slug: null, country: null, citySlug: null };
  if (!url) return result;
  try {
    const u = new URL(url.trim());
    if (!/agoda\.com$/i.test(u.hostname)) return result;
    const hid = u.searchParams.get('hid');
    if (hid && /^\d+$/.test(hid)) result.hotelId = parseInt(hid, 10);
    const parts = u.pathname.split('/').filter(p => p);
    if (parts.length > 0 && /^[a-z]{2}-[a-z]{2}$/i.test(parts[0])) parts.shift();
    const hotelIdx = parts.indexOf('hotel');
    if (hotelIdx > 0) result.slug = parts[hotelIdx - 1];
    const last = parts[parts.length - 1] || '';
    // 마지막 세그먼트: "singapore-sg.html" → city=singapore, country=sg
    const m = last.match(/^(.+)-([a-z]{2})\.html?$/i);
    if (m) {
      result.citySlug = m[1].toLowerCase();
      result.country = m[2].toUpperCase();
    }
  } catch (e) {}
  return result;
}

// Agoda city slug → cityId 매핑
// 주요 APAC + 글로벌 도시 (확장 가능)
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
  'queenstown': 17251,
};

async function fetchAgoda(hotelId, cityId, apiKey) {
  const today = new Date();
  const inDate = addDays(today, 30);
  const outDate = addDays(today, 31);
  
  const body = {
    criteria: {
      additional: {
        currency: 'USD',
        dailyRate: { maximum: 10000, minimum: 1 },
        discountOnly: false,
        language: 'en-us',
        maxResult: 1,
        minimumReviewScore: 0,
        minimumStarRating: 0,
        occupancy: { numberOfAdult: 2, numberOfChildren: 0 }
      },
      checkInDate: inDate,
      checkOutDate: outDate,
      cityId: parseInt(cityId, 10),
      hotelId: [parseInt(hotelId, 10)]
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
    return await r.json();
  } catch (e) {
    return null;
  }
}

async function searchGooglePlaces(query, lat, lng, apiKey) {
  const body = {
    textQuery: query,
    maxResultCount: 3,
    languageCode: 'en',
    includedType: 'lodging'
  };
  
  if (lat && lng) {
    body.locationBias = {
      circle: {
        center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        radius: 3000.0
      }
    };
  }
  
  try {
    const r = await fetch(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri,places.internationalPhoneNumber,places.googleMapsUri,places.photos'
      },
      body: JSON.stringify(body)
    });
    return await r.json();
  } catch (e) {
    return null;
  }
}

function normalizeAgoda(h) {
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

function normalizeGoogle(p, apiKey) {
  if (!p) return null;
  const photos = (p.photos || []).slice(0, 5).map(photo => ({
    name: photo.name,
    url: 'https://places.googleapis.com/v1/' + photo.name + '/media?maxWidthPx=800&key=' + apiKey
  }));
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
    photos: photos
  };
}

function mergeData(agoda, google, hotelId, agodaUrl) {
  const merged = {
    // From Agoda (primary for booking-related)
    hotel_name: '',
    star_rating: null,
    review_score: null,
    review_count: 0,
    daily_rate: null,
    currency: 'USD',
    image_url: '',
    landing_url: '',
    latitude: null,
    longitude: null,
    include_breakfast: false,
    free_wifi: false,
    
    // From Google (primary for contact/location)
    google_place_id: '',
    address: '',
    phone: '',
    website: '',
    google_photos: [],
    
    // Original input
    agoda_url: agodaUrl || '',
    agoda_hotel_id: hotelId || null
  };

  if (agoda) {
    merged.hotel_name = agoda.hotelName || '';
    merged.star_rating = agoda.starRating;
    merged.review_score = agoda.reviewScore;
    merged.review_count = agoda.reviewCount || 0;
    merged.daily_rate = agoda.dailyRate;
    merged.currency = agoda.currency || 'USD';
    merged.image_url = agoda.imageURL || '';
    merged.landing_url = agoda.landingURL || '';
    merged.latitude = agoda.latitude;
    merged.longitude = agoda.longitude;
    merged.include_breakfast = agoda.includeBreakfast;
    merged.free_wifi = agoda.freeWifi;
  }

  if (google) {
    merged.google_place_id = google.placeId || '';
    merged.address = google.address || '';
    merged.phone = google.phone || '';
    merged.website = google.website || '';
    merged.google_photos = google.photos || [];
    
    // 호텔명은 Google 이름이 더 정확한 경우가 많음
    if (!merged.hotel_name && google.name) merged.hotel_name = google.name;
    
    // 좌표가 없으면 Google 것 사용
    if (!merged.latitude && google.latitude) merged.latitude = google.latitude;
    if (!merged.longitude && google.longitude) merged.longitude = google.longitude;
  }

  return merged;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
