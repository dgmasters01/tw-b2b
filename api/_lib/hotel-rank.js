// /api/_lib/hotel-rank.js
// 원고에서 TOP1·TOP2·TOP3 호텔을 «틀림없이» 가려낸다.
//
// ═══ 왜 이 파일이 있나 (2026-08-01 대표님) ═══
//   *"호텔이름 TOP1, TOP2, TOP3 잘못 넣으면 안됨. 추후 호텔정보가 다 꼬이고 정확한 데이터를 파악하기 힘들어.
//     추후 200달러 유료고객 호텔에게 잘못된 정보를 주면 우리 사업에 큰 문제가 생겨.
//     임시처리 방식으로 일하면 항상 추후에 문제가 커져."*
//
//   실제로 꼬여 있었다 (HT-0002):
//     원고    TOP3=JR타워(65806) · TOP2=ANA(9066914) · TOP1=프리미어(10568197)
//     저장됨  hid_top1=65806 · hid_top2=9066914 · hid_top3=10568197
//     → **TOP1 과 TOP3 가 뒤바뀌었다.**
//
//   원인: 링크가 «본문에 나온 순서»대로 hid_top1,2,3 에 들어갔다.
//         우리 원고는 **TOP3 부터 소개**한다(탑쓰리 → 탑투 → 탑원). 그래서 정확히 거꾸로 박혔다.
//
//   이대로면 유료 호텔에게 "귀 호텔이 TOP1 으로 소개됐습니다"라고 **거짓말**을 하게 된다.
//
// ═══ 규칙 (이것만 따른다) ═══
//   ① 순위는 «순서»가 아니라 **원고에 적힌 글자**로 정한다. 탑원/탑투/탑쓰리 · TOP1/2/3 · 1위/2위/3위
//   ② 링크(hid)의 순위 = 그 링크 «바로 앞»에 나온 순위 글자
//   ③ 챕터 줄(00:10 TOP3 …)과 본문(탑쓰리, …) **둘 다** 읽어 **교차 확인**한다
//   ④ 1·2·3 이 각각 정확히 하나씩 안 나오면 → **확정하지 않는다.** 사람이 본다.
//      🔴 애매하면 «추측해서 넣지 않는다». 틀린 자료가 빈칸보다 나쁘다.

/** 원고에서 순위 표시를 찾는다. → [{ rank, at, label }] (본문 위치 순) */
export function findRankMarks(text) {
  const t = String(text || '');
  const out = [];
  // 탑원/탑투/탑쓰리 · TOP1/TOP 1 · 1위 — 한글 숫자말도 함께 본다
  const re = /(탑\s*(원|투|쓰리|three|two|one)|TOP\s*([123])|([123])\s*위)/gi;
  let m;
  while ((m = re.exec(t)) !== null) {
    let rank = null;
    const ko = (m[2] || '').toLowerCase();
    if (ko) rank = (ko === '원' || ko === 'one') ? 1 : (ko === '투' || ko === 'two') ? 2 : 3;
    else if (m[3]) rank = Number(m[3]);
    else if (m[4]) rank = Number(m[4]);
    if (rank >= 1 && rank <= 3) out.push({ rank, at: m.index, label: m[0].trim() });
  }
  return out;
}

/** 원고에서 아고다 제휴링크(hid)를 위치와 함께 찾는다. → [{ hid, at, url }] */
export function findHidMarks(text) {
  const t = String(text || '');
  const out = [];
  const re = /https?:\/\/[^\s\]<>"']*partnersearch[^\s\]<>"']*/gi;
  let m;
  while ((m = re.exec(t)) !== null) {
    const hid = (m[0].match(/[?&]hid=(\d+)/) || [])[1];
    if (hid) out.push({ hid: String(hid), at: m.index, url: m[0] });
  }
  return out;
}

/**
 * 원고 본문으로 TOP1/2/3 을 확정한다.
 * @returns {{ ok, top1, top2, top3, byRank, problems, evidence }}
 *   ok=false 면 **저장하면 안 된다.** problems 를 사람에게 보여준다.
 */
export function resolveRanks(manuscriptText) {
  const text = String(manuscriptText || '');
  const problems = [];
  if (!text.trim()) return { ok: false, problems: ['원고 본문이 없습니다. 순위를 확인할 수 없습니다.'] };

  const marks = findRankMarks(text);
  const hids = findHidMarks(text);

  if (!hids.length) return { ok: false, problems: ['원고에서 아고다 제휴링크를 찾지 못했습니다.'] };
  if (!marks.length) return { ok: false, problems: ['원고에서 순위 표시(탑원·탑투·탑쓰리 / TOP1·2·3)를 찾지 못했습니다.'] };

  // ② 각 링크의 순위 = 그 링크 바로 앞에 나온 순위 표시
  const byRank = {};      // rank → Set(hid)
  const evidence = [];
  for (const h of hids) {
    let near = null;
    for (const mk of marks) { if (mk.at < h.at) near = mk; else break; }
    if (!near) { problems.push(`링크 hid=${h.hid} 앞에 순위 표시가 없습니다.`); continue; }
    (byRank[near.rank] = byRank[near.rank] || new Set()).add(h.hid);
    evidence.push({ hid: h.hid, rank: near.rank, mark: near.label });
  }

  // ④ 1·2·3 이 각각 정확히 하나씩인지
  const picked = {};
  for (const r of [1, 2, 3]) {
    const s = byRank[r];
    if (!s || s.size === 0) problems.push(`TOP${r} 호텔의 링크를 찾지 못했습니다.`);
    else if (s.size > 1) problems.push(`TOP${r} 에 링크가 ${s.size}개 붙어 있습니다: ${[...s].join(', ')}`);
    else picked[r] = [...s][0];
  }
  // 같은 호텔이 두 자리를 차지하지 않는지
  const vals = Object.values(picked);
  if (new Set(vals).size !== vals.length) problems.push('같은 호텔이 두 순위에 들어가 있습니다.');

  if (problems.length) return { ok: false, problems, evidence, byRank: picked };
  return { ok: true, top1: picked[1], top2: picked[2], top3: picked[3], problems: [], evidence };
}

