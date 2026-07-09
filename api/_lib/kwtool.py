#!/usr/bin/env python3
# kwtool.py — 유튜브 키워드 리서치 도구
#
# 하는 일 두 가지
#   ① 유튜브 자동완성 API 호출 → 수요를 안다
#   ② 유튜브 검색결과 HTML 읽기 → 경쟁(영상 수)을 안다
# 둘 다 유튜브가 공개해둔 것이라 무료. 외부 라이브러리 없이 표준 모듈만 쓴다.
#
# 규격 근거: _content/youtube/여행능력자들.md §7 (키워드 리서치 방법)
#
# ── 쓰는 법 ────────────────────────────────────────────────
#   python3 kwtool.py suggest  "오사카 호텔"
#   python3 kwtool.py comp     "오사카 가성비 호텔"
#   python3 kwtool.py harvest  "오사카 호텔" --depth 1
#   python3 kwtool.py analyze  "오사카 호텔" "난바 호텔" --csv 오사카.csv
#   python3 kwtool.py analyze  --file 키워드목록.txt --csv 결과.csv
#   python3 kwtool.py pair     "오사카 가성비 호텔"      # 띄어쓰기/붙여쓰기 대조
#
# ── 검증된 사실 (문서 §7) ──────────────────────────────────
#   · 자동완성은 띄어쓰기를 구분한다
#   · 경쟁 영상 수는 띄어쓰기를 정규화한다 (±20% 노이즈)
#   · 3어절 이상부터 붙여쓰기가 실제로 갈린다
#     예) 오사카 가성비 호텔 151,394  vs  오사카가성비호텔 14,554
#   · 자동완성에 없는 어형은 죽은 키워드다. 버린다.

import argparse
import csv
import json
import math
import random
import re
import sys
import time
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

SUGGEST_URL = "https://suggestqueries.google.com/complete/search"
SEARCH_URL = "https://www.youtube.com/results"

# 한글 자모 — 자동완성을 넓게 훑을 때 붙인다
JAMO = list("ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ")


def _get(url, retries=3):
    """느긋하게 가져온다. 실패하면 잠깐 쉬고 다시."""
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA,
                                                       "Accept-Language": "ko-KR,ko;q=0.9"})
            with urllib.request.urlopen(req, timeout=15) as r:
                return r.read()
        except Exception as e:
            if i == retries - 1:
                raise
            time.sleep(1.5 * (i + 1))
    return b""


def polite_sleep():
    """유튜브에 예의를 지킨다. 너무 빨리 두드리면 막힌다."""
    time.sleep(random.uniform(0.6, 1.3))


# ─────────────────────────── ① 수요 ───────────────────────────

def suggest(q, hl="ko", gl="kr"):
    """유튜브 자동완성 목록. 순위가 곧 수요의 대리 지표다."""
    params = urllib.parse.urlencode(
        {"client": "firefox", "ds": "yt", "hl": hl, "gl": gl, "q": q})
    raw = _get(f"{SUGGEST_URL}?{params}")
    try:
        data = json.loads(raw.decode("utf-8", "replace"))
    except json.JSONDecodeError:
        return []
    return data[1] if len(data) > 1 and isinstance(data[1], list) else []


# ─────────────────────────── ② 경쟁 ───────────────────────────

_EST_RE = re.compile(r'"estimatedResults"\s*:\s*"(\d+)"')


def competition(q, hl="ko", gl="kr"):
    """검색결과 HTML의 estimatedResults. 경쟁 영상 수의 대리 지표."""
    params = urllib.parse.urlencode({"search_query": q, "hl": hl, "gl": gl})
    html = _get(f"{SEARCH_URL}?{params}").decode("utf-8", "replace")
    m = _EST_RE.search(html)
    return int(m.group(1)) if m else None


# ─────────────────────────── ③ 수집 ───────────────────────────

def harvest(seed, depth=1, hl="ko", gl="kr", verbose=True):
    """
    씨앗 키워드에 자모(ㄱㄴㄷ…)와 공백을 붙여가며 자동완성을 긁는다.
    depth=1 이면 씨앗 + 자모 14개. depth=2 면 1차 결과에도 한 번 더.
    """
    found, seen, queue = [], set(), [seed]

    def add(items):
        for it in items:
            if it not in seen:
                seen.add(it)
                found.append(it)

    add(suggest(seed, hl, gl))
    polite_sleep()

    for j in JAMO:
        add(suggest(f"{seed} {j}", hl, gl))
        if verbose:
            print(f"  … {seed} {j} → 누적 {len(found)}개", file=sys.stderr)
        polite_sleep()

    if depth >= 2:
        for kw in list(found)[:20]:
            add(suggest(kw, hl, gl))
            polite_sleep()

    queue.clear()
    return found


# ─────────────────────────── ④ 분석 ───────────────────────────

def opportunity(rank, comp):
    """
    기회점수 = 수요 ÷ log10(경쟁)
    수요는 자동완성 순위를 뒤집어 쓴다 (1위=10점, 10위=1점, 없으면 0점).
    """
    if not comp or comp <= 0:
        return 0.0
    demand = max(0, 11 - rank) if rank else 0
    return round(demand / math.log10(max(comp, 10)), 2)


