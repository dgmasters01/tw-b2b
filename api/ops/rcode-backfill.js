// api/ops/rcode-backfill.js
// 🔗 이미 등록된 발행물에 **클릭 추적 자리(R코드)를 소급 적용**한다. (2026-07-31 신설)
//
// 왜 (대표님 발견):
//   되돌림(api/r.js)과 클릭 장부(content_clicks)는 있는데 **자리를 만드는 코드가 없었다.**
//   기존 3편(HT-0001·TW-0001·HG-0001)은 손으로 넣은 것이었고, 새로 등록된 HT-0002 는
//   설명란에 아고다 원본 링크가 그대로 나가 **클릭이 한 건도 안 세지고 있었다.**
//   등록 흐름은 api/publications.js 에서 자동화했고, 이 창구는 **이미 쌓인 것**을 메운다.
//
// 무엇을 하나
//   ① R코드가 없는 발행물을 찾아 TOP1·2·3 세 자리를 만든다
//   ② 설명란의 아고다 링크를 gohpik.com/r/R-xxxxx 로 바꾼다 (hid 로 맞춘다 — 순서가 아니라)
//   ③ 이미 자리가 있으면 건드리지 않는다 (두 번 만들지 않는다)
//
// 쓰는 법
//   GET /api/ops/rcode-backfill?dry_run=1        → 무엇을 바꿀지 보기만
//   GET /api/ops/rcode-backfill                  → 실제로 적용
//   GET /api/ops/rcode-backfill?code=HT-0002     → 한 건만

export const config = { maxDuration: 60 };

const R_BASE = process.env.TRACK_BASE_URL || 'https://gohpik.com';

function authOk(req) {
  const ops = process.env.CLAUDE_OPS_TOKEN;
  return !!ops && (req.headers['x-ops-token'] || '') === ops;
}

function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function sbGet(path) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders() });
  if (!r.ok) throw new Error(`조회 실패 ${r.status}: ${await r.text()}`);
  return r.json();
}

async function sbSend(method, path, body, prefer) {
  const h = sbHeaders();
  if (prefer) h.Prefer = prefer;
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method, headers: h, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${method} 실패 ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

export default async function handler(req, res) {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: '서버 설정이 없습니다.' });
  }

  const dry = String(req.query.dry_run || '') === '1';
  const onlyCode = req.query.code ? String(req.query.code).toUpperCase() : null;

  try {
    const filter = onlyCode ? `&code=eq.${encodeURIComponent(onlyCode)}` : '';
    const pubs = await sbGet(
      `publications?select=id,code,channel_code,cid,hid_top1,hid_top2,hid_top3,agoda_links,description${filter}&order=code`
    );

    const existing = await sbGet('content_clicks?select=r_code,publication_id,rank,hid_agoda&order=r_code');
    const byPub = {};
    for (const e of existing) (byPub[e.publication_id] || (byPub[e.publication_id] = [])).push(e);
    let seq = existing.length
      ? Math.max(...existing.map((e) => parseInt(String(e.r_code).slice(2), 10) || 0))
      : 0;

    const report = [];
    for (const p of pubs) {
      const hids = [p.hid_top1, p.hid_top2, p.hid_top3];
      if (!hids[0] || !hids[1] || !hids[2]) {
        report.push({ code: p.code, skipped: '호텔 3곳이 다 없습니다' });
        continue;
      }
      const have = {};
      for (const e of (byPub[p.id] || [])) have[e.rank] = e;
      const made = [];
      const newRows = [];
      for (let rank = 1; rank <= 3; rank += 1) {
        if (have[rank]) continue;
        seq += 1;
        const rCode = 'R-' + String(seq).padStart(5, '0');
        const links = Array.isArray(p.agoda_links) ? p.agoda_links : [];
        const url = links[rank - 1]
          || `https://www.agoda.com/partners/partnersearch.aspx?pcs=1&cid=${p.cid}&hl=ko-kr&hid=${hids[rank - 1]}`;
        newRows.push({
          r_code: rCode, publication_id: p.id, hid_agoda: String(hids[rank - 1]),
          rank, channel_code: p.channel_code, agoda_url: url, clicks: 0,
        });
        made.push(`${rCode}(TOP${rank}·hid ${hids[rank - 1]})`);
      }
      if (!dry && newRows.length) await sbSend('POST', 'content_clicks', newRows);

      // 설명란 치환 — 순서가 아니라 **hid 로** 맞춘다
      const all = (byPub[p.id] || []).concat(newRows);
      let desc = p.description ? String(p.description) : '';
      let replaced = 0;
      for (const row of all) {
        /* 주소 끝에 붙은 문장부호(닫는 괄호·마침표·쉼표)는 주소가 아니다 — 남긴다. */
        const re = new RegExp(
          'https?://[^\\s"\'<>\\]]*agoda[^\\s"\'<>\\]]*hid=' + row.hid_agoda + '(?![0-9])[^\\s"\'<>\\]),.]*',
          'gi'
        );
        const before = desc;
        desc = desc.replace(re, `${R_BASE}/r/${row.r_code}`);
        if (desc !== before) replaced += 1;
      }
      if (!dry && replaced && desc !== p.description) {
        await sbSend('PATCH', `publications?id=eq.${p.id}`, { description: desc });
      }
      report.push({
        code: p.code,
        had: Object.keys(have).length,
        created: made,
        description_links_replaced: replaced,
      });
    }

    return res.status(200).json({
      ok: true, dry_run: dry, base: R_BASE,
      total: report.length,
      created_total: report.reduce((n, r) => n + ((r.created || []).length), 0),
      report,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: '소급 적용에 실패했습니다.', detail: String(e.message || e) });
  }
}
