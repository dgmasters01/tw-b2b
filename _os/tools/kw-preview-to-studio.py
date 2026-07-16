#!/usr/bin/env python3
# kw-preview-to-studio.py — 확정본(프리뷰)을 스튜디오 키워드 탭에 옮긴다.
#
# 왜 도구인가: 2026-07-17 손으로 옮기다 **네 번 틀렸다**(D-065 52-3).
#   1차 숫자 블록만 얹음 / 2차 딴 집 통째로 / 3차 확정본을 버림 / 4차 화면이 서로 겹쳐 흰 화면
# 사람이 매번 같은 곳에서 넘어진다 → 규칙을 코드로 박는다. 헌법 5조(무인 검증).
#
# 쓰는 법:  python3 _os/tools/kw-preview-to-studio.py            # 검사만
#           python3 _os/tools/kw-preview-to-studio.py --write    # 실제로 옮김
#
# ── 확정된 규칙 (D-065 52-3) ────────────────────────────────
#  A. 확정본의 **내용·구조는 대표님 것**이다. 한 글자도 안 건드린다.
#  B. **배경 · 폭 · 제목** 셋만 벗긴다. 프리뷰는 제 페이지라 그 셋을 가져야 했지만,
#     스튜디오 안에서는 **스튜디오가 갖는다.**
#  C. 색은 `#kw-app` 변수 한 곳에서 스튜디오 팔레트로 갈아끼운다.
#  D. 주소(뒤로가기)는 **스튜디오 탭이 소유**한다 → pushState/popstate 를 끊고 kwBoot() 로 켠다.
#
# ── 밟았던 덫 (전부 여기서 자동으로 막는다) ─────────────────
#  1. 🔴 태그를 셀 때 **주석을 먼저 지운다.** 앞 클로드가 주석에 적어둔 `</div>` '글자'에 속아
#     진짜 닫힘을 하나 더 지웠고 → #s1 이 안 닫혀 도시·지역·상세가 **메인 안에 들어갔다** →
#     메인이 꺼지면 통째로 꺼져 **흰 화면**.
#  2. 🔴 검사는 **부모·조상까지** 본다. jsdom 은 부모의 display:none 을 자식에 안 물려준다.
#     "있다"와 "보인다"는 다르다.
#  3. 🔴 확정본 스크립트는 **전역**에 둔다(인라인 onclick 을 쓴다). 스튜디오 본체는 IIFE 라 안 부딪힌다.

import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
PREV = ROOT / "studio-keyword-preview.html"
STUD = ROOT / "studio.html"

WARN = ("손으로 고치지 마세요. 원본은 studio-keyword-preview.html (대표님 작업장) 입니다.\n"
        "     여기를 고쳐도 다음 이식(python3 _os/tools/kw-preview-to-studio.py --write) 때 덮어씁니다.")
MARK_CSS_A = "/* ⟦확정본 CSS 시작⟧"
MARK_CSS_B = "/* ⟦확정본 CSS 끝⟧ */"
MARK_HTML_A = "<!-- ⟦확정본 HTML 시작⟧ -->"
MARK_HTML_B = "<!-- ⟦확정본 HTML 끝⟧ -->"
MARK_JS_A = "/* ⟦확정본 JS 시작⟧"
MARK_JS_B = "/* ⟦확정본 JS 끝⟧ */"

# C. 색 — 프리뷰(제 페이지용 남색) → 스튜디오
PALETTE = """#kw-app{--bg:transparent;--card:rgba(128,140,160,.06);--card2:rgba(128,140,160,.11);--line:rgba(128,128,128,.22);
  --txt:inherit;--sub:#c4ccd6;--muted:#7b8794;
  --em:#3ecf8e;--emd:rgba(62,207,142,.13);--am:#EF9F27;--amd:rgba(239,159,39,.13);
  --rd:#e5484d;--rdd:rgba(229,72,77,.13);--bl:#4A90D9;--bld:rgba(74,144,217,.16);}
#kw-app{box-sizing:border-box;margin:0;padding:0;background:transparent;color:inherit;font-family:inherit;
  line-height:1.55;max-width:none;font-size:14px;}
#kw-app *{box-sizing:border-box;}"""


def strip_comments(html):
    """🔴 덫 1 — 주석 안의 </div> 는 태그가 아니라 글자다. 세기 전에 지운다."""
    return re.sub(r"<!--.*?-->", lambda m: " " * len(m.group(0)), html, flags=re.S)


def check_balance(body, label):
    clean = strip_comments(body)
    d, strays = 0, 0
    for m in re.finditer(r"<div\b[^>]*>|</div>", clean):
        if m.group(0) == "</div>":
            d -= 1
            if d < 0:
                strays += 1
                d = 0
        else:
            d += 1
    ok = (d == 0 and strays == 0)
    print(f"  {label}: 안 닫힌 것 {d} · 떠도는 닫힘 {strays} → {'✅' if ok else '🔴'}")
    return ok


