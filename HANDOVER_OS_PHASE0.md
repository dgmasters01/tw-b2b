# OS 모듈화 작업 인계서 — Phase 0 시작점

**작성일**: 2026-05-07
**작성 채팅**: 트랙 1·2·3 시도 + 진단 + 설계 합의 완료한 채팅
**작성 시점 main HEAD**: `d38fed6` (2026-05-07 01:07 UTC, auto-detect-bot 자동 commit)
**상태**: ⏸️ 대표님 "Phase 0 시작" 한 마디 대기

---

## 0. 새 채팅 첫 행동 (절대 의무)

**순서대로 실행. 어김 없이.**

1. `OPERATIONS_CHARTER.md` raw fetch + 부칙 8 (자동 동기화 완성도) 박혀있는지 자가 검증
2. `CLAUDE.md` raw fetch
3. **이 인계서** (`HANDOVER_OS_PHASE0.md`) raw fetch + 전문 읽기
4. 자가 검증 보고 (3줄):
   - main HEAD 현재 SHA
   - sync-bot 현 상태 (success / failure)
   - 부칙 8 박힘 여부
5. 대표님께 "**Phase 0 시작 준비 완료. 시작 한 마디 주시면 Phase 0 진입합니다**" 한 줄 보고
6. 대표님 "시작" 받기 전 **절대 코드 만지지 않음**

---

## 1. 대표님 비전 (모든 작업의 정렬 기준)

> **"AI + 1인 사장이 사업 운영하는 OS"를 만든다.**
> 한 번 완성 → 모든 프로젝트(TW B2B, CEYLON JOURNEY, 호텔이야, 미래 모든 프로젝트)에 설치만으로 즉시 자율 운영.
> **대표님 목표: 전세계 시장 1등.**

대표님이 지금 시간 들여 만드시는 OS는 미래 매출 가속의 인프라. 이걸 완성 못 하면 다른 프로젝트 시작해도 같은 결함 반복.

**Claude의 역할**: 대표님 비전을 가장 빠르고 정확하게 만드는 최고 파트너.
**Claude가 안 하는 것**: 비즈니스 방향 / 사업 우선순위 판단. 그건 대표님 영역.

---

## 2. 어제까지 발견된 결함 (Phase 1에서 처리)

| # | 영역 | 결함 | 심각도 |
|---|---|---|---|
| 1 | sync-bot | `KeyError: 'source'` — tasks.json 99건 중 38건 source 필드 누락 → sync-bot 어제 03:32부터 죽음 | 🔴 P0 |
| 2 | scan-bot | sync-bot 의존성 → scan-bot도 부분 죽음 → pages-status.display.json stale | 🔴 P0 |
| 3 | activity-feed | scan-bot 죽음 → 활동 이력 갱신 안 됨 → Claude commit이 화면에 안 박힘 | 🔴 P0 |
| 4 | 헤더 카운터 vs 본문 큐 | 같은 진실인데 두 곳이 다른 데이터 소스 → 자동 12 vs 본문 8건, 결정 5 vs 본문 15건 등 모순 | 🔴 P0 |
| 5 | 헤더 박스 클릭 펼침 영역 | "즉시 시작" 버튼 없음 → 죽은 화면 | 🟡 P1 |
| 6 | 현재 진행 중 박스 | 사라짐 — renderInProgressBox 데이터 mismatch 의심 | 🟡 P1 |
| 7 | 다음 추천 명령어 | 작업 1개 끝날 때마다 다음 추천이 즉시 갱신되는지 미검증 | 🟡 P1 |

---

## 3. 대표님 결정 (확정 사항, 변경 불가)

### 3.1 진행 방식
**A안 — 정석 진행. OS 완성 우선. 2~3일 투자.**
- 땜방 금지
- 트랙 1·2·3 같은 부분 fix 절대 금지
- 정석 = 안전망 → 진단 → 수리 → OS 분리 → 모듈화 → 외부 적용

