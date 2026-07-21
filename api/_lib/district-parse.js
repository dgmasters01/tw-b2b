// api/_lib/district-parse.js
// ─────────────────────────────────────────────────────────────
// 주소 한 줄 → 지역(동네/구) 한글/현지명. D-069/D-070: 아고다 주소로 지역을 채운다(구글 안 씀).
// ★ 나라마다 지역 체계가 다르다 → 나라별 규칙을 순서대로 시도한다. 새 나라는 규칙만 추가.
//   일본  : "Tenjin Chuo-ku" (동네 + -ku 구)         → 동네/구
//   베트남: "... Phuoc My Ward, Son Tra District"     → Ward(동) 우선
//   태국  : "..., Klongtoeynua, Wattana Bangkok"      → 켓(구) 이름 목록
//   대만  : "No.23, Sec.5, ... Road" (구 자주 없음)   → 구 이름 목록(있을 때만)
// 안전: 못 뽑으면 null (엉뚱한 지역으로 안 박는다) → 진행도에 "규칙 없음"으로 보인다.
// ─────────────────────────────────────────────────────────────

// ── 일본: 동네 이름 + 구(-ku / X Ward) ──
const JP_AREA = {
  tenjin: '텐진', hakata: '하카타', nakasu: '나카스', daimyo: '다이묘', gion: '기온', sumiyoshi: '스미요시',
  imaizumi: '이마이즈미', watanabedori: '와타나베도리', watanabe: '와타나베도리', kiyokawa: '기요카와',
  jigyo: '지교', arato: '아라토', shirogane: '시로가네', ozasa: '오자사', yakuin: '야쿠인', ropponmatsu: '롯폰마쓰',
  ohori: '오호리', nishijin: '니시진', momochi: '모모치', maizuru: '마이즈루', haruyoshi: '하루요시', hakozaki: '하코자키',
  namba: '난바', umeda: '우메다', shinsaibashi: '신사이바시', tennoji: '덴노지', yodoyabashi: '요도야바시',
  dotonbori: '도톤보리', nipponbashi: '닛폰바시', shinsekai: '신세카이', honmachi: '혼마치',
  shinjuku: '신주쿠', shibuya: '시부야', ginza: '긴자', asakusa: '아사쿠사', ueno: '우에노', ikebukuro: '이케부쿠로',
  akihabara: '아키하바라', roppongi: '롯폰기', shinagawa: '시나가와', nihonbashi: '니혼바시', kanda: '간다',
  kawaramachi: '가와라마치', arashiyama: '아라시야마', fushimi: '후시미', gionshijo: '기온', sakae: '사카에', meieki: '메이에키',
};
const JP_WARD = {
  chuo: '중앙구', chuou: '중앙구', chou: '중앙구', naka: '나카구', higashi: '동구', minami: '남구', nishi: '서구',
  kita: '북구', jonan: '성남구', sawara: '사와라구', naniwa: '나니와구', yodogawa: '요도가와구', taito: '다이토구',
  sumida: '스미다구', koto: '고토구', ota: '오타구', nakagyo: '나카교구', shimogyo: '시모교구', sakyo: '사쿄구',
};

// ── 태국(방콕): 켓(구) 이름 → 한글 ──
const TH_KHET = {
  wattana: '왓타나', watthana: '왓타나', sathon: '사톤', sathorn: '사톤', bangrak: '방락', pathumwan: '빠툼완',
  khlongtoei: '클롱토이', klongtoey: '클롱토이', pranakorn: '프라나콘', phranakhon: '프라나콘', huaikhwang: '후아이쾅',
  ratchathewi: '랏차테위', dusit: '두싯', chatuchak: '짜뚜짝', bangkapi: '방까삐', phayathai: '파야타이',
  bangna: '방나', silom: '실롬', sukhumvit: '수쿰윗', thonglor: '통러', ekkamai: '에까마이', ari: '아리',
};

// ── 대만(타이베이): 구(區) 이름 → 한글 ──
const TW_DIST = {
  zhongshan: '중산구', daan: '다안구', "da'an": '다안구', xinyi: '신이구', wanhua: '완화구', zhongzheng: '중정구',
  datong: '다퉁구', songshan: '송산구', shilin: '스린구', beitou: '베이터우구', neihu: '네이후구', nangang: '난강구',
  wenshan: '원산구', ximen: '시먼', ximending: '시먼딩',
};