def scope_css(css):
    """프리뷰 CSS 를 #kw-app 안에 가둔다. :root·body·* 는 #kw-app 로."""
    out = []
    for block in re.split(r"(?<=\})\s*", css):
        if not block.strip():
            continue
        m = re.match(r"^([^{]+)\{(.*)\}\s*$", block, re.S)
        if not m:
            out.append(block)
            continue
        sel, rule = m.group(1).strip(), m.group(2)
        if sel.startswith("@"):
            out.append(block)
            continue
        parts = []
        for one in [x.strip() for x in sel.split(",")]:
            if one in (":root", "html", "body", "*"):
                parts.append("#kw-app")
            elif one.startswith("body "):
                parts.append("#kw-app " + one[5:])
            else:
                parts.append("#kw-app " + one)
        out.append(", ".join(parts) + "{" + rule + "}")
    return "\n".join(out)


PREV_A = "<!-- ⟦본문 시작⟧"
PREV_B = "<!-- ⟦본문 끝⟧ -->"


def extract():
    """🔴 본문은 **표식**으로 잡는다. 마크업 모양(`<div class="tt">` 같은 것)을 시작점으로 삼으면
       그 div 를 지우는 순간 도구가 통째로 깨진다 — 2026-07-17 실제로 그랬다."""
    p = PREV.read_text()
    i, j = p.find("<style>"), p.find("</style>")
    if i < 0 or j < 0:
        sys.exit("🔴 프리뷰에 <style> 이 없습니다")
    css = p[i + 7:j]

    a, b = p.find(PREV_A), p.find(PREV_B)
    if a < 0 or b < 0:
        sys.exit(f"🔴 프리뷰에 본문 표식이 없습니다: {PREV_A} … {PREV_B}\n"
                 "   프리뷰 마크업 맨 앞뒤에 표식을 박으세요. 모양으로 잡으면 또 깨집니다.")
    a = p.find("-->", a) + 3
    body = p[a:b]

    c = p.find("<script>", b)
    js = p[c + 8:p.rfind("</script>")]
    return css, body, js


def transform(css, body, js):
    # B. 제목·목업 딱지 벗기기 — 스튜디오가 제목을 갖는다. 스튜디오는 진짜 화면이라 목업 딱지가 없다.
    #    (제목줄 `.tt` 와 전략 큐 칩은 2026-07-17 프리뷰에서 아예 제거됨 — 큐는 전략 메뉴 소유)
    body = re.sub(r'<div class="pv">.*?</div>', "", body, count=1, flags=re.S)

    # C. 색·폭
    css = scope_css(css)
    css = re.sub(r"#kw-app\{--bg:#051424;.*?\}", "", css, count=1, flags=re.S)
    css = re.sub(r"#kw-app\{background:var\(--bg\);[^}]*\}", "", css, count=1)
    css = PALETTE + "\n" + css
    css = css.replace("#07192a", "var(--card)").replace("#17334d", "var(--line)")

    # D. 주소는 스튜디오 탭이 소유 · 시작 스위치는 kwBoot 로
    js = js.replace("function go(w,a,b){vw(w,a,b);history.pushState({w:w,a:a,b:b},'');}",
                    "function go(w,a,b){vw(w,a,b);}   /* 주소는 스튜디오 탭이 소유한다 */")
    js = re.sub(r"window\.addEventListener\('popstate'.*?\);\n", "", js, count=1)
    js = js.replace("history.replaceState({w:'m'},'');",
                    "function kwBoot(){try{vw('m');}catch(e){console.error('키워드 화면 시작 실패',e);}}\n"
                    "window.kwBoot=kwBoot;   /* 프리뷰는 로드되며 저절로 켜졌다. 스튜디오는 탭을 열 때 켠다 */")
    return css, body, js


def main():
    write = "--write" in sys.argv
    css, body, js = extract()
    print("확정본 읽음 — CSS", len(css), "· HTML", len(body), "· JS", len(js))
    print("태그 짝 검사 (주석 지우고 셈):")
    if not check_balance(body, "프리뷰 본문"):
        sys.exit("🔴 프리뷰 본문의 태그 짝이 안 맞습니다. **프리뷰를 먼저 고치세요.** "
                 "이대로 옮기면 화면이 서로 겹쳐 흰 화면이 됩니다.")
    css, body, js = transform(css, body, js)
    check_balance(body, "옮길 본문 ")

    if not write:
        print("\n검사만 했습니다. 실제로 옮기려면 --write")
        return

    s = STUD.read_text()
    for A, B, new, note in ((MARK_CSS_A, MARK_CSS_B, css, f" — {WARN} */"),
                            (MARK_HTML_A, MARK_HTML_B, '<div id="kw-app">' + body + "</div>", ""),
                            (MARK_JS_A, MARK_JS_B, js, f" — {WARN} */")):
        i, j = s.find(A), s.find(B)
        if i < 0 or j < 0:
            sys.exit(f"🔴 스튜디오에 표식이 없습니다: {A}")
        s = s[:i] + A + note + "\n" + new + "\n" + s[j:]
    STUD.write_text(s)
    print("\n✅ 스튜디오에 옮겼습니다. 이제 화면 검사(부모·조상까지)를 돌리세요:")
    print("   node _os/tools/kw-visible-check.cjs")


if __name__ == "__main__":
    main()
