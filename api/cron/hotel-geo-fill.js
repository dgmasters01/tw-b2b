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
  const { status, body } = await runGeoFill({ city, limit, dry_run: dryRun });

  let remaining = null;
  try { remaining = await countRemaining(); } catch (e) { /* 보고용일 뿐 */ }

  // ── 하루 1통 진행 메일
  const isDailyWrap = new Date().getUTCHours() === 16;
  const force = q.mail === '1';
  const didWork = (body && body.result && body.result.ok > 0) || (body && body.processed > 0);
  const done = remaining === 0;
  let mail = null;
  if (!dryRun && (force || (isDailyWrap && (didWork || done)))) {
    try {
      const st = await geoStats();
      mail = await sendGeoMail(st, body);
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

  const subject = finished
    ? `[좌표] 🎉 전부 끝났습니다 — ${st.filled}/${st.total}개 · 이 봇 꺼도 됩니다`
    : `[좌표] 오늘 ${todayOk}개 채움 · 누적 ${st.filled}/${st.total} (${pct}%) · 완료 예정 ${st.eta}`;

  const rows = [
    ['오늘 채운 호텔', `${todayOk}개`],
    ['누적', `${st.filled} / ${st.total}개 (${pct}%)`],
    ['남은 호텔', `${st.remaining}개`],
    ['남은 날짜', finished ? '끝' : `약 ${st.days_left}일 (예상 완료 ${st.eta})`],
    ['주소도 받은 호텔', `${st.with_address}개`],
    ['사람이 볼 것', `이름이 헷갈리는 곳 ${st.manual_check}개 · 못 찾은 곳 ${st.not_found}개`],
    ['이번 달 구글 사용', `${st.monthly_used} / ${st.monthly_cap}건 (무료 범위)`],
  ];

  const html = `<div style="font-family:-apple-system,'Segoe UI',sans-serif;max-width:560px">
<h2 style="margin:0 0 4px;font-size:18px;font-weight:500">호텔 좌표 채우기 ${finished ? '완료' : '진행 중'}</h2>
<p style="margin:0 0 16px;color:#666;font-size:13px">아고다에서 온 호텔에 구글 지도의 좌표·주소를 붙이는 중입니다. 하루 3번, 45개씩 자동으로 돕니다.</p>
<div style="font-family:monospace;font-size:14px;letter-spacing:-1px;color:#1D9E75">${bar(pct)} ${pct}%</div>
<table style="border-collapse:collapse;margin-top:14px;font-size:14px;width:100%">
${rows.map(([k, v]) => `<tr><td style="padding:7px 12px 7px 0;color:#666;white-space:nowrap">${k}</td><td style="padding:7px 0;font-weight:500">${v}</td></tr>`).join('')}
</table>
${finished
    ? '<p style="margin-top:16px;padding:12px;background:#E1F5EE;border-radius:8px;font-size:13px">전부 끝났습니다. <b>vercel.json 의 hotel-geo-fill 크론을 지워도 됩니다.</b> 새 호텔이 들어오면 그때 다시 켜면 됩니다.</p>'
    : '<p style="margin-top:16px;color:#888;font-size:12px">대표님이 하실 일은 없습니다. 다 끝나면 이 메일이 알려드립니다.</p>'}
</div>`;

  const text = `호텔 좌표 채우기 ${finished ? '완료' : '진행 중'}\n\n`
    + rows.map(([k, v]) => `${k}: ${v}`).join('\n');

  return await sendOpsEmail({ subject, html, text });
}
