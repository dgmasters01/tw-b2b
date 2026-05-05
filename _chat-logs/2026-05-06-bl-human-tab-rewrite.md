---
slug: 2026-05-06-bl-human-tab-rewrite
title: 사람용 탭을 사업가 시점 5블록 카드 UI로 재작성 (BL-HUMAN-TAB-REWRITE)
date: 2026-05-06
commits: []
tasks: [BL-HUMAN-TAB-REWRITE]
decisions: [D-014]
auto_migrated: false
---

## 🎯 한 줄 요약
관리자 화면의 작업 기록을 사업가가 5초 안에 파악할 수 있게 5블록 카드 UI로 재작성했습니다.

## 📍 왜 발생했나
대표님 지적: 사람용 탭이 너무 어려운 내용이라 commit, task ID, Phase 같은 개발자 용어가 그대로 노출되어 있었습니다. 사업가가 한눈에 파악하기 어려운 상태였습니다.

## 🛠 어떻게 해결했나
세 단계로 정석대로 박았습니다.
첫째, 작성 표준(CLAUDE.md 11조)을 헌법 수준으로 박아서 앞으로의 작업 기록은 자동으로 사업가 시점이 됩니다.
둘째, 관리자 화면에 5블록 자동 추출기와 18가지 용어 자동 변환 규칙을 추가했습니다.
셋째, 기존 19개 작업 기록을 일괄 보강 스크립트로 5블록 표준에 맞춰 변환했습니다.

## ✅ 결과
- 새로 작성하는 작업 기록: 표준 5블록(🎯📍🛠✅⏱)이 자동으로 카드 UI로 표시됩니다.
- 기존 작업 기록 19개: 자동 보강 + ℹ️ 안내 배지로 사업가 시점 요약 + 기술 상세 접기.
- 표준 미적용 미래 작업 기록: ⚠️ 배지 + 자동 용어 변환으로 가독성 유지.
- 보강 스크립트(`scripts/migrate-chatlogs-to-business-format.mjs`)는 idempotent하게 작동하여 같은 작업 반복 박힘이 없습니다.

## ⏱ 다음 결정 필요
없음. 다음 작업은 인계서 2순위인 매니저 대시보드 신규 제작(BL-MANAGER-DASH-001)으로 자동 이어집니다.

---

# 🔧 기술 상세 (개발자용)

## 변경 파일

1. **CLAUDE.md** — 11조 신설 (chat-log 작성 표준)
   - 11.1 의무 5블록 (🎯📍🛠✅⏱) 정의
   - 11.2 용어 변환 표 (18개 매핑)
   - 11.3 사람용 탭 자동 추출기와의 약속
   - 11.4 강제 규칙 — 다시 묻지 않기

2. **`_admin/admin-status.html`** — `loadHumanTab` 재작성
   - `extractBusinessSummary(body)` — 5블록 정규식 추출 (4개 이상 발견 시 hasAllBlocks=true)
   - `renderBusinessCard(summary)` — 색상 구분 5카드 UI (Aurora palette: indigo/amber/green/emerald/pink)
   - `renderTechDetailsCollapsed(techDetails)` — `<details>` 접기로 기술 상세 분리
   - `applyTermTranslation(text)` — 18개 용어 자동 변환 (정규식 + 단어 경계)
   - frontmatter 라벨 사업가화: Task→업무, Commit→작업

3. **`scripts/migrate-chatlogs-to-business-format.mjs`** — 신규
   - 19개 chat-log 일괄 보강 (이미 5블록 있으면 skip)
   - `auto_migrated: true` 플래그 자동 박음
   - `--dry-run` 옵션 지원

4. **`_chat-logs/*.md`** — 19개 일괄 보강
   - frontmatter 직후 5블록 삽입
   - 기존 본문은 `# 🔧 기술 상세 (개발자용)` 헤딩 아래로 이동
   - `auto_migrated: true` 플래그 추가

## 자체 검증 (헌법 12조 — 7항목)

1. ✅ JS 문법 — `node --check` 통과 (89,037 chars)
2. ✅ JSON 검증 — `_chat-logs/index.json` 파싱 OK
3. ⏳ Vercel deploy — push 후 자동 폴링 예정
4. ⏳ 라이브 페이지 fetch — push 후 점검 예정
5. ✅ 데이터 정확성 — 19/19 chat-log 모두 5블록 보유 + auto_migrated 플래그 확인
6. ✅ 시각 변경 자체 검증 — 19개 파일 전체 렌더 시뮬레이션 19/19 통과
7. ✅ boundary 케이스:
   - 빈 body → `hasAllBlocks=false` 안전 처리
   - null body → 안전 처리
   - 4블록만 있을 때 → 통과 (⏱는 "없음" 가능)
   - 5블록 모두 있을 때 → 카드 UI
   - 5블록 없을 때 (구버전 작성 가정) → ⚠️ 배지 + 자동 용어 변환
   - 자동 보강된 chat-log → ℹ️ 배지로 안내
   - 같은 항목 반복 펼침 → ACTIVITY_CACHE 캐시로 동일 결과

## 용어 변환 규칙 (18개)

| 원본 (영문/한글) | 변환 결과 |
|---|---|
| Vercel redeploy | 서버 재배포 |
| Vercel deploy | 서버 배포 |
| state: READY | 배포 완료 |
| HTTP 200 | 정상 응답(200) |
| commit hash | 작업 번호 |
| commit / commits | 작업 |
| task ID / tasks ID | 업무 번호 |
| task / tasks | 업무 |
| phase / phases | 단계 |
| frontmatter / frontmatters | 메타데이터 |
| boundary 케이스 / boundary case(s) | 예외 상황 |
| fallback / fallbacks | 대체 동작 |
| null-safe | 빈 값 보호 |
| RPC | 서버 호출 |
| router 통합 / 라우터 통합 | API 함수 통합 |
| chat-logs 인계 | 이전 작업 기록 인수인계 |
| chat-log / chat-logs | 작업 기록 |

## 5블록 추출 로직

```javascript
// 5개 헤딩 정규식, 4개 이상 발견 시 카드 UI 적용
const patterns = [
  { key: 'goal',     re: /^##\s*🎯[^\n]*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/m },
  { key: 'cause',    re: /^##\s*📍[^\n]*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/m },
  { key: 'solution', re: /^##\s*🛠[^\n]*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/m },
  { key: 'result',   re: /^##\s*✅[^\n]*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/m },
  { key: 'next',     re: /^##\s*⏱[^\n]*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/m },
];
```

## 디자인 (Aurora palette 5색)

- 🎯 한 줄 요약 → indigo (rgba(99,102,241,1))
- 📍 왜 발생했나 → amber (rgba(251,191,36,1))
- 🛠 어떻게 해결했나 → green (rgba(34,197,94,1))
- ✅ 결과 → emerald (rgba(16,185,129,1))
- ⏱ 다음 결정 필요 → pink (rgba(244,114,182,1))

각 카드는 `border-left: 3px solid` + `background: color10` 형태로 색 강조.

## 알려진 한계

- 자동 보강된 19개 chat-log의 5블록 내용은 frontmatter.title + 본문 정규식 추출에 의존하여 일부 어색할 수 있음. ℹ️ 배지로 사용자에게 안내함.
- 진정한 사업가 시점 요약은 chat-log 작성 시점에서만 정확함 → 11.4 강제 규칙으로 차단.
