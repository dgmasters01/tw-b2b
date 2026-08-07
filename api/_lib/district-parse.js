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

// 🔴 2026-08-07 확장 (대표님 «마무리»): 지역 목록이 **통째로 빈 도시가 10곳**이었다
//    (치앙마이 예약 94건 · 세부 83 · 가오슝 57 · 상하이 49 · 하노이 48 …).
//    「어디를 만들까」를 아예 볼 수 없는 상태였다 — 고장이 아니라 **미완성**이었다.
//    ⚠️ 같이 잡은 진짜 버그 2개:
//      ⓐ 파리 주소 `Rue Cambronne` 가 태국 켓 `ari`(아리)에 **부분 일치**해서
//         **파리 호텔에 방콕 지역이 박히고 있었다.** → 나라를 먼저 가른다.
//      ⓑ 대만 `Qianjin District` 가 베트남 규칙에 걸려 **로마자 그대로** 박혔다.
//         → 오늘 고친 「영어 지역명」 병을 파서가 계속 만들고 있었다. → 사전에 없으면 **안 박는다.**

// ── 태국(방콕): 켓(구) 이름 → 한글 ──
const TH_KHET = {
  wattana: '왓타나', watthana: '왓타나', sathon: '사톤', sathorn: '사톤', bangrak: '방락', pathumwan: '빠툼완',
  khlongtoei: '클롱토이', klongtoey: '클롱토이', pranakorn: '프라나콘', phranakhon: '프라나콘', huaikhwang: '후아이쾅',
  ratchathewi: '랏차테위', dusit: '두싯', chatuchak: '짜뚜짝', bangkapi: '방까삐', phayathai: '파야타이',
  bangna: '방나', silom: '실롬', sukhumvit: '수쿰윗', thonglor: '통러', ekkamai: '에까마이', ari: '아리',
  // 치앙마이 (탐본=동)
  phrasing: '프라싱', siphum: '시품', suthep: '수텝', changphueak: '창프억', changkhlan: '창클란',
  changmoi: '창모이', haiya: '하이야', watket: '왓껫', nongpakhrang: '농빠크랑', maehia: '매히아',
  // 푸켓
  patong: '파통', karon: '카론', kata: '카타', choengthale: '방따오', kamala: '카말라', rawai: '라와이',
  talatyai: '푸켓타운', wichit: '위칫', kathu: '까투', thalang: '탈랑', chalong: '찰롱', maikhao: '마이카오',
  // 파타야
  muangpattaya: '파타야중심', nongprue: '농프르', nakluea: '나끌루아', jomtien: '좀티엔',
  najomtien: '나좀티엔', sattahip: '사따힙', banglamung: '방라뭉',
};

// ── 대만(타이베이): 구(區) 이름 → 한글 ──
const TW_DIST = {
  zhongshan: '중산구', daan: '다안구', "da'an": '다안구', xinyi: '신이구', wanhua: '완화구', zhongzheng: '중정구',
  datong: '다퉁구', songshan: '송산구', shilin: '스린구', beitou: '베이터우구', neihu: '네이후구', nangang: '난강구',
  wenshan: '원산구', ximen: '시먼', ximending: '시먼딩',
  // 가오슝
  sanmin: '싼민구', qianjin: '첸진구', sinsing: '신싱구', xinxing: '신싱구', yancheng: '옌청구',
  gushan: '구산구', lingya: '링야구', zuoying: '쭤잉구', qianzhen: '첸전구', cianjin: '첸진구',
  fongshan: '펑산구', fengshan: '펑산구', sizihwan: '시쯔완',
  // 타이중·타이난
  westdistrict: '서구', northdistrict: '북구', anping: '안핑구', zhongxi: '중서구',
};

