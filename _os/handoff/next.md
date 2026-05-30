# 다음 작업 인계 (가벼움 — 의무 헤더 prepend 금지)

일호기/여행능력자들. 한국어, "대표님" 호칭.

## 첫 행동
`_os/boot.md` **1개**만 fetch → 헌법 자가검증.

## 🟢 직전 완료 (2026-05-30, BL-RENEWAL-WATCH) — commit 8bf2e84
`_admin/admin.html`에 **재계약 관리 탭** 신설.
- 사이드바 Operations에 🔁 Renewals(data-tab="renewal") 버튼 추가.
- 탭 패널 `#tab-renewal`: 요약카드 3개 + 섹션1(D-30 임박) + 섹션2(저성과 <$200) + 새로고침.
- D-30 임박 = hotels.status='published' & created_at 후 150~180일(6개월·180일 보장 만료 30일 전). 만료 임박순 정렬, 매니저 연락처 표시.
- 저성과 = `GET /api/admin?action=past-video-revenue&tier=hide`(누적 매출 <$200) 재사용.
- JS: `window.initRenewalWatch` IIFE, setActiveTab lazy-load, node 문법검사 통과.
- 검증: 신규 마커 10건 라이브 확인. 거대라인 md5 9d69a7bd... 보존(원본=수정본 동일).

## 🔴 다음 1순위
**임의 추천 금지(헌법 부칙1).** admin-status.html `renderNextAction`(status=pending + taskRole=auto + priority 오름차순 + order 오름차순)이 자동 추천하는 작업을 따를 것. tasks.json에서 BL-RENEWAL-WATCH는 done 처리 필요(아직 미반영 시 status 갱신).

### ⚠️⚠️ 거대 파일 가드 (멈춤 사고 직접 원인 — 반드시 지킬 것)
`_admin/admin.html` = **6,487줄 / 1.67MB**. **🔴 4798번 줄 1개가 약 102만 자(≈1MB) 인라인 데이터 덩어리.** (이전 4701 → 편집으로 4798로 이동함.)
- ❌ 통째 다운로드/read 금지 (`download_file_content` 전체 · `cat` 전체 · 4798 포함 출력 · `grep -i` 내용출력 → **4798줄 1MB 쏟아짐 → 끊김**).
- ✅ 읽는 법: 줄번호만 뽑고(`grep -niE '패턴' file | cut -d: -f1`) → `sed -n 'A,Bp' file` 구간으로만.
- ✅ 거대라인 위치는 편집 시 또 밀린다. 수정 전 `awk '{print NR": "length($0)}' file | sort -t: -k2 -nr | head -1` 로 현재 번호 재확인할 것.
- ✅ 안전 줄 위치(2026-05-30 기준): 사이드바 305~336 / 탭 패널 388~759 / 탭 전환·인박스 1243~1400 / video-revenue JS 5148~5460 / renewal JS 5466~5621.
- 일반 규칙: `_os/playbook/large-file-read.md`.

## 환경
repo dgmasters01/tw-b2b(main). raw=bash curl 무인증. commit창구 POST gohotelwinners.com/api/ops/github-commit, header x-ops-token=sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK, body{path,content,message}. content=plain text(base64 금지 D12). 거대라인 escaping은 python json.dumps 사용. jq 없음→python3.
