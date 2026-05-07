#!/usr/bin/env bash
# ============================================================
# install_os.sh — TW OS 설치 스크립트 (BL-OS-PHASE-3)
# ============================================================
#
# 사용법:
#   ./install_os.sh /path/to/new-project
#   ./install_os.sh ../my-next-project
#
# 동작:
#   1. 대상 폴더에 _os/ 폴더 복사 (OS 본체 자산 전체)
#   2. .github/workflows/ 6개 OS 봇 워크플로 복사
#   3. 루트 OS 코어 문서 복사 (OPERATIONS_CHARTER.md, CLAUDE.md, 빈 tasks.json 등)
#   4. business-context/ 골격 생성 (5개 빈 .md + 99_uploads/)
#   5. _admin/ 골격 생성 (admin-status.html, admin-tasks.html 복사)
#   6. .gitignore 보강
#
# 헌법 부합:
#   ① 단일 진실: _os/manifest.json이 OS 자산 카탈로그
#   ② 무인 실행: 설치 후 새 채팅에서 자동 운영 시작
#   ⑤ 무인 검증: 설치 직후 health-bot이 자동 trigger
# ============================================================

set -euo pipefail

# ─── 인자 검증 ─────────────────────────────────────────────
if [ "$#" -lt 1 ]; then
  echo "❌ 사용법: $0 <대상-폴더-경로>"
  echo "   예: $0 ../my-next-project"
  exit 1
fi

TARGET="$1"
SOURCE="$(cd "$(dirname "$0")" && pwd)"  # 이 스크립트 위치 = OS 본체 repo root

if [ ! -d "$SOURCE/_os" ]; then
  echo "❌ OS 본체를 찾을 수 없음: $SOURCE/_os"
  echo "   이 스크립트는 OS 본체 repo의 루트에서 실행해야 합니다."
  exit 1
fi

if [ -d "$TARGET/_os" ]; then
  echo "⚠️  $TARGET/_os 이미 존재. 덮어쓸까요? (y/N)"
  read -r confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "취소."; exit 0
  fi
fi

mkdir -p "$TARGET"
cd "$TARGET"
TARGET_ABS="$(pwd)"
cd - > /dev/null

echo "============================================================"
echo "TW OS 설치"
echo "  source: $SOURCE"
echo "  target: $TARGET_ABS"
echo "============================================================"

# ─── 1. _os/ 폴더 복사 ──────────────────────────────────────
echo ""
echo "[1/6] _os/ 폴더 복사 중..."
cp -r "$SOURCE/_os" "$TARGET_ABS/"
echo "   ✅ _os/ ($(find "$TARGET_ABS/_os" -type f | wc -l)개 파일)"

# ─── 2. 워크플로 복사 ──────────────────────────────────────
echo ""
echo "[2/6] .github/workflows/ 6개 OS 봇 워크플로 복사 중..."
mkdir -p "$TARGET_ABS/.github/workflows"
for wf in sync.yml auto-detect-task-status.yml build-activity-feed.yml page-status-scan.yml health-check-admin.yml chat-log-index.yml; do
  if [ -f "$SOURCE/.github/workflows/$wf" ]; then
    cp "$SOURCE/.github/workflows/$wf" "$TARGET_ABS/.github/workflows/$wf"
    echo "   ✅ $wf"
  else
    echo "   ⚠️  $wf 누락 (source에 없음)"
  fi
done

# ─── 3. OS 코어 문서 복사 ──────────────────────────────────
echo ""
echo "[3/6] OS 코어 문서 복사 중..."
for doc in OPERATIONS_CHARTER.md CLAUDE.md; do
  if [ -f "$SOURCE/$doc" ]; then
    cp "$SOURCE/$doc" "$TARGET_ABS/$doc"
    echo "   ✅ $doc"
  fi
done

# 빈 tasks.json (새 프로젝트는 작업 비어있음)
if [ ! -f "$TARGET_ABS/tasks.json" ]; then
  cat > "$TARGET_ABS/tasks.json" <<EOF
{
  "version": "1.0.0",
  "schema_version": "2.0",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%S+00:00)",
  "deadline": null,
  "stats": {
    "total": 0,
    "done": 0,
    "in_progress": 0,
    "pending": 0,
    "blocked": 0,
    "autonomous_ready": 0,
    "todo": 0
  },
  "tasks": []
}
EOF
  echo "   ✅ tasks.json (빈 골격)"
fi

# 빈 헌법 동기 문서들 (sync_engine이 자동 채움)
for doc in BACKLOG.md CHANGELOG.md SOLO_WORK_QUEUE.md DECISIONS.md DECISIONS_INDEX.md ECHO_LOG.md STATUS.md JOURNEY.md; do
  if [ ! -f "$TARGET_ABS/$doc" ]; then
    echo "# $doc" > "$TARGET_ABS/$doc"
    echo "" >> "$TARGET_ABS/$doc"
    echo "> 이 문서는 sync_engine.py 또는 Claude가 자동/반자동으로 갱신합니다." >> "$TARGET_ABS/$doc"
  fi
done
echo "   ✅ OS 동기 문서 8종"

