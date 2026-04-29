# GitHub Actions Workflow 템플릿

이 디렉토리의 `.template` 파일들은 GitHub Actions에서 사용할 워크플로 정의입니다.
실제로 작동하려면 `.github/workflows/` 디렉토리에 `.yml` 파일로 복사해야 합니다.

## 왜 여기에 있나?

Claude의 GitHub PAT에 `workflow` scope가 없어 `.github/workflows/*.yml`을 직접 push할 수 없습니다.
보안상 이 scope는 대표님이 직접 PAT를 갱신하거나 GitHub 웹 UI에서 워크플로를 등록해야 합니다.

## capture-pages.yml.template 등록 방법 (대표님 1회 액션)

### 옵션 A: GitHub 웹 UI로 등록 (가장 쉬움)

1. https://github.com/dgmasters01/tw-b2b 에서 Actions 탭 클릭
2. "New workflow" → "set up a workflow yourself" 클릭
3. 파일명을 `capture-pages.yml`로 변경
4. `docs/workflow-templates/capture-pages.yml.template`의 내용 전체 복사 → 붙여넣기
5. 우상단 "Commit changes" 클릭

### 옵션 B: 로컬 git에서 등록

```bash
git clone https://github.com/dgmasters01/tw-b2b.git
cd tw-b2b
mkdir -p .github/workflows
cp docs/workflow-templates/capture-pages.yml.template .github/workflows/capture-pages.yml
git add .github/workflows/capture-pages.yml
git commit -m "[설정] capture-pages workflow 활성화"
git push
```

(대표님 본인 자격증명으로 push하면 workflow scope 자동 포함)

## Secrets 등록

워크플로 파일을 등록한 뒤 https://github.com/dgmasters01/tw-b2b/settings/secrets/actions 에서:

| Secret 이름 | 값 |
|---|---|
| `TW_MANAGER_EMAIL` | `joylife8760@naver.com` |
| `TW_MANAGER_PASSWORD` | (해당 매니저 계정 비밀번호) |
| `TW_ADMIN_EMAIL` | `dgmasters01@gmail.com` |
| `TW_ADMIN_PASSWORD` | (어드민 계정 비밀번호) |

등록 후 Actions 탭에서 `Capture Pages` 워크플로를 수동 실행 (`mode=all`).
