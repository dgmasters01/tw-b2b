// api/_lib/email-locale.js
// 메일 언어 결정 단일 정책 (D-032: 영어 default + 한국 매니저만 한국어)
//
// 이 파일 하나가 "어떤 언어로 메일을 보낼지" 정책을 독점한다.
// 호출처(hotel-status-notify, admin.js 등)는 resolveLocale()만 부르면 된다.
//
// 우선순위:
//   1) 호출처가 넘긴 명시 language ('ko' / 'kr' / 'ko-KR') → 한국어
//   2) 매니저 country === 'KR' → 한국어  (향후 매니저 레코드 country 연결 시 자동)
//   3) 그 외 / 미지정 → 영어 (default)
//
// 향후 BL: 매니저 가입 country를 자동으로 넘기면 모든 메일이 알아서 분기됨
//   (호출처는 안 바꾸고 이 파일만 똑똑해지면 됨 — 단일 진실 원칙)
//
// Last updated: 2026-06-02 (BL-EMAIL-LOCALE-ROUTING)

export const SUPPORTED_LOCALES = ['en', 'ko'];
export const DEFAULT_LOCALE = 'en';

/**
 * 메일 언어를 결정한다.
 * @param {Object} [input]
 * @param {string} [input.language] - 호출처 명시값 ('ko' 등)
 * @param {string} [input.locale]   - language 별칭
 * @param {string} [input.country]  - 매니저 국가코드 ('KR' 등)
 * @returns {'en'|'ko'}
 */
export function resolveLocale(input = {}) {
  const explicit = String(input.language || input.locale || '').toLowerCase().trim();
  if (explicit === 'ko' || explicit === 'kr' || explicit === 'ko-kr') return 'ko';

  const country = String(input.country || '').toUpperCase().trim();
  if (country === 'KR' || country === 'KOR' || country === '한국' || country === '대한민국') return 'ko';

  return DEFAULT_LOCALE;
}

/**
 * locale에 맞는 값을 고른다. 없으면 영어로 폴백.
 * @param {'en'|'ko'} locale
 * @param {Object} map - { en: ..., ko: ... }
 */
export function pickByLocale(locale, map) {
  if (!map) return null;
  return map[locale] != null ? map[locale] : map[DEFAULT_LOCALE];
}
