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
