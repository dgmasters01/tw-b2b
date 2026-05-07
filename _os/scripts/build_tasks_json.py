#!/usr/bin/env python3
"""
tw-b2b 통합 빌더 v2 — BACKLOG.md / CHANGELOG.md / SOLO_WORK_QUEUE.md
                    → tasks.json (단일 진실 소스, history 보존)

이 스크립트는 기존 md 파일들을 깨지 않고 읽기만 합니다.
기존 Project Status 정규식 호환성 100% 유지.
"""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent  # _os/scripts/ → _os/ → repo root (BL-OS-PHASE-2)  # tw-b2b/
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# ============================================================
# CHANGELOG.md 파싱 (완료 작업 + history 추출)
# ============================================================
def parse_changelog(text):
    """## 2026-MM-DD (N차) — [태그] 제목  → done 작업으로 변환"""
    tasks = []
    # ## 2026-05-02 (25차) — [UX통일/리팩터] 제목
    pattern = re.compile(
        r'^## (\d{4}-\d{2}-\d{2})\s+\(([^)]+)\)\s*[—–-]\s*(?:\[([^\]]+)\]\s*)?(.+)$',
        re.MULTILINE
    )
    sections = []
    for m in pattern.finditer(text):
        sections.append({
            'date': m.group(1),
            'phase': m.group(2),
            'tag': m.group(3) or '',
            'title': m.group(4).strip(),
            'start': m.start()
        })
    # 각 섹션의 본문 추출
    for i, sec in enumerate(sections):
        end = sections[i+1]['start'] if i+1 < len(sections) else len(text)
        body = text[sec['start']:end]

        # 카테고리 추론
        tag = sec['tag'].lower()
        category = 'dev'
        if 'P0' in tag or 'p0' in tag: priority_hint = 'P0'
        else: priority_hint = 'P1'
        if any(k in tag for k in ['버그', '핫픽스', 'hotfix', 'bug', 'fix']): category = 'bug'
        elif any(k in tag for k in ['디자인', 'design', 'ui', 'ux']): category = 'ux'
        elif any(k in tag for k in ['리팩', 'refactor']): category = 'dev'
        elif any(k in tag for k in ['문서', 'docs', 'chore']): category = 'docs'
        elif any(k in tag for k in ['기능', 'feat', '추가']): category = 'dev'
        elif any(k in tag for k in ['디자인시스템']): category = 'design'

        # 차수 ID
        phase_match = re.search(r'(\d+)\s*차', sec['phase'])
        chg_id = f"CHG-{phase_match.group(1)}" if phase_match else f"CHG-{sec['phase']}"

        # commit 추출 시도
        commit_m = re.search(r'`?([a-f0-9]{7,40})`?', body[:2000])
        commit = commit_m.group(1) if commit_m else None

        # 변경 파일 추출
        files = []
        for fm in re.finditer(r'`([a-zA-Z0-9_/.-]+\.(?:html|js|css|md|json|sql))`', body[:3000]):
            f = fm.group(1)
            if f not in files and len(files) < 10:
                files.append(f)

        tasks.append({
            "id": chg_id,
            "title": sec['title'],
            "category": category,
            "status": "done",
            "priority": priority_hint,
            "size": "medium",
            "parent_task": None,
            "blocker": None,
            "created_at": f"{sec['date']}T00:00:00Z",
            "completed_at": f"{sec['date']}T23:59:59Z",
            "claude_can_auto": True,
            "autonomous": {
                "can_run_alone": True,
                "estimated_hours": None,
                "requires_decisions_first": []
            },
            "progress": None,
            "tag": sec['tag'],
            "phase": sec['phase'],
            "commit": commit,
            "files_changed": files,
            "history": [
                {
                    "at": f"{sec['date']}T00:00:00Z",
                    "event": "created",
                    "by": "claude",
                    "note": f"CHANGELOG에서 추출 ({sec['phase']})"
                },
                {
                    "at": f"{sec['date']}T23:59:59Z",
                    "event": "done",
                    "by": "claude",
                    "commit": commit,
                    "note": sec['tag']
                }
            ],
            "source": "CHANGELOG.md",
            "source_anchor": f"#L{text[:sec['start']].count(chr(10))+1}",
            "notes": ""
        })
    return tasks


