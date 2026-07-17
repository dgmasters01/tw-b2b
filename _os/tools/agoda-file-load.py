#!/usr/bin/env python3
"""
_os/tools/agoda-file-load.py — 아고다 「숙소 데이터 파일」을 우리 창고에 담는다.

왜 이게 있나 (2026-07-17):
  대표님이 partners.agoda.com/tools/hotelData 에서 파일을 찾아 분모 문제를 풀었다(D-065 63).
  그런데 **그날 클로드가 받는 방법을 레포에 안 박았다.** 다음 채팅의 클로드는 작업 공간이 초기화돼
  파일이 사라진 걸 보고 **대표님께 링크를 다시 달라고 물었다.** 같은 걸 두 번 묻지 않으려고 이 파일을 만든다.
  → 룰: **한 번 받은 재료는 「받는 법」을 레포에 박는다.** 재료 자체는 못 박아도(448MB) 방법은 박힌다.

🔴 URL 은 여기 안 적는다.
  파일 이름에 우리 파트너 계정 GUID 가 박혀 있다(= 열쇠나 마찬가지). **이 레포는 공개다.**
  (2026-07-16 ops 토큰이 공개 레포에 평문으로 새서 교체한 사고 — 같은 실수 금지)
  URL 은 DB `agoda_file_source` 표에 있다. 없으면 대표님께 한 번만 여쭌다:
     partners.agoda.com → 숙소 데이터 파일 → 언어 선택 → 다운로드 버튼 우클릭 → "링크 주소 복사"

받는 법 (실측 2026-07-17):
  - 🔴 **서버가 받는다.** 대표님 PC 에서 448MB 가 두 번 끊겼다. 여기선 130초(3.4MB/s).
  - 🔴 **이어받기 안 된다.** 이 서버는 Range 를 무시하고 매번 처음부터 준다(200, 206 아님).
       → 한 번의 명령 안에서 끝까지 받아야 한다. 백그라운드(`&`)로 돌리면 명령이 끝날 때 같이 죽는다(152MB 에서 잘림).
  - 🔴 **아고다 자동 피드(affiliatefeed.agoda.com/datafeeds/feed/getfeed)로는 못 받는다.**
       실측: 이 계정은 전 종류(대륙·나라·도시·호텔) **빈 XML** 만 준다. 파일만이 길이다.

파일 (KO · 2026-07-17 실측):
  448MB zip → 2.0GB CSV · **3,038,046곳 · 76,978도시 · 221나라** · 39칸
  🔴 KO 는 EN 의 번역본이 아니다. KO 304만 / EN 127만. **분모는 KO.**

담는 곳 (셋을 갈라 둔다):
  ① `agoda_city_name(city_id, target_code, label, country_label, hotels)`
       = **세계 전 도시의 분모** + 그 언어 이름. 76,978행 ≈ 8MB. **가볍다. 전부 담는다.**
       ⚠️ `agoda_city.hotels` 는 EN 기준이다(오사카 5,419). 분모로 쓰면 절반이 된다. 분모는 이 표.
  ② `agoda_inventory` + `agoda_inventory_name`
       = **상세**(좌표·성급·평점·객실수·설명). 무겁다(행당 ~520B).
       🔴 **전 세계 304만 행을 담지 않는다.** 담으면 DB 47MB → 1.6GB 이고,
          매일 도는 백업 봇(BL-DB-BACKUP)이 표를 CSV 로 깃허브에 밀어넣는데 **깃허브는 파일 100MB 가 상한**이다.
          = 백업이 통째로 죽는다(헌법 9조). **예약이 있는 도시부터** 담는다.
  ③ `hotels` 빈칸 = 파일의 `hotel_id` ↔ 우리 `agoda_hotel_ids` 로 이어서 채운다.
       좌표·아고다도시번호·성급·평점 — **구글 호출 0건.**
       파일에 있으면 `agoda_live_id` 에 그 번호를 박는다 = **아고다가 지금 판다는 증거.**
       파일에 없으면? 폐업이거나 아고다에서 내려간 것 = 좌표봇이 구글로 확인할 몫.

쓰는 법:
  python3 _os/tools/agoda-file-load.py --url "<파일 URL>" --step all
  python3 _os/tools/agoda-file-load.py --csv KO.csv --step cities        # 분모만
  python3 _os/tools/agoda-file-load.py --csv KO.csv --step hotels        # 우리 호텔 빈칸만
  python3 _os/tools/agoda-file-load.py --csv KO.csv --step inventory --top 8   # 예약 상위 N개 도시 상세
  환경변수: CLAUDE_OPS_TOKEN (창구 열쇠)

  🔴 창구 한도 = **시간당 60회.** 1회당 SQL 900KB 이하로 끊는다.
     한글은 `json.dumps` 가 기본으로 `\\uXXXX` 로 바꿔 **6배로 부푼다** → `ensure_ascii=False` 필수.
     안 그러면 413(Payload Too Large). 2026-07-17 클로드가 밟았다.
"""
import argparse, csv, json, os, subprocess, sys, time, urllib.request, collections

