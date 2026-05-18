🚨🚨🚨 새 클로드 — 작업 시작 전 절대 의무 (위반 시 헌법 부칙 16 위반) 🚨🚨🚨

【의무 1】 첫 응답 5줄 양식 강제 (헌법 부칙 16):
  ① [작업 소요: 약 X분 / N단계 / 변경 파일: ...]
  ② 🚦 ✅ 이 채팅 진행 가능 (또는 ⚠️ 새 채팅 권장)
  ③ 📚 fetch 완료: boot.md / [작업파일] / 라이브 상태
  ④ 🧭 북극성: [사용자 문제 한 줄] + 🎯 한 채팅 한 결정: [본질 결정 한 줄]
  ⑤ 🔍 중복 점검 grep 결과 한 줄

【의무 2】 라이브 fetch 의무 — 인계서만 믿지 말 것 (3단계 강제):
  ✅ 1단계 헌법 3종 라이브 fetch (전체)
       • OPERATIONS_CHARTER.md / CLAUDE.md / _os/playbook/claude-discipline.md
  ✅ 2단계 _os/boot.md 1개 fetch (라이브)
  ✅ 3단계 작업 대상 파일 라이브 fetch

【의무 3】 절대 금지 행동:
  ❌ "어느 방식 원하세요? A/B/C" → 검증 방법·기술 선택은 클로드 자율
  ❌ 결과를 클로드 언어로 보고 → 초등학생 언어 + "어디/무엇/어떻게" 4줄 강제

【의무 4】 묻는 것 — 정확히 4가지뿐:
  ✅ 비즈니스 방향 / 서비스 방향 / 전체 틀 변화 / 디자인 큰 방향 (이미지)

【의무 5】 단계 1개 = commit 1개 (헌법 부칙 7):
  commit subject에 [step:done:N] 태그

──────── 위 헤더는 모든 인계서 자동 prepend (BL-CLAUDE-DISCIPLINE, D-023) ────────
──────── 아래는 작업 컨텍스트 ────────

# 🔄 인계서 — BL-MGR-DASHBOARD-V1 stage 4 라이브 검증

**발행**: 2026-05-18
**이전 채팅 완료**: stage 3 Step 1~7 (Supabase VIEW + 5탭 + 라이브 배포 확인)
**다음 작업**: stage 4 라이브 검증 + 운영 모드 진입 (stage 5)

---

## 📍 현재 위치 (라이브 GitHub 기준)

```
BL-MGR-DASHBOARD-V1
├── ✅ stage 1: 카피·정책 박제 (done, 2026-05-17)
├── ✅ stage 2: 와이어프레임 5탭 v2 SVG (done, 2026-05-18)
├── ✅ stage 3: 시스템 완성도 (done, 2026-05-18)
│   ├── ✅ Step 1: Supabase VIEW 7종 (47201c4)
│   ├── ✅ Step 2: 골격 + 탭1 홈 (9d19154)
│   ├── ✅ Step 3: 탭2 영상 (d9d29ee)
│   ├── ✅ Step 4: 탭3 결제 (61f8f34)
│   ├── ✅ Step 5: 탭4 문의 (ecd19c2)
│   ├── ✅ Step 6: 탭5 고객분석 (eca8cbb)
│   └── ✅ Step 7: 라이브 검증 + 인계서 박제 (this commit)
├── 🟡 stage 4: 라이브 검증 ← 이 채팅
└── ⏳ stage 5: 운영 모드
```

**최신 라이브 commit**: `eca8cbb` 이후
**라이브 도메인**: https://gohotelwinners.com/manager-dashboard.html (HTTP 200 ✅)
**파일 크기**: 106,856 bytes (HTML 1947줄)

---

## ✅ stage 3에서 박힌 것 (회수 의무)

