# TW B2B 중앙 작업 관리 시스템 — 다음 채팅 인계 문서

**작성**: 2026-05-02
**현재 진행**: IP-CTRL-001, 4/5 단계 완료
**다음 채팅 첫 메시지로 이 파일 전체 또는 아래 한 줄 붙여넣기:**

```
tw-b2b 중앙 작업 관리 시스템 IP-CTRL-001 이어서 진행. HANDOFF_TASK_MGMT.md 읽고 5단계(화면 재설계 + 자율 큐 UI + 진행률 표시 + 롤백 UI) 진행해줘.
```

---

## ✅ 1단계에서 완성된 것

### A. 데이터 통합 빌더 (`scripts/build_tasks_json.py`)
- BACKLOG.md / CHANGELOG.md / SOLO_WORK_QUEUE.md 자동 파싱
- 중복 제거 (제목 유사도 + source 우선순위)
- `tasks.json` v2.0 (51개 작업, 70KB) 자동 생성
- 자율성 분류 (auto/semi/blocked) + 예상 시간 + 카테고리 자동 추론
- history 배열로 변경 이력 보존

### B. 백업/스냅샷 시스템 (`scripts/snapshot_tasks.py`)
- 체크포인트 / 일반 / 자동 3종 백업
- `tasks_snapshots/` 디렉토리 + `index.json`
- 복구 시 직전 상태 자동 백업 (이중 안전망)
- 자동 백업은 30개만 유지 (디스크 보호)
- 명령어:
  ```bash
  python3 scripts/snapshot_tasks.py                              # 일반
  python3 scripts/snapshot_tasks.py --checkpoint "라벨"           # 체크포인트
  python3 scripts/snapshot_tasks.py --list                       # 목록
  python3 scripts/snapshot_tasks.py --restore <filename>         # 복구
  ```

### C. 역방향 빌더 (`scripts/sync_md_from_tasks.py`) — dry-run 전용
- tasks.json → BACKLOG.md / CHANGELOG.md / SOLO_WORK_QUEUE.md 갱신
- **--apply 플래그 명시 시에만 실제 덮어씀** (안전장치)
- Project Status 정규식 호환 형식 유지
- 덮어쓰기 전 `.before_sync` 백업 자동 생성

### D. tasks.json v2.0 스키마
- 51개 작업: 완료 30 / 진행 1 / 대기 10 / 막힘 10
- **자율 작업 가능 11개** (외근 자율 처리 후보)
- 각 작업에 `autonomous`, `progress`, `history` 필드 포함
- 단일 진실 소스 (이게 가장 중요)

---

## 🚧 2단계에서 해야 할 것 (다음 채팅)

### 1. admin-tasks.html 단일 통합 뷰로 재설계
현재 4탭(대시보드/목록/추가/인계) → 한 페이지에 모든 영역:
```
┌─ 상단 KPI (D-Day / 완료율 / 진행중 / 자율가능)
├─ 🚀 외근 모드 (자율 처리 가능 작업, "외근 모드 시작" 버튼)
├─ 🔥 진행 중 (체크포인트 + 진행률 바 + 재개 버튼)
├─ 📋 전체 작업 (필터/검색/그룹)
├─ 📜 히스토리 타임라인
├─ 🛡️ 백업/롤백 (체크포인트 목록 + 복구 버튼)
└─ 🔄 채팅 인계 (자동 컨텍스트 생성)
```

### 2. 자율 작업 큐 UI
- 🟢 자율 가능한 작업만 모은 카드 그리드
- "외근 모드 시작" 버튼 → 그 시점부터 Claude가 자율 처리하기로 한 작업 마킹

### 3. 진행률 / 체크포인트 표시
- 진행 중 작업의 progress 필드를 시각화 (3/5 단계, 60% 바)
- "재개 가능" hint 표시

### 4. 롤백 UI
- `tasks_snapshots/index.json` 표시
- 체크포인트별 "되돌리기" 버튼 → API 호출 또는 다운로드

### 5. admin.html 사이드바
- Task Management 메뉴 (이미 1차에서 추가됨, push만 하면 됨)

---

## 📁 파일 위치 (모두 tw-b2b 레포 내)

