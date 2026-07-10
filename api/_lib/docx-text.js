// api/_lib/docx-text.js
// docx(.docx) 파일을 순수 텍스트로 바꾼다.
//
// 왜 직접 만들었나:
//   package.json 에 mammoth 같은 라이브러리를 추가하려면 기존 파일을 고쳐야 한다.
//   이번 작업은 "새 파일만 추가" 이므로, node 기본 모듈(zlib)만으로 zip 을 푼다.
//   docx = zip 파일이고, 그 안의 word/document.xml 하나만 읽으면 된다.
//
// 한계: zip 저장방식이 "저장(0)" 또는 "deflate(8)" 인 경우만 지원한다.
//       Word/Google Docs 가 만드는 docx 는 전부 이 둘 중 하나다.

import { inflateRawSync } from 'node:zlib';

const SIG_EOCD = 0x06054b50;
const SIG_CEN = 0x02014b50;

/** zip 중앙 디렉터리를 읽어 { 파일명 -> Buffer } 로 푼다. */
function unzip(buf) {
  // EOCD(End Of Central Directory) 를 뒤에서부터 찾는다.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('DOCX_NOT_ZIP');

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16); // 중앙 디렉터리 시작 위치

  const out = {};
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== SIG_CEN) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const cmtLen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42); // 로컬 헤더 위치
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

    // 로컬 헤더에서 실제 데이터 시작점을 다시 계산 (extra 길이가 다를 수 있음)
    const lNameLen = buf.readUInt16LE(lho + 26);
    const lExtraLen = buf.readUInt16LE(lho + 28);
    const dataStart = lho + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);

    if (name === 'word/document.xml' || name === 'word/_rels/document.xml.rels') {
      out[name] = method === 0 ? Buffer.from(raw) : inflateRawSync(raw);
      // 본문과 하이퍼링크 목록 둘 다 필요하다. 하나만 찾고 멈추면 링크를 놓친다.
      if (out['word/document.xml'] && out['word/_rels/document.xml.rels']) break;
    }
    p += 46 + nameLen + extraLen + cmtLen;
  }
  if (!out['word/document.xml']) throw new Error('DOCX_NO_DOCUMENT_XML');
  return out;
}

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };

/** word/document.xml → 문단 단위 텍스트 */
function xmlToText(xml) {
  const paras = [];
  // <w:p ...> ... </w:p> 를 문단 하나로 본다.
  const pRe = /<w:p[\s>][\s\S]*?<\/w:p>|<w:p\/>/g;
  let m;
  while ((m = pRe.exec(xml)) !== null) {
    const chunk = m[0];
    let line = '';
    // <w:t>텍스트</w:t> 를 모으고, <w:br/> <w:tab/> 은 공백/줄바꿈으로.
    const tRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:br\s*\/>|<w:tab\s*\/>/g;
    let t;
    while ((t = tRe.exec(chunk)) !== null) {
      if (t[1] !== undefined) line += t[1];
      else if (t[0].startsWith('<w:br')) line += '\n';
      else line += ' ';
    }
    line = line.replace(/&(amp|lt|gt|quot|apos);/g, (s) => ENT[s]);
    // 헤딩(w:pStyle Heading N)이면 마크다운 '#' 을 붙여 원고 파서가 알아보게 한다.
    const h =
      /<w:pStyle\s+w:val="(?:Heading|heading)\s*(\d)"/.exec(chunk) ||
      /<w:outlineLvl\s+w:val="(\d)"/.exec(chunk);
    if (h && line.trim()) {
      const lvl = /outlineLvl/.test(h[0]) ? Number(h[1]) + 1 : Number(h[1]);
      line = '#'.repeat(Math.min(6, Math.max(1, lvl))) + ' ' + line.trim();
    }
    paras.push(line);
  }
  return paras.join('\n\n').replace(/\r/g, '');
}

/**
 * docx 를 텍스트로.
 * @param {Buffer|Uint8Array|string} input  Buffer 또는 base64 문자열
 * @returns {string}
 */
export function docxToText(input) {
  const buf = Buffer.isBuffer(input)
    ? input
    : typeof input === 'string'
      ? Buffer.from(input.replace(/^data:[^,]+,/, ''), 'base64')
      : Buffer.from(input);
  const files = unzip(buf);
  const text = xmlToText(files['word/document.xml'].toString('utf8'));

  // 워드의 하이퍼링크는 본문이 아니라 word/_rels/document.xml.rels 에 따로 산다.
  // 본문만 읽으면 링크를 통째로 놓친다. 뒤에 붙여서 같이 넘긴다.
  const rels = files['word/_rels/document.xml.rels'];
  if (!rels) return text;
  const urls = [...rels.toString('utf8').matchAll(/Target="(https?:\/\/[^"]+)"/g)]
    .map((m) => m[1].replace(/&amp;/g, '&'))
    .filter((u, i, a) => a.indexOf(u) === i);
  if (!urls.length) return text;
  return `${text}\n\n[하이퍼링크]\n${urls.join('\n')}`;
}

export default docxToText;
