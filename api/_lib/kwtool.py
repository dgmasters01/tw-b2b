#!/usr/bin/env python3
# kwtool.py — 유튜브 키워드 리서치 도구
#
# 하는 일 두 가지
#   ① 유튜브 자동완성 API 호출 → 수요를 안다
#   ② 유튜브 Data API v3 search.list → 경쟁(영상 수)을 안다  ← 2026-07-16 교체 (D-065 ㊺)
#
# 규격 근거: _content/youtube/여행능력자들.md §7 · D-065 ㊺(잣대) · D-065 ㊶-6(잣대 도장)
#
# ── 🔑 경쟁 잣대 (㊺ · 2026-07-16 대표님 확정) ──────────────
#   경쟁 = search.list + publishedAfter = 오늘 − 365일
#   · 3년 아님 1년. 계절은 1년에 한 바퀴 — 3년 창은 같은 11월을 세 뭉치로 담아 경쟁을 부풀린다.
#   · 달력("올해")이 아니라 이동 창이라 1월 함정이 없다.
#     (웹 검색 필터는 달력뿐 → 1월 3일에 재면 "올해"=3일치 → 전 키워드 가짜 초록불)
#   · 옛 방식(검색결과 HTML estimatedResults 긁기)은 🔴 폐기. 같은 키워드가 2.8배까지 어긋났다.
#
# ── 🏷️ 잣대 도장 (㊶-6) — 이 도구가 내는 모든 경쟁값에 같이 붙는다 ──
#   comp_method='api_search_list' · comp_window_days=365 · measured_at
#   도장 없이 저장하면 축적이 통째로 쓰레기가 된다:
#   옛 226만 → 새 8만을 "경쟁이 27분의 1로 줄었다"고 읽게 된다. 준 건 경쟁이 아니라 자다.
#
# ── 🔓 열쇠 ────────────────────────────────────────────────
#   env  YOUTUBE_API_KEY  또는  GOOGLE_PLACES_API_KEY   (= TW B2B Places Key · 프로젝트 1hogi)
#   열쇠가 없는 곳(로컬)에서는 창구를 거친다:
#   env  KWTOOL_OPS_BASE=https://gohotelwinners.com  +  CLAUDE_OPS_TOKEN=...
#        → POST /api/ops/yt-probe?mode=count  (열쇠는 서버에만 있고 밖으로 안 나온다)
#
# ── 💰 돈 ──────────────────────────────────────────────────
#   Data API v3 = 무료. 하루 10,000 units · search.list = 100/회.
#   넘으면 403 quotaExceeded — 막힐 뿐 청구되지 않는다.
#   오사카 68개 = 6,800 = 하루의 68% → 하루 1도시.
#
# ── 쓰는 법 ────────────────────────────────────────────────
#   python3 kwtool.py suggest  "오사카 호텔"
#   python3 kwtool.py comp     "오사카 가성비 호텔"
#   python3 kwtool.py harvest  "오사카 호텔" --depth 1
#   python3 kwtool.py analyze  "오사카 호텔" "난바 호텔" --csv 오사카.csv
#   python3 kwtool.py analyze  --file 키워드목록.txt --csv 결과.csv
#   python3 kwtool.py pair     "오사카 가성비 호텔"      # 띄어쓰기/붙여쓰기 대조
#   (--window-days 365 로 창을 바꿀 수 있다. 되돌리기 5초 = 헌법 9조)
#
# ── 검증된 사실 (문서 §7) ──────────────────────────────────
#   · 자동완성은 띄어쓰기를 구분한다
#   · 경쟁 영상 수는 띄어쓰기를 정규화한다 (±20% 노이즈)
#   · 붙여쓰기 짝은 **자동완성으로** 가른다(㊻). ❌ 경쟁 1.5배로 가르지 말 것 — 노이즈에 잠긴다
#   · ❌ 어절 수로 미리 거르지 말 것(㊲, 실측 기각)
#   · 자동완성에 없는 어형은 죽은 키워드다. 버린다.
#   · ⚠️ totalResults 는 1,000,000 에서 멈춘다. 1년 창이면 8만~16만이라 안 걸린다.

