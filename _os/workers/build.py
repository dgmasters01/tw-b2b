#!/usr/bin/env python3
"""_os/workers/build.py — registry.json 한 벌에서 사람용 문서(WORKERS.md)를 만든다.
   🔴 사람용 문서를 손으로 고치지 않는다. registry.json 을 고치고 이 스크립트를 돌린다.
   쓰는 법:  python3 _os/workers/build.py   →  _os/workers/WORKERS.md 갱신
"""
import json, collections, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(HERE, "registry.json"), encoding="utf-8"))
ICON = {"돎": "🟢 돌고 있음", "수동": "🟡 사람이 시켜야 돎", "쉼": "🟡 쉬는 중",
        "대기": "🟡 아직 쓸 때가 안 됨", "조용": "🔴 며칠째 결과가 없음",
        "은퇴": "⚫ 은퇴(일부러 뗌)", "확인 필요": "⚪ 아직 안 봄", "미파악": "⚪ 아직 안 봄"}
L = []
L.append("# WORKERS — 우리 일꾼 전체 (사람이 읽는 판)\n")
L.append("> 🔴 **이 파일은 손으로 고치지 않는다.** `_os/workers/registry.json` 을 고치고 `python3 _os/workers/build.py` 를 돌리면 다시 만들어진다.")
L.append(f"> 마지막 갱신 {R['updated']} · 서비스 {len(R['services'])}곳 · 일꾼 {len(R['workers'])}명\n")
L.append("## 이 문서를 읽는 법\n")
L.append("```")
L.append("일꾼 = 우리가 시키지 않아도 스스로 일하는 프로그램이다.")
L.append("사람으로 치면 — 시계가 «몇 시다» 하고 깨우면, 일꾼이 나가서 일하고, 결과를 창고에 적어 둔다.")
L.append("")
L.append("각 일꾼은 네 가지로 적는다")
L.append("  어디서   어느 서비스의 어느 시계가 이 일꾼을 깨우나")
L.append("  언제     얼마나 자주 나가나")
L.append("  무슨 일  초등학생도 알 수 있는 한 문장")
L.append("  어떻게 확인  일한 결과가 어디에 남나 / 대표님이 어느 화면에서 보나")
L.append("```\n")
L.append("### 신호등\n")
L.append("| 표시 | 뜻 |\n|---|---|")
L.append("| 🟢 | 돌고 있다 |")
L.append("| 🟡 | 돌긴 하는데 사람이 시켜야 하거나, 아직 쓸 때가 안 됐다 |")
L.append("| 🔴 | 돌아야 하는데 며칠째 결과가 없다 — 봐야 한다 |")
L.append("| ⚫ | 일부러 은퇴시켰다 (되살리지 말 것) |")
L.append("| ⚪ | 아직 확인 안 했다 |")
L.append("")
byserv = collections.defaultdict(list)
for w in R["workers"]:
    byserv[w["service"]].append(w)
L.append("## 한눈에 — 서비스별 일꾼 수\n")
L.append("| 서비스 | 어떤 곳인가 | 일꾼 | 돌고 있음 | 손봐야 함 | 대표님이 보는 화면 |")
L.append("|---|---|---|---|---|---|")
for s in R["services"]:
    ws = byserv[s["key"]]
    ok = sum(1 for w in ws if w["status"] == "돎")
    bad = sum(1 for w in ws if w["status"] in ("조용", "확인 필요", "미파악"))
    L.append(f"| **{s['name']}** | {s['what']} | {len(ws)} | {ok} | {bad} | {s['dashboard']} |")
L.append("")
for s in R["services"]:
    ws = byserv[s["key"]]
    L.append(f"\n---\n\n# {s['name']}\n")
    L.append(f"**어떤 곳인가** — {s['what']}")
    L.append(f"**주소** {s['site']} · **코드 창고** {s['repo']} · **일꾼 상태 화면** {s['dashboard']}\n")
    for g in dict.fromkeys(w["group"] for w in ws):
        L.append(f"### {g}\n")
        L.append("| 일꾼 | 언제 | 무슨 일을 하나 | 결과가 어디 남나 | 상태 |")
        L.append("|---|---|---|---|---|")
        for w in [x for x in ws if x["group"] == g]:
            note = f"<br>*{w['note']}*" if w.get("note") else ""
            L.append(f"| **{w['name_ko']}**<br><sub>{w['where']}</sub> | {w['when']} | {w['does']}{note} | {w['makes']} | {ICON.get(w['status'], w['status'])} |")
        L.append("")
bad = [w for w in R["workers"] if w["status"] in ("조용", "확인 필요", "미파악")]
L.append("\n---\n\n## 🔴 지금 손봐야 하는 것\n")
L.append("| 서비스 | 일꾼 | 왜 |\n|---|---|---|")
for w in bad:
    L.append(f"| {w['service']} | {w['name_ko']} | {w.get('note') or '아직 안 봄'} |")
L.append("\n---\n\n**만든 방법**: `registry.json` → `build.py` → 이 파일. 새 서비스·새 일꾼을 넣는 법은 `HOW-TO-ADD.md`.")
open(os.path.join(HERE, "WORKERS.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")
print("WORKERS.md 다시 만듦 —", len(R["workers"]), "명")
