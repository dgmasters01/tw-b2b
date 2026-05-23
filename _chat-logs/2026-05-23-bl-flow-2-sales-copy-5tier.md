# BL-FLOW-2-SALES-COPY-5TIER — sales.html 5단 카피 박음

**날짜**: 2026-05-23
**BL ID**: BL-FLOW-2-SALES-COPY-5TIER
**상태**: ✅ done (5/5 steps)
**commit**: `b5f2d4d8da` ([링크](https://github.com/dgmasters01/tw-b2b/commit/b5f2d4d8da6bfe93162a99bc4c7dffebc8600705))
**선행**: BL-FLOW-1-AGODA-AUTO-APPROVE (commit `7c27268`)
**다음**: BL-FLOW-3-DASHBOARD-ROUTING-FIX

---

## ① 완료 내용

매니저가 sales.html에 들어가면 **5단계로 결제 설득당하는 카피**가 다국어(KO/EN)로 박힘:

| 단 | 카피 (KO) | 박힌 위치 |
|---|---|---|
| 1 Hero | "우리의 콘텐츠는 당신의 호텔을 **예약 방문**하게 합니다" | `<h1>` 최상단 |
| 2 Proof | "🥈 숫자가 말합니다 / 3,774 예약 발생 · $854K 호텔 매출 발생 · 9M+ 누적 조회" | renderTrust |
| 3 Scale | "당신의 호텔이 **8개 채널**·**6개 언어**로 동시 노출됩니다" | renderChannels |
| 4 How | "당신의 호텔을 8개 채널·6개 언어로 동시 노출합니다. 한국 메인 + 해외 글로벌 확장." | `<p class="sl-sub">` |
| 5 Guarantee | "🎯 6개월 0건이면 100% 환불 — 위탁 영업입니다" | approved 분기 결제 카드 하단 |

추가 작업:
- approved 진입 시 **"🎉 가입 완료! 결제하면 즉시 영상 제작 시작합니다"** 축하 헤더 박음
- 결제 카드 헤더·태그·메타 3개·금액 라벨 전부 KO/EN 다국어
- CSS `sl-tier-head` (위계 헤더) + `sl-pay-guarantee` (초록 보장 박스) 신설
- **언어 토글 시 sales 본문 자동 재렌더링 hook** (부칙 19 전체 갱신 원칙 — shared.js switchLang은 data-en/data-ko만 갱신하므로 sales 동적 분기는 별도 hook 필요)

## ② 이유

- BL-FLOW-1로 Agoda 호텔이 자동 approved되어 sales.html로 라우팅되는 흐름 완성
- 그런데 sales.html 카피가 영어 단순 안내(`Activate your listing`)뿐 → 매니저가 "왜 $200 내야 하는지" 설득 부족
- copy-hierarchy.md v2(2026-05-18 확정)의 5단 위계로 결제 전환율 상승 목표

## ③ 사업 영향

- 매니저가 sales.html 들어오자마자 **약속 → 증거 → 규모 → 작동 → 보장** 5단계로 설득당함
- 한국어 매니저는 한국어로, 영어권 매니저는 영어로 자동 표시 (TW.lang 로컬스토리지 기반)
- approved 상태로 sales 진입 시 **축하 + 즉시 결제 유도** 분위기 강화
- 5단 Guarantee("6개월 0건 100% 환불 — 위탁 영업")로 결제 진입 직전 마지막 안심 박음

## ④ 다음 행동

- **BL-FLOW-3-DASHBOARD-ROUTING-FIX** (P0, order=2): dashboard.html → manager-dashboard.html 라우팅 (결제 후만 진입)
- 인계서 필요 시 별도 작성

## ⑤ 대표님 결정 필요

**없음** — 자율 진행 완료. 다만 라이브 확인 부탁드립니다:

### 어디 가서 / 무엇을 누르면 / 무엇이 보이는지

1. **https://gohotelwinners.com/sales.html** 매니저 계정으로 로그인 (Agoda로 자동 approved된 계정)
2. 페이지 최상단 — `우리의 콘텐츠는 당신의 호텔을 예약 방문하게 합니다` H1 카피 보임
3. 그 아래 — `🥈 숫자가 말합니다` 헤더 + 3,774/$854K/9M+ 통계
4. 그 아래 — `🥈 8개 채널·6개 언어` 채널 칩 가로 나열
5. 결제 카드 — `🎉 가입 완료! 결제하면 즉시 영상 제작 시작합니다` 축하 헤더 → `$200` → PayPal 버튼 → 초록색 `🎯 6개월 0건이면 100% 환불 — 위탁 영업입니다` 박스
6. 헤더 우측 EN/KO 토글 누르면 → **본문 전체가 즉시 재렌더링**(부칙 19 hook 작동 확인 포인트)

---

## 변경 파일

| 파일 | 변경 |
|---|---|
| `sales.html` | 777 → 867줄 (+90줄) |
| `tasks.json` | BL-FLOW-2 done 마킹 + 5 steps 완료 + stats 재계산 |
| `_chat-logs/2026-05-23-bl-flow-2-sales-copy-5tier.md` | 본 파일 신설 |

## 헌법 자가 검증 (11개 질문 통과)

1. ✅ GitHub에만 존재 (로컬 파일 없음)
2. ✅ Vercel 자동 배포 (30초 만에 라이브 반영 확인)
3. ✅ 핸드폰만으로도 가능 (모든 작업 GitHub API 통해 진행)
4. ✅ 작업 기록 영구 보존 (이 chat-log + commit + tasks.json)
5. ✅ 자동 검증 (auto-detect-bot이 [step:done:1~5] 감지)
6. ✅ 다음 세션 Claude도 맥락 파악 가능 (chat-log + BL ID 매핑)
7. ✅ 작업 상태 5초 안에 파악 (tasks.json `status: done`)
8. ✅ 현황표/갤러리 동기화 (sync_engine 자동 갱신)
9. ✅ 되돌릴 수 있음 (commit b5f2d4d 이전으로 revert 가능)
10. ✅ 헌법 자동 로딩 (boot.md + CHARTER + CLAUDE.md fetch 완료)
11. ✅ 메모리 사이클 내 (개발 기간, 토큰 충전 상태)