OPS = "https://gohotelwinners.com/api/ops/db-query"
TOK = os.environ.get("CLAUDE_OPS_TOKEN", "")
csv.field_size_limit(10**9)

def q(sql, retry=8):
    for i in range(retry):
        try:
            req = urllib.request.Request(OPS,
                data=json.dumps({"query": sql}, ensure_ascii=False).encode("utf-8"),
                headers={"x-ops-token": TOK, "Content-Type": "application/json", "User-Agent": "tw-claude"})
            return json.load(urllib.request.urlopen(req, timeout=120))
        except Exception as e:
            if i == retry - 1: raise
            time.sleep(70 if "429" in str(e) else 5)   # 429 = 시간당 60회 한도. 기다리면 풀린다

def S(v):
    v = (v or "").strip()
    return "null" if v == "" else "'" + v.replace("'", "''") + "'"
def N(v):
    try: return repr(float(v))
    except: return "null"
def I(v):
    try: return str(int(float(v)))
    except: return "null"

def push(vals, head, tail, label, cap=900_000):
    """SQL 을 900KB 씩 끊어 보낸다. 끊긴 데서 다시 부르면 on conflict 라 안전하다."""
    buf, size, done, reqs = [], 0, 0, 0
    for v in vals:
        if size + len(v) > cap and buf:
            q(head + ",".join(buf) + tail); done += len(buf); reqs += 1; buf, size = [], 0
        buf.append(v); size += len(v) + 1
    if buf:
        q(head + ",".join(buf) + tail); done += len(buf); reqs += 1
    print(f"  ✅ {label} {done:,}행 · 요청 {reqs}회", flush=True)

def download(url, out="KO.zip"):
    # 🔴 한 번에 끝까지. 이어받기 없음(서버가 Range 무시). 백그라운드 금지.
    subprocess.run(["curl", "-sL", "--max-time", "290", url, "-o", out], check=True)
    subprocess.run(["unzip", "-o", "-q", out], check=True)
    return [f for f in os.listdir(".") if f.endswith(".csv")][0]

def read(path):
    f = open(path, encoding="utf-8", errors="replace")
    r = csv.reader(f); h = next(r)
    ix = {n.lstrip("\ufeff"): i for i, n in enumerate(h)}
    return r, ix

def step_cities(path, target):
    """① 세계 전 도시 분모."""
    r, ix = read(path)
    cnt = collections.Counter(); nm = {}
    for row in r:
        if len(row) < 39: continue
        k = row[ix["city_id"]]; cnt[k] += 1; nm[k] = (row[ix["city"]], row[ix["country"]])
    vals = [f"({int(k)},'{target}',{S(nm[k][0])},{S(nm[k][1])},{v},'agoda hotelData file {target.upper()}')"
            for k, v in cnt.items() if k.isdigit()]
    print(f"  도시 {len(vals):,}개")
    push(vals,
         "insert into agoda_city_name (city_id,target_code,label,country_label,hotels,source) values ",
         " on conflict (city_id,target_code) do update set label=excluded.label,country_label=excluded.country_label,"
         "hotels=excluded.hotels,source=excluded.source,updated_at=now();", "분모")

