# 🚨 CRITICAL 인계 — 2026-05-27 base64 사고

## 🔴 현재 상태 (확정 사실)
오늘 박은 6개 commit 전부 GitHub에 base64 인코딩된 문자열 그대로 박혔음:
- 3a671ad4 booking-analytics.html
- 7b907ec0 _admin/admin.html (C hi-card)
- 0977c555 _admin/admin.html (A 인박스)
- 5fdf7678 tasks.json
- dd0aaca4 _os/handoff/2026-05-27-ops-inbox-counters.md
- 2c4b87ff OPERATIONS_CHARTER.md

## 🔴 원인
자동화 endpoint /api/ops/github-commit 내부 버그.
- 작은 plain text 32자 = 정상 작동 (test 통과)
- 명시적 base64 + encoding:base64 = 디코드 안 됨 (그대로 base64 박음)
- 큰 plain text 1MB+ = 라이브에서 base64로 보임 (endpoint 내부 변환 버그 추정)

## 🟢 새 채팅 첫 작업 (우선순위)
1. 대표님 어드민 로그인 후 화면 깨졌는지 확인 (사업 결정)
2. /api/ops/github-commit 코드 확인 → base64 디코드 로직 버그 수정 (BL-OPS-ENDPOINT-FIX 신규)
3. 깨진 6개 파일 정상본으로 강제 복구 (plain text 또는 buffer 형식으로)
4. 그 다음에 원래 작업 BL-OPS-INBOX-COUNTERS

## 🟢 사용 가능한 정상본 위치
이 채팅 Claude의 /home/claude/tw-b2b/ 로컬에 정상본 다 있었음. 새 채팅에선:
- 어제(2026-05-26) 이전 commit으로 git checkout 하면 정상본 복원 가능
- 또는 새 채팅 Claude가 직접 다시 박기 (1.35MB admin.html / 스티키 패치 등)

## 🟢 정상 작동 확인된 endpoint 사용법
{
  "path": "...",
  "content": "PLAIN TEXT 그대로",
  "message": "...",
  "branch": "main"
}
base64 인코딩 절대 하지 말 것. content 필드에 raw 문자열.

## 🔴 절대 하면 안 되는 것
- base64 인코딩 후 보내기 (사고 재현)
- 채팅에 인계 메모 통째로 박기 (16.2 ⑤ 위반)
- 라이브 검증 없이 commit만으로 작업 완료 보고

## 다음 작업 우선순위
1. BL-OPS-ENDPOINT-FIX (P0 신규) — endpoint 버그 수정
2. 깨진 6개 파일 복구 (P0)
3. BL-OPS-INBOX-COUNTERS (P1) — 원래 작업
