# 인계서 — 드라이브 연결 완료 + 스튜디오 올리기 재구조 완료

**작성**: 2026-07-12 (드라이브 자동읽기 연결 + 올리기 설계 §3·§4·§5 전면 반영 세션)
**다음 채팅 첫 fetch = boot.md → 이 파일.**

---

## ✅ 드라이브 자동 읽기 — 대표님 세팅 전부 완료·라이브 연결됨
- 폴더(최상위 `유튜브 업로드 자동화` ID `1wHwrtRIAtU-KRturNlgf-07B9jccdXBw`, 채널3×대기/완료/확인필요) 생성.
- 서비스계정 `drive-reader@tw-personal-os.iam.gserviceaccount.com` 생성·JSON 키 발급·최상위 폴더에 **편집자**로 공유.
- Vercel env `GOOGLE_DRIVE_SA_KEY`·`DRIVE_WATCH_FOLDERS`(`{"root":"1wHwrtRIAtU-..."}`) 등록·재배포.
- **`/api/drive-status` connected:true 확인**, 스튜디오 올리기 뱃지 "연결됨" 라이브 검증.
- **배치 처리 규칙 확정**(`_business/decisions/2026-07-12-drive-folder-registered.md`): 정상→리스트+완료 이동 / 문제→확인필요 이동, 대기는 처리 후 항상 비워짐. 폴더 이동=리스트 등록 기준(발행 무관). 로봇은 이동만, 삭제 안 함.
- **남은 유일 작업(Claude 몫) = BL-YT-DRIVE-WATCH 배치**: 하루 4번(06·11·16·21 KST) cron으로 대기 폴더 읽어 파싱→publications(source='drive')→완료/확인필요 이동. env·키·폴더·권한 준비 끝, 순수 제작만 남음.

## ✅ 스튜디오 "올리기" 재구조 완료 — 확정 설계 §3·§4·§5 전면 반영 (대표님 지적 반영)
지난 설계의 미반영분을 4단계로 전부 적용·검증. **studio.html 커밋 다수(최종 4a38abe 등).**

**Phase1·2 리스트/발행카드 (라이브 검증)**
- **컴팩트 리스트 + 펼침**: 많아져도 접혀 보임(클릭 시 발행카드 펼침). 옛 "전부 펼친 나열" 폐기.
- **보기 3종**: 전체 / 내 작업 / 미지정.
- **필터 드롭다운**: 채널 / 담당자(관리자만) / 언어.
- **행 표기**: 채널 뱃지 + 언어 + 출처(자동/수동·올린이) + 상태.
- **상태 3종**: 대기 / 맡음(누구·N일째, 3일↑ "방치" 빨강) / 발행됨.
- **발행카드(§4)**: 맡기 전 복사·발행 **잠금** → 맡으면 열림. 복사 4개+번호(①제목 ②설명란(챕터·해시태그·링크 포함) ③태그(N/500자) ④파일명). 발행 후 **주소 수정** 버튼.
- 검증: 맡기→4복사·태그 433/500 노출→놓기→대기 복구까지 라이브 확인.

**Phase3 중복 방지 (백엔드 API 검증)**
- publications: `is_duplicate` 컬럼. POST 같은 파일명 → **409 duplicate 경고**(force 없음). 프론트 **모달**: 취소 / 다시읽기(force='overwrite'=덮어씀) / 그래도추가(force='duplicate'=중복행 생성).
- 중복행 목록에 **"중복" 딱지**, **삭제=대표님(admin) 전용** 버튼(editor엔 숨김). `DELETE /api/publications`(admin only, 발행건 삭제 금지).
- ops-token에도 isAdmin 부여(관리 일관성). 검증: 409→force=duplicate 생성(action=duplicated)→DELETE 200→정리(중복 0).

**Phase4 페이지 갤러리 동기화**
- `scripts/pages-meta.mjs`에 `/studio.html`(스튜디오 6메뉴) 등록 → admin-gallery.html에 "스튜디오 (콘텐츠 6메뉴)" 카드 노출 확인. 썸네일은 다음 capture-pages(푸시 시 자동)에 채워짐.
- **원칙**: 신규 페이지는 pages-meta.mjs 등록 = 갤러리 동기화.

