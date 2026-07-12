# 인계서 — 스튜디오 6메뉴 완료 (올리기 드라이브 UI + 전략 큐)

**작성**: 2026-07-12 (올리기 드라이브 UI · 전략 콘텐츠 기획 큐 세션)
**다음 채팅 첫 fetch = boot.md → 이 파일.**

---

## 🚦 이번 세션 결과 = 스튜디오 6메뉴 전부 라이브 완료
남아 있던 2개(올리기 드라이브 입력 UI · 전략 메뉴)를 마무리했다. **studio.html 6메뉴(올리기·성과표·호텔·키워드·전략·채널) 모두 실구현·라이브.**

---

## ✅ 작업1 완료 — 올리기 "구글 드라이브 자동 읽기" 화면 (D-060 설계 §2·§3)
- **범위**: 화면·개발까지. 실제 자동 읽기 배치(BL-YT-DRIVE-WATCH)는 대표님이 폴더+서비스계정 키 넣는 마지막 단계라 **미착수**(의도).
- **신규 창구 `api/drive-status.js`(커밋 bf12e9f)**: 드라이브 연결 상태를 **정직하게** 보고. env `GOOGLE_DRIVE_SA_KEY`(또는 DRIVE_SA_KEY) + `DRIVE_WATCH_FOLDERS`(또는 DRIVE_FOLDERS) 둘 다 있어야 `connected:true`. 지금은 둘 다 없어 **connected:false**(정상). 대표님이 나중에 넣으면 화면이 자동으로 "연결됨"으로 바뀜.
  - 다음 확인 시각 서버 산출: KST 06·11·16·21시 중 다음 시각(`next_check.label` 예 "16:00"·`iso`). 라이브 검증 시 KST 19시대→"21:00" 정확.
  - 연결 0단계 3스텝(①폴더 만들기 ②서비스계정 키 등록 ③연결 확인)·채널3 대기/완료/확인필요 폴더 안내 포함.
- **올리기 화면(studio.html, 커밋 d2a3d74)**: 원고 넣기 카드 아래 "구글 드라이브 자동 읽기" 카드 신설 — 연결 뱃지(연결됨 초록/연결 전 회색)·⏰다음 확인 시각·3스텝 체크리스트(✅/⬜·대표님/자동 딱지)·폴더 트리 안내. `loadDrive()`가 페이지 로드 시 1회 호출.
- **출처 자동/수동 구분(§3)**: publications에 컬럼 2개 추가(`source` text default 'manual', `uploaded_by_email` text). `api/publications.js`(커밋 9abe7bb) POST INSERT 시 `source`(drive/manual)·`uploaded_by_email`(세션 이메일) 기록. 원고 카드에 "출처 · 수동 · ○○ 올림" / "출처 · 자동 · 드라이브" 딱지. 드라이브 워처 붙으면 source='drive'로 넣도록 body.source 이미 수용.
- **라이브 검증**: `GET /api/drive-status`(ops-token) → ok/connected:false/steps3/folders3/next_check "21:00" 정상. studio.html 배포 완료·문법 통과.
- **남은 대표님 몫(후속 BL-YT-DRIVE-WATCH)**: ①드라이브에 채널3×폴더3 만들기 ②읽기전용 서비스계정 키를 env(GOOGLE_DRIVE_SA_KEY)+폴더맵(DRIVE_WATCH_FOLDERS)에 등록 → 그 뒤 자동 읽기 배치(cron 06·11·16·21시) 제작하면 끝. 화면은 그날 손 안 대도 자동으로 켜짐.

