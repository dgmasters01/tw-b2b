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
  if (expected && (req.headers['x-ops-token'] || '') === expected) return { ok: true, via: 'ops-token', isAdmin: true };

  const token = accessToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON) return { ok: false };
  const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON, 'Content-Type': 'application/json' };

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_editor`, { method: 'POST', headers: H, body: '{}' });
    if (!r.ok || (await r.json()) !== true) return { ok: false };

    // 누가 했는지 남기려면 신원을 알아야 한다. 화면이 보내는 이름은 믿지 않는다.
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: H });
    if (!u.ok) return { ok: false };
    const user = await u.json();

    // 관리자면 studio 에서 admin 으로 가는 버튼을 보여준다. editor 에게는 안 보인다.
    let isAdmin = false;
    try {
      const a = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, { method: 'POST', headers: H, body: '{}' });
      isAdmin = a.ok && (await a.json()) === true;
    } catch { /* 못 물어보면 안 보여준다 */ }

    return { ok: true, via: 'session', userId: user.id, email: user.email, isAdmin };
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
    return res.status(200).json({ ok: true, rows: data, count: data.length, me: auth.email || null, is_admin: !!auth.isAdmin });
  }

  // studio.html 이 부른다. 세 가지 행동.
  //   claim   — "제가 맡습니다"        (다른 에디터가 중복 작업하지 않게)
  //   unclaim — "안 하겠습니다"
  //   publish — 유튜브 주소를 넣고 발행
  if (req.method === 'PATCH') {
    let b;
    try { b = await readBody(req); } catch { return res.status(400).json({ ok: false, error: 'JSON 본문을 읽지 못했습니다.' }); }
    const { id, action = 'publish', youtube_url } = b;
    if (!id) return res.status(400).json({ ok: false, error: 'id 가 필요합니다.' });

    const me = auth.userId || null;
    const myMail = auth.email || 'ops-token';

    if (action === 'claim' || action === 'unclaim') {
      const claim = action === 'claim';
      const { data: cur } = await sb.from('publications').select('claimed_by, claimed_by_email, status').eq('id', id).maybeSingle();
      if (!cur) return res.status(404).json({ ok: false, error: '없는 원고입니다.' });
      if (cur.status === 'published') return res.status(409).json({ ok: false, error: '이미 발행된 원고입니다.' });
      if (claim && cur.claimed_by && cur.claimed_by !== me) {
        return res.status(409).json({ ok: false, error: `${cur.claimed_by_email} 님이 이미 맡고 있습니다.` });
      }
      if (!claim && cur.claimed_by && cur.claimed_by !== me) {
        return res.status(403).json({ ok: false, error: '맡은 사람만 놓을 수 있습니다.' });
      }
      const { data, error } = await sb.from('publications').update({
        claimed_by: claim ? me : null,
        claimed_by_email: claim ? myMail : null,
        claimed_at: claim ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('id', id).select().single();
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, row: data });
    }

    // 담당자 지정·재배정 = 대표님(owner)+관리자(admin) 전용 (설계 §8).
    //   미지정 원고 배정 + 이미 맡은 것 뺏어서 재배정. assignee_email='' 이면 미지정으로 되돌림.
    if (action === 'assign') {
      if (!auth.isAdmin) return res.status(403).json({ ok: false, error: '담당자 지정·재배정은 대표님·관리자만 할 수 있습니다.' });
      const { data: cur } = await sb.from('publications').select('status').eq('id', id).maybeSingle();
      if (!cur) return res.status(404).json({ ok: false, error: '없는 원고입니다.' });
      if (cur.status === 'published') return res.status(409).json({ ok: false, error: '이미 발행된 원고입니다.' });
      const email = (b.assignee_email || '').trim().toLowerCase();
      let patch;
      if (!email) {
        patch = { claimed_by: null, claimed_by_email: null, claimed_at: null, updated_at: new Date().toISOString() };
      } else {
        let uid = null;
        try {
          const { data: list } = await sb.auth.admin.listUsers();
          const found = ((list && list.users) || []).find(function (u) { return (u.email || '').toLowerCase() === email; });
          uid = found ? found.id : null;
        } catch (e) { /* 조회 실패 시 이메일만 저장 (화면·필터는 이메일 기준) */ }
        patch = { claimed_by: uid, claimed_by_email: email, claimed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      }
      const { data, error } = await sb.from('publications').update(patch).eq('id', id).select().single();
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, row: data });
    }

    // 아고다 파트너 링크 3개 붙여넣기 → 원고 다시 만들어 장부 갱신
    if (action === 'links') {
      const { links_text } = b;
      if (!links_text) return res.status(400).json({ ok: false, error: '링크를 붙여넣어 주세요.' });

      const found = String(links_text).match(/https?:\/\/[^\s\]<>"']*partnersearch[^\s\]<>"']*/g) || [];
      const hids = found.map((u) => (u.match(/[?&]hid=(\d+)/) || [])[1]).filter(Boolean);
      const cids = [...new Set(found.map((u) => (u.match(/[?&]cid=(\d+)/) || [])[1]).filter(Boolean))];
      if (hids.length < 3) return res.status(400).json({ ok: false, error: `아고다 파트너 링크 3개가 필요합니다. ${hids.length}개만 찾았습니다.` });

      const { data: cur } = await sb.from('publications').select('*').eq('id', id).maybeSingle();
      if (!cur) return res.status(404).json({ ok: false, error: '없는 원고입니다.' });
      if (cur.status === 'published') return res.status(409).json({ ok: false, error: '이미 발행된 원고입니다.' });

      const warn = [];
      if (cids.length > 1) warn.push(`링크 3개의 cid 가 서로 다릅니다: ${cids.join(', ')}`);
      const { data: map } = await sb.from('channel_cid_map').select('channel_code').eq('cid', cids[0]).maybeSingle();
      if (!map) warn.push(`cid ${cids[0]} 를 모릅니다. 수수료가 안 잡힙니다.`);
      else if (map.channel_code !== cur.channel_code) {
        return res.status(400).json({ ok: false, error: `cid ${cids[0]} 는 ${map.channel_code} 채널 것입니다. 이 원고는 ${cur.channel_code} 입니다.` });
      }

      const { data, error } = await sb.from('publications').update({
        hid_top1: hids[0], hid_top2: hids[1], hid_top3: hids[2],
        agoda_links: found.slice(0, 3), updated_at: new Date().toISOString(),
      }).eq('id', id).select().single();
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, row: data, warnings: warn, note: '설명란을 다시 만들려면 원고를 다시 넣어주세요.' });
    }

    if (!youtube_url) return res.status(400).json({ ok: false, error: 'youtube_url 이 필요합니다.' });
    const m = String(youtube_url).match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/);
    if (!m) return res.status(400).json({ ok: false, error: '유튜브 주소가 아닙니다.' });
    const vid = m[1];

    const { data: dup } = await sb.from('publications').select('id').eq('youtube_video_id', vid).neq('id', id);
    if (dup && dup.length) return res.status(409).json({ ok: false, error: '이 영상은 이미 다른 원고에 등록돼 있습니다.' });

    const { data, error } = await sb.from('publications').update({
      youtube_url, youtube_video_id: vid, status: 'published',
      published_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      published_by: me, published_by_email: myMail,
    }).eq('id', id).eq('status', 'draft').select().maybeSingle();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!data) return res.status(409).json({ ok: false, error: '이미 발행됐거나 없는 원고입니다.' });
    return res.status(200).json({ ok: true, row: data });
  }

  // 중복 삭제 = 대표님(owner/admin) 전용 (설계 §5). editor 는 못 지운다.
  if (req.method === 'DELETE') {
    if (!auth.isAdmin) return res.status(403).json({ ok: false, error: '삭제는 대표님만 할 수 있습니다.' });
    let dbody = {};
    try { dbody = await readBody(req); } catch { /* 쿼리로도 받는다 */ }
    const id = dbody.id || req.query?.id;
    if (!id) return res.status(400).json({ ok: false, error: 'id 가 필요합니다.' });
    // 안전장치: 발행된 원고는 삭제 금지(유튜브에 이미 올라감).
    const { data: cur } = await sb.from('publications').select('status').eq('id', id).maybeSingle();
    if (cur?.status === 'published') return res.status(409).json({ ok: false, error: '발행된 원고는 삭제할 수 없습니다.' });
    const { error } = await sb.from('publications').delete().eq('id', id);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, deleted: id });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
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
    // 같은 원고를 다시 넣을 때, 전에 붙여둔 아고다 링크를 이어서 쓴다.
    if (!body.links && body.filename) {
      const { data: prev } = await sb.from('publications')
        .select('agoda_links').eq('source_filename', body.filename).maybeSingle();
      if (prev?.agoda_links?.length === 3) {
        body.links = { top1: prev.agoda_links[0], top2: prev.agoda_links[1], top3: prev.agoda_links[2] };
      }
    }
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
    .select('id, status, city, region, source, uploaded_by_email, created_at')
    .eq('source_filename', row.source_filename)
    .eq('is_duplicate', false)   // 원본 1건만 비교 대상. 이미 만든 중복끼리는 또 안 막는다.
    .maybeSingle();

  if (exist?.status === 'published') {
    return res.status(409).json({
      ok: false, error: '이미 발행된 원고입니다. 장부를 덮어쓰지 않았습니다.',
      id: exist.id,
    });
  }

  // 수동 중복 방지 (설계 §5): 같은 파일명이 이미 있으면 조용히 덮어쓰지 않고 화면에 물어본다.
  // force 없음 → 경고만 돌려줌 / force='overwrite' → 다시 읽어 덮어씀 / force='duplicate' → 중복으로 새로 추가.
  const force = body && body.force;
  if (exist && force !== 'overwrite' && force !== 'duplicate') {
    return res.status(409).json({
      ok: false, duplicate: true,
      error: '이미 등록된 원고입니다.',
      existing: {
        id: exist.id,
        place: [exist.city, exist.region].filter(Boolean).join(' '),
        source: exist.source, uploaded_by_email: exist.uploaded_by_email,
        created_at: exist.created_at,
      },
    });
  }

  let action; let saved;
  if (exist && force === 'overwrite') {
    // 다시 읽기(덮어쓰기): 원본을 새 파싱으로 갱신. 출처/올린이는 원본 유지(안 건드림).
    const { data, error } = await sb.from('publications').update(row).eq('id', exist.id).select().single();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    action = 'updated'; saved = data;
  } else {
    // 신규 또는 [그래도 추가](중복 생성). 중복이면 is_duplicate=true 로 남겨 화면에 딱지+대표님 삭제.
    row.created_by = 'api/publications';
    row.source = (body && body.source === 'drive') ? 'drive' : 'manual';
    row.uploaded_by_email = auth.email || null;
    row.is_duplicate = (exist && force === 'duplicate') ? true : false;
    const { data, error } = await sb.from('publications').insert(row).select().single();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    action = row.is_duplicate ? 'duplicated' : 'created'; saved = data;
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
