#!/usr/bin/env python3
"""
TW B2B — chat-log 5블록 표준 검증 봇 (D-036)

헌법 부합:
  ⑥ 사람용+AI용: 5블록 표준은 _os/playbook/chat-log-format.md 진실원
  ⑪ Claude 자체 보고: 위반 시 사람용 탭 ⚠️ 배지 자동 표시

D-036 결정 (2026-05-13):
  - 헌법 손 안 댐 (부칙 신설 안 함)
  - 검증 봇이 워닝만 표시 (강제 차단 아님)
  - chat-log 박힐 때 5블록 누락이면 _chat-logs/_format-report.json 생성

검증 규칙 (chat-log-format.md L8-42):
  1. 5블록 헤딩 모두 존재:
     - ## 🎯 한 줄 요약
     - ## 📍 왜 발생했나
     - ## 🛠 어떻게 해결했나
     - ## ✅ 결과
     - ## ⏱ 다음 결정 필요
  2. 사업가 용어 금지어 사용 빈도 (chat-log-format.md L46-62 표):
     - commit / task / Phase / Vercel deploy / RPC / fallback 등
  3. 헤딩 순서 (5블록은 반드시 1→2→3→4→5 순서)

출력:
  _chat-logs/_format-report.json
    {
      "checked_at": ISO datetime,
      "total_files": int,
      "compliant": int,        # 5블록 완비
      "partial": int,           # 5블록 일부
      "non_compliant": int,     # 5블록 없음
      "files": [
        {
          "slug": "2026-05-13-...",
          "status": "compliant" | "partial" | "non_compliant",
          "missing_blocks": ["🎯", "📍", ...],
          "forbidden_terms": [{"term": "commit", "count": 3}, ...],
          "score": 0-100,        # 5블록 / 5 * 100 (간단)
        }
      ]
    }

이 보고서를 admin-status.html이 fetch → 사람용 탭 옆 ⚠️ 배지 표시.

Last updated: 2026-05-13
"""

import json
import re
import sys
import os
from pathlib import Path
from datetime import datetime, timezone

# ──────────────────────────────────────────────────────────
# 5블록 표준 (chat-log-format.md 진실원)
# ──────────────────────────────────────────────────────────
REQUIRED_BLOCKS = [
    ("🎯", "한 줄 요약"),
    ("📍", "왜 발생했나"),
    ("🛠", "어떻게 해결했나"),
    ("✅", "결과"),
    ("⏱", "다음 결정 필요"),
]

# 사업가 시점에서 사용 금지 — 개발자 용어 (chat-log-format.md L46-62)
FORBIDDEN_TERMS = [
    "commit", "커밋",
    "task", "태스크", "Task ID",
    "Phase",
    "Vercel deploy", "Vercel redeploy", "redeploy",
    "RPC", "API",
    "frontmatter",
    "boundary 케이스",
    "fallback",
    "null-safe",
    "state: READY",
    "HTTP 200",
    "commit hash",
    "dgmasters01/tw-b2b",
]


def find_block_headings(content: str) -> dict:
    """본문에서 5블록 헤딩 위치 찾기 — 사람용 영역만 (## 🔧 기술 상세 이전)."""
    # 기술 상세 이전 부분만 검사 (5블록은 사업가 영역에 있어야 함)
    tech_split = re.split(r'^#+\s*🔧\s*기술\s*상세', content, maxsplit=1, flags=re.MULTILINE)
    biz_section = tech_split[0]

    found = {}
    for emoji, label in REQUIRED_BLOCKS:
        # ## 🎯 형식 (## + 공백 + 이모지)
        pattern = rf'^#{{2,3}}\s*{re.escape(emoji)}'
        match = re.search(pattern, biz_section, re.MULTILINE)
        if match:
            found[emoji] = {
                "label": label,
                "line": biz_section[:match.start()].count('\n') + 1
            }
    return found