## ✅ 작업2 완료 — 전략 "콘텐츠 기획 큐" (D-060 6메뉴 마지막)
- **신규 테이블 `content_queue`(RLS on·정책없음=API 서비스롤만)**: id·stage(idea/plan/making/done·CHECK)·kind(city/hotel/free)·title·city·country·hid·hotel_name·channel_code·bookings_done·note·assignee_email·created_by_email·sort_order·created_at·updated_at.
- **신규 창구 `api/content-queue.js`(커밋 fe21711)**: GET(목록)·POST(아이디어로 담기)·PATCH(단계이동·메모·담당·제목)·DELETE(**대표님 전용**, is_admin). editor 세션에서 이메일 확인해 created_by/assignee 남김. 수수료 안 봄 — 지표는 확정예약 건수뿐.
- **전략 화면(studio.html, 커밋 bc2c0c6)**: 준비중 자리를 4열 칸반 보드로 교체(아이디어 회색·기획 파랑·제작중 주황·완료 초록). 카드=제목+맥락칩(도시/호텔/확정예약 건수/채널)+메모+담당. 원클릭 단계이동(← / 다음→), 메모(prompt), 맡기/놓기(assignee=나), 삭제(대표님만 🗑). [＋아이디어 추가] 직접 담기 폼.
- **키워드 → 큐 연결**: 키워드 메뉴 도시·호텔 카드마다 [＋이거 만들자] 버튼 → content_queue에 아이디어로 적재(도시=제목"○○ 호텔 TOP3", 호텔=호텔명). 담기면 "✓ 전략 큐에 담김".
- **라이브 검증(ops-token, production)**: POST 생성(idea)→GET 목록1→PATCH idea→plan→잘못된 stage 거부→DELETE→목록0. 전 과정 정상. 테이블 현재 0건(검증 데이터 정리 완료).

## 🖥️ 남은 검증(선택) — 브라우저 육안
API·배포·문법은 검증 완료. 에디터 로그인 화면(연결됨/큐 카드 실렌더)의 육안 확인은 대표님 로그인 세션 필요. 연결된 브라우저(Browser 1)로 훑을 수 있음 — 필요 시 다음 세션에서.

## 🟢 스튜디오 6메뉴 최종 상태 (BL-STUDIO-MENU-6TAB · studio.html)
- **올리기** ✅ 원고 파싱·publications·발행 + **드라이브 자동읽기 UI(이번 세션)** + 출처 딱지
- **성과표** ✅ D-060 (v_channel_stats·영상수·영상별 호텔, 수수료 제외)
- **호텔** ✅ D-062 (v_content_hotel_stats, 노출·순위·확정/취소)
- **키워드** ✅ D-060 (예약 많은데 영상 없는 도시·호텔 추천) + **[이거 만들자]→전략 큐(이번 세션)**
- **전략** ✅ **완료(이번 세션)** — 콘텐츠 기획 큐 4단계
- **채널** ✅ D-064 (채널/CID 마스터·.md 등록·수정)
→ **6/6 라이브. 스튜디오 수수료 비노출 원칙 전 메뉴 유지.**

## 📌 후속 후보 (대표님 방향 결정 필요·자동 착수 금지)
- **BL-YT-DRIVE-WATCH**: 드라이브 자동 읽기 실배치(위 작업1 남은 대표님 몫 + cron). 폴더·키 준비되면 착수.
- **조회수/클릭(D-059)**: 발행 영상 생기면 수집기(BL-YT-VIEWS-COLLECT)+cron. 저장처(videos 테이블 컬럼) 준비됨.
- **성과표 채널명 단일화(D-063)**: 성과표는 뷰가 channels 조인이라 이미 자동. 단독 booking-analytics.html(anon)만 미적용(실익 낮음).
- **호텔 상세 유료계약 카드(단계4·D-062 후속)**: 아고다↔hotels 매칭(agoda_hotel_id) 선결 필요. 데이터 선결 보류 유지.

## 🔑 인프라
- 커밋: `POST gohotelwinners.com/api/ops/github-commit` x-ops-token `{path,content,message}` (plain text). 30/h.
- DB: `POST /api/ops/db-query` x-ops-token `{query}`. 60/h. DDL/DML 허용(파괴적 DROP만 차단).
- 새 테이블 `content_queue` / 새 API `api/content-queue.js`·`api/drive-status.js` / publications 신컬럼 `source`·`uploaded_by_email`.
