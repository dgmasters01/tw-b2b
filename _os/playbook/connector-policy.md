# 작업별 커넥터(MCP) 정책 (BL-CONTEXT-STARTUP-DIET, 2026-05-30)

> 새 채팅 출발선을 가볍게 유지하기 위한 커넥터 ON/OFF 기준.
> 원칙: **기본은 커넥터 0개. 그 작업에 진짜 필요할 때만 켠다.**

## 1. TW B2B 코드 작업 = 커넥터 0개

- 파일 읽기 = `bash curl` 로 GitHub raw fetch (무인증, 즉시).
- 파일 쓰기 = commit 창구 (POST `gohotelwinners.com/api/ops/github-commit`).
- 이 두 개로 코드 작업 100% 가능. Gmail/Drive/Vercel 커넥터는 **끈다.**
- 이유: 커넥터를 켜면 도구 정의가 출발선에 깔려 새 채팅이 시작부터 무거워짐.

## 2. 작업별 ON 기준 (해당 작업 시에만)

| 작업 | 켜는 커넥터 | 안 켜도 되는 경우 |
|---|---|---|
| 코드 수정·배포·문서 | (없음) | 항상 — curl+commit창구로 충분 |
| 대표님 메일 확인·발송 | Gmail | 코드 작업 중엔 OFF |
| 구글 드라이브 문서 | Google Drive | 코드 작업 중엔 OFF |
| Vercel 배포 로그·도메인 | Vercel | 라이브 검증은 curl로도 가능 → 보통 OFF |

## 3. 메모리 부담과의 관계

- 메모리 = "누구 / 어디서 시작(boot.md) / 저장창구" 3줄만.
- 커넥터 = 작업별 토글.
- 둘 다 가벼우면 새 채팅이 빈 상태로 시작 → "대화가 너무 길어 계속 불가" 경고 사라짐.

_Maintained by: 클로드 (under direction of 이지형 대표님)_
