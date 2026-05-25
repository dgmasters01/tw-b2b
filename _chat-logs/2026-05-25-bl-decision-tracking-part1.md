---
date: 2026-05-25
bl: BL-DECISION-TRACKING
step: 1-2
status: in_progress (40%)
commit_target: feat(BL-DECISION-TRACKING) 1편 — 헌법 부칙 20 + business-agreements 인프라 [step:done:1] [step:done:2]
tone: business
---

# BL-DECISION-TRACKING 1편 — 헌법 부칙 20 + business-agreements 인프라 (40%)

## ① 완료 내용

**1) `OPERATIONS_CHARTER.md` 부칙 20 박음** (헌법 178→179줄, 한도 안전)
- 부칙 20 — 사업 합의 추적 게이트 (BL-DECISION-TRACKING, 2026-05-25 신설)
- 5톱니 사이클 ⓐ~ⓔ 명시
- 위반 사례(2026-05-25 라운드 3 빠뜨림) 박음
- 단일 진실원 경로 명시

**2) `_os/playbook/decision-tracking.md` 신설** (디테일 매뉴얼)
- 사고 한 줄 진단 + 5톱니 사이클 도식
- business-agreements.md/.json 형식 정의
- 클로드 의무 (톱니 1·2) + 봇 책임 (톱니 3·4) + admin 표시 (톱니 4) + 인계서 헤더 (톱니 5)
- 헌법 12원칙 11개 자가 검증 통과 표
- 11번째 섹션 — 1편/2편 작업 순서 명시

**3) `_decisions/business-agreements.md` 신설** (사람용 단일 진실원)
- 상단 "📊 현재 미구현 사업 합의 한눈에" 표 (대표님이 5초 파악)
- BL-INVOICE-001 핑퐁 15라운드 합의 13개 추출 + AGR-2026-0016 본 작업
- 위치·검증 코드 패턴·관련 BL·상태 모두 명시

**4) `_decisions/business-agreements.json` 신설** (봇/AI용 단일 진실원)
- 15개 합의 정형 데이터
- stats: done 9 / partial 3 / not_implemented 3 / total 15
- 각 합의의 `expected_location.files` + `code_pattern` (verification-gap-bot이 grep)
- JSON 문법 검증 통과

**5) `tasks.json` BL-DECISION-TRACKING 신설**
- P0 / size: medium / 5단계 / 1편 2단계 done = 40%
- 최상단 박음 (헌법 인프라)
- 1편 2단계 done / 2편 3단계 pending

## ② 이유

- **사고 진단 근본 원인:** 사업 합의 → 정책 문서 → 백로그 자동화는 박혀있지만, "코드가 사업 합의 빠짐없이 반영했나" 검증 게이트 없음. 라운드 3 빠뜨림으로 BL 100% 보고 후 사고.
- **대표님 원칙 그대로 박음:** "a-z까지 톱니바퀴처럼 맞물려 돌아야 한다. 합의한 것에 대해 빠뜨림 없이 되어야 개발이 정상." → 5톱니 사이클이 이 원칙의 시스템화.
- **이중 형식 박은 이유 (사람용 .md + 봇용 .json):** 헌법 원칙 6 "AI 가독성 — 사람용 + AI용 이중 형식". 대표님이 직접 .md 열어서 한눈에 보고, 봇/AI는 .json grep으로 자동 처리.
- **2편 분할 이유:** 봇 2개 + admin 배지 + 인계서 헤더 통합은 약 2시간 작업. 1채팅 토큰 안전선 위해 1편(헌법·문서·초기 데이터)부터 라이브 박고, 2편 새 채팅에서 톱니 3·4·5 자동화 박음. 대표님 토큰 절약 원칙 그대로.
- **초기 데이터 BL-INVOICE-001 핑퐁만 박은 이유:** 가장 최근에 진행 중인 사업 합의가 많고, 빠뜨림 사고가 발생한 영역이라 즉시 추적 시작 필요. 다른 BL의 과거 합의는 decision-tracking-bot이 chat-log push 시 자동 보완(2편).
- **AGR-2026-0012 빠뜨린 이유:** 라운드 12는 "사업 정책 5가지 확인 필요" 메타 합의이지 실제 정책 결정 아님. 추적 대상에서 제외.
- **stats 정정 라이브 검증:** 초기 박은 stats가 실제 항목 카운트와 안 맞음 발견 → 자동 카운트 스크립트로 정정 (done 9 / partial 3 / not_implemented 3). 추후 verification-gap-bot이 매일 자동 재계산.

