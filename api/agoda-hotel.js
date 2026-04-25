// /api/agoda-hotel.js
// 아고다 Long-tail API 프록시
// hotelId 또는 cityId + 검색조건으로 호텔 정보 조회

const AGODA_ENDPOINT = 'https://affiliateapi7643.agoda.com/affiliateservice/lt_v1';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.AGODA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AGODA_API_KEY not configured' });
  }

  try {
    const { hotelId, cityId, checkIn, checkOut, maxResult } = req.body || {};
    
    // 체크인/체크아웃 기본값: 한 달 후
    const today = new Date();
    const inDate = checkIn || addDays(today, 30);
    const outDate = checkOut || addDays(today, 31);

    // 검색 조건 빌드
    const criteria = {
      additional: {
        currency: 'USD',
        dailyRate: { maximum: 10000, minimum: 1 },
        discountOnly: false,
        language: 'en-us',
        maxResult: maxResult || (hotelId ? 1 : 30),
        minimumReviewScore: 0,
        minimumStarRating: 0,
        occupancy: { numberOfAdult: 2, numberOfChildren: 0 }
      },
      checkInDate: inDate,
      checkOutDate: outDate
    };

    // hotelId가 있으면 cityId도 필요
    if (hotelId) {
      if (!cityId) {
        return res.status(400).json({
          error: 'cityId is required when hotelId is provided',
          hint: 'Agoda Long-tail API requires both hotelId and cityId'
        });
      }
      criteria.cityId = cityId;
      criteria.hotelId = Array.isArray(hotelId) ? hotelId : [hotelId];
    } else if (cityId) {
      criteria.cityId = cityId;
    } else {
      return res.status(400).json({ error: 'Either hotelId or cityId is required' });
    }

    // 아고다 API 호출
    const response = await fetch(AGODA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ criteria })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Agoda API error',
        details: data
      });
    }

    // 응답 정규화
    const results = (data.results || []).map(normalizeHotel);
    
    return res.status(200).json({
      success: true,
      count: results.length,
      results: results,
      raw: data
    });

  } catch (err) {
    console.error('Agoda API error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
}

function normalizeHotel(h) {
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

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
