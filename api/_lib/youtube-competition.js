// api/_lib/youtube-competition.js
// ─────────────────────────────────────────────────────────────
// 경쟁 = 유튜브 search.list 최근 1년 창의 totalResults (㊺ · COMP_METHOD=api_search_list).
//   비용: 100 units/키워드. 하루 10,000 무료 = 100개. 넘으면 403 quotaExceeded(막힐 뿐 청구 없음).
//   yt-probe.js mode=count 와 같은 방식 — 부품으로 뽑아 새벽 봇·프로브가 공유.
//   진짜 기회점수(D-065 ① · ㊶-6-1) = 트렌드 수요 ÷ log10(경쟁). 수요 없으면 None(INC-006 경쟁 단독 금지).
// ─────────────────────────────────────────────────────────────
import { ytKey } from './youtube-stats.js';

const API = 'https://www.googleapis.com/youtube/v3/search';
export const COMP_METHOD = 'api_search_list';
export const COMP_WINDOW_DAYS = 365;

function windowFrom(days) {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
}

// keywords → { <키워드>: {competition, error}, _units, _window_days, _method }
export async function fetchCompetition(keywords, opts = {}) {
  const { days = COMP_WINDOW_DAYS, region = 'KR', lang = 'ko' } = opts;
  const key = ytKey();
  const out = {};
  if (!key) { out._error = 'no_key'; return out; }
  const from = windowFrom(days);
  let used = 0, blocked = null;
  for (const q of keywords) {
    if (blocked) { out[q] = { competition: null, error: blocked }; continue; }
    const p = new URLSearchParams({
      part: 'id', type: 'video', maxResults: '1',
      q, key, regionCode: region, relevanceLanguage: lang, publishedAfter: from,
    });
    let j;
    try { const r = await fetch(`${API}?${p.toString()}`); j = await r.json(); }
    catch (e) { out[q] = { competition: null, error: 'fetch_failed' }; continue; }
    used++;
    if (j && j.error) {
      const reason = (j.error.errors && j.error.errors[0] && j.error.errors[0].reason) || j.error.message || 'api_error';
      out[q] = { competition: null, error: reason };
      if (String(reason).toLowerCase().includes('quota')) blocked = 'quotaExceeded';
      continue;
    }
    out[q] = { competition: (j.pageInfo && j.pageInfo.totalResults != null) ? j.pageInfo.totalResults : null, error: null };
  }
  out._units = used * 100;
  out._window_days = days;
  out._method = COMP_METHOD;
  return out;
}

// 진짜 기회점수 = 수요 ÷ log10(경쟁). 수요 안 쟀으면 None (경쟁만 보고 초록불 금지).
export function opportunityFromDemand(demand, comp) {
  if (demand == null || !comp || comp <= 0) return null;
  return Math.round((demand / Math.log10(Math.max(comp, 10))) * 100) / 100;
}