## ③ 사업 영향

**대표님이 직접 파악 안 해도 사업 합의 빠뜨림 0건 보장 시스템 기초 박힘.**

이 시스템이 박힌 후 사업에 일어나는 일:
- **모든 채팅 끝날 때마다** 합의된 사업 결정이 영구 기록 (대표님이 잊어버려도 시스템이 추적)
- **새 채팅 시작할 때마다** 미반영 합의가 인계서 상단에 강제 표시 → 새 클로드 즉시 인지 (2편 박힌 후)
- **admin-status 한 번 보면** "📋 미구현 사업 합의 N건" 배지로 5초 파악 (2편 박힌 후)
- **봇이 매 commit 자동 점검** → 미반영이 7일 넘으면 텔레그램 ⚠️ (2편 박힌 후)

**즉시 효과 (1편만 박힌 지금):**
- BL-INVOICE-001 핑퐁 15라운드 합의 전체가 단일 진실원에 박힘 → 다음 채팅 클로드가 fetch 1번으로 전체 진실 파악 가능
- 미구현 3건(AGR-2026-0003 / -0005 / -0013)이 명확히 박힘 → 다음 작업 우선순위 명확
- 가짜 100% 보고 사고 재발 차단 (지금부터 BL done 전에 business-agreements.json status 점검 의무)

**중장기 효과 (2편 완료 후):**
- 1인 기업 운영 부담 0 — 합의 추적·검증을 시스템이 다 함
- 사업 결정 영구 자산화 (5년 후에도 "2026년 5월에 우리가 무엇을 합의했더라" 즉시 검색)
- 신규 채용 시 인수인계 자료 자동 생성 (사업 합의 단일 진실원이 그대로 문서)

## ④ 다음 행동

**2편 (새 채팅에서 박음 — 약 2시간)**

3. `verification-gap-bot` 신설
   - 트리거: 매 commit + 매일 KST 03:00
   - 동작: business-agreements.json의 not_implemented/partial 항목을 GitHub raw fetch + code grep
   - 결과: status 자동 갱신 + stats 자동 재계산 + 텔레그램 알림

4. `decision-tracking-bot` 신설
   - 트리거: chat-log 새 파일 push 시
   - 동작: chat-log "⑤ 대표님 결정 필요" 섹션에서 합의 자동 추출 → business-agreements append

5. `_admin/admin-status.html` 배지 박음
   - 상단 "📋 미구현 사업 합의 N건" 신설 배지
   - 클릭 시 모달: 합의 내용 + 채팅 링크 + 예상 위치 + 며칠째

6. `_os/handoff-header.md` 통합
   - 부칙 16 강제 헤더에 부칙 20 블록 추가
   - 새 채팅 인계서 자동 prepend에 "🚨 작업 시작 전 사업 합의 점검" 박음

7. 라이브 검증 + commit

**우선순위 즉시 박을 사업 합의 (별도 작업)**

- **AGR-2026-0003 (sales.html 한국 분기)** — P0, 한국 매니저 결제 자체가 불가능
- **AGR-2026-0013 (영수증 종류 라디오)** — P1, 한국 세무 처리 필수
- **AGR-2026-0005 (BL-INVOICE-002 입금 확인 admin)** — P1, 대표님 수동 작업 효율

## ⑤ 대표님 결정 필요

**없음.** 부칙 20 자율 결정 범위:
- 5톱니 사이클 구조 (대표님이 직접 명시하신 "톱니바퀴" 원칙)
- 사람용 .md + 봇용 .json 이중 형식 (헌법 원칙 6)
- 1편/2편 분할 (대표님 토큰 절약 원칙)
- 초기 데이터 BL-INVOICE-001만 (가장 최근·사고 발생 영역)

**다음 사업 결정 영역 (별도 채팅에서 박을 때 대표님 답 필요):**
- 2편 박은 후 → AGR-2026-0003(한국 분기) 박을지, BL-INVOICE-002 먼저 박을지, 둘 다 한 번에 박을지 우선순위
- 영수증 종류 라디오(AGR-2026-0013) sales.html에 박을 시점

---

**1편 완료. 헌법 179줄(한도 안전). business-agreements 사람용 + 봇용 이중 형식 박힘. 사업 합의 15개 단일 진실원 박힘. BL-DECISION-TRACKING 40% (2/5).**

**2편(봇·admin·인계서 헤더)은 새 채팅에서 박음.**
