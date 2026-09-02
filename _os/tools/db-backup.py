#!/usr/bin/env python3
# _os/tools/db-backup.py — Supabase 전체 백업 → 비공개 GitHub 창고 (2026-09-02 재작성)
#
# 🔴 왜 다시 만들었나 — 병목을 «실측»했다 (2026-09-02)
#   옛 백업기는 표를 `ORDER BY ctid LIMIT 2000 OFFSET n` 으로 읽었다.
#   ctid 에는 색인이 없다. 그래서 한 쪽을 읽을 때마다 301만 행을 «통째로 정렬»했다.
#     실측 · hotel_master 2,000행 한 쪽
#       ORDER BY ctid  : 16.4초   ← 옛 방식
#       열쇠순(PK)     :  2.8초
#       열쇠순 2만행   :  4.5초   ← 새 방식
#     → 옛 방식으로 301만 행 = 1,508쪽 × 16.4초 = 약 6.9시간
#       새 방식으로 301만 행 =   151쪽 ×  4.5초 = 약 11분
#   🔴 시간 제한(300초·800초)이 문제가 아니었다. «읽는 방법»이 문제였다.
#      그래서 800초로 올려도 실패했고, 33일 동안 한 번도 커밋에 닿지 못했다.
#
# 🔴 왜 Vercel 이 아니라 GitHub Actions 인가
#   11분은 Vercel Pro 상한(800초 = 13분)에 너무 붙어 있다. 표가 늘면 바로 다시 죽는다.
#   Actions 는 6시간이고, tw-b2b 는 공개 저장소라 실행 시간이 «무료·무제한» 이다(공식 문서).
#   → 월 0원. (비공개 저장소였다면 월 2,000분 한도를 나눠 써야 했다)
#
# 저장 규칙 (BUSINESS-MAP §5-C)
#   · 같은 경로에 «덮어쓰기». 날짜 폴더로 쌓지 않는다 — git 델타가 바뀐 줄만 저장한다.
#   · 열쇠순으로 정렬해 내보내므로 자료가 안 바뀌면 파일이 «바이트까지 같다» → git 이 아무것도 안 쌓는다.
#   · 파일 한 개는 40MB 로 자른다. GitHub 은 50MiB 넘으면 경고, 100MiB 넘으면 거부한다(공식 문서).
#   · 창고는 반드시 private. hotels 에 호텔 사장님 연락처 3,185개가 있다.
#
# 필요한 비밀값 (GitHub Actions secrets)
#   SUPABASE_ACCESS_TOKEN : 창고 조회 (Vercel 환경변수에 이미 있는 값과 같다)
#   BACKUP_PAT            : tw-b2b-backup 에 쓸 수 있는 GitHub 열쇠
#   CLAUDE_OPS_TOKEN      : 진행 기록(backup_progress) 남기기용 · 이미 등록돼 있다

import json
import os
import sys
import time
import urllib.request
import urllib.error

PROJECT_REF = 'vjsludfjsphwnumuoqaj'
SB_API = 'https://api.supabase.com'
OUT = os.environ.get('BACKUP_OUT', 'backup-out')

PAGE_ROWS = 20000          # 한 번에 읽는 행수 — 실측 2만행 4.5초가 가장 좋았다
PART_BYTES = 40 * 1024 * 1024   # 파일 한 개 최대 40MB (GitHub 경고선 50MiB 아래)
SLEEP_BETWEEN = 0.3        # 창고를 몰아치지 않는다 (분당 60 · 동시 40 이 진짜 방어선)

# 🔴 다시 받을 수 있는 표는 백업하지 않는다 (옛 백업기에서 그대로 가져옴)
#    받는 법: python3 _os/tools/agoda-file-load.py --url <파일> --step all
#    ⚠️ 여기 표를 더할 땐 «정말 재현되는지» 먼저 확인할 것.
#    🔴 hotel_master 는 여기 넣지 않는다 — 대표님 2026-09-02:
#       "다시 받을 수 있다 ≠ 바로 복구된다. 아고다가 막히면 영영 복구 불가다."
REGENERABLE = {
    'agoda_inventory':      'agoda-file-load.py --step inventory',
    'agoda_inventory_name': 'agoda-file-load.py --step inventory (언어별 이름)',
    'agoda_city_name':      'agoda-file-load.py --step cities',
    'agoda_city':           '아고다 도시 목록 (EN 파일)',
}


