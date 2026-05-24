// ════════════════════════════════════════════════════════════════════════════
// api/_lib/fx.js — 한국수출입은행 환율 API + Supabase fx_snapshots 캐시
// ════════════════════════════════════════════════════════════════════════════
// BL-INVOICE-001 단계 3 — 환율 snapshot 로직
// 단일 진실원: _os/playbook/invoice-system.md (2.3 통화·환율 정책)
//
// 사용처:
//   - 한국 매니저에게 글로벌 USD 상품 인보이스 발행 시
//   - getFxRate(currency='USD') → KRW 환율 (1일 1회 fetch, 캐시 hit 우선)
//
// 환경변수:
//   KOREAEXIM_API_KEY — 한국수출입은행 발급 인증키
//     발급: https://www.koreaexim.go.kr/ir/HPHKIR020M01 (무료, 5분)
//     없으면 fallback: 메모리 캐시 기본값 사용 + 경고 로그
//
// API 특성:
//   - 영업일 11:00 KST 이후 당일 데이터 제공
//   - 주말/공휴일은 빈 배열 반환 → 직전 영업일 데이터로 fallback
//   - cur_unit='USD', deal_bas_r='1,380.50' (매매기준율)
// ════════════════════════════════════════════════════════════════════════════

const KOREAEXIM_BASE = 'https://www.koreaexim.go.kr/site/program/financial/exchangeJSON';

// 환율 API 실패 시 fallback (운영 중단 방지)
// 대표님이 인증키 박을 때까지 임시로 동작하도록.
// 실제 인보이스 발행 시 fx_display_note에 "(fallback)" 표기되어 추후 확인 가능.
const FALLBACK_RATE_USD_KRW = 1380.0;

/**
 * KST 기준 오늘 날짜 (YYYY-MM-DD)
 */
function kstToday() {
  const now = new Date();
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/**
 * YYYY-MM-DD → YYYYMMDD (한국수출입은행 API 형식)
 */
function toYmd(dateStr) {
  return dateStr.replace(/-/g, '');
}

/**
 * 직전 영업일 (주말 자동 회피)
 * @param {string} dateStr YYYY-MM-DD
 * @returns {string} YYYY-MM-DD
 */
function previousBusinessDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    // Sun(0) / Sat(6) → 하루 더 빼기
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * 한국수출입은행 API에서 환율 fetch
 * @param {string} dateStr YYYY-MM-DD (KST 기준)
 * @returns {Promise<{rate:number, date:string, raw:any}|null>}
 */
async function fetchFromKoreaexim(dateStr) {
  const apiKey = process.env.KOREAEXIM_API_KEY;
  if (!apiKey) {
    console.warn('[fx] KOREAEXIM_API_KEY 미설정 — fallback rate 사용');
    return null;
  }

  const url = `${KOREAEXIM_BASE}?authkey=${apiKey}&searchdate=${toYmd(dateStr)}&data=AP01`;

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!resp.ok) {
      console.warn(`[fx] koreaexim HTTP ${resp.status} for ${dateStr}`);
      return null;
    }

    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      // 영업일 아님 (주말/공휴일) — 직전 영업일로 재귀 fetch
      console.log(`[fx] ${dateStr}는 영업일 아님 — 직전 영업일 시도`);
      const prev = previousBusinessDay(dateStr);
      // 무한 루프 방지: 7일 이상 못 찾으면 fallback
      if (Math.abs(new Date(prev) - new Date(dateStr)) > 7 * 86400 * 1000) {
        return null;
      }
      return fetchFromKoreaexim(prev);
    }

    // USD 행 찾기
    const usdRow = data.find(r => r.cur_unit === 'USD');
    if (!usdRow || !usdRow.deal_bas_r) {
      console.warn('[fx] USD row not found in koreaexim response');
      return null;
    }

    const rateStr = String(usdRow.deal_bas_r).replace(/,/g, '');
    const rate = parseFloat(rateStr);
    if (!rate || isNaN(rate) || rate <= 0) {
      console.warn(`[fx] invalid rate parsed: ${usdRow.deal_bas_r}`);
      return null;
    }

    return {
      rate,
      date: dateStr,
      raw: data
    };
  } catch (err) {
    console.error(`[fx] fetch error for ${dateStr}:`, err.message);
    return null;
  }
}

/**
 * Supabase fx_snapshots에서 캐시 hit 확인 (REST 직접 호출 — admin.js 패턴 일관)
 */
