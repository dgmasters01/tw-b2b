// api/cron/hotel-geo-fill.js
// BL-HOTEL-GEO — 호텔 마스터 좌표·지역 자동 채우기 (**자동 입구**)
//
// 확정 (2026-07-15 대표님 A안):
//   하루 3회 × 45건 = 135건/일. 3,179개 → 약 24일(8월 초) 자동 완료.
//   ⚠️ 왜 50이 아니라 45인가: 구글 콘솔 SearchTextRequest **하루 150** 은 이 봇 전용이 아니다.
//      api/google-places.js(B2B 가입 시 호텔 검색)가 같은 한도를 쓴다.
//      3×50=150 이면 그날 가입 흐름의 호텔 검색이 막힌다. 15건은 가입 몫으로 남긴다.
//
// 실행: Vercel Cron (vercel.json crons) — UTC 08·12·16시 = KST 17·21·01시.
//       ⚠️ 구글 하루 한도는 **태평양 자정**(KST 16시경)에 리셋된다.
//          이 3회는 같은 태평양 하루(PT 01·05·09시) 안에 들어간다. 시간 바꿀 때 이거 깨지 말 것.
// 메일 (BL-HOTEL-GEO-MAIL · 2026-07-16 대표님 지시):
//   하루 1통. **UTC 16시 회차 = 그날 마지막 회차**에서만 보낸다(3회 다 돈 뒤라 숫자가 그날의 결론).
//   그날 채운 게 0이면 안 보낸다(소음). 다 끝나면(remaining=0) "이제 이 봇 꺼도 됩니다" 라고 알린다.
//   ?mail=1 로 아무 때나 강제 발송(검증용). dry_run 이면 절대 안 보냄.
// 검증/수동: x-ops-token 또는 x-cron-token 헤더. ?dry_run=1 이면 대상만 보고 안 고침.
//            ?limit=N 으로 배치 조절(상한 50).
//
// 로직은 여기 없다 → `api/_lib/hotel-geo.js` (FIELD_MASK 경고도 거기).

import { runGeoFill, countRemaining, geoStats, CRON_BATCH, MAX_BATCH } from '../_lib/hotel-geo.js';
import { sendOpsEmail } from '../_lib/email-sender.js';

export const config = { maxDuration: 60 };

function authOk(req) {
  const cron = process.env.CRON_SECRET;
  const ops = process.env.CLAUDE_OPS_TOKEN;
  const h = req.headers;
  if (cron && (h['x-cron-token'] || '') === cron) return true;
  // Vercel Cron 은 Authorization: Bearer <CRON_SECRET> 로 호출한다.
  if (cron && (h['authorization'] || '') === 'Bearer ' + cron) return true;
  if (ops && (h['x-ops-token'] || '') === ops) return true;
  return false;
}

