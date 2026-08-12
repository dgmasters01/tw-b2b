# 도시 이름 별칭 체계 (2026-08-12)

> **대표님**: *"부르는 이름은 검색과 지명과 사람에 따라 달라진다. 하나만 기준으로 할 수 없다.
> 우리 DB에 구축해서 이런 경우의 수를 쌓아서 적용하는 게 중요하다."*

---

## 1. 무엇이 문제였나

같은 곳을 세 시스템이 다르게 부른다.

| 시스템 | 표기 | 예 |
|---|---|---|
| 아고다 명부 (`hotel_master.city`) | 한국어 · **복수 표기** | `유후` · `도쿄 / 동경` |
| 키워드 DB (`keyword.city_key`) | 영문 소문자 키 | `cc:japan|yufu` |
| 원고·발행 (`publications.city`) | **사람이 쓰는 말** | `유후인` |

**셋 다 각자 맞다.** 검색은 「유후인」이 맞고, 아고다 대조는 「유후」가 맞다.
→ 하나로 강제하면 깨진다. **여러 이름을 쌓고, 어느 이름으로 물어도 찾게 만든다.**

### 실측 — 아고다도 하나로 못 정했다
자기 자료에 `/` 로 두 표기를 같이 적어 두었다. **272개 도시.**
```
도쿄 / 동경 15,521곳 · 충칭 / 중경 13,771 · 지바 / 치바 343 · 마쓰모토 / 마츠모토 510
```

### 이 문제가 만든 실제 사고 (2026-08-12)
- 아고다 명부에서 유후인 호텔을 못 찾음 (「유후인」으로 찾아서)
- 트렌드가 없다고 판정 → 실제로는 `cc:japan|yufu` 에 검색어 26개 있었음
- 조사를 다시 돌리려다 **중복 키 오류**

---

## 2. 만든 것

### 🔴 기존 `city_alias` 는 손대지 않았다
`UNIQUE (target_code, city_key)` 제약이 걸려 있어 **한 도시에 한 이름만** 들어간다.
「경우의 수를 쌓는다」를 이 표로는 못 한다. → 옆에 새 표를 세우고 기존 181행을 이관했다.

### `city_alias_name` — 별칭 창고
```
city_key    cc:japan|yufu  (키워드 DB 키) 또는 ag:jp|유후 (아고다 키)
alias       실제 이름
alias_norm  자동 계산 — 공백·「/」·「·」·「-」 제거 + 소문자 (검색용)
lang        ko / ja / en …
kind        official 공식 · agoda 아고다표기 · search 사람이 검색하는 말
            romaji 로마자 · kanji 한자 · variant 표기변형 · local 현지명
source      어디서 왔나 (추적용)
```
한 도시에 **여러 행**이 생긴다.
```
cc:japan|yufu  유후인   search   ← 사람이 쓰는 말 (발행 이력에서)
cc:japan|yufu  유후     search   ← 기존 city_alias 이관
cc:japan|yufu  yufu     romaji   ← city_key 자체
ag:jp|유후      유후     agoda    ← 아고다 명부
```

### `city_link` — 아고다 키 ↔ 키워드 키 연결
```
city_key           cc:japan|yufu
agoda_key          ag:jp|유후
agoda_city         유후            ← hotel_master.city 와 그대로 대조 가능
agoda_country_iso  jp
```

### `find_city(q, country)` — 어느 이름으로 물어도 찾는다
```sql
select * from find_city('유후인', 'japan');
→ cc:japan|yufu  '유후인'  search  105점
```
점수: 완전일치 100 · 정규화일치 90 · 접두일치 70/60 (+ search 종류 5점 가산)

---

## 3. 지금 쌓인 것 (2026-08-12 실측)

| | 건수 |
|---|---|
| 별칭 총계 | **76,478** |
| 도시 키 | 75,000+ |
| 아고다 표기 | 75,652 |
| 「/」 분해 변형 | 546 |
| 사람이 쓰는 말(search) | 181 + 발행 이력 |
| 아고다↔키워드 자동 연결 | **97개 도시** |

### 검증
```
'유후인'(japan) → cc:japan|yufu (105점) ✅
'치바'(jp)      → ag:jp|지바 / 치바 ✅
'지바'(japan)   → cc:japan|chiba ✅
'동경'          → ag:jp|도쿄 / 동경 ✅
```

---

## 4. 🔴 쌓는 방법 — 사람이 다 적지 않는다

```
① 아고다 명부의 «/» 표기를 자동 분해        (272개 도시 → 546 변형)
② 원고·발행에 쓰인 도시명을 자동 등록        (사람이 실제로 쓴 말 = search)
③ 구글 장소 API 한국어명 자동 등록          (이미 운영 중 · source=google_places_ko)
④ 못 찾는 이름을 만나면 → 대표님께 물어 한 줄 추가
```
**마주칠 때마다 쌓인다.** 미리 다 채우지 않는다.

---

## 5. 쓰는 법

```sql
-- 사람이 쓴 도시명으로 아고다 호텔 찾기
select m.* from hotel_master m
where m.city = (select l.agoda_city from city_link l
                where l.city_key = (select city_key from find_city('유후인','japan') limit 1));

-- 키워드 DB 조회
select * from keyword
where city_key = (select city_key from find_city('유후인','japan') limit 1);
```

---

## 6. 남은 것

- 자동 연결 97개 → 나머지 도시는 이름이 달라 아직 미연결. 쓸 때마다 채운다
- `cc:unmapped|…` 로 들어간 도시는 사람 확인 필요
- 다른 언어(ja/en/zh) 별칭은 그 언어 채널을 켤 때 쌓는다

## 7. 관련
`BUSINESS.md` §7-E-3 · `_content/youtube/키워드-실측.md` v2 · `docs/ARCHITECTURE.md`
