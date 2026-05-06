#!/usr/bin/env python3
"""
TW B2B — commit message → 작업 ID 자동 매칭 + tasks.json status 자동 갱신

작업: BL-LIVE-STATUS-AUTO-DETECT (헌법 12조 그림 일치 OS 1단계)

목적:
  대표님이 카드 ▶ 즉시 시작 → 인계서 새 채팅 붙여넣기 → Claude가 첫 commit
  push하는 순간, 그 작업이 tasks.json에서 자동으로 status: in_progress로
  바뀌고 started_at이 박힘. admin-status 화면이 5초 폴링으로 감지하여
  "⚡ 지금 진행 중" 박스를 자동으로 띄움.

작동 흐름:
  1. GitHub Actions가 main push 감지 → 이 스크립트 호출
  2. push에 포함된 commit message들을 모두 스캔
  3. 각 commit msg에서 작업 ID 패턴 추출 (BL-XXX, BL-XXX-YYY, CHG-N, SQ-X 등)
  4. 매칭된 작업의 status를 자동 전환:
       - 현재 status가 pending이면 → in_progress + started_at 박음
       - commit msg에 'done', 'complete', 'fix(...): ...완료' 키워드 있으면
         → done + completed_at 박음
       - 그 외 (이어가는 작업)는 updated_at만 갱신
  5. 변경 있으면 tasks.json 저장

사용:
  # 모든 직전 commit 자동 분석 (GitHub Actions에서)
  python3 scripts/auto_detect_task_status.py --since-commit <SHA>

  # 단일 commit 분석 (디버그용)
  python3 scripts/auto_detect_task_status.py --commit-msg "fix(BL-LIVE-STATUS-PANEL): 진행 중 박스 신설"

  # 검증만 (변경 안 함)
  python3 scripts/auto_detect_task_status.py --since-commit <SHA> --dry-run

헌법 부합:
  ② 무인 실행: push 즉시 자동 실행
  ④ 전수 추적: 모든 status 전환이 task.history에 기록됨
  ⑤ 무인 검증: dry-run 옵션으로 사전 검증 가능
  ⑦ 상태 가시성: tasks.json 단일 진실 즉시 갱신 → 5초 폴링 감지
"""

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TASKS_JSON = REPO_ROOT / "tasks.json"

# 작업 ID 정규식 — 헌법 D-010 명명 규약 + 기존 데이터 패턴
# BL-XXX, BL-XXX-YYY, BL-XXX-YYY-ZZZ, CHG-N, SQ-X, PHASE-N-X-Y 등
TASK_ID_PATTERN = re.compile(
    r"\b(BL-[A-Z0-9]+(?:-[A-Z0-9]+)*"
    r"|CHG-\d+(?:-[a-z]+)?"
    r"|SQ-[A-Z0-9]+"
    r"|PHASE-\d+[A-Za-z0-9-]*"
    r"|IP-CTRL-\d+)\b"
)

# 완료 신호 키워드 — commit msg에 이게 있으면 status: done
DONE_KEYWORDS = re.compile(
    r"(완료|complete|done|닫음|closed|✅)",
    re.IGNORECASE
)

