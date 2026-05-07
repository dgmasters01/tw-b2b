# Playbook — 자격증명 라이프사이클 (Credentials Lifecycle)

> **헌법 부칙 4 디테일.**
> 모든 자격증명(PAT·Vercel 토큰·Supabase 키·API 키)의 등록·사용·폐기 사이클을 정의한다.

---

## 핵심 원칙 (1줄)

**개발기간 = 등록·평문 노출 정상 상태 (사고 아님). 서비스 진입 시 일괄 폐기·재발급.**

이 원칙은 사업 페이즈에 따른 자연스러운 라이프사이클이며, 보안 사고와 다르다. 클로드는 개발기간 중 토큰 폐기·재발급·보안 잔소리를 절대 반복하지 않는다.

---

## 1. 자격증명 종류

| 종류 | 용도 | 보유 위치 (개발기간) | 보유 위치 (서비스기간) |
|---|---|---|---|
| GitHub PAT (`ghp_*`) | 클로드 → main push, 워크플로 트리거 | 채팅 환경변수 + GitHub Actions Secrets | Actions Secrets만 (채팅 주입 폐기) |
| Vercel API Token | 배포 트리거, deployment 조회 | MCP 자동 인증 + Actions Secrets | Actions Secrets만 |
| Supabase Service Role Key | 어드민 SQL, RLS 우회 | Vercel 환경변수 | Vercel 환경변수 (rotate 권장) |
| Resend API Key | 메일 발송 | Vercel 환경변수 | Vercel 환경변수 (rotate 권장) |
| PayPal Client/Secret | 결제 | Vercel 환경변수 | Vercel 환경변수 (rotate 권장) |

---

## 2. 개발기간 룰 (현재 페이즈)

### 클로드의 행동 표준

- **PAT 평문 노출 = 정상 상태.** 대표님이 채팅에 직접 입력해 주신 토큰은 즉시 환경변수로 적재 후 사용.
- **사용 후 토큰 폐기 잔소리 금지.** "노출됐으니 회수하세요" 같은 반복 발언 금지.
- **다음 채팅에서도 같은 토큰 사용 가능.** 개발기간 내내 유효.
- **GitHub Push Protection이 commit 메시지·코드의 평문 토큰 차단.** 이건 클로드가 이미 우회 안 하고 즉시 막힘 보고하는 것이 정석. 코드·commit에 평문 박지 않는다.
- **인계서·handoff·chat-log에는 토큰 평문 박지 않는다.** 환경변수 이름(`GH_PAT`, `VERCEL_TOKEN` 등)으로만 표기. (이건 토큰 보안 이슈가 아니라 GitHub Push Protection 차단 회피).

### 대표님의 행동 표준

- **새 채팅마다 PAT 1회 주입 = 정상.** 클로드가 채팅 시작할 때 토큰 받음.
- **GitHub Actions Secrets 1회 등록도 가능 (선호 옵션).** 한 번 등록하면 워크플로가 자동 사용, 채팅 주입 빈도 감소.

---

## 3. 서비스 진입 시 일괄 폐기 절차 (미래)

서비스 시작 = 운영 페이즈 진입. 이 시점에 한 번만 실시:

```
1. 모든 PAT 폐기 (GitHub Settings → Tokens → Revoke)
2. 모든 Vercel Token 폐기 (Vercel Dashboard → Account → Tokens)
3. Supabase Service Role Key rotate
4. Resend API Key rotate
5. PayPal Secret rotate
6. 새 자격증명을 GitHub Actions Secrets / Vercel 환경변수에만 등록 (채팅 주입 영구 폐지)
7. DECISIONS.md에 페이즈 전환 기록
8. 클로드 행동 표준이 "운영 모드"로 전환 — 새 토큰 채팅 주입 거부
```

**시기:** 대표님이 "서비스 진입 / 운영 모드 전환 / 베타 종료" 등 명시 신호를 내릴 때만. 클로드가 자체 판단으로 운영 모드 전환 금지.

---

## 4. 사고 vs 정상 라이프사이클 구분

| 상황 | 분류 | 대응 |
|---|---|---|
| 개발기간 중 채팅 평문 노출 | **정상** | 사용 후 환경변수 정리만, 폐기 잔소리 금지 |
| 개발기간 중 토큰 만료 (자연 만료) | **정상** | 대표님께 새 토큰 발급 1회 알림 |
| 개발기간 중 토큰 외부 유출 의심 (제3자 접근 흔적) | **사고** | `emergency.md` 4번 발동 |
| 서비스기간 중 채팅 평문 노출 | **사고** | `emergency.md` 4번 발동 + 즉시 폐기 |

**판단 기준:** "현재 페이즈가 무엇인가" — DECISIONS.md의 최신 페이즈 결정을 따른다. 명시 결정 없으면 = 개발기간 (디폴트).

---

## 5. 클로드의 자가 검증 추가 항목

매 응답 전 자가 검증 11개에 다음을 추가 (자율 통과 의무):

- **#12 (라이프사이클):** 지금 발언이 "토큰 폐기 잔소리"인가? 그렇다면 부칙 4 위반 — 잔소리 삭제 후 본문만 보고.

---

## 변경 이력

- **2026-05-08 신설:** 대표님 명시 지시 — "개발기간에는 등록 정상, 서비스 시 폐기. 헌법에 박아라. 자꾸 같은 말 한다." → 부칙 4 한 줄 추가 + 본 playbook 신설.

**Last updated**: 2026-05-08
**Maintained by**: 클로드 (under direction of 이지형 대표님)
