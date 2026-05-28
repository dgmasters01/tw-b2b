# Decisions Index (Claude 검색용)

> **이 파일은 Claude가 검색·참조하는 압축 본입니다.**  
> 사람용 풀어쓰기는 `_business/decisions/YYYY-MM-DD-{주제}.md`

---

## 2026-05-28 결정 기록 누락 감지 봇 (1건, D16)

| ID | 결정 | 핵심 룰 | 사람용 문서 |
|----|------|--------|------------|
| D16 | 결정 2벌저장 누락 감지 봇 (BL-DECISIONS-AUDIT-BOT) | health_check_admin.mjs에 checkDecisionsSync() 통합 / 최근24h 결정신호 commit(D\\d+·AGR-·결정·정책·합의·[헌법변경]) 있는데 decisions-index.md+_business/decisions/ 미저장 → _health.json decisions_sync=red → admin-status 배너 자동표출 / D5 의지의존 룰을 봇으로 강제(2026-05-27 사고 재발방지) / 신규워크플로 안만듦(PAT workflow스코프 차단) / commit 00db903 | 2026-05-28-bl-decisions-audit-bot.md |

---

## 2026-05-27 base64 사고 + 새 룰 (7건, D9~D15)

| ID | 결정 | 핵심 룰 | 사람용 문서 |
|----|------|--------|------------|
| D9 | 헌법 16.2 자가 검사 3종 | 응답 전 자가 검증: ①초등학생(약어·기술용어·"→결과:") ②사업/시스템 이분법 ③단정금지(🟢🟡🔴 라벨) / 1개위반=재작성 | 2026-05-27.md#d9 |
| D10 | 채팅 종료 6단계 의무 | 끊김 4종 1개 도달=즉시발동: ①결정추출 ②2벌저장 ③admin-status갱신 ④컨텍스트블록(GitHub+채팅텍스트 둘다) ⑤미해결정리 ⑥5블록보고 / 누락=헌법위반 | 2026-05-27.md#d10 |
| D11 | 사업 합의 6건 (AGR-0017~0022) | 호텔/매니저/매출 정책 6건, business-agreements.json + 부칙20 5톱니 자동추적 | 2026-05-27.md#d11 |
| D12 | base64 절대 금지, plain text only ⚠️ | /api/ops/github-commit body.content는 무조건 raw text / base64 인코딩=사고(오늘 4파일 깨짐, 복구 dd9d4528·3836a614·c4dcfd63·54f8c2d7) | 2026-05-27.md#d12 |
| D13 | 매 commit 직후 라이브 검증 의무 | "200응답"=성공아님 / curl raw URL grep 15자+ / 라이브 URL 최종확인 / 보고="어디가서 뭐누르면 뭐보임"+스크린샷 | 2026-05-27.md#d13 |
| D14 | 채팅 분기 판단=100% 자율 | 끊김트리거 4종(응답15+/파일10+/단계완료/1500줄+) 측정후 단정 / "원하시는 대로" 표현 금지 | 2026-05-27.md#d14 |
| D15 | 활동 이력=채팅 인계 백업 단일 진실원 🆕 | GitHub 인계 메모 실패시 recent_chats로 100% 복구 가능 (오늘 증명) / 모든 결정·사고·룰을 채팅에 명시작성 의무 | 2026-05-27.md#d15 |

---

## 2026-05-26 시스템 재설계 1단계 (8건)

| ID | 결정 | 핵심 룰 | 사람용 문서 |
|----|------|--------|------------|
| D1 | github-commit 자동 저장 창구 | POST gohotelwinners.com/api/ops/github-commit, header x-ops-token, body{path,content,message,branch?}, 30/h | step1.md#d1 |
| D2 | _os/INDEX.md 진입 인덱스 | 새 채팅 = INDEX.md 우선 로드, 43줄 분기표, 단일 진실원 | step1.md#d2 |
| D3 | 응답 줄 수 카운트 | ≤10 즉시 / 11-30 분할선언 1편 / 31+ 분할계획만 응답 + wip저장 + 새채팅 | step1.md#d3 |
| D4 | work-in-progress 자동 저장 | 모든 작업 시작 = _os/work-in-progress/YYYY-MM-DD-HHMM-{주제}.md, 매 단계 갱신 | step1.md#d4 |
| D5 | 결정 2벌 자동 저장 | 사업/시스템/마케팅/전략 단어 → 사람용 _business/decisions/ + Claude용 _os/charter/decisions-index.md | step1.md#d5 |
| D6 | 채팅 종료 자동 정리 6단계 | ①결정추출 ②2벌저장 ③admin-status갱신 ④컨텍스트블록 ⑤미해결정리 ⑥5블록보고 / 끊김위험4종 1개도달=발동 | step1.md#d6 |
| D7 | 정석 자가 검증 5기준 | 장기안정/표준패턴/유지보수/단일진실/롤백안전 / 1개NO=폐기 / 편법(임시우회·수동·하드코딩)=자동탈락 | step1.md#d7 |
| D8 | 사업/시스템 이분법 | 🔴사업(돈/가격/정책/디자인/외부데이터)=물음OK / 🟢시스템(코드/위치/스택/DB/인증/인프라)=자율 / 검증질문 "대표님이 모를 가능성 0%?" / 부속: 번복금지·admin-status단일진실원·1차자가검증강제 | step1.md#d8 |

---

## 끊김 위험 객관 4종 (D6·D10·D14 공통 트리거)

- 응답 카운트 15+
- 파일 변경 10+
- 단계 완료 시점
- 응답 1500줄+

→ 1개 도달 = 즉시 "여기까지 commit 박고 새 채팅" 강제 + 자동 정리 6단계 발동

---

## 초등학생 검증 3종 (D9 ① / 전송 전 자가 점검)

1. 영어 약어 있음?
2. 기술용어 있음?
3. "→ 결과:" 한 줄 요약 없음?

→ 1개라도 위반 시 재작성. 어휘 변환: endpoint→자동 창구, 환경변수→암호 보관함, PAT→출입증, commit→영구 저장

---

## 자동 검증 봇 현황

| 봇 이름 | 트리거 | 상태 |
|---|---|---|
| auto_detect_task_status | commit 태그 → progress 갱신 | ✅ 작동 |
| verification-gap-bot | 사업 합의 5톱니 검증 | ✅ 작동 |
| decision-tracking-bot | business-agreements 변동 | ✅ 작동 |
| **decisions-audit-bot** | **D5 위반 감지 (결정-2벌저장 불일치)** | **🆕 신설 예정 (BL-DECISIONS-AUDIT-BOT)** |

---

## 누적 결정 현황

- 1단계 (2026-05-26): D1~D8 (8건)
- 2단계 (2026-05-27): D9~D15 (7건)
- **총 15건**

---

**갱신:** 2026-05-27 KST, Claude 자동 (commit b60a6ec 직후)  
**다음 추가 위치:** 이 파일 상단에 새 날짜 섹션 prepend