# ============================================================
# BACKLOG.md 파싱 (미해결 작업)
# ============================================================
def parse_backlog(text):
    """## 🔴 P0 — 제목 / ## ✅ [DONE ...] P0 — 제목 패턴"""
    tasks = []
    lines = text.split('\n')

    # ## (이모지) (DONE 마크?) (우선순위) — 제목
    section_pattern = re.compile(
        r'^##\s+(?:([🔴🟡🟢⚫⏳🚀🔒✅])\s*)?(?:\[DONE([^\]]*)\]\s*)?(P[0-3])?\s*[—–-]?\s*(.+)$'
    )

    sections = []
    for i, line in enumerate(lines):
        m = section_pattern.match(line)
        if m:
            emoji, done_mark, pri, title = m.groups()
            # 제목에서 이모지/별표/날짜 제거
            title_clean = re.sub(r'[⭐]+', '', title or '').strip()
            title_clean = re.sub(r'\s*20\d{2}-\d{2}-\d{2}\s*$', '', title_clean).strip()

            # 무의미한 섹션 헤더 제외
            if not title_clean or title_clean.upper() == 'DONE':
                continue

            sections.append({
                'line': i+1,
                'emoji': emoji or '',
                'done_mark': done_mark,
                'priority': pri,
                'title': title_clean,
                'start_line_idx': i
            })

    bl_idx = 1
    for i, sec in enumerate(sections):
        end_idx = sections[i+1]['start_line_idx'] if i+1 < len(sections) else len(lines)
        body = '\n'.join(lines[sec['start_line_idx']:end_idx])

        is_done = bool(sec['done_mark'])

        # 자율성 추론 (Project Status 호환 정규식과 동일하게)
        autonomy = 'blocked'
        if re.search(r'🟢|AUTO|자율', body[:1000]): autonomy = 'auto'
        elif re.search(r'🟡|SEMI', body[:1000]): autonomy = 'semi'

        # 예상 시간 추출
        hour_m = re.search(r'예상\s*(?:작업\s*)?시간[:\s]*([0-9]+(?:[.\-~][0-9]+)?)\s*시간', body[:2000])
        est_hours = hour_m.group(1) if hour_m else None

        # 카테고리 추론
        title_lower = sec['title'].lower()
        if any(k in title_lower for k in ['디자인', 'sales.html', 'marketing.html']): category = 'design'
        elif any(k in title_lower for k in ['버그', 'bug', '에러', '오류', '누락']): category = 'bug'
        elif any(k in title_lower for k in ['ux', 'ui', '경고']): category = 'ux'
        elif any(k in title_lower for k in ['보안', '토큰', '인프라', 'vercel']): category = 'infra'
        elif any(k in title_lower for k in ['문서', 'readme']): category = 'docs'
        else: category = 'dev'

        # ID
        if is_done:
            task_id = f"BL-DONE-{bl_idx:03d}"
        else:
            task_id = f"BL-{bl_idx:03d}"
        bl_idx += 1

        priority = sec['priority'] or 'P2'

        # 결정 필요 항목 추출
        decisions = []
        if autonomy in ('blocked', 'semi'):
            for dm in re.finditer(r'\d+\.\s+([^\n]{10,150})', body[:2500]):
                if any(k in dm.group(1) for k in ['결정', '선택', '?', '톤', '디자인']):
                    decisions.append(dm.group(1).strip())
                    if len(decisions) >= 3: break

        history = [{
            "at": NOW,
            "event": "imported",
            "by": "claude-builder",
            "note": f"BACKLOG.md L{sec['line']}에서 추출"
        }]
        if is_done:
            history.append({
                "at": NOW,
                "event": "done",
                "by": "claude-builder",
                "note": "DONE 마크 발견"
            })

        tasks.append({
            "id": task_id,
            "title": sec['title'],
            "category": category,
            "status": "done" if is_done else ("blocked" if autonomy == 'blocked' else "pending"),
            "priority": priority,
            "size": "medium",
            "parent_task": None,
            "blocker": "대표님 결정 대기" if autonomy == 'blocked' and not is_done else None,
            "created_at": NOW,
            "completed_at": NOW if is_done else None,
            "claude_can_auto": autonomy in ('auto', 'semi'),
            "autonomous": {
                "can_run_alone": autonomy == 'auto',
                "estimated_hours": est_hours,
                "requires_decisions_first": decisions
            },
            "progress": None,
            "tag": "",
            "commit": None,
            "files_changed": [],
            "history": history,
            "source": "BACKLOG.md",
            "source_anchor": f"#L{sec['line']}",
            "notes": body[:500].replace('\n', ' ').strip()
        })
    return tasks