### 1. Supabase VIEW 7종 (sql/v_manager_dashboard.sql, 라이브 적용 완료)
- `v_manager_hotels` — 매니저별 호텔 카드
- `v_manager_video_summary` — 8채널 영상 요약
- `v_manager_booking_stats` — KPI 4카드 (총예약/확정매출/총박야/노쇼)
- `v_manager_payments` — 결제 카드 (1차/2차 분리 + 보장기한)
- `v_manager_country_distribution` — 국가별 분포 (KR/JP/US/TW)
- `v_manager_monthly_trend` — 최근 6개월 추이
- `v_manager_recent_bookings` — 예약 명세 7컬럼

### 2. manager-dashboard.html 5탭 (1947줄)
- **🏠 홈**: 호텔카드 / 진행 파이프라인 / 6개월 보장 / KPI 4 / 채널 위계 v3 / 최근 7일 활동
- **🎬 영상**: 본편 카드 / 8채널 표 (LIVE/SCHEDULED/PENDING) / 추가 노출 0편 시 섹션 숨김
- **📝 결제**: 1차/2차 계약 카드 (운영중/대기) / 3버튼 (인보이스·영수증·계약서) / 6개월 보장 배너 / 7컬럼 예약표 / CSV 내보내기
- **💬 문의**: Customer Success 카드 / FAQ 5개 접힘식 / 검색바 / 필터 5개 / 10건 페이지네이션
- **📊 고객 분석**: KPI 4 (노쇼 0건 시 "없음" 정직 표시) / 4개국 분포 / 6개월 막대차트 / 4단계 퍼널 / V1.1 로드맵 3종 / CSV 내보내기

### 3. 인프라
- `window.TW.sb` Supabase client (shared.js 글로벌)
- i18n: EN 기본 + `data-en`/`data-ko` + placeholder i18n + 동적 컨텐츠 재렌더 hook
- 모바일 분기: 결제 메타 1열 / 퍼널 세로 / 트렌드 차트 축소

---

## 🛠️ 이 채팅 작업 순서 (3단계)

### Step 1 — 실 매니저 계정 시나리오 검증

**준비물**:
- 테스트 매니저 계정 (Supabase auth.users + hotels.manager_user_id 매핑된 유저)
- 없으면 새로 박기:
  ```sql
  -- 1. supabase.auth.admin.createUser({email,password,email_confirm:true})
  -- 2. hotels 테이블 1개 row의 manager_user_id를 그 user.id로 update
  -- 3. 그 hotel_id로 payments / bookings_unified 더미 데이터 박기 (선택)
  ```

**검증 시나리오** (Vercel preview 또는 라이브):
1. `/login.html` → 매니저 계정 로그인 → `/manager-dashboard.html` 자동 리다이렉트
2. 토픽바: 로고 / EN·한 토글 / 알림벨 / 매니저 이메일 / 메뉴 작동 확인
3. **🏠 홈** 탭: 호텔 카드 / 진행 파이프라인 / KPI 4 / 채널 위계 / 최근 7일 활동 표시
4. **🎬 영상** 탭 클릭 → lazy load → 본편 카드 + 8채널 표 표시
5. **📝 결제** 탭 클릭 → 결제 카드 (운영중/대기) / 6개월 보장 배너 / 예약표 5건 + 더보기
6. **💬 문의** 탭 클릭 → CS 카드 / FAQ 5개 토글 / 검색·필터 작동
7. **📊 고객 분석** 탭 클릭 → KPI 4 / 4개국 막대 / 6개월 추이 / 4단계 퍼널
8. EN ↔ 한 토글 → 모든 동적 컨텐츠 즉시 재렌더 확인
9. CSV 내보내기 (결제 탭 + 분석 탭) → BOM 포함, Excel 한글 깨짐 없음 확인
10. 모바일 (375px) → KPI 2열 / 결제 메타 1열 / 퍼널 세로 분기

→ commit `feat(BL-MGR-DASHBOARD-V1): stage 4 라이브 검증 시나리오 박제 [step:done:1]`

### Step 2 — 발견된 결함 fix (있으면)

