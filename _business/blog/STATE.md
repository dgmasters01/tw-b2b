# TW 여행 블로그 — STATE (부팅 문서)

> 새 세션은 이 파일부터 읽는다. 상태는 여기와 GitHub에 있다. 메모리 의존 금지.
> 최종 갱신: 2026-08-05 (실사이트 소스 정본화·CID 확정 세션)

## 운영 원칙 (최상위)
1. 모든 제안은 상상·추측이 아니라 **자료를 검색·분석한 결과**로 낸다. (근거 없는 제안 금지)
2. 대표님은 **사업 방향·결정만** 한다. 개발·글쓰기·발행 실행은 Claude가 전담한다.
3. 순서: 자리 → 뼈대 → 손으로 한 편 → 자동화. (건너뛰지 않는다)

## 🔒 화면 구조 잠금 (최우선 · 2026-08-05 대표님 지시)
- 홈·메뉴·글상세 **구조는 이미 확정**이다 → **시각 정본 1순위 = `_business/blog/mockups/screens.html`**(확정 목업 4화면) · 보조 = ui-drafts.md · 근거 = D-B13·D-B15·D-B16.
- 🎨 **제네릭 AI 디자인 금지(D-B16).** 글로벌 서비스급 완성도. "AI로 찍어낸 기본 템플릿" 인상이 들면 실패. 구조는 screens.html 그대로, 시각 완성도(타이포·색·여백·디테일)는 한 단계 위로.
- 브랜드명/로고 = **staycurate**(독립브랜드 D-B14). 목업의 "여행자들" 로고는 구조 예시일 뿐 → 로고는 staycurate로.
- **화면을 만들기 전 반드시 `ui-drafts.md`를 읽고, 그 구조를 그대로 구현한다.**
- ⛔ **새 디자인·새 레이아웃·새 구조를 임의로 창작 금지.** 초안이라고 무시하고 새로 그리면 대표님 지시 위반.
- 확정 구조: 홈=퍼블리셔형(오늘의추천+카테고리 섹션 반복, 가로카드+더보기, in-feed 광고) / 메뉴 3축(여행지·주제별·가이드) / 글상세=동네 가이드 골격.

## 프로젝트 한 줄
공개 데이터(가격·평점·후기)를 **종합**하고 우리 실적 데이터(R코드·호텔DB)를 얹어 추천 콘텐츠를 만들고, R코드로 예약을 보내 커미션+애드센스로 수익화 → 카테고리별 도메인으로 복제하는 **데이터 종합형 추천 미디어**.

## 현재 단계
✅ **서버 분리 완료** — 별도 Vercel 프로젝트 `staycurate`(team_3jWCv2XBc0vzUB8PYsPTGtLB) 생성·배포(deploy_to_vercel, target=production). tw-b2b와 분리. 공개 URL=`staycurate-six.vercel.app`. · ✅ **staycurate.com 연결 완료(2026-08-05, 라이브 확인됨)** — Cloudflare DNS: A `@`→76.76.21.21(DNS전용), CNAME `www`→cname.vercel-dns.com(DNS전용). apex→www 308 리다이렉트. · ✅ 반응형(웹+모바일) 뼈대(홈+글상세+메뉴3축, 독립브랜드 staycurate). · ✅ 전체 틀 정본 `_business/blog/FRAMEWORK.md`. · ⚠️ 배포 방식=deploy_to_vercel 파일 직접 업로드(git 레포 없음). 정식 CI 원하면 별도 GitHub 레포+Vercel git 연동은 향후 과제. 현재 파일 원본=Claude 세션 로컬(정본화 필요).

## 확정된 방향 (요약 — 상세는 DECISIONS.md)
- 사업모델: 데이터 종합형 추천 미디어 + 어필리에이트 (Wirecutter/NerdWallet형)
- 보안: B2B(tw-b2b)와 **별도 프로젝트·별도 레포**로 격리. 블로그엔 민감키 0. R코드는 gohpik 링크만 재활용.
- 플랫폼: 자체 정적(Vercel Pro, 새 아이디·추가 월정액 없음). 멀티 엔진 1벌 + 도메인 N개.
- 수익: 아고다 제휴(주) + 애드센스(보조). 애드센스 명의는 용역구조 시 통제권·통장 모두 그 사람.
- 콘텐츠 방식: 여러 후기 **종합**(복제 아님) + 우리 데이터. 친근한 큐레이터 톤(거짓 1인칭 금지), 시각 중심, 텍스트 최소, 주변 맛집·명소+거리 포함.
- 구조: 나라 > 도시 > 포맷 3층. 도시 순서는 키워드 엔진이 **실예약**으로 결정.
- 도메인(D-B11·D-B14): 파일럿 이름 **staycurate.com** 확정(구매완료). **독립 브랜드 전략**(사이트끼리 '한 운영자'로 안 보이게 · footprint 분산 · 브랜드 연장안 폐기). 확장은 각자 구매·소유, 어근 분산. 키워드+브랜드형 .com.
- 발행: 지속가능한 질 우선. 반자동 생산 + 사람 검수. 소재 = 나라×도시×포맷 + 갱신.

## 다음 할 일 (FRAMEWORK 제작 순서 = 정석, 하나씩)
1. ✅ (완료) 전체 틀 · ✅ (완료) 서버 분리+staycurate.com 연결
2. **공통 뼈대(레이아웃 시스템)** 컴포넌트화 — 헤더·푸터·메뉴·색·글꼴 한 벌
3. **① 콘텐츠**: 카테고리 목록(아카이브) 페이지 → 검색 결과 페이지
4. **② 신뢰·법적**: 소개·연락처·편집/정정 정책·개인정보(쿠키·애드센스)·이용약관·제휴 고지
5. **③ 시스템·SEO**: robots·sitemap·rss·ads.txt·llms.txt·JSON-LD·OG·404
6. 읽기 편의(브레드크럼·목차·관련글·공유·뉴스레터·지도)
7. 측정(GA4·Search Console·성과 대시보드)
8. 배포 파일 정본화(별도 GitHub 레포+Vercel git 연동 검토)
9. 첫 글 1편 손 제작 → 표준 템플릿화

## 실사이트 소스 (정본) ⭐
- **경로: `_business/blog/site/staycurate/`** — 여기가 staycurate.com의 진짜 소스. 앞으로 수정은 여기서.
  - `index.html`(홈) · `best-osaka-hotels/`(베스트목록) · `osaka-hotel-budget/`(예산분해) · `kyoto/`(카테고리)
- 배포: Vercel 프로젝트 `staycurate` ← GitHub 연동 필요(Root Directory = 위 경로). 연동되면 커밋 시 자동 배포.
- ⚠️ `preview/staycurate/`는 확인용 임시본. 정본 아님. 실제 반영은 `site/staycurate/`에서.
- CID: **1972105**(D-B17) · 도메인 staycurate.com 연결 완료

## 문서 지도
- **콘텐츠 전략(정본): `_business/blog/CONTENT.md`** ← 포맷 돈순·내부구성·자동 파이프라인·복제
- 로고 확정 = A안(에디토리얼 세리프), 추후 재검토 (시안 PNG 산출물 보관)
- 미리보기(확인용): preview/staycurate/ 에 home·home-styled·category·article
- **전체 틀(정본): `_business/blog/FRAMEWORK.md`** ← 페이지 제작 전 필독
- 결정 전체: `_business/blog/DECISIONS.md`
- 미해결 과제: `_business/blog/GAPS.md`
- 재활용 자산: R코드(api/r.js) · 호텔DB(3,252) · 키워드엔진(api/content-keywords.js) · cid확정값 · 유튜브
