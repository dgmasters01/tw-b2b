# BL-LIGHT-MODE-FOUNDATION 인계서 — 다음 채팅으로

**작업**: 어드민 13개 페이지 라이트 모드 정식 지원
**시작자**: 👤 이지형 (CEO)
**시각**: 2026-05-09
**진입점**: admin-status.html → 이상 화면 발견 → 정석 디자인 정책 결정

---

## 🎯 이번 채팅에서 한 일 (1편 — 기반 다지기)

### 단계 1: ✅ 완료 — Phase 0 배너 글자 겹침 fix
- **commit**: `d2deb98`
- **파일**: `_admin/admin-status.html` 라인 821~833
- **fix**: float:right → flex 레이아웃. 본문 길어져도 우측 토글과 절대 안 겹침.

### 단계 2: ✅ 완료 — 라이트 모드 색 변수 기반 추가
- **commit**: `2853250`
- **파일 1**: `shared.css` (전역) — `:root` 닫힌 직후 `@media (prefers-color-scheme: light)` 분기 + `[data-theme="light"]` 강제 분기 추가.
- **파일 2**: `_admin/admin-status.html` (첫 적용 사례) — 자체 `:root` 변수 블록에 동일 패턴 라이트 분기 추가.
- **결과**: admin-status.html 한 페이지는 이제 라이트 모드에서도 가독성 정상.

### 단계 3: ✅ 완료 — 이 인계서

---

## 🚀 다음 채팅에서 할 일 (2편 — BL-LIGHT-MODE-ROLLOUT)

**목표**: admin-status.html 외 12개 admin-* 페이지에 동일 패턴 적용.

### 대상 12개 페이지

```
_admin/admin.html
_admin/admin-business.html
_admin/admin-business-charter.html
_admin/admin-decisions.html
_admin/admin-decisions-index.html
_admin/admin-gallery.html
_admin/admin-hub.html  (※ 폐기 예정 페이지지만 일단 대상에 포함)
_admin/admin-manager-journey.html
_admin/admin-permissions.html
_admin/admin-service-ops.html
_admin/admin-tasks.html
_admin/admin-user-journey.html
```

### 정석 작업 패턴 (페이지마다 같은 흐름)

각 페이지의 `<style>` 안 `:root { ... }` 블록을 찾아서, 닫는 `}` 직후에 라이트 분기 박는다.

**템플릿** (admin-status.html 라인 44~89 그대로 복사 + 페이지별 변수 이름만 매칭):

```css
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --bg: <라이트 캔버스>;
    --panel: <카드 흰색>;
    --panel-2: <서브 패널>;
    --border: <라이트 보더>;
    --text: <진한 글자>;
    --text-muted: <서브 글자>;
    /* 페이지별 시맨틱·배지 변수 라이트 매핑 */
  }
}
[data-theme="light"] {
  /* 위와 동일 — OS 무관 강제용 */
}
:root { color-scheme: light dark; }
```