export default async function handler(req, res) {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });

  const q = req.query || {};
  const dryRun = q.dry_run === '1' || q.dry_run === 'true';
  const limit = Math.min(parseInt(q.limit) || CRON_BATCH, MAX_BATCH);
  const city = q.city || null;

  const started = new Date().toISOString();
  // 🔴 retry=1 — 한 번 못 찾은 호텔(not_found)을 다시 본다 (2026-07-17 대표님).
  //    "이런 경우 추후 따로 찾아서 줄 수 있도록 무언가 장치가 필요할 것 같은데."
  const retry = q.retry === '1' || q.retry === 'true';

  // 🔴 2026-08-03 대표님 B안 유임 — **아고다로 못 찾은 것만 구글이 본다.**
  //   예전엔 둘이 서로 모르고 각자 정해진 시각에 돌았다. 할 일이 없어도 돌았다.
  //   이제 순서가 있다: 아고파일(무료) → 못 찾으면 표시 → 구글(유료)은 그것만.
  //   할 일이 없으면 **한 건도 안 부르고 끝난다** — 한 달 한도를 손도 안 대는다.
  //   `force=1` 이면 이 순서를 건너뛴다(사람이 직접 돌릴 때).
  const forceRun = q.force === '1';
  // 🔴 2026-08-08 (D-085) — mode=district 는 «좌표 없는 호텔» 게이트를 지나간다.
  //   이 모드의 대상은 «좌표는 있는데 지역이 없는» 호텔이라 아래 게이트에 걸리면 영원히 못 돈다.
  const mode = q.mode === 'district' ? 'district' : 'geo';
  if (!forceRun && mode === 'geo') {
    let waiting = 0;
    try {
      const r = await fetch(`${process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}`
        + `/rest/v1/hotels?latitude=is.null&select=id&limit=1`,
        { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, Prefer: 'count=exact' } });
      const cr = r.headers.get('content-range') || '';
      waiting = parseInt((cr.split('/')[1] || '0'), 10) || 0;
    } catch { waiting = -1; }   /* 못 재면 그냥 진행(안전) */
    if (waiting === 0) {
      return res.status(200).json({ ok: true, skipped: true, reason: '좌표 없는 호텔이 없습니다 — 구글 호출 0건',
        note: '아고다 파일로 먼저 채우고(hotel-addr-fill), 그걸로 못 찾은 것만 여기서 봅니다.' });
    }
  }

  const { status, body } = await runGeoFill({ city, limit, dry_run: dryRun, retry, mode });

  let remaining = null;
  try { remaining = await countRemaining(); } catch (e) { /* 보고용일 뿐 */ }

  // 🔴 2026-08-03 대표님: *"문제가 있을때만 보내는게 맞지 않나?"* — 맞다.
  //   예전엔 **매일 「진행 중」 메일을 보냈다.** 좋은 소식도 매일 오면 소음이 된다.
  //   게다가 좌표는 **99.7% 끝났고**(미확보 9곳, 그마저 아고다 파일에도 없는 숙소) 알릴 일이 없다.
  //   → 보내는 때: ① 다 끝났을 때 한 번(「이제 꺼도 됩니다」) ② 사람이 봐야 할 것이 생겼을 때 ③ 강제 요청
  //     그 외 진행 상황은 관리자 화면에서 본다.
  const force = q.mail === '1';
  const done = remaining === 0;
  let mail = null;
  // 🔴 2026-08-04 — 「사람이 볼 것」도 **숫자가 늘었을 때만** 알린다.
  //   이름이 헷갈리는 곳 4·못 찾은 곳 6은 어제도 그랬고 내일도 그렇다.
  //   그대로 두면 **매일 같은 메일**이 간다 — 그러면 안 열게 되고 진짜 문제가 묻힌다.
  //   지난번보다 늘었을 때만 보낸다. 현재 수는 관리자 화면에서 본다.
  let needEye = false;
  if (!dryRun) {
    try {
      const st0 = await geoStats();
      const now = (st0.manual_check || 0) + (st0.not_found || 0);
      let before = -1;
      try {
        const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/ops_flag?key=eq.geo_eye_count&select=value`,
          { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } });
        const j = await r.json();
        before = (Array.isArray(j) && j[0]) ? parseInt(j[0].value, 10) : -1;
      } catch { /* 모르면 처음으로 본다 */ }
      needEye = now > 0 && now > before;
      if (now !== before) {
        try {
          await fetch(`${process.env.SUPABASE_URL}/rest/v1/ops_flag`, { method: 'POST',
            headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({ key: 'geo_eye_count', value: String(now) }) });
        } catch { /* 무시 */ }
      }
    } catch { /* 못 재면 안 보낸다 */ }
  }
  // 🔴 2026-08-04 — 「다 끝났음」 메일이 **매일** 갔다.
  //   끝난 상태(remaining=0)는 내일도 모레도 사실이니 매번 조건을 만족한다.
  //   → **처음 끝났을 때 한 번만** 보낸다. 보낸 사실을 적어둔다(_os 플래그 대신 DB).
  let alreadyTold = false;
  if (done && !force) {
    try {
      const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/ops_flag?key=eq.geo_done_mailed&select=key`,
        { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } });
      const j = await r.json();
      alreadyTold = Array.isArray(j) && j.length > 0;
    } catch { /* 못 보면 그냥 보낸다 */ }
  }
  if (!dryRun && (force || (done && !alreadyTold) || needEye)) {
    try {
      const st = await geoStats();
      mail = await sendGeoMail(st, body);
      if (done && !alreadyTold) {   /* 한 번 보냈다고 적어둔다 */
        try {
          await fetch(`${process.env.SUPABASE_URL}/rest/v1/ops_flag`, { method: 'POST',
            headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({ key: 'geo_done_mailed', value: new Date().toISOString() }) });
        } catch { /* 무시 */ }
      }
    } catch (e) {
      mail = { ok: false, error: String(e.message || e).slice(0, 200) };
    }
  }

  return res.status(status).json({
    ...body,
    cron: { started_at: started, batch: limit, remaining_hotels: remaining },
    mail,
  });
}

