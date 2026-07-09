// /api/youtube-book.js
// 새 도시를 만나면 그 자리에서 유튜브에 묻고, 장부를 만들어 GitHub 에 넣는다.
//
//   원고 투입 → 장부 없음 → 이 창구 → 실측 → CSV 커밋 → 원고 다시 투입
//
// 도시를 미리 다 만들어 두지 않는다 (키워드-실측.md §7-1).
// 쓰지도 않을 도시를 재느라 시간을 버리지 않고, 쓸 때 재야 수치가 가장 신선하다.
//
// ── 부르는 법 ────────────────────────────────────────────────
// POST /api/youtube-book
//   헤더 : x-ops-token: <CLAUDE_OPS_TOKEN>
//   본문 : {
//     "city": "교토",
//     "regions": ["기온", "교토카와라마치"],   // 지역1 이 첫 번째
//     "station": "교토역",
//     "star": 3,
//     "hotels": ["호텔명1", "호텔명2", "호텔명3"],   // 있으면 같이 검증
//     "budget": 15,        // 이번 호출에서 잴 개수 (기본 15). 타임아웃 방지
//     "commit": true       // false 면 재기만 하고 커밋 안 함 (미리보기)
//   }
//
// ── 나오는 것 ────────────────────────────────────────────────
//   { ok, city, measured, remaining, total, committed, path, rows[] }
//
//   remaining > 0 이면 같은 요청을 다시 보내면 된다.
//   이미 잰 것은 건너뛴다. 중간에 끊겨도 잰 만큼은 커밋되어 있다.
//
// GET /api/youtube-book?city=교토  → 장부 현황만 확인

import { join } from 'node:path';
import { suggest, competition, opportunity } from './_lib/kwtool.js';
import {
  loadKwRules, loadMeasured, parseCsv, allowedTokens, tokensOf, tokensAllowed, CSV_COLUMNS,
} from './_lib/youtube-keywords.js';

export const config = { maxDuration: 300 };

const ALLOWED_REFERRER_HOSTS = ['gohotelwinners.com', 'www.gohotelwinners.com', 'tw-b2b.vercel.app'];

function authorized(req) {
  const expected = process.env.CLAUDE_OPS_TOKEN;
  if (expected && (req.headers['x-ops-token'] || '') === expected) return true;
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

function rootDir() {
  return join(process.cwd(), '_content', 'youtube');
}

const RAW_BASE = process.env.OPS_RAW_BASE
  || 'https://raw.githubusercontent.com/dgmasters01/tw-b2b/main';

/**
 * 장부는 **GitHub 을 진짜로 삼는다** (헌법 원칙 1: 단일 진실).
 *
 * 왜 로컬 파일을 안 읽나:
 *   커밋은 GitHub 으로 간다. 배포본의 로컬 파일은 그 전 스냅샷이다.
 *   로컬을 읽으면 방금 잰 것을 못 보고 **같은 어형을 또 잰다.** 이어하기가 안 된다.
 *   raw 는 커밋 즉시 반영된다. 그래서 raw 를 본다.
 * 못 읽으면 배포본 로컬로 물러선다.
 */
async function loadBook(root, city) {
  const url = `${RAW_BASE}/_content/youtube/keywords/${encodeURIComponent(city)}.csv`;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (r.ok) {
      const book = new Map();
      for (const row of parseCsv(await r.text())) {
        if (!row['키워드']) continue;
        const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
        book.set(row['키워드'], {
          rank: n(row['자동완성순위']),
          comp: n(row['경쟁영상수']),
          score: n(row['기회점수']) ?? 0,
          alive: row['살아있나'] === '○',
          variant: row['자동완성순위'] === '변형',
          joined: row['자동완성순위'] === '붙여쓰기',
          day: row['측정일'] || null,
        });
      }
      return book;
    }
    if (r.status === 404) return new Map();   // 아직 없는 도시. 정상이다.
  } catch {
    /* 네트워크가 막히면 아래로 */
  }
  return loadMeasured(root, city);
}

