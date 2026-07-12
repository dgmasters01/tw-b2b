# 2026-07-12 드라이브 자동읽기 — 폴더·서비스계정 등록

- **최상위 폴더**: `유튜브 업로드 자동화` / **폴더 ID**: `1wHwrtRIAtU-KRturNlgf-07B9jccdXBw`
- **링크**: https://drive.google.com/drive/folders/1wHwrtRIAtU-KRturNlgf-07B9jccdXBw
- **소유**: 1호기 (dgmasters01@gmail.com)
- **구조 확인(브라우저)**: 채널 3개 이름 정확 — 여행능력자들 (TW)·호텔이야 (HT)·호텔이곳 (HG). 하위(대기·완료·확인필요)는 연결 테스트 시 검증.

## 서비스 계정(로봇)
- **GCP 프로젝트**: `tw-personal-os` (프로젝트번호 924739215364) — YouTube API 등과 공유. 키(비밀)는 B2B(Vercel)에만 넣으므로 격리됨.
- **서비스 계정 이메일**: `drive-reader@tw-personal-os.iam.gserviceaccount.com`
- **JSON 키 파일**: `tw-personal-os-7c9f00d2da9f.json` (대표님 로컬 다운로드 폴더. git 커밋 금지·채팅 붙여넣기 금지).
- **폴더 공유 권한**: **편집자** (대표님 전송 완료). ⚠️ **뷰어 아님** — 로봇이 대기→완료·확인필요로 파일을 이동해야 하므로 쓰기 권한 필요.

## ⚠️ 방식 정정 (중요 · 지난 A안 폐기)
- **확정 방식 = 편집자·자동 이동.** 대표님이 대기 폴더에 원고만 넣으면, 로봇이 읽고 처리 후 완료/확인필요로 **자동 이동**한다.
- 지난 문서(2026-07-11 올리기설계 §2)의 "A안=읽기 전용, 서버가 파일 안 만듦" 표현은 이 자동 이동과 어긋나 **폐기**. 워처(BL-YT-DRIVE-WATCH)는 files.list(읽기)+files.update(부모 폴더 변경=이동) 권한으로 구현. 삭제는 안 함(이동만).

## 다음 단계 (BL-YT-DRIVE-WATCH)
1. ✅ 폴더 생성·최상위 ID 확보
2. ✅ 서비스 계정 생성 → 이메일·JSON 키 확보
3. ✅ 로봇을 최상위 폴더에 **편집자**로 공유
4. ⬜ **Vercel env 등록(대표님 직접)**: `GOOGLE_DRIVE_SA_KEY`(JSON 전체) + `DRIVE_WATCH_FOLDERS`(폴더 ID)
5. ⬜ 자동 읽기+이동 배치 + cron(06·11·16·21시 KST) 제작 → drive-status connected:true 자동 전환

## Vercel env 형식 (4단계)
- `DRIVE_WATCH_FOLDERS` = `{"root":"1wHwrtRIAtU-KRturNlgf-07B9jccdXBw"}` (하위는 이름으로 탐색)
- `GOOGLE_DRIVE_SA_KEY` = 서비스 계정 JSON 전체(비밀). 대표님이 Vercel Settings→Environment Variables 에 직접 붙여넣기.
