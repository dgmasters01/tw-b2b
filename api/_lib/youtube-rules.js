// api/_lib/youtube-rules.js
// _content/youtube/*.md 를 읽어서 "규칙"을 뽑아온다.
//
// 왜 이렇게 하나:
//   _content/README.md 가 이렇게 약속했다 —
//   "대표님: 규칙을 바꾸고 싶으면 이 파일만 고치면 됩니다."
//   그래서 제목 틀 · 파일명 틀 · 해시태그 틀 · 키워드 슬롯 · cid 는
//   코드에 박지 않고 문서에서 읽는다. 문서를 고치면 결과가 바뀐다.
//
// 코드에 남는 것은 "본문 블록을 어떤 순서로 쌓는가" 뿐이다.
// (채널마다 블록 구조 자체가 달라서 틀로 표현할 수 없다. 문서 3장 §3 참조)

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const CHANNELS = ['여행능력자들', '호텔이야', '호텔이곳'];

/** 문서에서 코드블록(```...```)을 전부 뽑는다. */
function codeBlocks(md) {
  const out = [];
  const re = /```[a-z]*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md)) !== null) out.push(m[1].replace(/\s+$/, ''));
  return out;
}

/** 특정 헤딩 바로 다음에 나오는 첫 코드블록. */
function blockAfter(md, headingRe) {
  const h = headingRe.exec(md);
  if (!h) return null;
  const rest = md.slice(h.index);
  const m = /```[a-z]*\n([\s\S]*?)```/.exec(rest);
  return m ? m[1].replace(/\s+$/, '') : null;
}

function parseOne(name, md) {
  const blocks = codeBlocks(md);

  const cidM = /cid\s*=\s*\*{0,2}(\d+)/.exec(md);
  if (!cidM) throw new Error(`RULES_NO_CID:${name}`);

  // 파일명 틀: [도시]호텔_ 로 시작하는 첫 코드블록
  const filename = blocks.find((b) => /^\[도시\]호텔_/.test(b.trim()));
  if (!filename) throw new Error(`RULES_NO_FILENAME:${name}`);

  // 제목 1안 / 2안
  const title1 = blockAfter(md, /###\s*1안[^\n]*/);
  const title2 = blockAfter(md, /###\s*2안[^\n]*/);
  if (!title1) throw new Error(`RULES_NO_TITLE1:${name}`);

  // 해시태그 틀: '#[' 로 시작하는 코드블록
  const hashtags = blocks.find((b) => /^#\[/.test(b.trim()));
  if (!hashtags) throw new Error(`RULES_NO_HASHTAGS:${name}`);

  // 키워드 슬롯 틀
  const keywordSlots = blockAfter(md, /###\s*슬롯 템플릿/);
  if (!keywordSlots) throw new Error(`RULES_NO_KEYWORDS:${name}`);

  // 키워드 글자수 범위 ("400~450자" / "300~450자")
  const lenM = /\*\*(\d{3})~(\d{3})자\*\*/.exec(md);

  return {
    channel: name,
    cid: cidM[1],
    filenameTemplate: filename.trim(),
    titleTemplates: [title1.trim(), title2 ? title2.trim() : null].filter(Boolean),
    hashtagTemplate: hashtags.trim(),
    keywordSlotTemplate: keywordSlots.trim(),
    keywordLen: lenM ? [Number(lenM[1]), Number(lenM[2])] : [300, 450],
    // 4성급 이상만 제목에 성급을 넣는다 (세 문서 공통 · 실측 근거는 각 문서 참조)
    starTitleMin: 4,
  };
}

let _cache = null;

/** 규칙 문서 3개를 읽어 채널별 규칙 객체를 만든다. */
export async function loadRules(baseDir) {
  if (_cache) return _cache;
  const roots = baseDir
    ? [baseDir]
    : [join(process.cwd(), '_content', 'youtube'), join(process.cwd(), '..', '_content', 'youtube')];

  let lastErr;
  for (const root of roots) {
    try {
      const rules = {};
      for (const name of CHANNELS) {
        const md = await readFile(join(root, `${name}.md`), 'utf8');
        rules[name] = parseOne(name, md);
      }
      const byCid = {};
      for (const r of Object.values(rules)) byCid[r.cid] = r;
      _cache = { rules, byCid, root };
      return _cache;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('RULES_NOT_FOUND');
}

/** 테스트에서 캐시를 비운다. */
export function _resetRulesCache() { _cache = null; }

/** 원고 본문에서 채널을 알아낸다 (cid 를 안 줬을 때의 대비책). */
export function detectChannel(text) {
  if (/여행능력자들\.shop|여행능력자들/.test(text)) return '여행능력자들';
  if (/호텔이곳/.test(text)) return '호텔이곳';
  if (/호텔이야/.test(text)) return '호텔이야';
  return null;
}

export { CHANNELS };
