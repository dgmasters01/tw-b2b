# Phase 0 Baseline Snapshot — 2026-05-07

**작성일**: 2026-05-07
**기준 commit**: `1ab8828` (main HEAD, 2026-05-07 02:09 UTC)
**작성 commit**: Phase 0 단계 2/3
**작업 브랜치**: `restructure-os-modularization`

---

## 이 폴더의 목적

**대표님의 절대 걱정**: "수정하면서 기존 게 사라지면 안 됨. 절대로."

이 폴더는 OS 모듈화 작업 진입 직전의 **정상 작동 화면 베이스라인**입니다.
Phase 1~5에서 무엇을 수정하든, 여기 저장된 스냅샷과 비교해서 "기존 화면이 깨지지 않았는지" 자동 검증합니다.

---

## 스냅샷 대상

### `admin/` — 운영자 화면 8종

| 파일 | 크기 | 역할 |
|---|---|---|
| `admin-status.html` | 237 KB | 통합 현황 대시보드 (단일 진입점) |
| `admin-tasks.html` | 45 KB | 작업 관리 |
| `admin.html` | 1.2 MB | 메인 어드민 |
| `admin-business.html` | 17 KB | 사업 관리 |
| `admin-gallery.html` | 15 KB | 페이지 갤러리 |
| `admin-hub.html` | 2 KB | (폐기 예정 — 301 리디렉트 적용 중) |
| `admin-permissions.html` | 21 KB | 권한 관리 |
| `admin-service-ops.html` | 8 KB | 서비스 운영 |

---

## 복구 방법

만약 Phase 1~5 작업 중 어드민 화면이 깨졌다면:

```bash
# 1. 깨진 파일 확인
diff _admin/admin-status.html _os_snapshots/2026-05-07_phase0-baseline/admin/admin-status.html

# 2. 베이스라인으로 복구
cp _os_snapshots/2026-05-07_phase0-baseline/admin/admin-status.html _admin/admin-status.html

# 3. commit
git add _admin/admin-status.html
git commit -m "fix(OS): admin-status.html을 Phase 0 baseline으로 복구"
```

---

## 자동 검증 (Phase 0 단계 3/3에서 박힘)

`scripts/health_check_admin.mjs` (Phase 0 단계 3에서 생성 예정)이
매 commit마다 자동으로 baseline과 현재 admin 파일을 비교 → admin-status 맨 위에 빨간/초록 한 줄 표시.

---

**END**