/* ─────────── 씨앗 (키워드-실측.md §3-1) ─────────── */

function seedsOf({ city, regions = [], station }) {
  const s = [
    `${city} 호텔`, `${city} 숙소`, `${city} 여행`,
    `${city} 호텔 추천`, `${city} 숙소 추천`,
  ];
  if (station) s.push(`${station} 호텔`, `${station} 숙소`);
  for (const r of regions) s.push(`${r} 호텔`, `${r} 숙소`);
  return [...new Set(s)];
}

/* ─────────── CSV ─────────── */

const todayStr = () => new Date().toISOString().slice(0, 10);

function toCsv(rows) {
  const head = CSV_COLUMNS.join(',');
  const body = rows.map((r) => CSV_COLUMNS.map((c) => (r[c] ?? '')).join(',')).join('\n');
  return `\uFEFF${head}\n${body}\n`;
}

function bookToRows(book) {
  const rows = [];
  for (const [kw, v] of book) {
    rows.push({
      키워드: kw,
      자동완성순위: v.variant ? '변형' : (v.joined ? '붙여쓰기' : (v.rank ?? '없음')),
      경쟁영상수: v.comp ?? '조회실패',
      기회점수: v.score ?? 0,
      살아있나: v.joined ? '—' : (v.alive ? '○' : '✗ 죽은키워드'),
      측정일: v.day || todayStr(),
    });
  }
  rows.sort((a, b) => Number(b.기회점수) - Number(a.기회점수));
  return rows;
}

/* ─────────── GitHub 커밋 (기존 창구 재사용) ─────────── */

