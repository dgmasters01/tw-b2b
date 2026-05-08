# BL-DEDUP-CONSOLIDATE — 연결고리 지도 (Dependency Map)

> **목적:** admin-status.html의 ③·⑥·⑦ 섹션을 제거하고 ④ 작업 지휘소로 통합하기 전,
> **무엇이 무엇과 연결돼 있는지** 코드를 직접 추적하여 영구 박은 사전 분석 문서.
>
> 헌법 9조(가역성) + 헌법 5조(무인 검증) 정신 — 손대기 전에 영향 범위 100% 파악 후 단계별로 진행.

**작성일:** 2026-05-08
**작성 근거:** 대표님 우려 — "수정 후 연동이 안 돼서 하나씩 다시 체크해야 하는 상황 어떻게 해결할 건가"
**파일:** `_admin/admin-status.html` (5867줄)

---

## 1. 화면 섹션 ID 매핑 (현재 구조)

| 섹션 | HTML ID / 클래스 | 줄 위치 (대략) | 처리 방향 |
|---|---|---|---|
| ① 현재 진행 중 | `#next-action-box` (`.next-action`) | 924 | **유지** |
| ② 전체 평균 게이지 | `.avg-card` | 967 | **유지** |
| ③ 작업 분포 KPI 4종 | `.stats-grid` + `.stat-card[data-role-filter]` | 986 | **제거** |
| ④ 🎮 작업 지휘소 | `#command-center` | 1021 | **본체 유지·보강** |
| ⑤ 5 시스템 카테고리 카드 | `#cat-grid` | 1715 | **유지 + 카테고리별 진행률 흡수** |
| ⑥ 임박 섹션 | `<section class="integ-section">` | 1822 | **제거 (각 부분 흡수/삭제)** |
| ⑦ 결정 대기 박스 원본 | `#ceo-wait-box` | 1865 | **제거 (DOM 이동 코드도 함께)** |
| ⑧ 시급 페이지 TOP 10 | `.top-box` + `#top-list` | 1872 | **유지** |
| 활동 이력 | (활동 펼침 패널) | 별도 | **유지** |
| 건강 검진 박스 | `#phase0-health-bar` | 802 | **유지 + 헌법 검증 27/27 흡수** |

---

## 2. ⑥ 임박 섹션 안에 박힌 자식 요소들 (각각 어디로 가나)

| 자식 요소 | 현재 ID | 처리 |
|---|---|---|
| KPI 4종 (마감/완료율/진행수/막힘) | `#integ-kpi-row` (`#ik-dday`, `#ik-done`, `#ik-active`, `#ik-blocked`) | **④ 작업 지휘소 헤더에 한 줄로 흡수** |
| 임박 작업 카드 | `#integ-urgent` (`.urgent-grid`) | **삭제** (④ 슬롯이 역할별로 이미 보여줌) |
| 카테고리별 진행률 | `#integ-progress` (`.progress-list`) | **⑤ 카테고리 카드 영역으로 이동** |
| 자율 작업 큐 원본 | `#integ-auto-queue` (`.auto-queue-grid`) | **삭제** (④ 슬롯 2가 같은 데이터 — 단, 슬롯 2 코드를 자립형으로 리팩토링 필요) |

---

## 3. JS 연결고리 — 손대면 깨지는 코드 위치 (정확한 줄)

### A. DOM 이동 로직 (가장 위험)
**위치:** 5393~5414줄 — `moveExistingBoxesIntoCommandCenter()`
**동작:** `#ceo-wait-box` (⑦) 와 `#integ-auto-queue` (⑥ 안 자율 큐 원본) 을 `#cc-slot-ceo-body` / `#cc-slot-auto-body`로 DOM 이동.
**제거 시 영향:** ⑦/⑥ 원본을 지우면 이 함수가 null 참조로 실패. 작업 지휘소 슬롯 1·2가 비어버림.
**처리:** ⑦/⑥ 제거와 동시에 이 함수를 **자립형 렌더 함수**로 교체 (DOM 이동이 아닌 슬롯에 직접 박는 방식).

### B. ③ stat-card 클릭 핸들러 (5222~5279줄)
**동작:** `data-role-filter` 클릭 → `STATE.urgentFilter` 박음 → `renderIntegratedUrgent()` 호출 → `#integ-urgent`로 스크롤·펄스 강조.
**제거 시 영향:** ③ 자체를 지우면 핸들러 등록 시도 시 빈 배열 — 에러 없이 그냥 등록 안 됨 (안전).
**처리:** ③ 삭제 + `renderIntegratedUrgent()` 함수 + `STATE.urgentFilter` 전역 상태 + `kpi-target-highlight` CSS 모두 정리.

### C. ③ stat-card 더블클릭 펼침 핸들러 (5281~5380줄 추정)
**동작:** 더블클릭 → `#stat-expand-panel` 펼침 + 작업 목록 + ▶ 즉시 시작 버튼.
**제거 시 영향:** ③ 자체를 지우면 핸들러 등록 안 됨.
**처리:** ③ 삭제 + `#stat-expand-panel` HTML + 핸들러 코드 + 관련 CSS 모두 정리. 단 **▶ 즉시 시작 버튼 로직은 ④ 슬롯 카드로 이식**.