import argparse
import csv
import datetime as _dt
import json
import math
import os
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

SUGGEST_URL = "https://suggestqueries.google.com/complete/search"
YT_SEARCH_API = "https://www.googleapis.com/youtube/v3/search"

# 🏷️ 잣대 도장 (D-065 ㊶-6). 재는 법이 바뀌면 이 값도 같이 바뀌어야 한다.
COMP_METHOD = "api_search_list"
COMP_WINDOW_DAYS = 365          # ㊺ — 3년 아님 1년. 창 길이는 날짜 한 줄이다.

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
# 🔴 2026-07-16 교체 (㊺). 옛 방식 = 유튜브 검색결과 HTML 의 estimatedResults 긁기.
#    날짜 조건이 한 줄도 없어서 10년 전 영상까지 경쟁으로 셌다. 폐기했다.
#    옛 값(2026-07-15 이전 CSV·DB)은 고치지 않는다 — 옛 잣대의 진실이다(㊶-6-3).


def _api_key():
    """열쇠. 없으면 None (그때는 창구를 거친다)."""
    return os.environ.get("YOUTUBE_API_KEY") or os.environ.get("GOOGLE_PLACES_API_KEY")


def _window_from(window_days=COMP_WINDOW_DAYS):
    """publishedAfter 값. 달력이 아니라 '오늘에서 뒤로 N일' 이동 창."""
    t = _dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(days=window_days)
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def _stamp(count, window_days, error=None):
    """값 하나에 잣대 도장을 찍어 돌려준다 (㊶-6)."""
    return {
        "count": count,
        "comp_method": COMP_METHOD,
        "comp_window_days": window_days,
        "measured_at": _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "error": error,
    }


