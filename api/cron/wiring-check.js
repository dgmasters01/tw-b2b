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
//   ⑥ **SYSTEM_MAP §3 봇 표 ↔ vercel.json 실물**을 대조해 어긋나면 알린다 (2026-08-07)
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
    /* 💰 2026-07-27: 코드가 안 바뀌었으면 훑을 필요가 없다.
       마지막 커밋 SHA 를 기억해 뒀다가 같으면 그냥 끝낸다.
       (창구 73개 = 951KB. 매일 받으면 월 28MB — 큰 돈은 아니지만 헛일은 안 한다.) */
    const force = String(req.query.force || '') === '1';
    let headSha = null;
    try {
      const hr = await fetch(`https://api.github.com/repos/${REPO}/commits/${BRANCH}`,
        { headers: { 'User-Agent': 'tw-b2b-wiring-check', Accept: 'application/vnd.github.sha' } });
      if (hr.ok) headSha = (await hr.text()).trim();
    } catch { /* 못 읽으면 그냥 스캔한다 */ }

    const sb0 = admin();
    let lastSha = null;
    try {
      const { data } = await sb0.from('api_cache').select('payload').eq('cache_key', 'wiring_check_sha').maybeSingle();
      lastSha = data && data.payload && data.payload.sha ? String(data.payload.sha) : null;
    } catch { /* 캐시 표가 없으면 무시 */ }

    if (!force && headSha && lastSha && headSha === lastSha) {
      return res.status(200).json({
        ok: true, skipped: true, reason: '코드가 안 바뀌었습니다 — 훑지 않았습니다.',
        head_sha: headSha.slice(0, 10),
      });
    }

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
    const sb = sb0;
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

    // ── ③-B 봇 명단이 «실물과 다른가» (2026-08-07 신설) ────────────────────────
    // 🔴 왜 (대표님): *"수정할 때 기록과 업데이트가 중요한 이 부분을 네가 무조건 끝나면 해야 되는 거야?"*
    //    맞다 — 그게 문제였다. **클로드가 기억해서 문서를 고치는 구조는 헌법 10조(기억 의존 금지) 위반이다.**
    //    실제로 2026-08-07 대조해 보니 SYSTEM_MAP §3 에 봇이 **11개**로 적혀 있었고 실물은 **15개**였다.
    //    4개가 문서에 없었다. 문서가 실물과 다르면 **다음 클로드가 이미 있는 봇을 또 만든다.**
    //    → 이제 **기억이 아니라 로봇이** 매일 대조한다. 어긋나면 메일이 온다.
    // 🔴 겹침 확인: 「문서가 낡았나」는 원래부터 wiring-check 담당이다(③ 배선도).
    //    새 봇을 만들지 않고 **같은 담당자에게 항목만 하나 더** 준다. (D-081 「한 가지는 한 로봇만」)
    let botDrift = null;
    try {
      const vj = await getText('vercel.json');
      const map = await getText('SYSTEM_MAP.md');
      if (vj && map) {
        const crons = (JSON.parse(vj).crons || []).map((c) => String(c.path).split('/').pop());
        const sec = (map.split(/^## 3\./m)[1] || '').split(/^## 4\./m)[0] || '';
        const missing = crons.filter((n) => !sec.includes(n));
        // 문서에만 있고 실물엔 없는 것(꺼졌는데 표에 남은 것)도 잡는다
        const listed = [...new Set((sec.match(/\*\*[a-z0-9-]{4,}\*\*/g) || []).map((x) => x.replace(/\*/g, '')))];
        const ghost = listed.filter((n) => !crons.includes(n) && !/^(코드|봇|무료)/.test(n));
        if (missing.length || ghost.length) {
          botDrift = `봇 명단이 실물과 다릅니다 — 실물 크론 ${crons.length}개.`
            + (missing.length ? ` 문서에 빠짐: ${missing.join(', ')}.` : '')
            + (ghost.length ? ` 문서에만 있음(꺼진 봇?): ${ghost.join(', ')}.` : '');
        }
      }
    } catch (e) { botDrift = `봇 명단 대조 실패: ${String(e.message || e).slice(0, 80)}`; }

    const out = {
      ok: true,
      apis_scanned: apiPaths.length,
      risk_total: graded.length,
      over_count: over.length,          // 🔴 지금 실제로 틀린 답이 나오는 곳
      near_count: near.length,          // 🟡 곧 터질 곳
      stale_wiring: stale,
      bot_drift: botDrift,
      over, near,
      all: full ? graded : undefined,
      table_rows: rows,                 // 그대로 _os/tools/table-rows.json 에 넣으면 된다
    };

    // ── ④ 알림 ──
    // 🔴 2026-08-03 대표님: *"문제가 있을때만 보내는게 맞지 않나?"* — 맞다.
    //   이상 없는 날에도 메일이 오면 **진짜 문제가 묻힌다.**
    //   보내는 기준:
    //     ① 지금 틀린 답이 나오는 곳이 있을 때        → 보낸다(급함)
    //     ② 배선도가 낡았을 때                          → 보낸다(고치기 쉽고, 두면 다른 검사가 다 틀린다)
    //     ③ 「곳 터질 곳」만 있을 때                     → **안 보낸다** — 아직 멀았다
    //     ④ 이상 없음                                  → **안 보낸다**
    //   「곳 터질 곳」은 관리자 건강검진에서 볼 수 있다. 메일까지 보낼 일은 아니다.
    const worth = over.length > 0 || !!stale || !!botDrift;
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
        botDrift ? `⚠️ ${botDrift}` : '',
        '',
        '고치는 법:',
        '  1) 해당 창구에서 .range(from, from+999) 로 끊어 읽게 바꾼다',
        '  2) node _os/tools/wiring-scan.mjs 를 돌려 SYSTEM_WIRING.md 를 갱신하고 같이 커밋한다',
        '  3) 봇 명단이 다르면 SYSTEM_MAP.md §3 표를 vercel.json 실물에 맞춘다',
      ].filter((x) => x !== '');
      try {
        await sendOpsEmail({
          subject: `[배선 점검] 터지는 곳 ${over.length} · 곧 터질 곳 ${near.length}${stale ? ' · 배선도 낡음' : ''}${botDrift ? ' · 봇 명단 어긋남' : ''}`,
          text: lines.join('\n'),
        });
        out.mail_sent = true;
      } catch (e) { out.mail_error = String(e.message || e); }
    }

    // 이번 SHA 를 기억한다 — 다음 회차에 코드가 그대로면 건너뛴다
    if (headSha) {
      try { await sb.from('api_cache').upsert({ cache_key: 'wiring_check_sha', payload: { sha: headSha }, computed_at: new Date().toISOString() }, { onConflict: 'cache_key' }); } catch { /* 캐시 실패는 무시 */ }
      out.head_sha = headSha.slice(0, 10);
    }

    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ ok: false, error: '배선 점검에 실패했습니다.', detail: String(e.message || e) });
  }
}
