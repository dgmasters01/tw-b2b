# 전체 갱신 원칙 (부칙 19 운영 매뉴얼)

**제정일**: 2026-05-23
**발생 BL**: BL-FULL-REFRESH-UNIFY
**근거 헌법**: OPERATIONS_CHARTER.md 부칙 19
**적용 범위**: TW B2B 전체 — admin-status / admin / admin-tasks / admin-business / admin-gallery / sales / dashboard 등 폴링 또는 데이터 의존 화면 전부

---

## 0. 왜 이 매뉴얼이 필요한가

대표님 진단 (2026-05-23):

> "전체가 서로 연계되어서 모두가 갱신되어야 됨. 부분 갱신만 하는 건 의미 없음. 비즈니스 독스 뿐만 아니라 모든 것들이 하나로 돌아가야 됨. 활동 이력도 갱신 안 되고 어렵게 만들어 놓으면 의미 없음. 전체가 하나로 안 돌아가면 안 됨."

발생 사고 (2026-05-23):

- admin-status.html 5초 폴링이 **13개 render 함수만 호출**
- `renderAll` / `renderCard` / `renderCategoryTasksBlock` / `renderCategoryPagesBlock` / `renderPageMap` 등 **15개 함수 빠짐**
- 결과: 카테고리 카드를 펼친 상태에서 새 작업이 박혀도 5초 안에 안 바뀜 → 대표님이 F5로 새로고침 강제됨

**근본 원인**: 신규 render 함수를 추가할 때 폴링 루프 등록을 빠뜨려도 검출되지 않는 구조. 부분 갱신이 정상으로 보임.

**해결 원칙**: 부칙 19로 "데이터 파일이 갱신되면 그 데이터에 의존하는 모든 render 함수가 호출되어야 한다"를 박는다.

---

## 1. 데이터 파일 ↔ 의존 render 함수 매핑표

admin-status.html 기준 (단일 진실원). 새 render 함수가 추가되면 이 표에 등록 의무.

### 1-1. tasks.json (5초 폴링)

| 함수 | 책임 | 등록 여부 (2026-05-23 fix 전 / fix 후) |
|---|---|---|
| renderIntegratedKPI | 통합 KPI | ✅ / ✅ |
| renderIntegratedUrgent | 긴급 영역 | ✅ / ✅ |
| renderIntegratedProgress | 진행률 영역 | ✅ / ✅ |
| renderAutoQueue | 자동 큐 | ✅ / ✅ |
| renderNextAction | 다음 작업 추천 | ✅ / ✅ |
| renderInProgressBox | 진행 중 박스 | ✅ / ✅ |
| renderPausedBox | 일시정지 박스 | ✅ / ✅ |
| renderAvg | 전체 평균 게이지 | ✅ / ✅ |
| renderSidebarMenus | 6개 카테고리 카드 | ✅ / ✅ |
| renderTopUrgent | TOP 긴급 | ✅ / ✅ |
| renderCeoWait | 대표님 결정 대기 | ✅ / ✅ |
| renderFlowGuide | Flow 가이드 헤더 | ✅ / ✅ |
| **renderAll** (= Avg/Sidebar/TopUrgent/Footer 통합) | **❌ 빠짐 / ✅ 박힘** |
| **renderCard / renderCardDetail / renderCategoryTasksBlock / renderCategoryPagesBlock** | 카드 펼침 상세 (renderAll → renderSidebarMenus 안에서 자동 호출) | **❌ 빠짐 / ✅ renderAll로 자동 호출** |
| **renderFooter** (renderAll 안에서 호출) | 푸터 | **❌ 빠짐 / ✅ renderAll로 자동 호출** |

### 1-2. activity-feed.display.json (5초 폴링)

| 함수 | 책임 | 등록 |
|---|---|---|
| renderActivity | 활동 이력 리스트 | ✅ |

### 1-3. pages-status.display.json (5초 폴링)

| 함수 | 책임 | 등록 여부 (fix 전 / fix 후) |
|---|---|---|
| renderAll (= Avg/Sidebar/TopUrgent/Footer) | 페이지 점수 변동 일괄 반영 | ✅ / ✅ |
| **renderPageMap** | 페이지 맵 카드 점수 갱신 | **❌ 빠짐 / ✅ 박힘** |

### 1-4. activity-feed 변경 시 추가로 봐야 하는 것 (부칙 19ⓑ)

activity-feed가 변할 때 사이드바 카드의 "최근 활동" 같은 곳도 함께 봐야 하는지 검토:
- 현재는 활동 이력 단독 영역만 사용 → `renderActivity()` 단독 호출로 충분
- 향후 다른 영역에서 activity 데이터 참조 시 이 표에 추가

---

## 2. 신규 render 함수 박을 때 의무

1. 함수 정의 후 어떤 데이터 파일에 의존하는지 명시 (상단 주석 `// data: tasks.json`)
2. 이 매뉴얼 § 1 표에 등록
3. admin-status.html `pollTick` 안의 해당 데이터 폴링 블록에 호출 추가
4. commit subject에 `[BL-FULL-REFRESH-UNIFY]` 언급해 봇이 부칙 19 검증 가능하게

미등록 함수 = 데드 코드 = 헌법 부칙 19 위반.

---

## 3. 자가 검증 — 새 render 함수 추가 PR 자가 점검 5문

| # | 질문 | NO면 |
|---|---|---|
| 1 | 이 함수는 어떤 데이터 파일에 의존하는가? | 명시 후 진행 |
| 2 | 그 데이터의 폴링 블록에 호출이 박혀 있는가? | 박고 진행 |
| 3 | 이 매뉴얼 § 1 표에 등록되었는가? | 등록하고 진행 |
| 4 | 다른 폴링 블록에서도 호출이 필요한가? | 검토 후 추가 |
| 5 | renderAll에서 통합 호출되어야 하는가? | renderAll에 박기 |

---

## 4. 위반 시 자가 진단 절차

대표님이 "화면이 안 바뀐다 / 갱신 안 된다 / 또 새로고침해야 한다" 신호 보내면 → 클로드 즉시:

1. 어떤 데이터 파일이 갱신됐는지 확인 (commit 로그 또는 GitHub Actions 결과)
2. 그 데이터의 폴링 블록(`pollTick` 안)에서 호출되는 함수 목록 추출
3. § 1 표와 대조 → 빠진 함수 식별
4. 빠진 함수 호출 추가 + commit
5. 대표님께 4줄 보고 (어디/무엇/어떻게/결과)

---

## 5. 다른 페이지로 확장

부칙 19는 **TW B2B 전체**에 적용되므로 다음 페이지 작업 시에도 본 매뉴얼 § 1 형태의 매핑표 작성 의무:

- admin.html — 실시간 통계·매니저 노출 변동
- admin-tasks.html — 작업 카드·필터·정렬
- sales.html — 갤러리·진행률 미리보기
- dashboard.html (매니저용) — 영상 노출량 자동 갱신
- admin-gallery.html — 페이지 카드 점수 갱신

각 페이지에 비슷한 폴링·재렌더 구조가 들어가면, **이 매뉴얼 § 1 표 항목 추가**로 단일 진실원 유지.

---

**Last updated**: 2026-05-23
**Maintained by**: 클로드 (under direction of 이지형 대표님)
**Length budget**: 200줄 이하 유지