def log(msg):
    print(f'[{time.strftime("%H:%M:%S")}] {msg}', flush=True)


def sb(query, tries=3):
    """Supabase 관리 API 로 질의한다. 창구(Vercel)를 거치지 않는다 —
    거치면 두 사업이 나눠 쓰는 시간당 한도를 백업 혼자 다 써버린다."""
    token = os.environ.get('SUPABASE_ACCESS_TOKEN')
    if not token:
        raise SystemExit('🔴 SUPABASE_ACCESS_TOKEN 이 없습니다. GitHub Actions secret 에 넣어야 합니다.')
    body = json.dumps({'query': query}).encode()
    req = urllib.request.Request(
        f'{SB_API}/v1/projects/{PROJECT_REF}/database/query',
        data=body,
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'User-Agent': 'tw-b2b-db-backup/2.0',   # 없으면 Cloudflare 가 막는다
        })
    last = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.loads(r.read().decode())
        except Exception as e:                       # noqa: BLE001
            last = e
            wait = 5 * (i + 1)
            log(f'  ↻ 조회 실패({e}) — {wait}초 후 재시도 {i + 1}/{tries}')
            time.sleep(wait)
    raise RuntimeError(f'창고 조회 실패: {last}')


# ---------- 표 목록과 열쇠 ----------

def list_tables():
    rows = sb("""
        select c.relname tbl, pg_table_size(c.oid) bytes, c.reltuples::bigint est
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by c.relname
    """)
    return [{'table': r['tbl'], 'bytes': int(r['bytes']), 'est': int(r['est'])} for r in rows]


def primary_keys():
    """칸 하나짜리 기본열쇠(PK)를 표별로 찾는다. 있으면 «열쇠순»으로 빠르게 읽는다."""
    rows = sb("""
        select c.relname tbl, a.attname col, t.typname typ
        from pg_index i
        join pg_class c on c.oid = i.indrelid
        join pg_namespace n on n.oid = c.relnamespace
        join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
        join pg_type t on t.oid = a.atttypid
        where i.indisprimary and i.indnatts = 1 and n.nspname = 'public'
    """)
    return {r['tbl']: (r['col'], r['typ']) for r in rows}


# ---------- CSV ----------

def cell(v):
    if v is None:
        return ''
    s = json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v)
    if any(ch in s for ch in '",\n\r'):
        s = '"' + s.replace('"', '""') + '"'
    return s


class PartWriter:
    """표 하나를 40MB 조각으로 나눠 쓴다. 파일 이름은 항상 part-0001.csv 꼴 —
    표가 커지거나 작아져도 이름 규칙이 안 바뀌어야 옛 파일이 남지 않는다."""

    def __init__(self, table):
        self.dir = os.path.join(OUT, 'data', table)
        os.makedirs(self.dir, exist_ok=True)
        self.header = None
        self.n = 0
        self.f = None
        self.size = 0
        self.parts = []

    def _open(self):
        self.n += 1
        path = os.path.join(self.dir, f'part-{self.n:04d}.csv')
        self.f = open(path, 'w', encoding='utf-8', newline='')
        self.size = 0
        self.parts.append(path)
        if self.header:
            line = ','.join(cell(h) for h in self.header) + '\n'
            self.f.write(line)
            self.size += len(line.encode())

    def write_rows(self, rows):
        if self.header is None:
            self.header = list(rows[0].keys())
        if self.f is None:
            self._open()
        for r in rows:
            line = ','.join(cell(r.get(h)) for h in self.header) + '\n'
            b = len(line.encode())
            if self.size + b > PART_BYTES:
                self.f.close()
                self._open()
            self.f.write(line)
            self.size += b

    def close(self):
        if self.f:
            self.f.close()
        if not self.parts:            # 빈 표도 «빈 채로» 남긴다 — 표가 있었다는 사실이 복구에 필요하다
            self._open()
            self.f.close()
        return len(self.parts), sum(os.path.getsize(p) for p in self.parts)


