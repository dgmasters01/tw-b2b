// /api/drive-status.js
// 스튜디오 "올리기" 화면의 구글 드라이브 연결 상태 창구 (D-060 올리기 설계 §2).
//
// 무엇을 하나:
//   ① 드라이브가 연결됐는지(서비스 계정 키·폴더 등록 여부)를 정직하게 알려준다.
//   ② 하루 4번 자동 읽는 시각(06·11·16·21시 KST) 중 "다음 확인 시각"을 산출해 준다.
//   ③ 채널별 대기/완료/확인필요 3폴더 안내를 준다.
//
// 지금 상태(BL-YT-DRIVE-WATCH 미착수):
//   서비스 계정 키·폴더는 대표님이 마지막에 직접 넣는 비밀값이라 아직 env 에 없다.
//   그래서 이 창구는 항상 connected:false 를 정직하게 돌려준다.
//   대표님이 나중에 GOOGLE_DRIVE_SA_KEY + DRIVE_WATCH_FOLDERS 를 넣으면 자동으로 켜진다.
//   (화면은 지금 다 만들어 둔다. 실제 자동 읽기 배치만 그 뒤에 붙인다.)
//
// 부르는 법:
//   GET /api/drive-status
//     신분증: 쿠키 sb-access-token 또는 x-ops-token / 권한: is_editor 이상
//     나오는 것: { ok, is_admin, connected, steps[], folders[], check_hours[], next_check }

export const config = { maxDuration: 10 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

// 하루 4번 고정 (KST). 원고가 없으면 그냥 넘어감(헛돌지 않음).
const CHECK_HOURS = [6, 11, 16, 21];

function accessToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const raw = req.headers['cookie'] || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === 'sb-access-token') return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

async function authorized(req) {
  const expected = process.env.CLAUDE_OPS_TOKEN;
  if (expected && (req.headers['x-ops-token'] || '') === expected) {
    return { ok: true, via: 'ops-token', isAdmin: true };
  }
  const token = accessToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON) return { ok: false };
  const H = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON, 'Content-Type': 'application/json' };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_editor`, { method: 'POST', headers: H, body: '{}' });
    if (!r.ok || (await r.json()) !== true) return { ok: false };
    let isAdmin = false;
    try {
      const a = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, { method: 'POST', headers: H, body: '{}' });
      isAdmin = a.ok && (await a.json()) === true;
    } catch { /* 못 물어보면 안 보여준다 */ }
    return { ok: true, via: 'session', isAdmin };
  } catch {
    return { ok: false };
  }
}

// KST(UTC+9) 기준 다음 확인 시각을 구한다. 서버는 UTC 로 돈다.
function nextCheck() {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 3600 * 1000;
  const kst = new Date(kstMs);
  const h = kst.getUTCHours();
  const m = kst.getUTCMinutes();
  const cur = h + m / 60;
  let target = CHECK_HOURS.find((x) => x > cur);
  let dayOffset = 0;
  if (target === undefined) { target = CHECK_HOURS[0]; dayOffset = 1; } // 오늘 남은 시각 없음 → 내일 첫 시각
  const label = String(target).padStart(2, '0') + ':00';
  // ISO(UTC): target(KST) 시각을 UTC 로 되돌린다.
  const iso = new Date(Date.UTC(
    kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + dayOffset, target, 0, 0
  ) - 9 * 3600 * 1000).toISOString();
  return { label, iso };
}

export default async function handler(req, res) {
  const who = await authorized(req);
  if (!who.ok) return res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'GET 만 지원합니다.' });
  }

  // 연결 판정: 서비스 계정 키 + 폴더 설정이 env 에 둘 다 있어야 연결됨.
  const hasKey = !!(process.env.GOOGLE_DRIVE_SA_KEY || process.env.DRIVE_SA_KEY);
  const hasFolders = !!(process.env.DRIVE_WATCH_FOLDERS || process.env.DRIVE_FOLDERS);
  const connected = hasKey && hasFolders;

  // 연결 0단계 — 3단계 상태(설계 §2). 1·2 는 비밀값이라 대표님이 직접.
  const steps = [
    { n: 1, title: '드라이브에 폴더 만들기', by: 'owner', done: hasFolders,
      hint: '채널마다 대기·완료·확인필요 폴더 3개를 대표님 구글 드라이브에 만듭니다.' },
    { n: 2, title: '서비스 계정 키 등록', by: 'owner', done: hasKey,
      hint: '서비스 계정 키를 넣습니다. 로봇이 대기 폴더를 읽고, 처리 뒤 완료·확인필요로 자동 정리합니다(편집자).' },
    { n: 3, title: '연결 확인', by: 'system', done: connected,
      hint: connected ? '연결됐습니다.' : '위 1·2가 끝나면 자동으로 켜집니다.' },
  ];

  // 폴더 안내(설계 §2) — 채널 3곳 × 3폴더. DB 조회 없이 안내만(실연동 전).
  const folders = [
    { channel: 'TW', name: '여행능력자들', subs: ['대기', '완료', '확인필요'] },
    { channel: 'HT', name: '호텔이야', subs: ['대기', '완료', '확인필요'] },
    { channel: 'HG', name: '호텔이곳', subs: ['대기', '완료', '확인필요'] },
  ];

  // 확인필요 목록(D-060) — 드라이브 워처가 문제 원고를 옮기며 기록한 사유.
  let review = [];
  try {
    const skey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const surl = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
    if (skey) {
      const rr = await fetch(surl + '/rest/v1/drive_review?select=filename,channel_code,reason,updated_at&order=updated_at.desc', {
        headers: { Authorization: 'Bearer ' + skey, apikey: skey },
      });
      if (rr.ok) review = await rr.json();
    }
  } catch { /* 목록 못 읽어도 무해 */ }

  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  return res.status(200).json({
    ok: true,
    is_admin: !!who.isAdmin,
    connected,
    steps,
    folders,
    review,
    check_hours: CHECK_HOURS,
    next_check: nextCheck(),
    note: connected
      ? '드라이브가 연결됐습니다. 대기 폴더에 원고를 넣으면 다음 확인 시각에 자동으로 읽어옵니다.'
      : '아직 연결 전입니다. 화면은 준비됐고, 대표님이 폴더+키를 넣으면 자동 읽기가 켜집니다.',
  });
}
