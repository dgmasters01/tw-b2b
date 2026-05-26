# 🎯 BL-HOTEL-DETAIL-PAGE 새 채팅 인계서

**작성일**: 2026-05-25
**작성자**: 클로드 (이전 채팅 마무리)
**우선순위**: P1 (시스템 자동 추천 큐 1순위 — BL-AUTO-BOTS-SYNC-BOT done 박은 직후)
**예상 시간**: 4~6시간 (분량 큼, 새 채팅 권장)

---

## ⚠️ 새 클로드에게 — 작업 시작 전 반드시 읽을 것

### 함정 1 — admin.html 부분 fetch 강제 (5884줄 거대 파일)

**절대 금지:**
```
view _admin/admin.html  # 전체 fetch 금지 — 끊김 100%
```

**정석 (부분 fetch):**
```
# 1) 항상 grep으로 위치 먼저 박음
grep -nE "tab-hotels|renderHotels|allHotels" _admin/admin.html | head -20

# 2) 좌표 알면 view_range 박음
view _admin/admin.html view_range=[2840, 2960]  # renderHotels 함수만
view _admin/admin.html view_range=[624, 720]    # tab-hotels HTML 영역만
```

### 함정 2 — admin-status.html과 헷갈림 금지

- `_admin/admin.html` = **5884줄** (이번 작업 대상 — Hotels 탭 있는 곳)
- `_admin/admin-status.html` = **9301줄** (시스템 상태 모니터링 — 이번 작업 무관)

### 함정 3 — 이전 채팅에서 sync-bot fix 박힘 (참고)

`e55fe93` commit에서 sync_md_from_tasks.py + sync_engine.py NoneType 슬라이싱 4건 일괄 fix 박힘. sync-bot run #389 라이브 success 확인. 새 채팅에서 sync-bot 상태 다시 점검 불필요.

---

## 📌 BL 핵심 정의 (tasks.json decision_context)

**제목**: [호텔 상세 페이지 + 커뮤니케이션 이력] 매니저/호텔 분리 + 1:1 문의·메일·메모 타임라인

**핵심 통찰 (대표님 ⑥ + ⑨ 합본):**
- admin Hotels 탭의 한 행 = 호텔 카드
- **호텔명 클릭 → 우측 슬라이드 패널** (단일 호텔 상세)
- 패널 안에 "📨 커뮤니케이션 이력" 영역 신설
- 시간순 타임라인: 1:1 문의 / 매니저↔관리자 메일 송수신 / 내부 메모 / status 변경 이력

**왜 필요한가:**
- 현재 admin Hotels 탭은 행만 보임 → 호텔별 누적 이력 파악 불가
- 매니저 한 명이 한국·일본·베트남 호텔 여러 개 운영 → "이 호텔에 대해 그동안 뭐 했지?"가 한눈에 안 봄
- 재계약·환불·이슈 처리 시 과거 커뮤니케이션 필요 → 매번 메일 검색 비효율

---

## 🎯 북극성

매니저든 관리자든 admin Hotels 탭에서 호텔명 한 번 클릭 → 우측 슬라이드 패널이 열리고:
1. **상단**: 호텔 기본 정보 (이름·국가·status·매니저·매출·가입일)
2. **중단**: 액션 버튼 (이메일 발송 / status 변경 / 메모 박기)
3. **하단**: 📨 커뮤니케이션 타임라인 (모든 이력 시간순)

→ 한 화면에서 "이 호텔에 대해 그동안 뭐가 있었나" 5초 파악 + "다음 액션" 즉시 결정.

---

## 📋 권장 단계 (자율 결정 — 새 클로드 판단 우선)

### Phase A — 백엔드 (스키마 + API)

**1) Supabase 스키마 신설** — `hotel_communications` 테이블
```sql
CREATE TABLE hotel_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('inquiry', 'email_out', 'email_in', 'memo', 'status_change')),
  direction TEXT,  -- email용: 'inbound' / 'outbound'
  subject TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_by_email TEXT,  -- 관리자 이메일 (메모·status 변경용)
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_hotel_comm_hotel ON hotel_communications(hotel_id, created_at DESC);
-- RLS: 관리자 SELECT/INSERT/UPDATE/DELETE 가능, 매니저는 자신의 hotel SELECT만
```

**Supabase Management API로 자동 실행** (헌법 — 대표님께 SQL Editor 붙여넣기 요청 금지):
```bash
curl -X POST "https://api.supabase.com/v1/projects/vjsludfjsphwnumuoqaj/database/query" \
  -H "Authorization: Bearer $SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -H "User-Agent: claude-tw-b2b/1.0" \
  -d '{"query":"..."}'
```

**2) API 신설** — `api/admin/hotel-detail.js`
- GET `?hotel_id=UUID` → 호텔 상세 + 커뮤니케이션 이력 + 통계 (인보이스·결제·videos)
- 한 번의 API 호출로 슬라이드 패널 전체 데이터 제공 (3-Layer 원칙)