def dump_table(t, pk):
    """열쇠가 있으면 열쇠순, 없으면 자리순(ctid)으로 끝까지 읽는다.
    🔴 OFFSET 은 쓰지 않는다 — 뒤로 갈수록 느려져 옛 백업기가 여기서 죽었다."""
    name = t['table']
    w = PartWriter(name)
    total = 0

    if name in pk:
        col, _typ = pk[name]
        last = None
        while True:
            # 🔴 글자 열쇠는 홑따옴표로 감싼다. 쌍따옴표로 감싸면 «칸 이름»으로 읽혀 질의가 깨진다
            if last is None:
                where = ''
            elif isinstance(last, (int, float)) and not isinstance(last, bool):
                where = f'where "{col}" > {last}'
            else:
                where = "where \"%s\" > '%s'" % (col, str(last).replace("'", "''"))
            rows = sb(f'select * from public."{name}" {where} order by "{col}" limit {PAGE_ROWS}')
            if not rows:
                break
            w.write_rows(rows)
            total += len(rows)
            last = rows[-1][col]
            if len(rows) < PAGE_ROWS:
                break
            time.sleep(SLEEP_BETWEEN)
    else:
        # 열쇠 없는 표 — 자리(ctid) 범위로 자른다. 정렬이 없어 색인 없이도 빠르다.
        pages = sb(f"select coalesce(relpages,0) p, greatest(reltuples,1) r "
                   f"from pg_class c join pg_namespace n on n.oid=c.relnamespace "
                   f"where n.nspname='public' and c.relname='{name}'")[0]
        relpages = max(int(pages['p']), 1)
        per_page = max(float(pages['r']) / relpages, 1.0)
        step = max(int(PAGE_ROWS / per_page), 1)
        blk = 0
        while blk <= relpages:
            rows = sb(f"select * from public.\"{name}\" "
                      f"where ctid >= '({blk},0)'::tid and ctid < '({blk + step},0)'::tid")
            if rows:
                w.write_rows(rows)
                total += len(rows)
            blk += step
            time.sleep(SLEEP_BETWEEN)

    parts, size = w.close()
    return total, parts, size


# ---------- 표 설계도 ----------

def dump_schema():
    cols = sb("""
        select table_name, column_name, data_type, character_maximum_length maxlen,
               is_nullable, column_default, ordinal_position
        from information_schema.columns where table_schema='public'
        order by table_name, ordinal_position
    """)
    idx = sb("select tablename, indexdef from pg_indexes where schemaname='public' order by tablename, indexname")
    by = {}
    for c in cols:
        by.setdefault(c['table_name'], []).append(c)
    out = ['-- TW 창고 표 설계도 (자동 생성 · _os/tools/db-backup.py)',
           f'-- 생성 {time.strftime("%Y-%m-%d %H:%M:%S")} UTC',
           '-- 이 파일이 있어야 CSV 를 되돌릴 «그릇» 을 다시 만들 수 있다.', '']
    for t in sorted(by):
        out.append(f'CREATE TABLE IF NOT EXISTS public.{t} (')
        defs = []
        for c in by[t]:
            typ = c['data_type'] + (f"({c['maxlen']})" if c['maxlen'] else '')
            line = f"  {c['column_name']} {typ}"
            if c['column_default']:
                line += f" DEFAULT {c['column_default']}"
            if c['is_nullable'] == 'NO':
                line += ' NOT NULL'
            defs.append(line)
        out.append(',\n'.join(defs))
        out.append(');')
        out.append('')
        for i in [x for x in idx if x['tablename'] == t]:
            out.append(i['indexdef'] + ';')
        out.append('')
    return '\n'.join(out)


# ---------- 진행 기록 ----------

