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
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';

export const config = { maxDuration: 30 };

// 규격(.md)은 _content/youtube/{채널명}.md 파일. loadRules 와 같은 위치를 본다.
const SPEC_ROOTS = [join(process.cwd(), '_content', 'youtube'), join(process.cwd(), '..', '_content', 'youtube')];
async function specPathOf(name) {
  for (const root of SPEC_ROOTS) {
    const p = join(root, `${name}.md`);
    try { await access(p); return p; } catch { /* 없음 */ }
  }
  return null;
}
async function readSpecOf(name) {
  const p = await specPathOf(name);
  if (!p) return null;
  try { return await readFile(p, 'utf8'); } catch { return null; }
}

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
const EDITABLE = ['name', 'name_en', 'language', 'market', 'is_active', 'display_order'];

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

      // ── ①-b 규격 .md 업로드로 새 채널 등록 (D-064 정정) ──────────
      // 코드(예약 연결 열쇠·불변)만 사람이 확인 입력, 이름·언어·아고다 CID 는 규격 md §0 에서 자동으로 읽는다.
      // dry_run=true 이면 실제 등록 없이 파싱 결과만 돌려준다(미리보기). 파싱 규칙은 이 서버 한 곳이 진실이다.
      if (action === 'register_from_md') {
        const md   = String(body.md || '');
        const dryRun = !!body.dry_run;
        if (!md.trim()) return res.status(400).json({ ok: false, error: '규격 .md 파일 내용이 비어 있습니다.' });

        // 규격 md §0 채널 정보 파싱
        const parseChannelMd = (t) => {
          let name = null, language = null, cid = null, market = null, mdcode = null;
          let m = t.match(/\|\s*코드\s*\|\s*([A-Za-z0-9_-]{2,20})\s*\|/);       // "| 코드 | TH |" (§0에 코드)
          if (m) mdcode = m[1].trim();
          m = t.match(/적용\s*채널\s*[:：]\s*([^\(（\n]+?)\s*[\(（]/);      // "적용 채널: 호텔이야 (...)"
          if (m) name = m[1].trim();
          if (!name) { m = t.match(/^#\s*([^·|\n]+?)\s*[·|]/m); if (m) name = m[1].trim(); }  // "# 호텔이야 · ..."
          const langMap = { '한국어':'ko','일본어':'ja','日本語':'ja','중국어(번체)':'zh-tw','번체':'zh-tw','중국어(간체)':'zh-cn','간체':'zh-cn','베트남어':'vi','영어':'en','english':'en' };
          const normLang = (v) => { v = String(v || '').trim(); return langMap[v] || langMap[v.toLowerCase()] || (/^[a-z]{2}(-[a-z]{2})?$/i.test(v) ? v.toLowerCase() : (v || null)); };
          // 시장(market) = 조사(구글 트렌드 geo)에 쓰는 국가코드. §0 "| 시장 | KR |" 또는 "| 시장권 | 한국 |".
          const mktMap = { '한국':'KR','대한민국':'KR','일본':'JP','대만':'TW','타이완':'TW','홍콩':'HK','중국':'CN','베트남':'VN','미국':'US','영어권':'US','태국':'TH','싱가포르':'SG','말레이시아':'MY','인도네시아':'ID','필리핀':'PH' };
          const langToMkt = { 'ko':'KR','ja':'JP','zh-tw':'TW','zh-cn':'CN','vi':'VN','en':'US' };
          const normMkt = (v) => { v = String(v || '').trim(); if (!v) return null; if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase(); return mktMap[v] || null; };
          m = t.match(/\|\s*언어\s*\|\s*([^\|\n]+?)\s*\|/);                    // ① 표 "| 언어 | 한국어 |"
          if (m) language = normLang(m[1]);
          if (!language) {                                                     // ② "적용 채널: X (한국어 · …)" 괄호 안
            m = t.match(/적용\s*채널\s*[:：]\s*[^\(（\n]+[\(（]\s*([^·・|)）\n]+)/);
            if (m) language = normLang(m[1]);
          }
          m = t.match(/\|\s*시장권?\s*\|\s*([^\|\n]+?)\s*\|/);                 // "| 시장 | KR |" / "| 시장권 | 한국 |"
          if (m) market = normMkt(m[1]);
          if (!market && language) market = langToMkt[language] || null;       // 없으면 언어에서 유도(구버전 규격 호환)
          m = t.match(/cid\s*=\s*(\d{3,})/i);                                 // "아고다 cid=1932026"
          if (m) cid = m[1];
          return { name, language, cid, market, mdcode };
        };
        const parsed = parseChannelMd(md);
        // 코드 = §0 "| 코드 |" 우선, 없으면 입력값(보조). 대표님 방식 = md 만 올리면 코드도 자동.
        const code = String(parsed.mdcode || body.code || '').trim();
        const miss = [];
        if (!code)            miss.push('코드(§0 | 코드 | 또는 입력)');
        else if (!/^[A-Za-z0-9_-]{2,20}$/.test(code)) miss.push('코드 형식(영문·숫자·-_ 2~20자)');
        if (!parsed.name)     miss.push('채널 이름');
        if (!parsed.language) miss.push('언어');
        if (!parsed.cid)      miss.push('아고다 cid');
        if (miss.length)
          return res.status(400).json({ ok: false, error: '규격 md 에서 읽지 못한 항목: ' + miss.join(', ') + ' (§0 채널 정보를 확인하세요).', parsed: { code, ...parsed } });

        if (dryRun) return res.status(200).json({ ok: true, dry_run: true, parsed: { code, name: parsed.name, language: parsed.language, market: parsed.market, cid: parsed.cid } });

        // 이미 있는 코드면 막는다(예약·CID 연결 열쇠라 덮어쓰기 위험).
        const { data: dup } = await sb.from('channels').select('code').eq('code', code).maybeSingle();
        if (dup) return res.status(409).json({ ok: false, error: '이미 있는 채널 코드입니다: ' + code });

        const row = {
          code, name: parsed.name, name_en: null, language: parsed.language, market: parsed.market,
          platform: 'youtube', has_agoda_api: true, agoda_site_id: null,
          is_active: true, display_order: 999,
        };
        const { data: ch, error: chErr } = await sb.from('channels').insert(row).select().single();
        if (chErr) throw chErr;
        const { data: cd, error: cErr } = await sb.from('channel_cid_map')
          .insert({ channel_code: code, cid: parsed.cid, cid_label: 'main', is_active: true }).select().single();
        if (cErr) throw cErr;
        return res.status(200).json({ ok: true, channel: ch, cid: cd, parsed: { code, ...parsed } });
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
    // ── ?spec=CODE : 그 채널 규격 .md 내용 (규격 보기 · 최고관리자만) ──
    if (req.query.spec) {
      if (!who.isAdmin) return res.status(403).json({ ok: false, error: '규격 열람은 최고관리자만 가능합니다.' });
      const { data: chOne } = await sb.from('channels').select('code, name').eq('code', String(req.query.spec)).maybeSingle();
      if (!chOne) return res.status(404).json({ ok: false, error: '그런 채널이 없습니다.' });
      const md = await readSpecOf(chOne.name);
      return res.status(200).json({ ok: true, code: chOne.code, name: chOne.name, has_spec: !!md, spec: md || null });
    }

    // 1) 채널 레지스트리 (표시 순서대로) — market 포함
    const { data: channels, error: chErr } = await sb
      .from('channels')
      .select('code, name, name_en, language, market, platform, has_agoda_api, agoda_site_id, is_active, display_order, notes')
      .order('display_order', { ascending: true })
      .order('code', { ascending: true });
    if (chErr) throw chErr;

    // 2) CID 매핑
    const { data: cids, error: cidErr } = await sb
      .from('channel_cid_map')
      .select('cid, channel_code, cid_label, is_active')
      .order('channel_code', { ascending: true })
      .order('cid', { ascending: true });
    if (cidErr) throw cidErr;

    // 3) CID별 확정/취소 예약 (뷰 v_cid_bookings) — 취소 제외 확정이 성과 기준
    const { data: bk } = await sb.from('v_cid_bookings').select('cid, confirmed, cancelled');
    const bkByCid = {};
    for (const b of bk || []) bkByCid[b.cid] = { confirmed: Number(b.confirmed) || 0, cancelled: Number(b.cancelled) || 0 };

    const byChannel = {};
    for (const c of cids || []) {
      const b = bkByCid[c.cid] || { confirmed: 0, cancelled: 0 };
      (byChannel[c.channel_code] = byChannel[c.channel_code] || []).push({
        cid: c.cid, cid_label: c.cid_label, is_active: c.is_active,
        confirmed: b.confirmed, cancelled: b.cancelled,
      });
    }

    // 4) 규격(.md) 존재 여부 (채널명 기준 파일)
    const out = [];
    for (const ch of channels || []) {
      const cidList = byChannel[ch.code] || [];
      const confirmed = cidList.reduce((s, x) => s + (x.confirmed || 0), 0);
      const cancelled = cidList.reduce((s, x) => s + (x.cancelled || 0), 0);
      const specFile = await specPathOf(ch.name);
      out.push({
        ...ch, cids: cidList,
        bookings_confirmed: confirmed, bookings_cancelled: cancelled,
        has_spec: !!specFile, spec_file: specFile ? `${ch.name}.md` : null,
      });
    }

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
