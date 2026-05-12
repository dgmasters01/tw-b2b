# 신규 BL 컨텍스트 + 신규 페이지 보고 의무 (부칙 17 운영 매뉴얼)

**제정일**: 2026-05-12
**발생 BL**: BL-DECISION-CTX-MASS-FILL
**근거 결정**: D-024 (예정)
**적용 범위**: 모든 신규 BL 생성 + 모든 신규 페이지 생성
**상위 규범**: `OPERATIONS_CHARTER.md` 부칙 17

---

## 0. 왜 이 매뉴얼이 필요한가

대표님 진단 (2026-05-12):

> "결정 대기 박스를 열어보면 개발자 언어로만 채워져 있어서 무엇을 결정해야 할지 한눈에 안 들어온다. 내가 1인 운영이라 결정 안 내리면 모든 게 멈추는데, 화면이 내 언어가 아니다."

진단 결과:
- 결정 대기 23건 중 사업가 V2 컨텍스트 박힌 BL: 8건
- 나머지 15건: notes에 개발자 단어 ("commit", "race condition", "MCP") 가득
- 잘 박힌 예시: BL-INVOICE-001 (대표님이 만족 표시)

**해결**:
1. 결정 대기에 들어갈 BL은 사업가 V2 컨텍스트 3블록 필수
2. auto-task-bot이 새 BL 박을 때 기본 템플릿 자동 박음
3. 클로드는 작업 시작 전 사업가 언어로 보강 의무
4. 신규 페이지 생성 시 즉시 대표님께 보고

---

## 1. V2 컨텍스트 3블록 표준 (BL-INVOICE-001 형식)

결정 대기 박스에 들어갈 BL은 `decision_context` 필드에 다음 3블록을 박는다.

```
[지금 무슨 상황이냐면]
(현재 상황 — 대표님이 안 듣고 있다고 가정하고 처음부터 설명)
(2~4문장 / 사업가 언어 / 개발자 단어 사용 시 풀어쓰기)

[왜 결정이 필요하냐면]
(왜 자율 진행 불가 — 어떤 결정 입력이 필요한지)
(2~3문장 / 결정 선택지가 있으면 A안/B안으로 풀기)

[결정하면 뭐가 달라지냐면]
(결정 후 임팩트 — 대표님 시간/사업 매출/운영 효율 관점)
(2~3문장 / 클로드 추천이 있으면 마지막 1문장에)
```

**원칙**:
- **options + recommendation 필수** (BL-DECISION-MODAL-FIELD-FIX 2026-05-12) — 결정 대기 BL은 `decision_context` 3블록 + `options` 2~3안 + `recommendation` 클로드 추천 모두 박아야 대표님이 클릭만으로 결정 가능.
- 사업가 언어 (대표님이 영업 사원/매니저와 대화하는 톤)
- 개발자 단어("commit", "API", "셀렉터", "토큰") 사용 시 옆에 풀어쓰기 첨부
- 길이 약 400~600자
- 옵션 추출 가능하면 `options` 필드 별도 박음

### 좋은 예시 (BL-INVOICE-001)

```
[지금 무슨 상황이냐면]
호텔 매니저가 우리한테 결제할 때 결제 끝나면 인보이스/영수증 PDF가 자동으로
만들어져야 해요. 매니저가 회사 회계처리 할 때 그 PDF를 쓰니까. 1년 이상
영구 보관도 되어야 합니다.

[왜 결정이 필요하냐면]
대표님이 D-009로 만들기로 결정하셨어요. 지금 결정해야 할 건 (1) PDF를
어디에 보관할지 (2) 발행자 회사명을 한국법인으로 할지 베트남 법인으로 할지
(3) 양식을 한국어/영어 어떻게 할지입니다.

[결정하면 뭐가 달라지냐면]
한국 매니저한테는 한국 법인 명의 + 한국어 영수증이 회계에 맞고, 베트남/
스리랑카 매니저한테는 베트남 법인 + 영문이 맞아요. 어느 쪽으로 통일할지/
자동 분기할지에 따라 매니저 회계 처리가 달라집니다.
```

### 나쁜 예시 (개발자 언어 가득)

