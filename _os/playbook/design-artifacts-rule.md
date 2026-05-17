# 디자인 자산 자동 박제 룰 (Design Artifacts Auto-Archive)

> **헌법 1조(단일 진실) + 4조(전수 추적) 보조 룰.**
> 디자인은 서비스 방향과 직결되는 자산이다. 채팅 메모리에만 두면 채팅 종료 시 영구 손실된다.
> 사고 케이스: 2026-05-17 BL-MGR-DASHBOARD-V1 — 앞 채팅에서 받은 디자인 이미지가 새 채팅에서 사라짐.

---

## 1. 자동 박제 의무 (Claude가 무조건 실행)

다음 입력을 받으면 **그 응답 안에서** 즉시 GitHub에 박는다. 대표님 허락 안 묻는다.

| 입력 종류 | 박을 곳 | 형식 |
|---|---|---|
| 대표님이 첨부한 디자인 이미지/스케치 | `docs/design/{BL_ID}/reference/{timestamp}.png` | PNG 원본 |
| 대표님이 보낸 디자인 설명 텍스트 | `docs/design/{BL_ID}/design-spec.md` 안에 박음 | Markdown |
| Claude가 만든 SVG 와이어프레임 | `docs/design/{BL_ID}/wireframe-v{n}.html` | 단일 HTML |
| Claude가 만든 컬러 팔레트·토큰 | `docs/design/{BL_ID}/tokens.md` | Markdown |
| 외부 참고 자료(URL) | `docs/design/{BL_ID}/references.md` 안에 박음 | 링크 목록 |

---

## 2. tasks.json 의무 필드 — `design_artifacts`

BL 단위로 `tasks.json`의 해당 task에 다음 배열 추가:

```json
"design_artifacts": [
  {
    "type": "wireframe" | "spec" | "reference" | "tokens",
    "version": "v1",
    "path": "docs/design/BL-XXX/wireframe-v1.html",
    "url": "https://github.com/dgmasters01/tw-b2b/blob/main/...",
    "created_by": "claude" | "ceo",
    "created_at": "YYYY-MM-DD",
    "status": "pending_review" | "approved" | "superseded"
  }
]
```

이 배열은 boot.md가 자동으로 노출시키는 위치에 있어, 다음 채팅의 Claude도 자동으로 본다.

---

## 3. 새 채팅 시작 시 자동 fetch (Claude 행동 강제)

새 채팅에서 작업 BL이 정해지면 Claude는 boot.md 다음에 **자동으로**:

1. `tasks.json`에서 해당 BL의 `design_artifacts` 배열 확인
2. 배열이 비어 있으면 → 새 디자인 작업 (대표님께 이미지/방향 요청 가능)
3. 배열이 있으면 → 가장 최신 버전 1개 fetch해서 본문에 보고
4. 대표님이 "이거 맞다" 하시면 `status: approved`로 변경 후 박기 진행

**"디자인 어떤 거였죠?" 질문은 헌법 위반이다.** 디자인 자산은 tasks.json에서 찾아 fetch한다.

---

## 4. 버전 관리

- 한 BL의 디자인은 여러 버전 가능 (v1 → v2 → v3)
- 새 버전 박을 때 이전 버전은 `status: superseded`로 변경, 파일은 보존
- 대표님이 "이거 맞다" 하신 버전만 `status: approved`
- 한 BL에 `approved` 버전은 최대 1개

---

## 5. 사고 방지 체크 (Claude 자가 점검)

매 채팅 시작 시 작업 BL이 결정되면, 첫 응답 내에서 다음을 점검:

- [ ] 이 BL에 `design_artifacts` 배열 있나?
- [ ] 있으면 가장 최신 1개 fetch했나?
- [ ] 없으면 대표님께 디자인 입력 요청했나?
- [ ] 대표님이 디자인 입력 주시면 즉시 박제 commit을 트리거했나?

위 4개 중 하나라도 빼먹으면 **헌법 위반.** 그 채팅에서 박은 디자인은 다음 채팅 Claude가 못 본다.

---

## 6. 파일 폴더 구조 표준

```
docs/design/
  ├── BL-MGR-DASHBOARD-V1/
  │   ├── design-spec.md          # 텍스트 스펙
  │   ├── wireframe-v1.html       # 와이어프레임 (Claude 제작)
  │   ├── wireframe-v2.html       # 다음 버전
  │   ├── reference/              # 대표님 첨부 원본
  │   │   ├── 2026-05-17-sketch.png
  │   │   └── 2026-05-17-ref.jpg
  │   └── tokens.md               # 색상·폰트·간격 토큰
  ├── BL-ADMIN-OPERATIONS-DASHBOARD/
  │   └── ...
  └── _index.md                   # 전체 BL 디자인 자산 인덱스 (자동 갱신)
```

---

## 7. 적용 대상

이 룰은 **모든 페이지·UI BL**에 강제 적용. 데이터/인프라/봇 BL은 제외 (디자인 자산 없음).

페이지·UI BL 판별: tasks.json의 `files_planned`에 `.html`이 포함되면 무조건 적용.

---

**Last updated**: 2026-05-17
**Triggered by**: BL-MGR-DASHBOARD-V1 디자인 이미지 손실 사고
**Maintained by**: 클로드
