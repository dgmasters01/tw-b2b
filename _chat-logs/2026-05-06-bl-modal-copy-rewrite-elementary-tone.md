---
slug: 2026-05-06-bl-modal-copy-rewrite-elementary-tone
title: "BL-MODAL-COPY-REWRITE — 8개 결정 작업 풀어쓰기 (개발자 톤 → 초등학생 톤)"
date: 2026-05-06
tasks: [BL-MODAL-COPY-REWRITE]
phase: implementation
related_decisions: ["헌법 12조 (그림 일치)"]
rewrote_task_ids: [BL-003, BL-MANAGER-DASH-001, BL-004, BL-005, BL-007, BL-TRACK-001, BL-INVOICE-001, SQ-D]
---

## 🎯 한 줄 요약
어제 발견된 헌법 12조(그림 일치)에 맞춰, 결정 모달에 박혀있던 8개 작업의 `decision_context` / `decision_options` / `decision_recommendation`을 개발자 톤("Supabase Auth", "ACL 매핑", "Phase α")에서 초등학생 톤(상황 → 매니저가 무엇을 겪는지 → 사업이 어떻게 달라지는지)으로 풀어 다시 작성했습니다. 옵션마다 👍 좋은 점 / 👎 안 좋은 점 / 🎬 실제 시나리오 / 걸리는 시간을 박았습니다.

## 📍 왜 발생했나
어제(2026-05-06) BL-DECISION-MODAL-V2 라이브 검증 도중 대표님 통찰 12단계 중 2번:

> "초등학생도 읽게" — 옵션이 'Supabase Auth' 'ACL 매핑' 같은 개발자 톤

이 통찰이 누적되면서 헌법 12조(그림 일치)가 박혔고, 그 12조의 첫 번째 적용 작업이 이 작업입니다. 결정 모달은 대표님이 사업 결정을 내리는 화면인데, 그 화면 안에 개발자 단어가 박혀있으면 결정 자체가 불가능합니다.

## 🛠 어떻게 해결했나

### 1. 풀어쓰기 패턴 정의
모든 8개 작업에 동일한 구조 적용:

**decision_context (3단 구조)**:
```
[지금 무슨 상황이냐면]
... 매니저/대표님이 실제로 겪는 상황 ...

[왜 결정이 필요하냐면]
... 결정 안 하면 사업적으로 무엇이 막히는지 ...

[결정하면 뭐가 달라지냐면]
... 어느 결정에 따라 결과가 어떻게 갈리는지 ...
```

**decision_options (각 안마다 5요소)**:
```
**A안 — [한 줄 이름] (특징 태그)**
이게 뭐냐면: ... 매니저 시점 설명 ...
👍 좋은 점: ... 사업 가치 ...
👎 안 좋은 점: ... 리스크 ...
🎬 실제 시나리오: ... 매니저가 화면에서 겪는 흐름 ...
걸리는 시간: 약 N시간
```

**decision_recommendation (사업 언어)**:
```
추천: X안.
이유: ... 사업 맥락 ...
다른 안을 미루는 이유: ... 왜 지금은 아닌지 ...
```

### 2. 8개 작업 풀어쓰기 적용
| ID | 제목 | 추천안 |
|---|---|---|
| BL-003 | Agoda 예약 검증 시스템 | A안 (매니저 화면만 → 운영 후 B안 확장) |
| BL-MANAGER-DASH-001 | 매니저 대시보드 7영역 | C안 (평소 추정 + CSV 올리면 실집계) |
| BL-004 | 매니저 정보 변경 시스템 | D안 (B안 권한 분리 + 변경 이력) |
| BL-005 | 호텔 담당자 교체 시스템 | B안 (인수인계 UX 포함) |
| BL-007 | 자동 알림 메일 시스템 | B안 (핵심 변경만 알림) |
| BL-TRACK-001 | YouTube 클릭 카운트 | C안 (호텔/순위/영상 3축) |
| BL-INVOICE-001 | 인보이스 PDF 자동 생성 | D안 (결제 통화/매니저 국가 자동 분기) |
| SQ-D | sales.html 디자인 개편 | D안 (Aurora 자체 확장) |

### 3. tasks.json 메타 필드 추가
8개 작업 각각에:
- `copy_rewritten_at`: 재작성 시각 (ISO 8601 UTC)
- `copy_rewritten_by`: "BL-MODAL-COPY-REWRITE" (이력 추적)

### 4. BL-MODAL-COPY-REWRITE 자체 done 처리
- `status`: pending → done
- `completed_at` / `ceo_decision` / `ceo_decision_at` 박힘
- `outputs.rewrote_task_ids`: 8개 ID 배열로 기록

### 5. tasks.json stats 재계산
- `done`: 59 → 60 (이 작업 done 추가)
- `pending`: 24 → 23
- `autonomous_ready`: 8 → 18 (룰 정확화 — `pending + autonomous.can_run_alone=true`)
- `updated_at` 갱신

## ✅ 결과
- 8개 작업 모두 결정 모달에서 매니저/대표님 시점으로 즉시 읽힘
- 각 옵션마다 👍 좋은 점 / 👎 안 좋은 점 / 🎬 실제 시나리오까지 풀로 보여서, 대표님이 "그래서 이게 무슨 차이인데?" 추가 질문 없이 결정 가능
- 추천안 + 다른 안 미루는 이유까지 박혀있어, 결정의 시간적 우선순위(지금 vs 나중)도 한 화면에 보임

## ⏱ 다음 단계
헌법 13조(순서 정리 자동화)에 따라 BL-MODAL-COPY-REWRITE done 처리 → 자동 다음 작업으로 진행. 시스템 완성도 의존성 순서 기준으로 다음은 BL-DECISION-MODAL-V2-PHASE-B (좌우 분할 + 그림 맞추기 시작 버튼).

## 자체 검증 (헌법 12조)
- ✅ JSON valid (`python3 -m json.tool` 통과)
- ✅ 8개 작업 모두 `decision_context` 변경 확인 (diff 검증)
- ✅ 각 작업 `decision_options.length == 4` 유지
- ✅ 분량 일관성: context 약 450자 / options 약 1200자 / recommend 약 400자
- ✅ 파일 크기: 158KB → 189KB (+31KB, 풀어쓰기 추가분)

## 운영 알림
POST gohotelwinners.com/api/email/ops/notify-claude-work
- step: "BL-MODAL-COPY-REWRITE 완료 — 8개 결정 작업 초등학생 톤 풀어쓰기"
