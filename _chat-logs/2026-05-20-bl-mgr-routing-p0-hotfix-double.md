# 2026-05-20 — 매니저 라우팅·대시보드 P0 핫픽스 2건 (BL-MGR-CHECK-COLUMN-FIX + BL-MGR-DASH-SUPABASE-CONFLICT)

## 1. 완료 내용

라이브에서 매니저 계정(joylife8760@naver.com, The Westin Tokyo, 결제 완료)이 manager-dashboard.html에 도착하지 못하고 dashboard.html(일반 호텔용)로 잘못 라우팅되며, 우회로 들어가도 화면 데이터가 전부 비어있던 P0 두 건을 1시간 만에 라이브 검증까지 완료.

**BL-MGR-CHECK-COLUMN-FIX** (done): shared.js L230의 `select('id', ...)` 한 단어를 `select('hotel_id', ...)`로 교체. v_manager_hotels VIEW는 h.id를 `hotel_id` alias로 노출하는데, checkManager 함수가 존재하지 않는 'id' 컬럼을 조회 → 400 Bad Request → r.count=null → 0건 → "매니저 아님" 판정 → login.html 라우팅이 dashboard.html로 분기. 1줄 수정으로 라이브 매니저 라우팅 정상화 (joylife8760@naver.com → manager-dashboard.html 자동 도착 라이브 검증됨). commit 3beffde.

**BL-MGR-DASH-SUPABASE-CONFLICT** (done): manager-dashboard.html L949의 `const supabase = window.TW.sb`가 Supabase JS SDK가 `<script src="@supabase/supabase-js@2">`로 박은 글로벌 `window.supabase`와 변수명 충돌 → SyntaxError → JS 전체 정지 → 데이터 로딩, 탭 전환, 모든 후속 코드 실행 불가. `const supabase` → `const sb`로 리네임 + 호출 13곳 일괄 치환. CDN URL과 window.supabase는 보호 토큰 패턴으로 격리하여 보존. commit c3154bb. 라이브 검증 완료: 호텔명/주소/별점/Manager/Progress 5단계/Operations 4카드/8채널 LIVE 모두 정상 표시.

## 2. 이유

매니저 라우팅 BL-MGR-LOGIN-ROUTING이 done으로 박혔지만 라이브에선 모든 결제 완료 매니저가 일반 호텔 화면을 보고 있었음. 그리고 BL-MGR-DASHBOARD-V1도 done이었지만 SyntaxError로 화면 자체가 작동하지 않는 상태였음. 두 BL 모두 "라이브 검증" step이 사실상 형식적으로만 박힌 채 done 처리된 검증 워크플로우 빈틈이 원인. 대표님이 직접 leejifilm@hanmail.net으로 로그인 시도하다 dashboard.html에 도착하면서 문제 발견.

## 3. 사업 영향

결제까지 완료한 정식 매니저 N명이 본인용 화면을 못 보고 있던 상태가 P0 → 즉시 해소. 매니저들이 호텔 정보, 예약, 매출, 영상 노출 현황, 8채널 LIVE 상태, 6개월 보장 진행도까지 모두 정상 확인 가능. BL-MGR-DASHBOARD-V1이 진짜로 완성된 상태가 되어 다음 다듬기 작업(이미지 placeholder, 메뉴 스크롤 등)으로 진입 가능.

## 4. 다음 행동

매니저 대시보드 라이브 정상화 후 잔존 사항 2건이 라이브 화면에서 발견됨: (1) 상단 5탭 영역 가로 스크롤바 발생 — 반응형 레이아웃 정리 필요. (2) 호텔 카드 좌측 이미지 placeholder만 보이고 실제 사진 미표시 — DB의 hotels.image_url 비어있을 가능성 vs 코드 참조 문제 분기 진단 필요. 둘 다 P0 아닌 다듬기 수준이라 새 BL로 박아 별건 진행.