## 🟢 스튜디오 6메뉴 최종 (studio.html)
올리기(§3·§4·§5 반영·드라이브 연결) / 성과표 / 호텔 / 키워드(→전략 큐 담기) / 전략(기획 큐 4단계) / 채널 — **6/6 라이브, 수수료 비노출 유지.**

## 🔑 인프라
- 커밋 `POST /api/ops/github-commit` x-ops-token `{path,content,message}` 30/h. DB `POST /api/ops/db-query` 60/h(DDL 허용).
- publications 신컬럼: source·uploaded_by_email·is_duplicate. 신규 테이블 content_queue. 신규 API drive-status·content-queue. publications DELETE(admin).

---

## ⚠️ 정정 (2026-07-12 후반) — 전략 메뉴 확정본(D-066) 대조·수정, 방향 판 미착수
**대표님 지적**: 전략 메뉴가 확정본과 다름("아이디어" 없었음·단계 틀림·내용 확인 안 하고 기억으로 만듦). 정확한 지적. D-066 전문 재정독 후 수정.

### 내가 틀렸던 것 → 수정 완료 (API 검증)
- 단계 **아이디어/기획/제작중/완료 → 기획대기(planning)/원고작성(writing)/발행예정(scheduled)/발행완료(published)** 로 정정.
- **"직접 아이디어 추가" 폐기**(D-066: 입구는 데이터 기반 전략/키워드만). 프론트 추가폼·버튼 제거, 백엔드 source 없으면 거부.
- **고유코드 TW-XXXX**(채널별 연번, content_queue.code UNIQUE) 신설 — 검증 HG-0001→HG-0002.
- **카드 필드 확정본대로**: 주제·코드·나라·도시·성급·타겟·목표월·우선순위·기획자(planner)·원고담당(writer)·출처(strategy/keyword/manuscript). content_queue 컬럼 추가(code·star·target·target_month·priority·planner_email·source).
- **두 역할**: 기획자=만든 사람 자동 / 원고담당=배정. **담당 권한 분기**: 에디터=[내가 맡기]만 / 관리자=[담당 지정]도. **미지정=노랑** 강조.
- **출처 배지**·[분석 다시보기](키워드 점프)·우선순위 변경 추가. 키워드 버튼 "이걸로 만들기"(source=keyword·기획자 자동).
- 커밋: content-queue.js f8395d6 / studio.html d415e0e. 스키마 개조(4상태 CHECK·신컬럼) DB 반영.

### ⬜ 아직 안 만든 것 (D-066 남은 층)
- **방향 판(위층)**: 타겟(언어)별·키워드 3달앞 자동 제안·[확정/보류/확정취소]·단위 나라+성급·**1년 뷰**(가까운 3~4달 크게+연간 미리보기). = 칸반 위에 얹히는 별도 큰 층. 키워드 자동제안 엔진에 의존 → 다음 focused 작업.
- **원고-코드 매칭 자동 흐름**(드라이브 완료+코드→발행예정 자동): 드라이브 워처(BL-YT-DRIVE-WATCH)와 함께.
- **카드 상세 모달**([키워드 분석 다시보기]는 현재 키워드 메뉴 점프로 임시)·화면넘침 필터/정렬 UI(현재 우선순위 정렬만).

### 올리기 보강
- 컴팩트 행에 **등록일(created_at)** 표시 추가(대표님 "언제 만들어졌는지" 지적). 채널은 이미 드롭다운 필터라 가로 확장 문제 해결됨(D-060: 가로 나열 금지).

## ⬜ 남은 큰 작업 2개
1. **드라이브 자동 배치(BL-YT-DRIVE-WATCH)** — 연결 완료, 배치 제작만.
2. **전략 방향 판(위층)** — D-066 남은 층.

## 🔴 세션 주의
장시간 세션 시 studio 로그인 토큰 만료 → 재로그인 필요(코드 문제 아님). API는 ops-token으로 검증됨.