async function commitBook(path, content, message) {
  const token = process.env.CLAUDE_OPS_TOKEN;
  if (!token) return { ok: false, error: 'CLAUDE_OPS_TOKEN 이 없습니다.' };
  const base = process.env.OPS_BASE_URL || 'https://gohotelwinners.com';
  const r = await fetch(`${base}/api/ops/github-commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-ops-token': token },
    body: JSON.stringify({ path, content, message }),
  });
  if (!r.ok) return { ok: false, error: `github-commit ${r.status}` };
  return { ok: true };
}

/* ─────────── 본체 ─────────── */

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ ok: false, error: 'Invalid or missing x-ops-token' });

  const root = rootDir();

  if (req.method === 'GET') {
    const city = req.query?.city;
    if (!city) return res.status(400).json({ ok: false, error: 'city 가 필요합니다.' });
    const book = await loadBook(root, city);
    return res.status(200).json({
      ok: true, city, exists: book.size > 0, rows: book.size,
      measuredDay: [...book.values()].find((v) => v.day)?.day || null,
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

  const { city, regions = [], station = null, star = null, hotels = [] } = body;
  // 경쟁 조회는 1건당 3~5초다. 서버리스 수명 안에서 안전한 기본값.
  const budget = Number.isFinite(body.budget) ? Math.max(1, Math.min(40, body.budget)) : 15;
  const doCommit = body.commit !== false;

  if (!city) return res.status(400).json({ ok: false, error: 'city 가 필요합니다.' });

  let kwRules;
  try {
    kwRules = await loadKwRules(root);
  } catch (e) {
    return res.status(500).json({ ok: false, error: '키워드-실측.md 를 읽지 못했습니다.', detail: String(e.message || e) });
  }

  // 이미 있는 장부를 이어 쓴다 (GitHub 이 진짜다)
  const book = await loadBook(root, city);

  const allow = allowedTokens({ country: '일본', city, station, regions, star }, kwRules);
  const places = new Set([city, station, ...regions].filter(Boolean));
  const hasPlace = (k) => tokensOf(k).some((t) => places.has(t));

  // ── 1) 씨앗 자동완성 → 후보 (자동완성은 빠르다. 다 훑는다)
  const cand = new Map(); // kw -> rank
  for (const seed of seedsOf({ city, regions, station })) {
    const lst = await suggest(seed);
    lst.forEach((k, i) => {
      if (tokensOf(k).length < 2) return;
      if (!hasPlace(k)) return;
      if (!tokensAllowed(k, allow)) return;
      const r = i + 1;
      if (!cand.has(k) || r < cand.get(k)) cand.set(k, r);
    });
  }

  // ── 2) 호텔명 검증 (문서 §5)
  const hotelWork = [];
  for (const h of hotels) {
    if (book.has(h)) continue;
    const lst = await suggest(h);
    const alive = lst.includes(h);
    hotelWork.push({ name: h, alive, rank: alive ? lst.indexOf(h) + 1 : null, sug: lst });
  }

  // ── 3) 아직 경쟁을 안 잰 것만 고른다 (예산 안에서)
  const todo = [];
  for (const [k, r] of cand) if (!book.has(k)) todo.push({ kind: 'kw', kw: k, rank: r });
  for (const h of hotelWork) todo.push({ kind: 'hotel', kw: h.name, rank: h.rank, alive: h.alive, sug: h.sug });

  // 3어절 이상 어형의 붙여쓰기 짝 (문서 §4) — 띄어쓰기형을 이미 잰 것만
  for (const [k, v] of book) {
    if (v.joined || v.variant || !v.alive) continue;
    if (tokensOf(k).length < 3) continue;
    const j = k.replace(/\s+/g, '');
    if (!book.has(j)) todo.push({ kind: 'pair', kw: j, of: k });
  }

  const total = todo.length;
  const slice = todo.slice(0, budget);
  const day = todayStr();

  for (const t of slice) {
    const comp = await competition(t.kw);
    if (t.kind === 'pair') {
      book.set(t.kw, { rank: null, comp, score: 0, alive: false, joined: true, day });
    } else if (t.kind === 'hotel') {
      book.set(t.kw, { rank: t.rank, comp, score: opportunity(t.rank, comp), alive: t.alive, day });
      if (t.alive) {
        const htok = new Set([...tokensOf(t.kw), ...places]);
        for (const v of t.sug) {
          if (v === t.kw || book.has(v)) continue;
          if (!tokensOf(v).every((x) => htok.has(x))) continue;   // 다른 호텔이다
          book.set(v, { rank: null, comp: null, score: 0, alive: true, variant: true, day });
        }
      }
    } else {
      book.set(t.kw, { rank: t.rank, comp, score: opportunity(t.rank, comp), alive: true, day });
    }
  }

  const rows = bookToRows(book);
  const path = `_content/youtube/keywords/${city}.csv`;
  let committed = false;
  let commitError = null;

  if (doCommit && slice.length) {
    const msg = `장부 자동 갱신: ${city} (+${slice.length}행, 남은 ${Math.max(0, total - slice.length)}개)`;
    const r = await commitBook(path, toCsv(rows), msg);
    committed = r.ok;
    if (!r.ok) commitError = r.error;
  }

  const deadHotels = hotelWork.filter((h) => !h.alive).map((h) => h.name);
  const warnings = [];
  if (deadHotels.length) warnings.push(`자동완성에 없는 호텔명: ${deadHotels.join(' / ')}. 키워드란에서 빠집니다.`);
  if (commitError) warnings.push(`GitHub 커밋 실패: ${commitError}. 잰 값은 응답에만 있습니다.`);
  const remaining = Math.max(0, total - slice.length);
  if (remaining) warnings.push(`아직 ${remaining}개 남았습니다. 같은 요청을 다시 보내주세요.`);

  return res.status(200).json({
    ok: true,
    city,
    measured: slice.length,
    remaining,
    total,
    rowsInBook: rows.length,
    committed,
    path,
    warnings,
    top: rows.slice(0, 10),
  });
}
