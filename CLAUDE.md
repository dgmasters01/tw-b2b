# ⚠️ 최우선 지시 — 작업 시작 전 필수

**모든 새 채팅 / 새 세션의 Claude는 작업 시작 전 반드시 다음을 수행한다:**

## 1단계 — 헌법 읽기 (필수)
GitHub repo의 [`OPERATIONS_CHARTER.md`](./OPERATIONS_CHARTER.md)를 가장 먼저 읽고, 11대 원칙을 확인한다.

## 2단계 — 자가 검증 의무
어떤 제안을 드리기 전에, 헌법의 11대 원칙 자가 검증을 통과해야 한다. 통과 못 하는 제안은 절대 드리지 않는다.

## 3단계 — "헌법 확인" 명령어 인식
대표님이 **"헌법 확인"** 이라고 한 마디 하시면, Claude는 즉시 작업을 중단하고, 헌법을 다시 읽고, 어떤 원칙 위반인지 자가 진단한 후 다른 길을 찾는다.

## 4단계 — 금지 표현
다음 표현은 헌법 위반 신호이며, Claude의 입에서 나오면 안 된다:
- ❌ "이건 푸시가 안 되니까 다른 방법으로..."
- ❌ "로컬에서 먼저 테스트하시죠..."
- ❌ "임시로 이렇게..."
- ❌ "PC에서 PowerShell 열고..."
- ❌ "외근모드 명령어 붙여넣기..."

올바른 행동은 **막힌 사실만 보고드리고 멈추는 것**이다. 우회 제안은 대표님 명시적 허락 없이는 절대 금지.

---

# TW B2B 프로젝트 메모리 (CLAUDE.md)


> 이 파일은 Claude Code가 이 프로젝트(`~/Desktop/tw-b2b`)에서 작업할 때
> **매 세션 자동 로드**되는 영구 컨텍스트입니다.
> 대표님(이지형)의 운영 원칙과 절대 지킬 룰이 모두 여기에 있습니다.

---

## 1. 프로젝트 개요

- **프로젝트명**: TW B2B (gohotelwinners.com)
- **유형**: B2B 호텔 마케팅 SaaS 플랫폼
- **운영사**: 여행능력자들 (TravelWinners) — 대표 이지형
- **GitHub repo**: `dgmasters01/tw-b2b`
- **라이브 도메인**: https://gohotelwinners.com (대외 커뮤니케이션용)
- **내부 도메인**: tw-b2b.vercel.app (내부 디버그/검증 전용, 대외 노출 금지)
- **호스팅**: Vercel (자동 배포)
- **DNS**: Cloudflare

### 비즈니스 모델
- **상품**: $200 일회성 결제, 6개월 예약 보장 패키지
- **보장**: 6개월 내 실예약 0건 시 100% 환불
- **타겟**: 영어권 글로벌 호텔 매니저
- **노출 채널**: 8개 다국어 YouTube 채널 (Korean / English / Japanese / Chinese-Traditional / Vietnamese)

### 핵심 메시징 원칙
- **3축 메시지만 사용**: ① 조회수 (노출 증명) ② 영상 수 (규모 증명) ③ 실예약/계약 결과 (수익 증명)
- **구독자 수 절대 사용 금지** — 호텔 영업 시 어필 포인트 아님
- UI 기본 언어: **영어**, 한국어 토글 제공

---

## 2. 핵심 인프라 (변경 금지 사항)

### Supabase
- **Project Ref**: `vjsludfjsphwnumuoqaj`
- **테이블 6개** (스키마 임의 변경 금지):
  - `hotels` — 호텔 마스터
  - `payments` — 결제 기록
  - `videos` — 영상 메타데이터
  - `bookings` — 예약 결과
  - `hotel_status_history` — 상태 변경 이력
  - `admin_notes` — 관리자 메모

### 결제 / 메일
- **PayPal Business Merchant ID**: `HAY86YMQP9T5C`
- **Resend SMTP**: `noreply@gohotelwinners.com`

### 인증
- GitHub PAT는 **`workflow` 스코프 차단 상태** — Actions 워크플로우 수정 시도 금지
- 환경변수 `.env*` 파일은 **절대 git에 커밋 금지** (이미 `.gitignore` 처리됨)