// ── 홍콩: 지역 → 한글 ──
const HK_AREA = {
  saiyingpun: '사이잉푼', tsimshatsui: '침사추이', northpoint: '노스포인트', sheungwan: '셩완',
  causewaybay: '코즈웨이베이', wanchai: '완차이', central: '센트럴', mongkok: '몽콕', yaumatei: '야우마테이',
  jordan: '조던', kowloon: '카우룽', kowloonbay: '카우룽베이', tokwawan: '토콰완', hunghom: '훙함',
  lantauisland: '란타우섬', tunmun: '툰문', shatin: '샤틴', admiralty: '애드미럴티',
  westkowloon: '서카우룽', kowlooncity: '카우룽시티', quarrybay: '쿼리베이',
};

// ── 중국: 구(區/Qu) → 한글 ──
const CN_QU = {
  huangpu: '황푸구', xuhui: '쉬후이구', changning: '창닝구', jingan: '징안구', putuo: '푸퉈구',
  hongkou: '훙커우구', yangpu: '양푸구', pudong: '푸둥신구', minhang: '민항구', baoshan: '바오산구',
  chaoyang: '차오양구', dongcheng: '둥청구', xicheng: '시청구', haidian: '하이뎬구',
};

// ── 싱가포르: 동네 → 한글 ──
const SG_AREA = {
  orchard: '오차드', marinabay: '마리나베이', sentosaisland: '센토사섬', sentosa: '센토사섬',
  chinatown: '차이나타운', bugis: '부기스', littleindia: '리틀인디아', clarkequay: '클락키',
  robertsonquay: '로버트슨키', joochiat: '주치앗', kallang: '칼랑', tanjongpagar: '탄종파가',
  rafflesplace: '래플즈플레이스', bukittimah: '부킷티마', changi: '창이',
};

// ── 필리핀(세부): 지역 → 한글 ──
const PH_AREA = {
  lapulapu: '라푸라푸', lapulapucity: '라푸라푸', mactanisland: '막탄섬', mactan: '막탄섬',
  cebucity: '세부시티', moalboal: '모알보알', maribago: '마리바고', buyong: '부용', lahug: '라후그',
  banilad: '바닐라드', mandaue: '만다우에', cordova: '코르도바', puntaengano: '푼타엔가뇨',
  cebubusinesspark: '세부비즈니스파크', cebuitpark: '세부IT파크', camotesisland: '카모테스섬',
};

// ── 인도네시아(발리): 지역 → 한글 ──
const ID_AREA = {
  kuta: '쿠타', ubud: '우붓', seminyak: '스미냑', nusadua: '누사두아', jimbaran: '짐바란',
  tuban: '투반', sanur: '사누르', uluwatu: '울루와투', canggu: '창구', legian: '레기안',
  denpasar: '덴파사르', badung: '바둥', gianyar: '기아냐르', padangtegal: '파당테갈',
};

// ── 베트남: 주요 지역(동/군) → 한글 (없으면 로마자 유지) ──
const VN_MAP = {
  nguhanhson: '오행산', sontra: '선짜', haichau: '하이쩌우', thanhkhe: '탄케', myan: '미안', mykhe: '미케',
  bacmyan: '박미안', anhaibac: '안하이박', anthuong: '안트엉', hoathuantay: '호아투언떠이', lienchieu: '리엔찌에우',
  bennghe: '벤응에', benthanh: '벤탄', binhthanh: '빈탄', phunhuan: '푸년', tanbinh: '떤빈', saigon: '사이공',
  nhieuloc: '니에우록', phamngulao: '팜응우라오', tansonhoa: '떤손호아', district1: '1군', district3: '3군',
  hoankiem: '호안끼엠', badinh: '바딘', tayho: '떠이호', dongda: '동다', caugiay: '꺼우저이', haibatrung: '하이바쯩',
  // 호이안 (2026-08-07)
  anhoi: '안호이', sonphong: '손퐁', minhan: '민안', camchau: '껌쩌우', cuadai: '끄어다이',
  tanan: '떤안', camnam: '껌남', camthanh: '껌탄', hoian: '호이안구시가',
  // 나트랑 (2026-08-07)
  hontreisland: '혼째섬', hontre: '혼째섬', bacnhatrang: '북나트랑', locttho: '록토', loctho: '록토',
  tanlap: '떤럽', vinhhoa: '빈호아', vinhnguyen: '빈응우옌', camlam: '깜럼',
  // 푸꾸옥
  duongdong: '즈엉동', anthoi: '안터이', duongto: '즈엉또',
};

