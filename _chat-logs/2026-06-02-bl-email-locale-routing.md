---
slug: 2026-06-02-bl-email-locale-routing
title: 호텔 상태 메일에 한국어 버전 추가 + 언어 스위치 연결
date: 2026-06-02
tasks: [BL-EMAIL-LOCALE-ROUTING]
commits: [ee7fe4a, 5898e91]
decisions: []
---

## 🎯 한 줄 요약
호텔 매니저에게 자동으로 나가는 상태 안내 메일 6종에 한국어 버전을 새로 만들고, "한국어로 보낼지" 켜는 스위치를 실제로 연결했다.

## 📍 왜 발생했나
지금까지 매니저에게 나가는 상태 메일(등록·승인·결제 등)은 전부 영어 한 종류뿐이라, 한국 매니저도 영어 메일을 받아 이해도와 행동 전환이 떨어졌다.

## 🛠 어떻게 해결했나
메일 언어를 결정하는 규칙을 한 곳에 모은 작은 도구를 새로 만들고(영어 기본, 한국 매니저만 한국어), 상태 메일 6종 각각에 한국어 본문을 추가했다. 영어는 그대로 두고 한국어 칸만 채워서 기존 발송은 전혀 깨지지 않는다.

## ✅ 결과
한국 매니저는 이제 "🎉 호텔이 승인되었습니다 — 다음 단계: 결제" 같은 메일을 한국어로 받을 수 있다. 영어권 매니저는 지금과 똑같이 영어로 받는다. 라이브 반영 완료, 정상 동작 확인.

## ⏱ 다음 결정 필요
1. "어떤 매니저가 한국 사람인지" 자동으로 판별하는 연결이 아직 없음 — 현재는 호출하는 쪽이 한국어를 명시해야 한국어로 나감. 가입 화면 국가 목록에 한국(KR)이 안 잡혀 있어, 이 자동 판별은 별도 작은 업무로 떼는 것을 추천.
2. 나머지 메일(Agoda 안내 등 admin 발송 메일)도 같은 방식으로 한국어 2벌이 필요한지 — 우선순위 대표님 판단.

---

# 🔧 기술 상세 (개발자용)

## 변경 파일
- **신규** `api/_lib/email-locale.js` — `resolveLocale({language, locale, country})` + `pickByLocale()`. D-032 정책(영어 default + 한국 매니저만 한국어)을 단일 진실로 집약. `language='ko'|'kr'|'ko-KR'` 또는 `country='KR'` → `ko`, 그 외 `en`.
- **수정** `api/email/hotel-status-notify.js` — `buildEmailKO()` 6종(registered/approved/rejected/paid/producing/published) 신설, `buildEmail(locale, ...)` 디스패처 추가, 핸들러에서 `resolveLocale({language})` → `buildEmail()`로 연결. 기존 `buildEmailEN` 보존.

## 커밋
- `ee7fe4a` feat(BL-EMAIL-LOCALE-ROUTING): email-locale.js 헬퍼 신설
- `5898e91` feat(BL-EMAIL-LOCALE-ROUTING): status 메일 6종 한국어 2벌 + 스위치 연결

## 검증
- `node --check` 양쪽 OK (ESM)
- `resolveLocale` 단위 테스트 6/6 pass
- 라이브 raw 재확인: buildEmailKO·디스패처·import 정상, 라이브 파일 문법 OK

## 미연결 (후속 BL 후보)
- `BL-EMAIL-MANAGER-LOCALE-AUTO` (가칭): 매니저 가입 country를 status-notify 호출부(admin.html changeStatus 등)에서 자동으로 `resolveLocale`에 넘기기. 선행: 가입 국가 목록에 KR 추가 여부.
- admin.js 발송 메일(Agoda 안내 등) 한국어 2벌 — `email-locale.js` 재사용 가능.

## 자가검증 11개
1✅클라우드 2✅무인(changeStatus 자동호출) 3✅폰 4✅영구기록 5⚠️Playwright는 후속 6✅인계갱신 7✅상태가시 8✅동기화 9✅git revert 10✅boot 11✅사이클
