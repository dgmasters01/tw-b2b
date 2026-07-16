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
import http.cookiejar
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


# ─────────────────────────── ⑤ 수요 (구글 트렌드) ───────────────────────────
# 🆕 2026-07-17 신설. 규격은 D-065 ⑩(기술 제약) + ⑪(앵커 기법)에 이미 있던 것을 그대로 옮긴 것이다.
#    새로 정한 것 없음. 2026-07-14 앵커 실측 9개는 커밋 안 된 임시 코드였다 → 재현 불가였다(㊽).
#    이제 여기 있다. 재현된다.
#
# ── 흐름 (⑩) ────────────────────────────────────────────────
#   /trends/api/explore  → 응답 widgets 에서 id=="TIMESERIES" 의 token+request 를 꺼낸다
#   /trends/api/widgetdata/multiline?req=<그 request>&token=<그 token>  → 주간 시계열
#   · pytrends 는 막힘 → 직접 호출로 우회
#   · 두 응답 모두 앞에 )]}' 쓰레기가 붙어 온다 → 첫 '{' 부터 자른다
#
# ── 덫 (밟은 것만 적는다) ───────────────────────────────────
#   · time="today 24-m" = 🔴 400 에러. **날짜 범위 "2024-01-01 <오늘>"** 을 쓴다 (⑩)
#   · 🔴 429 가 상시로 뜬다 (2026-07-17 실측: 첫 4회 연속 429 → 5번째 성공).
#     막힌 게 아니라 튕기는 것이다. **재시도 + 15~25초 간격이 필수**(⑪). 지수 백오프 아님 — 그냥 기다린다.
#   · 쿠키(NID) 를 먼저 받아둔다. 없으면 429 확률이 더 높다.
#   · 트렌드는 **유튜브 할당량과 지갑이 다르다**(㊽). 유튜브 10,000점을 다 써도 트렌드는 잰다.
#
# ── 앵커 (⑪) ───────────────────────────────────────────────
#   트렌드는 한 번에 5개까지 + **묶음마다 잣대가 다시 매겨진다**. 그냥 나눠 재면 서로 비교 불가.
#   → 모든 묶음에 같은 앵커를 넣는다. 묶음당 = **앵커1 + 신규4**.
#     보정배율 = 1묶음 앵커값 ÷ 이 묶음 앵커값. 모든 값에 곱한다.
#   실측 검증(2026-07-14): 묶음1 오사카호텔=46.23 / 묶음2 =46.23 → 배율 1.000
#
# ── 🏷️ 잣대 도장 (㊶-6) ─────────────────────────────────────
#   demand_source='gtrends_youtube' · window_from/to · measured_at 를 값과 같이 낸다.
#   도장 없이 저장 금지. 창이 3일만 달라도 앵커가 46.2→45.6 으로 움직인다(2026-07-17 실측).
#
# ── ⑧ 없음 vs 모름 ─────────────────────────────────────────
#   시계열이 전부 0 = "검색이 없다"가 아니라 **"측정 바닥 아래라 우리가 못 잰다"**.
#   → measured=False · skip_reason='below_floor' · demand=None. 0.0 을 막대에 얹지 않는다.

TRENDS_EXPLORE = "https://trends.google.com/trends/api/explore"
TRENDS_MULTILINE = "https://trends.google.com/trends/api/widgetdata/multiline"

DEMAND_SOURCE = "gtrends_youtube"       # 🏷️ 도장 (㊶-6)
TREND_PROPERTY = "youtube"              # 웹 검색 아님. 유튜브 안에서의 수요다
TREND_FROM = "2024-01-01"               # ㊶-3 기준선. 고정 시작점 — 옮기면 옛 값과 못 잇는다
TREND_BATCH_NEW = 4                     # 묶음당 신규 4 (+앵커1 = 5 = 트렌드 상한)
TREND_GAP = (15, 25)                    # ⑪ 429 방지 간격(초)

