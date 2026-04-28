// /api/lib/paypal-client.js
// PayPal REST API 공통 클라이언트
// - sandbox/live 환경 자동 분기 (PAYPAL_ENV 환경변수 = 'live' | 'sandbox', 기본 'sandbox')
// - OAuth 2.0 access token 발급 + 캐싱 (만료 60초 전까지 재사용)
// - createOrder / captureOrder / getOrder / verifyWebhook 헬퍼 제공

const PAYPAL_LIVE_BASE = 'https://api-m.paypal.com';
const PAYPAL_SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';

// 메모리 캐시 (Vercel serverless에서 인스턴스 재사용 시 활용)
let _tokenCache = { token: null, expiresAt: 0, env: null };

/**
 * 현재 환경 (live | sandbox) 반환
 * 환경변수 PAYPAL_ENV가 'live'일 때만 live, 그 외는 sandbox (안전 기본값)
 */
export function getPayPalEnv() {
  const env = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
  return env === 'live' ? 'live' : 'sandbox';
}

/**
 * 현재 환경의 PayPal API base URL
 */
export function getPayPalBaseUrl() {
  return getPayPalEnv() === 'live' ? PAYPAL_LIVE_BASE : PAYPAL_SANDBOX_BASE;
}

/**
 * 현재 환경의 client_id / secret
 */
function getCredentials() {
  const env = getPayPalEnv();
  const clientId = env === 'live'
    ? process.env.PAYPAL_LIVE_CLIENT_ID
    : process.env.PAYPAL_SANDBOX_CLIENT_ID;
  const secret = env === 'live'
    ? process.env.PAYPAL_LIVE_SECRET
    : process.env.PAYPAL_SANDBOX_SECRET;
  return { env, clientId, secret };
}

/**
 * 클라이언트 측에서 사용할 client_id (sandbox/live)
 * 프론트엔드 SDK 로드 시 필요 → 별도 endpoint(/api/paypal/config) 에서 노출
 */
export function getPublicClientId() {
  return getCredentials().clientId || null;
}

/**
 * OAuth access_token 발급 (캐싱)
 * @returns {Promise<string>} access_token
 */
export async function getAccessToken() {
  const env = getPayPalEnv();
  const now = Date.now();

  // 캐시가 같은 환경 + 60초 이상 유효하면 재사용
  if (_tokenCache.token && _tokenCache.env === env && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.token;
  }

  const { clientId, secret } = getCredentials();
  if (!clientId || !secret) {
    throw new Error('PayPal credentials not configured for env=' + env);
  }

  const baseUrl = getPayPalBaseUrl();
  const auth = Buffer.from(clientId + ':' + secret).toString('base64');

  const resp = await fetch(baseUrl + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + auth,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.access_token) {
    throw new Error('PayPal token error: ' + (data.error_description || data.error || resp.status));
  }

  _tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 32400) * 1000,
    env,
  };
  return data.access_token;
}

/**
 * PayPal Order 생성
 * @param {Object} params
 * @param {string|number} params.amount - USD 금액 (예: '200.00')
 * @param {string} params.referenceId - 내부 참조 (예: hotel_id)
 * @param {string} params.description - 결제 설명
 * @param {string} [params.returnUrl] - 결제 후 리턴 URL (PayPal Checkout 비표준 흐름용)
 * @param {string} [params.cancelUrl]
 * @returns {Promise<Object>} PayPal order 응답 (id, status, links 포함)
 */
