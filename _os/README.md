# `_os/` — TW OS 본체

**AI + 1인 사장이 사업 운영하는 OS** — 한 번 완성, 모든 프로젝트(원본 TW B2B + 외부 1호·2호·N호 + 미래 모든 프로젝트)에 설치만으로 즉시 자율 운영.

대표님 비전: **전세계 시장 1등.**

---

## 폴더 구조

```
_os/
├── manifest.json          ← OS 본체 자산 카탈로그 (단일 진실원)
├── README.md              ← 이 문서
├── scripts/               ← 봇 스크립트 + 동기화 엔진 (Phase 2 단계 2에서 이동)
├── workflows/             ← GitHub Actions 매니페스트 (실 파일은 .github/workflows에 유지)
├── admin-pages/           ← OS 관리자 페이지 매니페스트 (실 파일은 _admin/에 유지)
├── data/                  ← OS 운영 데이터 매니페스트
└── charter/               ← 헌법 + 운영 문서 매니페스트
```

## OS 본체 vs 사업 코드

`manifest.json`이 단일 진실원. "이 파일이 OS인가, 사업인가" 판단은 manifest를 기준으로.

- **OS 본체**: 다른 프로젝트에 그대로 복사해서 쓸 수 있는 자산
- **사업 코드**: TW B2B 고유 (호텔 예약, 결제, 사업 페이지 등)

## Phase 2 진행 방식 (B안 — manifest + 단계적 이동)

**A안 (직접 폴더 이동)**은 위험: 경로 참조 수십 개 동시 갱신 → 하나 놓치면 깨짐.
**B안 (manifest + 단계적 이동)**: 안전 — 각 단계 commit 별도, 라이브 검증 실패 시 그 commit만 revert.

### 단계 (BL-OS-PHASE-2)

1. ✅ `_os/` 폴더 생성 + manifest.json + README
2. ⬜ `scripts/` → `_os/scripts/` 이동 + 워크플로 경로 갱신
3. ⬜ `_os/workflows/` 매니페스트 (실 워크플로는 `.github/workflows`에 유지 — GitHub 제약)
4. ⬜ `_admin` → `_os/admin-pages/` 분류 매니페스트
5. ⬜ 헌법/운영 문서 → `_os/charter/` 매니페스트
6. ⬜ Phase 2 종합 라이브 검증

## Phase 3+ 예고

- **Phase 3**: `install_os.sh` 작성 + Admin Skin (다크/라이트) + Brand Skin (프로젝트별 brand-tokens.json)
- **Phase 4**: main 통합 + 헌법에 OS 모듈화 원칙 부칙 9·10·11 박기
- **Phase 5**: 1호 외부 적용 (대표님이 결정한 외부 프로젝트)

---

## 호환성 원칙

이번 Phase 2에서 파일 이동 시 다음을 보장:

1. **봇 워크플로 경로 갱신**: scripts/ 이동 시 `.github/workflows/*.yml`의 `python3 scripts/...` 또는 `node scripts/...` 호출 경로를 같은 commit에서 갱신
2. **루트 데이터 파일 유지**: `tasks.json`, `activity-feed.*`, `pages-status.*`는 루트 유지 (모든 봇과 UI가 참조 — 이동 비용 > 효익)
3. **단계별 라이브 검증**: 각 단계 commit 후 5종 봇 모두 success + _health.json overall=yellow only 확인 후 다음 단계
4. **롤백 준비**: 단계별 commit 분리 → 실패 시 그 commit만 revert

---

**진행 중**: Phase 2 단계 1/6 — `_os/` 폴더 + manifest 생성 완료. 단계 2 (scripts/ 이동) 진행 예정.
