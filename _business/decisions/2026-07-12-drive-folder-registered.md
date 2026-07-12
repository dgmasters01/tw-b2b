# 2026-07-12 드라이브 자동읽기 — 최상위 폴더 등록

- **최상위 폴더**: `유튜브 업로드 자동화`
- **폴더 ID**: `1wHwrtRIAtU-KRturNlgf-07B9jccdXBw`
- **링크**: https://drive.google.com/drive/folders/1wHwrtRIAtU-KRturNlgf-07B9jccdXBw
- **소유**: 1호기 (dgmasters01@gmail.com)
- **확인(브라우저 육안)**: 최상위 안에 채널 3개 이름 정확 — 여행능력자들 (TW) · 호텔이야 (HT) · 호텔이곳 (HG). 하위(대기·완료·확인필요)는 연결 테스트 시 검증 예정.

## 다음 단계 (BL-YT-DRIVE-WATCH 준비)
1. ✅ 폴더 생성·최상위 ID 확보 (이 문서)
2. ⬜ 서비스 계정 생성(대표님, Google Cloud) → ①로봇 이메일 ②JSON 키
3. ⬜ 로봇 이메일을 최상위 폴더에 뷰어로 공유
4. ⬜ Vercel env 등록: `GOOGLE_DRIVE_SA_KEY`(JSON 키·대표님 직접) + `DRIVE_WATCH_FOLDERS`(폴더 ID 매핑)
5. ⬜ 자동 읽기 배치 + cron(06·11·16·21시 KST) 제작 → drive-status connected:true 자동 전환

## Vercel env 형식 메모 (4단계에서 사용)
- `DRIVE_WATCH_FOLDERS` = 최상위 폴더 ID 하나면 됨(하위는 이름으로 탐색). 예: `{"root":"1wHwrtRIAtU-KRturNlgf-07B9jccdXBw"}`
- `GOOGLE_DRIVE_SA_KEY` = 서비스 계정 JSON 전체(비밀·git 커밋 금지·대표님이 Vercel에 직접 붙여넣기)