# 시작 신호 키워드 — commit msg에 이게 있으면 status: in_progress
# (대부분의 fix/feat/refactor는 진행 중으로 간주)
START_KEYWORDS = re.compile(
    r"(fix|feat|refactor|chore|docs|wip|진행|시작|start)",
    re.IGNORECASE
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def get_commits_since(since_commit: str) -> list[tuple[str, str]]:
    """since_commit 이후의 모든 commit (sha, message) 반환."""
    try:
        result = subprocess.run(
            ["git", "log", f"{since_commit}..HEAD", "--format=%H%x00%B%x1f"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        commits = []
        for raw in result.stdout.split("\x1f"):
            raw = raw.strip()
            if not raw:
                continue
            parts = raw.split("\x00", 1)
            if len(parts) == 2:
                sha, msg = parts
                commits.append((sha.strip(), msg.strip()))
        return commits
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] git log 실패: {e}", file=sys.stderr)
        return []


def extract_task_ids(commit_msg: str) -> list[str]:
    """commit msg subject(첫 줄)에서 작업 ID 모두 추출 (중복 제거, 등장 순서 보존).

    [BUGFIX 2026-05-06] subject 라인만 검사하도록 수정.
    이전 룰은 [변경사유] 본문에 언급된 작업 ID까지 추출해서,
    설명용으로 본문에 언급한 작업까지 자동으로 in_progress 박는 버그.
    예: "fix(admin-status): 진행 중 박스 분리\\n\\n... BL-002 ..."
        → 이전 룰: [admin-status, BL-002] 둘 다 추출
        → 새 룰: [BL-DECISION-MODAL-V2-PHASE-B] 만 추출 (subject만)

    안전장치:
    - subject = commit message 첫 줄
    - 본문은 [변경사유] 같은 설명용 영역이라 작업 ID 언급이 자주 발생
    - 진짜로 여러 작업을 함께 처리할 때는 subject 에 모두 명시할 것
    """
    subject = (commit_msg or "").split("\n", 1)[0].strip()
    found = TASK_ID_PATTERN.findall(subject)
    seen = set()
    result = []
    for tid in found:
        # sync-bot 자체는 무시
        if tid.startswith(("BL-IGNORE", "BL-NONE")):
            continue
        if tid not in seen:
            seen.add(tid)
            result.append(tid)
    return result


def classify_intent(commit_msg: str) -> str:
    """commit msg → 'done' | 'in_progress' | 'update'.

    [BUGFIX 2026-05-06] commit subject 라인(첫 줄)만 검사하도록 수정.
    이전 룰은 [변경사유] 본문에 박힌 "완료" 같은 단어까지 잡아서,
    in_progress로 박은 작업을 봇이 done으로 자동 변경하는 버그가 있었음.
    예: "fix(...): in_progress 박기" subject + 본문 "풀어쓰기 완료"
        → 이전 룰: done (잘못)
        → 새 룰: in_progress (정확)

    안전장치:
    - 명시적 [done] / [완료] 태그가 subject에 있을 때만 done
    - 일반 fix/feat/refactor subject는 무조건 in_progress
    """
    subject = (commit_msg or "").split("\n", 1)[0].strip()

    # 명시적 done 태그만 done으로 인식
    EXPLICIT_DONE = re.compile(
        r"(\[done\]|\[완료\]|^done:|^완료:|✅\s|→\s*done\b)",
        re.IGNORECASE
    )
    if EXPLICIT_DONE.search(subject):
        return "done"

    if START_KEYWORDS.search(subject):
        return "in_progress"

    return "update"


def update_task(task: dict, intent: str, commit_sha: str, commit_msg: str) -> bool:
    """task를 intent에 따라 갱신. 변경되면 True."""
    changed = False
    now = now_iso()
    short_sha = commit_sha[:7]
    msg_first_line = commit_msg.split("\n", 1)[0][:120]

    # intent에 따라 status 결정
    current = task.get("status", "pending")

    if intent == "done":
        if current != "done":
            task["status"] = "done"
            task["completed_at"] = now
            changed = True
            event = "완료 (auto-detected)"
        else:
            event = "완료 commit 추가 (이미 done)"
    elif intent == "in_progress":
        if current == "pending":
            task["status"] = "in_progress"
            task.setdefault("started_at", now)
            changed = True
            event = "진행 중 진입 (auto-detected)"
        elif current == "in_progress":
            event = "진행 중 commit 추가"
        else:
            # done 상태에서 다시 fix 들어오면 리오픈
            if current == "done":
                task["status"] = "in_progress"
                task["started_at"] = now
                task.pop("completed_at", None)
                changed = True
                event = "재오픈 (done → in_progress, auto-detected)"
            else:
                event = f"status 유지 ({current})"
    else:
        event = "관련 commit 추가 (status 유지)"

    # updated_at은 항상 갱신
    if task.get("updated_at") != now:
        task["updated_at"] = now
        # status 변경이 없어도 updated_at 갱신은 변경으로 친다 (5초 폴링 감지용)
        changed = True

    # history에 기록 (전수 추적)
    history = task.setdefault("history", [])
    history.append({
        "at": now,
        "event": event,
        "by": "auto-detect-bot",
        "commit": short_sha,
        "note": msg_first_line,
    })

    return changed


def process_commits(commits: list[tuple[str, str]], dry_run: bool) -> dict:
    """commits 리스트 처리. 결과 요약 반환."""
    if not TASKS_JSON.exists():
        print(f"[ERROR] tasks.json 없음: {TASKS_JSON}", file=sys.stderr)
        sys.exit(1)

    with TASKS_JSON.open() as f:
        data = json.load(f)

    tasks_by_id = {t["id"]: t for t in data.get("tasks", [])}
    summary = {
        "commits_scanned": len(commits),
        "task_updates": [],
        "unmatched_commits": [],
        "tasks_changed": 0,
    }

    for sha, msg in commits:
        # auto-detect-bot 자체 commit은 무시 (무한 루프 방지)
        # 첫 줄이 [bot-name]으로 시작할 때만 봇 commit으로 인정 (본문 우연 매칭 방지)
        first_line = msg.split("\n", 1)[0]
        BOT_PREFIX_PATTERN = re.compile(r"^\s*\[(auto-detect-bot|sync-bot|scan-bot)\]")
        if BOT_PREFIX_PATTERN.match(first_line):
            continue

        task_ids = extract_task_ids(msg)
        if not task_ids:
            summary["unmatched_commits"].append({"sha": sha[:7], "msg": msg.split("\n", 1)[0][:80]})
            continue

        intent = classify_intent(msg)

        for tid in task_ids:
            task = tasks_by_id.get(tid)
            if not task:
                # 존재하지 않는 작업 ID — 기록만 하고 패스
                summary["unmatched_commits"].append({
                    "sha": sha[:7],
                    "msg": f"작업 ID {tid} (tasks.json에 없음): {msg.split(chr(10), 1)[0][:60]}",
                })
                continue

            changed = update_task(task, intent, sha, msg)
            if changed:
                summary["tasks_changed"] += 1
            summary["task_updates"].append({
                "task_id": tid,
                "commit": sha[:7],
                "intent": intent,
                "new_status": task.get("status"),
                "changed": changed,
            })

    # stats 재계산 (헌법 단일 진실)
    if summary["tasks_changed"] > 0:
        all_tasks = data["tasks"]
        data.setdefault("stats", {})
        data["stats"]["total"] = len(all_tasks)
        data["stats"]["done"] = sum(1 for t in all_tasks if t.get("status") == "done")
        data["stats"]["in_progress"] = sum(1 for t in all_tasks if t.get("status") == "in_progress")
        data["stats"]["pending"] = sum(1 for t in all_tasks if t.get("status") == "pending")
        data["stats"]["blocked"] = sum(1 for t in all_tasks if t.get("status") == "blocked")
        data["updated_at"] = now_iso()

    if not dry_run and summary["tasks_changed"] > 0:
        with TASKS_JSON.open("w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"[OK] tasks.json 갱신 — {summary['tasks_changed']}건 변경")
    elif dry_run:
        print(f"[DRY-RUN] tasks.json 변경 없이 시뮬만 — {summary['tasks_changed']}건 변경 예정")
    else:
        print("[OK] 변경 사항 없음")

    return summary


def main():
    parser = argparse.ArgumentParser(
        description="commit message에서 작업 ID 자동 추출 + tasks.json status 갱신"
    )
    parser.add_argument(
        "--since-commit",
        help="이 commit 이후의 모든 commit 분석 (GitHub Actions에서 github.event.before)",
    )
    parser.add_argument(
        "--commit-msg",
        help="단일 commit 메시지 분석 (디버그용)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="tasks.json을 실제로 변경하지 않고 결과만 출력",
    )
    args = parser.parse_args()

    if args.commit_msg:
        # 디버그 모드: 단일 메시지
        commits = [("DEBUG_SHA_0000000", args.commit_msg)]
    elif args.since_commit:
        commits = get_commits_since(args.since_commit)
        if not commits:
            print("[INFO] 분석할 새 commit 없음")
            return 0
    else:
        # 기본: 최근 1개 commit
        result = subprocess.run(
            ["git", "log", "-1", "--format=%H%x00%B"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        parts = result.stdout.strip().split("\x00", 1)
        if len(parts) == 2:
            commits = [(parts[0].strip(), parts[1].strip())]
        else:
            print("[ERROR] HEAD commit 가져오기 실패", file=sys.stderr)
            return 1

    summary = process_commits(commits, args.dry_run)

    # 요약 출력
    print()
    print("=" * 60)
    print(f"📊 자동 매칭 요약")
    print(f"  - 스캔한 commit: {summary['commits_scanned']}개")
    print(f"  - 작업 업데이트: {len(summary['task_updates'])}건")
    print(f"  - tasks.json 변경: {summary['tasks_changed']}건")
    print(f"  - 매칭 안 된 commit: {len(summary['unmatched_commits'])}개")
    if summary["task_updates"]:
        print()
        print("✅ 매칭 결과:")
        for u in summary["task_updates"]:
            mark = "✓" if u["changed"] else " "
            print(f"  {mark} [{u['commit']}] {u['task_id']} → intent={u['intent']} → status={u['new_status']}")
    if summary["unmatched_commits"]:
        print()
        print("⚪ 매칭 안 된 commit:")
        for c in summary["unmatched_commits"][:10]:
            print(f"  [{c['sha']}] {c['msg']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
