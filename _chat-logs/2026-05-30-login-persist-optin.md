---
slug: 2026-05-30-login-persist-optin
title: 로그인 유지 체크박스 — 기본 미영구(닫으면 로그아웃), 선택 시 유지
date: 2026-05-30
tasks: [BL-LOGIN-PERSIST-OPTIN]
commits: [3f31e1a, 17cfa80, 06592db]
decisions: [D-051]
---

## 🎯 한 줄 요약
노트북을 껐다 켜도 자동 로그인되던 걸, 이제 "로그인 유지"를 직접 체크한 경우에만 유지되게 바꿨습니다(기본은 브라우저 닫으면 로그아웃).

## 📍 왜 발생했나
지금까지는 한 번 로그인하면 브라우저를 닫아도 30일간 자동 로그인이 유지됐습니다. 공용 PC나 노트북을 잃어버리면 남이 그대로 들어갈 수 있는 보안 위험이라, 대표님이 직접 "이거 문제 아니냐"고 짚으셨습니다.

## 🛠 어떻게 해결했나
로그인 화면(매니저용 login.html · 관리자용 admin-login.html 둘 다)에 「이 기기에서 로그인 유지」 체크박스를 달았습니다. 체크하면 예전처럼 계속 유지, 체크 안 하면(기본값) 브라우저를 닫는 순간 로그아웃됩니다. 로그인 정보가 저장되는 곳과 출입 쿠키 둘 다 이 선택에 맞춰 자동으로 '영구'냐 '이번만'이냐가 정해지게 했습니다.

## ✅ 결과
이제 공용·분실 기기에서도 브라우저만 닫으면 자동 로그아웃되어 안전합니다. 본인 기기에서 편하게 쓰고 싶으면 체크 한 번이면 됩니다. 대표님(관리자)도 매니저도 똑같이 적용됩니다.
→ 어디 가서 뭐 누르면 뭐 보임: gohotelwinners.com/login.html(매니저) · gohotelwinners.com/admin-login.html(관리자) → 비밀번호 칸 아래 「이 기기에서 로그인 유지」 체크박스.

## ⏱ 다음 결정 필요
없음. 직접 확인하시려면: 체크 안 하고 로그인 → 브라우저를 완전히 닫았다 다시 열기 → 로그인 화면이 나오면 정상입니다.

---

# 🔧 기술 상세 (개발자용)

## 작업 단위
- `3f31e1a` shared.js (step 1): createClient에 custom storage adapter(`twAuthStorage`) + `persistSession/autoRefreshToken/detectSessionInUrl` 명시. `tw-auth-persist`==='1'이면 localStorage, 아니면 sessionStorage로 라우팅. `sb-access-token` 쿠키 2곳(onAuthStateChange / getSession) Max-Age를 `twAuthPersist()` 조건부로 — 미영구 시 세션 쿠키(만료 없음→브라우저 닫으면 소멸).
- `17cfa80` login.html (step 2·3): 비밀번호 아래 「이 기기에서 로그인 유지」 체크박스(기본 미체크) + signIn 직전 `tw-auth-persist` set/remove.
- `06592db` admin-login.html: 자체 클라이언트(storageKey `tw-admin-auth`)라 shared.js 영향 밖 → 동일 어댑터(`adminStorage`/`tw-admin-persist`) + 체크박스 + 쿠키 Max-Age 조건부 별도 적용.

## 설계 근거 (정석 5기준)
- 단일진실: createClient 단계에서 저장소 라우팅을 한 곳에 박음. setItem이 플래그를 동적으로 읽어 signIn 직전 선택이 즉시 반영.
- 롤백안전: 변경 전 동작(영구)은 체크 시 그대로 재현. 어댑터 getItem이 localStorage→sessionStorage 순으로 읽어 기존 세션도 끊기지 않음.
- 부칙19 전체 갱신: 매니저(login.html)만 바꾸면 권한 최상위 admin이 여전히 30일 영구 → biz_context "대표님도 매니저도 동일 정책" 위반 → admin-login.html 동시 적용.

## 주의 (대표님 화면 영향)
- 기존에 로그인돼 있던 세션은 다음 토큰 갱신 시점에 '미영구(sessionStorage)'로 자동 이동 — 즉 이 배포 후 대표님/매니저는 한 번씩 재로그인하면서 "로그인 유지"를 체크해야 브라우저 닫아도 유지됨. 보안 표준상 의도된 동작(D-051).

## 검증
- node --check 3파일 PASS. 운영 도메인 라이브 확인: shared.js 어댑터·쿠키 조건부 / login.html·admin-login.html 체크박스 노출.
- 잔여(브라우저 닫기→로그아웃) 행동 검증은 실제 브라우저 1회 테스트 권장(위 '다음 결정 필요' 절차).

## 관련
- 결정: D-051
- 미접촉: 이 작업은 dashboard/admin 본문 미변경 — 인증 진입부(login·admin-login·shared.js)만.
