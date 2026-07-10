// /api/publications.js
// api/youtube.js 가 만든 업로드 패키지를 publications 장부에 넣는다.
//
// studio.html 은 이 장부만 읽는다. API 를 다시 부르지 않는다.
// 원고가 바뀌지 않는 한 같은 결과를 두 번 만들 이유가 없다.
//
// ── 부르는 법 ────────────────────────────────────────────────
// POST /api/publications
//   헤더 : x-ops-token: <CLAUDE_OPS_TOKEN>
//   본문 : { "filename": "...docx", "docxBase64": "...", "links": {...}, "extras": {...} }
//        → 내부에서 /api/youtube 를 호출해 패키지를 만들고 장부에 upsert 한다.
//
//   또는 이미 만든 패키지를 그대로 넣을 때:
//        { "package": { ...api/youtube.js 응답... } }
//
// ── 나오는 것 ────────────────────────────────────────────────
//   { ok, action: 'created'|'updated', row, warnings[] }
//
// GET /api/publications?channel=HT&status=draft  → 장부 조회 (관리자 확인용)
//
// 규칙: source_filename 이 같으면 덮어쓴다. 같은 원고를 두 번 넣어도 줄이 안 늘어난다.
//       단 이미 published 인 줄은 건드리지 않는다 (유튜브에 이미 올라갔다).

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

/** 브라우저는 쿠키(sb-access-token)를 들고 온다. middleware.js 와 같은 쿠키다. */
function accessToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const raw = req.headers['cookie'] || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === 'sb-access-token') return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/**
 * 두 갈래로 연다.
 *   ① x-ops-token  — Claude / 스크립트
 *   ② 로그인 세션  — studio.html 의 에디터 (is_editor RPC 로 확인)
 * 에디터 판정은 DB 가 한다. 화면 말을 믿지 않는다.
 */
async function authorized(req) {
  const expected = process.env.CLAUDE_OPS_TOKEN;
  if (expected && (req.headers['x-ops-token'] || '') === expected) return { ok: true, via: 'ops-token' };

  const token = accessToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON) return { ok: false };

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_editor`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!r.ok) return { ok: false };
    return (await r.json()) === true ? { ok: true, via: 'session' } : { ok: false };
  } catch {
    return { ok: false };
  }
}

function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

/** 패키지 → publications 한 줄. 지어내는 값 없음. render 가 만든 publicationRow 를 그대로 쓴다. */
function toRow(pkg) {
  const r = pkg.publicationRow;
  if (!r) throw new Error('publicationRow 가 없습니다. api/youtube.js 응답이 아닙니다.');
  return { ...r, warnings: pkg.warnings || null, updated_at: new Date().toISOString() };
}

export default async function handler(req, res) {
  const auth = await authorized(req);
  if (!auth.ok) return res.status(401).json({ ok: false, error: '권한이 없습니다. 로그인했는지 확인해 주세요.' });

  let sb;
  try {
    sb = admin();
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }

  if (req.method === 'GET') {
    let qb = sb.from('publications').select('*').order('created_at', { ascending: false });
    if (req.query?.channel) qb = qb.eq('channel_code', req.query.channel);
    if (req.query?.status) qb = qb.eq('status', req.query.status);
    const { data, error } = await qb;
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, rows: data, count: data.length });
  }

  // 발행 — studio.html 이 유튜브 주소를 넣을 때
  if (req.method === 'PATCH') {
    let b;
    try { b = await readBody(req); } catch { return res.status(400).json({ ok: false, error: 'JSON 본문을 읽지 못했습니다.' }); }
    const { id, youtube_url } = b;
    if (!id || !youtube_url) return res.status(400).json({ ok: false, error: 'id 와 youtube_url 이 필요합니다.' });

    const m = String(youtube_url).match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/);
    if (!m) return res.status(400).json({ ok: false, error: '유튜브 주소가 아닙니다.' });
    const vid = m[1];

    const { data: dup } = await sb.from('publications').select('id').eq('youtube_video_id', vid).neq('id', id);
    if (dup && dup.length) return res.status(409).json({ ok: false, error: '이 영상은 이미 다른 원고에 등록돼 있습니다.' });

    const { data, error } = await sb.from('publications').update({
      youtube_url, youtube_video_id: vid, status: 'published',
      published_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', id).eq('status', 'draft').select().maybeSingle();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!data) return res.status(409).json({ ok: false, error: '이미 발행됐거나 없는 원고입니다.' });
    return res.status(200).json({ ok: true, row: data });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ ok: false, error: 'JSON 본문을 읽지 못했습니다.' });
  }

  // 패키지를 직접 받거나, 원고를 받아 /api/youtube 로 만든다
  let pkg = body.package;
  if (!pkg) {
    const base = process.env.OPS_BASE_URL || 'https://gohotelwinners.com';
    const r = await fetch(`${base}/api/youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-ops-token': process.env.CLAUDE_OPS_TOKEN || '' },
      body: JSON.stringify(body),
    });
    pkg = await r.json();
    if (!r.ok || !pkg.ok) return res.status(502).json({ ok: false, error: 'api/youtube 실패', detail: pkg });
  }

  let row;
  try {
    row = toRow(pkg);
  } catch (e) {
    return res.status(400).json({ ok: false, error: String(e.message || e) });
  }
  if (!row.source_filename) return res.status(400).json({ ok: false, error: 'source_filename 이 없습니다. 원고 파일명이 장부의 키입니다.' });
  if (!row.channel_code) return res.status(400).json({ ok: false, error: 'channel_code 를 알 수 없습니다.' });

  // 이미 발행된 줄은 건드리지 않는다. 유튜브에 이미 올라갔다.
  const { data: exist } = await sb.from('publications')
    .select('id, status').eq('source_filename', row.source_filename).maybeSingle();

  if (exist?.status === 'published') {
    return res.status(409).json({
      ok: false, error: '이미 발행된 원고입니다. 장부를 덮어쓰지 않았습니다.',
      id: exist.id,
    });
  }

  let action; let saved;
  if (exist) {
    const { data, error } = await sb.from('publications').update(row).eq('id', exist.id).select().single();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    action = 'updated'; saved = data;
  } else {
    row.created_by = 'api/publications';
    const { data, error } = await sb.from('publications').insert(row).select().single();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    action = 'created'; saved = data;
  }

  const warnings = [...(pkg.warnings || [])];
  if (!row.hid_top1 || !row.hid_top2 || !row.hid_top3) {
    warnings.push('아고다 링크에서 hid 를 다 못 뽑았습니다. 원고의 링크를 확인해 주세요.');
  }
  if (row.cid && row.channel_code) {
    const { data: map } = await sb.from('channel_cid_map').select('channel_code').eq('cid', row.cid).maybeSingle();
    if (!map) warnings.push(`cid ${row.cid} 가 channel_cid_map 에 없습니다. 예약이 이 채널로 안 잡힙니다.`);
    else if (map.channel_code !== row.channel_code) {
      warnings.push(`cid ${row.cid} 는 ${map.channel_code} 채널 것입니다. 원고는 ${row.channel_code} 입니다. 수수료가 다른 채널로 갑니다.`);
    }
  }

  return res.status(200).json({ ok: true, action, id: saved.id, row: saved, warnings });
}
