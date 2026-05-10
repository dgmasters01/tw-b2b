# 2026-05-10 BL-CLAUDE-DISCIPLINE — 헌법 부칙 16 + 인계서 강제 헤더 + 4개 의무

**작업 단위**: BL-CLAUDE-DISCIPLINE (클로드 행동 강제 게이트)
**단계**: 1~6단계 한 commit (인프라 작업, 단일 의도)
**HEAD before**: 80f0f70
**HEAD after**: 68e168e
**라이브 영향**: 헌법 변경 + 인계서 헤더 자동 prepend (모든 새 채팅에 즉시 적용)

---

## [블록 1] 왜 박았나 — 대표님 진단 (2026-05-10)

> "헌법에 있는 내용인데도 클로드가 안 지킨다. 매번 같은 사고가 반복되고, 내가 같은 설명을 다시 해야 한다."

**확인된 4개 사고 패턴 (이번 채팅에서도 발생)**:

1. 보안 잔소리 — "토큰 폐기하세요" (헌법 부칙 4 위반)
2. "MCP 없어서 못 합니다" — bash + PAT 가능한데 못 한다고 보고
3. "어느 방식 원하세요? A/B/C" — 개발 순서를 대표님께 던짐 (대표님은 개발자 아님)
4. 클로드 언어 보고 — "[data-theme] 셀렉터 박고 :root alias 통일" 식

**원인**: 헌법은 박혔지만 행동 강제 장치가 없음.

---

## [블록 2] 무엇을 박았나 — 7개 파일

| # | 파일 | 무엇 |
|---|---|---|
| 1 | `OPERATIONS_CHARTER.md` | 부칙 16 추가 (15줄, 헌법 175줄로 200줄 강제 통과) |
| 2 | `_os/playbook/claude-discipline.md` (신설) | 부칙 16 통합 운영 매뉴얼 250줄 — 4개 의무 디테일 + 위반 사례 + 자가 진단 절차 |
| 3 | `_os/handoff-header.md` (신설) | 모든 인계서 머리에 자동 prepend되는 강제 헤더 단일 진실원 |
| 4 | `_os/boot.md` | 3번 섹션 갱신 — 5줄 양식 + 묻지 않음 원칙 |
| 5 | `_admin/admin-status.html` | `buildHandoffMessage` 함수에 헤더 자동 fetch+prepend 코드 |
| 6 | `DECISIONS.md` | D-023 추가 |
| 7 | `tasks.json` | BL-CLAUDE-DISCIPLINE 7/7 done 등록 |

---

## [블록 3] 4개 의무 (헌법 부칙 16 + claude-discipline.md)

### 의무 1 — 첫 응답 5줄 양식 강제

```
[작업 소요: 약 X분 / N단계 / 변경 파일: ...]
🚦 ✅/⚠️
📚 fetch 완료: boot.md / [작업파일] / 라이브 상태
🧭 북극성 + 🎯 한 채팅 한 결정
🔍 중복 점검 grep 결과
```

### 의무 2 — 라이브 fetch + 중복 점검 강제

- 인계서·tasks.json만 믿지 말고 GitHub 라이브 fetch
- 새 코드/블록/토큰 박기 전 grep 결과 응답에 박음

### 의무 3 — 개발 순서·기술 선택 묻지 않음

- 묻는 것 = 정확히 4가지: 비즈니스 방향 / 서비스 방향 / 전체 틀 변화 / 디자인 큰 방향(이미지 첨부)
- 그 외는 클로드 자율

### 의무 4 — 보고는 초등학생 언어 + 4줄 형식 + 디자인은 이미지

```
무엇을 했나: ...
어디 가서: ...
무엇을 누르면: ...
무엇이 보이는지: ...
```

---

## [블록 4] 강제 메커니즘 — 어떻게 새 클로드가 100% 지키나

```
[대표님 admin-status.html 카드 클릭]
        ↓
[buildHandoffMessage 함수 실행]
        ↓
[fetch /_os/handoff-header.md → 인계서 머리에 prepend]
        ↓
[인계서 텍스트 = 🚨 강제 헤더 (37줄) + 작업 컨텍스트]
        ↓
[새 채팅 클로드가 첫 줄부터 읽음 → 부칙 16 자동 강제]
```

**단일 진실원**: 헤더 수정 = `_os/handoff-header.md` 1파일만. admin-status.html은 fetch만 함.

---

## [블록 5] 정석 5기준 통과 검증

| 기준 | 통과 |
|---|---|
| ① 장기 안정성 | ✅ 헌법 + 헤더 둘 다 영구 |
| ② 표준 패턴 | ✅ 헌법(선언) + playbook(매뉴얼) + boot(트리거) 3층 유지 |
| ③ 유지보수 비용 최소 | ✅ playbook 1개 + 헤더 1개 (분산 안 함) |
| ④ 단일 진실원 | ✅ 디테일은 claude-discipline.md 1개, 헤더는 handoff-header.md 1개 |
| ⑤ 재발/롤백 안전 | ✅ git revert 1번 = 7개 파일 동시 롤백 |

---

## [블록 6] 라이브 검증 결과

| 검증 항목 | 결과 |
|---|---|
| 헌법 200줄 강제 통과 | ✅ 175줄 |
| GitHub raw — handoff-header.md 200 OK | ✅ |
| GitHub raw — admin-status.html prepend 코드 | ✅ "BL-CLAUDE-DISCIPLINE" 발견 |
| Vercel 라이브 — _os/boot.md 200 OK | ✅ |
| Vercel 라이브 — admin-status.html | 302 (인증 보호 — 정상) |

---

## [블록 7] 자가 검증 11개

전부 ✅ 통과 (claude-discipline.md 7번 섹션 참고).

---

## [블록 8] 다음 행동

**대표님 다음 채팅** (예: BL-ADMIN-LIGHTMODE 3단계):
1. admin-status.html → ⚡ 진행 중 박스 → BL-ADMIN-LIGHTMODE 카드 클릭
2. 인계서 자동 복사됨 (머리에 🚨 강제 헤더 자동 prepend)
3. 새 대화창에 붙여넣음
4. 새 클로드가 첫 줄부터 강제 헤더 봄 → 부칙 16 4개 의무 자동 강제
5. 대표님이 "헌법에 있는데..." 다시 설명할 일 없음

---

**Last updated**: 2026-05-10
**Maintained by**: 클로드
