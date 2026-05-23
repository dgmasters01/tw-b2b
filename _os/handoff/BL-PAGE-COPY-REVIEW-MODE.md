# BL-PAGE-COPY-REVIEW-MODE — 페이지 카피·디자인 검수 모드 인계서

**생성**: 2026-05-23
**모드**: 페이지 한 화면씩 대표님과 같이 보면서 수정
**선행 채팅 종료 commit**: `06e2f90a` (최신 main 헤드)

---

## 다음 채팅 시작 한 마디

대표님이 다음 채팅에서 이렇게 말씀하시면 됩니다:

> **"[페이지명] 검수 시작"** 또는 **"sales.html 카피 바꿀게"** 또는 **"manager-dashboard 같이 보자"**

그러면 클로드가 자동으로 헌법 부칙 5(4 카테고리) 그대로 따라갑니다.

---

## 클로드가 자동으로 할 것

페이지 검수 요청 받으면 순서대로:

1. **헌법 자동 로드** (boot.md → OPERATIONS_CHARTER → CLAUDE.md → 본 인계서)
2. **해당 페이지 라이브 fetch** (`https://api.github.com/repos/dgmasters01/tw-b2b/contents/{page}`)
3. **현재 모습 보여드리기**:
   - 라이브 페이지 캡처 (playwright + mock 데이터로 로그인 우회 시뮬레이션)
   - 또는 페이지 본문 직접 표시 (HTML 골격 + 핵심 카피)
4. **대표님 지시 받기**: "여기 카피 바꿔" / "이 박스 색 바꿔" / "이 버튼 없애" / "이 영역 추가해"
5. **str_replace로 부분 수정** → commit → 30초 후 라이브 반영 → 다음 부분으로
6. 검수 한 페이지 끝나면 chat-log + tasks.json 박기

---

## 검수 대상 페이지 우선순위 (대표님 결정 영역)

| 우선 | 페이지 | 라이브 URL | 크기 | 검수 포인트 |
|---|---|---|---|---|
| 🔴 최우선 | **sales.html** | https://gohotelwinners.com/sales.html | 998줄 | 5단 카피 + 본인 호텔 매출 박스 + 결제 카드. **매출 직결 페이지** |
| 🟠 P0 | **signup.html** | /signup.html | 240줄 | 가입 첫 화면 — 첫인상, 가입 전환율 |
| 🟠 P0 | **hotel-info.html** | /hotel-info.html | 65KB | 호텔 등록 — Google Places + Agoda 매칭 |
| 🟡 P1 | **manager-dashboard.html** | /manager-dashboard.html | 1964줄 | 결제 후 본진 — KPI/Videos/Payments/Analytics |
| 🟡 P1 | **verify-email.html** | /verify-email.html | — | 이메일 인증 — 단순 안내 페이지 |
| 🟢 P2 | **marketing.html** | /marketing.html | 16KB | 매니저 성과 — Aurora 디자인 |
| 🟢 P2 | **settings.html** | /settings.html | 14KB | 매니저 설정 — partial 상태 |

---

## 캡처 시뮬레이션 방법 (클로드용 메모)

라이브 페이지가 로그인 필요한 경우(sales / hotel-info / manager-dashboard 등) **mock 시뮬레이션 캡처** 사용:

```python
# 패턴: shared.js의 T.requireAuth + T.checkAdmin + T.sb를 init script로 override
# Mock hotel/user/revenue를 window.__MOCK_*에 박고 fetch override
# 로컬 HTTP 서버 8765 포트로 sales_mock.html 띄운 후 playwright 캡처
# 환경변수: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
```

상세는 `_chat-logs/2026-05-23-bl-signup-enrichment.md` 캡처 시 사용한 패턴 참조.

---

## 검수하면서 지키는 헌법 부칙

- **부칙 1**: 위치/구조/배치 자율 결정 — "어디 박을까요" 절대 묻지 않음
- **부칙 16**: 묻는 것은 4가지뿐 — ① 사업 정책 ② 디자인 큰 방향 ③ 외부 데이터 ④ 이미지 사용 권한. **카피 본문 내용**은 대표님 결정 영역
- **부칙 18**: 큰 파일 통째 재작성 금지 — str_replace 부분 수정만
- **부칙 19**: 전체 갱신 원칙 — 한 곳 카피 바꾸면 KO/EN 둘 다 + 다국어 토글 hook도 같이 갱신

---

## 라이브 현재 상태 (검수 시작 시점)

- **진행률**: 189/252 (75.0%)
- **_health.json**: red 0, yellow 1(admin_baseline), green 4
- **자동 봇**: sync-bot/chat-log-bot/auto-detect-bot/scan-bot 모두 작동 중
- **차단 없는 P0 BL**: BL-MEMBERS-DATA-SOURCE (가입자 화면 정리)
- **approval 필요 BL**: BL-ADMIN-OPERATIONS-DASHBOARD (운영 대시보드 본격 구축)

페이지 검수 모드가 끝나면 위 BL로 자율 복귀 가능.