def _comp_direct(q, key, window_days, region="KR", lang="ko"):
    params = urllib.parse.urlencode({
        "part": "id", "type": "video", "maxResults": "1",
        "q": q, "key": key, "regionCode": region, "relevanceLanguage": lang,
        "publishedAfter": _window_from(window_days),
    })
    try:
        raw = _get(f"{YT_SEARCH_API}?{params}")
        data = json.loads(raw.decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        try:
            j = json.loads(e.read().decode("utf-8", "replace"))
            reason = j["error"]["errors"][0].get("reason") or j["error"].get("message")
        except Exception:
            reason = f"http_{e.code}"
        return _stamp(None, window_days, error=reason)
    except Exception as e:
        return _stamp(None, window_days, error=str(e)[:120])
    return _stamp(data.get("pageInfo", {}).get("totalResults"), window_days)


def _comp_via_ops(qs, window_days, region="KR", lang="ko"):
    """열쇠가 없는 곳에서. 창구(yt-probe?mode=count)가 서버에서 대신 잰다."""
    base = os.environ.get("KWTOOL_OPS_BASE", "https://gohotelwinners.com").rstrip("/")
    token = os.environ.get("CLAUDE_OPS_TOKEN")
    if not token:
        raise SystemExit("열쇠도 창구 토큰도 없습니다. "
                         "YOUTUBE_API_KEY / GOOGLE_PLACES_API_KEY 또는 CLAUDE_OPS_TOKEN 을 주세요.")
    body = json.dumps({"q": qs, "window_days": window_days,
                       "region": region, "lang": lang}).encode("utf-8")
    req = urllib.request.Request(
        f"{base}/api/ops/yt-probe?mode=count", data=body,
        headers={"Content-Type": "application/json", "x-ops-token": token, "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        j = json.loads(r.read().decode("utf-8", "replace"))
    out = {}
    for row in j.get("results", []):
        out[row["q"]] = _stamp(row.get("competition"), j.get("comp_window_days", window_days),
                               error=row.get("skip_reason"))
    return out


def competition_many(qs, window_days=COMP_WINDOW_DAYS, region="KR", lang="ko", verbose=False):
    """
    여러 키워드의 경쟁을 한꺼번에. {키워드: 도장찍힌 값} 을 돌려준다.
    비용: 키워드 1개 = 100 units. 하루 10,000 = 100개.
    """
    key = _api_key()
    if not key:
        return _comp_via_ops(list(qs), window_days, region, lang)
    out = {}
    for i, q in enumerate(qs, 1):
        out[q] = _comp_direct(q, key, window_days, region, lang)
        if verbose:
            c = out[q]["count"]
            print(f"  [{i}/{len(qs)}] {q:<28} → {c if c is not None else out[q]['error']}",
                  file=sys.stderr)
        if out[q]["error"] and "quota" in str(out[q]["error"]).lower():
            # 할당량 끝. 남은 건 더 두드려도 무의미하다 (막힐 뿐 청구는 없다)
            for rest in list(qs)[i:]:
                out[rest] = _stamp(None, window_days, error="quotaExceeded")
            break
    return out


def competition(q, window_days=COMP_WINDOW_DAYS, region="KR", lang="ko"):
    """경쟁 영상 수 (최근 1년 창). 숫자만. 못 재면 None."""
    return competition_many([q], window_days, region, lang)[q]["count"]


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


def analyze(keywords, hl="ko", gl="kr", csv_path=None, verbose=True,
            window_days=COMP_WINDOW_DAYS):
    """
    키워드마다 자동완성 순위 · 경쟁 영상 수 · 기회점수를 계산한다.
    경쟁값에는 잣대 도장(방법·창·잰날)을 같이 적는다 — 도장 없는 숫자는 축적이 안 된다(㊶-6).
    ⚠️ 여기 '기회점수' 는 자동완성 순위를 수요 대리로 쓴 옛 공식이다. 화면의 진짜 기회점수는
       구글 트렌드 수요 ÷ log10(경쟁) 이다(D-065 ①). 수요를 안 쟀으면 '기회'가 아니라 '모름'(⑧).
    """
    keywords = list(keywords)

    # 경쟁 먼저 한 번에 (창구를 거치는 경우 왕복 1회로 끝난다)
    if verbose:
        print(f"경쟁 측정 — {len(keywords)}개 × 100 units = {len(keywords)*100} "
              f"(하루 10,000) · 창 최근 {window_days}일", file=sys.stderr)
    comps = competition_many(keywords, window_days,
                             region=gl.upper(), lang=hl, verbose=verbose)

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

        st = comps.get(kw) or _stamp(None, window_days, error="not_measured")
        comp = st["count"]

        row = {
            "키워드": kw,
            "자동완성순위": rank if rank else "없음",
            "경쟁영상수": comp if comp is not None else "조회실패",
            "기회점수": opportunity(rank, comp),
            "살아있나": "○" if rank else "✗ 죽은키워드",
            "측정일": st["measured_at"][:10],
            # 🏷️ 잣대 도장 — 이게 없으면 내년에 옛 값과 몰래 이어붙게 된다(㊶-6)
            "경쟁잣대": st["comp_method"],
            "경쟁창일수": st["comp_window_days"],
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


def pair(kw, hl="ko", gl="kr", window_days=COMP_WINDOW_DAYS, quiet=False):
    """
    띄어쓰기 ↔ 붙여쓰기 대조 — 1단계 = **자동완성** (D-065 ㊻ 확정, 2026-07-16).

    🔴 옛 규칙(㊲: 경쟁 1.5배로 가르기 · 붙여쓰기 경쟁 500 미만이면 죽음)은 **폐기**했다.
       경쟁값이 같은 검색어를 20분 뒤 재면 7~22배 튄다(㊻ 실측). 판정선 1.5배가 노이즈에 잠겨 있었다.
       자동완성은 오사카 12쌍 2회 측정에서 **순위 숫자까지 12/12 재현**됐다. 그래서 자동완성으로 가른다.
       덤: 자동완성은 할당량 밖 = 공짜.

    답 3가지
      둘 다 살아있음   → 둘 다 진짜 검색어. 둘 다 넣는다.
      한쪽만 살아있음  → 없는 쪽은 죽은 어형. 버린다. (§7 "자동완성에 없는 어형은 죽은 키워드다")
      둘 다 없음       → 둘 다 버린다.

    ⚠️ 여기까지가 1단계다. **판정**은 살아남은 쌍의 트렌드 수요를 잰 뒤
       기회점수 = 수요 ÷ log10(경쟁) 으로만 한다. 경쟁 단독 판정 금지(INC-006 · 날조 8번째).
       경쟁은 참고로만 같이 찍어준다 — 자릿수만 믿을 것.
    """
    spaced, joined = kw, kw.replace(" ", "")
    if spaced == joined:
        if not quiet:
            print("  어절이 하나라 짝이 없습니다.")
        return {"spaced": spaced, "joined": joined, "verdict": "no_pair"}

    def _rank(k):
        toks = k.split()
        seeds = ([" ".join(toks[:-1])] if len(toks) > 1 else []) + [k]
        for s in seeds:
            sug = suggest(s, hl, gl)
            polite_sleep()
            if k in sug:
                return sug.index(k) + 1
        return None

    rs, rj = _rank(spaced), _rank(joined)
    if rs and rj:
        verdict, advice = "both_alive", "둘 다 진짜 검색어입니다. 둘 다 넣으세요. (수요는 트렌드로 각각 잽니다)"
    elif rs or rj:
        dead = joined if rs else spaced
        verdict, advice = "one_dead", f"'{dead}' 는 자동완성에 없습니다 = 죽은 어형. 버리세요."
    else:
        verdict, advice = "both_dead", "둘 다 자동완성에 없습니다. 둘 다 버리세요."

    comps = competition_many([spaced, joined], window_days, region=gl.upper(), lang=hl)
    cs, cj = comps[spaced]["count"], comps[joined]["count"]

    if not quiet:
        print(f"  1단계 잣대: 자동완성 (㊻ · 재현 12/12 · 공짜)")
        print(f"  {spaced:<24} 자동완성 {('%d위' % rs) if rs else '없음':<6} | 경쟁 {cs:,}" if cs else
              f"  {spaced:<24} 자동완성 {('%d위' % rs) if rs else '없음'}")
        print(f"  {joined:<24} 자동완성 {('%d위' % rj) if rj else '없음':<6} | 경쟁 {cj:,}" if cj else
              f"  {joined:<24} 자동완성 {('%d위' % rj) if rj else '없음'}")
        print(f"  → {advice}")
        print(f"  (경쟁은 참고. 자릿수만 믿으세요 — 같은 값이 20분 뒤 7~22배 튑니다. ㊻)")

    return {"spaced": spaced, "joined": joined, "rank_spaced": rs, "rank_joined": rj,
            "verdict": verdict, "comp_spaced": cs, "comp_joined": cj,
            "comp_method": COMP_METHOD, "comp_window_days": window_days}


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
    # 창 길이는 날짜 한 줄이다 — 3년·5년으로 되돌리기 5초 (헌법 9조)
    for sp in (s2, s4, s5):
        sp.add_argument("--window-days", dest="window_days", type=int, default=COMP_WINDOW_DAYS)

    a = p.parse_args()

    if a.cmd == "suggest":
        for i, s in enumerate(suggest(a.query, a.hl, a.gl), 1):
            print(f"{i:>2}. {s}")

    elif a.cmd == "comp":
        st = competition_many([a.query], a.window_days, region=a.gl.upper(), lang=a.hl)[a.query]
        if st["count"] is None:
            print(f"조회 실패 — {st['error']}")
        else:
            print(f"{a.query} → {st['count']:,}   "
                  f"[{st['comp_method']} · 최근 {st['comp_window_days']}일 · {st['measured_at'][:10]}]")

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
        analyze(kws, a.hl, a.gl, a.csv_path, window_days=a.window_days)

    elif a.cmd == "pair":
        pair(a.query, a.hl, a.gl, a.window_days)


if __name__ == "__main__":
    main()
