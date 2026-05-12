// /api/_lib/admin-log.js
// BL-ADMIN-AUTH (D-026): 접속·실행 로그 박는 공통 헬퍼
//
// 사용:
//   import { logAccess, logAction } from './_lib/admin-log.js';
//   await logAccess({ userId, email, role, path, req });
//   await logAction({ userId, email, role, actionType: 'hotel_approve',
//                     targetType: 'hotel', targetId: 'uuid', targetLabel: '호텔명',
//                     details: { before, after }, result: 'success', req });
//
// 인증된 사용자가 자기 활동을 박을 때만 호출. authenticated RLS INSERT 정책에 의존.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vjsludfjsphwnumuoqaj.supabase.co';
const SUPABASE_SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

// IP 추출 (Vercel header)
function getIp(req) {
  if (!req) return null;
  return (
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers?.['x-real-ip'] ||
    req.socket?.remoteAddress ||
    null
  );
}

// User-Agent 추출
function getUserAgent(req) {
  return req?.headers?.['user-agent'] || null;
}

// Referer 추출
function getReferer(req) {
  return req?.headers?.['referer'] || req?.headers?.['referrer'] || null;
}

// ────────────────────────────────────────────────────────────────
// logAccess: admin 페이지 진입 1줄
// ────────────────────────────────────────────────────────────────

/**
 * @param {Object} opts
 * @param {string} opts.userId       - auth.users.id (UUID)
 * @param {string} opts.email
 * @param {string} opts.role         - owner/admin/staff/readonly/manager
 * @param {string} opts.path         - 접속한 경로
 * @param {Object} [opts.req]        - Express/Next req (IP, UA 추출용)
 * @returns {Promise<{ok:boolean, id?:number, error?:string}>}
 */
export async function logAccess(opts) {
  if (!SUPABASE_SR) {
    return { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' };
  }
  if (!opts.userId || !opts.path) {
    return { ok: false, error: 'userId and path are required' };
  }

  const client = createClient(SUPABASE_URL, SUPABASE_SR, {
    auth: { persistSession: false }
  });

  try {
    const { data, error } = await client
      .from('access_logs')
      .insert({
        user_id: opts.userId,
        email: opts.email || null,
        role: opts.role || null,
        path: opts.path,
        user_agent: getUserAgent(opts.req),
        ip_address: getIp(opts.req),
        referer: getReferer(opts.req),
      })
      .select('id')
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, error: e.message || 'unknown' };
  }
}

// ────────────────────────────────────────────────────────────────
// logAction: 중요 액션 1줄
// ────────────────────────────────────────────────────────────────

/**
 * @param {Object} opts
 * @param {string} opts.userId
 * @param {string} opts.email
 * @param {string} opts.role
 * @param {string} opts.actionType   - 'hotel_approve' / 'hotel_reject' / 'hotel_delete'
 *                                     / 'role_change' / 'invite_send' / 'task_decision' 등
 * @param {string} [opts.targetType] - 'hotel' / 'admin' / 'task'
 * @param {string} [opts.targetId]
 * @param {string} [opts.targetLabel]
 * @param {Object} [opts.details]    - 변경 전후 등 메타
 * @param {string} [opts.result]     - 'success' | 'fail' | 'partial' (기본 success)
 * @param {string} [opts.errorMessage]
 * @param {Object} [opts.req]
 * @returns {Promise<{ok:boolean, id?:number, error?:string}>}
 */
export async function logAction(opts) {
  if (!SUPABASE_SR) {
    return { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' };
  }
  if (!opts.userId || !opts.actionType) {
    return { ok: false, error: 'userId and actionType are required' };
  }

  const client = createClient(SUPABASE_URL, SUPABASE_SR, {
    auth: { persistSession: false }
  });

  try {
    const { data, error } = await client
      .from('action_logs')
      .insert({
        user_id: opts.userId,
        email: opts.email || null,
        role: opts.role || null,
        action_type: opts.actionType,
        target_type: opts.targetType || null,
        target_id: opts.targetId || null,
        target_label: opts.targetLabel || null,
        details: opts.details || null,
        result: opts.result || 'success',
        error_message: opts.errorMessage || null,
        ip_address: getIp(opts.req),
      })
      .select('id')
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, error: e.message || 'unknown' };
  }
}

// ────────────────────────────────────────────────────────────────
// fetchRecentActivity: admin-status 최근 활동 박스용
// ────────────────────────────────────────────────────────────────

/**
 * @param {Object} opts
 * @param {string} opts.userToken    - 호출자의 Bearer JWT (RLS 통과용)
 * @param {number} [opts.limit]      - 기본 30
 * @returns {Promise<{ok:boolean, events?:Array, error?:string}>}
 */
export async function fetchRecentActivity(opts) {
  const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_ANON) {
    return { ok: false, error: 'SUPABASE_ANON_KEY not configured' };
  }
  if (!opts.userToken) {
    return { ok: false, error: 'userToken required (RLS)' };
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${opts.userToken}` } },
    auth: { persistSession: false }
  });

  try {
    const { data, error } = await client
      .from('recent_admin_activity')
      .select('*')
      .limit(opts.limit || 30);

    if (error) return { ok: false, error: error.message };
    return { ok: true, events: data || [] };
  } catch (e) {
    return { ok: false, error: e.message || 'unknown' };
  }
}
