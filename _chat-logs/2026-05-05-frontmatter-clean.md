---
slug: 2026-05-05-frontmatter-clean
title: 활동 이력 사람용 탭 frontmatter 정제 + admin-gallery 로딩 단계 표시
date: 2026-05-05
commits: []
tasks: [UX-FRONTMATTER-CLEAN]
decisions: []
auto_migrated: true
---

## 🎯 한 줄 요약
활동 이력 사람용 탭 메타데이터 정제 + admin-gallery 로딩 단계 표시

## 📍 왜 발생했나
**선행**: BL-GALLERY-HOTFIX (작업 0ea3356)

## 🛠 어떻게 해결했나
사람용 탭 메타데이터 정제 / admin-gallery 로딩 늦은 느낌

## ✅ 결과
작업이 완료되었습니다 (✅ done).

## ⏱ 다음 결정 필요
없음

---

# 🔧 기술 상세 (개발자용)

# 2026-05-05 사람용 탭 정제 + 로딩 UX

**TASK**: UX-FRONTMATTER-CLEAN (신규)
**STATUS**: ✅ done
**선행**: BL-GALLERY-HOTFIX (commit 0ea3356)

## 대표님 2가지 지적

> "사람용 여기에 이걸 보여 주는게 맞나? 어떻게 이해 할수 있지."
> "수정된거 창은 열리는데 왜 이렇게 늦게 화면이 뜬다."

## 박은 fix

### ① 사람용 탭 frontmatter 정제

**원인**: `renderMarkdown(content)`이 frontmatter (`--- slug: ... ---` 블록)를 그냥 텍스트로 박아서 사람한테 노이즈로 보임.

**박은 것** (admin-status.html):
- `parseFrontmatter(md)` 함수 박음 — `---` 블록 분리, YAML 파싱 (key:value, [array])
- `renderFrontmatterBox(fm)` 함수 박음 — 메타데이터를 예쁜 박스로 변환:
  - 제목 / 날짜 / Task (분홍 태그) / Commit (분홍 태그) / 결정 (분홍 태그)
  - 깔끔한 grid 레이아웃 (60px 라벨 + 1fr 값)
- 사람용 탭 렌더 시 `body`만 `renderMarkdown`에 넘김

**검증**: 15/15 chat-log 파싱 OK (frontmatter 누락 0건)

### ② admin-gallery 로딩 늦은 느낌

**원인**: 직렬 인증 흐름:
```
1. Supabase JS CDN 로드 (~300ms)
2. shared.js 로드 (~100ms)
3. await getSession() Supabase 왕복 (~400ms)
4. await checkAdmin() RPC 왕복 (~400ms)
5. PAGES import (~100ms)
─── 총 1300ms+
```

페이지에는 "Loading... 권한 확인 중"만 표시 → 사용자에게 "멈춤" 느낌.

**박은 것** (admin-gallery.html):
- Progress bar 박음 (33% → 66% → 100%, aurora 그라데이션)
- 단계 표시: "⏳ 1/3 — Supabase 클라이언트 확인" → "2/3 권한 검증" → "3/3 데이터 로드"
- 안내 텍스트: "평균 1-2초 소요 (Supabase 인증 + 매니저 권한 검증)"

**임시 박음**: 진짜 속도 개선은 BL-ADMIN-AUTH-PERF로 박았음 (P1, 3h):
- Vercel Edge Middleware로 SSR 인증 게이트
- getSession + checkAdmin 병렬화
- sessionStorage 캐시 (10분 TTL)

→ 정식 오픈 전 박는 게 좋음, 모든 admin-* 페이지 영향.

## 변경 파일

- `_admin/admin-status.html` (+50줄: parseFrontmatter + renderFrontmatterBox + body 렌더링)
- `_admin/admin-gallery.html` (+15줄: Loading progress bar + setStep)
- `tasks.json` UX-FRONTMATTER-CLEAN done + BL-ADMIN-AUTH-PERF pending 박음
- `_chat-logs/2026-05-05-frontmatter-clean.md` 본 chat-log

## 자체 검증 (헌법 12조)

```
① JS 문법: admin-status 1 inline script + admin-gallery 1 module script 모두 OK
② parseFrontmatter 시뮬레이션: 15/15 chat-log 파싱 OK
③ 박은 fix 코드 검증: 8/8 통과
   ✅ parseFrontmatter / renderFrontmatterBox 함수 박힘
   ✅ 사람용 탭에서 호출 + body만 렌더링
   ✅ admin-gallery progress bar / setStep / 단계 표시 / 평균 시간 안내
```

## 보고 형식 (헌법 12조)

✅ **자체 검증 통과**: 3개 카테고리 (JS 문법 / 파싱 시뮬레이션 / 코드 박힘)
⚠️ **알려진 한계**:
- admin-gallery 진짜 속도 개선은 BL-ADMIN-AUTH-PERF (별도 task, P1) — 이번엔 UX 안내만
- frontmatter가 없는 chat-log도 안전 처리 (`{frontmatter: null}` 반환)

🎯 **대표님 검증 요청**:
1. 활동 이력 → 5/4 15:43 BL-STATUS-DASH commit 클릭 → 사람용 탭 → frontmatter가 **예쁜 메타 박스**로 보이는지
2. System Status 카드 → admin-gallery 이동 → Loading 화면에 **progress bar + "1/3 → 2/3 → 3/3"** 단계 표시 보이는지

## 헌법 적합성

- ✅ 헌법 12조 — 자체 검증 3개 카테고리 통과 후 인계
- ✅ 메모리 17번 (str_replace, wholesale rewrite 0건)
- ✅ admin.html 미접근
