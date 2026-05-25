# 사업 합의 추적 게이트 (부칙 20 디테일)

> **단일 진실원:** `OPERATIONS_CHARTER.md` 부칙 20
> **BL:** BL-DECISION-TRACKING (2026-05-25 신설)
> **사업 합의 단일 진실원:** `_decisions/business-agreements.md` (사람용) + `_decisions/business-agreements.json` (봇용)

---

## 1. 왜 만들었나 (사고 한 줄 진단)

**2026-05-25 사고:** 라운드 3에서 합의한 "한국 매니저 KRW 송금 분기"가 정책 문서·tasks.json·BL까지는 자동으로 박혔으나 **sales.html 코드에 박혔는지 검증되지 않은 채 BL-INVOICE-001 100% done 보고** → 대표님이 sandbox 테스트하다 발견.

**원인:** 사업 합의 → 정책 문서 → 백로그까지의 자동화는 있었지만, **"실제 코드가 사업 합의를 빠짐없이 반영했나?"의 자동 검증 게이트가 없었다.**

**대표님 진단:** "톱니바퀴처럼 a-z까지 맞물려 돌아야 한다. 빠뜨림이 누적되면 한 번 더 손봐야 한다."

---

## 2. 5톱니 사이클 (한 사이클이 끊기지 않게 도는 구조)

```
[톱니 1] 채팅 합의
   ↓ 클로드가 채팅 마무리 시 자동 추출 (의무)
[톱니 2] business-agreements 추가 (사업 합의 단일 진실원)
   ↓ 합의별로 예상 구현 위치(BL ID·파일 경로) 자동 매핑
[톱니 3] 단일 진실원 문서(_os/playbook/*.md) 갱신
   ↓ commit 봇이 코드 grep
[톱니 4] verification-gaps 자동 박힘 (status: not_implemented/partial/done)
   ↓ admin-status 배지 + 새 채팅 인계서 헤더 강제 + 텔레그램 ⚠️
[톱니 5] 다음 채팅 클로드가 미반영 즉시 인지 → 박음
   ↓ verification-gaps 비워짐 → 톱니 1로 (사이클 종료)
```

---

## 3. business-agreements.md 형식 (사람용)

대표님이 직접 볼 수 있는 평문 마크다운. 시간 역순(최신 위).

```markdown
## 2026-05-25 — BL-INVOICE-001 인보이스 시스템 핑퐁 15라운드

### ✅ DONE — 라운드 1: 발행 주체 한국법인 단일
- 위치: api/invoice.js, _os/playbook/invoice-system.md
- 검증: 2026-05-25 commit 0aeee15

### ✅ DONE — 라운드 6+15: 계좌·도장·서명 admin 수정 가능
- 위치: _admin/admin-settings.html, company_info/payment_accounts 테이블
- 검증: 2026-05-25 BL-INVOICE-003 100% done

### ❌ NOT_IMPLEMENTED — 라운드 3: 한국 매니저 KRW 송금 분기
- 예상 위치: sales.html (hotel.country === 'KR' 분기)
- 검증 실패: 2026-05-25 sandbox 테스트 중 발견
- 차기 BL: BL-INVOICE-001 단계 13 또는 신규 BL

### ❌ NOT_IMPLEMENTED — 라운드 5: 한국 매니저 입금 확인 admin
- 예상 위치: _admin/admin-invoices.html (입금 확인 버튼)
- 예상 BL: BL-INVOICE-002 (0% pending)
```

---

## 4. business-agreements.json 형식 (봇·AI용)

`verification-gap-bot` + 새 채팅 인계서 헤더 자동 fetch 대상.

```json
{
  "version": "1.0",
  "updated_at": "2026-05-25T08:00:00Z",
  "agreements": [
    {
      "id": "AGR-2026-0001",
      "chat_date": "2026-05-24",
      "chat_ref": "BL-INVOICE-001 핑퐁 라운드 3",
      "agreement": "한국 매니저 결제는 PayPal 숨기고 KRW 송금 UI 단일 노출",
      "expected_location": {
        "files": ["sales.html"],
        "code_pattern": "hotel.country.*KR|bank_transfer_krw"
      },
      "related_bl": "BL-INVOICE-001",
      "status": "not_implemented",
      "verified_at": null,
      "verified_commit": null,
      "discovered_via": "sandbox 결제 테스트"
    }
  ]
}
```

**status 값:**
- `not_implemented` — 합의됐으나 코드 grep 0건
- `partial` — 일부 박힘 (예: invoice.js에는 박혔으나 sales.html은 빠짐)
- `done` — 모든 expected_location에 코드 grep 통과
- `deferred` — 대표님이 명시적으로 후속 작업으로 미룸 (예: "운영 진입 후")

---

## 5. 클로드 의무 (톱니 1·2 — 채팅 마무리 시)

새 채팅 인계서 만들기 직전, 매번 다음 절차 강제:

