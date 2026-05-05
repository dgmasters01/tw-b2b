#!/usr/bin/env bash
# ============================================================
# ccf/bootstrap/install.sh
# ============================================================
#
# CCF (Command Center Framework) 한 줄 이식 스크립트
#
# 사용법:
#   curl -sL https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/ccf/bootstrap/install.sh | bash
#
# 또는 PAT 필요 시:
#   bash <(curl -sH "Authorization: token $GH_PAT" \
#     -H "Accept: application/vnd.github.raw" \
#     https://api.github.com/repos/dgmasters01/tw-b2b/contents/ccf/bootstrap/install.sh)
#
# 수행 내용:
#   1. 현재 디렉토리가 git repo인지 확인
#   2. ccf/ 디렉토리가 이미 있으면 건너뛰고 안내, 없으면 GitHub에서 통째로 가져옴
#   3. tasks.json이 없으면 빈 스키마 파일 생성
#   4. _admin/admin-status.html이 없으면 ccf/ui/command-center.html 자동 배치
#   5. package.json에 ccf 스크립트 추가 (있을 때만)
# ============================================================

set -e

CCF_REPO_OWNER="${CCF_REPO_OWNER:-dgmasters01}"
CCF_REPO_NAME="${CCF_REPO_NAME:-tw-b2b}"
CCF_BRANCH="${CCF_BRANCH:-main}"
CCF_SOURCE_BASE="https://raw.githubusercontent.com/${CCF_REPO_OWNER}/${CCF_REPO_NAME}/${CCF_BRANCH}"

CCF_FILES=(
  "ccf/README.md"
  "ccf/core/queue-engine.js"
  "ccf/core/auto-status-updater.js"
  "ccf/core/handoff-generator.js"
  "ccf/core/routing-judge.js"
  "ccf/ui/command-center.html"
  "ccf/ui/command-center.css"
  "ccf/schema/tasks.schema.json"
  "ccf/schema/decisions.schema.json"
  "ccf/schema/chat-logs.schema.json"
  "ccf/templates/handoff-claude.md"
  "ccf/templates/handoff-staff.md"
  "ccf/bootstrap/config.template.json"
)

# ────────────────────────────────────────────────────────────
# 1. git repo 확인
# ────────────────────────────────────────────────────────────
if [ ! -d ".git" ] && [ ! -f ".git" ]; then
  echo "❌ 현재 디렉토리는 git repo가 아닙니다. git init 후 다시 시도하세요."
  exit 1
fi

echo "▶ CCF 설치 시작: ${CCF_REPO_OWNER}/${CCF_REPO_NAME}@${CCF_BRANCH}"

# ────────────────────────────────────────────────────────────
# 2. ccf/ 디렉토리 처리
# ────────────────────────────────────────────────────────────
if [ -d "ccf" ]; then
  echo "⚠️  ccf/ 디렉토리가 이미 있습니다. 덮어쓰지 않고 종료합니다."
  echo "   업데이트가 필요하면 ccf/를 백업한 뒤 다시 실행하세요."
  exit 0
fi

mkdir -p ccf/core ccf/ui ccf/schema ccf/templates ccf/bootstrap

CURL_AUTH=""
if [ -n "$CCF_PAT" ]; then
  CURL_AUTH="-H Authorization:\ token\ $CCF_PAT"
fi

for f in "${CCF_FILES[@]}"; do
  url="${CCF_SOURCE_BASE}/${f}"
  if [ -n "$CCF_PAT" ]; then
    curl -sfL -H "Authorization: token $CCF_PAT" "$url" -o "$f" || {
      echo "  ❌ $f 다운로드 실패 ($url)"; exit 1;
    }
  else
    curl -sfL "$url" -o "$f" || { echo "  ❌ $f 다운로드 실패"; exit 1; }
  fi
  echo "  ✅ $f"
done

# ────────────────────────────────────────────────────────────
# 3. tasks.json 빈 스키마 생성 (없을 때만)
# ────────────────────────────────────────────────────────────
if [ ! -f "tasks.json" ]; then
  cat > tasks.json <<'JSON'
{
  "version": "2.0",
  "schema": "ccf-tasks-v2",
  "updated_at": "1970-01-01T00:00:00Z",
  "tasks": [],
  "stats": {
    "total": 0, "done": 0, "in_progress": 0, "pending": 0, "blocked": 0, "autonomous_ready": 0
  }
}
JSON
  echo "  ✅ tasks.json 빈 스키마 생성"
else
  echo "  ⏩ tasks.json은 이미 있어 건드리지 않음"
fi

# ────────────────────────────────────────────────────────────
# 4. _admin/admin-status.html 안내
# ────────────────────────────────────────────────────────────
if [ ! -f "_admin/admin-status.html" ] && [ ! -f "admin-status.html" ]; then
  mkdir -p _admin
  if [ -f "ccf/ui/command-center.html" ]; then
    cp ccf/ui/command-center.html _admin/admin-status.html
    echo "  ✅ _admin/admin-status.html 자동 배치 (ccf/ui/command-center.html 복사)"
  fi
else
  echo "  ⏩ admin-status.html은 이미 있어 건드리지 않음"
fi

# ────────────────────────────────────────────────────────────
# 5. package.json 스크립트 추가 (있을 때만)
# ────────────────────────────────────────────────────────────
if [ -f "package.json" ]; then
  echo "  ℹ️  package.json에 다음 스크립트를 추가하실 것을 권장:"
  echo '       "ccf:queue": "node -e \"import('"'"'./ccf/core/queue-engine.js'"'"').then(m=>{const t=JSON.parse(require('"'"'fs'"'"').readFileSync('"'"'tasks.json'"'"','"'"'utf8'"'"'));console.log(JSON.stringify(m.buildQueue(t),null,2));})\""'
  echo '       "ccf:check": "node ccf/core/auto-status-updater.js"'
fi

echo ""
echo "✅ CCF 설치 완료."
echo "   다음 단계:"
echo "     1. ccf/README.md 읽기"
echo "     2. tasks.json에 첫 작업 추가"
echo "     3. _admin/admin-status.html을 브라우저에서 열어 큐 확인"
