// api/_lib/api-cache.js
// ─────────────────────────────────────────────────────────────
// 스튜디오 페이지 로딩 속도용 공용 캐시. 계산·조회 결과를 api_cache 표에 저장해두고
// 다음 조회는 즉시 준다. **쓰기(POST/PATCH/DELETE)가 나면 그 자원의 캐시를 지워** 항상 최신을 지킨다.
//   cacheGet(sb, key, ttlMs)   → 신선하면 payload, 아니면 null
//   cacheSet(sb, key, payload) → 저장
//   cacheBust(sb, prefix)      → prefix 로 시작하는 캐시 전부 삭제(쓰기 후 호출)
// 캐시가 실패해도 절대 응답을 막지 않는다(try/catch 로 삼킨다).
// ─────────────────────────────────────────────────────────────

export async function cacheGet(sb, key, ttlMs = 300000) {
  try {
    const { data } = await sb.from('api_cache').select('payload, computed_at').eq('cache_key', key).maybeSingle();
    if (data && data.payload && (Date.now() - new Date(data.computed_at).getTime() < ttlMs)) return data.payload;
  } catch { /* 캐시 없거나 오류 → 계산 */ }
  return null;
}

export async function cacheSet(sb, key, payload) {
  try {
    await sb.from('api_cache').upsert(
      { cache_key: key, payload, computed_at: new Date().toISOString() },
      { onConflict: 'cache_key' },
    );
  } catch { /* 저장 실패해도 응답은 준다 */ }
}

export async function cacheBust(sb, ...prefixes) {
  for (const p of prefixes) {
    try { await sb.from('api_cache').delete().like('cache_key', p + '%'); } catch { /* 무시 */ }
  }
}