```
PDF 자동 생성 endpoint 박기. Supabase Storage에 bucket 만들고 RLS 정책 박음.
PayPal webhook 받아서 invoice generator function 호출. Resend로 PDF
첨부해서 매니저 이메일로 발송. 1년 retention 정책 박기.
```

---

## 2. auto-task-bot 컨텍스트 가드

`_os/scripts/auto-task-from-health.mjs`에 박힌 가드:

```javascript
function needsDecisionContext(bl) {
  if (bl.approval_required === true) return true;
  const decs = (bl.autonomous && bl.autonomous.requires_decisions_first) || [];
  if (Array.isArray(decs) && decs.length > 0) return true;
  return false;
}

function ensureDecisionContext(bl, sourceDesc) {
  if (!needsDecisionContext(bl)) return false;
  if (bl.decision_context && bl.decision_context.length >= 100) return false;
  // 기본 V2 템플릿 자동 박음 + auto_context_warning=true 마커
}
```

**동작**:
1. 결정 대기에 들어갈 BL인가? (`approval_required` OR `requires_decisions_first` 있음)
2. 이미 V2 컨텍스트 박혀 있나? (≥100자)
3. 둘 다 아니면 기본 템플릿 자동 박음
4. `auto_context_warning=true` 마커 박아 클로드가 보강 의무 인식

---

## 3. 클로드 보강 의무

`auto_context_warning=true` 마커가 박힌 BL을 발견하면 클로드는:

1. 작업 시작 전 사업가 언어로 V2 컨텍스트 보강
2. 보강 후 `auto_context_warning=false` 갱신
3. commit 메시지에 `[ctx-boosted:BL-XXX]` 태그 박음

**보강 안 하고 작업 시작하면 헌법 부칙 17 위반.**

---

## 4. 신규 페이지 보고 의무

신규 페이지(`.html` 파일) 생성 시 즉시 대표님께 4줄 보고:

```
무엇을 만들었나: [페이지 이름 + 사업 목적 한 줄]
어디 가서: [URL 또는 경로]
무엇을 누르면: [핵심 버튼/링크]
무엇이 보이는지: [눈에 보이는 첫 화면 — 색·숫자·문구]
+ 스크린샷 첨부 (라이브 또는 시안)
```

**이유**:
- 페이지는 사용자/대표님이 직접 보는 자산 — 대표님 모르는 페이지 생성 금지
- 신규 페이지가 사이드바·메뉴·서비스 지도에 어떻게 박힐지 결정 필요
- 부칙 16의 보고 4줄 형식과 동일 (일관성)

**예외**: `_admin/`, `_os/`, `_internal/` 내부 도구 페이지는 보고 의무 면제 (개발 산출물).

---

## 5. 위반 시 자가 진단

대표님이 "결정 대기 화면 안 읽혀" 또는 "이 페이지 처음 봐" 한 마디 →
클로드 즉시:

1. 진행 중 작업 일시 정지
2. 부칙 17 + 이 매뉴얼 재 fetch
3. 마지막 박은 BL/페이지를 부칙 17 기준 자가 진단
4. 위반 항목 명시 + 정정안 보고
5. 대표님 "재개" 명령 후 재개

---

## 6. 자체 검증 11개 통과

| # | 질문 | 통과 |
|---|---|---|
| 1 | 클라우드(GitHub)에만 존재? | ✅ |
| 2 | 사람 손 없이 자동 실행? | ✅ auto-task-bot 가드 |
| 3 | 핸드폰만으로 가능? | ✅ 어드민 모바일 |
| 4 | 작업 기록 영구 보존? | ✅ DECISIONS + chat-log |
| 5 | 시스템 자동 검증? | ✅ ensureDecisionContext |
| 6 | 다음 세션 클로드 맥락? | ✅ 인계서 + auto_context_warning |
| 7 | 5초 안에 파악? | ✅ admin-status 결정 대기 박스 |
| 8 | 현황표/독스/갤러리 동기화? | ✅ tasks.json + DECISIONS |
| 9 | 되돌릴 수 있나? | ✅ git revert |
| 10 | 헌법 자동 로딩? | ✅ 인계서 헤더 |
| 11 | 메모리 사이클 안? | ✅ 개발 모드 |

---

**Last updated**: 2026-05-12
**Maintained by**: 클로드 (under direction of 이지형 대표님)
**Length budget**: 200줄 이하 유지
