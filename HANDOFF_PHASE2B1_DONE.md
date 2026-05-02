# Phase 2-B-1 완료 핸드오프 (2026-05-03)

> 다음 채팅 시작 시 **이 파일 전체를 첫 메시지로 붙여넣기** 하세요.
> Claude가 컨텍스트 자동 로드 후 Phase 2-B-2 / 2-B-4 진행 가능.

---

## ✅ Phase 2-B-1 완료 요약

### 작업 내용
**tasks.json v2 마이그레이션** — 51개 작업 전체에 신규 필드 2개 추가
- `owner` : `"human"` | `"autonomous"`
- `approval_required` : `true` | `false`

### 결과 분포
- `owner = autonomous` : **34개** (외근모드 자율 처리 가능)
- `owner = human` : **17개** (대표님 결정/승인 필요)
- 화이트리스트 4건 (키워드 매칭 + 강제 지정): SQ-F, CHG-15, BL-005, SQ-G

### 보존 검증 통과
- 기존 필드(`category`, `status`, `priority`, `notes`, `history` 등) 일절 변경 없음
- `category` 분포 적용 전후 동일: ux=11, bug=12, dev=21, docs=2, infra=2, design=3

### 커밋 / 라이브
| 항목 | 값 |
|---|---|
| 커밋 해시 | `2772061` |
| 라이브 반영 커밋 기록 | (별도 docs 커밋 — CHANGELOG에 기록) |
| 라이브 URL | https://gohotelwinners.com/tasks.json |
| 라이브 HTTP | 200 OK 검증 완료 |
| 백업 (롤백 가능) | `tasks.json.bak_20260503` (git 보존) |

### 변경 파일
- `scripts/migrate_tasks_v2.ps1` (신규, 317 lines, UTF-8 BOM, PS 5.1 호환)
- `tasks.json` (수정, +102 lines)
- `tasks.json.bak_20260503` (백업, 신규 커밋)
- `CHANGELOG.md` (수정)

### 롤백 절차
필요 시 다음 한 줄로 즉시 원상복구:
```powershell
Copy-Item -Force tasks.json.bak_20260503 tasks.json
git add tasks.json && git commit -m "revert: Phase 2-B-1" && git push
```

---

## 🔜 다음 작업 (Phase 2-B-2, 2-B-4)

### Phase 2-B-2 — UI 골격
- 대상: `admin-tasks.html`
- 목표: 신규 필드(`owner`, `approval_required`) 시각화
  - 작업 카드/행에 `human` / `autonomous` 뱃지
  - `approval_required = true` 인 작업은 별도 강조 (테두리/아이콘 등)
  - 필터: "외근모드 가능 작업만" 토글 (autonomous + approval=false)
- CLAUDE.md NEVER 룰 #1 (admin-business / admin-gallery 무변경) — `admin-tasks.html` 은 해당 안 됨, 수정 가능
- 백업 자동 생성: `admin-tasks_backup_YYYYMMDD.html`

### Phase 2-B-4 — 외근모드 로직 변경
- 대상: `.claude/commands/외근모드.md`
- 현재 로직: `autonomous.can_run_alone == true` 기준 작업 선별
- 신규 로직: `owner == "autonomous"` AND `approval_required == false` AND `status in ["pending", "blocked"]`
- 두 기준의 일치/불일치 검토 필요 (기존 `autonomous.can_run_alone` 와 신규 owner 분류 차이)

### Phase 2-B-3 — 명세서 현실화 (선택)
- 대상: `docs/SPEC_TASK_V2.md` (현재 미존재)
- 옵션 C 결정 반영: category 신규 enum 폐기, 기존 값 유지
- 화이트리스트 4건도 명세에 반영 가능

---

## ⚠️ 주의사항

### tasks.json v2 데이터는 적용됐지만 UI는 v1
- `admin-tasks.html` 은 신규 필드(`owner`, `approval_required`) 를 **읽지도 표시하지도 않음**
- JSON 스키마 호환성: 기존 v1 UI 코드는 신규 필드를 단순 무시 → **정상 동작**
- 따라서 라이브 admin-tasks 페이지는 외관상 변화 없음 (의도된 결과)

### 외근모드는 아직 v1 로직
- `autonomous.can_run_alone` 기준으로 동작 중
- Phase 2-B-4 적용 전까지는 `owner` / `approval_required` 무시됨
- 일관성 유지를 위해 **2-B-2 (UI) → 2-B-4 (로직)** 순서 권장

### 5대 핵심 참조 문서
- 작업 시작 전 항상 확인: BUSINESS.md, DECISIONS.md, BUSINESS_FLOW.md, BACKLOG.md, admin-gallery.html

### CLAUDE.md NEVER 룰
- 백업 자동 (`_backup_YYYYMMDD`)
- CHANGELOG.md `[변경사유]` 태그 필수
- 핵심 .md 자동 덮어쓰기 금지
- 5개 이상 파일 / 100줄 이상 / 디자인 시스템 / DB 스키마 → 체크포인트 커밋 먼저
- 작업 단위 1~2개로 작게
- 기술 워크플로우 결정은 Claude 자체 판단 (대표님께 묻지 말 것)

---

## 📋 다음 채팅 첫 명령 예시

```
Phase 2-B-2 시작.

[작업 목표]
admin-tasks.html에 owner/approval_required 필드를 시각화한다.
1단위로 진행하고 끝나면 보고 후 멈출 것.

[해야 할 일]
1. admin-tasks.html 현재 구조 분석 (작업 카드/리스트 렌더링 위치)
2. 백업 생성: admin-tasks_backup_20260504.html
3. 다음 UI 추가:
   - 각 작업에 owner 뱃지 (autonomous=초록, human=주황)
   - approval_required=true 인 작업은 좌측 테두리 강조 (예: 빨강 3px)
   - 상단 필터 토글: "외근모드 가능 작업만" (autonomous + approval=false + status=pending|blocked)
4. dry-run 검증: 브라우저에서 51개 모두 정상 표시되는지 확인 가이드
5. CHANGELOG, commit, push 대기 (대표님 승인 후)

[금지 사항]
- admin-business, admin-gallery 일절 건드리지 말기
- admin-tasks.html 의 기존 v1 동작 회귀 금지
- 외근모드 로직(.claude/commands/외근모드.md) 은 다음 1단위, 이번엔 무시
```

---

_생성일: 2026-05-03_
_생성자: Claude (서비서) under direction of 이지형 대표님_
_관련 커밋: `2772061` (Phase 2-B-1)_