export async function createOrder(params) {
  const token = await getAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const merchantId = process.env.PAYPAL_MERCHANT_ID;

  const amount = typeof params.amount === 'number'
    ? params.amount.toFixed(2)
    : String(params.amount);

  const purchaseUnit = {
    reference_id: params.referenceId || 'tw-b2b',
    description: params.description || 'TravelWinners B2B Video Production',
    amount: {
      currency_code: 'USD',
      value: amount,
    },
  };

  // Merchant ID가 있으면 payee로 명시 (멀티-merchant 환경 안정성)
  // [Phase 3 Step C hotfix] sandbox에서는 라이브 merchant_id가 PAYEE_ACCOUNT_INVALID 에러 유발
  // → live 환경에서만 payee 명시. sandbox는 OAuth 토큰의 business 계정이 자동 payee로 설정됨
  if (merchantId && getPayPalEnv() === 'live') {
    purchaseUnit.payee = { merchant_id: merchantId };
  }

  const orderBody = {
    intent: 'CAPTURE',
    purchase_units: [purchaseUnit],
    application_context: {
      brand_name: 'TravelWinners B2B',
      user_action: 'PAY_NOW',
      shipping_preference: 'NO_SHIPPING',
    },
  };
  if (params.returnUrl) orderBody.application_context.return_url = params.returnUrl;
  if (params.cancelUrl) orderBody.application_context.cancel_url = params.cancelUrl;

  const resp = await fetch(baseUrl + '/v2/checkout/orders', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      // PayPal-Request-Id: 멱등성 보장 (동일 요청 중복 방지)
      'PayPal-Request-Id': 'tw-b2b-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10),
    },
    body: JSON.stringify(orderBody),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error('PayPal createOrder failed: ' + (data.message || data.name || resp.status) + ' / ' + JSON.stringify(data.details || []));
  }
  return data;
}

/**
 * PayPal Order capture (결제 확정)
 * @param {string} orderId
 * @returns {Promise<Object>} capture 응답
 */
export async function captureOrder(orderId) {
  if (!orderId) throw new Error('orderId is required');
  const token = await getAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const resp = await fetch(baseUrl + '/v2/checkout/orders/' + encodeURIComponent(orderId) + '/capture', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': 'tw-b2b-cap-' + orderId,
    },
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    // 이미 capture된 경우 PayPal은 422 ORDER_ALREADY_CAPTURED 반환
    const errName = (data.details && data.details[0] && data.details[0].issue) || data.name || '';
    const err = new Error('PayPal captureOrder failed: ' + (data.message || data.name || resp.status));
    err.paypalErrorCode = errName;
    err.paypalStatus = resp.status;
    err.paypalRaw = data;
    throw err;
  }
  return data;
}

/**
 * Order 상세 조회
 */
export async function getOrder(orderId) {
  if (!orderId) throw new Error('orderId is required');
  const token = await getAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const resp = await fetch(baseUrl + '/v2/checkout/orders/' + encodeURIComponent(orderId), {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error('PayPal getOrder failed: ' + (data.message || resp.status));
  }
  return data;
}

/**
 * Webhook 서명 검증
 * PayPal 공식 verify-webhook-signature API 사용
 *
 * @param {Object} headers - 원본 req.headers
 * @param {string|Object} rawBody - 원본 webhook body (문자열 또는 객체)
 * @returns {Promise<boolean>}
 */
export async function verifyWebhookSignature(headers, rawBody) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn('PAYPAL_WEBHOOK_ID not configured - webhook 검증 비활성화 (개발용)');
    return false;
  }

  const token = await getAccessToken();
  const baseUrl = getPayPalBaseUrl();

  // 헤더는 모두 소문자로 정규화
  const lower = {};
  for (const k of Object.keys(headers || {})) {
    lower[k.toLowerCase()] = headers[k];
  }

  const verifyBody = {
    auth_algo: lower['paypal-auth-algo'],
    cert_url: lower['paypal-cert-url'],
    transmission_id: lower['paypal-transmission-id'],
    transmission_sig: lower['paypal-transmission-sig'],
    transmission_time: lower['paypal-transmission-time'],
    webhook_id: webhookId,
    webhook_event: typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody,
  };

  // 필수 헤더 누락 시 즉시 실패
  if (!verifyBody.auth_algo || !verifyBody.transmission_id || !verifyBody.transmission_sig) {
    return false;
  }

  const resp = await fetch(baseUrl + '/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(verifyBody),
  });

  const data = await resp.json().catch(() => ({}));
  return data.verification_status === 'SUCCESS';
}

export const PAYPAL_CONSTANTS = {
  PAYPAL_LIVE_BASE,
  PAYPAL_SANDBOX_BASE,
};