### D. KPI 4종 렌더 (`renderIntegratedUrgent` 안, 2845~2865줄)
**동작:** `tasks.json`에서 done/inProgress/pending/blocked 카운트해서 `#ik-dday`, `#ik-done`, `#ik-active`, `#ik-blocked`에 박음. 동시에 `#stat-auto`, `#stat-staff`, `#stat-ceo`도 박음.
**제거 시 영향:** ⑥ 제거 + ③ 제거하면 setter 6개가 null 참조 → `if (el)` 가드 있어 에러 없음.
**처리:** 이 함수를 작업 지휘소 헤더용으로 리팩토링. 새 함수명 `renderCommandCenterHeader()` 박음.

### E. 데드라인 배너 카운트 (`updateDeadlineBanner` 호출)
**동작:** 데드라인 배너 detail에 "🤖 자동 16건 · 👥 직원 8건 · 👤 결정 4건 · 🚫 막힘 11건" 표시.
**제거 시 영향:** ③ 제거해도 이 배너는 살아있음. `taskRole()` 함수가 그대로 작동.
**처리:** **유지**. 배너는 ③의 정보를 자연 백업.

### F. ⑤↔⑧ drill-down (2378~2420줄)
**동작:** 시급 페이지 TOP 10 row 클릭 → `pageToMenuKey()` → `STATE.expandedKey` 박음 → 카테고리 카드 펼침. 동시에 `STATE.expandedProgressCat` → `renderIntegratedProgress()` → `#integ-progress` 행 강조.
**제거 시 영향:** ⑥의 `#integ-progress`를 제거하고 ⑤로 이동시키면 → drill-down 두 번째 단계가 빈 곳을 가리킴.
**처리:** `#integ-progress`를 ⑤ 안에 새 ID `#cat-progress` (또는 동일 ID 유지)로 옮기고, `renderIntegratedProgress()`의 selector도 같이 갱신. **단계 2에서 ⑤ 안에 박는 시점에 동시 갱신**.

### G. 폴링 (`startPolling`)
**동작:** 5초마다 `tasks.json` 가져와 `renderIntegratedUrgent()` + `renderIntegratedProgress()` 호출.
**제거 시 영향:** 두 함수가 사라지면 폴링 콜이 깨짐.
**처리:** 폴링이 호출하는 함수를 새 자립형 함수로 교체. 함수명 그대로 유지하되 내부 동작만 새 화면 구조에 맞게.

---

## 4. CSS 연결고리 — 사용 안 하면 정리해야 할 클래스

| 클래스 | 줄 위치 | 처리 |
|---|---|---|
| `.urgent-section-header` | 153 | 삭제 (⑥ 헤더용) |
| `.urgent-grid`, `.urgent-card`, `.urgent-pill` 계열 | 363~385 | 삭제 (단, ④ 슬롯 카드가 같은 시각이면 이름 바꿔 재사용 검토) |
| `.integ-kpi-row`, `.integ-kpi` 계열 | 506~520 | **유지** — ④ 작업 지휘소 헤더에서 재사용 |
| `.stats-grid`, `.stat-card` 계열 | 101~137 | 삭제 (③ 전용) |
| `#stat-expand-panel` 인라인 스타일 | 1014~1019 | 삭제 (③ 더블클릭 펼침 패널) |
| `kpi-target-highlight` 애니메이션 | (별도 위치) | 삭제 (③→⑥ 연결 시각 효과) |
| `slide-in-right`, `kpi-arrow-marker` 애니메이션 | (별도 위치) | 삭제 |
| `linked-highlight` (⑤↔⑧ drill-down 펄스) | 139 부근 | **유지** |

---

## 5. 전역 STATE 변수 — 제거/유지 분류

| 변수 | 현재 용도 | 처리 |
|---|---|---|
| `STATE.urgentFilter` | ③ 클릭 → ⑥ 임박 박스 필터 | **삭제** |
| `STATE.expandedKey` | ⑤ 카테고리 카드 펼침 상태 | **유지** |
| `STATE.expandedProgressCat` | ⑥ 카테고리별 진행률 펼침 — ⑤로 이동 후도 사용 | **유지** (selector만 갱신) |
| `STATE.data` | tasks.json 캐시 | **유지** |
| `STATE.tasksData` | tasks.json 별도 캐시 | **유지** |
| `STATE._hintTimer` | "👈 여기가 KPI 결과" 4초 타이머 | **삭제** |

---

## 6. 단계별 진행 시 검증 체크리스트 (정석)

각 단계 완료 후 이 체크리스트를 통과해야 다음 단계 진입 허용.

### 단계 1 후 — 작업 지휘소 헤더에 KPI 흡수
- [ ] 라이브 admin-status.html에서 작업 지휘소 헤더에 "완료 N/M (P%) · 진행 X · 막힘 Y" 표시됨
- [ ] 5초 폴링으로 헤더 숫자 자동 갱신됨
- [ ] ⑥ KPI 4종은 아직 그대로 (이중 표시 — 단계 5에서 제거 예정, 일시 허용)
- [ ] 콘솔 에러 0건

