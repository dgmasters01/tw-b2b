# `api/_lib/` — 공유 헬퍼 모듈 (Vercel 함수 카운트 제외)

## 목적

이 디렉토리는 `api/*.js` 핸들러에서 import하는 **공유 헬퍼 모듈**을 보관합니다.
Vercel Hobby 플랜의 **12-Function 한도**에 카운트되지 않도록 디렉토리명에
**언더스코어(`_`) 접두사**를 사용합니다.

## Vercel 함수 카운팅 규칙

`vercel.json` 의 `functions` 매처가 `api/*.js` 와 `api/email/**/*.js` 를 함수로 인식.
디렉토리명이 `_` 로 시작하는 경우 Vercel이 빌드 단계에서 자동 제외하므로
이 디렉토리 안의 `.js` 파일은 함수로 카운트되지 않습니다.

또한 `api/*.js` 패턴은 **단일 레벨 와일드카드**로, `api/_lib/*.js` 같은 하위 경로는
매칭하지 않습니다 (이중 안전망).

## 변경 이력

- **2026-04-29 d301ee9 이전 / 4fb3860**: `api/lib/` → `api/_lib/` rename
  → 원래 `lib`로 시작하는 디렉토리는 Vercel이 함수로 카운트해서 12개 한도 초과.
  언더스코어 prefix로 변경하여 회피.
- **2026-04-30 (I 작업)**: 디렉토리 정책 문서화 (이 README)

## 사용 규칙

1. **신규 헬퍼 파일은 반드시 이 디렉토리(`api/_lib/`)에 추가**.
   `api/lib/`, `api/utils/`, `api/shared/` 등의 이름으로 만들면 자동으로 함수로 카운트되어
   12-Function 한도 초과 위험.
2. **import 경로**는 상대 경로 사용. 예:
   ```js
   import { sendOps } from './_lib/email-sender.js';
   import { capturePayment } from './_lib/paypal-client.js';
   ```
3. **export default 핸들러를 만들지 말 것**. 이 디렉토리 파일은 라이브러리 모듈이지
   서버리스 함수가 아닙니다.

## 현재 함수 카운트 (참고)

`api/*.js` 직속 파일 + `api/email/**/*.js` = 9개 (2026-04-30 기준).
여유 3슬롯. 새 함수 추가 시 반드시 통합 라우터(`api/admin.js`의 `?action=` 패턴) 고려.