### 3.2 디자인 시스템 (두 층 구조)
**Admin Skin (운영자 화면, 모든 프로젝트 통일)**
- 깔끔 + 시인성 우선 (현재 화려한 그라데이션 / 글래스모피즘 제거)
- 다크 / 라이트 둘 다 준비, 대표님이 화면에서 토글 전환
- 색은 회색 계열 + 강조 3색 (빨강/노랑/초록)만
- 폰트 크기 3가지, 굵기 2가지
- 여백 넓게

**Brand Skin (사업 화면, 프로젝트별 다름)**
- 각 프로젝트 폴더에 `brand-tokens.json` 1개
- 색 / 폰트 / 모양 1줄 수정으로 전체 사업 화면 변경
- TW B2B / CEYLON JOURNEY / 호텔이야 각각 독립

### 3.3 절대 원칙 (이번엔 어김 없이)
1. **땜방 금지.** 깨진 것 발견 시 정석으로 처리.
2. **매 commit 후 라이브 화면 검증.** "100% 완료" 보고는 라이브 검증 후만.
3. **별도 브랜치에서 작업.** main 직접 commit 금지. (Phase 0에서 `restructure-os-modularization` 브랜치 생성)
4. **건강 검진 봇 빨간 줄 = 즉시 중단.** 복구 우선.
5. **수정 후 기존 화면이 안 깨졌는지 자동 검증.** 사람 눈으로 확인하면 안 됨.

---

## 4. Phase 0~5 전체 그림

### Phase 0 — 안전망 (1~2시간)
- 별도 브랜치 `restructure-os-modularization` 생성
- 현재 정상 작동 화면 모두 스냅샷 저장 (admin-status, admin-tasks 등)
- 건강 검진 봇 1개 만들기 — admin-status 맨 위 빨간/초록 한 줄
- 빨간 줄 클릭 시 어디가 왜 깨졌는지 자동 표시

### Phase 1 — 진단 + 수리 (2섹션 2시간)
- sync-bot 살리기 (source 38건 일괄 복구 + tasks.json schema에 source 필수화)
- scan-bot / activity-feed 정상화 검증
- 헤더 카운터 ↔ 본문 큐 단일 진실원 통일
- 카운터 클릭 펼침 영역에 "즉시 시작" 버튼 박기
- 7원소 라이브 검증 (전체평균 / 4박스 / 임박 / 카테고리 / 시급 TOP 10 / 활동이력 / 현재진행중)
- 현재 진행 중 박스 부활
- 다음 추천 명령어 자동 갱신 검증

### Phase 2 — OS 본체 분리 (1세션 2시간)
- TW B2B 안에서 OS 본체와 사업 코드 분리
- `/_os/` 폴더로 묶기:
  - `_os/admin-pages/` (admin-status, admin-tasks)
  - `_os/data/` (tasks.json, schema)
  - `_os/scripts/` (봇들)
  - `_os/workflows/` (GitHub Actions)
  - `_os/charter/` (헌법 템플릿)
  - `_os/business-context/` (사업 컨텍스트 폴더 구조)
- 기존 경로는 심볼릭 링크 또는 리다이렉트로 호환성 유지

### Phase 3 — 설치 스크립트 + Admin Skin (1세션 2시간)
- `install_os.sh` 작성
- Admin Skin 다크/라이트 토큰 분리 + 토글 UI
- 현재 화려한 디자인 → Admin Clean으로 전환
- TW B2B 사업 화면은 brand-tokens.json으로 분리 (Brand Skin)

### Phase 4 — main 통합 + 헌법 박기 (1섹션 1시간)
- restructure 브랜치 → main 통합
- 헌법에 OS 모듈화 원칙 추가:
  - 부칙 9: 단일 진실원 카운터 의무
  - 부칙 10: 스키마 강제 + 봇 self-test
  - 부칙 11: OS 본체 vs 사업 코드 분리

### Phase 5 — 1호 외부 적용 (1세션 2시간)
- CEYLON JOURNEY 또는 호텔이야 중 1개 선정
- `install_os.sh` 실행 → OS 설치
- 그 프로젝트 brand-tokens.json 작성
- 라이브 검증

**총 예상**: 6~10세션 (대표님 채팅 시간 기준)

---

