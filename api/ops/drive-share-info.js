// api/ops/drive-share-info.js
// 🔴 2026-09-02 — 대표님께 «어느 폴더를 · 누구에게» 공유하면 되는지 알려준다.
//
// 왜 필요한가:
//   서비스 계정은 자기 저장 공간이 0GB 라 대표님이 폴더를 «편집자»로 공유해 주셔야 파일을 넣을 수 있다.
//   그러려면 서비스 계정 이메일(client_email)이 필요하다.
//
// 🔴 안전 판정:
//   서비스 계정 JSON 에는 client_email 과 private_key 가 있다.
//   client_email = «누구에게 권한을 줄지» 지정하는 주소일 뿐이다. 이것만으로는 아무도 접속 못 한다.
//   private_key = 진짜 열쇠. 🔴 이 창구는 private_key 를 «절대» 내보내지 않는다.
//   구글 공식 문서도 공유 대상으로 client_email 을 쓰라고 안내한다.

import { getDriveToken, ensureFolder } from '../_lib/drive.js';

export const config = { maxDuration: 30 };

function rootId() {
  const raw = process.env.DRIVE_WATCH_FOLDERS || process.env.DRIVE_FOLDERS;
  if (!raw) throw new Error('DRIVE_WATCH_FOLDERS 가 없습니다.');
  const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return o.root || o.ROOT;
}

function authOk(req) {
  const ops = process.env.CLAUDE_OPS_TOKEN || process.env.OPS_TOKEN;
  return !!ops && (req.headers['x-ops-token'] || '') === ops;
}

export default async function handler(req, res) {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: '권한이 없습니다.' });

  try {
    const raw = process.env.GOOGLE_DRIVE_SA_KEY || process.env.DRIVE_SA_KEY;
    if (!raw) throw new Error('GOOGLE_DRIVE_SA_KEY 가 없습니다.');
    const sa = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // 🔴 client_email 만 꺼낸다. private_key 는 건드리지 않는다.
    const email = sa.client_email;

    // 폴더가 이미 있으면 그 id, 없으면 만든다 (폴더 만들기는 서비스 계정도 된다 — 실측 확인)
    const token = await getDriveToken(raw);
    const root = rootId();
    const folderId = await ensureFolder(token, 'TW-DB-백업', root);

    return res.status(200).json({
      ok: true,
      폴더이름: 'TW-DB-백업',
      폴더주소: 'https://drive.google.com/drive/folders/' + folderId,
      공유할대상: email,
      권한: '편집자',
      순서: [
        '1) 위 «폴더주소» 를 눌러 폴더를 엽니다',
        '2) 오른쪽 위 «공유» 를 누릅니다',
        '3) «공유할대상» 주소를 붙여넣고 «편집자» 로 고릅니다',
        '4) 알림 보내기는 꺼도 됩니다 (로봇이라 메일을 안 읽습니다) → 보내기',
        '5) 끝나면 클로드에게 «공유했다» 고 말씀만 주세요. 제가 바로 확인해 드립니다',
      ],
      주의: '이 주소는 «누구에게 권한을 줄지» 지정하는 이름일 뿐이라 안전합니다. 진짜 열쇠(private_key)는 이 창구가 절대 내보내지 않습니다.',
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e && e.message || e).slice(0, 300) });
  }
}
