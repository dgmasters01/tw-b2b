# 다음 작업 인계 (가벼움 — 의무 헤더 prepend 금지)

일호기/여행능력자들. 한국어, "대표님" 호칭.

## 첫 행동
`_os/boot.md` **1개**만 fetch → 헌법 자가검증. (2026-05-30 출발선 경량화: 첫 fetch는 boot.md 1개.)

## 🔴 1순위 작업: BL-RENEWAL-WATCH (P1 · order 6 · 승인불필요 · pending)
제목: [재계약 관리 탭] D-30 임박 호텔 + 저성과 호텔(매출 $200 미만) 자동 추출.
대상: `_admin/admin.html` (tasks.json의 `/admin.html`은 낡은 경로 — 실제는 `_admin/admin.html`).

### ⚠️⚠️ 거대 파일 가드 (멈춤 사고 직접 원인, 2026-05-30 — 반드시 지킬 것)
`_admin/admin.html` = 6,231줄 / 1.32MB. **4701번 줄 1개가 약 100만 자(≈1MB) 인라인 데이터 덩어리.**
- ❌ 통째 다운로드/read 금지 (`download_file_content` 전체 · `cat` 전체 · `curl ... | head` 로 4701 포함 출력 · `grep -i renewal` 내용출력 → **4701줄이 renewal에 걸려 1MB 쏟아짐 → 응답 미완료로 끊김**).
- ✅ 읽는 법: 줄번호만 뽑고(`grep -niE '패턴' file | cut -d: -f1`) → `sed -n 'A,Bp' file` 또는 view 구간으로만.
- ✅ 미리 계산해 둔 안전 줄 위치:
  - 재계약 관련 코드/UI: **1311, 1355, 1356줄** (4701은 데이터라 제외).
  - Sales/매출 탭 구조: **280~617 구간 + 2564~2598 구간**.
  - **4701줄(거대 데이터)은 절대 출력 금지.** 수정 시 그 줄 SHA 보존 패턴(부칙) 사용.
- 일반 규칙: `_os/playbook/large-file-read.md` 참조.

## 🟢 직전 완료 (2026-05-30, BL-CONTEXT-STARTUP-DIET)
- 메모리 9줄→3줄(MS1 대표님/MS2 부팅/MS3 저장창구) 재압축. 전문은 `_os/memory-archive/2026-05-30-memory-rebloat.md`(a702535)에 보존.
- INDEX 진입순서 boot.md 1개로 경량화(a43bb3d). connector-policy.md 신설(0b78333).

## 환경
repo dgmasters01/tw-b2b(main). raw=bash curl 무인증. commit창구 POST gohotelwinners.com/api/ops/github-commit, header x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK, body{path,content,message}. content=plain text(base64 금지 D12). jq 없음→python3.