_TRENDS_OPENER = None


def _trends_opener(hl="ko"):
    """쿠키(NID)를 쥔 채로 두드린다. 한 번 만들어 계속 쓴다."""
    global _TRENDS_OPENER
    if _TRENDS_OPENER is not None:
        return _TRENDS_OPENER
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    op.addheaders = [("User-Agent", UA),
                     ("Accept-Language", f"{hl}-KR,{hl};q=0.9"),
                     ("Referer", "https://trends.google.com/trends/explore")]
    try:
        op.open("https://trends.google.com/trends/explore?geo=KR&hl=ko", timeout=20).read()
    except Exception:
        pass        # 씨앗 페이지가 429여도 NID 는 대개 붙는다. 실패해도 계속 간다.
    _TRENDS_OPENER = op
    return op


def trend_sleep():
    """429 는 여기서 막는다. 서두르면 전부 튕긴다 (⑪)."""
    time.sleep(random.uniform(*TREND_GAP))


def _trends_get(url, tries=8, hl="ko", verbose=False):
    """429/5xx = 재시도. 다른 에러는 그대로 올린다."""
    op = _trends_opener(hl)
    last = None
    for i in range(tries):
        try:
            return op.open(url, timeout=30).read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (429, 500, 502, 503):
                if verbose:
                    print(f"    {e.code} — {i+1}/{tries} 재시도", file=sys.stderr)
                trend_sleep()
                continue
            raise
        except Exception as e:
            last = e
            trend_sleep()
    raise RuntimeError(f"구글 트렌드 응답 없음 ({tries}회 시도): {last}")


def _trends_json(raw):
    """응답 앞에 붙은 )]}' 쓰레기를 잘라낸다."""
    i = raw.find("{")
    if i < 0:
        raise ValueError("트렌드 응답이 JSON 이 아님")
    return json.loads(raw[i:])


def _today_kst():
    """창의 끝은 대표님이 계신 날짜다. tz=-540 로 부르면서 창만 UTC 로 자르면 하루가 어긋난다."""
    return (_dt.datetime.now(_dt.timezone.utc) + _dt.timedelta(hours=9)).date().isoformat()


def _timeframe(date_from=TREND_FROM, date_to=None):
    """⑩ — "today 24-m" 은 400. 날짜 범위만 쓴다."""
    return f"{date_from} {date_to or _today_kst()}"


def trend_batch(keywords, geo="KR", date_from=TREND_FROM, date_to=None,
                hl="ko", verbose=False):
    """
    묶음 하나(최대 5개)를 잰다. → {키워드: {"mean": 평균, "series": {"2024-01": 값, ...}}}
    ⚠️ 이 값들은 **이 묶음 안에서만** 비교 가능하다(⑩ 독립 정규화). 앵커로 이어붙일 것.
    """
    if len(keywords) > 5:
        raise ValueError("트렌드는 한 번에 5개까지다 (⑪)")
    tf = _timeframe(date_from, date_to)
    req = {"comparisonItem": [{"keyword": k, "geo": geo, "time": tf} for k in keywords],
           "category": 0, "property": TREND_PROPERTY}
    p = urllib.parse.urlencode({"hl": hl, "tz": "-540",
                                "req": json.dumps(req, ensure_ascii=False)})
    data = _trends_json(_trends_get(f"{TRENDS_EXPLORE}?{p}&tz=-540", hl=hl, verbose=verbose))

    w = next((x for x in data.get("widgets", []) if x.get("id") == "TIMESERIES"), None)
    if not w:
        raise RuntimeError("TIMESERIES 위젯이 없다 — 키워드가 전부 데이터 없음일 수 있다")

    time.sleep(random.uniform(2, 4))
    p2 = urllib.parse.urlencode({"hl": hl, "tz": "-540",
                                 "req": json.dumps(w["request"], ensure_ascii=False),
                                 "token": w["token"]})
    d2 = _trends_json(_trends_get(f"{TRENDS_MULTILINE}?{p2}", hl=hl, verbose=verbose))

    tl = d2.get("default", {}).get("timelineData", [])
    if not tl:
        raise RuntimeError("시계열이 비었다")

    out = {}
    for i, kw in enumerate(keywords):
        vals, months = [], {}
        for pt in tl:
            v = pt["value"][i] if i < len(pt.get("value", [])) else 0
            vals.append(v)
            # time = 그 주 시작의 유닉스 초. 주를 그 달에 담는다 (㊵ series = 월별)
            ym = _dt.datetime.fromtimestamp(int(pt["time"]), _dt.timezone.utc).strftime("%Y-%m")
            months.setdefault(ym, []).append(v)
        out[kw] = {
            "mean": sum(vals) / len(vals) if vals else 0.0,
            "points": len(vals),
            "series_raw": {m: sum(v) / len(v) for m, v in months.items()},
        }
    return out