def step_hotels(path):
    """③ 우리 호텔 빈칸 — 구글 0건. 원본은 안 덮는다(coalesce)."""
    pairs = [x["pair"].split("|") for x in q(
        "select h.id::text||'|'||e.aid as pair from hotels h, "
        "lateral jsonb_array_elements_text(coalesce(h.agoda_hotel_ids,'[]'::jsonb)) e(aid)")["rows"]]
    want = {aid for _, aid in pairs}
    r, ix = read(path); got = {}
    for row in r:
        if len(row) >= 39 and row[0] in want:
            got[row[0]] = row
    best = {}
    for hid, aid in pairs:
        if aid not in got: continue
        rv = int(got[aid][ix["number_of_reviews"]] or 0)
        if hid not in best or rv > best[hid][0]: best[hid] = (rv, aid, got[aid])
    print(f"  파일에서 재료를 얻은 호텔 {len(best):,}곳")
    vals = [f"('{hid}'::uuid,{I(a)},{I(x[ix['city_id']])},{N(x[ix['latitude']])},{N(x[ix['longitude']])},"
            f"{I(x[ix['star_rating']])},{N(x[ix['rating_average']])},{I(x[ix['number_of_reviews']])})"
            for hid, (_, a, x) in best.items()]
    head = ("update hotels h set agoda_live_id=v.aid, agoda_live_checked_at=now(),"
            " agoda_city_id=coalesce(h.agoda_city_id,v.cid), latitude=coalesce(h.latitude,v.lat),"
            " longitude=coalesce(h.longitude,v.lng), star_rating=coalesce(h.star_rating,v.star),"
            " review_score=coalesce(h.review_score,v.rscore), review_count=coalesce(h.review_count,v.rcnt),"
            " geo_status=case when h.latitude is null and v.lat is not null then 'agoda_file' else h.geo_status end,"
            " geo_checked_at=case when h.latitude is null and v.lat is not null then now() else h.geo_checked_at end,"
            " updated_at=now() from (values ")
    push(vals, head, ") as v(id,aid,cid,lat,lng,star,rscore,rcnt) where h.id=v.id;", "호텔 빈칸", cap=300_000)

def step_inventory(path, top, target):
    """② 상세 — 예약 상위 N개 도시만. 전 세계는 안 담는다(백업 봇이 죽는다)."""
    ids = [str(x["city_id"]) for x in q(
        "select ac.city_id from (select city,country,coalesce(sum(booking_count),0) bk from hotels "
        "group by 1,2) x join agoda_city ac on lower(ac.city)=lower(x.city) and lower(ac.country)=lower(x.country) "
        f"order by x.bk desc limit {top}")["rows"]]
    r, ix = read(path)
    rows = [row for row in r if len(row) >= 39 and row[ix["city_id"]] in ids]
    print(f"  도시 {len(ids)}개 · {len(rows):,}행")
    inv, nam = [], []
    for x in rows:
        ov = (x[ix["overview"]] or "")[:2000]
        inv.append(f"({I(x[0])},{S(x[ix['city']])},{I(x[ix['city_id']])},{S(x[ix['country']])},{I(x[ix['country_id']])},"
                   f"{S(x[ix['hotel_name']])},{S(x[ix['hotel_translated_name']])},{S(x[ix['addressline1']])},{S(x[ix['zipcode']])},"
                   f"{N(x[ix['star_rating']])},{N(x[ix['latitude']])},{N(x[ix['longitude']])},{I(x[ix['numberrooms']])},"
                   f"{I(x[ix['yearopened']])},{I(x[ix['number_of_reviews']])},{N(x[ix['rating_average']])},"
                   f"{S(x[ix['photo1']])},{S(ov)},{S(x[ix['url']])})")
        nam.append(f"({I(x[0])},'{target}',{S(x[ix['hotel_translated_name']])},{S(ov)})")
    push(inv, "insert into agoda_inventory (agoda_hotel_id,city,city_id,country,country_id,hotel_name,hotel_name_ko,"
              "address,zipcode,star_rating,latitude,longitude,number_of_rooms,year_opened,review_count,review_score,"
              "photo1,overview,url) values ", " on conflict (agoda_hotel_id) do nothing;", "재고")
    push(nam, "insert into agoda_inventory_name (agoda_hotel_id,target_code,hotel_name,overview) values ",
              " on conflict (agoda_hotel_id,target_code) do nothing;", "이름")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--url"); p.add_argument("--csv")
    p.add_argument("--step", default="all", choices=["all", "cities", "hotels", "inventory"])
    p.add_argument("--top", type=int, default=8)
    p.add_argument("--target", default="ko")
    a = p.parse_args()
    if not TOK: sys.exit("CLAUDE_OPS_TOKEN 이 없습니다.")
    path = a.csv or download(a.url)
    if a.step in ("all", "cities"):    step_cities(path, a.target)
    if a.step in ("all", "hotels"):    step_hotels(path)
    if a.step in ("all", "inventory"): step_inventory(path, a.top, a.target)
