# TW B2B 시스템 — 진행 상황

마지막 업데이트: 2026-04-25

## 🎯 목표
호텔 파트너에게 $200 영상 제작 서비스를 판매하는 B2B 시스템.
1인 운영 가능한 단순한 구조 (원클릭, 자동수집).

---

## ✅ 완료된 작업

### Phase 0: 인프라 구축
- ✅ Supabase 데이터베이스 (6개 테이블 + RLS + 트리거)
- ✅ PayPal Business 계정 (TRAVELWINNERS INC.)
- ✅ Google Cloud 프로젝트 (1hogi)
- ✅ Google Places API 활성화 + API 키
- ✅ Vercel 환경변수 등록 (GOOGLE_PLACES_API_KEY, AGODA_API_KEY)

### Phase 1: 시스템 코드 (이번 세션)
- ✅ shared.js v2 (Supabase DB 헬퍼 + API 헬퍼 + 포맷터)
- ✅ /api/agoda-hotel.js (아고다 Long-tail API 프록시)
- ✅ /api/google-places.js (Google Places API 프록시)
- ✅ /api/process-hotel.js (통합 호텔 정보 수집)
- ✅ hotel-info.html (아고다 URL → 자동 수집 → 저장)
- ✅ dashboard.html (호텔별 격리 + 상태별 분기)
- ✅ admin.html (호텔 목록 + 검토/승인/상태변경)
- ✅ vercel.json (Serverless Functions 설정)

---

## 🔄 작동 흐름

### 호텔 매니저 입장
```
signup.html → 가입 (Supabase Auth)
       ↓
hotel-info.html → 아고다 URL 입력 → 자동 수집
       ↓
[Step 1] /api/process-hotel 호출
   ├── /api/agoda-hotel 내부 호출 (성급/가격/이미지)
   └── /api/google-places 내부 호출 (주소/전화/홈페이지/사진)
       ↓
[Step 2] 자동수집 결과 확인 → 수정 → 저장
       ↓
hotels 테이블에 status=pending 으로 INSERT
       ↓
dashboard.html → 본인 호텔 + 상태 표시
```

### 관리자 흐름
```
admin.html (dgmasters01@gmail.com 전용)
       ↓
모든 호텔 목록 (필터: pending/review/approved/paid/producing/published/rejected)
       ↓
호텔 클릭 → 상세 + 사진 + 액션 버튼
       ↓
상태 변경: pending → review → approved → paid → producing → published
```

---

## ⏳ 미완성 (Phase 2)

### 결제 시스템
- ⏳ PayPal Checkout 통합 (`paid` 상태 자동 전환)
- ⏳ payments 테이블에 결제 내역 자동 기록
- ⏳ Webhook으로 결제 확인

### 영상 제작 워크플로우
- ⏳ 영상 게시 시 videos 테이블 입력 UI
- ⏳ YouTube URL + 통계 자동 수집
- ⏳ 매니저 대시보드에 영상/통계 표시

### 예약 트래킹
- ⏳ 아고다 어필리에이트 클릭 트래킹
- ⏳ bookings 테이블에 예약 기록
- ⏳ 매니저별 커미션 계산

### 영업 자동화 (선택)
- ⏳ 영업 메일 템플릿
- ⏳ 호텔 후보 리스트 관리
- ⏳ 가입 전환 추적

---

## 🔧 환경변수 (Vercel에 등록 필요)

```
GOOGLE_PLACES_API_KEY = <Google Cloud Console에서 발급>
AGODA_API_KEY = 1913282:e1d60291-545d-4f16-9572-dc3684e5aa33
```

> ⚠️ 메모리에 따르면 이전에 노출된 아고다 키는 새 키로 교체 필요. 시스템 가동 후 처리.

---

## 🧪 테스트 시나리오

### 시나리오 1: 신규 호텔 가입
1. tw-b2b.vercel.app/signup → 가입
2. hotel-info.html 자동 이동
3. Agoda URL 입력 (예: 마리나 베이 샌즈)
4. City ID 9395 (싱가포르) 입력
5. "Fetch Hotel Info" → 자동 수집 결과 확인
6. "Save & Continue" → hotels 테이블에 저장
7. dashboard.html → 호텔 정보 + "Pending" 상태 확인

### 시나리오 2: 관리자 승인
1. dgmasters01@gmail.com 로그인 → 자동으로 admin.html
2. Pending 필터에서 신규 호텔 확인
3. View 클릭 → 상세 정보 확인
4. "Approve" → status=approved
5. 매니저 dashboard에서 결제 카드 노출

### 시나리오 3: 자동수집 실패 케이스
- City ID 없이 아고다 URL만 → Google만 자동수집
- Google 검색 실패 → 수동 입력 화면 그대로 진행
- 모두 실패 → 빈 폼에서 수동 입력

---

## 📦 배포 방법

```
1. /home/claude/tw-b2b/ 의 모든 파일을 GitHub에 업로드
   - dgmasters01/tw-b2b 저장소
   - main 브랜치
2. Vercel이 자동 배포 (1-2분)
3. tw-b2b.vercel.app 접속하여 작동 확인
```

### 변경된 파일 목록
- shared.js (v1 → v2)
- hotel-info.html (완전 재작성)
- dashboard.html (완전 재작성)
- admin.html (완전 재작성, 969KB → 16KB)
- vercel.json (Functions 설정 추가)

### 새로 추가된 파일
- api/agoda-hotel.js
- api/google-places.js
- api/process-hotel.js
- STATUS.md (이 파일)

### 변경 없는 파일
- index.html
- login.html
- signup.html
- shared.css