**라이트 색 표준 (admin-status에서 검증 완료)**:
- 캔버스: `--bg: #f8fafc`
- 카드: `--panel: #ffffff`
- 서브 패널: `--panel-2: #f1f5f9`
- 보더: `--border: #cbd5e1`
- 본문 글자: `--text: #0f172a` (진한 남색)
- 서브 글자: `--text-muted: #475569` (충분히 진해야 함, 절대 #94a3b8 같은 흐린 색 금지)
- 시맨틱: done=#15803d, pending=#1d4ed8, blocked=#b91c1c, p0=#b91c1c, p1=#c2410c, p2=#a16207
- 3-State 배지: auto-text=#14532d, staff-text=#1e3a8a, ceo-text=#713f12 (배경은 rgba 0.12~0.14)

### 페이지별 추가 점검 사항

각 페이지에 **변수 안 거치고 직접 하드코딩된 색**이 있을 수 있음. 라이트 모드에서 깨지는 흔한 패턴:

1. **흰색 글자가 직접 박힌 경우** (`color: #fff`, `color: white`, `color: rgba(255,255,255,...)`)
   → `color: var(--text)` 등으로 변환.
2. **검정 배경 직접 박힌 경우** (`background: #000`, `background: #0f172a`)
   → `background: var(--bg)` 또는 `var(--panel)` 등으로 변환.
3. **반투명 흰색 글래스** (`rgba(255,255,255,0.05)` 같은 글래스 효과)
   → 라이트에선 거의 안 보임. shared.css의 `--glass`, `--glass-2` 변수로 치환하면 자동 라이트 대응.

각 페이지 작업 후 라이브 검증:
- 크롬 DevTools → Rendering 탭 → "Emulate CSS media feature prefers-color-scheme" → light 선택 → 화면 가독성 확인.
- 안 보이는 글자 발견 시 해당 CSS 셀렉터 추적 → 변수화.

### 단계별 commit 권장

페이지 1~2개씩 묶어서 commit. 13개 한 번에 commit 박으면 회귀 추적 어려움. 예시:
- step1: admin.html + admin-tasks.html
- step2: admin-business.html + admin-business-charter.html
- step3: admin-decisions.html + admin-decisions-index.html
- step4: admin-gallery.html + admin-permissions.html
- step5: admin-manager-journey.html + admin-user-journey.html
- step6: admin-service-ops.html + admin-hub.html
- step7: 라이브 검증 + DECISIONS.md D-024 박음 + ops 메일

각 step 끝나면 `[step:done:N]` 태그로 commit 박기 (헌법 부칙 7).

---

## 📚 참고 결정 레코드 (다음 채팅에서 박을 D-024 초안)

```markdown
### 결정 D-024: BL-LIGHT-MODE-FOUNDATION + ROLLOUT — 어드민 13페이지 라이트 모드 정식 지원 ⭐⭐ 2026-05-09

**무엇을**: 어드민 페이지가 다크 캔버스 단일 테마로만 설계되어 있어 사용자 OS가 라이트 모드일 때 카드 본문 글자가 흰 배경 위 흐린 흰색으로 거의 안 보이던 가독성 결함. 라이트+다크 양쪽 모두 정식 지원으로 정책 결정.

**선택지 비교**:
| 선택지 | 결과 | 평가 |
|---|---|---|
| 다크 강제 (color-scheme:dark + body 다크 강제) | 30분 작업, 어드민 단일 테마 유지 | △ 사용자 환경 무시. 디자인 통일성은 좋음. |
| 라이트+다크 둘 다 제대로 지원 | 14개 파일 손봄, CSS 변수 재정의 패턴 13번 반복 | ✅ 채택 (대표님 결정). 사용자 OS 따라감, 접근성 정석. |

**정석 근거**:
- shared.css 단일 진실원에 라이트 변수 분기 박음 → 새 페이지 자동 라이트 대응.
- color-scheme: light dark 메타 → 폼 요소 자동 모드 매칭.
- aurora 시그니처는 양쪽 동일 → 브랜드 정체성 보존.

**연관**:
- BL-LIGHT-MODE-FOUNDATION (1편, 2026-05-09 완료): shared.css + admin-status.html 분기 추가.
- BL-LIGHT-MODE-ROLLOUT (2편, 진행 예정): 나머지 12개 페이지 동일 패턴 적용.
```

---

## 🚨 핵심 의무

- **헌법 1조**: 대표님은 결정만, 시스템이 실행. 페이지 위치·CSS 구조 질문 금지 (Claude 100% 자율).
- **부칙 7**: 단계 1개 = commit 1개. subject 에 `[step:done:N]` 태그 박기.
- **분량 판단 (12조)**: 13개 페이지 작업이면 한 응답에 다 못 끝낼 가능성 高. 단계 묶음 분할 권장 + 끊김 위험 시 인계서 박고 새 채팅.

---

## 🔧 인프라 정보 (다음 채팅 즉시 사용)

- **Repo**: dgmasters01/tw-b2b
- **GitHub PAT**: 대표님이 새 채팅 시작 시 메모리에서 자동 제공 (이 문서에 박지 않음 — secret scanning 회피)
- **ops endpoint**: `https://gohotelwinners.com/api/email/ops/notify-claude-work`
- **ops token**: 대표님 메모리에서 자동 제공 (헤더 이름: `x-ops-token`)
- **ops 필수 필드**: task_id, title, status, step, commit, summary
- **헌법**: `OPERATIONS_CHARTER.md` + `CLAUDE.md` (GitHub main에서 직접 fetch)
- **결정 레코드**: `DECISIONS.md` (D-024 박을 자리)
- **검증 방법**: 크롬 DevTools → Rendering → Emulate CSS prefers-color-scheme: light
