// api/cron/booking-health.js
// BL-BOOKING-HEALTH — 아고다 예약 ↔ 호텔 마스터 **무결성 감시 봇** (2026-07-27 신설)
//
// 왜 만들었나 (D-074 §4-2-I · 대표님 지시):
//   매달 아고다 예약을 새로 올릴 때마다 마스터에 없는 호텔이 생겼고,
//   아무도 모른 채 쌓이다가 **대표님이 화면에서 발견**했다 (79건 · $13,760).
//   "내가 확인하고 계속 이야기할 수 없잖아. 시스템에서 로직에서 방법을 찾아야 됨."
//   → 업로드 때 자동 등록(api/admin.js)이 1차 방어, 이 봇이 2차 그물이다.
//
// 무엇을 하나
//   ① 마스터에 못 붙은 예약(hotel_id IS NULL)을 찾는다
//   ② 그 중 아고다 id 로 이미 마스터에 있는 것은 **자동으로 이어 붙인다** (놓친 연결 복구)
//   ③ 진짜 없는 호텔은 **마스터에 자동 등록**하고 예약에 연결한다 (status='auto')
//   ④ 손 못 댄 것이 남으면 메일로 알린다. 0이면 안 보낸다(소음 방지).
//
// 실행: Vercel Cron 매일 KST 09시(UTC 00시). 업로드는 사람이 아무 때나 하므로 하루 한 번이면 충분하다.
// 검증/수동: x-ops-token 또는 x-cron-token. ?dry_run=1 이면 보기만 하고 안 고친다.
//            ?limit=N 으로 한 번에 처리할 건수 조절(기본 300 · 상한 1000).

import { createClient } from '@supabase/supabase-js';
import { sendOpsEmail } from '../_lib/email-sender.js';

export const config = { maxDuration: 60 };

function authOk(req) {
  const cron = process.env.CRON_SECRET;
  const ops = process.env.CLAUDE_OPS_TOKEN;
  const h = req.headers;
  if (cron && (h['x-cron-token'] || '') === cron) return true;
  if (cron && (h['authorization'] || '') === 'Bearer ' + cron) return true;
  if (ops && (h['x-ops-token'] || '') === ops) return true;
  return false;
}