| 파일 | 역할 |
|---|---|
| `scripts/build_tasks_json.py` | md → tasks.json (1차 빌드) |
| `scripts/snapshot_tasks.py` | tasks.json 백업/복구 |
| `scripts/sync_md_from_tasks.py` | tasks.json → md (dry-run 전용, 향후 활용) |
| `tasks.json` | 단일 진실 소스 (51개 작업) |
| `tasks_snapshots/` | 백업 폴더 (검증용 체크포인트 3개 포함) |
| `tasks_snapshots/index.json` | 스냅샷 인덱스 |
| `admin-tasks.html` | 작업관리 화면 (1차 4탭 버전 → 2차에서 재설계) |
| `admin.html` | 사이드바에 Task Management 메뉴 추가됨 |
| `HANDOFF_TASK_MGMT.md` | 이 인계 문서 |

---

## 🔧 워크플로 (확정됨)

### 대표님이 작업 추가/수정/완료
1. `admin-tasks.html` 화면에서 편집
2. "새 tasks.json 다운로드" 클릭 → ~/Desktop/tw-b2b/tasks.json 덮어쓰기
3. PC에서 `git add tasks.json && git commit && git push`
4. 30초 후 라이브 반영

### Claude가 작업 등록 (반자동)
1. 대표님 메시지에서 작업 감지 (예: "이거 버그같아" + 스크린샷)
2. tasks.json에 추가 → "BUG-039로 등록했습니다" 한 줄 보고
3. 대표님 승인 시 in_progress로 전환 + history 기록

### 외근 모드
1. 대표님: "외근 갈게. 자율 가능한거 처리해줘"
2. Claude: 🟢 작업만 골라 P0→P1 순서로 처리
3. 각 작업 완료 시 history 추가 + 체크포인트 자동 생성
4. 대표님 복귀 시 처리 결과 한 번에 보고

### 백업/롤백
- 큰 작업 전 자동 체크포인트 (Claude가 만듦)
- 일반 작업도 5분마다 자동 백업
- 잘못되면 `python3 scripts/snapshot_tasks.py --restore <filename>` 한 줄

---

## 📊 데이터 통계 (1단계 완료 시점)

```json
{
  "total": 51,
  "done": 30,
  "in_progress": 1,
  "pending": 10,
  "blocked": 10,
  "autonomous_ready": 11
}
```

### 자율 작업 가능 (외근용 후보)
- BL-002 통합 To-Do Inbox 재설계 (P0)
- BL-006~011 호텔 LTV / 검색 UX / Admin Console / Chrome 경고 등 (P2-P3)
- BL-015 BEFORE/AFTER 스크린샷 자동 캡처 (P2, 4-6h)
- SQ-G 자동 알림 메일 시스템 (P1)
- SQ-H Supabase 토큰 갱신 자동화 (P1)
- SQ-J README.md 업데이트 (P2)

### 대표님 결정 대기 (BLOCKED)
- BL-003 Agoda 예약 검증 (P0)
- BL-004~007 매니저 시스템 / 알림 메일 (P1)
- SQ-D~F sales/marketing/admin 디자인 톤 (P1)

---

## ⚠️ 주의사항

1. **md 파일들은 자동 덮어쓰기 금지**: Project Status가 라이브에서 fetch 중. `sync_md_from_tasks.py`는 dry-run 전용으로 두고, 검증 후 다음 채팅에서 활성화
2. **기존 admin-business.html / admin-gallery.html 절대 건드리지 말 것**
3. **Project Status의 BACKLOG/SOLO_WQ 파싱 정규식 호환 유지** (admin.html L1500~ 참조)
4. **GitHub MCP 커넥터 사용 불가**: 모든 push는 대표님 PC ~/Desktop/tw-b2b/에서 git으로
5. **이번 채팅은 토큰 한계로 화면 재설계 미완료**: 안전 push 후 새 채팅에서 이어서

---

## 🚀 다음 채팅 시작 시 Claude가 할 일

1. 이 문서 읽기
2. `git pull` 후 tasks.json 상태 확인
3. 진행률을 4/5 → 5/5로 진행
4. admin-tasks.html 단일 통합 뷰로 재설계 (위 1~4번)
5. 검증 후 push

**예상 시간**: 2-3시간 (단일 채팅 내 완료 가능)