검증 중 발견된 결함은 `manager-dashboard.html` 직접 fix.
- 결함 0개: 바로 Step 3
- 결함 N개: 우선순위 정해서 fix 후 재검증

→ commit `fix(BL-MGR-DASHBOARD-V1): [발견 결함명] [step:done:2]`

### Step 3 — 운영 모드 진입 + ops 알림 + V1 출시 박제

1. `tasks.json` BL-MGR-DASHBOARD-V1: stage 4 → done, stage 5 → in_progress (운영 모드)
2. `CHANGELOG.md` 박제: "BL-MGR-DASHBOARD-V1 V1 출시 (2026-05-18)"
3. `DECISIONS.md` 박제: D-XXX "매니저 대시보드 V1 라이브 출시 — manager-dashboard.html"
4. ops 알림 POST:
   ```
   POST https://gohotelwinners.com/api/email/ops/notify-claude-work
   Header: x-ops-token: sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK
   Body: {
     step: "BL-MGR-DASHBOARD-V1 V1 출시 완료",
     summary: "매니저 대시보드 5탭 라이브 출시",
     checklist: ["Supabase VIEW 7종", "5탭 완성", "라이브 검증 완료"],
     vercel_url: "https://gohotelwinners.com/manager-dashboard.html",
     commit_hash: "..."
   }
   ```
5. BL-MGR-DASHBOARD-V1.1 (ADR + 시즌 + 채널 조회수) 우선순위 high 승격

→ commit `feat(BL-MGR-DASHBOARD-V1): V1 출시 완료 [step:done:3]`

---

## ⚠️ 검증 시 주의 사항

### 1. 매니저 계정 데이터 의존
- v_manager_hotels에 매핑된 manager_user_id 없으면 "호텔 없음" 화면 표시 → 정상
- 더미 데이터 박기 옵션은 별도 BL-MGR-DEMO-DATA로 분리 (이 채팅에서 안 함)

### 2. PDF 다운로드 stub
- 인보이스/영수증/계약서 버튼은 현재 alert("BL-DOC-PDF-GEN 예정") 표시
- stage 4에서 PDF 생성 안 박음 — 별도 BL-DOC-PDF-GEN으로 분리

### 3. inquiries 테이블 미존재
- 문의 탭은 빈 배열 시작 ("문의 내역이 없습니다" 표시) → 정상
- + 새 문의 작성 / 문의 상세 = stub
- 별도 BL-INQUIRY-SCHEMA에서 schema + UI 박기

### 4. Agoda click 추적
- 퍼널 "Agoda Click" = '—' 표시 + sub에 "추적 준비 중 (V1.1)"
- 채널별 CID 매핑은 있지만 클릭 추적 테이블 미존재 → V1.1에서 처리

---

## 📦 인프라 정보 (헌법 11조 충전)

- 라이브 도메인: gohotelwinners.com
- GitHub: dgmasters01/tw-b2b (main)
- Supabase: vjsludfjsphwnumuoqaj
- Vercel Project: prj_KPfzLZaDSaEv6mBdyp3bIpDlPAjY

> 토큰(GitHub PAT · Supabase Mgmt · Vercel · Resend)은 대표님 memory에 박혀있음. 첫 응답에서 boot.md fetch 시 회수.

---

## 🎯 북극성 + 한 채팅 한 결정

**북극성**: 호텔 매니저가 본인 호텔의 영상 노출·예약·매출·고객 분석을 한 화면에서 보고 다음 액션(연장 결제/문의)을 결정할 수 있게 한다

**stage 4 이 채팅 한 결정**: manager-dashboard.html 라이브 검증 + 결함 fix → V1 출시 박제

---

## 🚀 새 채팅 시작 명령 (대표님이 붙여넣을 문장)

```
docs/design/BL-MGR-DASHBOARD-V1/handoff-stage-4.md 따라 stage 4 진행
```

---

**박힘**: 2026-05-18 / **발행자**: stage 3 Claude / **수신자**: stage 4 Claude
