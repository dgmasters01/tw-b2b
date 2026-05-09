#!/usr/bin/env python3
"""
BL-ADMIN-LIGHTMODE 2단계 — 하드코딩 색 추출 + §2 토큰 매핑

입력: admin-status.html, admin.html
출력: admin-lightmode-color-map.csv (페이지, 라인, 원본색, 매핑토큰, 컨텍스트)
"""
import re
import csv
import sys
from pathlib import Path

# ─────────────────────────────────────────────────────────────
# §2 토큰 룩업 테이블 (다크 모드 값 → 토큰명)
# 플레이북 §2-1 ~ §2-8 의 다크 컬럼을 정확히 매핑
# ─────────────────────────────────────────────────────────────

# hex (대소문자 무시, 비교는 소문자로)
HEX_TO_TOKEN = {
    # §2-1 Surface
    '#0a0a0f': '--bg',
    '#13131a': '--bg-2',
    '#1c1c26': '--bg-3',
    '#25252f': '--bg-4',
    # §2-4 Ink
    '#fafafa': '--ink',
    '#e5e5ee': '--ink-2',
    '#a0a0b0': '--ink-3',
    '#6e6e80': '--ink-4',
    '#52525c': '--ink-5',
    # §2-5 Status (dark)
    '#10b981': '--success',
    '#f59e0b': '--warn',
    '#ef4444': '--danger',
    '#06b6d4': '--info',
    # §2-6 3-State (dark)
    '#16a34a': '--auto',
    '#86efac': '--auto-text',
    '#2563eb': '--staff',
    '#93c5fd': '--staff-text',
    '#ca8a04': '--ceo',
    '#fcd34d': '--ceo-text',
    # §2-7 Aurora colors (gradient stops)
    '#7c3aed': '--aurora-1',  # purple
    '#ec4899': '--aurora-2',  # magenta
    # #f59e0b, #06b6d4 already in status — same hex reused
    # 변형 (자주 등장하는 근사값)
    '#fff': '--ink',  # white text on dark = ink
    '#ffffff': '--ink',
    '#000': '--bg',
    '#000000': '--bg',
}

# rgba 패턴 매핑 (정규화: 공백 제거, 소수점 정규화)
RGBA_TO_TOKEN = {
    # §2-2 Line (dark = white alpha)
    'rgba(255,255,255,.08)': '--line',
    'rgba(255,255,255,0.08)': '--line',
    'rgba(255,255,255,.14)': '--line-2',
    'rgba(255,255,255,0.14)': '--line-2',
    'rgba(255,255,255,.22)': '--line-3',
    'rgba(255,255,255,0.22)': '--line-3',
    # §2-3 Glass
    'rgba(255,255,255,.05)': '--glass',
    'rgba(255,255,255,0.05)': '--glass',
    'rgba(255,255,255,.08)': '--glass-2/--line',  # 모호 — 컨텍스트로 결정
    'rgba(255,255,255,.12)': '--glass-3',
    'rgba(255,255,255,0.12)': '--glass-3',
    'rgba(255,255,255,.18)': '--glass-4',
    'rgba(255,255,255,0.18)': '--glass-4',
    # §2-6 3-State 배경
    'rgba(22,163,74,.10)': '--auto-bg',
    'rgba(22,163,74,0.10)': '--auto-bg',
    'rgba(22,163,74,.1)': '--auto-bg',
    'rgba(96,165,250,.10)': '--staff-bg',
    'rgba(96,165,250,0.10)': '--staff-bg',
    'rgba(251,191,36,.10)': '--ceo-bg',
    'rgba(251,191,36,0.10)': '--ceo-bg',
    # §2-8 Shadow alpha
    'rgba(0,0,0,.4)': '--sh-shadow-strong',
    'rgba(0,0,0,0.4)': '--sh-shadow-strong',
    'rgba(0,0,0,.6)': '--sh-shadow-deep',
    'rgba(0,0,0,0.6)': '--sh-shadow-deep',
}

# ─────────────────────────────────────────────────────────────
# 정규식
# ─────────────────────────────────────────────────────────────
HEX_RE = re.compile(r'#([0-9a-fA-F]{3,8})\b')
RGBA_RE = re.compile(r'rgba?\s*\(\s*([\d.\s,]+)\s*\)', re.IGNORECASE)
SELECTOR_RE = re.compile(r'^\s*([^\s{};/*][^{};]*)\s*\{')  # CSS selector 시작 줄
PROPERTY_RE = re.compile(r'(\b[a-z-]+)\s*:\s*[^;]*$', re.IGNORECASE)

def normalize_rgba(s):
    """rgba 문자열 정규화: 공백 제거, 0.x → .x"""
    s = re.sub(r'\s+', '', s)
    s = re.sub(r'\b0\.(\d)', r'.\1', s)
    return s.lower()

