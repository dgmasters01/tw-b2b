// /api/paypal/config.js
// 프론트엔드가 PayPal SDK 로드 시 필요한 client_id 와 환경 정보를 안전하게 받음
// (client_id는 공개 가능, secret은 노출 금지)

import { getPayPalEnv, getPublicClientId } from '../lib/paypal-client.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const env = getPayPalEnv();
  const clientId = getPublicClientId();

  if (!clientId) {
    return res.status(500).json({
      error: 'PayPal client_id not configured',
      env,
    });
  }

  return res.status(200).json({
    env,
    clientId,
    currency: 'USD',
    intent: 'capture',
  });
}
