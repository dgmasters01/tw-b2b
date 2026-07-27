// api/cron/wiring-check.js
// BL-WIRING-CHECK — 배선 자동 점검 봇 (2026-07-27 신설 · D-076 §6)
//
// 왜 만들었나
//   대표님: "앞으로 데이터가 연동이 안 돼서 각자 페이지에 확인해서 변경해달라고 하는 경우는 없는 거지?"
//   `_os/tools/wiring-scan.mjs` 를 만들었지만 **사람이 손으로 돌려야** 했다.
//   안 돌리면 배선도가 낡고, 낡으면 오늘과 똑같은 사고가 난다.
//   「도구를 만들었다」와 「도구가 돈다」는 다르다. → 서버가 매일 스스로 돌린다.
//
// 무엇을 하나
//   ① GitHub 에서 화면(HTML)·창구(api/*.js)·vercel.json 을 그대로 받아온다
//   ② 로컬 스캐너와 **같은 규칙**으로 배선을 뽑는다
//   ③ 표 행수(DB 실측)와 맞춰 **1,000줄 잘림 위험**을 등급으로 매긴다
//   ④ 🔴(이미 1,000줄 넘은 표를 통째로 읽는 곳)가 있으면 **메일로 알린다**
//   ⑤ 저장된 SYSTEM_WIRING.md 와 달라졌으면 "배선도가 낡았다" 고 알린다
//
// 안 하는 것
//   레포에 커밋하지 않는다(GITHUB_PAT 권한 밖). **알리기만 한다.**
//   고치는 것은 사람(또는 클로드)이 `node _os/tools/wiring-scan.mjs` 로 한다.
//
// 실행: Vercel Cron 매일 KST 10시(UTC 01시) — booking-health(09시) 다음.
// 수동: x-ops-token / x-cron-token. ?mail=1 강제발송 · ?full=1 전체 목록 반환

import { createClient } from '@supabase/supabase-js';
import { sendOpsEmail } from '../_lib/email-sender.js';

export const config = { maxDuration: 60 };

const REPO = 'dgmasters01/tw-b2b';
const BRANCH = 'main';

function authOk(req) {
  const cron = process.env.CRON_SECRET;
  const ops = process.env.CLAUDE_OPS_TOKEN;
  const h = req.headers;
  if (cron && (h['x-cron-token'] || '') === cron) return true;
  if (cron && (h['authorization'] || '') === 'Bearer ' + cron) return true;
  if (ops && (h['x-ops-token'] || '') === ops) return true;
  return false;
}

function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}

const raw = (p) => `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${p}`;

