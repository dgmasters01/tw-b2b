# 인계서 — BL-EMAIL-LOCALE-ROUTING (status 메일) 완료

**작성**: 2026-06-02
**다음 채팅 첫 fetch = boot.md 1개 → 이 파일.**

---

## 🚦 다음 채팅 첫 행동

1. `_os/boot.md` 1개 fetch (헌법 부팅)
2. **이 파일 읽음** → 추가 헌법 fetch 금지
3. 대표님이 다음 작업 고르면 → 해당 BL 자가검증(5-A) 후 시작
4. 상태는 항상 라이브 `tasks.json` 재확인 (부칙16: 메모리 의존 금지). 직전 인계서가 stale일 수 있으니 tasks.json 진실 우선.

---

## ✅ 직전 채팅(2026-06-02)에서 한 것

**BL-EMAIL-LOCALE-ROUTING 중 status 메일 6종 = 한국어 2벌 + 스위치 연결 완료 (라이브 반영).**

- 신규 `api/_lib/email-locale.js` — 메일 언어결정 단일정책 (영어 default, 한국 매니저만 한국어, D-032)
- 수정 `api/email/hotel-status-notify.js` — `buildEmailKO` 6종 + `buildEmail` 디스패처 + `resolveLocale` 연결
- commit `ee7fe4a`, `5898e91` / 라이브 검증·문법 OK
- chat-log: `_chat-logs/2026-06-02-bl-email-locale-routing.md`
- **기존 동작 불변**: 영어 default 유지, `language:'ko'` 넘어올 때만 한국어. 외부 발송 안 깨짐.

---

## 다음 BL-EMAIL-LOCALE-ROUTING 잔여 (아직 100% 아님)

이 BL은 "12개 메일 2벌"인데, 이번엔 status 6종만 끝남. tasks.json 상태는 라이브 재확인 필요.

남은 것:
1. **자동 판별 미연결** — "누가 한국 매니저인지"를 호출부가 자동으로 안 넘김. 현재는 명시해야 한국어. 후속 BL-EMAIL-MANAGER-LOCALE-AUTO(가칭). 선행: 가입 화면 국가 목록에 한국(KR) 추가 여부 = 대표님 결정 필요.
2. **나머지 발송 메일** — admin.js의 Agoda 안내 등도 한국어 2벌 필요한지 (email-locale.js 재사용 가능).

---

## 다음 작업 후보 (대표님 1택 — 라이브 tasks.json 재확인 후 제시)

- A. 위 BL 잔여 마무리 — KR 국가 추가 + 자동 판별 연결 (한국 매니저 메일 실제 가동)
- B. 매출 회수 콘솔 BL-PAYMENT-FOLLOWUP-CONSOLE (P1) — 승인됐는데 결제 안 한 호텔 푸시 (매출 직결)
- C. 운영 대시보드 BL-ADMIN-OPERATIONS-DASHBOARD (pending) — admin 상단 오늘 할 일 + 매출 요약 블록

---

## 북극성 (이번 BL)

**한국 매니저가 상태 메일을 한국어로 받아 이해·신뢰가 올라가고 결제·행동 전환율이 높아진다.**

---

## 다음 채팅 금지

- 헌법 본문 풀 fetch — boot.md 1개로 끝
- 거대 파일(admin.js 6225줄·3000줄대 메일) 무계획 수정 — 작은 단위로 쪼개기
- 메모리만 믿고 작업 대상 확정 — tasks.json 라이브 우선

---

**호칭: 대표님. 언어: 한국어. 사업가 언어 강제(부칙 18).**
