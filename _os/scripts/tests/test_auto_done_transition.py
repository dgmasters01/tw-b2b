#!/usr/bin/env python3
"""
BL-IPB-AUTO-DONE — 100% 도달 시 status=done 자동 트랜지션 검증 스위트

작업: BL-IPB-AUTO-DONE
배경: BL-PROGRESS-AUTO-DONE-SYNC 단계 2 로직 (auto_detect_task_status.py L325~)이
      이미 박혀있음. 이 테스트는 회귀 방지용 영구 검증 스위트.

검증 시나리오 8개 / assertion 16개:
  [1] 정상: 마지막 [step:done:N] → 100% → status=done
  [2] 한 commit으로 여러 단계 박아서 100% 도달
  [3] 이미 done인 task 재진입 방어 (completed_at 보존)
  [4] 빈 steps list (total=0) 방어
  [5] dummy step (label 비어있음) 방어
  [6] 단일 단계 작업 (total=1)
  [7] step:done 태그 없는 일반 commit은 트랜지션 안 함
  [8] pending → in_progress → done 한 commit 점프

실행:
  python3 _os/scripts/tests/test_auto_done_transition.py
  → exit 0 if all pass, 1 if any fail (CI 게이트 가능)

부칙 7: 모든 작업은 progress.steps 박은 후 시작.
부칙 8: 자동 동기화 완성도 — 100% 도달 = done 자동 전환 (그림 일치 OS).
"""
import sys
from pathlib import Path

# 부모 디렉토리(_os/scripts) import path 추가
SCRIPT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPT_DIR))

import auto_detect_task_status as m  # noqa: E402

passed = 0
failed = 0


def check(name: str, cond: bool, detail: str = "") -> None:
    global passed, failed
    if cond:
        print(f"  ✅ {name}")
        passed += 1
    else:
        print(f"  ❌ {name} — {detail}")
        failed += 1


def run_tests() -> int:
    print("═" * 60)
    print("BL-IPB-AUTO-DONE 검증 — 100%→done 자동 트랜지션")
    print("═" * 60)

    # [1] 정상: 마지막 단계 박아서 100% 도달
    print("\n[1] 정상 케이스: 마지막 [step:done:N]으로 100% 도달")
    task = {
        "id": "BL-T1", "status": "in_progress", "history": [],
        "progress": {"steps": [
            {"label": "A", "done": True},
            {"label": "B", "done": True},
            {"label": "C", "done": False},
        ]},
    }
    m.update_task(task, "in_progress", "sha1234567", "fix(BL-T1): C 박음 [step:done:3]")
    check("status → done", task["status"] == "done")
    check("completed_at 박힘", task.get("completed_at") is not None)
    check("percent = 100", task["progress"]["percent"] == 100)
    check(
        "history에 100% 도달 이벤트",
        any("100%" in h.get("event", "") for h in task["history"]),
    )

    # [2] 한 commit으로 여러 단계 박기
    print("\n[2] [step:done:2,3]으로 한 번에 100% 도달")
    task = {
        "id": "BL-T2", "status": "in_progress", "history": [],
        "progress": {"steps": [
            {"label": "A", "done": True},
            {"label": "B", "done": False},
            {"label": "C", "done": False},
        ]},
    }
    m.update_task(task, "in_progress", "sha2", "fix(BL-T2): B + C [step:done:2,3]")
    check("status → done", task["status"] == "done")
    check(
        "done/total = 3/3",
        task["progress"]["completed_count"] == 3
        and task["progress"]["total_count"] == 3,
    )

    # [3] 이미 done — 재진입 방어
    print("\n[3] 이미 done인 task 재진입 방어")
    task = {
        "id": "BL-T3", "status": "done",
        "completed_at": "2026-01-01T00:00:00+00:00",
        "history": [],
        "progress": {"steps": [{"label": "A", "done": True}]},
    }
    prev_completed = task["completed_at"]
    m.update_task(task, "in_progress", "sha3", "fix(BL-T3): 추가 [step:done:1]")
    check("status 유지 (done)", task["status"] == "done")
    check("completed_at 변경 안 됨", task["completed_at"] == prev_completed)

    # [4] 빈 steps list 방어
    print("\n[4] 빈 steps list 방어 (total=0)")
    task = {
        "id": "BL-T4", "status": "in_progress", "history": [],
        "progress": {"steps": []},
    }
    m.update_task(task, "in_progress", "sha4", "fix(BL-T4): 그냥 commit")
    check("status 유지 (in_progress)", task["status"] == "in_progress")

    # [5] dummy step (label 비어있음)
    print("\n[5] dummy step (label='') 방어")
    task = {
        "id": "BL-T5", "status": "in_progress", "history": [],
        "progress": {"steps": [{"label": "", "done": False}]},
    }
    m.update_task(task, "in_progress", "sha5", "fix(BL-T5): 박음 [step:done:1]")
    check(
        "status 유지 (label 빈 step → 자동 전환 안 됨)",
        task["status"] == "in_progress",
    )

    # [6] 단일 단계 작업
    print("\n[6] 단일 단계 작업 (total=1)")
    task = {
        "id": "BL-T6", "status": "in_progress", "history": [],
        "progress": {"steps": [{"label": "한방 작업", "done": False}]},
    }
    m.update_task(task, "in_progress", "sha6", "fix(BL-T6): 한방 [step:done:1]")
    check("status → done", task["status"] == "done")
    check("percent = 100", task["progress"]["percent"] == 100)

    # [7] step:done 태그 없는 일반 commit
    print("\n[7] step:done 태그 없는 일반 commit")
    task = {
        "id": "BL-T7", "status": "in_progress", "history": [],
        "progress": {"steps": [
            {"label": "A", "done": True},
            {"label": "B", "done": True},
        ]},
    }
    m.update_task(task, "in_progress", "sha7", "fix(BL-T7): 일반 작업")
    check(
        "status 유지 (step_events 없으면 100% 검사 안 함)",
        task["status"] == "in_progress",
    )

    # [8] pending → done 한 commit
    print("\n[8] pending → in_progress → done 한 commit 점프")
    task = {
        "id": "BL-T8", "status": "pending", "history": [],
        "progress": {"steps": [{"label": "A", "done": False}]},
    }
    m.update_task(task, "in_progress", "sha8", "fix(BL-T8): 끝 [step:done:1]")
    check("status → done (pending 거쳐 done)", task["status"] == "done")
    check("started_at 박힘", task.get("started_at") is not None)
    check("completed_at 박힘", task.get("completed_at") is not None)

    print("\n" + "═" * 60)
    print(f"📊 결과: {passed} passed / {failed} failed")
    print("═" * 60)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(run_tests())
