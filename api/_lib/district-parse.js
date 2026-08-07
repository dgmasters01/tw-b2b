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

// ─────────────────────────────────────────────────────────────
// 🔴 2026-08-07 대표님: *"키워드에 영어로 된 곳은 한국어로 변경되어야 되는 거 아니야."*
//   타이베이 지역 목록에 `Wanhua` `Zhongzheng` `中山區 Zhongshan` 이 한국어와 **나란히** 떠 있었다.
//   보기 흉한 것으로 끝나지 않았다 — **같은 지역이 두 줄·세 줄로 쪼개져 예약 건수가 갈렸다**:
//     중정구 7곳/39건 + Zhongzheng 18곳/132건  → 진짜는 26곳/174건 (4.5배 작게 보였다)
//     중산구 12곳 + Zhongshan 7곳 + 中山區 1곳 → 진짜는 20곳
//   원인: **옛 구글 기반 봇이 `languageCode:'en'` 으로 박아 둔 값**이 그대로 남아 있었고,
//         새 봇(D-069/D-070)은 **빈칸만** 채워서(`is('district', null)`) 영어 값을 영영 안 건드렸다.
//   → 아래 사전으로 **한국어 표준명 하나**로 모은다. 사전에 없으면 **안 건드린다**(엉뚱하게 안 박는 원칙 유지).
// ─────────────────────────────────────────────────────────────
const CANON_ROMAN = {
  'zhongzheng':'중정구', 'wanhua':'완화구', 'zhongshan':'중산구', 'datong':'다퉁구',
  'daan':'다안구', 'songshan':'송산구', 'beitou':'베이터우구', 'xinyi':'신이구',
  'shilin':'스린구', 'neihu':'네이후구', 'nangang':'난강구', 'wenshan':'원산구',
  'ruifang':'루이팡구', 'sanchong':'싼충구', 'banqiao':'반차오구', 'xindian':'신뎬구',
  'shimogyo':'시모교구', 'nakagyo':'나카교구', 'higashiyama':'히가시야마구', 'sakyo':'사쿄구',
  'ukyo':'우쿄구', 'kamigyo':'가미교구', 'fushimi':'후시미구', 'nakamura':'나카무라구',
  'naka':'나카구', 'minami':'남구', 'higashi':'동구', 'nishi':'서구',
  'kita':'북구', 'chuo':'중앙구', 'chuou':'중앙구', 'toshima':'도시마구',
  'shinjuku':'신주쿠구', 'shibuya':'시부야구', 'taito':'다이토구', 'sumida':'스미다구',
  'koto':'고토구', 'ota':'오타구', 'naniwa':'나니와구', 'yodogawa':'요도가와구',
  'tennoji':'덴노지구', 'abeno':'아베노구', 'jongno':'종로구', 'gwangjin':'광진구',
  'jung':'중구', 'seocho':'서초구', 'gangnam':'강남구', 'mapo':'마포구',
  'yongsan':'용산구', 'songpa':'송파구', 'seodaemun':'서대문구', 'wattana':'왓타나',
  'watthana':'왓타나', 'bangrak':'방락', 'phranakhon':'프라나콘', 'ratchathewi':'랏차테위',
  'samphanthawong':'삼판타웡', 'klongsan':'클롱산', 'khlongsan':'클롱산', 'sathon':'사톤',
  'sathorn':'사톤', 'pathumwan':'빠툼완', 'khlongtoei':'클롱토이', 'klongtoey':'클롱토이',
  'huaikhwang':'후아이쾅', 'dusit':'두싯', 'chatuchak':'짜뚜짝', 'bangkapi':'방까삐',
  'phayathai':'파야타이', 'bangna':'방나', 'sukhumvit':'수쿰윗', 'haichau':'하이쩌우',
  'nguhanhson':'오행산', 'phuocmy':'프억미', 'myan':'미안', 'sontra':'선짜',
  'anhaibac':'안하이박', 'dienbandong':'디엔반동', 'hoacuongbac':'호아끄엉박', 'anhai':'안하이',
  'anhaitay':'안하이떠이', 'anhaidong':'안하이동', 'haivan':'하이번', 'thanhkhe':'탄케',
  'mykhe':'미케', 'anthuong':'안트엉', 'lienchieu':'리엔찌에우', 'benthanh':'벤탄',
  'phamngulao':'팜응우라오', 'saigon':'사이공', 'bennghe':'벤응에', 'cogiang':'꼬장',
  'tanphong':'떤퐁', 'nguyenthaibinh':'응우옌타이빈', 'cauonglanh':'꺼우옹란', 'binhthanh':'빈탄',
  'dakao':'다카오', 'tanhung':'떤흥', 'caukho':'꺼우코', 'anphu':'안푸',
  'thanhmytay':'탄미떠이', 'tandinh':'떤딘', 'vothisau':'보티사우', 'ankhanh':'안칸',
  'nguyencutrinh':'응우옌끄찐', 'onglanh':'옹란', 'nguhnhson':'오행산', 'phunhuan':'푸년',
  'tanbinh':'떤빈',
};
const CANON_HANJA = {
  '中山區':'중산구', '萬華區':'완화구', '中正區':'중정구',
  '大同區':'다퉁구', '松山區':'송산구', '信義區':'신이구',
  '大安區':'다안구', '士林區':'스린구', '北投區':'베이터우구',
  '內湖區':'네이후구', '南港區':'난강구', '文山區':'원산구',
};

/** 지역 이름 하나 → 한국어 표준명. 모르면 원래 값 그대로(null 아님). */
export function canonDistrict(name) {
  if (!name) return null;
  const s = String(name).trim();
  if (!s) return null;
  for (const hz of Object.keys(CANON_HANJA)) if (s.includes(hz)) return CANON_HANJA[hz];
  if (/[가-힣]/.test(s)) return s;                       // 이미 한국어 → 그대로
  const n = norm(s);
  if (CANON_ROMAN[n]) return CANON_ROMAN[n];
  // 주소 조각이 통째로 들어온 경우 ("Chongqing S. Rd. Zhongzheng") — 긴 열쇠부터 포함 검사
  for (const k of Object.keys(CANON_ROMAN).sort((a, b) => b.length - a.length)) {
    if (k.length >= 5 && n.includes(k)) return CANON_ROMAN[k];
  }
  return s;                                              // 사전에 없으면 건드리지 않는다
}

/** 한국어로 못 바꾸는(=사전에 없는) 이름인가 — 감사봇이 이걸로 「섞임」을 잡는다. */
export function isNonKoDistrict(name) {
  const c = canonDistrict(name);
  return !!c && !/[가-힣]/.test(c);
}

export default { districtOf, districtFromAny, canonDistrict, isNonKoDistrict };

