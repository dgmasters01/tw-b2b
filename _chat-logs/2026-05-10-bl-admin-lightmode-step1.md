# 2026-05-10 BL-ADMIN-LIGHTMODE 1단계 — 디자인 토큰 표 확정 + 5결정 (D-022)

**작업 단위**: BL-ADMIN-LIGHTMODE (admin 라이트 모드 정식 지원)
**단계**: 1단계 = 디자인 토큰 표 확정 (조사 + 시안 + 5결정 D-022). **코드 변경 없음** — 문서·결정만 박음.
**HEAD before**: 586fe64 ([health-bot] _health.json 갱신)
**HEAD after**: (이 채팅 내 5건 commit 후 갱신)
**라이브 영향**: 없음 (문서 변경만)

---

## [블록 1] 직전 채팅 1차 시도 revert 진단

**1차 시도 결과**: 화면 깨져서 전부 롤백 (commit 726994d, 362a104 revert).

**전수 조사로 밝힌 진짜 원인**:
1. **9개 페이지가 자체 `:root` 블록에 다크 색을 박아두고 있음**.
2. **토큰 이름이 shared.css와 다른 체계**:
   - shared.css: `--bg-2`, `--ink`, `--line`, `--ink-3`
   - 페이지: `--panel`, `--text`, `--border`, `--text-muted`
3. → shared.css만 라이트로 바꿔도 페이지 :root가 다크 색을 덮어써서 안 바뀜.

**재발 방지 조치**: 3단계에서 페이지 :root 9개 모두 삭제 + shared.css 단일 진실원으로 일원화.

---

## [블록 2] 페이지 그룹 분류 (전수 조사 결과)

| 그룹 | 페이지 수 | 현재 상태 |
|---|---|---|
| **그룹 1 — 자체 :root 다크** | 7개 | `--bg:#0f172a` / `--panel:#1e293b` |
| **그룹 2 — 자체 :root 라이트** ⚠️ | 1개 (`admin-tasks.html`) | `--bg:#f8fafc` / `--panel:#ffffff` (라이트 잔재) |
| **그룹 3 — 자체 :root 글래스** | 1개 (`admin-permissions.html`) | `--bg:#0a0a0f` / `--panel:rgba(20,20,30,0.85)` |
| **그룹 4 — :root 없음** | 4개 (`admin`, `admin-business`, `admin-gallery`, `admin-hub`) | shared.css 토큰만 사용 |

**🚨 발견**: `admin-tasks.html`이 직전 revert 후에도 라이트 색으로 박혀있음. 결정②로 다크 통일 처리.

---

## [블록 3] 하드코딩 색 분포 (2단계 매핑 우선순위)

| 페이지 | rgba | hex | 위험도 |
|---|---:|---:|---|
| `admin-status.html` | 219 | 248 | 🔴 P0 |
| `admin.html` | 60 | 437 | 🔴 P0 |
| `admin-tasks.html` | 22 | 85 | 🟠 P1 |
| `admin-permissions.html` | 22 | 17 | 🟡 P2 |
| `admin-service-ops.html` | 21 | 25 | 🟡 P2 |
| (이하 7개 P2~P3) | … | … | … |

→ status + admin 두 페이지가 전체 위험의 60%+. 2단계는 이 두 페이지부터.

---

## [블록 4] 5결정 (D-022 — DECISIONS.md에 박음)

| # | 결정 | 확정값 |
|---|---|---|
| ① | 시안 색감 | 그대로 (다크 기본 + 라이트 한 쌍, 시안 검토 통과) |
| ② | `admin-tasks.html` 라이트 잔재 | **다크로 통일** (3단계 :root 삭제 시 자동 해소) |
| ③ | 라이트 본문 ink | **`#1E293B`** (`#0F172A`보다 한 단계 부드럽게) |
| ④ | 토글 위치 | **사이드바 하단 공통** (한 곳=13개 페이지 동시 적용) |
| ⑤ | 기본값 | **`prefers-color-scheme` OS 설정 따라감** + 사용자 토글이 우선 (localStorage) |

**박은 이유 (정석 5기준)**: 단일 진실원, 자동 동기화, 표준 패턴(`prefers-color-scheme`은 W3C 표준), 재발 방지(:root 중복 영구 제거), 가역성(localStorage 1key 삭제로 OS 설정 복귀).

---

## [블록 5] 시각 시안 (대표님 검토 통과)

다크(왼쪽) ↔ 라이트(오른쪽) 1:1 비교. Command Center 헤더 / 진행률 카드 / 3-State 배지 / 미니 표 동일 레이아웃.
색 팔레트도 단계별(배경 4단계 / 글자 5단계 / 상태 4종) 한 쌍씩 시각화.
→ 대표님 "5개 다 클로드 정석 판단으로 진행" → 확정.

---

## [블록 6] 산출물 (이 1단계에서 박은 것)

| 위치 | 내용 |
|---|---|
| `DECISIONS.md` | D-022 추가 |
| `_os/playbook/admin-lightmode-tokens.md` | **확정 토큰 표** (단일 참조원, 2~5단계 작업 기준) |
| `tasks.json` | BL-ADMIN-LIGHTMODE 등록 + progress.steps 6단계 (1단계 done) |
| `_chat-logs/2026-05-10-bl-admin-lightmode-step1.md` | 이 파일 |
| `_chat-logs/index.json` | byTask 매핑 (헌법 부칙 15) |

---

## [블록 7] 다음 단계

- **2단계** — 13개 페이지 하드코딩 rgba/hex → 토큰 1:1 매핑 표 (status + admin 우선)
- **3단계** — 페이지 :root 9개 삭제 + shared.css에 `[data-theme="light"]` 블록 박음
- **4단계** — admin-status + admin-tasks 2페이지 Before/After 스크린샷 검토
- **5단계** — 검토 통과한 토큰만 페이지 1개씩 commit (단계 1개=commit 1개)

각 단계는 별도 채팅 권장 (한 채팅 한 결정 — 사전 안전장치 3번).

---

## [블록 8] 자가 검증 11개

| # | 통과 | 내용 |
|---|---|---|
| 1 | ✅ | 토큰 표·결정 모두 GitHub에만 (클라우드 단일) |
| 2 | ✅ | 다음 세션 Claude가 이 chat-log 1개로 100% 맥락 복원 |
| 3 | ✅ | 핸드폰에서 시안 확인·결정·승인 가능 |
| 4 | ✅ | DECISIONS + chat-log + tasks.json 3중 영구 기록 |
| 5 | ⏸️ | 코드 박는 5단계에서 검증 (이 단계는 문서만) |
| 6 | ✅ | byTask 매핑 + 토큰 표 단일 참조원으로 다음 세션 맥락 보장 |
| 7 | ✅ | tasks.json BL-ADMIN-LIGHTMODE 1/6 단계 완료 5초 내 파악 |
| 8 | ✅ | DECISIONS / chat-log / 토큰 표 / tasks.json 4중 동기화 |
| 9 | ✅ | git revert로 모든 5건 동시 롤백 가능 |
| 10 | ✅ | 부팅 헌법 자동 로딩 |
| 11 | ✅ | 개발 모드 (운영 진입 전) |

---

**Last updated**: 2026-05-10
**Maintained by**: 클로드
