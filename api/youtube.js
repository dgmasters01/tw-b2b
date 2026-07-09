// /api/youtube.js
// 원고(docx) 하나를 넣으면 유튜브 업로드 패키지 한 벌이 나온다.
//
//   원고 → 채널 판별(cid) → 제목 · 본문 · 해시태그 · 키워드 · 파일명 · 나레이션
//
// 규칙은 코드가 아니라 _content/youtube/ 문서 3개에서 읽는다.
//   여행능력자들.md (숏폼 · cid 1913282)
//   호텔이야.md     (롱폼 · cid 1932026)
//   호텔이곳.md     (롱폼 · cid 1946819)
// 문서를 고치면 결과가 바뀐다. 코드는 안 고쳐도 된다.
//
// ── 부르는 법 ────────────────────────────────────────────────
// POST /api/youtube
//   헤더 : x-ops-token: <CLAUDE_OPS_TOKEN>
//   본문 : {
//     "filename": "001 9월 3일~9월 5일, 2명, 일본 나고야 나고야역 근처 10만원 이하 3성급 호텔.docx",
//     "docxBase64": "UEsDBBQ...",        // 또는 "text": "원고 전문"
//     "cid": "1946819",                   // 없으면 원고 본문에서 채널명을 찾는다
//     "links": { "top1": "https://...cid=1946819&hid=123", "top2": "...", "top3": "..." },
//     "extras": { "region2": "도톤보리", "region3": "신사이바시",
//                 "otherCities": ["도쿄","후쿠오카"], "keywords": ["난바역 근처 호텔"] }
//   }
//
// GET /api/youtube?channels=1  → 채널·cid 목록만 확인
//
// ── 나오는 것 ────────────────────────────────────────────────
//   { ok, channel, cid, title, titles[], filename{video,thumb}, description,
//     hashtags[], keywords, keywordLength, narration, publicationRow, warnings[] }
//
// warnings 는 "사람이 손봐야 하는 곳" 목록이다. 원고에 없는 값은 지어내지 않고
// [원고 확인 필요] 로 남긴다 (호텔이야.md §6).

import { docxToText } from './_lib/docx-text.js';
import { parseManuscript } from './_lib/youtube-parse.js';
import { loadRules, detectChannel } from './_lib/youtube-rules.js';
import { render, buildSlotItems } from './_lib/youtube-render.js';
import { buildMeasuredKeywords } from './_lib/youtube-keywords.js';

const ALLOWED_REFERRER_HOSTS = ['gohotelwinners.com', 'www.gohotelwinners.com', 'tw-b2b.vercel.app'];

function authorized(req) {
  const expected = process.env.CLAUDE_OPS_TOKEN;
  if (expected && (req.headers['x-ops-token'] || '') === expected) return true;
  // 개발 단계 대비책 (chat-log.js 와 같은 방식)
  const ref = req.headers['referer'] || '';
  try {
    return !!ref && ALLOWED_REFERRER_HOSTS.includes(new URL(ref).host);
  } catch {
    return false;
  }
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ ok: false, error: 'Invalid or missing x-ops-token' });

  let loaded;
  try {
    loaded = await loadRules();
  } catch (e) {
    return res.status(500).json({ ok: false, error: '규칙 문서를 읽지 못했습니다.', detail: String(e.message || e) });
  }
  const { rules, byCid } = loaded;

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      channels: Object.values(rules).map((r) => ({ channel: r.channel, cid: r.cid })),
    });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ ok: false, error: 'JSON 본문을 읽지 못했습니다.' });
  }

  const { filename, docxBase64, text, cid, links, extras } = body;
  if (!filename) return res.status(400).json({ ok: false, error: 'filename 이 필요합니다. 원고 파일명에 도시·지역·성급·가격대가 들어 있습니다.' });
  if (!docxBase64 && !text) return res.status(400).json({ ok: false, error: 'docxBase64 또는 text 중 하나가 필요합니다.' });

  // 1) 원고를 글자로
  let plain;
  try {
    plain = docxBase64 ? docxToText(docxBase64) : String(text);
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'docx 를 열지 못했습니다.', detail: String(e.message || e) });
  }

  // 2) 채널 판별 — cid 가 있으면 cid 가 우선, 없으면 원고 본문에서 채널명을 찾는다
  let rule = null;
  const notes = [];
  if (cid) {
    rule = byCid[String(cid)];
    if (!rule) return res.status(400).json({ ok: false, error: `모르는 cid 입니다: ${cid}`, known: Object.keys(byCid) });
    const guessed = detectChannel(plain);
    if (guessed && guessed !== rule.channel) {
      notes.push(`cid 로는 ${rule.channel} 인데 원고 본문에는 ${guessed} 이 적혀 있습니다. 원고를 확인해 주세요.`);
    }
  } else {
    const guessed = detectChannel(plain);
    if (!guessed) return res.status(400).json({ ok: false, error: 'cid 를 넣어주세요. 원고 본문에서도 채널명을 못 찾았습니다.' });
    rule = rules[guessed];
    notes.push(`cid 를 안 주셔서 원고 본문의 '${guessed}' 로 채널을 정했습니다 (cid=${rule.cid}).`);
  }

  // 3) 원고 파싱 → 4) 산출
  try {
    const m = parseManuscript(filename, plain);
    m.links = links || {};
    m.extras = extras || {};
    m.sourceFilename = filename;

    // 키워드는 실측이 필요하다. 슬롯만으로는 300~335자에서 멈춘다.
    // 평소엔 _content/youtube/keywords/[도시].csv 를 읽고, live:true 면 유튜브에 직접 묻는다.
    let keywords = null;
    try {
      const slotItems = buildSlotItems(m, rule, m.extras, []);
      keywords = await buildMeasuredKeywords({
        m, rule, slotItems,
        root: loaded.root,
        live: body.live === true || process.env.YT_LIVE_MEASURE === '1',
      });
    } catch (e) {
      notes.push(`키워드 실측을 건너뛰고 슬롯만으로 만들었습니다: ${String(e.message || e)}`);
    }

    const out = render(m, rule, keywords ? { keywords } : {});
    out.warnings = [...notes, ...out.warnings];
    return res.status(200).json({ ok: true, ...out });
  } catch (e) {
    return res.status(500).json({ ok: false, error: '원고를 처리하지 못했습니다.', detail: String(e.message || e) });
  }
}