def _load_partial(path):
    """이어하기용. 이미 잰 것은 다시 재지 않는다."""
    if not path or not os.path.exists(path):
        return []
    try:
        with open(path, encoding="utf-8") as f:
            got = json.load(f)
        return got if isinstance(got, list) else []
    except Exception:
        return []


def _save_partial(path, rows):
    if not path:
        return
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)      # 쓰다 죽어도 반쪽 파일이 안 남는다


def trend(keywords, anchor=None, geo="KR", date_from=TREND_FROM, date_to=None,
          hl="ko", verbose=True, json_path=None):
    """
    키워드 전체의 수요를 **하나의 잣대로** 잰다 (⑪ 앵커 기법).

    돌려주는 행 (그대로 `trend` 표에 들어간다 — ㊵·㊶-6):
      keyword · demand · series · batch_no · calib_ratio
      measured · skip_reason · demand_source · window_from · window_to · measured_at

    🔴 json_path 를 주면 **묶음마다 즉시 저장**하고, 이미 있는 키워드는 건너뛴다(이어하기).
       2026-07-17 실측: 58개 = 8분 넘게 걸린다 → 13/15 에서 프로세스가 끊겨 전부 날아갔다.
       15회 중 14회를 성공해도 파일이 없으면 0이다. 그래서 재는 즉시 적는다.
    """
    kws = list(dict.fromkeys(keywords))          # 중복 제거, 순서 보존
    if not kws:
        return []
    anchor = anchor or kws[0]
    if anchor not in kws:
        kws.insert(0, anchor)
    rest = [k for k in kws if k != anchor]

    batches = [[anchor] + rest[i:i + TREND_BATCH_NEW]
               for i in range(0, len(rest), TREND_BATCH_NEW)] or [[anchor]]
    win_from, win_to = date_from, (date_to or _today_kst())
    now = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if verbose:
        print(f"수요 측정 — 키워드 {len(kws)}개 · 앵커 '{anchor}' · 묶음 {len(batches)}회 "
              f"· 창 {win_from} ~ {win_to} · 예상 {len(batches)*20//60+1}분", file=sys.stderr)

    rows = _load_partial(json_path)
    seen = {r["keyword"] for r in rows}
    # 앵커의 1묶음 값 = 모든 묶음의 잣대. 이어할 땐 파일에서 되찾는다.
    ref = next((r["demand"] for r in rows if r["keyword"] == anchor and r.get("demand")), None)
    if rows and verbose:
        print(f"  이어하기 — 이미 잰 것 {len(rows)}개 · 잣대(앵커) {ref}", file=sys.stderr)

    for bno, batch in enumerate(batches, 1):
        if all(k in seen for k in batch):
            continue                       # 이 묶음은 이미 다 쟀다
        if seen:
            trend_sleep()
        got = trend_batch(batch, geo, date_from, date_to, hl, verbose)
        a = got[anchor]["mean"]
        if ref is None:
            ref = a
            if ref <= 0:
                raise RuntimeError(f"앵커 '{anchor}' 가 측정 바닥 아래다 — 이 조사는 잣대가 없다 "
                                   f"(㊵ snapshot.status='aborted')")
        ratio = round(ref / a, 4) if a > 0 else None
        if verbose:
            print(f"  [{bno}/{len(batches)}] 앵커 {a:.2f} · 배율 {ratio} · "
                  f"{' / '.join(batch[1:]) or '(앵커만)'}", file=sys.stderr)

        for kw in batch:
            if kw in seen:
                continue
            if kw == anchor and bno > 1:
                continue
            seen.add(kw)
            g = got[kw]
            floor = g["mean"] <= 0
            scaled = None if (floor or ratio is None) else round(g["mean"] * ratio, 2)
            rows.append({
                "keyword": kw,
                "measured": not floor and ratio is not None,
                "demand": scaled,
                "series": (None if floor else
                           {m: round(v * ratio, 2) for m, v in g["series_raw"].items()}),
                "batch_no": bno,
                "calib_ratio": ratio,
                # ⑧ — 0 은 "없음"이 아니라 "못 잼"이다
                "skip_reason": "below_floor" if floor else None,
                "demand_source": DEMAND_SOURCE,       # 🏷️ 도장
                "demand_geo": geo,
                "window_from": win_from,
                "window_to": win_to,
                "measured_at": now,
                "points": g["points"],
            })
        _save_partial(json_path, rows)      # 🔴 묶음마다 즉시. 끊겨도 여기까지는 남는다
    rows.sort(key=lambda r: (r["demand"] is None, -(r["demand"] or 0)))
    _save_partial(json_path, rows)
    return rows


