# Phase 2 종합 라이브 검증 보고서

**작성일**: 2026-05-07 06:15 UTC
**작업 ID**: BL-OS-PHASE-2
**브랜치**: restructure-os-modularization
**작성자**: Claude (서비서)

---

## 결론

**Phase 2 종합 라이브 검증 통과 ✅** — OS 본체와 사업 코드 분리 완료.

main HEAD `1ab8828` 무손상 유지. restructure 브랜치에서만 작업.
_health.json overall=yellow (red 없음).

---

## 진행 방식

**B안 (manifest + 단계적 이동)** 채택.
- A안(직접 폴더 이동)은 경로 참조 수십 개 동시 갱신 → 하나 놓치면 깨짐
- B안: 각 단계 commit 별도 → 라이브 검증 실패 시 그 commit만 revert

---

## 단계별 결과

### 단계 1: `_os/` 폴더 + manifest.json + README ✅

- **commit**: 54b603a
- **결과**: OS 본체 자산 카탈로그 단일 진실원 박힘. scripts(12 OS / 5 사업), workflows(6), admin-pages(8 OS / 2 사업), data(4), charter(10 OS / 3 phase / 2 사업) 분류 완료.

### 단계 2: scripts/ → _os/scripts/ 이동 ✅ (핫픽스 1회)

- **commit**: aa0ef66 + b308a1a (핫픽스)
- **이동 OS 봇 12개**: sync_engine / sync_md / build_tasks / auto_detect / build-activity-feed / build-chat-log / scan-pages / pages-meta / sync-page-task-meta / health_check / snapshot / charter-mapping
- **워크플로 5개 경로 갱신**: sync.yml / auto-detect.yml / build-activity-feed.yml / page-status-scan.yml / chat-log-index.yml
- **남은 사업 코드**: apply-email-templates / validate-paypal / capture-pages / migrate-* (5개)

#### 핫픽스 내역 (b308a1a)

aa0ef66 commit 직후 sync-bot + auto-detect-bot failure 발생.
**원인**: Python/mjs 스크립트들이 `Path(__file__).parent.parent` / `resolve(__dirname, '..')`로 repo root를 산출. _os/scripts/로 이동 후 한 단계 더 위 필요.

7개 스크립트 갱신:
- Python (4개): `parent.parent` → `parent.parent.parent`
- mjs (3개): `resolve(__dirname, '..')` → `resolve(__dirname, '..', '..')`
- 추가: sync_engine.py의 GALLERY_META_FILE 경로도 `scripts/` → `_os/scripts/` 갱신

영향 없는 OS 봇 4개 (process.cwd() 또는 상대 경로 사용 → 위치 무관):
- pages-meta.mjs / sync-page-task-meta.mjs / build-chat-log-index.mjs / health_check_admin.mjs

### 단계 3: _os/workflows/manifest.json ✅

- **결과**: 워크플로 6개 매니페스트. GitHub Actions가 `.github/workflows/` 하위만 인식하는 제약상 실 파일은 그대로 유지하고 매니페스트로 OS 본체 표시.

### 단계 4: _os/admin-pages/manifest.json ✅

- **결과**: 관리자 페이지 OS 8개 vs 사업 2개 분류. Vercel 배포 경로 호환성을 위해 실 파일은 `_admin/`에 유지.

### 단계 5: _os/charter/manifest.json ✅

- **결과**: 헌법 + 운영 문서 매니페스트. OS 코어 10개 + Phase 보고서 3개 + 운영 문서 6개 + 사업 문서 2개. 실 파일은 루트 유지(sync_engine.py가 REPO 기준 직접 참조하므로).

### 단계 6: 종합 라이브 검증 ✅

- main HEAD `1ab8828` 무손상 유지
- _health.json overall=yellow (red 없음, Phase 2 통과 조건)
- tasks_schema=green / bots=green
- 5종 봇 모두 success on b308a1a (핫픽스 commit)

---

## 부수 발견 (헌법 부칙 8 적용)

### BL-OS-REPO-ROOT-DYNAMIC (신규 backlog)

- **발견 시점**: Phase 2 단계 2 commit aa0ef66 직후 sync/auto-detect bot failure
- **원인**: 스크립트가 자기 위치 기준 상대 경로로 repo root를 찾는 패턴 (`Path(__file__).parent.parent`)이 위치 의존적 — 향후 또 폴더 이동 시 같은 결함 반복.
- **정석 해결**: 환경변수 `GITHUB_WORKSPACE` 또는 `git rev-parse --show-toplevel`로 동적 산출.
- **우선순위**: P3 (Phase 2~5 진행 후 처리), 1h, claude_can_auto

---

## OS 본체 자산 인벤토리 (Phase 2 결과)

| 카테고리 | OS 본체 | 사업 코드 | 위치 |
|---|---|---|---|
| 스크립트 | 12 | 5 | OS는 `_os/scripts/`, 사업은 `scripts/` |
| 워크플로 | 6 | 0 | 전부 `.github/workflows/` (GitHub 제약) |
| 관리자 페이지 | 8 | 2 | 전부 `_admin/` (Vercel 호환성) |
| 데이터 | 4 (manifest 표기) | - | 전부 루트 (모든 봇/UI 참조) |
| 헌법/문서 | 10 코어 + 9 운영 | 2 | 전부 루트 |

---

## Phase 3 진입 준비

다음 단계 (Phase 3 — 인계서 기준):
- `install_os.sh` 작성
- Admin Skin (다크/라이트 토큰 분리 + 토글 UI)
- Brand Skin 분리 (`brand-tokens.json`)
- 현재 화려한 디자인 → Admin Clean으로 전환

---

**END OF REPORT**