function bar(pct) {
  const n = Math.round(pct / 5);
  return '█'.repeat(n) + '░'.repeat(20 - n);
}

async function sendGeoMail(st, body) {
  if (!st) return { ok: false, error: 'stats 없음' };
  const pct = st.total ? Math.round((st.filled / st.total) * 1000) / 10 : 0;
  const finished = st.remaining === 0;
  const todayOk = (body && body.result && body.result.ok) || 0;

  /* 제목은 「진행 중」이 아니라 「끝남」 또는 「볼 것 있음」만 나간다 */
  const subject = finished
    ? `[좌표] 🎉 채울 것을 다 채웠습니다 — ${st.filled}/${st.total}개`
    : `[좌표] 오늘 ${todayOk}개 채움 · 누적 ${st.filled}/${st.total} (${pct}%) · 완료 예정 ${st.eta}`;

  const rows = [
    ['오늘 채운 호텔', `${todayOk}개`],
    ['누적', `${st.filled} / ${st.total}개 (${pct}%)`],
    /* 🔴 2026-08-04 — 「남은 호텔 0개」인데 실제로는 좌표 없는 곳이 9곳 있었다.
       한 번 못 찾은 곳(not_found·manual_check)은 「남은 것」에서 빠져 있어서다.
       숨기면 안 된다 — 사실대로 적는다. */
    ['다음에 채울 것', `${st.remaining}개`],
    ['좌표가 없는 곳', `${(st.total || 0) - (st.filled || 0)}개` + (((st.total || 0) - (st.filled || 0)) > (st.remaining || 0) ? ' (그중 ' + (((st.total || 0) - (st.filled || 0)) - (st.remaining || 0)) + '곳은 한 번 찾다 실패해 멈췄 있음)' : '')],
    ['남은 날짜', finished ? '끝' : `약 ${st.days_left}일 (예상 완료 ${st.eta})`],
    ['주소도 받은 호텔', `${st.with_address}개`],
    ['사람이 볼 것', `이름이 헷갈리는 곳 ${st.manual_check}개 · 못 찾은 곳 ${st.not_found}개`],
    ['이번 달 구글 사용', `${st.monthly_used} / ${st.monthly_cap}건 (무료 범위)`],
  ];

  const html = `<div style="font-family:-apple-system,'Segoe UI',sans-serif;max-width:560px">
<h2 style="margin:0 0 4px;font-size:18px;font-weight:500">호텔 좌표 채우기 ${finished ? '완료' : '진행 중'}</h2>
<p style="margin:0 0 16px;color:#666;font-size:13px">좌표·주소는 <b>아고다 호텔 파일(무료)로 먼저</b> 채우고, 거기서 못 찾은 것만 구글 지도가 봅니다(매일 오후 4시 · 할 일 없으면 호출 0건).</p>
<div style="font-family:monospace;font-size:14px;letter-spacing:-1px;color:#1D9E75">${bar(pct)} ${pct}%</div>
<table style="border-collapse:collapse;margin-top:14px;font-size:14px;width:100%">
${rows.map(([k, v]) => `<tr><td style="padding:7px 12px 7px 0;color:#666;white-space:nowrap">${k}</td><td style="padding:7px 0;font-weight:500">${v}</td></tr>`).join('')}
</table>
${finished
    ? '<p style="margin-top:16px;padding:12px;background:#E1F5EE;border-radius:8px;font-size:13px">채울 수 있는 것은 다 채웠습니다. <b>봇은 그대로 둡니다</b> — 새 콘텐츠에 아고다에 없는 호텔이 나오면 그때 구글이 찾습니다. 할 일이 없는 날은 한 건도 부르지 않으므로 비용은 0원입니다. <b>이 메일은 다시 안 옵니다.</b></p>'
    : '<p style="margin-top:16px;color:#888;font-size:12px">대표님이 하실 일은 없습니다. 다 끝나면 이 메일이 알려드립니다.</p>'}
</div>`;

  const text = `호텔 좌표 채우기 ${finished ? '완료' : '진행 중'}\n\n`
    + rows.map(([k, v]) => `${k}: ${v}`).join('\n');

  return await sendOpsEmail({ subject, html, text });
}