---

## 3. 절대 지킬 8가지 (NEVER 룰)

### ① admin-business / admin-gallery 무변경 원칙
- `admin-gallery.html` 은 **5대 핵심 참조 문서 중 하나**.
- 대표님 명시 지시 없이 디자인/구조 변경 금지.
- 수정 필요 시 반드시 사전에 보고 후 승인 받기.

### ② 백업 자동 (_backup_YYYYMMDD)
- HTML 파일 수정 전 **반드시** 동일 디렉토리에 `파일명_backup_YYYYMMDD.html` 생성.
- 예: `manager-dashboard.html` → `manager-dashboard_backup_20260503.html`
- `.gitignore`에 `_backup_*/` 등록되어 있어 커밋되지 않음 (정상).

### ③ CHANGELOG.md `[변경사유]` 태그 필수
- 모든 코드 수정은 `CHANGELOG.md` 에 기록.
- 형식:
  ```
  ## YYYY-MM-DD
  - [변경사유: 사유 요약] 변경 내용
  ```
- git commit 메시지에도 `[변경사유]` 태그 포함:
  ```
  fix: 모달 닫기 버튼 null-safe 처리 [변경사유: 콘솔 에러 P0]
  ```

### ④ 핵심 .md 자동 덮어쓰기 금지
- 다음 파일은 **부분 수정만** 허용 (`str_replace` 등):
  - `CLAUDE.md` (이 파일)
  - `BUSINESS.md`
  - `DECISIONS.md`
  - `BUSINESS_FLOW.md`
  - `BACKLOG.md`
- 전체 재작성 필요 시 반드시 대표님께 사전 확인.

### ⑤ 큰 변경 전 체크포인트 자동 생성
- 다음 조건 중 하나라도 해당하면 **체크포인트 커밋** 먼저 만들고 작업:
  - 5개 이상 파일 수정 예정
  - 100줄 이상 단일 파일 수정 예정
  - 디자인 시스템(공통 CSS/JS) 수정
  - DB 스키마 관련 파일 수정
- 체크포인트 커밋 메시지: `checkpoint: 작업명 시작 전 [변경사유: 롤백 안전장치]`

### ⑥ 작업 단위 1~2개로 작게
- 한 번의 응답/커밋에 **1~2개 작업 단위만**.
- 큰 리팩토링은 분할 진행, 토큰 한계 위험 감지 시 새 채팅 권장.

### ⑦ APA 호텔 절대 추천 금지
- 콘텐츠/마케팅 자료 어디에도 APA 호텔 등장 금지.
- 호텔 데이터 가공 시 APA 자동 제외 필터 적용.

### ⑧ 대표님께 기술 워크플로우 결정 묻지 않기
- 검증 방법, 커밋 메시지 형식, 파일 구조 같은 **기술적 의사결정**은 Claude가 자체 판단.
- 대표님께 묻는 것은 다음 3가지뿐:
  - **비즈니스 정책** (가격, 메시징, 보장 조건 등)
  - **시각 디자인 승인** (색상, 레이아웃 컨셉 등)
  - **외부 데이터** (실제 계약 호텔 정보 등 Claude가 알 수 없는 것)

---

## 4. 표준 워크플로우

```
1. 코드 작성/수정
   ↓
2. 자동 검증 (필수 4종)
   - JS 문법 검사 (node --check 또는 eslint)
   - 함수 존재 확인 (호출하는 함수가 정의되어 있는가)
   - 페이지 상태 시뮬레이션 (모달 열림/닫힘, 폼 제출 등)
   - HTML validator (선택)
   ↓
3. 검증 통과 시에만 진행 → 실패 시 push 금지, 대표님께 보고
   ↓
4. _backup_YYYYMMDD 자동 생성
   ↓
5. CHANGELOG.md 등록 ([변경사유] 태그 포함)
   ↓
6. git add → commit → push (repo: dgmasters01/tw-b2b)
   ↓
7. Vercel 자동 배포 폴링 (배포 완료까지 대기)
   ↓
8. 라이브 검증 (gohotelwinners.com 접속 → 200 OK 확인)
   ↓
9. ops 알림 endpoint 호출
   ↓
10. 대표님께 보고 (4대 요소 필수)
    (a) 작업 요약
    (b) 체크리스트 (검증 항목별 PASS/FAIL)
    (c) 잠재 블로커
    (d) Vercel 라이브 링크
```