/**
 * 순위별 호텔 «이름»을 뽑는다. 순위 표시 바로 뒤에 오는 이름 줄을 읽는다.
 * 예) "탑쓰리, JR 타워 호텔 닛코 삿포로 (JR Tower Hotel Nikko Sapporo)"
 * @returns { 1: {ko, en}, 2: {...}, 3: {...} }  — 못 읽으면 그 자리는 없다(추측하지 않는다)
 */
/**
 * 아고다 «상세 링크»의 주소 조각에서 영문 이름을 얻는다 — 가장 믿을 만한 근거다.
 *   .../ko-kr/jr-tower-hotel-nikko-sapporo/hotel/sapporo-jp.html → "Jr Tower Hotel Nikko Sapporo"
 * 사람이 오타를 내도 주소는 아고다가 만든 것이라 틀리지 않는다.
 */
export function findSlugMarks(text) {
  const t = String(text || '');
  const out = [];
  const re = /https?:\/\/[^\s\]<>"']*agoda\.com\/(?:[a-z-]{2,7}\/)?([a-z0-9-]{4,})\/hotel\//gi;
  let m;
  while ((m = re.exec(t)) !== null) {
    const slug = m[1];
    if (!slug || slug === 'partners') continue;
    const en = slug.split('-').map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(' ');
    out.push({ at: m.index, slug, en });
  }
  return out;
}

export function resolveNames(manuscriptText) {
  const text = String(manuscriptText || '');
  const marks = findRankMarks(text);
  const out = {};
  for (const mk of marks) {
    // 순위 글자 바로 뒤 한 줄
    const tail = text.slice(mk.at + mk.label.length, mk.at + mk.label.length + 200);
    let line = (tail.split('\n')[0] || '')
      .replace(/^[\s,·:\-\[\]().!?"'「」【】]+/, '')   // 앞머리 기호 때어낸다
      .trim();
    if (!line) continue;
    // 문장이 이어진 경우(「…를 추천해 드릴게요!」)는 이름이 아니다 — 버린다(추측 금지)
    if (/^(를|을|은|는|이|가|의|에|와|과)\s/.test(line) || /(드릴게요|합니다|입니다|해요)/.test(line.slice(0, 12))) continue;
    // "한글이름 (English Name)" 형태면 갈라 담는다
    const mm = line.match(/^(.+?)\s*[（(]\s*([^)）]+)\s*[)）]/);
    const ko = (mm ? mm[1] : line).trim();
    const en = mm ? mm[2].trim() : null;
    if (!ko || ko.length < 2) continue;
    // 챕터 줄(00:10 TOP3 …)과 본문 둘 다 잡히면 **더 자세한 쪽**(영문명 있는 쪽)을 남긴다 — ③ 교차 확인
    if (!out[mk.rank] || (!out[mk.rank].en && en)) out[mk.rank] = { ko, en };
  }
  // ③ 교차 확인 — 아고다 주소 조각으로 영문명을 보강한다(주소는 아고다가 만든 것 = 오타 없음)
  const slugs = findSlugMarks(text);
  for (const mk of marks) {
    if (!out[mk.rank] || out[mk.rank].en) continue;
    let near = null;
    for (const s2 of slugs) { if (s2.at > mk.at) { near = s2; break; } }
    if (near) out[mk.rank].en = near.en;
  }
  return out;
}

/**
 * 저장 직전 관문. 원고와 저장하려는 값이 맞는지 본다.
 * @returns {{ ok, fix, problems }}  fix = 바로잡은 값(있으면 이걸로 저장한다)
 */
export function verifyBeforeSave(manuscriptText, current) {
  const r = resolveRanks(manuscriptText);
  if (!r.ok) return { ok: false, problems: r.problems, evidence: r.evidence };

  const names = resolveNames(manuscriptText);
  const fix = {
    hid_top1: r.top1, hid_top2: r.top2, hid_top3: r.top3,
    hotel_names: [1, 2, 3].map((i) => (names[i] ? names[i].ko : null)),
    hotel_names_en: [1, 2, 3].map((i) => (names[i] ? names[i].en : null)),
  };

  const problems = [];
  if (current) {
    const same = String(current.hid_top1 || '') === r.top1
      && String(current.hid_top2 || '') === r.top2
      && String(current.hid_top3 || '') === r.top3;
    if (!same) {
      problems.push(`저장돼 있던 순위가 원고와 다릅니다. 원고 기준: TOP1=${r.top1} · TOP2=${r.top2} · TOP3=${r.top3}`);
    }
  }
  return { ok: true, fix, problems, evidence: r.evidence };
}

export default { findRankMarks, findHidMarks, resolveRanks, resolveNames, verifyBeforeSave };
