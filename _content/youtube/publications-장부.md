# publications — 발행 이력 장부

> 만든 날: 2026-07-09
> 왜 만들었나: 원고를 유튜브에 올린 기록을 남겨서, 나중에 "어느 영상에서 예약이 나왔나"를 알기 위해서.

---

## 이게 왜 필요한가

호텔에 `$200 · 6개월 노출`을 팔고 있습니다. 호텔이 "우리 언제 나왔어요?"라고 물으면
답할 자료가 지금 없습니다. 이 장부가 그 답입니다.

그리고 아고다 예약이 들어왔을 때, `cid`(채널)와 `hid`(호텔)로 이 장부를 뒤져서
어느 영상 덕분인지 찾아냅니다.

---

## 칸 설명

| 칸 | 무엇 | 어떻게 채워지나 |
|---|---|---|
| channel_code | 채널 코드 (HG, HT, TW…) | 원고 cid에서 자동 |
| cid | 아고다 채널 번호 | 원고에서 자동 |
| status | draft / scheduled / published / failed | 직원 입력 |
| scheduled_at | 예약 발행 시각 | 직원 입력 |
| published_at | 실제 공개된 시각 | **시스템이 자동 확인** |
| youtube_url | 유튜브 주소 | 직원 입력 |
| youtube_video_id | 영상 고유번호 | 주소에서 자동 |
| country / city / region | 나라 · 도시 · 지역 | 파일명에서 자동 |
| star / price_band | 성급 · 가격대 | 파일명에서 자동 |
| title | 확정 제목 | 시스템 생성 |
| hid_top1/2/3 | 호텔 3개 아고다 번호 | 원고 링크에서 자동 |
| source_filename | 원고 파일명 | 자동 |
| created_by | 누가 올렸나 | 자동 |

---

## 안전장치 (시험 완료)

1. **상태값 검사** — draft / scheduled / published / failed 넷 말고는 안 들어감
2. **중복 방지** — 같은 유튜브 영상을 두 번 기록 못 함

---

## 예약 귀속 규칙

예약 1건이 들어오면 이렇게 찾습니다.

```sql
select id from publications
where cid = :예약_cid
  and :예약_hid in (hid_top1, hid_top2, hid_top3)
  and published_at <= :예약날짜        -- 같은 날이면 새 영상 쪽
order by published_at desc
limit 1;
```

- 같은 날 예약 = 그날 올린 영상 것
- 같은 호텔을 나중에 다시 소개하면, 그 뒤 예약은 새 영상 것
- 못 찾으면 '미귀속'으로 따로 모음 (시청자가 다른 호텔을 예약한 경우)

**귀속은 언제든 다시 계산합니다.** 그래서 발행일을 늦게 확인해도 결과가 같습니다.

---

## 만든 SQL

```sql
create table if not exists publications (
  id uuid primary key default gen_random_uuid(),
  channel_code text not null,
  cid text not null,
  status text not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  youtube_url text,
  youtube_video_id text,
  country text,
  city text,
  region text,
  star int,
  price_band text,
  title text,
  hid_top1 text,
  hid_top2 text,
  hid_top3 text,
  source_filename text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publications_status_chk check (status in ('draft','scheduled','published','failed'))
);
create index if not exists idx_pub_cid_pub  on publications (cid, published_at desc);
create index if not exists idx_pub_status    on publications (status);
create index if not exists idx_pub_hid1      on publications (hid_top1);
create index if not exists idx_pub_hid2      on publications (hid_top2);
create index if not exists idx_pub_hid3      on publications (hid_top3);
create unique index if not exists uq_pub_video on publications (youtube_video_id) where youtube_video_id is not null;
```

---

## 다른 곳에 영향

**없습니다.** 새 장부이고, 기존 장부(bookings_agoda, hotels, channel_cid_map)와
연결선을 걸지 않았습니다. 나중에 필요하면 그때 겁니다.
