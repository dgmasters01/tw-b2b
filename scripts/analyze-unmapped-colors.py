#!/usr/bin/env python3
"""
미매핑 310종 분석 → §2 토큰 카테고리별 분류 + 신규 토큰 제안
"""
import re
import csv
import colorsys
from collections import Counter, defaultdict
from pathlib import Path

def hex_to_rgb(h):
    h = h.lstrip('#').lower()
    if len(h) == 3:
        h = ''.join(c*2 for c in h)
    if len(h) == 8:
        h = h[:6]
    if len(h) != 6:
        return None
    try:
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    except ValueError:
        return None

def rgb_to_hsl(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r/255, g/255, b/255)
    return h*360, s*100, l*100

def parse_rgba(s):
    """rgba(r,g,b,a) → (r,g,b,a)"""
    m = re.match(r'rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)', s, re.I)
    if not m:
        return None
    r, g, b = int(float(m.group(1))), int(float(m.group(2))), int(float(m.group(3)))
    a = float(m.group(4)) if m.group(4) else 1.0
    return (r, g, b, a)

def categorize(r, g, b, a=1.0):
    """RGB → 토큰 카테고리 추정"""
    h, s, l = rgb_to_hsl(r, g, b)
    
    # 투명도 있는 색은 Glass/Line 계열
    if a < 1.0:
        if r > 240 and g > 240 and b > 240:
            return 'glass-line-white'  # 흰색 알파 → glass/line
        elif r < 30 and g < 30 and b < 30:
            return 'shadow'  # 검정 알파 → shadow
        else:
            return 'tinted-overlay'  # 유색 알파 → 신규 카테고리
    
    # 무채색 (채도 < 10%)
    if s < 10:
        if l < 5: return 'surface-deepest'
        elif l < 15: return 'surface-bg'
        elif l < 25: return 'surface-bg2'
        elif l < 35: return 'surface-bg3'
        elif l < 50: return 'ink-5'  # 비활성
        elif l < 65: return 'ink-3-4'  # 메타
        elif l < 85: return 'ink-2'
        else: return 'ink'
    
    # 유채색 — Hue로 분류
    if 0 <= h < 15 or 345 <= h <= 360:
        return 'red-danger'
    elif 15 <= h < 45:
        return 'orange-warn'
    elif 45 <= h < 70:
        return 'yellow-ceo'
    elif 70 <= h < 165:
        return 'green-success-auto'
    elif 165 <= h < 200:
        return 'cyan-info'
    elif 200 <= h < 250:
        return 'blue-staff'
    elif 250 <= h < 290:
        return 'violet-aurora'
    elif 290 <= h < 345:
        return 'magenta-pink-aurora'
    return 'unknown'

# CSV에서 미매핑 색 로드
unmapped = []
with open('_os/playbook/admin-lightmode-color-map.csv', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['token'].startswith('⚠️'):
            unmapped.append(row)

# 색별 카테고리 + 빈도
categorized = defaultdict(lambda: defaultdict(list))  # cat → color → rows

for row in unmapped:
    color = row['original'].lower()
    
    if color.startswith('#'):
        rgb = hex_to_rgb(color)
        if rgb is None:
            categorized['invalid'][color].append(row)
            continue
        r, g, b = rgb
        cat = categorize(r, g, b)
        h, s, l = rgb_to_hsl(r, g, b)
        key = (color, round(h), round(s), round(l), 1.0)
    elif color.startswith('rgba') or color.startswith('rgb'):
        parsed = parse_rgba(color)
        if parsed is None:
            categorized['invalid'][color].append(row)
            continue
        r, g, b, a = parsed
        cat = categorize(r, g, b, a)
        h, s, l = rgb_to_hsl(r, g, b)
        key = (color, round(h), round(s), round(l), a)
    else:
        categorized['invalid'][color].append(row)
        continue
    
    categorized[cat][key].append(row)

# 카테고리별 출력
print("="*80)
print("미매핑 310종 카테고리 분류")
print("="*80)

for cat in ['surface-deepest','surface-bg','surface-bg2','surface-bg3',
            'ink','ink-2','ink-3-4','ink-5',
            'red-danger','orange-warn','yellow-ceo',
            'green-success-auto','cyan-info','blue-staff',
            'violet-aurora','magenta-pink-aurora',
            'glass-line-white','tinted-overlay','shadow','unknown','invalid']:
    if cat not in categorized:
        continue
    items = categorized[cat]
    total_uses = sum(len(rows) for rows in items.values())
    print(f"\n[{cat}] {len(items)}종 / 총 {total_uses}곳")
    # 빈도순 정렬
    sorted_items = sorted(items.items(), key=lambda x: -len(x[1]))
    for (color, h, s, l, a), rows in sorted_items[:15]:
        sample_sel = rows[0]['selector'][:40]
        sample_prop = rows[0]['property']
        print(f"  {len(rows):4}회  {color:24}  HSL({h:3},{s:3}%,{l:3}%)  α={a:.2f}  | {sample_prop:15} @ {sample_sel}")
    if len(sorted_items) > 15:
        print(f"  ... +{len(sorted_items)-15}종 더")
