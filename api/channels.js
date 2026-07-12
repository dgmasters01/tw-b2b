// /api/channels.js
// 스튜디오 "채널" 메뉴의 데이터 창구 (D-064 · 채널 자산·규격 관리 마스터 1층).
//
// 채널 메뉴 = 채널 자체를 등록·설정·CID·규격 관리하는 마스터다.
// (성과표의 "채널별"은 성과 보기 / 이 API 는 채널 레지스트리 그 자체를 다룬다.)
//
// ── 부르는 법 ────────────────────────────────────────────────
// GET /api/channels
//   신분증 : 쿠키 sb-access-token (studio.html 로그인 세션) 또는 x-ops-token
//   권한   : is_editor 이상이면 조회. (조회는 열고, 편집은 admin 전용 — 후속)
//   나오는 것:
//     {
//       ok, me, is_admin,
//       channels: [
//         { code, name, name_en, language, platform, has_agoda_api,
//           agoda_site_id, is_active, display_order, notes,
//           cids: [ { cid, cid_label, is_active, notes } ] }
//       ]
//     }
//
// 왜 이렇게 하나:
//   channels · channel_cid_map 은 RLS 로 authenticated 조회만 열려 있다(02-channels.sql).
//   화면(anon)에서 직접 못 읽는다. 그래서 이 API 가 세션을 확인하고 service_role 로
//   읽어 채널별로 CID 를 묶어 내려준다. 권한 판정은 DB(is_editor/is_admin)가 한다.
//   화면이 보내는 말은 믿지 않는다 (publications.js 와 같은 원칙).

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 30 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

