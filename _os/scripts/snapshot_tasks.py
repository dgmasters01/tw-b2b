#!/usr/bin/env python3
"""
tw-b2b 백업 시스템 — tasks.json 변경 시 자동 스냅샷

사용법:
  python3 scripts/snapshot_tasks.py              # 일반 스냅샷
  python3 scripts/snapshot_tasks.py --checkpoint "Aurora Phase 1 시작 전"
  python3 scripts/snapshot_tasks.py --list       # 백업 목록 조회
  python3 scripts/snapshot_tasks.py --restore <filename>  # 복구

체크포인트 = 큰 작업 전 안전 지점.
대표님이 화면에서 "체크포인트로 되돌리기" 클릭 시 이 시스템이 사용됨.
"""
import json
import sys
import shutil
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent  # _os/scripts/ → _os/ → repo root (BL-OS-PHASE-2)
TASKS_FILE = REPO / 'tasks.json'
SNAPSHOTS_DIR = REPO / 'tasks_snapshots'
INDEX_FILE = SNAPSHOTS_DIR / 'index.json'


def ensure_dirs():
    SNAPSHOTS_DIR.mkdir(exist_ok=True)
    if not INDEX_FILE.exists():
        INDEX_FILE.write_text('{"snapshots": []}', encoding='utf-8')


def load_index():
    ensure_dirs()
    return json.loads(INDEX_FILE.read_text(encoding='utf-8'))


def save_index(idx):
    INDEX_FILE.write_text(
        json.dumps(idx, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )


def take_snapshot(checkpoint_label=None, auto=False):
    """현재 tasks.json을 스냅샷으로 보존"""
    if not TASKS_FILE.exists():
        print("⚠️ tasks.json 없음. 먼저 빌더 실행하세요.", file=sys.stderr)
        return None

    ensure_dirs()
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M%S")
    kind = 'checkpoint' if checkpoint_label else ('auto' if auto else 'manual')
    fname = f"{ts}_{kind}.json"
    dest = SNAPSHOTS_DIR / fname

    shutil.copy2(TASKS_FILE, dest)

    # 기록
    idx = load_index()
    snapshot_entry = {
        "filename": fname,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "kind": kind,
        "label": checkpoint_label or "",
        "size_bytes": dest.stat().st_size
    }
    # tasks.json에서 stats 추출
    try:
        data = json.loads(dest.read_text(encoding='utf-8'))
        snapshot_entry["stats"] = data.get('stats', {})
        snapshot_entry["task_count"] = len(data.get('tasks', []))
    except Exception:
        pass

    idx['snapshots'].append(snapshot_entry)

    # 자동 백업은 최근 30개만 유지 (디스크 보호)
    auto_snaps = [s for s in idx['snapshots'] if s['kind'] == 'auto']
    if len(auto_snaps) > 30:
        # 가장 오래된 자동 백업 삭제
        oldest = min(auto_snaps, key=lambda s: s['created_at'])
        old_path = SNAPSHOTS_DIR / oldest['filename']
        if old_path.exists():
            old_path.unlink()
        idx['snapshots'].remove(oldest)

    save_index(idx)

    label_text = f" [{checkpoint_label}]" if checkpoint_label else ""
    print(f"✅ 스냅샷 저장: {fname}{label_text}")
    return fname


def list_snapshots(limit=20):
    idx = load_index()
    snaps = sorted(idx['snapshots'], key=lambda s: s['created_at'], reverse=True)[:limit]
    if not snaps:
        print("(스냅샷 없음)")
        return
    print(f"=== 최근 {len(snaps)}개 스냅샷 ===")
    print(f"{'유형':<12}{'생성시각':<22}{'작업수':<6} {'라벨'}")
    print("-" * 80)
    for s in snaps:
        kind_emoji = {'checkpoint': '🚩', 'manual': '💾', 'auto': '🤖'}.get(s['kind'], '?')
        print(f"{kind_emoji} {s['kind']:<10}{s['created_at']:<22}{s.get('task_count','?'):<6} {s.get('label','')}")
        print(f"   파일: {s['filename']}")


def restore(filename):
    src = SNAPSHOTS_DIR / filename
    if not src.exists():
        print(f"❌ 스냅샷 없음: {filename}", file=sys.stderr)
        return False
    # 복구 전에 현재 상태도 백업
    take_snapshot(checkpoint_label=f"복구 직전 자동 백업 ({filename}으로 되돌리기 전)", auto=False)
    shutil.copy2(src, TASKS_FILE)
    print(f"✅ 복구 완료: {filename} → tasks.json")
    print(f"💡 복구 직전 상태도 자동 백업되었습니다 (실수해도 다시 되돌릴 수 있음)")
    return True


def main():
    args = sys.argv[1:]

    if not args:
        # 일반 스냅샷
        take_snapshot(auto=False)
        return

    if args[0] == '--list':
        list_snapshots()
        return

    if args[0] == '--checkpoint':
        if len(args) < 2:
            print("사용법: --checkpoint \"라벨\"", file=sys.stderr)
            sys.exit(1)
        take_snapshot(checkpoint_label=' '.join(args[1:]))
        return

    if args[0] == '--auto':
        take_snapshot(auto=True)
        return

    if args[0] == '--restore':
        if len(args) < 2:
            print("사용법: --restore <filename>", file=sys.stderr)
            list_snapshots(limit=10)
            sys.exit(1)
        ok = restore(args[1])
        sys.exit(0 if ok else 1)

    print(f"알 수 없는 명령: {args[0]}", file=sys.stderr)
    print(__doc__, file=sys.stderr)
    sys.exit(1)


if __name__ == '__main__':
    main()
