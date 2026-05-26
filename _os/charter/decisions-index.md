# Decisions Index (Claude 검색용)

> **이 파일은 Claude가 검색·참조하는 압축 본입니다.**  
> 사람용 풀어쓰기는 `_business/decisions/YYYY-MM-DD-{주제}.md`

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

## 끊김 위험 객관 4종 (D6 발동 트리거)

- 응답 카운트 15+
- 파일 변경 10+
- 단계 완료 시점
- 응답 1500줄+

→ 1개 도달 = 즉시 "여기까지 commit 박고 새 채팅" 강제 + 자동 정리 6단계 발동

---

## 초등학생 검증 3종 (전송 전 자가 점검)

1. 영어 약어 있음?
2. 기술용어 있음?
3. "→ 결과:" 한 줄 요약 없음?

→ 1개라도 위반 시 재작성. 어휘 변환: endpoint→자동 창구, 환경변수→암호 보관함, PAT→출입증, commit→영구 저장

---

**갱신:** 2026-05-27 KST, Claude 자동  
**다음 추가 위치:** 이 파일 상단에 새 날짜 섹션 prepend
