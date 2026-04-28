// /api/paypal/create-order.js
// PayPal Order 생성 (서버사이드)
// - 매니저 인증 필수 (Supabase JWT 검증)
// - 가격은 서버에서 결정 ($200 USD 고정) — 프론트가 보내는 금액 신뢰 금지
// - hotel_id 소유권 검증 (해당 매니저의 호텔이어야 함)
// - hotel.status가 'paid'/'producing'/'published' 면 거부 (이미 결제됨)
//
// Body: { hotel_id: string }
// Headers: Authorization: Bearer <supabase_access_token>
//
// Response: { order_id: string, env: 'sandbox'|'live' }

import { createOrder, getPayPalEnv } from '../lib/paypal-client.js';

const SUPABASE_URL = 'https://vjsludfjsphwnumuoqaj.supabase.co';

// 가격은 서버 단일 진실 (Single Source of Truth)
const PRODUCT_PRICE_USD = '200.00';
const PRODUCT_DESCRIPTION = 'TravelWinners B2B - 6-Language YouTube Video Production (One-time)';

/**
 * Supabase access_token 으로 사용자 검증
 */
async function verifyUser(accessToken) {
  if (!accessToken) return null;
  try {
    const resp = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'apikey': process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '',
      },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data && data.id ? data : null;
  } catch (e) {
    console.error('verifyUser error', e);
    return null;
  }
}

/**
 * 호텔 소유권 + 결제 가능 상태 확인 (service_role 사용)
 */
async function checkHotelOwnership(hotelId, userId) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  const resp = await fetch(
    SUPABASE_URL + '/rest/v1/hotels?id=eq.' + encodeURIComponent(hotelId) + '&select=id,user_id,status,hotel_name',
    {
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'apikey': serviceKey,
      },
    }
  );
  if (!resp.ok) return { ok: false, reason: 'lookup_failed' };
  const rows = await resp.json();
  if (!rows.length) return { ok: false, reason: 'not_found' };

  const h = rows[0];
  if (h.user_id !== userId) return { ok: false, reason: 'not_owner' };

  // 이미 결제 완료 상태면 거부
  const blockedStatuses = ['paid', 'producing', 'published'];
  if (blockedStatuses.includes(h.status)) {
    return { ok: false, reason: 'already_paid', currentStatus: h.status };
  }

  return { ok: true, hotel: h };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. 인증
    const auth = req.headers.authorization || '';
    const accessToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const user = await verifyUser(accessToken);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // 2. 입력 검증
    const body = req.body || {};
    const hotelId = body.hotel_id;
    if (!hotelId) return res.status(400).json({ error: 'hotel_id is required' });

    // 3. 호텔 소유권 + 상태 확인
    const ownership = await checkHotelOwnership(hotelId, user.id);
    if (!ownership.ok) {
      const status = ownership.reason === 'not_owner' || ownership.reason === 'not_found' ? 403 : 409;
      return res.status(status).json({
        error: 'hotel_check_failed',
        reason: ownership.reason,
        currentStatus: ownership.currentStatus,
      });
    }

    // 4. PayPal Order 생성
    const order = await createOrder({
      amount: PRODUCT_PRICE_USD,
      referenceId: hotelId,
      description: PRODUCT_DESCRIPTION,
    });

    return res.status(200).json({
      order_id: order.id,
      status: order.status,
      env: getPayPalEnv(),
    });
  } catch (err) {
    console.error('create-order error:', err);
    return res.status(500).json({ error: 'create_order_failed', detail: err.message });
  }
}