def opportunity_from_demand(demand, comp):
    """
    화면의 진짜 기회점수 (D-065 ① · ㊶-6-1) = 수요 ÷ log10(경쟁).
    🔴 수요를 안 쟀으면 None. 경쟁만 보고 초록불 켜는 짓 금지 (INC-006 · 날조 8번째).
    """
    if demand is None or not comp or comp <= 0:
        return None
    return round(demand / math.log10(max(comp, 10)), 2)


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

    s6 = sub.add_parser("trend", help="수요(구글 트렌드) 앵커 측정 → JSON")
    s6.add_argument("keywords", nargs="*")
    s6.add_argument("--file", help="키워드 목록 텍스트 파일 (한 줄에 하나)")
    s6.add_argument("--anchor", help="앵커 키워드 (기본: 첫 번째)")
    s6.add_argument("--geo", default="KR", help="시장 (⑩ 타겟축)")
    s6.add_argument("--from", dest="date_from", default=TREND_FROM)
    s6.add_argument("--to", dest="date_to", help="기본 = 오늘")
    s6.add_argument("--json", dest="json_path",
                    help="결과 JSON (묶음마다 즉시 저장 · 있으면 이어서 잰다)")

    for sp in (s1, s2, s3, s4, s5, s6):
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

    elif a.cmd == "trend":
        kws = list(a.keywords)
        if a.file:
            with open(a.file, encoding="utf-8") as f:
                kws += [l.strip() for l in f if l.strip()]
        if not kws:
            sys.exit("키워드가 없습니다. 인자로 주거나 --file 을 쓰세요.")
        rows = trend(kws, a.anchor, a.geo, a.date_from, a.date_to, a.hl,
                     json_path=a.json_path)
        for r in rows:
            d = f"{r['demand']:.2f}" if r["demand"] is not None else "못 잼(바닥)"
            print(f"{r['keyword']:<28} 수요 {d:>10}  [묶음 {r['batch_no']} · 배율 {r['calib_ratio']}]")
        if a.json_path:
            print(f"\n저장 완료 → {a.json_path} ({len(rows)}개)", file=sys.stderr)


if __name__ == "__main__":
    main()
