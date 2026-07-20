// api/cron/kw-survey.js
// ─────────────────────────────────────────────────────────────
// 새벽 키워드 조사 봇 — 한 도시의 살아있는 검색어를 수요(트렌드)+경쟁(유튜브)으로 재서 조사 표에 저장.
//   자동: Vercel Cron 새벽(UTC 16~20 = KST 01~05). Authorization: Bearer <CRON_SECRET>.
//   수동/검증: x-ops-token. ?city=cc:japan|osaka&target=ko&market=KR / ?dry_run=1 / ?limit=N
//
// 왜 이렇게 (서버리스 이어하기):
//   58개 = 8분 넘는다 → 한 회차에 다 못 잰다. 그래서 회차당 limit 개만 재고 즉시 저장하고 나간다.
//   "공책" = trend 표. 다음 회차는 아직 trend 행 없는(=안 잰) 검색어부터 이어간다.
//   앵커 잣대는 snapshot.anchor_value 에 박아, 회차가 갈려도 같은 잣대로 이어붙는다(⑪).
//
// 저장 계약(content-keywords survey 가 읽는 모양):
//   snapshot(target×market×city×ym) 1행 · keyword(검색어) · trend(snapshot_id+keyword_id → demand·competition·opportunity·series·도장)
//   🔴 발굴(harvest=새 검색어 생성)은 아직 이 봇에 없다. 지금은 keyword 표에 이미 있는 살아있는 검색어만 잰다.
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import { measureTrends, TREND_FROM, DEMAND_SOURCE } from '../_lib/trends.js';
import { fetchCompetition, opportunityFromDemand, COMP_METHOD, COMP_WINDOW_DAYS } from '../_lib/youtube-competition.js';

export const config = { maxDuration: 300 };

const PER_RUN = 15;   // 한 회차에 재는 검색어 수 (앵커 포함) — 회차당 ~4분 안에 끝나게

async function authOK(req) {
  const h = req.headers || {};
  const cron = process.env.CRON_SECRET, ops = process.env.CLAUDE_OPS_TOKEN;
  if (cron && (h['authorization'] || '') === 'Bearer ' + cron) return true;
  if (ops && (h['x-ops-token'] || '') === ops) return true;
  // 브라우저 세션(is_editor 이상)도 허용 — "지금 조사하기"가 측정을 직접 부른다(이중 함수 호출 제거).
  const SUPA = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  let token = null;
  const auth = h['authorization'] || '';
  if (auth.startsWith('Bearer ')) token = auth.slice(7);
  if (!token) { const raw = h['cookie'] || ''; for (const part of raw.split(';')) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i).trim() === 'sb-access-token') { token = decodeURIComponent(part.slice(i + 1).trim()); break; } } }
  if (token && SUPA && ANON) {
    try {
      const r = await fetch(`${SUPA}/rest/v1/rpc/is_editor`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, apikey: ANON, 'Content-Type': 'application/json' }, body: '{}' });
      if (r.ok && (await r.json()) === true) return true;
    } catch { /* 무시 */ }
  }
  return false;
}
function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}
function ymKst() { return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7); }

