# BL-MGR-DASHBOARD-V1 · Design Spec v1

**작업 ID**: BL-MGR-DASHBOARD-V1
**작성일**: 2026-05-17
**상태**: 디자인 확정 대기 (대표님 검수)

---

## 1. 페이지 역할

호텔 매니저(가입자, 결제 고객)가 본인 호텔의 **노출·예약·매출·고객 분석**을 한 화면에서 보고, **다음 액션(연장 결제 / 문의 / 정보 수정)** 을 결정한다.

운영자(대표님)용 `manager-hub.html`과 **완전 분리**. (BL-PAGE-ROLES-SPLIT 헌법 준수)

---

## 2. 전체 외골 (Aurora Trendy v2)

- **배경**: 다크 캔버스 + Aurora 4 blob + grid 라인
- **그라디언트**: `--aurora` = linear-gradient(135deg, #7C3AED → #EC4899 → #F59E0B → #06B6D4)
- **카드**: 글래스모피즘 (white/8% border, backdrop-blur)
- **폰트**: 시스템 산세리프, 한국어/EN 우선
- **반응형**: 데스크탑 12-col / 모바일 1-col 스택

---

## 3. 화면 구조 (위에서 아래)

### 3-1. 상단 헤더
- 좌: 호텔 아이콘 + 호텔명 + 도시 / 담당자명
- 우: 언어 토글 (KO / EN) + 알림 벨 + 로그아웃

### 3-2. 가로 5탭
1. 🏠 **홈** (기본 활성)
2. 🎬 **영상**
3. 📝 **계약·결제**
4. 📊 **고객 분석**
5. 💬 **문의**

### 3-3. 알림 배너 (조건부 노출)
- D-30 / D-7 / D-0 시점에 노란 배너
- 메시지: "계약 만료 D-N · 연장 결제 시 노출 끊김 없이 이어집니다 · 선결제 진행"
- 클릭 시 계약·결제 탭으로 이동

---

## 4. 탭별 콘텐츠

### 탭 1 — 홈
- **2단 그리드**: 호텔 카드 (좌) / 진행 5단계 스테퍼 (우)
- **KPI 4개**: 총 노출 / 예약 건수 / 예약 금액(USD) / 매출 인정
- **계약 카드**: 1차/2차 분리, 진행 중 위·종료 아래
- **영상 채널 타겟 6라벨**: 한국 / 영어권 / 일본 / 대만 / 베트남 / 태국 (각 채널 노출 수치)

### 탭 2 — 영상
- 본편 영상 카드 (썸네일 + 제목 + 공개일 + 노출 수)
- 무상 추가 영상 카드 (목록)
- 채널별 타겟 국가 매핑 표

### 탭 3 — 계약·결제
- **1차 계약 카드**: 시작일/종료일/금액/상태
- **2차 계약 카드**: (있으면) 동일 포맷
- **종료 계약**: 아래쪽 흐림 처리
- **선결제 버튼**: D-30 도달 시 활성화

### 탭 4 — 고객 분석 (6 인사이트)
1. 국가별 예약 금액 (customer_country × SUM(booking_amount_usd))
2. 객실 타입별 분포 (room_type)
3. 인원 구성 (num_adults / num_children 원본)
4. 체크인 요일/월 분포
5. 평균 숙박일 (nights)
6. 디바이스/소스별 예약 (device_type)
- **다운로드 버튼**: PDF / 엑셀

### 탭 5 — 문의
- 텍스트 입력 폼
- 카테고리 (계약 / 결제 / 영상 / 기타)
- Resend 메일로 ops 알림

---

## 5. 데이터 매핑 (admin.html AGODA_COL_MAP 라이브 검증 완료)

| 화면 항목 | 컬럼 | 비고 |
|---|---|---|
| 예약 건수 | COUNT(*) WHERE booked_at IN 계약기간 | 예약일 기준 귀속 |
| 예약 금액 (USD) | SUM(booking_amount_usd) | 취소 제외 |
| 매출 인정 | SUM(booking_amount_usd) WHERE checkout_date < today | 체크아웃 완료 + 노쇼 |
| 국가별 예약 | customer_country × SUM(booking_amount_usd) | 인사이트 #1 |
| 객실 인원 | room_type / num_adults / num_children | V1 원본 표시 |
| 채널별 예약 | device_type × COUNT, SUM | V1 (조회수/CTR은 V2) |

---

## 6. 진행 상태 5단계 컬러 매핑

| 단계 | 라벨 | 색상 (Aurora v2) |
|---|---|---|
| 1 | 결제 | `--aurora-3` cyan |
| 2 | 노출 대기 | `--aurora-5` amber |
| 3 | 진행 중 | `--aurora-6` green |
| 4 | 정산 | `--aurora-1` purple |
| 5 | 마감 | gray |

---

## 7. 파일 구조

```
manager-dashboard.html         # 메인 페이지
sql/v_manager_dashboard.sql    # Supabase VIEW
docs/design/BL-MGR-DASHBOARD-V1/
  ├── design-spec.md           # 이 문서
  ├── wireframe-v1.html        # 와이어프레임
  └── reference/               # 대표님 첨부 이미지 (예정)
```

---

## 8. 결정 박제 (16개 — tasks.json decisions_locked와 동기)

1. 탭 5개: 홈/영상/계약&결제/고객분석/문의
2. 언어: KO/EN 토글 (중일 금지)
3. 호텔 카드: 정보+담당자+수정 버튼 통합
4. 진행 5단계: 결제→노출대기→진행→정산→마감
5. 영상: 본편+무상 추가
6. 채널 타겟 6라벨: 영어권/한국/일본/대만/베트남/태국
7. 계약: 1차/2차 분리, 진행 중 위·종료 아래
8. 예약 귀속: booked_at 기준
9. 매출 인정: 체크아웃 완료 + 노쇼
10. 취소: 매출 외 분리 표시
11. 선결제: D-30부터 가능
12. 알림: D-30/D-7/D-0 메일 3회 + 화면 배너
13. 고객 분석: 6 인사이트 + PDF/엑셀
14. 채널별 분석 V1: 예약 건수 + 금액만 (YouTube API는 V2 별도 BL)
15. 국가별 예약: customer_country × SUM(booking_amount_usd)
16. 객실 인원: room_type/num_adults/num_children 원본 (V1)

---

**Last updated**: 2026-05-17
**Maintained by**: 클로드 (BL-MGR-DASHBOARD-V1 owner)
