# 2026-05-11 BL ID Mismatch 정정 — 페이지 우선순위 + 대표님 결정 5개 정확한 이름

**작업 단위**: 5개 BL ID 정정 (Claude 이름 mismatch 사고) + 페이지 Phase 1~3 우선순위 박기
**HEAD before**: (이전 commit)
**HEAD after**: (이 commit)
**라이브 영향**: 잘못된 5개 BL obsoleted, 정확한 5개 BL 신규 + dependencies, BL-SERVICE-MAP에 페이지 우선순위 박힘

---

## [블록 1] 왜 박았나 — 사고 + 대표님 본질 짚음

### 사고 (2026-05-11)
Claude가 대표님 이전 채팅 결정 5개 BL 이름을 기억 없이 **다른 이름과 다른 의도로** 새로 박음:

| 대표님 결정 이름 (정답) | Claude 박은 이름 (오답) |
|---|---|
| BL-BASELINE-HUMAN-LANG | BL-HUMAN-LANG-AUDIT |
| BL-BASELINE-AUTO-TASK | BL-AUTO-TASK-REGISTER |
| BL-SERVICE-MAP | BL-SERVICE-PAGE-MAP |
| BL-DEPENDENCY-GRAPH | BL-DECISION-WORK-VIZ |
| BL-DAILY-HEALTH-CARD | BL-ONELINE-SUMMARY-CARD |

대표님 스크린샷으로 mismatch 발견.

### 대표님 본질 짚음 (이번 정정의 핵심)
> "페이지가 있어야 작업이 되지. 결국 전체와 카테고리의 흐름도가 있어야 작업이 되잖아."
> "그래서 페이지별 만들어야 되는 순서부터 결정해서 작업을 해야 되지 않나? 그 순서도 너가 정리해서 차례대로 제공해야 됨."

**Claude가 놓친 본질**: 페이지(지도) → 결정(자리) → 자율 작업(세부) 순서. 페이지 골격 없이 BL-TRACK-001 같은 세부 기능을 추천 = 잘못된 추천.

---

## [블록 2] 무엇을 박았나

### 1. 잘못 박은 5개 obsoleted 처리
- status: obsoleted + obsoleted_at + obsoleted_reason + replaced_by 박음
- notes 머리에 ⚠️ 대체 BL ID 명시
- 완전 삭제 대신 추적성 보존 (사고 학습용)

### 2. 대표님 결정 5개 정확한 이름으로 신규
| ID | title (사람 언어 그대로) | 우선순위 | dependencies |
|---|---|---|---|
| BL-BASELINE-HUMAN-LANG | [건강검진 사람 말] 점검 결과를 사업가 언어로 풀어줌 | P1 | 없음 |
| BL-BASELINE-AUTO-TASK | [건강검진 자동 작업 등록] 점검에서 발견된 문제를 자동으로 작업 카드 박음 | **P0** | 없음 |
| BL-SERVICE-MAP | [서비스 페이지 전체 지도] 페이지 골격 + 진행률 표시 — 모든 작업의 부모 | **P0** | 없음 |
| BL-DEPENDENCY-GRAPH | [결정 → 페이지 → 작업 흐름 시각화] 대표님 판단 도구 | P1 | BL-SERVICE-MAP |
| BL-DAILY-HEALTH-CARD | [일일 건강 카드] 위 4개를 한 줄로 압축 | P1 | 위 4개 전부 |

### 3. BL-SERVICE-MAP notes에 Phase 1~3 페이지 우선순위 박음
라이브 pages-status 점수 기반 Claude 자율 판단 (대표님 OK 박음):

**Phase 1 — 매출 직결 흐름**
1. /sales.html (결제 유도) 79점
2. /dashboard.html (매니저 대시보드) 80점
3. /index.html (랜딩) 74점
4. /signup.html + /login.html (인증) 65~75점
5. /hotel-info.html (호텔 등록) 61점

**Phase 2 — 운영 인프라**
1. /admin-status.html (시스템 완성도) 14점 — 대표님 일일 도구
2. /admin.html (관리자 콘솔) 14점
3. /admin-tasks.html (작업 관리) 14점
4. /booking-analytics.html (예약 분석) 74점

**Phase 3 — 부가 운영 도구**
marketing / admin-gallery / admin-business / admin-service-ops / admin-decisions / admin-permissions / settings

---

## [블록 3] 어떻게 동작하나 — 4줄

- **어디서**: tasks.json + admin-status.html (자동 렌더)
- **무엇이**: 잘못된 5개 사라짐 (큐에서 빠짐), 정확한 5개가 자율 작업 큐에 보임. BL-SERVICE-MAP은 결정 대기 카드로 노출
- **어떻게**: dependencies 박혀있어 BL-DAILY-HEALTH-CARD는 위 4개 done 전엔 자율 큐에 안 뜸 (자동 흐름 정렬)
- **결과**: 대표님이 BL-SERVICE-MAP 카드 클릭 → 새 채팅에 풀 컨텍스트(페이지 우선순위 포함) 자동 복사 → 새 채팅에서 시각화 작업 시작

---

## [블록 4] 무엇이 달라지나 — 사업가 시점

| Before | After |
|---|---|
| Claude가 페이지 없는 세부 기능(BL-TRACK-001) 추천 | 페이지 우선순위 기반으로 추천 |
| 대표님이 "어디 페이지에 박는 작업?" 판단 못 함 | BL-SERVICE-MAP notes에 페이지 Phase 1~3 박혀있음 |
| 5개 BL 이름이 헷갈리게 박혀있음 | 대표님 결정 이름 그대로, sequenced (dependencies 박힘) |
| 다음 자율 작업이 무작위로 떠오름 | Phase 0(인프라) → Phase 1(매출) → Phase 2(운영) → Phase 3 자연 흐름 |

---

## [블록 5] 다음 행동 — 새 채팅 시작

본 채팅은 사고 정정으로 종료. **새 채팅에서 BL-SERVICE-MAP 시작 권장**.

### 새 채팅 시작 방법
1. `https://gohotelwinners.com/admin-status.html` 열기
2. **결정 대기** 또는 **자율 작업 큐**에서 BL-SERVICE-MAP 카드 찾기
3. 클릭 → 인계서 자동 클립보드 복사
4. 새 채팅 열고 Cmd+V → 새 Claude가 페이지 우선순위 받고 시각화 작업 시작

### 새 채팅이 박을 것 (Phase 0 본격 시작)
- BL-SERVICE-MAP 본 작업: admin-status에 "🗺️ 서비스 페이지 지도" 섹션 신규 + Phase 1~3 그룹핑 + 진행률 바
- 페이지 audience 분류 오류 정정 (/sales.html, /dashboard.html → public/manager)
- 페이지 카드 클릭 → 해당 페이지의 세부 BL 자동 등록 (BL-BASELINE-AUTO-TASK 연동 미리 준비)

### 사고 학습 박음 (재발 방지)
- BL-STEP-SELF-VERIFY 봇은 step 단위 산출물 검증 — ID rename은 못 잡음
- 향후 BL-STEP-SELF-VERIFY-V2에 `name-mismatch` 룰 추가 후보 (playbook 향후 확장 항목에 박음)
