# 헌법 부칙: 자동 재정렬 + 잠시 멈춤

**박힘**: 2026-05-10
**근거**: 대표님 진단 — "새 P0 들어오면 이전 진행 중이 사라짐. 작업이 길을 잃음."

---

## 핵심 규칙

### 1. 단일 진실원
- 모든 작업은 `tasks.json`에 박힘
- Claude는 채팅에서 "다음 할 일" 텍스트로 따로 안 박음
- 대표님은 `admin-status.html`만 보고 다음 작업 판단

### 2. 새 P0 발견 시 자동 재정렬
- 대표님 통찰 / 빨간불 점검 / 결정 확정 → 새 P0 작업
- Claude는 즉시 `tasks.json`에 BL 추가
- 기존 `in_progress` 작업이 있으면 → 자동으로 `paused`로 강등
  - `paused_at`: 강등 시각
  - `paused_reason`: 왜 멈춤 (예: "BL-X 긴급 승격으로 자동 보류")
  - `paused_progress`: 0~100%
  - `paused_step`: 어느 단계에서 멈췄는지 (steps 인덱스)

### 3. 새 작업 박기 전 빨간불 점검
- `_health.json` 또는 admin-status 점검 결과 확인
- 🔴 RED 상태면 → 새 BL 박지 않고 대표님께 보고
- ✅ GREEN 또는 🟡 YELLOW만 → 진행

### 4. 이어가기 흐름
- 대표님이 "잠시 멈춤" 박스에서 작업 클릭 → API `bl-resume` 호출
- 현재 `in_progress` 있으면 자동 paused로
- target은 `in_progress` 복원 + paused 마커 정리

### 5. 사람 언어 우선
- BL 제목 = 사람 언어 (예: "서비스 페이지 전체 지도")
- BL ID = 영어 (예: "BL-SERVICE-MAP") — commit·내부 추적용
- 화면 노출 = 제목만, ID는 작은 글씨

---

## API 액션

- `POST /api/decision?action=bl-promote-p0` — 특정 BL을 P0 + in_progress로, 기존 in_progress는 paused
- `POST /api/decision?action=bl-pause` — 특정 BL을 paused (수동 보류)
- `POST /api/decision?action=bl-resume` — paused BL을 in_progress로 복원

## UI

- `admin-status.html` 상단에 "⏸️ 잠시 멈춤" 박스 (paused 작업 있을 때만 노출)
- 각 paused 작업: 제목 / 멈춘 위치 / 멈춘 시각 / 멈춘 이유 / [▶ 이어가기] 버튼
