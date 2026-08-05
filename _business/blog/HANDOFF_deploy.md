# 블로그 서버분리·배포 — 세션 핸드오프 (2026-08-05)

## 대표님 지시
"staycurate 서버 분리하고 배포해줘" (FRAMEWORK 8기둥 중 8번 / 제작순서 8단계)

## 이 세션에서 재확인한 사실 (냉정하게)
1. ⛔ **이 채팅엔 Vercel 도구(쓰기)가 안 붙어 있다.** tool_search "vercel" → 0건. (붙은 도구: Higgsfield 웹빌더·Gmail·Drive·Chrome뿐)
2. ⛔ **커밋 창구(/api/ops/github-commit)는 REPO_OWNER/REPO_NAME이 dgmasters01/tw-b2b로 하드코딩.** GITHUB_PAT도 tw-b2b 한정(Contents R/W). → 이 창구로는 **새 레포 생성 불가**, tw-b2b에만 파일 쓰기 가능.
3. ✅ 결론: 별도 레포 생성 + 별도 Vercel 프로젝트 + staycurate.com 연결 + 배포 = **지금 도구/권한으로 실행 불가.** STATE.md가 미리 경고한 그대로.

## ⚠️ Higgsfield 웹빌더로 하면 안 됨 (아키텍처 위반)
- Higgsfield create_website는 Cloudflare Worker + <subdomain>.higgsfield 도메인 + React/TanStack.
- 우리 결정(D-B11/B14): Vercel Pro · 우리 레포 · staycurate.com · 정적. 서로 다름. + 3자 플랫폼 종속·크레딧 비용.
- → staycurate는 Higgsfield로 배포하지 않는다.

## 언블록 = 딱 둘 중 하나 (대표님 액션)
- (A) 이 채팅에서 **Vercel 커넥터/도구를 켜기**(도구 메뉴). 켜지면 Claude가 프로젝트 생성·도메인 연결·배포까지 한 번에.
- (B) 대표님이 GitHub에서 **빈 레포 1개만 생성**(예: dgmasters01/staycurate) + Vercel에서 Import → 그 뒤 Claude가 코드 푸시·도메인 연결.
- (새 레포 생성 PAT나 VERCEL_TOKEN이 ops 서버에 추가되면 완전 무인화 가능 — 별도 인프라 결정 필요)

## 준비 완료된 것
- 프리뷰(홈+글상세+메뉴3축, 반응형, 독립브랜드 staycurate, 민감키 0) = _business/blog/preview/staycurate/
- 전체 틀 정본 = _business/blog/FRAMEWORK.md
- 도메인 staycurate.com 구매완료(Cloudflare)
→ 도구만 붙으면 격리 배포는 1스텝.