---
slug: 2026-05-08-bl-act-index-restore
title: BL-ACT-INDEX-RESTORE — 활동이력 봇/CEO 분류 + byDecision 매핑 본질 fix
date: 2026-05-08
commits: [67273d8, aa5dcd6, 2ec94a3, f1c06fa]
tasks: [BL-ACT-INDEX-RESTORE]
decisions: []
---

# BL-ACT-INDEX-RESTORE — 활동이력 인덱스 본질 결함 2종 fix

## 🎯 무엇을
직전 채팅 BL-ACT-KST-FIX 검증 중 발견한 두 가지 본질 결함을 한 작업으로 해결.

## 📍 왜 (결함 본질)
**결함 1 — activity-feed 봇 vs CEO 분류 실패:**
- `fromGitLog`가 author lower-case에 `scan-bot`/`sync-bot`/`claude` 3개만 검사
- `auto-detect-bot`, `activity-bot`, `health-bot`이 전부 CEO로 잘못 분류
- 결과: 인계서 "사람 활동 10건" 중 8~9건이 실제로는 봇 commit (노이즈 비율 80~90%)
- 새 채팅 Claude가 진짜 대표님 결정 commit 못 알아봄

**결함 2 — chat-logs/index.json byDecision 매핑 누락:**
- 활동이력 펼침에서 `D-018`, `D-017` 등 D-NNN 펼치면 "기록 못 찾음"
- 원인: index.json에 byCommit/byTask만 있고 byDecision 없음
- DECISIONS.md에 박힌 18개 D-NNN이 어떤 chat-log에도 매핑 안 됨

## 🛠 변경 내용
**1. `_os/scripts/build-activity-feed.mjs` — 봇 분류 패턴 확장 (commit 67273d8):**
- BOT_PATTERNS 5종 명시 (auto-detect/sync/scan/health/activity-bot)
- author + subject 양쪽 검사 — `[bot-name]` 태그 또는 author 패턴 어느 쪽이든 매치되면 봇
- Merge commit → role='Bot' (git auto-merge)
- Claude/클로드/자율 author → role='CEO' + by='👤 이지형 (CEO 결정 → Claude 실행)'

**2. `_os/scripts/build-chat-log-index.mjs` — byDecision 매핑 신설 (commit aa5dcd6):**
- frontmatter `decisions:` 배열에서 D-NNN 직접 매핑 (source='frontmatter')
- DECISIONS.md 자동 파싱 — 모든 D-NNN ID 추출
- commit subject `[D-NNN]` fallback — chat-log 명시 없어도 commit 통해 역추적 (source='commit-fallback')
- 그래도 못 찾으면 `slug: null, source: 'decisions.md'` → UI는 "DECISIONS.md 직접 보기" 안내

**3. `mockup-status.html` + `_admin/admin-status.html` — loadHumanTab 수정 (commit 2ec94a3):**
- action에서 `\bD-\d{3}\b` 패턴 추출 → byDecision lookup
- slug 있는 entry 우선 / 없으면 DECISIONS.md 직접 안내 박스 (chat-log 없는 D-NNN 케이스)

**4. tasks.json status=done + 4단계 100% (commit f1c06fa)**

## ✅ 검증 결과
**activity-feed 재빌드:**
- 총 324건 (CEO:90, Bot:234) — 정확 분리
- display.json CEO 활동 10건 = 100% 진짜 대표님 결정 commit (이전: 8~9건이 봇)

**chat-log index 재빌드:**
- count=28, byCommit=158, byTask=36, byDecision=18 (이전: 0)
- D-010~D-016: chat-log slug 매핑 (frontmatter)
- D-017, D-018: DECISIONS.md 직접 보기 안내 (chat-log 없음 케이스)

**원격 main 라이브 반영 확인:**
- f1c06fa, 2ec94a3, aa5dcd6, 67273d8 4개 commit GitHub API로 검증 완료
- push 직후 health-bot, auto-detect-bot, sync-bot 봇 파이프라인 즉시 가동 (정상)

## ⏱ 소요
- 약 1시간 (4 단계 × 1 commit, progress.steps + step:done:N 태그 부칙 7 100% 준수)

## 📝 후속 결함 (이 작업 검증 중 발견 — 별도 BL 필요)
**BL-CHATLOG-AUTO-GATE (신규 제안):**
이번 BL-ACT-INDEX-RESTORE 진행 중에 chat-log를 박지 않아서, 작업 완료 후
4개 commit 모두 byCommit 매핑 실패 → 활동이력 펼침에서 "기록 못 찾음" 박힘.
헌법에 "BL 작업 done 처리 시 chat-log 박는 의무" + auto-detect-bot 자동 검증 게이트 추가 필요.

## 🔗 관련
- 직전 BL-ACT-KST-FIX (commits aef5a27, 6f91491, cdcbf4c) — 본 작업의 출발점
- 후속 BL-CHATLOG-AUTO-GATE — 본 작업이 발견한 결함의 영구 차단