### 단계 2 후 — 카테고리별 진행률 ⑤로 이동
- [ ] ⑤ 카테고리 카드 영역 안에 카테고리별 진행률 막대 표시됨
- [ ] 시급 페이지 TOP 10 (⑧) row 클릭 시 진행률 펄스 강조 정상 동작 (drill-down 보존)
- [ ] ⑥의 `#integ-progress`는 빈 상태 또는 제거됨
- [ ] 콘솔 에러 0건

### 단계 3 후 — 작업 지휘소 슬롯에 ▶ 즉시 시작 / ▶ 메일 발송 버튼
- [ ] 자율 큐 카드에 ▶ 즉시 시작 버튼 박힘, 클릭 시 인계서 클립보드 복사 + ops 알림 정상
- [ ] 직원 큐 카드에 ▶ 메일 발송 버튼 박힘 (또는 placeholder — 실제 메일 발송 흐름은 별건 BL)
- [ ] 대표님 결정 슬롯 카드 클릭 시 인계서 모달 + 결정 입력란 펼침 (BL-URGENT-CARD-FLOW 흡수)
- [ ] 콘솔 에러 0건

### 단계 4 후 — ⑦ 결정 대기 박스 원본 제거 + DOM 이동 로직 삭제
- [ ] `moveExistingBoxesIntoCommandCenter` 함수가 자립형 렌더 함수로 교체됨
- [ ] 작업 지휘소 슬롯 1 (대표님 결정)이 자체적으로 데이터 fetch + 렌더
- [ ] ⑦ HTML 통째로 제거
- [ ] 콘솔 에러 0건

### 단계 5 후 — ⑥ 임박 섹션 통째로 제거
- [ ] ⑥ HTML 삭제 (`<section class="integ-section">` 통째)
- [ ] 관련 CSS 클래스 (`.urgent-*`, `.integ-kpi-*`) 삭제 또는 ④로 이전
- [ ] `renderIntegratedUrgent`, `renderIntegratedProgress` 함수 → `renderCommandCenterHeader`, `renderCategoryProgress`로 리네임 + 새 자리 가리키도록 갱신
- [ ] `STATE.urgentFilter` 제거
- [ ] 폴링이 정상 동작 (헤더 숫자 5초마다 갱신)
- [ ] 콘솔 에러 0건

### 단계 6 후 — ③ 작업 분포 KPI 제거
- [ ] ③ HTML 삭제 (`<section class="stats-grid">`)
- [ ] `.stat-card`, `#stat-expand-panel` 관련 CSS 삭제
- [ ] 클릭/더블클릭 핸들러 코드 (5222~5380줄) 삭제
- [ ] ▶ 즉시 시작 버튼 로직은 단계 3에서 ④ 슬롯으로 이미 이식됨 — 손실 없음 확인
- [ ] 헌법 검증 27/27 → 건강 검진 박스 (`#phase0-health-bar` 펼침 detail)에 흡수
- [ ] 콘솔 에러 0건

### 단계 7 후 — OS manifest 갱신
- [ ] `_os/manifest.json` 의 `admin-status.html` role 설명 갱신
- [ ] `_os/admin-pages/manifest.json` 갱신 (있으면)
- [ ] 새 버전 박음 (예: 0.1.1)
- [ ] charter-mapping-check 봇 통과
- [ ] health-check 봇 yellow → green 또는 동일 (악화 없음)

### 단계 8 후 — install_os.sh 검증 + PAT 거부 별건 BL 신설
- [ ] BL-OS-INSTALL-PAT-FLOW 신설 (별건 — 이 BL과 분리)
- [ ] install_os.sh 자체는 admin-status.html 변경 영향 없음 확인 (단순 파일 복사)

---

## 7. 백업 파일 박는 자리 (가역성)

```
_admin/_backup_20260508_pre-dedup_admin-status.html  ← 단계 0에서 박음
```

최악의 경우 통째로 복구 가능. 각 단계는 commit 단위라 단계별 revert도 가능.

---

## 8. 헌법 부합 자가 검증

| 헌법 항목 | 부합 |
|---|---|
| 1조 (대표님은 결정만, Claude가 실행) | ✅ 명세·연결고리 지도 사전 박음, 실행은 Claude 자율 |
| 4조 (전수 추적) | ✅ 단계별 commit + chat-log + ECHO_LOG |
| 5조 (무인 검증) | ✅ 단계별 검증 체크리스트 |
| 6조 (사람용+AI용 이중 형식) | ✅ 이 문서 자체가 AI용, chat-log는 5블록 사람용 |
| 9조 (가역성) | ✅ 백업 파일 + 단계별 commit |
| 11조 (개발 토큰 유지) | ✅ 정식 오픈 전이라 토큰 유지 적용 |

---

**이 지도를 손대기 전에 박는 것이 정석 작업의 핵심.**
**없이 손대면 5867줄 페이지 안 113군데 연결고리에서 침묵 에러 발생.**
