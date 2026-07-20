// api/_lib/district-parse.js
// ─────────────────────────────────────────────────────────────
// 주소 한 줄 → 지역(동네/구) 한글. D-069: 아고다 주소로 지역을 채운다(구글 안 씀).
//   아고다 형식: "3-5-18 Tenjin Chuo-ku, Fukuoka-shi"  (동네 + -ku 구)
//   구글 형식  : "…, Naniwa Ward, Osaka, …"           (X Ward)
//   비일본     : "…, Xtumnu, Bangkok" 등 → 아직 미지원(null → "주소 못 찾음"에 남음)
// 안전: 못 뽑으면 null 을 준다(엉뚱한 지역으로 안 박는다).
// ─────────────────────────────────────────────────────────────

// 동네(사람이 검색하는 단위) — 이름으로 매칭. 도시 무관하게 이름이 곧 지역.
const AREA = {
  // 후쿠오카
  tenjin: '텐진', hakata: '하카타', nakasu: '나카스', daimyo: '다이묘', gion: '기온',
  sumiyoshi: '스미요시', imaizumi: '이마이즈미', watanabedori: '와타나베도리', watanabe: '와타나베도리',
  kiyokawa: '기요카와', jigyo: '지교', arato: '아라토', shirogane: '시로가네', ozasa: '오자사',
  yakuin: '야쿠인', ropponmatsu: '롯폰마쓰', ohori: '오호리', nishijin: '니시진', momochi: '모모치',
  maizuru: '마이즈루', haruyoshi: '하루요시', hakozaki: '하코자키', reisen: '레이센',
  // 오사카
  namba: '난바', umeda: '우메다', shinsaibashi: '신사이바시', tennoji: '덴노지', yodoyabashi: '요도야바시',
  dotonbori: '도톤보리', nipponbashi: '닛폰바시', shinsekai: '신세카이', honmachi: '혼마치', bentencho: '벤텐초',
  // 도쿄
  shinjuku: '신주쿠', shibuya: '시부야', ginza: '긴자', asakusa: '아사쿠사', ueno: '우에노',
  ikebukuro: '이케부쿠로', akihabara: '아키하바라', roppongi: '롯폰기', shinagawa: '시나가와',
  nihonbashi: '니혼바시', hamamatsucho: '하마마쓰초', kanda: '간다', ryogoku: '료고쿠', odaiba: '오다이바',
  // 교토
  kawaramachi: '가와라마치', arashiyama: '아라시야마', fushimi: '후시미', kiyomizu: '기요미즈', karasuma: '가라스마',
  // 나고야
  sakae: '사카에', meieki: '메이에키', kanayama: '가나야마',
};

// 구(ward) — -ku 또는 X Ward
const WARD = {
  chuo: '중앙구', chuou: '중앙구', chou: '중앙구', naka: '나카구',
  higashi: '동구', minami: '남구', nishi: '서구', kita: '북구',
  jonan: '성남구', sawara: '사와라구', naniwa: '나니와구', yodogawa: '요도가와구',
  taito: '다이토구', sumida: '스미다구', koto: '고토구', ota: '오타구', setagaya: '세타가야구',
  nakagyo: '나카교구', shimogyo: '시모교구', kamigyo: '가미교구', sakyo: '사쿄구', ukyo: '우쿄구',
};

export function districtOf(address) {
  if (!address) return null;
  const raw = String(address);
  const n = raw.toLowerCase().replace(/[-,.]/g, ' ');
  const nn = n.replace(/\s+/g, '');

  // 1) 동네 이름 매칭 (사람이 검색하는 단위 — 최우선)
  for (const [k, v] of Object.entries(AREA)) { if (nn.includes(k)) return v; }

  // 2) 구글 "X Ward"
  const w = raw.match(/([A-Za-z]+)\s+Ward/);
  if (w) {
    const key = w[1].toLowerCase();
    if (WARD[key]) return WARD[key];
    if (AREA[key]) return AREA[key];
    return w[1] + '구';           // 모르는 구여도 이름은 살린다
  }

  // 3) 아고다 "-ku"
  const m = n.match(/([a-z]+)\s*ku\b/);
  if (m) {
    if (WARD[m[1]]) return WARD[m[1]];
    if (AREA[m[1]]) return AREA[m[1]];
  }
  return null;                     // 못 뽑으면 안 박는다(안전)
}

// 여러 주소 중 처음으로 지역이 나오는 것을 쓴다
export function districtFromAny(addresses) {
  for (const a of addresses || []) {
    const d = districtOf(a);
    if (d) return d;
  }
  return null;
}

export default { districtOf, districtFromAny };