/** 브라우저는 쿠키(sb-access-token)를 들고 온다. middleware.js·publications.js 와 같은 쿠키다. */
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
  if (expected && (req.headers['x-ops-token'] || '') === expected) {
    return { ok: true, via: 'ops-token', isAdmin: true, email: null };
  }

  const token = accessToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON) return { ok: false };
  const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON, 'Content-Type': 'application/json' };

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_editor`, { method: 'POST', headers: H, body: '{}' });
    if (!r.ok || (await r.json()) !== true) return { ok: false };

    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: H });
    if (!u.ok) return { ok: false };
    const user = await u.json();

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

// 화면이 고칠 수 있는 채널 기본 정보. code(예약·CID 연결 열쇠)는 절대 못 바꾼다.
const EDITABLE = ['name', 'name_en', 'language', 'is_active', 'display_order'];

export default async function handler(req, res) {
  const who = await authorized(req);
  if (!who.ok) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });

  let sb;
  try {
    sb = admin();
  } catch (e) {
    return res.status(500).json({ ok: false, error: '서버 설정 오류', detail: String(e.message || e) });
  }

  // ── 채널 기본 정보 수정 (이름·순서·활성·언어) ──────────────────
  // 권한: owner/admin 만 (D-064). 두 겹 방어 = UI 버튼 미표시(에디터) + 여기 서버 게이트.
  if (req.method === 'PATCH') {
    if (!who.isAdmin) return res.status(403).json({ ok: false, error: '채널 수정은 관리자만 할 수 있습니다.' });

    let body;
    try { body = await readBody(req); }
    catch { return res.status(400).json({ ok: false, error: 'JSON 본문을 읽지 못했습니다.' }); }

    const code = String(body.code || '').trim();
    if (!code) return res.status(400).json({ ok: false, error: 'code(어느 채널인지)가 필요합니다.' });

    // 화이트리스트 필드만. code 는 예약·CID 연결 열쇠라 변경 금지(데이터 안 꼬이게).
    const patch = {};
    for (const k of EDITABLE) {
      if (body[k] === undefined) continue;
      if (k === 'is_active') patch[k] = !!body[k];
      else if (k === 'display_order') patch[k] = Number(body[k]);
      else patch[k] = body[k] == null ? null : String(body[k]).trim();
    }
    if (!Object.keys(patch).length) return res.status(400).json({ ok: false, error: '바꿀 내용이 없습니다.' });
    if ('name' in patch && !patch.name) return res.status(400).json({ ok: false, error: '채널 이름은 비울 수 없습니다.' });

    try {
      const { data, error } = await sb.from('channels').update(patch).eq('code', code).select().single();
      if (error) throw error;
      return res.status(200).json({ ok: true, channel: data });
    } catch (e) {
      return res.status(500).json({ ok: false, error: '채널을 수정하지 못했습니다.', detail: String(e.message || e) });
    }
  }

  // ── 새 채널 등록 · CID 추가/폐기/복구 (D-064 단계5) ──────────────
  // 권한: owner/admin 만. 두 겹 방어 = UI 버튼 미표시(에디터) + 여기 서버 게이트.
  // action 으로 갈래를 나눈다: create_channel / add_cid / retire_cid / restore_cid
  // CID 는 절대 하드삭제하지 않는다(헌법 9 가역성) — 폐기 = is_active=false.
  if (req.method === 'POST') {
    if (!who.isAdmin) return res.status(403).json({ ok: false, error: '채널·CID 등록은 관리자만 할 수 있습니다.' });

    let body;
    try { body = await readBody(req); }
    catch { return res.status(400).json({ ok: false, error: 'JSON 본문을 읽지 못했습니다.' }); }

    const action = String(body.action || '').trim();

    try {
      // ── ① 새 채널 등록 ─────────────────────────────────────────
      if (action === 'create_channel') {
        const code = String(body.code || '').trim();
        const name = String(body.name || '').trim();
        const language = String(body.language || '').trim();
        if (!code)     return res.status(400).json({ ok: false, error: '채널 코드(2~20자 영문·숫자)가 필요합니다.' });
        if (!/^[A-Za-z0-9_-]{2,20}$/.test(code))
          return res.status(400).json({ ok: false, error: '채널 코드는 영문·숫자·-_ 2~20자만 됩니다.' });
        if (!name)     return res.status(400).json({ ok: false, error: '채널 이름이 필요합니다.' });
        if (!language) return res.status(400).json({ ok: false, error: '언어(ko·ja·zh-tw 등)가 필요합니다.' });

        // 이미 있는 코드면 막는다(예약·CID 연결 열쇠라 덮어쓰기 위험).
        const { data: dup } = await sb.from('channels').select('code').eq('code', code).maybeSingle();
        if (dup) return res.status(409).json({ ok: false, error: '이미 있는 채널 코드입니다: ' + code });

        const row = {
          code,
          name,
          name_en: body.name_en ? String(body.name_en).trim() : null,
          language,
          platform: body.platform ? String(body.platform).trim() : 'youtube',
          has_agoda_api: !!body.has_agoda_api,
          agoda_site_id: body.agoda_site_id ? String(body.agoda_site_id).trim() : null,
          is_active: body.is_active === undefined ? true : !!body.is_active,
          display_order: body.display_order == null || body.display_order === '' ? 999 : Number(body.display_order),
        };
        const { data: ch, error: chErr } = await sb.from('channels').insert(row).select().single();
        if (chErr) throw chErr;

        // 첫 CID 를 같이 받으면 매핑도 만든다(선택).
        let firstCid = null;
        const cid0 = body.cid ? String(body.cid).trim() : '';
        if (cid0) {
          const cidRow = { channel_code: code, cid: cid0, cid_label: body.cid_label ? String(body.cid_label).trim() : 'main', is_active: true };
          const { data: cd, error: cErr } = await sb.from('channel_cid_map').insert(cidRow).select().single();
          if (cErr) throw cErr;
          firstCid = cd;
        }
        return res.status(200).json({ ok: true, channel: ch, cid: firstCid });
      }

      // ── ②③④ CID 추가/폐기/복구 (공통: 어느 채널·어느 CID) ──────────
      if (action === 'add_cid' || action === 'retire_cid' || action === 'restore_cid') {
        const channel_code = String(body.channel_code || body.code || '').trim();
        const cid = String(body.cid || '').trim();
        if (!channel_code) return res.status(400).json({ ok: false, error: '어느 채널인지(channel_code)가 필요합니다.' });
        if (!cid)          return res.status(400).json({ ok: false, error: 'CID 값이 필요합니다.' });

        // 채널이 실제로 있는지 먼저 확인(오타로 유령 매핑 방지).
        const { data: exists } = await sb.from('channels').select('code').eq('code', channel_code).maybeSingle();
        if (!exists) return res.status(404).json({ ok: false, error: '그런 채널이 없습니다: ' + channel_code });

        // 이 채널에 이 CID 가 이미 있나?
        const { data: cur } = await sb
          .from('channel_cid_map')
          .select('cid, channel_code, cid_label, is_active')
          .eq('channel_code', channel_code).eq('cid', cid).maybeSingle();

        if (action === 'add_cid') {
          const cid_label = body.cid_label ? String(body.cid_label).trim() : 'new';
          if (cur) {
            // 이미 있으면: 꺼져 있으면 다시 켜고 라벨 갱신, 켜져 있으면 알림.
            if (cur.is_active) return res.status(409).json({ ok: false, error: '이미 등록·운영 중인 CID 입니다.' });
            const { data, error } = await sb.from('channel_cid_map')
              .update({ is_active: true, cid_label }).eq('channel_code', channel_code).eq('cid', cid).select().single();
            if (error) throw error;
            return res.status(200).json({ ok: true, cid: data, revived: true });
          }
          const { data, error } = await sb.from('channel_cid_map')
            .insert({ channel_code, cid, cid_label, is_active: true }).select().single();
          if (error) throw error;
          return res.status(200).json({ ok: true, cid: data });
        }

        // 폐기·복구 = is_active 만 바꾼다(하드삭제 금지 — 과거 예약 집계 보존).
        if (!cur) return res.status(404).json({ ok: false, error: '그 채널에 그 CID 가 없습니다.' });
        const nextActive = action === 'restore_cid';
        const { data, error } = await sb.from('channel_cid_map')
          .update({ is_active: nextActive }).eq('channel_code', channel_code).eq('cid', cid).select().single();
        if (error) throw error;
        return res.status(200).json({ ok: true, cid: data });
      }

      return res.status(400).json({ ok: false, error: '알 수 없는 요청입니다(action).' });
    } catch (e) {
      return res.status(500).json({ ok: false, error: '처리하지 못했습니다.', detail: String(e.message || e) });
    }
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // 1) 채널 레지스트리 (표시 순서대로)
    const { data: channels, error: chErr } = await sb
      .from('channels')
      .select('code, name, name_en, language, platform, has_agoda_api, agoda_site_id, is_active, display_order, notes')
      .order('display_order', { ascending: true })
      .order('code', { ascending: true });
    if (chErr) throw chErr;

    // 2) CID 매핑 (채널별로 묶는다 — CID 는 아고다 예약↔채널 연결 키)
    const { data: cids, error: cidErr } = await sb
      .from('channel_cid_map')
      .select('cid, channel_code, cid_label, is_active')
      .order('channel_code', { ascending: true })
      .order('cid', { ascending: true });
    if (cidErr) throw cidErr;

    const byChannel = {};
    for (const c of cids || []) {
      (byChannel[c.channel_code] = byChannel[c.channel_code] || []).push({
        cid: c.cid, cid_label: c.cid_label, is_active: c.is_active,
      });
    }

    const out = (channels || []).map((ch) => ({ ...ch, cids: byChannel[ch.code] || [] }));

    return res.status(200).json({
      ok: true,
      me: who.email || null,
      is_admin: !!who.isAdmin,
      channels: out,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: '채널을 불러오지 못했습니다.', detail: String(e.message || e) });
  }
}
