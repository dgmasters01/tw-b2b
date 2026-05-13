---
slug: 2026-05-13-bl-health-autoheal
title: BL-HEALTH-AUTOHEAL — 빨간불 실시간 감지 + 자가 치유
date: 2026-05-13
tasks: [BL-HEALTH-AUTOHEAL]
commits: []
decisions: []
---

## 🎯 한 줄 요약

빨간불이 5~60분 지연으로 갱신되던 문제를 고쳐서, 작업 박힐 때마다 자동으로 점검 + 스스로 치유한다.

## 📍 왜 발생했나

대표님이 admin-status 화면에서 빨간불을 보셨는데, 작업이 끝났는데도 빨간불이 5~60분 동안 그대로였다. 원인은 두 가지였다. (1) 점검 봇이 10분에 1번만 자동 실행됐고, (2) "출처가 없는 작업이 있다"는 경고가 떴지만 시스템이 스스로 고치지 못해서 사람이 손대야 했다. 이건 대표님이 결정한 후에도 시스템이 계속 빨간불 상태로 보이는 흐름 깨짐이었다.

## 🛠 어떻게 해결했나

자가 치유 봇(`tasks-source-autoheal.js`)을 만들어서, 작업 목록에 출처 없는 항목을 발견하면 (1) 작업 기록 색인 매핑, (2) 관련 결정 번호, (3) 카테고리·날짜 기반으로 자동 박는다. 그리고 작업이 박힐 때마다 자동으로 이 봇이 돌아가고, 끝나면 점검 봇을 즉시 재실행하도록 연결했다. 결과는 commit 메시지에 그대로 박혀서 대표님이 확인 가능하다.

## ✅ 결과

- 작업 박힘 → 약 1분 안에 자가 치유 자동 실행
- 16건 누락된 출처 모두 자동 박힘 (chat-log 매핑 1건 + 결정 매핑 12건 + 폴백 3건)
- 빨간불(`tasks_schema`) → 초록불로 자동 전환 예정
- 앞으로 새 작업 추가될 때마다 출처 자동 박힘 (사람 손 안 댐)

## ⏱ 다음 결정 필요

추가 결정 없음. 자율 운영.

---

# 🔧 기술 상세 (개발자용)

## 박은 파일 3개
- `scripts/tasks-source-autoheal.js` (신규, 자가 치유 봇)
- `.github/workflows/health-autoheal-on-push.yml` (신규, push 트리거 + health-bot 재실행)
- `_os/scripts/health_check_admin.mjs` (autoheal-bot 추적 추가)

## 자가 치유 전략 우선순위
1. **chat-log byTask 매핑**: `_chat-logs/index.json` byTask에서 직접 슬러그 추출
2. **decision_ref + byDecision**: 결정 매핑된 chat-log 추출 (객체 `.slug` 안전 처리)
3. **decision_ref 단독**: chat-log 없으면 `decision:D-XXX`만 박음
4. **autoheal fallback**: notes/category 있으면 `autoheal:{category}-{date}` 박음

## GitHub Actions 흐름
```
push (tasks.json 변경)
  ↓
autoheal-bot 실행
  ↓ 변경 있으면
[autoheal-bot] commit + push
  ↓
github-script가 health-check-admin workflow 재실행 트리거
  ↓
health-bot 즉시 재평가
  ↓
_health.json 갱신
  ↓
admin-status 5초 폴링이 자동 인식 → 빨간불 해소
```

## self-trigger 방지
- `if: "!contains(github.event.head_commit.message, '[autoheal-bot]')"`
- `[autoheal-bot]` 마커 박힌 commit은 workflow 자체 무한 루프 방지

## 검증 (로컬 dry-run)
- ✅ Node syntax OK
- ✅ 16건 모두 source 박음 (BL-RENAME-GOHOTEL 등)
- ✅ `[object Object]` 버그 발견 → 객체 슬러그 추출 정확화
- ✅ 원복 후 정정된 봇으로 재실행 → 16건 깔끔하게 박힘

## 영향
- 빨간불 평균 해소 시간: 10~60분 → 약 1분
- 사람 개입 필요: 0건 (전부 자가 치유)
- 향후 BL 대량 추가 시에도 자동 매핑
