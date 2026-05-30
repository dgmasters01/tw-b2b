# 다음 작업 인계 (가벼움 — 의무 헤더 prepend 금지)

일호기/여행능력자들. 한국어, "대표님" 호칭.

## 첫 행동
`_os/boot.md` **1개**만 fetch → 헌법 자가검증.
※2026-05-30 출발선 경량화 적용: 첫 fetch는 boot.md 1개. INDEX/CHARTER/CLAUDE는 깊이 필요할 때만.

## 🟢 직전 완료 (2026-05-30, BL-CONTEXT-STARTUP-DIET)
새 채팅 출발선 포화("한 줄만 붙여도 대화 너무 길다") 해소 작업.
- 메모리 9줄 → 3줄 재압축: MS1(대표님)·MS2(부팅=boot.md 1개)·MS3(저장창구).
- 압축 직전 9줄 전문 → `_os/memory-archive/2026-05-30-memory-rebloat.md` (commit a702535) — 완전 복구 가능.
- `_os/INDEX.md` 진입순서를 boot.md 1개 우선으로 정정 + 3줄 매핑 + 아카이브 링크 (commit a43bb3d).
- `_os/playbook/connector-policy.md` 신설: TW B2B 코드작업=커넥터 0개(curl+commit창구로 충분), 메일/Drive/Vercel은 해당 작업 시에만 ON (commit 0b78333).

## 🔴 1순위 작업: tasks.json 다음 BL 자동 선정
raw fetch → pending 중 priority·order 최소 자동 선정. **approval_required=true 제외**(예: BL-PRELAUNCH-CLEANUP 승인필요 → 자동 진행 금지).
조회: `curl -s https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/tasks.json | python3 -c "import sys,json; t=[x for x in json.load(sys.stdin)['tasks'] if x.get('status')=='pending' and not x.get('approval_required')]; t.sort(key=lambda x:(str(x.get('priority')),x.get('order',0))); print(json.dumps(t[:5],ensure_ascii=False,indent=2))"`
🟡 후보(검증 필요, 맹신 금지=부칙16): BL-REVENUE-DASHBOARD = booking-analytics.html 매출 차트. → tasks.json으로 실제 1순위 재확인 후 진행.

## 환경
repo dgmasters01/tw-b2b(main). raw=bash curl 무인증. commit창구 POST gohotelwinners.com/api/ops/github-commit, header x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK, body{path,content,message}. content=plain text(base64 금지 D12). jq 없음→python3.