def normalize_hex(s):
    """hex 정규화: 소문자, 3자리 → 6자리 변환은 룩업 시점에 처리"""
    return s.lower()

def lookup_hex(hex_str):
    """hex 토큰 룩업 (3자리 → 6자리 fallback)"""
    h = normalize_hex(hex_str)
    if h in HEX_TO_TOKEN:
        return HEX_TO_TOKEN[h]
    # 3자리 → 6자리 확장
    if re.match(r'#[0-9a-f]{3}$', h):
        expanded = '#' + ''.join(c*2 for c in h[1:])
        if expanded in HEX_TO_TOKEN:
            return HEX_TO_TOKEN[expanded]
    # 8자리 (alpha 포함) → 6자리만 매칭
    if re.match(r'#[0-9a-f]{8}$', h):
        if h[:7] in HEX_TO_TOKEN:
            return HEX_TO_TOKEN[h[:7]] + ' (+alpha)'
    return None

def lookup_rgba(rgba_str):
    """rgba 토큰 룩업"""
    n = normalize_rgba(rgba_str)
    return RGBA_TO_TOKEN.get(n)

def extract_colors_from_file(filepath, page_name):
    """파일에서 모든 색 추출 + 컨텍스트 추적"""
    rows = []
    current_selector = '(unknown)'
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    for lineno, line in enumerate(lines, 1):
        # selector 추적 (CSS 블록 시작)
        sel_match = SELECTOR_RE.match(line)
        if sel_match and '{' in line:
            sel = sel_match.group(1).strip()
            # 너무 긴 선택자는 자르기
            if len(sel) < 80 and not sel.startswith('//'):
                current_selector = sel
        
        # 속성 추출 (color, background, border 등)
        prop_match = re.search(r'(\b(?:color|background(?:-color)?|border(?:-[a-z]+)?|fill|stroke|box-shadow|outline|caret-color|text-shadow)\b)\s*:', line, re.IGNORECASE)
        prop = prop_match.group(1).lower() if prop_match else '?'
        
        # rgba 먼저 (hex가 rgba 안에 들어있을 수 있음)
        for rgba_match in RGBA_RE.finditer(line):
            full = rgba_match.group(0)
            token = lookup_rgba(full)
            rows.append({
                'page': page_name,
                'line': lineno,
                'original': full,
                'token': token or '⚠️ 미매핑',
                'property': prop,
                'selector': current_selector[:60],
            })
        
        # hex (단, rgba 밖에 있는 것만 — 위 rgba 제거 후 검색)
        line_no_rgba = RGBA_RE.sub('', line)
        for hex_match in HEX_RE.finditer(line_no_rgba):
            full = hex_match.group(0)
            token = lookup_hex(full)
            rows.append({
                'page': page_name,
                'line': lineno,
                'original': full,
                'token': token or '⚠️ 미매핑',
                'property': prop,
                'selector': current_selector[:60],
            })
    
    return rows

def main():
    out_path = Path('_os/playbook/admin-lightmode-color-map.csv')
    out_path.parent.mkdir(parents=True, exist_ok=True)
    
    all_rows = []
    
    for filename, pagename in [
        ('admin-status.html', 'admin-status'),
        ('admin.html', 'admin'),
    ]:
        if not Path(filename).exists():
            print(f"⚠️  {filename} 없음", file=sys.stderr)
            continue
        rows = extract_colors_from_file(filename, pagename)
        print(f"  {pagename}: {len(rows)}곳")
        all_rows.extend(rows)
    
    # CSV 출력
    with open(out_path, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['page', 'line', 'original', 'token', 'property', 'selector'])
        w.writeheader()
        w.writerows(all_rows)
    
    # 집계
    total = len(all_rows)
    mapped = sum(1 for r in all_rows if not r['token'].startswith('⚠️'))
    unmapped = total - mapped
    
    print(f"\n총 {total}곳 / 매핑 {mapped} ({mapped*100//total if total else 0}%) / 미매핑 {unmapped}")
    print(f"CSV 저장: {out_path}")
    
    # 토큰별 사용 빈도
    from collections import Counter
    token_counts = Counter(r['token'] for r in all_rows)
    print("\n— 토큰별 사용 빈도 (상위 20) —")
    for token, cnt in token_counts.most_common(20):
        print(f"  {cnt:5}  {token}")
    
    # 미매핑 색 상위
    unmapped_colors = Counter(r['original'].lower() for r in all_rows if r['token'].startswith('⚠️'))
    print(f"\n— 미매핑 색 상위 20 (총 {len(unmapped_colors)}종) —")
    for color, cnt in unmapped_colors.most_common(20):
        print(f"  {cnt:5}  {color}")

if __name__ == '__main__':
    main()