async function getCachedSnapshot(supabaseUrl, serviceKey, dateStr, baseCurrency = 'USD') {
  const qs = `snapshot_date=eq.${dateStr}&base_currency=eq.${baseCurrency}&quote_currency=eq.KRW&select=id,rate,source,source_url&limit=1`;
  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/fx_snapshots?${qs}`, {
      headers: { 'Authorization': 'Bearer ' + serviceKey, 'apikey': serviceKey }
    });
    if (!r.ok) return null;
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const row = rows[0];
    return {
      rate: parseFloat(row.rate),
      snapshot_id: row.id,
      source: row.source
    };
  } catch (err) {
    console.error('[fx] cache lookup error:', err.message);
    return null;
  }
}

/**
 * fx_snapshots에 INSERT
 */
async function saveSnapshot(supabaseUrl, serviceKey, dateStr, rate, source, rawResponse, baseCurrency = 'USD') {
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/fx_snapshots?on_conflict=snapshot_date,base_currency,quote_currency`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + serviceKey,
          'apikey': serviceKey,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify({
          snapshot_date: dateStr,
          base_currency: baseCurrency,
          quote_currency: 'KRW',
          rate,
          source,
          source_url: source === 'koreaexim' ? KOREAEXIM_BASE : null,
          raw_response: rawResponse,
          fetched_at: new Date().toISOString()
        })
      }
    );
    if (!r.ok) {
      const text = await r.text();
      console.error('[fx] save snapshot HTTP', r.status, text.slice(0, 200));
      return null;
    }
    const rows = await r.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error('[fx] save snapshot error:', err.message);
    return null;
  }
}

/**
 * 메인 진입점 — 환율 조회 (캐시 hit 우선 → API fetch → fallback)
 *
 * @param {object} supabase Supabase service role client
 * @param {string} baseCurrency 'USD' (기본)
 * @returns {Promise<{
 *   rate: number,
 *   snapshot_id: string|null,
 *   source: 'koreaexim'|'manual_fallback'|'cache',
 *   snapshot_date: string,
 *   is_fallback: boolean,
 *   display_note_template: function
 * }>}
 */
export async function getFxRate(supabaseUrl, serviceKey, baseCurrency = 'USD') {
  const today = kstToday();

  // 1) 캐시 hit
  const cached = await getCachedSnapshot(supabaseUrl, serviceKey, today, baseCurrency);
  if (cached) {
    return {
      rate: cached.rate,
      snapshot_id: cached.snapshot_id,
      source: 'cache',
      snapshot_date: today,
      is_fallback: cached.source === 'manual_fallback',
      display_note_template: (amountBase) => buildDisplayNote(amountBase, cached.rate, today, cached.source)
    };
  }

  // 2) 한국수출입은행 API
  const fetched = await fetchFromKoreaexim(today);
  if (fetched) {
    const saved = await saveSnapshot(
      supabaseUrl,
      serviceKey,
      fetched.date,
      fetched.rate,
      'koreaexim',
      fetched.raw,
      baseCurrency
    );
    return {
      rate: fetched.rate,
      snapshot_id: saved ? saved.id : null,
      source: 'koreaexim',
      snapshot_date: fetched.date,
      is_fallback: false,
      display_note_template: (amountBase) => buildDisplayNote(amountBase, fetched.rate, fetched.date, 'koreaexim')
    };
  }

  // 3) Fallback — 운영 중단 방지
  console.warn(`[fx] 모든 source 실패 — fallback rate ${FALLBACK_RATE_USD_KRW} 사용`);
  const saved = await saveSnapshot(
    supabaseUrl,
    serviceKey,
    today,
    FALLBACK_RATE_USD_KRW,
    'manual_fallback',
    { note: 'API failure, hardcoded fallback used', timestamp: new Date().toISOString() },
    baseCurrency
  );
  return {
    rate: FALLBACK_RATE_USD_KRW,
    snapshot_id: saved ? saved.id : null,
    source: 'manual_fallback',
    snapshot_date: today,
    is_fallback: true,
    display_note_template: (amountBase) => buildDisplayNote(amountBase, FALLBACK_RATE_USD_KRW, today, 'manual_fallback')
  };
}

/**
 * 인보이스 PDF에 박힐 환율 표기 문구 생성
 *   예: "₩276,000 (USD 200 × 1,380, 발행일 2026-05-24 기준)"
 */
function buildDisplayNote(amountBase, rate, dateStr, source) {
  const amountKrw = Math.round(amountBase * rate);
  const krw = '₩' + amountKrw.toLocaleString('ko-KR');
  const note = `${krw} (USD ${amountBase} × ${rate.toLocaleString('ko-KR')}, 발행일 ${dateStr} 기준)`;
  if (source === 'manual_fallback') {
    return note + ' [환율 API 일시 장애 — 보수적 환율 적용]';
  }
  return note;
}

/**
 * 수동 환율 입력 (대표님이 admin에서 강제 갈아끼울 때)
 * — 단계 3에는 미구현, 단계 5의 admin UI에서 박을 예정
 */
export async function setManualRate(supabaseUrl, serviceKey, dateStr, rate, reason) {
  return saveSnapshot(
    supabaseUrl,
    serviceKey,
    dateStr,
    rate,
    'manual_fallback',
    { manual: true, reason, set_at: new Date().toISOString() }
  );
}

// 테스트/디버그용 export
export const _internals = {
  kstToday,
  toYmd,
  previousBusinessDay,
  fetchFromKoreaexim,
  buildDisplayNote,
  FALLBACK_RATE_USD_KRW,
  KOREAEXIM_BASE
};
