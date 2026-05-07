#!/usr/bin/env python3
"""
tw-b2b 역방향 빌더 — tasks.json → md 파일 자동 갱신

이 스크립트는 단일 진실 소스(tasks.json)에서 md 파일을 자동 재생성합니다.
대표님이 화면(admin-tasks.html)에서 작업을 수정하면 → tasks.json 변경 →
이 빌더 실행 → BACKLOG.md / CHANGELOG.md / SOLO_WORK_QUEUE.md 동기화.

기존 Project Status 정규식 호환을 위해 형식을 그대로 유지합니다.

사용법:
  python3 scripts/sync_md_from_tasks.py            # 모든 md 갱신
  python3 scripts/sync_md_from_tasks.py --dry-run  # 미리보기만
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
TASKS_FILE = REPO / 'tasks.json'

NOW = datetime.now(timezone.utc).strftime("%Y-%m-%d")


def load_tasks():
    return json.loads(TASKS_FILE.read_text(encoding='utf-8'))


def render_backlog(data):
    """BACKLOG.md 자동 생성 — 미해결 작업만"""
    pending = [t for t in data['tasks'] if t['status'] in ('pending', 'blocked', 'in_progress')]
    done = [t for t in data['tasks'] if t['status'] == 'done' and t['source'] == 'BACKLOG.md']

    lines = []
    lines.append("# TW B2B — 작업 백로그 (이슈 트래킹)")
    lines.append("")
    lines.append("> ⚠️ **이 파일은 자동 생성됩니다.** 수동 편집하지 마세요.")
    lines.append("> 변경은 `admin-tasks.html` 화면에서 → tasks.json 갱신 → 이 파일 자동 재생성")
    lines.append("> ")
    lines.append("> 단일 진실 소스: `tasks.json` (v" + data.get('version', '?') + ")")
    lines.append("")
    lines.append(f"**마지막 업데이트**: {NOW}")
    lines.append("")
    lines.append("> 💡 **새 채팅 시작 시**: 다음 5개 문서를 먼저 보면 즉시 컨텍스트 파악 가능.")
    lines.append("> ")
    lines.append("> | 문서 | 용도 |")
    lines.append("> |---|---|")
    lines.append("> | **BUSINESS.md** ⭐ | 사업 방향 / 정책 / 가격 / 환불 정책 |")
    lines.append("> | **DECISIONS.md** | 의사결정 변경 이력 |")
    lines.append("> | **BUSINESS_FLOW.md** | 사용자 여정 (가입 → 결제 → 6개월) |")
    lines.append("> | **tasks.json** ⭐ | 모든 작업 + 우선순위 + history (이 파일 자동 생성 소스) |")
    lines.append("> | **admin-tasks.html** | 작업관리 화면 (편집 UI) |")
    lines.append("")
    lines.append("---")
    lines.append("")

    # 우선순위별로 정렬
    priority_groups = {'P0': [], 'P1': [], 'P2': [], 'P3': []}
    for t in pending:
        priority_groups.setdefault(t.get('priority', 'P2'), []).append(t)

    for priority in ['P0', 'P1', 'P2', 'P3']:
        items = priority_groups.get(priority, [])
        if not items:
            continue

        for t in items:
            # Project Status 호환 마커
            if t['status'] == 'in_progress':
                marker = '⚡'
            elif t.get('autonomous', {}).get('can_run_alone'):
                marker = '🟢'
            elif t['status'] == 'blocked':
                marker = '🔴'
            else:
                marker = '🟡'

            lines.append(f"## {marker} {priority} — {t['title']}")
            lines.append("")
            if t.get('notes'):
                # 첫 200자만
                lines.append(f"**요약**: {t['notes'][:200]}")
                lines.append("")

            # 자율성 배지
            auto_info = t.get('autonomous', {})
            autonomy_label = "🟢 AUTO" if auto_info.get('can_run_alone') else ("🔴 BLOCKED" if t['status'] == 'blocked' else "🟡 SEMI")
            est = auto_info.get('estimated_hours') or '미정'
            lines.append(f"- **자율성**: {autonomy_label}")
            lines.append(f"- **예상 시간**: {est}시간")
            lines.append(f"- **카테고리**: {t.get('category', '-')}")
            lines.append(f"- **상태**: {t['status']}")
            if t.get('blocker'):
                lines.append(f"- **막힘 사유**: {t['blocker']}")
            if auto_info.get('requires_decisions_first'):
                lines.append(f"- **결정 필요**:")
                for d in auto_info['requires_decisions_first'][:3]:
                    lines.append(f"  - {d}")
            lines.append(f"- **ID**: `{t['id']}` (출처: {t.get('source', 'manual')})")
            lines.append("")
            lines.append("---")
            lines.append("")

    # DONE 섹션
    if done:
        lines.append("## ✅ DONE (자동 정리됨)")
        lines.append("")
        for t in done[-10:]:  # 최근 10개만
            lines.append(f"- [{t['id']}] {t['title']} ({t.get('completed_at', '?')[:10]})")
        lines.append("")

    return '\n'.join(lines) + '\n'


def render_changelog(data):
    """CHANGELOG.md 자동 생성 — done 작업의 history 기반"""
    done_tasks = [t for t in data['tasks'] if t['status'] == 'done' and t.get('phase')]
    # phase 기준 정렬 (역순)
    def phase_num(t):
        import re
        m = re.search(r'(\d+)', t.get('phase', ''))
        return int(m.group(1)) if m else 0
    done_tasks.sort(key=phase_num, reverse=True)

    lines = []
    lines.append("# TW B2B — CHANGELOG")
    lines.append("")
    lines.append("> ⚠️ **이 파일은 자동 생성됩니다.** 수동 편집하지 마세요.")
    lines.append(f"> 단일 진실 소스: `tasks.json` (v{data.get('version', '?')})")
    lines.append(f"> 마지막 갱신: {NOW}")
    lines.append("")
    lines.append("---")
    lines.append("")

    for t in done_tasks:
        date = t.get('completed_at', '')[:10] or t.get('created_at', '')[:10]
        phase = t.get('phase', '')
        tag = t.get('tag', '')
        title = t.get('title', '')

        lines.append(f"## {date} ({phase}) — [{tag}] {title}")
        lines.append("")

        if t.get('files_changed'):
            lines.append("### 변경 파일")
            for f in t['files_changed']:
                lines.append(f"- `{f}`")
            lines.append("")

        if t.get('commit'):
            lines.append(f"**Commit**: `{t['commit']}`")
            lines.append("")

        if t.get('notes') and t['notes'] != '':
            lines.append(f"**요약**: {t['notes'][:300]}")
            lines.append("")

        lines.append("---")
        lines.append("")

    return '\n'.join(lines) + '\n'


def render_solo_queue(data):
    """SOLO_WORK_QUEUE.md 자동 생성 — 자율 작업 큐"""
    autonomous = [t for t in data['tasks']
                  if t.get('claude_can_auto') and t['status'] in ('pending', 'in_progress', 'blocked')]
    # 우선순위 + 자율성으로 정렬
    autonomous.sort(key=lambda t: (
        t.get('priority', 'P9'),
        0 if t.get('autonomous', {}).get('can_run_alone') else 1
    ))

    lines = []
    lines.append("# TW B2B — 자율 작업 큐 (Solo Work Queue)")
    lines.append("")
    lines.append("> ⚠️ **이 파일은 자동 생성됩니다.** 수동 편집하지 마세요.")
    lines.append(f"> 단일 진실 소스: `tasks.json` (v{data.get('version', '?')})")
    lines.append(f"> **데드라인**: {data.get('deadline', '2026-05-03')}")
    lines.append(f"> **갱신**: {NOW}")
    lines.append(f"> **목적**: 대표님 외근/자리비움 시 Claude 자율 처리 가능 작업")
    lines.append("")
    lines.append("## 작업 분류 체계")
    lines.append("")
    lines.append("| 마크 | 의미 | Claude 자율 처리 |")
    lines.append("|---|---|---|")
    lines.append("| 🟢 **AUTO** | 즉시 자율 진행 가능 | ✅ |")
    lines.append("| 🟡 **SEMI** | 일부 자율, 디자인/문구는 보수적 | ✅ (검수 표시) |")
    lines.append("| 🔴 **BLOCKED** | 대표님 결정 후에만 진행 | ❌ |")
    lines.append("")
    lines.append("---")
    lines.append("")

    # 우선순위별 그룹
    by_priority = {}
    for t in autonomous:
        by_priority.setdefault(t.get('priority', 'P2'), []).append(t)

    priority_titles = {
        'P0': '🔥 P0 — 데드라인 직결 작업',
        'P1': '🟡 P1 — 데드라인 이전에 있으면 좋음',
        'P2': '🟢 P2 — 자투리 시간에',
        'P3': '⚪ P3 — 여유 시간'
    }

    for pri in ['P0', 'P1', 'P2', 'P3']:
        items = by_priority.get(pri, [])
        if not items:
            continue

        lines.append(f"## {priority_titles[pri]}")
        lines.append("")

        # 알파벳 라벨링
        for idx, t in enumerate(items):
            label = chr(ord('A') + idx) if idx < 26 else f"A{idx-25}"
            auto_info = t.get('autonomous', {})

            if auto_info.get('can_run_alone') and t['status'] != 'blocked':
                marker = '🟢'
                autonomy_word = 'AUTO'
            elif t['status'] == 'blocked':
                marker = '🔴'
                autonomy_word = 'BLOCKED'
            else:
                marker = '🟡'
                autonomy_word = 'SEMI'

            done_mark = ''
            if t['status'] == 'done':
                done_mark = f" ✅ **[DONE {t.get('completed_at', '?')[:10]}]**"

            lines.append(f"### {label}. {marker}{done_mark} {autonomy_word} — {t['title']}")
            lines.append("")
            lines.append(f"**ID**: `{t['id']}`  ")
            lines.append(f"**카테고리**: {t.get('category', '-')}  ")
            est = auto_info.get('estimated_hours') or '미정'
            lines.append(f"**예상 시간**: {est}시간  ")
            if t.get('blocker'):
                lines.append(f"**막힘 사유**: {t['blocker']}  ")
            if auto_info.get('requires_decisions_first'):
                lines.append(f"**결정 필요 사항**:")
                for d in auto_info['requires_decisions_first'][:3]:
                    lines.append(f"- {d[:150]}")
            if t.get('notes'):
                lines.append(f"")
                lines.append(f"**메모**: {t['notes'][:300]}")
            lines.append("")
            lines.append("---")
            lines.append("")

    return '\n'.join(lines) + '\n'


def main():
    dry_run = '--apply' not in sys.argv  # 기본은 dry-run, --apply 명시해야 적용
    data = load_tasks()

    targets = {
        'BACKLOG.md': render_backlog(data),
        'CHANGELOG.md': render_changelog(data),
        'SOLO_WORK_QUEUE.md': render_solo_queue(data)
    }

    if dry_run:
        print("=" * 60)
        print("⚠️ DRY-RUN 모드 (실제 파일은 변경되지 않음)")
        print("실제 적용하려면 --apply 플래그 추가하세요.")
        print("=" * 60)
        print()

    for fname, content in targets.items():
        path = REPO / fname
        if dry_run:
            print(f"=== {fname} (미리보기 첫 30줄) ===")
            for line in content.split('\n')[:30]:
                print(line)
            print(f"... (총 {len(content.split(chr(10)))}줄)")
            print()
        else:
            # 백업 생성 (자동)
            if path.exists():
                backup = REPO / f"{fname}.before_sync"
                backup.write_text(path.read_text(encoding='utf-8'), encoding='utf-8')
            path.write_text(content, encoding='utf-8')
            print(f"✅ {fname} 갱신 ({len(content.split(chr(10)))}줄, {len(content):,} bytes)")

    if not dry_run:
        print()
        print("💡 git diff로 변경사항 확인 후 commit 하세요.")
        print("💡 .before_sync 백업 파일은 검토 후 git에서 무시 또는 삭제.")
        print("💡 Project Status가 정상 표시되는지 라이브에서 검증 필수.")


if __name__ == '__main__':
    main()
