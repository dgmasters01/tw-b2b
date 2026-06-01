# i18n 작업 규칙 (필수 — 모든 화면 작업 시 적용)

## 원칙
사용자·관리자에게 보이는 **모든 텍스트**는 EN/한국어 둘 다 나와야 한다. 한글만(또는 영어만) 박지 말 것.
- 고객/매니저 화면(signup, hotel-info, marketing, sales, dashboard 등): EN/한국어 전환 필수.
- **admin 화면도 마찬가지** — 대표님 외에 **영어권 관리자**(2단계 권한 시스템으로 추가 가능)가 볼 수 있다. admin이라고 한글로만 박지 말 것.

## 방식 (코드베이스 표준)
1. **정적/동적 HTML 요소** → `data-en="..." data-ko="..."` 속성 부여.
   - admin은 `applyLang(root, lang)` 엔진이 자동 치환. 동적 생성 후 `window.TW_applyLang()` 호출하면 현재 언어로 즉시 반영 + 헤더 토글 시 자동 전환.
   - 공통 페이지는 shared.js `switchLang`이 `[data-*]` innerHTML 치환.
2. **변수가 섞인 텍스트**(예: `count + '건'`) → `var ko=(window.TW.lang==='ko'); ko?'한글':'English'` 분기. 단 언어 전환 시 재렌더되도록 훅 연결(모달은 열 때마다 새로 그리니 OK).
3. **JS 알림**(alert/confirm/prompt/toast) → 반드시 lang 분기.

## 점검
- 새 화면/기능 추가 후: 한글 포함 줄 중 data-ko·lang분기 없는 것 grep으로 self-check.
- 팝업/모달/동적 생성 텍스트가 특히 누락되기 쉬움(처음 박힌 정적 텍스트만 보면 놓침).

## 금지
- "나중에 i18n 정리하자"며 한글로만 박고 미루기 — 양이 눈덩이처럼 불어남. **만들 때 바로 둘 다 넣는다.**
