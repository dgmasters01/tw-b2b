# Playbook — OS 핵심 철학·원칙 디테일

> **헌법 본문 요약**: "각 프로젝트는 완전 독립. 틀은 강제, 내용은 자유."
> 이 룰북은 그 운영 디테일을 다룬다.

---

## 1. 각 프로젝트 완전 독립 (철학)

### 비유

- ❌ 통합 본사 (X) — 한 어드민에서 모든 프로젝트 관리
- ✅ 각 매장 사장 따로 + 운영 매뉴얼 동일 (O) — 각 프로젝트 별개 어드민, OS만 동일

### OS가 하는 것

- 동일한 11대 원칙 + 부칙 적용
- 동일한 5종 봇 (sync / auto-detect / scan / activity-feed / health-check)
- 동일한 메뉴 영역 분류 표준 (DOCS / TOOLS / OS-CORE / SYSTEM)
- 동일한 디자인 토큰 (`admin-skin.css` + `brand-skin.template.css`)
- 동일한 헌법 자가 검증 절차

### OS가 하지 않는 것 (절대 금지)

- 프로젝트 간 데이터 통합
- 프로젝트 간 사용자 통합
- 프로젝트 간 어드민 통합
- TOOLS 영역 구체 메뉴 강제 (각 프로젝트 자율)

### 적용 범위

| 프로젝트 | OS 적용 | 별개 운영 |
|---|---|---|
| TW B2B (gohotelwinners) | ✅ | - |
| 호텔이야 | ✅ | - |
| 여행능력자들 8개 채널 | ✅ | - |
| CEYLON JOURNEY | ✅ (인프라 원칙만) | 별개 비즈니스, 시스템 완전 분리 |

## 2. 틀은 강제, 내용은 자유 (원칙)

### OS가 강제하는 틀 (모든 프로젝트 동일)

- **사이드바 4영역 분리:** DOCS / TOOLS / OS-CORE / SYSTEM
- **DOCS 5개 페이지 (필수):**
  - 비즈니스 헌장 (BUSINESS.md)
  - 의사결정 이력 (DECISIONS.md)
  - 의사결정 인덱스 (DECISIONS_INDEX.md)
  - 매니저 여정 (GOHOTEL_FLOW.md)
  - 사용자 여정 (BUSINESS_FLOW.md)
- **OS-CORE 1개 페이지 (필수):** 페이지 갤러리 (admin-gallery)
- **SYSTEM 4개 페이지 (필수):** 시스템 완성도 / 작업 관리 / 권한 / 운영 매뉴얼
- **봇 5종 / 헌법 / 디자인 토큰 / 자동 동기화 (5초 내)**

### OS가 강제하지 않는 내용 (각 프로젝트 자율)

- **TOOLS 영역의 구체 메뉴** — 각 프로젝트가 자기 사업에 맞게 자유롭게 추가
- **이유:** gohotelwinners는 '호텔 관리/예약 관리/Agoda 매칭'이 진짜 이름이지 '콘텐츠/상품/거래' 같은 추상 이름이 아님. 표준 메뉴 강제 시 추상 이름과 진짜 사업 이름 충돌 → 또 뒤죽박죽.

### 각 프로젝트 TOOLS 메뉴 추가 메커니즘

1. `_admin/tools/` 폴더에 새 페이지 (예: `_admin/tools/hotel-management.html`)
2. `business-context/tools-manifest.json`에 등록
3. 사이드바가 자동으로 TOOLS 영역에 추가 (부칙 8 자동 동기화)

### 영역 강제 메커니즘

- `_os/admin-pages/menu-manifest.json` — 영역 정의 단일 진실원
- `business-context/tools-manifest.json` — 각 프로젝트 TOOLS 메뉴 정의
- 사이드바는 두 manifest를 합쳐 영역별 구분선 + 라벨 자동 박음
- **영역 manifest 미박힘 = 사이드바 표시 안 됨 (강제)**

---

**원본 헌법 위치**: `OPERATIONS_CHARTER.md` "OS 핵심 철학" + "OS 핵심 원칙" 섹션
**Last updated**: 2026-05-07