# ============================================================
# SOLO_WORK_QUEUE.md 파싱 (외근 작업 큐)
# ============================================================
def parse_solo_queue(text):
    """### A. 🟢 ✅ [DONE 2026-04-30 — 11차] AUTO — 제목 패턴"""
    tasks = []
    lines = text.split('\n')

    # ### A. 🟢 / 🟡 / 🔴 (✅ [DONE...])? AUTO/SEMI/BLOCKED — 제목
    section_pattern = re.compile(
        r'^###\s+([A-Z])\.\s*([🟢🟡🔴])\s*(✅\s*\*\*\[DONE\s+([^\]]*)\]\*\*)?\s*(AUTO|SEMI|BLOCKED)?\s*[—–-]?\s*(.+)$'
    )

    sections = []
    for i, line in enumerate(lines):
        m = section_pattern.match(line)
        if m:
            letter, color, done_block, done_info, autonomy_word, title = m.groups()
            sections.append({
                'line': i+1,
                'letter': letter,
                'color': color,
                'is_done': bool(done_block),
                'done_info': done_info,
                'autonomy_word': autonomy_word or '',
                'title': title.strip(),
                'start_line_idx': i
            })

    sq_idx = 1
    for i, sec in enumerate(sections):
        end_idx = sections[i+1]['start_line_idx'] if i+1 < len(sections) else len(lines)
        body = '\n'.join(lines[sec['start_line_idx']:end_idx])

        # 자율성
        if sec['color'] == '🟢' or sec['autonomy_word'] == 'AUTO': autonomy = 'auto'
        elif sec['color'] == '🟡' or sec['autonomy_word'] == 'SEMI': autonomy = 'semi'
        else: autonomy = 'blocked'

        # 예상 시간
        hour_m = re.search(r'예상\s*시간[:\s]*([0-9]+(?:[.\-~][0-9]+)?)\s*시간', body[:1500])
        est_hours = hour_m.group(1) if hour_m else None

        # 카테고리
        title_lower = sec['title'].lower()
        if any(k in title_lower for k in ['디자인', 'sales', 'marketing']): category = 'design'
        elif any(k in title_lower for k in ['버그', 'bug', '수정']): category = 'bug'
        elif any(k in title_lower for k in ['보안', '토큰', '인프라']): category = 'infra'
        elif any(k in title_lower for k in ['readme', '문서']): category = 'docs'
        else: category = 'dev'

        # 우선순위 (헤더 부근에서 P0/P1 추론)
        priority = 'P1'
        # 큐 섹션 위치(P0/P1/P2 헤더 찾기)
        for j in range(sec['start_line_idx'], max(0, sec['start_line_idx']-30), -1):
            if 'P0' in lines[j]: priority = 'P0'; break
            if 'P1' in lines[j]: priority = 'P1'; break
            if 'P2' in lines[j]: priority = 'P2'; break

        # ID
        if sec['is_done']:
            task_id = f"SQ-DONE-{sec['letter']}"
        else:
            task_id = f"SQ-{sec['letter']}"

        history = [{
            "at": NOW,
            "event": "imported",
            "by": "claude-builder",
            "note": f"SOLO_WORK_QUEUE.md L{sec['line']}에서 추출"
        }]
        if sec['is_done']:
            history.append({
                "at": NOW,
                "event": "done",
                "by": "claude-builder",
                "note": sec['done_info']
            })

        tasks.append({
            "id": task_id,
            "title": sec['title'],
            "category": category,
            "status": "done" if sec['is_done'] else ("blocked" if autonomy == 'blocked' else "pending"),
            "priority": priority,
            "size": "medium",
            "parent_task": None,
            "blocker": "대표님 결정 대기" if autonomy == 'blocked' and not sec['is_done'] else None,
            "created_at": NOW,
            "completed_at": NOW if sec['is_done'] else None,
            "claude_can_auto": autonomy in ('auto', 'semi'),
            "autonomous": {
                "can_run_alone": autonomy == 'auto',
                "estimated_hours": est_hours,
                "requires_decisions_first": []
            },
            "progress": None,
            "tag": sec['autonomy_word'],
            "commit": None,
            "files_changed": [],
            "history": history,
            "source": "SOLO_WORK_QUEUE.md",
            "source_anchor": f"#L{sec['line']}",
            "notes": body[:400].replace('\n', ' ').strip()
        })
        sq_idx += 1
    return tasks


# ============================================================
# 중복 제거 (제목 유사도 기반)
# ============================================================
def dedupe(tasks):
    """동일하거나 매우 유사한 제목은 우선순위가 높은 source 하나만 남김.
    우선순위: CHANGELOG > BACKLOG > SOLO_WORK_QUEUE
    """
    seen_titles = {}
    SOURCE_RANK = {'CHANGELOG.md': 0, 'BACKLOG.md': 1, 'SOLO_WORK_QUEUE.md': 2}

    def normalize(title):
        return re.sub(r'\s+', '', title.lower())

    result = []
    for t in tasks:
        key = normalize(t['title'])[:30]  # 첫 30자 비교
        if key in seen_titles:
            existing_idx = seen_titles[key]
            # source 우선순위 비교
            existing = result[existing_idx]
            if SOURCE_RANK.get(t['source'], 9) < SOURCE_RANK.get(existing['source'], 9):
                # 새 것이 더 높은 우선순위 → 교체하되 history 병합
                t['history'] = existing['history'] + t['history']
                result[existing_idx] = t
            else:
                # 기존 것 유지하되 history만 병합
                existing['history'].extend(t['history'])
        else:
            seen_titles[key] = len(result)
            result.append(t)
    return result