def analyze(keywords, hl="ko", gl="kr", csv_path=None, verbose=True):
    """키워드마다 자동완성 순위 · 경쟁 영상 수 · 기회점수를 계산한다."""
    rows = []
    for i, kw in enumerate(keywords, 1):
        # 씨앗은 '마지막 어절을 뺀 앞부분'이다.
        # (첫 어절만 쓰면 '오사카 호텔 추천'을 '오사카'로 조회해 못 찾는다)
        toks = kw.split()
        seeds = []
        if len(toks) > 1:
            seeds.append(" ".join(toks[:-1]))
        seeds.append(kw)

        rank = None
        for seed in seeds:
            sug = suggest(seed, hl, gl)
            polite_sleep()
            if kw in sug:
                rank = sug.index(kw) + 1
                break

        comp = competition(kw, hl, gl)
        polite_sleep()

        row = {
            "키워드": kw,
            "자동완성순위": rank if rank else "없음",
            "경쟁영상수": comp if comp is not None else "조회실패",
            "기회점수": opportunity(rank, comp),
            "살아있나": "○" if rank else "✗ 죽은키워드",
        }
        rows.append(row)
        if verbose:
            print(f"[{i}/{len(keywords)}] {kw:<28} "
                  f"순위 {row['자동완성순위']:>4} | 경쟁 {row['경쟁영상수']:>10} | "
                  f"기회 {row['기회점수']:>5} | {row['살아있나']}", file=sys.stderr)

    rows.sort(key=lambda r: r["기회점수"], reverse=True)

    if csv_path:
        with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
        print(f"\n저장 완료 → {csv_path}", file=sys.stderr)

    return rows


def pair(kw, hl="ko", gl="kr"):
    """
    띄어쓰기 ↔ 붙여쓰기 대조.
    3어절 이상이면 실제로 경쟁이 갈린다 (문서 §7 실측).
    """
    spaced = kw
    joined = kw.replace(" ", "")
    out = []
    for v in (spaced, joined):
        c = competition(v, hl, gl)
        polite_sleep()
        out.append((v, c))
    a, b = out
    print(f"  {a[0]:<24} 경쟁 {a[1]:,}" if a[1] else f"  {a[0]} 조회실패")
    print(f"  {b[0]:<24} 경쟁 {b[1]:,}" if b[1] else f"  {b[0]} 조회실패")
    if a[1] and b[1]:
        ratio = a[1] / b[1] if b[1] else 0
        if ratio > 1.5 or ratio < 0.67:
            print(f"  → 갈립니다 ({ratio:.1f}배). 둘 다 키워드란에 넣으세요.")
        else:
            print("  → 유튜브가 같게 취급합니다. 하나만 넣어도 됩니다.")
    return out


# ─────────────────────────── CLI ───────────────────────────

def main():
    p = argparse.ArgumentParser(description="유튜브 키워드 리서치 도구")
    sub = p.add_subparsers(dest="cmd", required=True)

    s1 = sub.add_parser("suggest", help="자동완성 목록")
    s1.add_argument("query")

    s2 = sub.add_parser("comp", help="경쟁 영상 수")
    s2.add_argument("query")

    s3 = sub.add_parser("harvest", help="자모를 붙여가며 키워드 대량 수집")
    s3.add_argument("seed")
    s3.add_argument("--depth", type=int, default=1)

    s4 = sub.add_parser("analyze", help="수요·경쟁·기회점수 계산 → CSV")
    s4.add_argument("keywords", nargs="*")
    s4.add_argument("--file", help="키워드 목록 텍스트 파일 (한 줄에 하나)")
    s4.add_argument("--csv", dest="csv_path")

    s5 = sub.add_parser("pair", help="띄어쓰기/붙여쓰기 경쟁 대조")
    s5.add_argument("query")

    for sp in (s1, s2, s3, s4, s5):
        sp.add_argument("--hl", default="ko")
        sp.add_argument("--gl", default="kr")

    a = p.parse_args()

    if a.cmd == "suggest":
        for i, s in enumerate(suggest(a.query, a.hl, a.gl), 1):
            print(f"{i:>2}. {s}")

    elif a.cmd == "comp":
        c = competition(a.query, a.hl, a.gl)
        print(f"{a.query} → {c:,}" if c is not None else "조회 실패")

    elif a.cmd == "harvest":
        for i, s in enumerate(harvest(a.seed, a.depth, a.hl, a.gl), 1):
            print(f"{i:>3}. {s}")

    elif a.cmd == "analyze":
        kws = list(a.keywords)
        if a.file:
            with open(a.file, encoding="utf-8") as f:
                kws += [l.strip() for l in f if l.strip()]
        if not kws:
            sys.exit("키워드가 없습니다. 인자로 주거나 --file 을 쓰세요.")
        analyze(kws, a.hl, a.gl, a.csv_path)

    elif a.cmd == "pair":
        pair(a.query, a.hl, a.gl)


if __name__ == "__main__":
    main()
