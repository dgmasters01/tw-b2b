# 인계서 — 스튜디오 채널 메뉴 (BL-STUDIO-MENU-6TAB) — 단계 5부터 이어가기

**작성**: 2026-07-12 (채널 메뉴 조회·정리·편집 완료 세션 종료)
**이전 인계서**: `_os/handoff/archive/2026-07-03-main-redesign.md`(메인 재설계 — 별개 작업, 보류)
**다음 채팅 첫 fetch = boot.md 1개 → 이 파일.**

---

## 🚦 다음 채팅 첫 행동
1. `_os/boot.md` fetch (라이브)
2. 이 파일 (인계서)
3. **결정 문서 fetch**: `_business/decisions/2026-07-11-studio-channel-menu.md` (D-064, 구현 로그·안전원칙 포함) + `_os/charter/decisions-index.md` D-064
4. **라이브 상태 확인**: `/api/channels`(ops-token) 로 현재 채널 8개 확인, `studio.html` 라이브
5. **첫 과제 = 단계 5** (아래)

## 📊 진행 상황 (BL-STUDIO-MENU-6TAB · 4/11 = 36%)
- ✅ 1 6메뉴 셸(상단 탭) + 올리기 기존기능 보존
- ✅ 2 채널 조회 (api/channels.js GET + studio 채널 카드)
- ✅ 3 채널 데이터 정리 (호텔닷컴 삭제·2025 매출순 정렬·이름 실명화)
- ✅ 4 채널 편집 (api PATCH + studio [수정] UI, admin 전용·code 변경금지)
- ⬜ **5 CID 편집 + 새 채널 등록 ← 다음 착수**
- ⬜ 6 youtube-rules.js DB 개조 (⚠️ 라이브 원고생성 파이프라인 위험작업 — 신중히)
- ⬜ 7 올리기 완성(D-060) / 8 성과표(D-063) / 9 호텔(D-062) / 10 키워드(D-065) / 11 전략(D-066)

## 🎯 단계 5 상세 (CID 편집 + 새 채널 등록)
- **CID 편집**: `channel_cid_map` 에 CID 추가/폐기(is_active)·라벨(old/new). api/channels.js 에 CID용 POST/PATCH/DELETE 추가(admin 전용, 두겹방어). studio 채널 카드 CID 영역에 편집 UI.
- **새 채널 등록**: `channels` INSERT (code·name·language·display_order). api POST. studio 에 [새 채널] 버튼(admin). code 는 새로 부여(예약 연결 열쇠, 기존과 중복 금지).
- 권한: owner/admin 만 (D-064). 에디터 조회만.

## 🔑 인프라 (변하지 않는 사실)
- **DB 실행 창구**: `POST gohotelwinners.com/api/ops/db-query`, header `x-ops-token`, body `{query}`. SQL 직접 실행(멱등 권장). 한도 60/h.
- **파일 저장 창구**: `POST /api/ops/github-commit`, `{path,content,message}`(plain text).
- **채널 API**: `api/channels.js` — GET(조회, is_editor+)·PATCH(수정, admin). CID·POST 는 단계5서 추가.
- **현재 채널 8개**(매출순): 1.호텔이야(HT) 2.여행능력자들(TW) 3.ホテルだ(JP) 4.世界就是家(ZH) 5.Koreahotelguide(KT) 6.reviewkhachsan(VN) 7.호텔이곳(HG) + legacy(비활성).
- **CID 확정값**: TW 1913282·1919025 / HT 1932026 / HG 1946819 (외 old/new 다수).
- **KT(Koreahotelguide)**: 대표님이 향후 타겟 확장 시 이름 변경 예정(code=KT 유지→데이터 그대로).

## ⚠️ 주의
- **핵심 원칙**: channels 의 열쇠는 `code`. 예약·CID·발행 전부 channel_code 연결. 이름 바꿔도 code 유지하면 데이터 안 꼬임(증명 완료).
- 단계 6(youtube-rules.js)은 규격 문서(`_content/youtube/*.md`)가 3채널만 존재하는 선결과제 있음. 신중히.
- **작업 전 사전 체크(트리거0)**: 새 창에서도 응답15·파일수정10 근접 시 무리 말고 마무리·인계 후 새 창.