# ============================================================
# 진행 중 작업 (수동 추가)
# ============================================================
def add_in_progress(tasks):
    tasks.append({
        "id": "IP-CTRL-001",
        "title": "TW B2B 중앙 작업 관리 시스템 구축 (1단계: 데이터 통합 + 백업)",
        "category": "dev",
        "status": "in_progress",
        "priority": "P0",
        "size": "large",
        "parent_task": "task-management-system",
        "blocker": None,
        "created_at": "2026-05-02T07:00:00Z",
        "completed_at": None,
        "claude_can_auto": True,
        "autonomous": {
            "can_run_alone": True,
            "estimated_hours": "2",
            "requires_decisions_first": []
        },
        "progress": {
            "current_step": 2,
            "total_steps": 5,
            "checkpoint": "데이터 통합 빌더 작성 완료",
            "last_commit": None,
            "resume_hint": "tasks.json 첫 빌드 + 백업 시스템 구축 단계"
        },
        "tag": "",
        "commit": None,
        "files_changed": ["scripts/build_tasks_json.py", "tasks.json"],
        "history": [
            {
                "at": "2026-05-02T07:00:00Z",
                "event": "created",
                "by": "claude",
                "note": "대표님 요구: 한 곳 통합 + 외근 자율 + 백업/롤백"
            },
            {
                "at": "2026-05-02T07:30:00Z",
                "event": "in_progress",
                "by": "claude",
                "note": "데이터 통합 빌더 작성"
            }
        ],
        "source": "manual",
        "source_anchor": "",
        "notes": "1단계 완료 후 다음 채팅에서 화면 통합 + 자율 큐 + 진행률 + 롤백 UI 작업"
    })
    return tasks


# ============================================================
# 메인
# ============================================================
def main():
    bl_text = (REPO / 'BACKLOG.md').read_text(encoding='utf-8')
    cl_text = (REPO / 'CHANGELOG.md').read_text(encoding='utf-8')
    sq_text = (REPO / 'SOLO_WORK_QUEUE.md').read_text(encoding='utf-8')

    tasks = []
    tasks.extend(parse_changelog(cl_text))
    tasks.extend(parse_backlog(bl_text))
    tasks.extend(parse_solo_queue(sq_text))

    print(f"파싱 완료: CHANGELOG {sum(1 for t in tasks if t['source']=='CHANGELOG.md')}개, "
          f"BACKLOG {sum(1 for t in tasks if t['source']=='BACKLOG.md')}개, "
          f"SOLO {sum(1 for t in tasks if t['source']=='SOLO_WORK_QUEUE.md')}개", file=sys.stderr)

    tasks = dedupe(tasks)
    print(f"중복 제거 후: {len(tasks)}개", file=sys.stderr)

    tasks = add_in_progress(tasks)

    # 통계
    from collections import Counter
    status_count = Counter(t['status'] for t in tasks)
    autonomy_count = Counter('auto' if t['claude_can_auto'] else 'manual' for t in tasks)
    print(f"상태 분포: {dict(status_count)}", file=sys.stderr)
    print(f"자율성: {dict(autonomy_count)}", file=sys.stderr)

    out = {
        "version": "2.0",
        "schema": "tw-b2b-tasks-v2",
        "updated_at": NOW,
        "deadline": "2026-05-03",
        "live_url": "https://gohotelwinners.com",
        "repo": "dgmasters01/tw-b2b",
        "head_commit": None,  # 빌드 시점에 채워짐
        "sources": ["CHANGELOG.md", "BACKLOG.md", "SOLO_WORK_QUEUE.md"],
        "stats": {
            "total": len(tasks),
            "done": sum(1 for t in tasks if t['status'] == 'done'),
            "in_progress": sum(1 for t in tasks if t['status'] == 'in_progress'),
            "pending": sum(1 for t in tasks if t['status'] == 'pending'),
            "blocked": sum(1 for t in tasks if t['status'] == 'blocked'),
            "autonomous_ready": sum(1 for t in tasks if t['claude_can_auto'] and t['status'] in ('pending', 'in_progress'))
        },
        "tasks": tasks
    }

    output_path = REPO / 'tasks.json'
    output_path.write_text(
        json.dumps(out, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print(f"✅ tasks.json 저장: {output_path} ({output_path.stat().st_size:,} bytes)", file=sys.stderr)
    print(f"📊 stats: {out['stats']}", file=sys.stderr)


if __name__ == '__main__':
    main()