**3) API 신설** — `api/admin/hotel-communications.js`
- POST `?action=add-memo` → 내부 메모 박음
- POST `?action=log-email` → 메일 송수신 이력 박음 (수동, Phase 1)
- POST `?action=log-status-change` → status 변경 시 자동 호출
- POST `?action=add-inquiry` → 1:1 문의 박음

### Phase B — 프론트 (admin.html 슬라이드 패널)

**4) 슬라이드 패널 UI** — admin.html에 박음
- 우측에서 슬라이드 (width 500px, position fixed)
- ESC 키 / 배경 클릭 / 닫기 버튼 모두 닫힘
- 기존 행 클릭 핸들러 확장 (호텔명 클릭 시만 패널, 다른 칸은 기존 동작)

**5) 슬라이드 패널 내용**
- 상단: 호텔 정보 카드 (이름·국가·status 배지·매니저·매출)
- 중단: 액션 버튼 3개 (✉️ 메일 발송 / ✏️ 메모 박기 / 🔄 status 변경)
- 하단: 📨 커뮤니케이션 타임라인
  - 각 항목 아이콘 + 시간 + 내용
  - 타입별 색상 (memo=노랑, email=파랑, status_change=보라, inquiry=초록)

**6) 메모 박기 모달**
- 텍스트 영역 + "저장" 버튼
- 저장 시 POST add-memo + 타임라인 즉시 갱신

**7) status 변경 자동 로깅**
- 기존 status 변경 API 호출 직후 log-status-change 자동 호출
- 어떤 status에서 어떤 status로 누가 언제 변경했는지 기록

### Phase C — 검증 + commit

**8) 라이브 검증**
- admin Hotels 탭 → 호텔명 클릭 → 슬라이드 패널 열림 확인
- 메모 박기 → 타임라인 자동 갱신 확인
- status 변경 → 자동 로깅 확인

**9) commit + push + ops 알림**

---

## 🔍 사전 조사 키워드 (참고용)

새 클로드가 admin.html을 효율적으로 점검할 때 쓸 grep:

```bash
# Hotels 탭 본체 (HTML)
grep -nE "tab-hotels|id=\"tab-hotels\"" _admin/admin.html  # → line 624~

# 렌더 함수
grep -nE "function renderHotels|allHotels|enrichHotels" _admin/admin.html  # → line 2840~

# 행 클릭 핸들러 (기존 동작 확장)
grep -nE "addEventListener.*click|onclick=" _admin/admin.html | grep -i hotel | head -10

# admin 권한 체크
grep -nE "is_admin|adminCheck|requireAdmin" _admin/admin.html | head -5
```

```bash
# 기존 호텔 API 패턴 (참고)
grep -nE "case '[a-z-]+'" api/admin/users.js  # 라우터 패턴 참고
ls api/admin/  # 기존 admin API 구조 확인
```

---

## 📦 라이브 인프라 컨텍스트

- **GitHub**: dgmasters01/tw-b2b (main 브랜치)
- **라이브 도메인**: https://gohotelwinners.com
- **Vercel 프로젝트**: tw-b2b-admin (라이브) / tw-b2b (내부 확인)
- **Supabase**: vjsludfjsphwnumuoqaj (Seoul)
- **Supabase Management PAT**: env `SUPABASE_PAT` 또는 평문 (개발 단계)
- **Ops endpoint**: POST https://gohotelwinners.com/api/email/ops/notify-claude-work (x-ops-token: env CLAUDE_OPS_TOKEN)

---

## 🚦 헌법 4종 자동 fetch (새 채팅 boot.md 강제)

```
OPERATIONS_CHARTER.md (179줄, 부칙 1~20)
CLAUDE.md (149줄)
_os/playbook/claude-discipline.md (231줄)
_os/boot.md (129줄)
_os/handoff-header.md (의무 1~7)
```

새 채팅에서 boot.md가 자동으로 위 4종 라이브 fetch + 부칙 20 의무 7 자동 적용 (business-agreements.json 라이브 검증).

---

## ✅ 사업 합의 현재 상태 (이번 BL 시작 직전)

**총 15건** — DONE 13 / PARTIAL 2 / NOT_IMPLEMENTED 0

남은 partial 2건은 인보이스 관련 (AGR-0007 환율 / AGR-0015 인보이스 번호) — 이번 BL과 무관.

---

## 🎯 한 채팅 한 결정

새 클로드: **BL-HOTEL-DETAIL-PAGE의 Phase A~C 9단계 자율 진행.**
대표님 결정 영역은 없음 (디자인 디테일은 클로드 자율, 헌법 부칙 1).

---

**작성 마침. 새 채팅 클로드가 이 인계서를 라이브 fetch해서 박힌 컨텍스트로 작업 시작.**