대표님이 박으신 A안 방향("manager-dashboard.html 직접 보면서 다듬기")이 그대로 살아있음 — P0 두 개 치우면서 화면이 보이게 됐으므로, 다음 채팅에선 라이브 화면 보면서 "여기 → 매니저한테 보여줘 / 숨겨" 한 줄씩 박는 단계로 진입 가능.

## 5. 결정 요청

이번 채팅에선 결정 요청 없음 — A안(지금 chat-log 박고 종결)을 대표님이 자율 판단으로 위임하셔서 본 chat-log로 마무리. 다음 채팅에서 결정할 것: (a) 호텔 이미지 없는 원인이 DB vs 코드 어느 쪽인지 진단 후 처리 방향, (b) 메뉴 스크롤 정리를 BL-MGR-DASHBOARD-V1.1에 묶을지 별도 다듬기 BL로 박을지.

## 부록 — 검증 워크플로우 빈틈 사실 기록 (헌법 부칙 16 강화 근거)

이번 작업 중 두 가지 사실이 드러남:

(1) **BL-MGR-LOGIN-ROUTING의 step 7 라이브 검증 부실** — 검증 보고서가 박혔지만 실제로 매니저 계정으로 로그인해서 manager-dashboard.html 도착 여부를 확인하지 않은 것으로 보임. shared.js의 컬럼명 오류는 라이브에서 한 번이라도 매니저 로그인했다면 즉시 발견됐을 버그.

(2) **BL-MGR-DASHBOARD-V1의 라이브 화면 검증 부실** — done 처리됐지만 SyntaxError가 첫 줄부터 터지는 상태였음. 브라우저로 페이지를 한 번이라도 열어봤다면 콘솔 빨간 에러 2개가 즉시 보였을 것.

(3) **공통 원인 추정**: 코드 작성 + GitHub commit + Vercel 배포 성공 = 검증 완료로 처리한 것으로 보임. "JS 문법 OK + diff 정확함"은 코드 검증이지 동작 검증이 아님.

**다음부터 강제할 룰 (chat-log로 박아 후속 BL의 검증 기준에 반영):**
- 매니저/어드민 관련 화면 BL의 검증 step에는 반드시 "라이브 URL 접속 + 콘솔 에러 0건 + 핵심 데이터 1건 이상 표시 확인"이 포함되어야 함.
- "라이브 fetch로 코드가 박힘"은 검증 1단계일 뿐, 2단계로 "그 페이지가 실제로 작동함"을 별도 step으로 두기.
- 매니저 BL은 최소 1개 매니저 계정으로 로그인 → 자동 라우팅 도착 화면 캡처를 검증 증거로 박기 (어드민 임퍼소네이트 기능도 충분히 활용 가능 — admin-manager-hub.html에서 "↗ 매니저 화면 열기" 클릭).

## 부록 — commit 이력

| step | commit | 내용 |
|---|---|---|
| BL 등록 | [6a5c897](https://github.com/dgmasters01/tw-b2b/commit/6a5c897) | tasks.json — BL-MGR-CHECK-COLUMN-FIX 신규 등록 |
| 1번째 핫픽스 | [3beffde](https://github.com/dgmasters01/tw-b2b/commit/3beffde) | shared.js — select('id') → select('hotel_id') |
| 라이브 검증 | (live) | 매니저 라우팅 → manager-dashboard.html 자동 도착 확인 |
| BL 1번째 done + BL 2번째 등록 | [790afa3](https://github.com/dgmasters01/tw-b2b/commit/790afa3) | tasks.json — 1번째 완료 마킹 + 2번째 신규 등록 |
| 2번째 핫픽스 | [c3154bb](https://github.com/dgmasters01/tw-b2b/commit/c3154bb) | manager-dashboard.html — const supabase → const sb 일괄 |
| 라이브 검증 | (live) | The Westin Tokyo 데이터 전체 표시 확인 |
