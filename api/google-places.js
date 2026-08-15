// /api/google-places.js
// Google Places API (New) 프록시
// 호텔명/위치로 검색하여 주소·전화·홈페이지·사진 자동 수집

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

    // 케이스 1: placeId로 직접 상세 조회
    if (placeId) {
      // 🔴 languageCode 를 주면 그 언어 후기를 우선으로 돌려준다 (한국인 후기 확보용)
      const detail = await getPlaceDetail(placeId, apiKey, languageCode);
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
      maxResultCount: 5,
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
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.websiteUri,places.internationalPhoneNumber,places.nationalPhoneNumber,places.googleMapsUri,places.photos,places.regularOpeningHours,places.businessStatus'
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

async function getPlaceDetail(placeId, apiKey, languageCode) {
  let url = PLACES_DETAIL_URL + encodeURIComponent(placeId);
  if (languageCode) url += '?languageCode=' + encodeURIComponent(languageCode);
  const r = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'reviews,id,displayName,formattedAddress,shortFormattedAddress,location,rating,userRatingCount,types,websiteUri,internationalPhoneNumber,nationalPhoneNumber,googleMapsUri,photos,regularOpeningHours,businessStatus,editorialSummary,priceLevel,accessibilityOptions,parkingOptions,paymentOptions,goodForChildren,goodForGroups,allowsDogs,restroom,servesBreakfast,servesBrunch,servesDinner,liveMusic,outdoorSeating'
    }
  });
  return r.json();
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