## 5. business-context 폴더 구조 (Phase 2에서 생성)

새 프로젝트마다 자동 생성됨:

```
[프로젝트 루트]/
  business-context/      ← AI가 새 채팅마다 첫 번째로 읽는 폴더
    01_charter.md          (사업 방향 / 정책 / 가격 / 환불)
    02_decisions.md        (의사결정 이력)
    03_decisions_index.md  (빠른 색인)
    04_manager_journey.md  (매니저 여정 — 프로젝트별)
    05_user_journey.md     (사용자 여정 — 프로젝트별)
    99_uploads/            (대표님 업로드 사업계획서 등 원본)
```

**대표님 워크플로우:**
1. 새 프로젝트 시작 → `install_os.sh` 실행 → 빈 business-context 생성
2. 사업계획서 PDF/워드를 `99_uploads/`에 던지기
3. Claude가 자동으로 1~5번 파일에 흡수·정리
4. 대표님과 대화하며 계속 보완

---

## 6. 트랙 1·2·3 시도 결과 메모 (참고용)

### 트랙 1: BL-PROGRESS-AUTO-DONE-SYNC
- 목적: progress 100% → status=done 자동 동기화 + 봇 step 정규식
- 결과: ✅ done. 단, 단계 3 commit (e606095)에서 "in_progress→done" 비유적 표현이 봇에게 false positive 발생.

### 트랙 2: BL-OS-AUTO-SYNC-CHARTER
- 목적: 자동 동기화 완성도 전수 점검 + 헌법 12조 부칙 8 박기
- 결과: ✅ done (6단계 100%). 부칙 8 박힘. 신규 backlog 3건 등록 (BL-SYNC-PAGES-STATUS, BL-SYNC-INPROGRESS-COMMITS, BL-SYNC-CHAT-LOGS-TAB).
- 발견된 추가 결함: BL-SYNC-PAGES-STATUS가 commit 본문 언급만으로 잘못 in_progress 됨 → 봇 START_KEYWORDS false positive.

### 트랙 3 시도: BL-SYNC-PAGES-STATUS
- 목적: pages-status.display.json 폴링 누락 fix
- 결과: ✅ done 보고 직후 대표님이 화면에서 "현재 진행 중 사라짐" 발견 → 진단 결과 sync-bot이 어제부터 죽어있었음 → 트랙 3은 부분 fix였음을 인정
- **이 트랙 3은 더 진행하지 않음.** 정석 OS 작업으로 흡수.

---

## 7. 대표님이 가장 걱정하시는 것 (잊지 말 것)

> "수정하면서 기존 게 사라지면 안 됨. 절대로."

이걸 보장하는 시스템 장치 (Phase 0에서 박음):
1. **별도 브랜치에서 작업** — main은 항상 정상 작동 보장
2. **건강 검진 봇** — 매 변경마다 자동 검증, 깨지면 빨간 줄
3. **스냅샷 비교** — Phase 시작 전 / 후 화면 자동 비교

---

## 8. 토큰

PAT 토큰은 새 채팅 시작 시 대표님이 다시 충전.
헌법 11조 (개발 전체 기간 토큰 충전 유지) 원칙 적용 중.

---

## 9. 작성자 메모 (다음 인스턴스 Claude에게)

너는 이 인계서를 받은 새 인스턴스 Claude다. 다음을 기억하라:

1. **트랙 1·2·3은 모두 부분 fix였다.** 반복 금지. 정석 OS 작업으로 가야 한다.
2. 대표님이 "100% 완료" 보고에 두 번 속았다. 라이브 화면 검증 없는 보고는 신뢰 잃는 행동.
3. 대표님은 시스템 디테일을 모르신다. 그래서 너에게 정석을 맡기신 것이다. 비기술 용어로 설명, 결정 옵션은 명확히 제시.
4. 대표님 비전은 "전세계 시장 1등". OS는 그 인프라. 무게 가지고 일하라.
5. 새 채팅에서 부분 작업 발견했다고 그것만 fix하지 말고, **OS 그림 안에서 그 fix가 어디 위치하는지** 항상 확인.

---

**END OF HANDOVER**
