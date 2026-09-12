// api/ops/_opslog.js — 작업 창구 사용 기록 (2026-09-12 · SHOP_ROLLBACK §76)
//
// 🔴 왜 — 2026-09-11 공개 레포에 창구 열쇠가 새었는데, «그 열쇠가 실제로 쓰였는지»를 알 수가 없었다.
//    기록이 없으면 사고 뒤에 «무슨 일이 있었나»를 영영 모른다. 그래서 성공·거절을 모두 남긴다.
// 🔴 기록 실패가 작업을 막지 않는다 — 항상 조용히 넘어간다.
// 🔴 IP 는 앞 세 칸만 남긴다(34.148.229.x) — 누가 왔는지 가늠만 하고 개인정보는 남기지 않는다.
const MGMT = 'https://api.supabase.com';
const q = (s) => `'${String(s ?? '').replace(/'/g, "''").slice(0, 200)}'`;

export async function opsLog({ ref, door, kind, target, ok, req, note }) {
  try {
    const tok = process.env.SUPABASE_ACCESS_TOKEN;
    if (!tok || !ref) return;
    const ip = String((req && req.headers && req.headers['x-forwarded-for']) || '')
      .split(',')[0].trim().split('.').slice(0, 3).join('.') + '.x';
    const sql = `insert into ops_log (door, kind, target, ok, ip, note) values (`
      + `${q(door)}, ${q(kind)}, ${q(target)}, ${ok ? 'true' : 'false'}, ${q(ip)}, ${note ? q(note) : 'null'})`;
    await fetch(`${MGMT}/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', 'User-Agent': 'ops-log' },
      body: JSON.stringify({ query: sql })
    });
  } catch (e) { /* 기록 실패는 넘어간다 */ }
}
