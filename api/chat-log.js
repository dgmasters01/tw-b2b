// /api/chat-log.js
// 인증 게이트 — chat-logs/*.md 파일을 admin 전용으로 보호.
//
// 목적:
//   chat-logs/는 대표님 발언 원문 + Claude 자율 판단 근거 + 막힌 지점을 담음.
//   GitHub repo에는 두되 직접 URL 접근 차단.
//
// 라우팅 (vercel.json):
//   /chat-logs/:slug.md → /api/chat-log?slug=:slug
//   /chat-logs/index.json → /api/chat-log?slug=index
//
// 인증:
//   ① x-admin-token 헤더 = process.env.ADMIN_VIEW_TOKEN  (Claude 자동화용)
//   ② 또는 Supabase Auth 세션 쿠키 (admin 페이지에서 fetch 시) — 추후 확장
//
// 임시 (개발 단계, 헌법 11조):
//   ADMIN_VIEW_TOKEN 미설정 시 대표님 IP allowlist 또는 Referer가 gohotelwinners.com이면 허용.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ALLOWED_REFERRER_HOSTS = ['gohotelwinners.com', 'www.gohotelwinners.com', 'tw-b2b.vercel.app'];

function isAllowedByReferer(req) {
  const ref = req.headers['referer'] || '';
  if (!ref) return false;
  try {
    const u = new URL(ref);
    return ALLOWED_REFERRER_HOSTS.includes(u.host);
  } catch (_) {
    return false;
  }
}

function isAllowedByToken(req) {
  const expected = process.env.ADMIN_VIEW_TOKEN;
  if (!expected) return false;
  const provided = req.headers['x-admin-token'] || '';
  return provided && provided === expected;
}

function isSafeSlug(slug) {
  // 영문/숫자/하이픈/언더스코어만 허용. 경로 탐색 차단.
  return /^[a-z0-9_\-]+$/i.test(slug);
}

export default async function handler(req, res) {
  // CORS: 같은 도메인만
  res.setHeader('Cache-Control', 'private, no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 인증
  const allowed = isAllowedByToken(req) || isAllowedByReferer(req);
  if (!allowed) {
    return res.status(401).json({ error: 'Unauthorized — admin view only' });
  }

  // slug 검증
  const slug = String(req.query.slug || '').trim();
  if (!slug || !isSafeSlug(slug)) {
    return res.status(400).json({ error: 'Invalid slug' });
  }

  // 파일 읽기 (_chat-logs/{slug}.md 또는 _chat-logs/index.json)
  // 폴더명이 _ 접두사인 이유: Vercel 정적 서빙 차단을 위해. 빌드에는 포함됨.
  try {
    const root = process.cwd();
    if (slug === 'index') {
      const buf = await readFile(join(root, '_chat-logs', 'index.json'), 'utf8');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(buf);
    }
    const buf = await readFile(join(root, '_chat-logs', `${slug}.md`), 'utf8');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.status(200).send(buf);
  } catch (e) {
    if (e.code === 'ENOENT') {
      return res.status(404).json({ error: 'Chat log not found', slug });
    }
    console.error('[chat-log] read error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