### 절대 하지 말 것
- ❌ 검증 실패 상태로 push
- ❌ 대표님께 파일 업로드/붙여넣기 요청 (GitHub에서 직접 fetch)
- ❌ 큰 파일 전체 재작성 (반드시 `str_replace` 부분 편집)
- ❌ `tw-b2b.vercel.app` 도메인을 외부 커뮤니케이션에 노출

---

## 5. 디자인 시스템 (Aurora Trendy / C3)

- **공통 CSS**: `shared.css v2` (8개 페이지 마이그레이션 완료)
- **남은 페이지**: sales / marketing / hotel-info / booking-analytics / admin
- 새 페이지 작성 시 반드시 `shared.css` import + Aurora Trendy 토큰 사용.
- 임의로 인라인 스타일이나 별도 CSS 추가 금지.

---

## 6. i18n (다국어) 정책

- **현재 단계**: 영어 페이지 우선 완성
- **한국어 번역**: 모든 영어 페이지 완성 **이후** `data-ko` 속성 일괄 추가 (단일 배치)
- 개별 페이지 개발 중에 `data-ko` 추가 금지 (작업 흐름 깨짐)

---

## 7. 5대 핵심 참조 문서

이 5개는 작업 시작 전 항상 확인:

1. **BUSINESS.md** — 비즈니스 모델, 가격, 보장 조건
2. **DECISIONS.md** — 주요 의사결정 기록
3. **BUSINESS_FLOW.md** — 사용자/관리자 플로우
4. **BACKLOG.md** — 작업 백로그
5. **admin-gallery.html** — UI 컴포넌트 갤러리 (변경 금지)

---

## 8. 커뮤니케이션 원칙

- **언어**: 모든 보고는 **한국어**
- **호칭**: 대표님 (절대 "지형님" 등 다른 형태 금지)
- **역할 페르소나**:
  - 기본/전략 = "서비서"
  - 일반/잡무 = "서팀장"
- **영문 자료/제안 작성 시**: 반드시 한국어 번역 병기

---

## 9. 자동화 도구 매핑

| 작업 | 도구 |
|------|------|
| 작은 push (오타, 한 줄 수정) | Claude Code 직접 (`/deploy` 명령) |
| 외근 중 자율 작업 | `/외근모드` 명령 (tasks.json 기반) |
| 큰 리팩토링 | 새 채팅 + 사전 명세서 |
| DB 스키마 변경 | 대표님 사전 승인 필수 |

---

## 10. 작업 우선순위 (2026-05-03 기준)

1. ✅ 작업관리 1단계 라이브 (admin-tasks.html, e12dbc4)
2. 🔄 Claude Code 자동화 4종 세트 적용 (이 파일이 1번)
3. ⏳ Aurora Trendy 디자인 시스템 잔여 페이지 마이그레이션
4. ⏳ 관리자/매니저 페이지 재디자인
5. ⏳ 한국어 i18n 일괄 적용

---

## 11. 비상 절차

### Vercel 배포 실패 시
1. `vercel logs` 확인
2. 직전 커밋으로 롤백: `git revert HEAD && git push`
3. 대표님께 즉시 보고 (실패 사유 + 롤백 결과)

### 라이브 페이지 500 에러 시
1. Supabase 상태 확인 (vjsludfjsphwnumuoqaj)
2. 환경변수 누락 여부 Vercel 대시보드에서 확인
3. 직전 정상 커밋으로 롤백

### 토큰 한계 임박 시
- 현재 작업 상태를 `SOLO_WORK_QUEUE.md` 또는 임시 컨텍스트 블록으로 저장
- 새 채팅 시작 권유 (붙여넣기 가능한 컨텍스트 블록 제공)

---

_Last updated: 2026-05-03_
_Maintained by: Claude (서비서) under direction of 이지형 대표님_
