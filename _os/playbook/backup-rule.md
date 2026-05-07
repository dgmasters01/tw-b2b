# Playbook — 백업·CHANGELOG·체크포인트 규칙

> **헌법 원칙 9 (가역성) 운영 디테일.**

---

## 1. _backup_YYYYMMDD 자동 백업 (NEVER 룰 ②)

- HTML·핵심 .md 파일 수정 전 **반드시** 동일 디렉토리에 백업.
- 형식: `파일명_backup_YYYYMMDD.확장자`
- 예: `manager-dashboard.html` → `manager-dashboard_backup_20260507.html`
- `.gitignore`에 `_backup_*/` 등록되어 있어 commit 안 됨 (정상).

## 2. CHANGELOG.md `[변경사유]` 태그 (NEVER 룰 ③)

모든 코드 수정은 `CHANGELOG.md`에 기록.

```markdown
## YYYY-MM-DD
- [변경사유: 사유 요약] 변경 내용
```

git commit 메시지에도 `[변경사유]` 태그 포함:

```
fix: 모달 닫기 버튼 null-safe 처리 [변경사유: 콘솔 에러 P0]
```

## 3. 핵심 .md 자동 덮어쓰기 금지 (NEVER 룰 ④)

다음 파일은 **부분 수정만** 허용 (`str_replace` 등):

- `CLAUDE.md`
- `OPERATIONS_CHARTER.md`
- `BUSINESS.md`
- `DECISIONS.md`
- `BUSINESS_FLOW.md`
- `BACKLOG.md`

전체 재작성 필요 시 반드시 대표님께 사전 확인.

## 4. 큰 변경 전 체크포인트 commit (NEVER 룰 ⑤)

다음 조건 중 하나라도 해당하면 **체크포인트 commit** 먼저 만들고 작업:

- 5개 이상 파일 수정 예정
- 100줄 이상 단일 파일 수정 예정
- 디자인 시스템(공통 CSS/JS) 수정
- DB 스키마 관련 파일 수정

체크포인트 commit 메시지:

```
checkpoint: <작업명> 시작 전 [변경사유: 롤백 안전장치]
```

## 5. 비상 복구 (헌법 9 가역성)

### Vercel 배포 실패 시
1. `vercel logs` 확인
2. 직전 commit으로 롤백: `git revert HEAD && git push`
3. 대표님께 즉시 보고

### 라이브 페이지 500 에러 시
1. Supabase 상태 확인 (`vjsludfjsphwnumuoqaj`)
2. Vercel 환경변수 누락 여부 확인
3. 직전 정상 commit으로 롤백

### 토큰 한계 임박 시
- 현재 작업 상태를 `_os/handoff/current.md` 또는 임시 컨텍스트 블록으로 저장
- 부칙 13에 따라 새 채팅 시작 권장 (인계 명령문 박스 자동 제공)

---

**원본 위치**: `CLAUDE.md` NEVER 룰 ②③④⑤ + 13. 비상 절차 (룰북으로 이전됨)
**Last updated**: 2026-05-07