def save_progress(day, done):
    """backup_progress 에 «무엇을 언제 끝냈나» 를 남긴다. 실패해도 백업을 막지 않는다."""
    tok = os.environ.get('CLAUDE_OPS_TOKEN')
    if not tok or not done:
        return
    vals = ','.join(
        "('%s','%s',0,%d,%d,'ok')" % (day, d['table'].replace("'", "''"), d['rows'], d['bytes'])
        for d in done)
    q = ('insert into backup_progress (run_date, table_name, chunk_no, rows_done, bytes, status) '
         f'values {vals} on conflict (run_date, table_name, chunk_no) do nothing')
    try:
        req = urllib.request.Request(
            'https://www.staycurate.com/api/ops/db-query',
            data=json.dumps({'query': q}).encode(),
            headers={'Content-Type': 'application/json', 'x-ops-token': tok, 'x-ops-client': 'robot'})
        urllib.request.urlopen(req, timeout=120).read()
        log('진행 기록 저장 완료')
    except Exception as e:                            # noqa: BLE001
        log(f'⚠️ 진행 기록 저장 실패(백업 자체는 정상): {e}')


# ---------- 본체 ----------

def main():
    started = time.time()
    day = time.strftime('%Y-%m-%d')
    os.makedirs(os.path.join(OUT, 'schema'), exist_ok=True)

    all_tables = list_tables()
    tables = [t for t in all_tables if t['table'] not in REGENERABLE]
    skipped = [t for t in all_tables if t['table'] in REGENERABLE]
    log(f'표 {len(all_tables)}개 중 {len(tables)}개 백업 · {len(skipped)}개는 다시 받을 수 있어 건너뜀')

    pk = primary_keys()
    log(f'열쇠(PK) 있는 표 {len(pk)}개 — 열쇠순으로 읽는다')

    with open(os.path.join(OUT, 'schema', 'tables.sql'), 'w', encoding='utf-8') as f:
        f.write(dump_schema())
    log('표 설계도 저장 완료')

    manifest = {
        'generated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'project_ref': PROJECT_REF,
        'tables': {},
        'skipped_regenerable': {k: v for k, v in REGENERABLE.items()},
    }
    done = []
    # 큰 표를 먼저 — 도중에 문제가 생겨도 «제일 잃으면 안 되는 것»부터 들어간다
    for t in sorted(tables, key=lambda x: -x['bytes']):
        s = time.time()
        rows, parts, size = dump_table(t, pk)
        el = time.time() - s
        manifest['tables'][t['table']] = {'rows': rows, 'bytes': size, 'parts': parts,
                                          'sec': round(el, 1)}
        done.append({'table': t['table'], 'rows': rows, 'bytes': size})
        log(f'  ✅ {t["table"]:32s} {rows:>9,}행 {size / 1048576:7.1f}MB 조각{parts:>3} {el:6.1f}초')

    manifest['total_rows'] = sum(v['rows'] for v in manifest['tables'].values())
    manifest['total_bytes'] = sum(v['bytes'] for v in manifest['tables'].values())
    manifest['elapsed_sec'] = round(time.time() - started, 1)
    with open(os.path.join(OUT, '_manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # 화면이 «마지막 성공»을 읽는 곳
    with open(os.path.join(OUT, '_status.json'), 'w', encoding='utf-8') as f:
        json.dump({'last_success': manifest['generated_at'],
                   'tables': len(manifest['tables']),
                   'rows': manifest['total_rows'],
                   'mb': round(manifest['total_bytes'] / 1048576, 1),
                   'elapsed_sec': manifest['elapsed_sec'],
                   'runner': 'github-actions'}, f, ensure_ascii=False, indent=2)

    save_progress(day, done)
    log(f'🔴 끝 · 표 {len(done)}개 · {manifest["total_rows"]:,}행 · '
        f'{manifest["total_bytes"] / 1048576:.0f}MB · {manifest["elapsed_sec"]:.0f}초')


if __name__ == '__main__':
    sys.exit(main())