function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** 1,000줄씩 끊어 전부 읽는다. 「받은 게 전부」라고 믿지 않는다(63). */
async function readAll(sb, table, select, tune) {
  const out = [];
  for (let from = 0; from < 100000; from += 1000) {
    let q = sb.from(table).select(select).range(from, from + 999);
    if (tune) q = tune(q);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || !data.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/** 다음 H-코드 발번 */
async function nextHotelCode(sb) {
  const { data } = await sb.from('hotels').select('hotel_code')
    .like('hotel_code', 'H-%').order('hotel_code', { ascending: false }).limit(1);
  const last = (data && data[0] && data[0].hotel_code) ? parseInt(String(data[0].hotel_code).slice(2), 10) : 0;
  return (last || 0) + 1;
}

export default async function handler(req, res) {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });

  const dry = String(req.query.dry_run || '') === '1';
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit || '300', 10) || 300));
  const forceMail = String(req.query.mail || '') === '1';

  let sb;
  try { sb = admin(); } catch (e) {
    return res.status(500).json({ ok: false, error: '서버 설정 오류', detail: String(e.message || e) });
  }

  try {
    // ── ① 마스터에 못 붙은 예약 ──
    const orphans = await readAll(
      sb, 'bookings_agoda',
      'id,channel_code,booking_id,hotel_id_agoda,hotel_name,hotel_country,hotel_city,hotel_star,booking_amount_usd,booked_at',
      (q) => q.is('hotel_id', null).order('booked_at', { ascending: false })
    );

    // ── 마스터 전체 (agoda id → hotels.id) ──
    const masters = await readAll(sb, 'hotels', 'id,hotel_code,hotel_name,agoda_hotel_ids',
      (q) => q.neq('status', 'deleted'));
    const byAgodaId = {};
    for (const h of masters) {
      const ids = Array.isArray(h.agoda_hotel_ids) ? h.agoda_hotel_ids : [];
      for (const aid of ids) { const k = String(aid); if (k && !byAgodaId[k]) byAgodaId[k] = h; }
    }

    // ── 아고다 id 별로 묶는다 (같은 호텔 예약이 여러 건) ──
    const groups = {};
    const noAgodaId = [];
    for (const b of orphans) {
      const k = b.hotel_id_agoda ? String(b.hotel_id_agoda).trim() : '';
      if (!k) { noAgodaId.push(b); continue; }          // 아고다 id 조차 없으면 붙일 근거가 없다
      (groups[k] || (groups[k] = { agoda_id: k, rows: [], name: b.hotel_name || null,
        country: b.hotel_country || null, city: b.hotel_city || null, star: b.hotel_star || null })).rows.push(b);
    }

    const relinked = [];    // ② 마스터에 이미 있었는데 안 붙어 있던 것
    const created = [];     // ③ 새로 만든 것
    const failed = [];
    let codeSeq = await nextHotelCode(sb);   // dry 에서도 실제로 붙을 번호를 보여준다
    let done = 0;

    for (const k of Object.keys(groups)) {
      if (done >= limit) break;
      const g = groups[k];
      let target = byAgodaId[k] || null;

      if (!target) {
        // ③ 진짜 없는 호텔 → 마스터에 만든다. 근거는 아고다 원본뿐. 없는 값은 비워 둔다.
        if (!g.name) { failed.push({ agoda_id: k, why: '이름이 없어 만들 수 없습니다' }); continue; }
        const code = 'H-' + String(codeSeq).padStart(5, '0');
        if (dry) {
          created.push({ hotel_code: code + '(예정)', name: g.name, agoda_id: k, country: g.country, bookings: g.rows.length });
          codeSeq += 1; target = { id: null, hotel_code: code };
        } else {
          const { data: ins, error: ie } = await sb.from('hotels').insert({
            hotel_code: code,
            hotel_name: g.name,
            agoda_hotel_ids: [k],
            country: g.country || null,
            city: g.city || null,
            star_rating: g.star != null ? String(g.star) : null,
            status: 'auto',                     // 사람이 확인해야 할 것
            merge_status: 'auto_from_booking',  // 어디서 왔는지 남긴다
            operating_status: 'unknown',
          }).select('id,hotel_code').single();
          if (ie || !ins) { failed.push({ agoda_id: k, name: g.name, why: String((ie && ie.message) || '등록 실패') }); continue; }
          codeSeq += 1;
          target = ins;
          byAgodaId[k] = ins;
          created.push({ hotel_code: ins.hotel_code, name: g.name, agoda_id: k, country: g.country, bookings: g.rows.length });
        }
      } else {
        relinked.push({ hotel_code: target.hotel_code, name: target.hotel_name, agoda_id: k, bookings: g.rows.length });
      }

      // 예약에 연결
      if (!dry && target && target.id) {
        const ids = g.rows.map((r) => r.id);
        for (let i = 0; i < ids.length; i += 300) {
          const { error: ue } = await sb.from('bookings_agoda')
            .update({ hotel_id: target.id }).in('id', ids.slice(i, i + 300));
          if (ue) failed.push({ agoda_id: k, why: '연결 실패: ' + ue.message });
        }
      }
      done += 1;
    }

    const remaining = Object.keys(groups).length - done;
    const out = {
      ok: true, dry_run: dry,
      orphan_bookings: orphans.length,            // 못 붙은 예약 건수
      orphan_hotels: Object.keys(groups).length,  // 그게 몇 개 호텔인지
      relinked_count: relinked.length,            // 이미 있었는데 안 붙어 있던 것 (놓친 연결)
      created_count: created.length,              // 새로 만든 호텔
      no_agoda_id: noAgodaId.length,              // 아고다 id 가 없어 손 못 대는 예약
      failed_count: failed.length,
      remaining_hotels: remaining,                // 이번 배치에서 못 다 한 것
      masters_loaded: masters.length,             // 매칭 후보로 실제 읽은 호텔 수
      relinked: relinked.slice(0, 50),
      created: created.slice(0, 100),
      failed: failed.slice(0, 30),
      no_agoda_id_sample: noAgodaId.slice(0, 20).map((b) => ({
        channel: b.channel_code, booking_id: b.booking_id, hotel_name: b.hotel_name, booked_at: b.booked_at,
      })),
    };

    // ── ④ 알림: 손댈 게 있었을 때만. 조용하면 안 보낸다. ──
    const worthMail = (created.length + relinked.length + failed.length + noAgodaId.length) > 0;
    if (!dry && (forceMail || worthMail)) {
      const lines = [
        '아고다 예약 ↔ 호텔 마스터 점검 결과',
        '',
        `못 붙어 있던 예약: ${orphans.length}건 (호텔 ${Object.keys(groups).length}곳)`,
        `  · 마스터에 있었는데 연결이 빠졌던 것: ${relinked.length}곳 → 이어 붙였습니다`,
        `  · 마스터에 없어 새로 만든 호텔: ${created.length}곳 (status=auto)`,
        `  · 아고다 id 가 없어 손 못 댄 예약: ${noAgodaId.length}건`,
        `  · 실패: ${failed.length}건`,
        remaining > 0 ? `  · 이번에 다 못 한 호텔: ${remaining}곳 (내일 이어서 합니다)` : '',
        '',
        created.length ? '새로 만든 호텔 (확인이 필요합니다):' : '',
        ...created.slice(0, 30).map((c) => `  ${c.hotel_code}  ${c.name}  (${c.country || '나라 모름'} · 예약 ${c.bookings}건)`),
        '',
        noAgodaId.length ? '아고다 id 가 없는 예약 — 원본 파일을 확인해 주세요:' : '',
        ...out.no_agoda_id_sample.map((b) => `  ${b.channel} ${b.booking_id} ${b.hotel_name || '(이름 없음)'} ${b.booked_at || ''}`),
        '',
        '스튜디오 → 호텔 메뉴에서 status=auto 인 호텔을 확인하세요.',
      ].filter((x) => x !== '');
      try {
        await sendOpsEmail({
          subject: `[예약 점검] 새 호텔 ${created.length}곳 · 연결 복구 ${relinked.length}곳`,
          text: lines.join('\n'),
        });
        out.mail_sent = true;
      } catch (e) { out.mail_error = String(e.message || e); }
    }

    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ ok: false, error: '점검에 실패했습니다.', detail: String(e.message || e) });
  }
}