# ─── 4. business-context/ 골격 ───────────────────────────────
echo ""
echo "[4/6] business-context/ 골격 생성 중..."
mkdir -p "$TARGET_ABS/business-context/99_uploads"

for f in 01_charter:사업\ 방향\ /\ 정책\ /\ 가격\ /\ 환불 \
         02_decisions:의사결정\ 이력 \
         03_decisions_index:빠른\ 색인 \
         04_manager_journey:매니저\ 여정 \
         05_user_journey:사용자\ 여정; do
  fname="${f%%:*}"
  desc="${f##*:}"
  fpath="$TARGET_ABS/business-context/${fname}.md"
  if [ ! -f "$fpath" ]; then
    cat > "$fpath" <<EOF
# ${fname} — ${desc}

> AI가 새 채팅마다 첫 번째로 읽는 폴더의 일부.
> 대표님이 사업계획서 PDF/워드를 \`99_uploads/\`에 던지면 Claude가 자동으로 이 파일에 흡수.

(작성 대기)
EOF
  fi
done
echo "   ✅ business-context/ (5개 .md + 99_uploads/)"

# tools-manifest.json 빈 골격 (BL-OS-PHASE-5 단계 6 — 사이드바 TOOLS 영역 채움)
TOOLS_MF="$TARGET_ABS/business-context/tools-manifest.json"
if [ ! -f "$TOOLS_MF" ]; then
  cat > "$TOOLS_MF" <<EOF
{
  "version": "1.0.0",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%S+00:00)",
  "description": "사이드바 🛠️ TOOLS 영역 — 이 프로젝트의 사업 도구 메뉴. _os/admin-pages/menu-manifest.json은 영역만 강제, 메뉴 내용은 여기서 자율 정의.",
  "principle": "OS 핵심 원칙 — 틀은 강제, 내용은 자유",
  "rendering_target": "admin-status.html 사이드바 TOOLS 영역 (5초 polling 자동 동기화)",
  "menus": [
    {
      "id": "example-tool-1",
      "label": "(예시) 사업 도구 1",
      "icon": "📦",
      "path": "/example.html",
      "role": "이 프로젝트의 사업 운영 도구 — 실제 메뉴로 교체하세요",
      "required": false
    }
  ],
  "_instruction": "menus[] 배열을 이 프로젝트 실제 사업 도구로 교체하세요. 예: gohotelwinners=[호텔관리,예약관리,매니저관리,Agoda매칭,예약분석], ceylon-journey=[패키지,일정,비자,가이드,예약]. path는 실제 라이브 페이지여야 합니다 (404 금지)."
}
EOF
  echo "   ✅ business-context/tools-manifest.json (빈 골격 — 사이드바 TOOLS 영역 채움)"
fi

# ─── 5. _admin/ 골격 ────────────────────────────────────────
echo ""
echo "[5/6] _admin/ 골격 복사 중..."
mkdir -p "$TARGET_ABS/_admin"
for page in admin-status.html admin-tasks.html admin-permissions.html admin-gallery.html admin-service-ops.html; do
  if [ -f "$SOURCE/_admin/$page" ]; then
    cp "$SOURCE/_admin/$page" "$TARGET_ABS/_admin/$page"
    echo "   ✅ _admin/$page"
  fi
done
# admin-login + accept-invite는 루트
for page in admin-login.html admin-accept-invite.html; do
  if [ -f "$SOURCE/$page" ]; then
    cp "$SOURCE/$page" "$TARGET_ABS/$page"
    echo "   ✅ $page"
  fi
done

# 빈 _health.json
if [ ! -f "$TARGET_ABS/_admin/_health.json" ]; then
  echo '{"overall": "unknown", "summary": "health-bot 첫 실행 대기 중", "checks": []}' > "$TARGET_ABS/_admin/_health.json"
  echo "   ✅ _admin/_health.json (빈 골격)"
fi

# ─── 6. .gitignore 보강 ────────────────────────────────────
echo ""
echo "[6/6] .gitignore 보강 중..."
GIINGORE="$TARGET_ABS/.gitignore"
touch "$GIINGORE"
for pattern in "*.before_sync" ".DS_Store" "node_modules/" "__pycache__/" ".env" ".env.local" "*.pyc"; do
  grep -qxF "$pattern" "$GIINGORE" || echo "$pattern" >> "$GIINGORE"
done
echo "   ✅ .gitignore"

echo ""
echo "============================================================"
echo "✅ TW OS 설치 완료"
echo "============================================================"
echo ""
echo "다음 단계:"
echo "  1. cd $TARGET_ABS"
echo "  2. git init && git add . && git commit -m 'feat: TW OS 설치'"
echo "  3. GitHub repo 생성 + push"
echo "  4. business-context/01_charter.md에 사업 방향 작성"
echo "  5. brand-tokens.json 생성 (Phase 3 단계 4 — 색/폰트 정의)"
echo "  6. 새 채팅에서 OPERATIONS_CHARTER.md raw fetch + 자율 실행 시작"
echo ""
echo "브랜드 스킨 적용:"
echo "  brand-tokens.json 1줄 수정 → 전체 사업 화면 색/폰트 변경"
echo ""
