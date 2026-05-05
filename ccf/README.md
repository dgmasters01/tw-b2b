# CCF — Command Center Framework

> **작업 지휘소 프레임워크**: 위에서부터 차례로 클릭하면 시스템이 알아서 완성되어 가는 흐름.
> 한 줄 명령 한 번으로 다른 프로젝트에 그대로 이식 가능.

**제작자:** 이지형 대표 (TravelWinners CEO) + Claude
**원본 프로젝트:** TW B2B (`dgmasters01/tw-b2b`)
**최초 적용일:** 2026-05-06
**라이선스:** 내부 자산

---

## 1. CCF가 푸는 문제

| 문제 | 기존 방식 | CCF 방식 |
|---|---|---|
| 어디서부터 시작할지 모른다 | BACKLOG 잔뜩, 우선순위 직관 | 5단계 정렬 알고리즘 자동 |
| 작업 인계가 어렵다 | 매번 프롬프트 다시 작성 | 카드 클릭 = 인계서 자동 복사 |
| 작업 완료를 누가 갱신? | 사람이 수동 갱신 | ops 알림 발송 시점 자동 감지 |
| 직원 작업 vs 대표님 결정 혼재 | 한 화면에서 구분 안 됨 | started_by 별도 표시 |
| 작업 중 추가 발생 | 또 백로그 추가 → 잊어버림 | 5초 폴링 즉시 반영 |

---

## 2. 7원칙 (변경 금지)

1. **"직원 가능" = 개발 진행 가능 작업** (대표님 결정 불필요, started_by 별도 표시)
2. **카드 클릭 = 인계서 클립보드 자동 복사** → 대표님이 채팅에 붙여넣음 → Claude 1차 판단(기존/새 채팅)
3. **작업 완료 자동 감지** = ops 알림 발송 시점 → tasks.json status=done 자동 갱신
4. **5단계 우선순위 정렬은 Claude 책임**:
   1. 막힘(blocked) 제외
   2. 선행 작업(depends_on) 모두 done인 것만 진입
   3. category=infrastructure 가중치
   4. 의존성 카운트 (이걸 기다리는 작업 수 ↑ 우선)
   5. P0→P1→P2→P3 then small→medium→large
5. **작업 도중 추가 발생 시** tasks.json 자동 추가 + 5초 폴링으로 즉시 반영
6. **레이아웃**: 결정 대기 + 자율 작업 큐가 화면 최상단
7. **CCF 프레임워크로 제작** — 타 프로젝트에 한 줄 명령으로 이식 가능

---

## 3. 디렉토리 구조

```
ccf/
├── README.md                    ← 이 파일
├── core/
│   ├── queue-engine.js          ← 5단계 우선순위 정렬 엔진 (의존성/카테고리/사이즈)
│   ├── auto-status-updater.js   ← ops 알림 발송 → tasks.json 자동 갱신
│   ├── handoff-generator.js     ← Claude/직원용 인계서 자동 생성
│   └── routing-judge.js         ← "기존 채팅 진행" vs "새 채팅 권장" 1차 판단
├── ui/
│   ├── command-center.html      ← 작업 지휘소 UI (모듈화)
│   └── command-center.css       ← CSS 변수 분리, Aurora 디자인 토큰 호환
├── schema/
│   ├── tasks.schema.json        ← 작업 데이터 표준
│   ├── decisions.schema.json    ← 결정 기록 표준
│   └── chat-logs.schema.json    ← chat-log 5블록 표준 (CLAUDE.md 11조)
├── templates/
│   ├── handoff-claude.md        ← Claude용 인계서 템플릿
│   └── handoff-staff.md         ← 직원용 작업 지시서 템플릿
└── bootstrap/
    ├── install.sh               ← "이 프로젝트에 CCF 깔아줘" 한 줄 명령
    └── config.template.json     ← 프로젝트별 설정 템플릿
```

---

## 4. 한 줄 이식 명령

다른 프로젝트에 CCF 적용:

```bash
curl -sL https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/ccf/bootstrap/install.sh | bash
```

또는 GitHub PAT가 필요한 경우:

```bash
bash <(curl -sH "Authorization: token $GH_PAT" \
  -H "Accept: application/vnd.github.raw" \
  https://api.github.com/repos/dgmasters01/tw-b2b/contents/ccf/bootstrap/install.sh)
```

`install.sh`가 수행하는 것:
1. `ccf/` 디렉토리 통째로 복사
2. `tasks.json`이 없으면 빈 스키마 생성 (`schema/tasks.schema.json` 참조)
3. `_admin/admin-status.html`이 없으면 `ccf/ui/command-center.html`을 그 자리에 배치
4. `package.json`에 `npm run ccf:scan`, `ccf:queue` 스크립트 추가
5. GitHub Actions 워크플로우 (`.github/workflows/ccf-scan.yml`) 추가 (옵션)

---

## 5. 데이터 스키마

### tasks.json (Single Source of Truth)

```json
{
  "version": "2.0",
  "schema": "ccf-tasks-v2",
  "updated_at": "ISO-8601",
  "tasks": [
    {
      "id": "BL-XXX",
      "title": "...",
      "category": "infrastructure | bug | ux | feature | docs | dev | design",
      "status": "pending | in_progress | done | blocked",
      "priority": "P0 | P1 | P2 | P3",
      "size": "small | medium | large",
      "started_by": "CEO | STAFF | CLAUDE | null",
      "depends_on": ["다른-task-id", ...],
      "blocker": null | "막힘 사유",
      "created_at": "ISO-8601",
      "started_at": "ISO-8601 | null",
      "completed_at": "ISO-8601 | null",
      "claude_can_auto": true | false,
      "autonomous": {
        "can_run_alone": true | false,
        "estimated_hours": 0.0,
        "requires_decisions_first": []
      },
      "progress": "...",
      "history": [
        { "at": "ISO-8601", "by": "...", "action": "..." }
      ]
    }
  ]
}
```

---

## 6. 자체 검증 항목 (헌법 12조 호환)

CCF는 다음 7항목을 모든 변경에서 자체 검증한다:

1. JS 문법 (`node --check`)
2. JSON 검증 (`python3 -m json.tool`)
3. 배포 상태 확인 (Vercel deploy READY)
4. 라이브 페이지 fetch (HTTP 200/401)
5. 데이터 정확성 (수치로 증명)
6. 시각 변경 자체 검증 (코드 흐름 trace)
7. boundary 케이스 (0건/첫번째/마지막/모바일/반복/캐시)

---

## 7. 버전

- **v0.1.0** (2026-05-06) — 초기 골격: queue-engine, auto-status-updater, handoff-generator, routing-judge
