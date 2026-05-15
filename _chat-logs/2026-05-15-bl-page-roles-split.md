# BL-PAGE-ROLES-SPLIT — 두 페이지 역할 분리 헌법화 완료

**일시**: 2026-05-15
**BL**: BL-PAGE-ROLES-SPLIT
**대표님 결정**: D-039 — 시스템 완성도(만드는 곳) vs admin.html(굴리는 곳) 시간 축 분리
**최종 commit**: `d0e741e` (D-039) / `ed22cc6` (page-roles.md) / `0c8d213` (admin-status 정정) / `4fc43f8` (백업)

---

## 사실 진단 (라이브 fetch 의무 2가 또 사고 막음)

직전 채팅에서 클로드(저)가 "D-036 박을 예정"이라고 인계서에 박았으나, 라이브 DECISIONS.md fetch 결과 **D-036은 이미 2026-05-12에 BL-CHATLOG-BIZ-FORMAT으로 사용됨**. D-037, D-038도 박힘.

→ 정정: **D-039**로 박음. 라이브 fetch 안 했으면 D-036 덮어쓰기 사고 발생할 뻔.

---

## 변경 내용

### 1. DECISIONS.md (commit d0e741e)
- D-039 박음: 두 페이지 역할 분리 헌법화
- 시간 축 비유 + 두 페이지 박을 것/박지 말 것 표 + 클로드 책임 명시
- 헌법(OPERATIONS_CHARTER.md)에는 한 줄도 안 박음 — 부칙 14 준수

### 2. _os/playbook/page-roles.md 신설 (commit ed22cc6)
- 186줄 (250줄 한도 내)
- 8개 섹션: 한 줄 정의 / 시간 축 / 시스템 완성도 박을것·박지말것 / 운영 대시보드 박을것·박지말것 / 두 페이지 연결 / 클로드 자율 판정 규칙 / 미래 확장 / 헌법 안 박는 이유
- service-flow.md와 분리: 그쪽=외부 사용자 여정, 이쪽=내부 어드민 페이지 역할
- 클로드 자율 판정 규칙 명시 (5개 케이스)

### 3. admin-status.html 정정 (commit 0c8d213)
- 가짜 링크 `/admin.html#business-kpi` 제거
- 헤더 부제 변경:
  - 기존: "사업 KPI(매출/매니저/예약/조회수)는 별도 사업 대시보드 → /admin.html#business-kpi"
  - 신규: "사업이 굴러갈 때 사업 KPI는 💼 운영 대시보드(/admin.html)에서 봅니다. (현재 구축 중 — BL-ADMIN-OPERATIONS-DASHBOARD). 역할 분리 헌법: D-039 / page-roles.md"
- h1 부제: "(개발 영역)" → "(만드는 곳)" — 사람말 친화적
- meta description도 같이 정정

### 4. 백업 (commit 4fc43f8)
- _backup_20260515/admin-status-prefix-d039.html

---

## 자율 결정 사항 (claude-discipline 의무 3)

1. **D 번호 재할당**: D-036 → D-039 (인계서 진단 오류 라이브로 정정)
2. **page-roles.md 길이**: 186줄 (룰북 정석 — 250줄 한도)
3. **헤더 디자인**: 인라인 스타일 색상 박음 (admin-status.html은 단일 HTML 파일 패턴, shared.css에 새 토큰 박을 일 아님)
4. **외부 링크**: GitHub 직접 링크 (가짜 앵커 같은 사고 다시 안 만들기 위해 실재 자원만 가리킴)
5. **솔직 안내**: "현재 구축 중 (BL-ADMIN-OPERATIONS-DASHBOARD)" — admin.html이 빈 상태임을 화면에서 솔직히 표시. 다음 채팅 클로드가 헷갈리지 않음.

---

## 후속

- **BL-ADMIN-OPERATIONS-DASHBOARD** 의존 해제 (이 BL이 박혔으므로 진행 가능)
- **BL-SYSTEM-MANUAL-AUTOGEN** 의존 해제 (page-roles.md 6섹션에 매뉴얼 5섹션 그림 미리 박음)
- 이후 모든 BL에서 클로드는 page-roles.md를 자동 fetch해서 "이 박스 어디 박을까" 헷갈림 0건

---

## 헌법 위반 방지 — 이 BL에서 지켜낸 것

1. ❌ "헌법에 박자" → ✅ DECISIONS.md + playbook에 박음 (부칙 14 준수)
2. ❌ 인계서 D-036 그대로 사용 → ✅ 라이브 fetch로 D-039 정정 (부칙 16 의무 2)
3. ❌ "A/B/C 선택해주세요" 던지기 → ✅ D-039 표현·page-roles.md 구조·인라인 색상 모두 자율 결정 (부칙 16 의무 3)
4. ❌ 클로드 언어 보고 → ✅ "만드는 곳/굴리는 곳" 비유 (부칙 16 의무 4)

---

**Maintained by**: 클로드 (under direction of 이지형 대표님)
