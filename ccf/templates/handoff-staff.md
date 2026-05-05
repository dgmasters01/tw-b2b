[직원 작업 지시서 — {{TASK_ID}}]

## 작업: {{TASK_TITLE}}

**카테고리:** {{TASK_CATEGORY}}
**우선순위:** {{TASK_PRIORITY}}
**예상 소요:** 약 {{ESTIMATED_HOURS}}시간

## 무엇을
{{TASK_PROGRESS}}

## 시작 전 확인
- [ ] 작업 시작 시각 기록 (admin-status에서 카드 클릭 → 자동)
- [ ] 막히는 부분 발견 시 대표님께 즉시 알림

## 완료 시
- [ ] ops 알림 endpoint 호출 (자동으로 status=done 갱신됨)
- [ ] CHANGELOG.md에 [변경사유] 태그와 함께 기록

## 도움이 필요하면
대표님 또는 Claude(서비서/서팀장) 호출.
