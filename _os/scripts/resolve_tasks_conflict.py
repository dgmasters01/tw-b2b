#!/usr/bin/env python3
"""tasks.json git rebase 충돌 자동 해결 (재사용 가능).

규칙:
- updated_at 충돌 → ours(우리 commit) 채택 (더 최근).
- history 객체 충돌 → 둘 다 보존 (시간순으로 박음).
- JSON 정합 보장.
"""
import json
import sys

def resolve():
    with open('tasks.json') as f:
        text = f.read()

    # 충돌 마커 없으면 종료
    if '<<<<<<<' not in text:
        print('no conflict')
        return 0

    lines = text.split('\n')
    out = []
    i = 0
    while i < len(lines):
        L = lines[i]
        if L.startswith('<<<<<<<'):
            head_block, ours_block = [], []
            i += 1
            while i < len(lines) and not lines[i].startswith('======='):
                head_block.append(lines[i]); i += 1
            i += 1  # skip =======
            while i < len(lines) and not lines[i].startswith('>>>>>>>'):
                ours_block.append(lines[i]); i += 1
            i += 1  # skip >>>>>>>

            joined_head = '\n'.join(head_block)
            joined_ours = '\n'.join(ours_block)

            # 단순 updated_at 한 줄 충돌 (event 키 없음) → ours 채택 (더 최근)
            if 'updated_at' in joined_head and 'updated_at' in joined_ours and 'event' not in joined_head and 'event' not in joined_ours:
                out.extend(ours_block)
            else:
                # history 항목 둘 다 보존
                # head_block 마지막을 정리:
                #   - } 로 끝나면 } + ','
                #   - "..." 로 끝나면 (마지막 키:값) → } 로 객체 닫고 ',' 박기
                if head_block:
                    last = head_block[-1].rstrip()
                    # 자동 판단: 마지막 줄이 } 이면 콤마만, 아니면 객체 닫음 + 콤마 + 다음 객체 열음
                    # 근데 ours_block 첫 줄이 보통 "key": "value" 형태라 객체 열림 { 가 빠짐
                    # → 가장 안전: head 끝에 객체 닫고 ours 첫 줄 앞에 객체 열음
                    if last.endswith('}'):
                        head_block[-1] = head_block[-1].rstrip() + ','
                    else:
                        # 들여쓰기 추출
                        indent = head_block[-1][:len(head_block[-1]) - len(head_block[-1].lstrip())]
                        # head_block에 객체 닫음 + 콤마
                        head_block.append(indent[:-2] + '},')  # 한 단계 위 들여쓰기
                        # ours_block 첫 줄 앞에 객체 열음
                        if ours_block and not ours_block[0].lstrip().startswith('{'):
                            indent2 = ours_block[0][:len(ours_block[0]) - len(ours_block[0].lstrip())]
                            ours_block.insert(0, indent2[:-2] + '{')
                out.extend(head_block)
                out.extend(ours_block)
        else:
            out.append(L); i += 1

    new_text = '\n'.join(out)
    with open('tasks.json', 'w') as f:
        f.write(new_text)

    # JSON 정합 검증
    try:
        with open('tasks.json') as f:
            data = json.load(f)
        print(f'OK — total tasks: {len(data["tasks"])}')
        return 0
    except json.JSONDecodeError as e:
        print(f'JSON ERROR after auto-resolve: {e}')
        # 디버그 — 에러 줄 주변 출력
        with open('tasks.json') as f:
            ls = f.readlines()
        line = e.lineno
        for k in range(max(0, line-3), min(len(ls), line+3)):
            mark = '>>>' if k+1 == line else '   '
            print(f'{mark} {k+1}: {ls[k].rstrip()}')
        return 1

if __name__ == '__main__':
    sys.exit(resolve())
