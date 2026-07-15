// api/ops/handoff-verify.js
// BL-HANDOFF-TRUTH — 인계서·확정문서가 거짓말하면 다음 클로드가 21일을 날린다. 기계가 매일 검사한다.
//
// 왜 만들었나 (2026-07-15 대표님 지적: "개발적인거는 정리를 잘해야된다. 꼬이면 안됨"):
//   인계서에 `/api/cron/hotel-geo-fill` 로 크론을 걸라고 적혀 있었다. 그 파일은 **없었다**(404).
//   실제 파일 api/hotel-geo-fill.js 는 POST + x-ops-token 전용인데 Vercel 크론은 GET + Bearer 다.
//   그대로 걸었으면 21일간 조용히 전부 실패. 사람이 눈으로 읽어선 절대 못 잡는다. → 기계가 잡는다.
//
// 검사 4종 (전부 기계가 확인 가능한 것만. 못 재는 건 검사 안 함 — 날조 방지):
//   1) 인계서가 언급한 파일 경로 → 저장소에 실제로 있나 (404 덫)
//   2) vercel.json crons 각 항목 → 대응 파일 있나 (없으면 크론이 허공을 때림)
//   3) crons 각 항목 → 그 파일이 **GET + Bearer CRON_SECRET** 을 받나 (오늘의 덫 그대로)
//   4) crons 각 항목 → POST 전용으로 막혀있지 않나 (405 덫)
//
// 결과: 인계서 맨 위 <!-- verify --> 박스를 자동 갱신. 다음 클로드는 인계서를 반드시 읽으므로 무조건 본다.
//
// 실행: Vercel Cron 하루 1회 (vercel.json crons). 수동/검증: x-ops-token 헤더.
//       ?dry=1 이면 검사만 하고 인계서를 안 고친다.
// 규칙 문서: _os/playbook/handoff-truth.md

const RAW = 'https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/';
const HANDOFF = '_os/handoff/current.md';
const MARK_S = '<!-- verify:start -->';
const MARK_E = '<!-- verify:end -->';

function authOk(req) {
  const cron = process.env.CRON_SECRET;
  const ops = process.env.CLAUDE_OPS_TOKEN;
  const h = req.headers;
  if (cron && (h['x-cron-token'] || '') === cron) return true;
  if (cron && (h['authorization'] || '') === 'Bearer ' + cron) return true;
  if (ops && (h['x-ops-token'] || '') === ops) return true;
  return false;
}

async function raw(path) {
  const r = await fetch(RAW + path + '?t=' + Date.now());
  return r.ok ? await r.text() : null;
}

export default async function handler(req, res) {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });
  const dry = req.query?.dry === '1' || req.query?.dry === 'true';

  const errors = [];
  const warns = [];
  const checked = { paths: 0, crons: 0 };

  const handoff = await raw(HANDOFF);
  if (!handoff) return res.status(500).json({ ok: false, error: '인계서를 못 읽었습니다.' });

  // ── 1) 인계서가 언급한 파일 경로가 진짜 있나
  const re = /(?:^|[\s`(*])((?:_os|_business|_content|api|\.github)\/[A-Za-z0-9._/-]+\.(?:js|mjs|md|json|html|yml|py))/g;
  const paths = [...new Set([...handoff.matchAll(re)].map((m) => m[1]))];
  for (const p of paths) {
    checked.paths++;
    const r = await fetch(RAW + p, { method: 'HEAD' });
    if (!r.ok) errors.push(`인계서가 가리키는 \`${p}\` 가 **없습니다**(${r.status}). 경로가 틀렸거나 아직 안 만든 것입니다.`);
  }

  // ── 2~4) vercel.json crons 가 진짜로 돌 수 있나
  let vercel = null;
  try { vercel = JSON.parse(await raw('vercel.json')); } catch (e) { errors.push('vercel.json 을 못 읽었습니다.'); }
  for (const c of (vercel?.crons || [])) {
    checked.crons++;
    const clean = String(c.path).split('?')[0].replace(/^\//, '');
    let src = null, file = null;
    for (const cand of [`${clean}.js`, `${clean}/index.js`]) {
      src = await raw(cand);
      if (src) { file = cand; break; }
    }
    if (!src) { errors.push(`크론 \`${c.path}\` 의 파일이 **없습니다**. 이 크론은 허공을 때립니다(21일 조용히 실패).`); continue; }
    const bearer = /Bearer\s*'?\s*\+?\s*cron|authorization/i.test(src) && /CRON_SECRET/.test(src);
    if (!bearer) errors.push(`크론 \`${c.path}\`(${file}) 가 **Bearer CRON_SECRET 을 안 받습니다**. Vercel 크론은 이 방식으로만 부릅니다 → 401.`);
    if (/req\.method\s*!==\s*'POST'/.test(src)) errors.push(`크론 \`${c.path}\`(${file}) 는 **POST 전용**입니다. Vercel 크론은 GET 으로 부릅니다 → 405.`);
    if (!/maxDuration/.test(src) && !(vercel?.functions || {})[file]) warns.push(`크론 \`${c.path}\` 에 maxDuration 표시가 없습니다(기본 30초). 오래 걸리면 잘립니다.`);
  }

  const now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const box = errors.length
    ? `${MARK_S}\n> 🔴 **인계서 자동 검사 실패 — 이대로 믿고 작업하면 꼬입니다** (검사: ${now})\n>\n${errors.map((e) => `> - ${e}`).join('\n')}\n${warns.length ? warns.map((w) => `> - ⚠️ ${w}`).join('\n') + '\n' : ''}>\n> 고치기 전엔 위 항목을 **사실로 인용하지 말 것.**\n${MARK_E}`
    : `${MARK_S}\n> 🟢 **인계서 자동 검사 통과** (검사: ${now} · 경로 ${checked.paths}개 · 크론 ${checked.crons}개 실존·인증·메서드 확인)\n${warns.length ? '>\n' + warns.map((w) => `> - ⚠️ ${w}`).join('\n') + '\n' : ''}${MARK_E}`;

  const report = { ok: errors.length === 0, checked, errors, warns, dry };
  if (dry) return res.status(200).json(report);

  // ── 인계서 맨 위 박스 갱신 (본문은 안 건드림)
  let next;
  if (handoff.includes(MARK_S) && handoff.includes(MARK_E)) {
    next = handoff.slice(0, handoff.indexOf(MARK_S)) + box + handoff.slice(handoff.indexOf(MARK_E) + MARK_E.length);
  } else {
    const i = handoff.indexOf('\n');
    next = handoff.slice(0, i + 1) + '\n' + box + '\n' + handoff.slice(i + 1);
  }
  if (next.trim() === handoff.trim()) return res.status(200).json({ ...report, committed: false, note: '변경 없음' });

  const base = process.env.OPS_BASE_URL || 'https://gohotelwinners.com';
  const r = await fetch(base + '/api/ops/github-commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-ops-token': process.env.CLAUDE_OPS_TOKEN },
    body: JSON.stringify({ path: HANDOFF, content: next, message: `인계서 자동 검사: ${errors.length ? '🔴 ' + errors.length + '건 불일치' : '🟢 통과'}` }),
  });
  const cr = await r.json().catch(() => null);
  return res.status(200).json({ ...report, committed: r.ok, commit_sha: cr?.commit_sha || null });
}