// 성조·특수문자 제거 (Đ→d 포함) — 베트남/태국 주소 매칭용
const deaccent = (s) => String(s || '')
  .replace(/đ/gi, 'd')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const norm = (s) => deaccent(s).toLowerCase().replace(/[^a-z]/g, '');
const has = (map, hay) => { for (const k of Object.keys(map)) { if (hay.includes(k)) return map[k]; } return null; };

/** 도시 → 나라 (봇이 도시를 알고 부르면 «다른 나라 규칙»에 안 걸린다) */
const CITY_CC = {
  osaka:'jp', tokyo:'jp', kyoto:'jp', fukuoka:'jp', nagoya:'jp', sapporo:'jp', kitakyushu:'jp', yufu:'jp', okinawa:'jp',
  taipei:'tw', kaohsiung:'tw', taichung:'tw', tainan:'tw',
  bangkok:'th', 'chiang mai':'th', 'chiang rai':'th', phuket:'th', pattaya:'th', krabi:'th',
  hanoi:'vn', 'da nang':'vn', 'ho chi minh city':'vn', 'nha trang':'vn', 'hoi an':'vn', 'phu quoc island':'vn',
  'hong kong':'hk', shanghai:'cn', beijing:'cn', singapore:'sg', cebu:'ph', manila:'ph', bali:'id',
  seoul:'kr', busan:'kr', paris:'fr', london:'gb', rome:'it', prague:'cz', sydney:'au', melbourne:'au',
};

/** 주소 꼬리에 적힌 나라 이름으로도 가른다 (도시를 모를 때) */
function ccOf(raw, city) {
  const c = CITY_CC[String(city || '').toLowerCase().trim()];
  if (c) return c;
  const t = String(raw).toLowerCase();
  if (/\bthailand\b|chang wat|amphoe/.test(t)) return 'th';
  if (/\bvietnam\b|viet nam/.test(t)) return 'vn';
  if (/\btaiwan\b/.test(t)) return 'tw';
  if (/\bjapan\b/.test(t)) return 'jp';
  if (/\bhong kong\b/.test(t)) return 'hk';
  if (/\bchina\b|shi\b.*qu\b/.test(t)) return 'cn';
  if (/\bsingapore\b/.test(t)) return 'sg';
  if (/\bphilippines\b/.test(t)) return 'ph';
  if (/\bindonesia\b/.test(t)) return 'id';
  if (/\bfrance\b/.test(t)) return 'fr';
  return null;
}

/**
 * 주소 한 줄 → 지역(한국어). 모르면 null.
 * 🔴 2026-08-07 — 두 번째 인자로 **도시**를 주면 그 나라 규칙만 쓴다.
 *    안 주면 주소 꼬리의 나라 이름으로 가른다. 둘 다 없으면 예전처럼 순서대로 시도한다.
 *    이 «나라 먼저» 가 없어서 **파리 호텔에 방콕 지역(아리)이 박혔다.**
 * 🔴 사전에 없으면 **로마자를 그대로 박지 않는다**(null). 박으면 화면에 영어가 다시 생긴다.
 */
