// api/_lib/drive.js
// 구글 드라이브 접근 — 서비스 계정(JWT)으로 REST 직접 호출. 새 라이브러리 없이 node 내장 crypto만 사용.
// BL-YT-DRIVE-WATCH 가 쓴다. 서비스 계정은 최상위 폴더에 "편집자"로 공유돼 있어 읽기+이동 가능.

import crypto from 'node:crypto';

function b64url(x) {
  return Buffer.from(x).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** 서비스 계정 JSON → 액세스 토큰(scope=drive). */
export async function getDriveToken(saJson) {
  const sa = typeof saJson === 'string' ? JSON.parse(saJson) : saJson;
  if (!sa || !sa.client_email || !sa.private_key) throw new Error('서비스 계정 키 형식 오류(client_email/private_key 없음).');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  };
  const unsigned = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(claim));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const sig = signer.sign(sa.private_key);
  const jwt = unsigned + '.' + b64url(sig);

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('드라이브 토큰 발급 실패: ' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

const DRIVE = 'https://www.googleapis.com/drive/v3';

/** 한 폴더의 자식 나열. onlyFolders=true 면 폴더만. */
export async function listChildren(token, parentId, opts = {}) {
  let q = "'" + parentId + "' in parents and trashed=false";
  if (opts.onlyFolders) q += " and mimeType='application/vnd.google-apps.folder'";
  else if (opts.onlyFiles) q += " and mimeType!='application/vnd.google-apps.folder'";
  const url = DRIVE + '/files?q=' + encodeURIComponent(q) +
    '&fields=' + encodeURIComponent('files(id,name,mimeType,modifiedTime)') +
    '&pageSize=200&orderBy=name';
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  const j = await r.json();
  if (!r.ok) throw new Error('폴더 조회 실패: ' + JSON.stringify(j).slice(0, 200));
  return j.files || [];
}

/** 파일 바이트 다운로드 → base64. */
export async function downloadBase64(token, fileId) {
  const r = await fetch(DRIVE + '/files/' + fileId + '?alt=media', {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!r.ok) throw new Error('파일 다운로드 실패: ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  return buf.toString('base64');
}

/** 파일을 다른 폴더로 이동 (부모 교체). 삭제 안 함 — 안전. */
export async function moveFile(token, fileId, addParentId, removeParentId) {
  const url = DRIVE + '/files/' + fileId +
    '?addParents=' + encodeURIComponent(addParentId) +
    '&removeParents=' + encodeURIComponent(removeParentId) +
    '&fields=id,parents';
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const j = await r.json();
  if (!r.ok) throw new Error('파일 이동 실패: ' + JSON.stringify(j).slice(0, 200));
  return j;
}

/** 파일을 휴지통으로 (30일 복구 가능). 확인필요 [지우기]에서 쓴다. */
export async function trashFile(token, fileId) {
  const r = await fetch(DRIVE + '/files/' + fileId + '?fields=id,trashed', {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('휴지통 이동 실패: ' + JSON.stringify(j).slice(0, 200));
  return j;
}

/** 이름에서 채널 코드 뽑기: "여행능력자들 (TW)" → "TW". 없으면 null. */
export function codeFromName(name) {
  const m = String(name || '').match(/\(([A-Za-z0-9_-]{2,20})\)\s*$/);
  return m ? m[1].toUpperCase() : null;
}

/** 최상위 폴더 → { code: {channelName, folderId, wait, done, review} } 구조 해석.
 *  하위 폴더 이름은 대기/완료/확인필요 로 매칭. */
export async function resolveFolders(token, rootId) {
  const channels = await listChildren(token, rootId, { onlyFolders: true });
  const map = {};
  const SUB = { '대기': 'wait', '완료': 'done', '확인필요': 'review' };
  for (const ch of channels) {
    const code = codeFromName(ch.name);
    if (!code) continue;
    const subs = await listChildren(token, ch.id, { onlyFolders: true });
    const entry = { code, channelName: ch.name, folderId: ch.id, wait: null, done: null, review: null };
    for (const s of subs) {
      const key = SUB[s.name.trim()];
      if (key) entry[key] = s.id;
    }
    map[code] = entry;
  }
  return map;
}
