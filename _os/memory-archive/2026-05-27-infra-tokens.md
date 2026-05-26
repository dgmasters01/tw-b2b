# 메모리 아카이브: 인프라 + 토큰

> **묶음 1 / 5** — 운영 진입 시 정리 대상인 충전 정보들  
> **출처:** 2단계 압축 전 메모리 4,6,7,8,9,10 원문 (토큰 값은 마스킹)  
> **참조:** `_os/INDEX.md` → `_os/infra/` 섹션  
> **⚠️ 토큰 실값:** Claude 메모리(휘발성)에만 보관. GitHub Secret Scanning 정책상 repo에는 마스킹만 박음.

---

## 메모리 4 — TW B2B 인프라 핵심 (헌법 11조 충전 단계)

[TW B2B 인프라 핵심 / 헌법 11조 충전 단계] **라이브 도메인: gohotelwinners.com** (대표님 안내 시 항상 이 도메인. tw-b2b.vercel.app은 내부 확인용). GitHub: dgmasters01/tw-b2b (main). Supabase: vjsludfjsphwnumuoqaj.supabase.co. 6 tables: hotels/payments/videos/bookings/hotel_status_history/admin_notes. 관리자: dgmasters01@gmail.com. Vercel env: GOOGLE_PLACES_API_KEY, AGODA_API_KEY=1913282:[REDACTED-AGODA-KEY]. **🔋 AGODA_API_KEY는 충전 상태 — 운영 진입 시 제거 (헌법 11조). 도메인·테이블·repo 정보는 운영용으로 유지.**

---

## 메모리 6 — Supabase Management API Token (충전)

[Supabase Management API Token / 헌법 11조 충전 단계] TW B2B Claude Automation: [REDACTED-SBP-TOKEN] (expires 2026-06-04, 어제 발급 tw-b2b-admin-auth-v2). Project ref: vjsludfjsphwnumuoqaj. 사용처: SQL 자동실행, RLS 정책, 스키마 변경, 사용자 관리, 이메일 템플릿. POST https://api.supabase.com/v1/projects/{ref}/database/query 헤더 User-Agent 필수. 만료 1주 전(2026-05-28) 새 토큰 발급 알림. 이전 만료 토큰(sbp_0055..., sbp_b947...) 폐기 권장. **🔋 메모리 충전 상태 — 운영 진입 시 제거 (헌법 11조).**

---

## 메모리 7 — Resend (Email Routing + Brand From Name)

[Resend / 충전] Key: [REDACTED-RESEND-KEY]. **브랜드**: 회사='여행능력자들/TravelWinners'(B2C 얼굴, 유튜브+사이트). B2B 서비스='gohotelwinners'(호텔영업 전용, 8채널 활용). Routing: noreply@(B2B 서비스), ops@(B2B 운영→dgmasters01), info@(문의→dgmasters01), pay@(→dgmasters01). **From Name (2026-05-09)**: B2B ops='TW B2B Ops <ops@>', B2B 서비스='gohotelwinners <noreply@>'. **B2B 영역에서 "여행능력자들" 단독 표기 금지** — B2B는 gohotelwinners 브랜드. 8채널 중 1개 호명 시만 "여행능력자들 채널" 가능. B2C(유튜브/사이트)에서는 "여행능력자들" 정상 사용. Reply-To=info@. 🔋 운영진입시 토큰제거.

---

## 메모리 8 — Vercel 운영 원칙 + Token

[Vercel 운영 원칙 + 토큰 - 2026-05-09 갱신] **절대 원칙**: 대표님은 모든 Vercel 프로젝트를 개인 계정 dgmasters01-9797 (Hobby) 안에서 각각 독립 운영. 팀 X, 프로젝트끼리 토큰/환경변수 섞지 않음. **API 호출 시 teamId 파라미터 사용 절대 금지** (Hobby user.defaultTeamId는 가상 ID, 실제 팀 아님). TW B2B Token: [REDACTED-VERCEL-TOKEN] (Full Account, No Expiration, GitHub Secrets VERCEL_TOKEN 등록). Project: tw-b2b (prj_KPfzLZaDSaEv6mBdyp3bIpDlPAjY). 🔋 운영 진입 시 토큰 제거.

---

## 메모리 9 — Cloudflare + GitHub PAT

[Cloudflare API Token / 헌법 11조 충전 단계] TW B2B DNS: [REDACTED-CLOUDFLARE-TOKEN]. 권한: Zone DNS Edit on gohotelwinners.com only. **+ GitHub PAT (workflow 스코프 포함, 2026-05-03 발급): [REDACTED-GITHUB-PAT] (account: dgmasters01, repo + .github/workflows/ push 용도). 매 채팅마다 대표님 붙여넣기로 충전 — gohotelwinners.com 정식 오픈 전까지 유효.** 🔋 두 토큰 모두 충전 상태 — 운영 진입 시 제거 (헌법 11조).

---

## 메모리 10 — Supabase 자동 적용 워크플로

[TW B2B Supabase 자동 적용 워크플로] Supabase SQL은 Management API Token으로 자동 실행하는 것이 표준. POST https://api.supabase.com/v1/projects/{ref}/database/query, Authorization: Bearer {token}, body: {"query":"..."}. 헤더에 User-Agent 필수(Cloudflare 1010 방지). 대표님께 SQL Editor 붙여넣기 요청 금지. SQL 작성 → 검증 → API 자동 실행 → 검증쿼리로 결과 확인 → 결과 보고. hotels.id는 UUID, admins.email은 text, bookings.id는 UUID — FK 작성 시 타입 일치 확인.

---

**아카이브 시각:** 2026-05-27 KST  
**원본 메모리 위치:** 압축 전 메모리 4, 6, 7, 8, 9, 10  
**토큰 실값:** Claude 메모리(M3)에 충전 상태로 보관 — 운영 진입 시 제거