export function districtOf(address, city) {
  const cc = ccOf(address, city);
  if (cc) {
    const raw0 = deaccent(String(address || ''));
    const nn0 = raw0.toLowerCase().replace(/[-_.]/g, ' ').replace(/\s+/g, '');
    const parts0 = raw0.split(',').map((x) => x.trim());
    const pick = (map) => {
      for (const p of parts0) { const v = map[norm(p)]; if (v) return v; }   // 조각 통째로 일치 우선
      return has(map, nn0);                                                  // 그다음 포함 검사
    };
    if (cc === 'th') {
      const m = raw0.match(/Tambon\s+([A-Za-z ]{3,22})/i) || raw0.match(/Muang\s+([A-Za-z ]{3,22})/i);
      if (m && TH_KHET[norm(m[1])]) return TH_KHET[norm(m[1])];
      return pick(TH_KHET);
    }
    if (cc === 'tw') {
      const m = raw0.match(/([A-Za-z]{3,14})\s+District/i);
      if (m && TW_DIST[norm(m[1])]) return TW_DIST[norm(m[1])];
      return pick(TW_DIST);
    }
    if (cc === 'hk') return pick(HK_AREA);
    if (cc === 'cn') {
      const m = raw0.match(/([A-Za-z]+\s+[A-Za-z]+)\s+Qu\b/i);
      if (m && CN_QU[norm(m[1])]) return CN_QU[norm(m[1])];
      return pick(CN_QU);
    }
    if (cc === 'sg') return pick(SG_AREA);
    if (cc === 'ph') return pick(PH_AREA);
    if (cc === 'id') return pick(ID_AREA);
    if (cc === 'fr') {
      // 파리는 우편번호가 곧 구다 — 75015 → 15구. 사전이 필요 없다.
      const m = String(address).match(/\b75(\d{3})\b/);
      if (m) { const n = parseInt(m[1], 10); if (n >= 1 && n <= 20) return `${n}구`; }
      return null;
    }
    if (cc === 'vn') {
      for (const p of parts0) { const v = VN_MAP[norm(p)]; if (v) return v; }
      for (const p of parts0) { const m = p.match(/^(.+?)\s+(ward|district)$/i); if (m && VN_MAP[norm(m[1])]) return VN_MAP[norm(m[1])]; }
      for (const p of parts0) { const m = p.match(/^(phuong|quan)\s+(.+)$/i); if (m && VN_MAP[norm(m[2])]) return VN_MAP[norm(m[2])]; }
      return null;
    }
    if (cc === 'jp') return districtOfLegacy(address);
    return null;   // 규칙 없는 나라(영국·호주 등) → 안 박는다
  }
  return districtOfLegacy(address);
}

function districtOfLegacy(address) {
  if (!address) return null;
  const raw = deaccent(String(address));   // 성조 제거본으로 매칭
  const low = raw.toLowerCase().replace(/[-_.]/g, ' ');
  const nn = low.replace(/\s+/g, '');
  const vn = (name) => VN_MAP[norm(name)] || null;   // 🔴 사전에 없으면 안 박는다(로마자 유지 금지 · 2026-08-07)

  // ── ① 일본: 동네 이름 → -ku → X Ward(일본 구 이름) ──
  const jpArea = has(JP_AREA, nn); if (jpArea) return jpArea;
  // ── ② 베트남/동남아: "... Ward"(영어) / "Phuong ..."(베트남어) = 동 우선, 없으면 District/Quan = 군 ──
  const parts = raw.split(',').map((s) => s.trim());
  for (const p of parts) { const m = p.match(/^(.+?)\s+ward$/i); if (m && m[1].length < 30 && !/^\d/.test(m[1])) { const v = vn(m[1]); if (v) return v; } }
  for (const p of parts) { const m = p.match(/^phuong\s+(.+)$/i); if (m && m[1].length < 30 && !/^\d/.test(m[1])) { const v = vn(m[1]); if (v) return v; } }
  for (const p of parts) { const m = p.match(/^(.+?)\s+district$/i); if (m && m[1].length < 30 && !/^\d/.test(m[1])) { const v = vn(m[1]); if (v) return v; } }
  for (const p of parts) { const m = p.match(/^quan\s+(.+)$/i); if (m && m[1].length < 30 && !/^\d/.test(m[1])) { const v = vn(m[1]); if (v) return v; } }
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