// ── 베트남: 주요 지역(동/군) → 한글 (없으면 로마자 유지) ──
const VN_MAP = {
  nguhanhson: '오행산', sontra: '선짜', haichau: '하이쩌우', thanhkhe: '탄케', myan: '미안', mykhe: '미케',
  bacmyan: '박미안', anhaibac: '안하이박', anthuong: '안트엉', hoathuantay: '호아투언떠이', lienchieu: '리엔찌에우',
  bennghe: '벤응에', benthanh: '벤탄', binhthanh: '빈탄', phunhuan: '푸년', tanbinh: '떤빈', saigon: '사이공',
  nhieuloc: '니에우록', phamngulao: '팜응우라오', tansonhoa: '떤손호아', district1: '1군', district3: '3군',
  hoankiem: '호안끼엠', badinh: '바딘', tayho: '떠이호', dongda: '동다', caugiay: '꺼우저이', haibatrung: '하이바쯩',
};

// 성조·특수문자 제거 (Đ→d 포함) — 베트남/태국 주소 매칭용
const deaccent = (s) => String(s || '')
  .replace(/đ/gi, 'd')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const norm = (s) => deaccent(s).toLowerCase().replace(/[^a-z]/g, '');
const has = (map, hay) => { for (const k of Object.keys(map)) { if (hay.includes(k)) return map[k]; } return null; };

export function districtOf(address) {
  if (!address) return null;
  const raw = deaccent(String(address));   // 성조 제거본으로 매칭
  const low = raw.toLowerCase().replace(/[-_.]/g, ' ');
  const nn = low.replace(/\s+/g, '');
  const vn = (name) => VN_MAP[norm(name)] || name.trim();   // 베트남 지명 한글화(없으면 로마자)

  // ── ① 일본: 동네 이름 → -ku → X Ward(일본 구 이름) ──
  const jpArea = has(JP_AREA, nn); if (jpArea) return jpArea;
  // ── ② 베트남/동남아: "... Ward"(영어) / "Phuong ..."(베트남어) = 동 우선, 없으면 District/Quan = 군 ──
  const parts = raw.split(',').map((s) => s.trim());
  for (const p of parts) { const m = p.match(/^(.+?)\s+ward$/i); if (m && m[1].length < 30 && !/^\d/.test(m[1])) return vn(m[1]); }
  for (const p of parts) { const m = p.match(/^phuong\s+(.+)$/i); if (m && m[1].length < 30 && !/^\d/.test(m[1])) return vn(m[1]); }
  for (const p of parts) { const m = p.match(/^(.+?)\s+district$/i); if (m && m[1].length < 30 && !/^\d/.test(m[1])) return vn(m[1]); }
  for (const p of parts) { const m = p.match(/^quan\s+(.+)$/i); if (m && m[1].length < 30 && !/^\d/.test(m[1])) return vn(m[1]); }
  // 키워드 없이 지역명만 조각으로 있는 경우 (예: "..., Ngu Hanh Son, Da Nang")
  for (const p of parts) { if (VN_MAP[norm(p)]) return VN_MAP[norm(p)]; }
  // ── ③ 태국: 켓(구) 이름 목록 ──
  const th = has(TH_KHET, nn); if (th) return th;
  // ── ④ 대만: 구(區) 이름 목록 ──
  const tw = has(TW_DIST, nn); if (tw) return tw;
  // ── ⑤ 일본 구(-ku / X Ward) ──
  const jw = raw.match(/([A-Za-z]+)\s+Ward/); if (jw && JP_WARD[jw[1].toLowerCase()]) return JP_WARD[jw[1].toLowerCase()];
  const ku = low.match(/([a-z]+)\s*ku\b/); if (ku) { if (JP_WARD[ku[1]]) return JP_WARD[ku[1]]; if (JP_AREA[ku[1]]) return JP_AREA[ku[1]]; }
  return null; // 규칙 없는 나라·형태 → 안 박는다(진행도에 "규칙 없음")
}

export function districtFromAny(addresses) {
  for (const a of addresses || []) { const d = districtOf(a); if (d) return d; }
  return null;
}
export default { districtOf, districtFromAny };