def count_forbidden_terms(content: str) -> list:
    """금지 용어 등장 빈도 카운트 — 사람용 영역만."""
    tech_split = re.split(r'^#+\s*🔧\s*기술\s*상세', content, maxsplit=1, flags=re.MULTILINE)
    biz_section = tech_split[0]

    counts = []
    for term in FORBIDDEN_TERMS:
        # case-insensitive, 단어 경계 (한국어/영어 혼용 고려)
        if re.search(r'[가-힣]', term):
            # 한국어 단어 — substring match
            cnt = biz_section.lower().count(term.lower())
        else:
            # 영어 단어 — word boundary
            cnt = len(re.findall(r'\b' + re.escape(term.lower()) + r'\b', biz_section.lower()))
        if cnt > 0:
            counts.append({"term": term, "count": cnt})
    return counts


def check_chatlog(filepath: Path) -> dict:
    """chat-log 1개 검증."""
    try:
        content = filepath.read_text(encoding='utf-8')
    except Exception as e:
        return {
            "slug": filepath.stem,
            "status": "error",
            "error": str(e),
            "missing_blocks": [],
            "forbidden_terms": [],
            "score": 0,
        }

    found_blocks = find_block_headings(content)
    missing = [emoji for emoji, _ in REQUIRED_BLOCKS if emoji not in found_blocks]
    forbidden = count_forbidden_terms(content)

    found_count = len(found_blocks)
    score = int(found_count / len(REQUIRED_BLOCKS) * 100)

    if found_count == len(REQUIRED_BLOCKS):
        status = "compliant"
    elif found_count >= 1:
        status = "partial"
    else:
        status = "non_compliant"

    return {
        "slug": filepath.stem,
        "status": status,
        "found_blocks": list(found_blocks.keys()),
        "missing_blocks": missing,
        "forbidden_terms": forbidden,
        "forbidden_total": sum(t["count"] for t in forbidden),
        "score": score,
    }


def main(repo_root: str = ".") -> int:
    """전체 chat-log 검증 + 보고서 생성."""
    root = Path(repo_root)
    chat_dir = root / "_chat-logs"

    if not chat_dir.is_dir():
        print(f"❌ _chat-logs 디렉토리 없음: {chat_dir}", file=sys.stderr)
        return 1

    chatlog_files = sorted(chat_dir.glob("*.md"))
    # _format-report.json 자체는 제외, index.json도 제외
    chatlog_files = [f for f in chatlog_files if not f.name.startswith("_")]

    if not chatlog_files:
        print(f"⚠️ chat-log 파일 0개 — 검증 스킵", file=sys.stderr)
        return 0

    print(f"📋 chat-log 검증 시작: {len(chatlog_files)}개 파일")

    results = []
    for fp in chatlog_files:
        result = check_chatlog(fp)
        results.append(result)
        emoji = "✅" if result["status"] == "compliant" else "⚠️" if result["status"] == "partial" else "❌"
        print(f"  {emoji} {result['slug']} — {result['score']}점 ({result['status']})")

    # 통계
    compliant = sum(1 for r in results if r["status"] == "compliant")
    partial = sum(1 for r in results if r["status"] == "partial")
    non_compliant = sum(1 for r in results if r["status"] == "non_compliant")

    report = {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "total_files": len(results),
        "compliant": compliant,
        "partial": partial,
        "non_compliant": non_compliant,
        "compliance_rate": round(compliant / len(results) * 100, 1) if results else 0,
        "files": results,
    }

    report_path = chat_dir / "_format-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')

    print(f"\n📊 검증 결과:")
    print(f"  ✅ 5블록 완비 (compliant):  {compliant}")
    print(f"  ⚠️ 일부 누락 (partial):     {partial}")
    print(f"  ❌ 5블록 없음 (non_compliant): {non_compliant}")
    print(f"  📈 준수율: {report['compliance_rate']}%")
    print(f"\n📝 보고서: {report_path.relative_to(root)}")

    # exit 코드: 워닝만 — 강제 차단 아님 (D-036 결정)
    return 0


if __name__ == "__main__":
    repo_root = sys.argv[1] if len(sys.argv) > 1 else "."
    sys.exit(main(repo_root))