export default async function handler(req, res) {
  if (!(await authOK(req))) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const dry = req.query.dry_run === '1' || req.query.dry_run === 'true';
  let cityKey = req.query.city ? String(req.query.city) : null;
  const target = String(req.query.target || 'ko');
  const market = String(req.query.market || 'KR');
  const limit = Math.min(Math.max(parseInt(req.query.limit || PER_RUN, 10) || PER_RUN, 1), 25);
  const ym = String(req.query.ym || ymKst());

  let sb;
  try { sb = admin(); } catch (e) { return res.status(500).json({ ok: false, error: String(e.message || e) }); }

  // 도시 명시 안 하면(=크론 자동): 살아있는 검색어가 있는 도시 중 이번 달 조사가 안 끝난 첫 도시.
  //   전부 완료(예: 오사카 done)면 아무것도 안 한다 — 완료된 실데이터 안 건드린다.
  if (!cityKey) {
    const { data: ck } = await sb.from('keyword').select('city_key')
      .eq('target_code', target).eq('market', market).eq('alive', true);
    const uniq = [...new Set((ck || []).map((c) => c.city_key))];
    for (const c of uniq) {
      const { data: s } = await sb.from('snapshot').select('id, status')
        .eq('target_code', target).eq('market', market).eq('city_key', c).eq('ym', ym).maybeSingle();
      if (!s || s.status !== 'done') { cityKey = c; break; }
    }
    if (!cityKey) return res.status(200).json({ ok: true, idle: true, ym, note: '이번 달 조사할 도시 없음 (전부 완료). 새 도시는 발굴 후 합류.' });
  }
  // 살아있는 검색어 (앵커 먼저)
  const { data: kws, error: kErr } = await sb.from('keyword')
    .select('id, text, is_anchor, alive')
    .eq('target_code', target).eq('market', market).eq('city_key', cityKey).eq('alive', true);
  if (kErr) return res.status(500).json({ ok: false, error: kErr.message });
  if (!kws || !kws.length) return res.status(200).json({ ok: false, error: 'no_keywords', note: `${cityKey} 에 살아있는 검색어가 없습니다. (발굴 먼저 필요)` });
  const anchorKw = kws.find((k) => k.is_anchor) || kws[0];

  // 이 도시·달의 스냅샷 (없으면 새로 · 있으면 이어감)
  let { data: snap } = await sb.from('snapshot').select('*')
    .eq('target_code', target).eq('market', market).eq('city_key', cityKey).eq('ym', ym).maybeSingle();

  // 이미 이 스냅샷에서 잰 검색어 (공책)
  let measuredIds = new Set();
  if (snap) {
    const { data: tr } = await sb.from('trend').select('keyword_id').eq('snapshot_id', snap.id);
    measuredIds = new Set((tr || []).map((t) => t.keyword_id));
  }
  const pending = kws.filter((k) => !measuredIds.has(k.id));
  // 앵커는 항상 함께 재야 잣대가 선다
  const anchorPending = !measuredIds.has(anchorKw.id);
  const todo = pending.filter((k) => k.id !== anchorKw.id).slice(0, limit - (anchorPending ? 1 : 0));
  const batchKws = (anchorPending ? [anchorKw] : []).concat(todo);

  if (dry) {
    return res.status(200).json({
      ok: true, dry_run: true, city: cityKey, ym,
      alive_keywords: kws.length, already_measured: measuredIds.size, pending: pending.length,
      this_run: batchKws.map((k) => k.text), anchor: anchorKw.text, snapshot_exists: !!snap,
    });
  }
  if (!batchKws.length) {
    // 다 쟀으면 스냅샷 마감
    if (snap && snap.status !== 'done') {
      await sb.from('snapshot').update({ status: 'done', finished_at: new Date().toISOString(), keyword_count: kws.length }).eq('id', snap.id);
    }
    return res.status(200).json({ ok: true, city: cityKey, ym, done: true, measured: measuredIds.size, note: '이 도시·달은 조사 완료' });
  }

  // 스냅샷 없으면 생성 (running)
  if (!snap) {
    const country = cityKey.replace(/^cc:/, '').split('|')[0];
    const { data: made, error: sErr } = await sb.from('snapshot').insert({
      target_code: target, market, country, city_key: cityKey, ym, status: 'running',
      anchor_text: anchorKw.text, window_from: TREND_FROM, window_to: new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10),
      trigger: (req.headers['x-ops-token'] ? 'manual' : 'cron'), started_at: new Date().toISOString(),
    }).select().single();
    if (sErr) return res.status(500).json({ ok: false, error: 'snapshot_create: ' + sErr.message });
    snap = made;
  }

  // 앵커 잣대: 이미 스냅샷에 있으면 seed 로 넘겨 같은 잣대 유지
  let seedRows = null;
  if (!anchorPending && snap.anchor_value != null) {
    seedRows = [{ keyword: anchorKw.text, demand: parseFloat(snap.anchor_value), measured: true }];
  }

  // ── 측정: 수요(트렌드) ──
  let demandRows;
  try {
    demandRows = await measureTrends(batchKws.map((k) => k.text), { anchor: anchorKw.text, geo: market, hl: target, seedRows });
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'trends: ' + String(e.message || e), city: cityKey });
  }
  // ── 측정: 경쟁(유튜브) ──
  const comp = await fetchCompetition(batchKws.map((k) => k.text), { region: market, lang: target });
  const compErr = comp._error || null;

  // ── 저장: trend 행 upsert (snapshot_id + keyword_id) ──
  const idByText = new Map(batchKws.map((k) => [k.text, k.id]));
  const now = new Date().toISOString();
  let saved = 0;
  const sample = [];
  for (const r of demandRows) {
    const kid = idByText.get(r.keyword);
    if (!kid) continue;                       // seed 로 넣은 앵커(이미 저장됨)는 건너뜀
    const c = comp[r.keyword] ? comp[r.keyword].competition : null;
    const opp = opportunityFromDemand(r.demand, c);
    const row = {
      snapshot_id: snap.id, keyword_id: kid,
      measured: r.measured, demand: r.demand, series: r.series,
      competition: c, opportunity: opp,
      batch_no: r.batch_no, calib_ratio: r.calib_ratio, skip_reason: r.skip_reason,
      comp_method: c != null ? COMP_METHOD : null, comp_window_days: c != null ? COMP_WINDOW_DAYS : null,
      demand_source: DEMAND_SOURCE, measured_at: now,
    };
    const { error: uErr } = await sb.from('trend').upsert(row, { onConflict: 'snapshot_id,keyword_id' });
    if (!uErr) { saved++; if (sample.length < 6) sample.push({ kw: r.keyword, demand: r.demand, comp: c, opp }); }
  }

  // 앵커 잣대 처음 쟀으면 스냅샷에 박는다
  if (anchorPending) {
    const a = demandRows.find((r) => r.keyword === anchorKw.text);
    if (a && a.demand != null) await sb.from('snapshot').update({ anchor_value: a.demand }).eq('id', snap.id);
  }
  // 진행 갱신
  const totalMeasured = measuredIds.size + saved;
  const allDone = totalMeasured >= kws.length;
  await sb.from('snapshot').update({
    keyword_count: kws.length, trend_calls: (snap.trend_calls || 0) + 1,
    status: allDone ? 'done' : 'running', ...(allDone ? { finished_at: now } : {}),
  }).eq('id', snap.id);

  return res.status(200).json({
    ok: true, city: cityKey, ym, snapshot_id: snap.id,
    measured_this_run: saved, total_measured: totalMeasured, alive_keywords: kws.length,
    done: allDone, comp_error: compErr, comp_units: comp._units || 0, sample, at: now,
  });
}