async function getText(p) {
  try {
    const r = await fetch(raw(p), { cache: 'no-store' });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

/** 레포 파일 목록 (GitHub API · 토큰 있으면 붙인다) */
async function listFiles() {
  const h = { 'User-Agent': 'tw-b2b-wiring-check' };
  const tok = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
  if (tok) h.Authorization = `Bearer ${tok}`;
  const r = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`, { headers: h });
  if (!r.ok) throw new Error(`GitHub 목록 실패 ${r.status}`);
  const j = await r.json();
  return (j.tree || []).filter((b) => b.type === 'blob').map((b) => b.path);
}

/** 창구 하나에서 「표를 통째로 읽는 곳」을 찾는다 — wiring-scan.mjs 와 같은 규칙 */
function scanApi(src) {
  const risk = [];
  for (const m of src.matchAll(/\.from\(\s*['"]([a-z_0-9]+)['"]\s*\)([\s\S]{0,300}?)(?=\.from\(|;|\n\s*(?:const|let|var|return|if|\}))/g)) {
    const t = m[1]; const tail = m[2];
    if (/\.select\(/.test(tail) && !/\.(limit|range|single|maybeSingle)\(/.test(tail)
        && !/\.(eq|in|gte|lte|like|ilike|contains|cs)\(/.test(tail)) {
      risk.push({ table: t, how: 'limit/range 없이 통째로 읽음' });
    }
  }
  for (const m of src.matchAll(/\/rest\/v1\/([a-z_0-9]+)([^`'"]*)/g)) {
    const t = m[1]; const q = m[2] || '';
    const hasFilter = /=(eq|neq|gt|gte|lt|lte|like|ilike|is|in|cs|cd|ov|sl|sr|fts|plfts|phfts|wfts)\./.test(q)
                   || /(^|[?&])(or|and)=\(/.test(q);
    const around = src.slice(Math.max(0, m.index - 500), m.index + 500);
    const countOnly = /count=exact/.test(around) && /Range['"\s:]+['"]0-0/.test(around);
    if (!/limit=|offset=/.test(q) && /select=/.test(q) && !hasFilter && !countOnly) {
      risk.push({ table: t, how: 'limit 없이 REST 로 읽음' });
    }
  }
  const seen = new Set();
  return risk.filter((r) => { const k = r.table + '|' + r.how; if (seen.has(k)) return false; seen.add(k); return true; });
}

export default async function handler(req, res) {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });
  const forceMail = String(req.query.mail || '') === '1';
  const full = String(req.query.full || '') === '1';

  try {
    // ── ① 레포에서 창구를 받아 스캔 ──
    const paths = await listFiles();
    const apiPaths = paths.filter((p) => p.startsWith('api/') && p.endsWith('.js'));
    const found = [];
    const CH = 12;                                  // 한 번에 12개씩 (60초 안에 끝나게)
    for (let i = 0; i < apiPaths.length; i += CH) {
      const batch = apiPaths.slice(i, i + CH);
      const srcs = await Promise.all(batch.map((p) => getText(p)));
      batch.forEach((p, k) => {
        if (!srcs[k]) return;
        for (const r of scanApi(srcs[k])) found.push({ api: p, ...r });
      });
    }

    // ── ② 표 행수 실측 (위험도 판정) ──
    const sb = admin();
    const tables = [...new Set(found.map((f) => f.table))];
    const rows = {};
    for (const t of tables) {
      try {
        const { count } = await sb.from(t).select('*', { count: 'exact', head: true });
        if (count != null) rows[t] = count;
      } catch { /* 뷰·권한 문제는 건너뛴다 */ }
    }

    const graded = found.map((f) => {
      const n = rows[f.table];
      const level = n == null ? 'unknown' : (n >= 1000 ? 'over' : (n >= 500 ? 'near' : 'ok'));
      return { ...f, rows: n ?? null, level };
    });
    const over = graded.filter((g) => g.level === 'over');
    const near = graded.filter((g) => g.level === 'near');

    // ── ③ 배선도가 낡았나 (창구 개수로 가볍게 확인) ──
    const wiring = await getText('SYSTEM_WIRING.md');
    let stale = null;
    if (wiring) {
      const m = wiring.match(/창구 (\d+)/);
      const recorded = m ? parseInt(m[1], 10) : null;
      if (recorded != null && recorded !== apiPaths.length) {
        stale = `배선도에 적힌 창구 ${recorded}개 ≠ 지금 ${apiPaths.length}개 — SYSTEM_WIRING.md 가 낡았습니다.`;
      }
    } else stale = 'SYSTEM_WIRING.md 가 없습니다.';

    const out = {
      ok: true,
      apis_scanned: apiPaths.length,
      risk_total: graded.length,
      over_count: over.length,          // 🔴 지금 실제로 틀린 답이 나오는 곳
      near_count: near.length,          // 🟡 곧 터질 곳
      stale_wiring: stale,
      over, near,
      all: full ? graded : undefined,
      table_rows: rows,                 // 그대로 _os/tools/table-rows.json 에 넣으면 된다
    };

    // ── ④ 알림: 터지는 게 있거나 배선도가 낡았을 때만 ──
    const worth = over.length > 0 || stale;
    if (forceMail || worth) {
      const lines = [
        '시스템 배선 점검 결과',
        '',
        `창구 ${apiPaths.length}개를 훑었습니다.`,
        '',
        over.length ? `🔴 지금 틀린 답이 나오는 곳: ${over.length}곳 (표가 이미 1,000줄을 넘었는데 통째로 읽습니다)` : '🔴 없음',
        ...over.map((g) => `   ${g.api}  —  ${g.table} (${(g.rows || 0).toLocaleString()}줄) ${g.how}`),
        '',
        near.length ? `🟡 곧 터질 곳: ${near.length}곳` : '',
        ...near.map((g) => `   ${g.api}  —  ${g.table} (${(g.rows || 0).toLocaleString()}줄)`),
        '',
        stale ? `⚠️ ${stale}` : '',
        '',
        '고치는 법:',
        '  1) 해당 창구에서 .range(from, from+999) 로 끊어 읽게 바꾼다',
        '  2) node _os/tools/wiring-scan.mjs 를 돌려 SYSTEM_WIRING.md 를 갱신하고 같이 커밋한다',
      ].filter((x) => x !== '');
      try {
        await sendOpsEmail({
          subject: `[배선 점검] 터지는 곳 ${over.length} · 곧 터질 곳 ${near.length}${stale ? ' · 배선도 낡음' : ''}`,
          text: lines.join('\n'),
        });
        out.mail_sent = true;
      } catch (e) { out.mail_error = String(e.message || e); }
    }

    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ ok: false, error: '배선 점검에 실패했습니다.', detail: String(e.message || e) });
  }
}