1. **이번 채팅에서 합의된 사업·서비스 결정 추출**
   - 명시적 합의만 (대표님이 "그렇게 하자" / "확정" / "맞아" 등 동의 표시한 항목)
   - 클로드가 추측한 정책 ❌
   - 디자인·UX 큰 방향 ✅
   - 가격·약관·정책 ✅
   - 시스템 아키텍처는 ❌ (클로드 자율 영역)

2. **각 합의의 예상 구현 위치 명시**
   - 어느 파일에 박혀야 하는지
   - 어느 BL에 박혀야 하는지
   - 검증 가능한 코드 패턴 (grep 정규식)

3. **`_decisions/business-agreements.md` + `.json` 자동 추가** (수동 append 의무)
   - ID: `AGR-YYYY-NNNN` (연도별 순번)
   - status: 초기값 `not_implemented` (해당 채팅에서 코드 박았으면 `done`)

4. **인계서 헤더에 "이번 채팅 사업 합의 N건 — 미구현 M건" 박기**

---

## 6. 봇 책임 (톱니 3·4 — 2편에서 박음)

### verification-gap-bot (신설)
- **트리거:** 매 commit + 매일 KST 03:00
- **동작:** business-agreements.json의 모든 `not_implemented`/`partial` 항목에 대해 expected_location의 파일을 GitHub raw fetch → code_pattern grep → 결과에 따라 status 자동 갱신
- **알림:** status가 `done`으로 전환되면 텔레그램 ✅ / 일정 기간(7일) 이상 `not_implemented` 유지되면 텔레그램 ⚠️

### decision-tracking-bot (신설)
- **트리거:** chat-log 새 파일 push 시
- **동작:** chat-log 마지막 블록의 "⑤ 대표님 결정 필요" 섹션에서 합의 항목 추출 → business-agreements.md/.json에 자동 append (클로드가 수동 박은 것 보완)

---

## 7. admin-status.html 표시 (톱니 4 — 2편에서 박음)

상단에 신설 배지:
```
📋 미구현 사업 합의 3건 [상세 →]
```

클릭 시 모달:
- 합의 내용
- 합의 채팅 (chat-log 링크)
- 예상 구현 위치
- 관련 BL (tasks.json 링크)
- 며칠째 미구현인지

---

## 8. 새 채팅 인계서 헤더 통합 (톱니 5 — 2편에서 박음)

부칙 16 강제 헤더에 다음 블록 추가:

```
🚨🚨 작업 시작 전 사업 합의 점검 (부칙 20) 🚨🚨

이전 채팅들에서 합의됐으나 코드 미반영 N건:

1. [AGR-2026-0001] 라운드 3 (2026-05-24)
   합의: 한국 매니저 KRW 송금 분기
   예상 위치: sales.html
   관련 BL: BL-INVOICE-001

이 작업 시작 전, 위 N건 중 관련된 것이 있다면 먼저 박을 것.
없으면 인계서의 본 작업 진행.
```

---

## 9. 헌법 12원칙 자가 검증 (11개 다 통과)

| # | 질문 | 통과? |
|---|---|---|
| 1 | 클라우드만? | ✅ GitHub |
| 2 | 사람 손 없이 자동? | ✅ 봇 + 인계서 자동 |
| 3 | 핸드폰만 가능? | ✅ admin-status 배지 |
| 4 | 영구 보존? | ✅ business-agreements.md |
| 5 | 자동 검증? | ✅ verification-gap-bot |
| 6 | AI 가독? | ✅ .md + .json 이중 |
| 7 | 5초 파악? | ✅ admin 배지 |
| 8 | 동기화? | ✅ 정책 ↔ 코드 ↔ 합의 |
| 9 | 가역? | ✅ git |
| 10 | 자동 로딩? | ✅ 새 채팅 인계서 헤더 |
| 11 | 메모리 사이클 안? | ✅ 단순 추적 데이터 |

---

## 10. 운영 진입 후 폐기 항목 (없음)

이 시스템은 **개발기간뿐 아니라 운영 진입 후에도 영구 유지**. 사업 합의는 계속 발생하기 때문 (가격 변경·약관 수정·신규 기능 등).

---

## 11. 첫 박힘 우선순위 (BL-DECISION-TRACKING 작업 순서)

**1편 (이 채팅):**
1. ✅ 헌법 부칙 20 박음
2. ✅ 본 매뉴얼 박음
3. `_decisions/business-agreements.md` 신설 + 초기 데이터 채움
4. `_decisions/business-agreements.json` 신설 + 초기 데이터 채움
5. tasks.json에 BL-DECISION-TRACKING 신설 (status: in_progress, 5단계)

**2편 (새 채팅):**
6. verification-gap-bot 박음 (GitHub Actions)
7. decision-tracking-bot 박음 (GitHub Actions)
8. admin-status.html 배지 박음
9. 새 채팅 인계서 헤더 통합 (`_os/handoff-header.md` 갱신)
10. 라이브 검증 + commit
