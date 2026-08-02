# 🔧 봇 정비 문서 (Claude 전용)

**대표님용 요약본은 `_business/BOTS_MAP.md`** — 그쪽은 기술 용어 없이 쓴다. 이 문서와 **항상 같이 고친다.**

**마지막 정리**: 2026-08-02

---

## 크론 전체 (vercel.json)

| 경로 | 주기 | 하는 일 | 만지는 표 | 외부 호출 |
|---|---|---|---|---|
| `cron/kw-survey` | `0 * * * *` | 측정(PER_RUN=5) → 신규 발굴(3회 1번) → 옛 규칙 재발굴 | `snapshot`·`trend`·`keyword` | 구글 트렌드(무료) |
| `cron/hotel-addr-fill` | `40 * * * *` | 좌표 50m로 아고다 파일에서 주소·아고다번호 채움 | `hotels` | **없음** |
| `cron/hotel-fill` | `30 * * * *` | 원고 hid 중 `agoda_hotel` 에 없는 것 아고다 API 로 채움 | `agoda_hotel` | 아고다 LT API |
| `cron/yt-views` | `0 * * * *` | 조회수 수집(나이별 간격) | `publications` | 유튜브 API |
| `cron/hotel-district-fill` | `0 3 * * *` | 주소 → 지역(구) 파싱 | `hotels.district` | 없음 |
| `cron/hotel-geo-fill` | `0 8,12,16 * * *` | 좌표 없는 호텔 구글 Places 조회 | `hotels` | **구글 Places(유료)** |
| `cron/hotel-closed-check` | `0 4 * * 1` | 아고다서 사라진 호텔 폐업 확인 | `hotels.operating_status` | 구글 |
| `cron/drive-watch` | `0 2,7,12,21 * * *` | 드라이브 원고 감지 | `content_queue`·`publications` | 구글 드라이브 |
| `cron/db-backup` | `0 19 * * *` | private 레포로 덤프 | — | GitHub |
| `cron/kw-audit` | `15 5 * * *` | 키워드 자료 검사(축 분류 자동 수정) | `keyword`·`kw_audit_log` | 없음 |
| `cron/wiring-audit` | `50 5 * * *` | 페이지 간 어긋남 검사(알림만) | `wiring_audit_log` | GitHub raw |
| `cron/booking-health` | `0 0 * * *` | 예약↔호텔 정합성 | `hotels` | 없음 |
| `cron/wiring-check` | `0 1 * * *` | 창구↔화면 연결 점검 | — | 없음 |
| `ops/handoff-verify` | `0 22 * * *` | 인계서 검증 | — | 없음 |

🔴 **`hotel-geo-fill` 은 아직 구글을 쓴다.** 좌표 미확보가 9곳뿐이고 그마저 아고다 파일에 없는 곳이라
사실상 성과가 없다. **끄는 것을 검토할 것**(대표님 확인 필요).

---

## 데이터 흐름 (의존 순서)

```
agoda_hotel (52만·좌표·주소)
     │
     ├─ hotel-addr-fill ─→ hotels.address + hotels.agoda_hotel_id
     │                          │
     │                          └─→ hotel-district-fill ─→ hotels.district
     │                                                          │
     │                                                          ▼
     │                                              v_district_star (분모)
     │                                                          │
     └─ (분모) ─→ content-keywords invNear ────────────────────┘
                          │
                          ▼
              스튜디오 키워드 · 지역 성급 분포
```

**⚠ 순서가 중요하다**: 주소 → 지역 → 분모. 앞이 비면 뒤가 전부 0 또는 이상값이 된다.

---

## 🔴 고칠 때 같이 봐야 하는 짝

| 고치는 것 | 같이 고쳐야 하는 것 | 이유 |
|---|---|---|
| `studio.html` 의 `#kw-app` | **`studio-keyword-preview.html`** | 프리뷰가 원본. `_os/tools/kw-preview-to-studio.py` 로 이식하면 studio 쪽이 덮인다 |
| 지역 분모 계산 | `v_district_star` **와** `content-keywords.js` 의 `invNear` | 두 곳에서 따로 센다. 한쪽만 고치면 화면마다 숫자가 다르다 |
| 검색어 축 판정 | `kw-survey-now.js` 의 `axisOf` **와** `kw-audit.js` 의 `WORDS` | 규칙이 두 벌이면 봇끼리 싸운다 |
| 화면 문구(한국어) | 같은 파일의 `STUDIO_I18N` 영어 사전 | 한쪽만 고치면 영어 화면에 옛 문구가 남는다 |
| 호텔 자료 구조 | `studio` · `manager-dashboard` · `admin-hotel-detail` · `sales` · `marketing` | 5개 화면이 같은 `hotels` 를 본다 |

**`wiring-audit` 봇이 이 목록을 매일 검사한다.** 짝을 추가하면 그 봇의 `PAIRS`·`STALE` 에도 넣을 것.

---

## 실패 유형과 원인 (겪은 것)

| 증상 | 진짜 원인 | 고친 방법 |
|---|---|---|
| 진행률 127% | 지난달 측정까지 셈 | 이번 달 `snapshot.id` 로 제한 |
| 「미개척 -53곳」 | 분모가 `agoda_inventory`(도시당 100~200) | `agoda_hotel` 로 교체 |
| 「우리 89 > 전체 73」 | 위와 같음 (`v_district_star`) | 좌표 800m 조인으로 재작성 |
| 「구글이 못 찾았습니다」 | 좌표는 있는데 **주소**가 빔 | `hotel-addr-fill` 신설 |
| 「가오슝 여행」이 숙박 | 씨앗 축을 물려받음 | `axisOf` — 나온 말로 판정 |
| TOP1↔TOP3 뒤바뀜 | 링크 붙인 **순서**를 순위로 씀 | `hotel-rank.js` — 원고 글자로 판정 |
| 봇이 매시간 헛돎 | `PER_RUN=15` 로 구글 429 | 5로 낮춤 |
| 깃허브 실패 메일 폭탄 | YAML 깨짐 + `actions` 권한 없음 + push 재시도 부족 | 각각 수정 |

---

## 검사 봇 3종

### `kw-audit` (매일 KST 14:15)
- **자동 수정**: 축 분류 오류(`axisOf` 규칙 적용)
- **알림만**: 붙임말 언어 오류 · 도시명 없는 검색어 · 분모 뒤집힘 · 분모 0 · 미측정 도시
- 결과 → `kw_audit_log` → `content-keywords?view=cities` 의 `audit` → 관리자 건강검진
- ⚠ Supabase 는 1,000줄씩만 준다. **반드시 `range()` 로 나눠 읽을 것**(안 그러면 앞 1,000개만 보고 「이상 없음」이라 한다)

### `wiring-audit` (매일 KST 14:50)
- `PAIRS`: 같이 움직여야 하는 파일 짝
- `STALE`: 이제 쓰면 안 되는 자료원(`agoda_inventory` 등)
- DB 정합성: 호텔 장부 결손률 · 분모 뒤집힘
- 🔴 **고치지 않는다.** 코드 자동 수정은 사고를 키운다

### `health-check-admin` (10분)
- 사이트·창구·배포 상태 → `_admin/_health.json`

---

## 한도

| 대상 | 한도 | 현재 |
|---|---|---|
| `ops/db-query` | **120회/시간** | 🔴 올리지 말 것 — 600으로 올렸다가 DB 뻗음 |
| `ops/github-commit` | 30회/시간 | |
| 구글 트렌드 | 명시 없음(429 잦음) | 회차당 5개·재시도 3회 |
| 유튜브 API | 1만 유닛/일 | 여유 |
| 구글 Places | 5,000건/월 무료 | 최근 7일 67건 |
| 아고다 파일 | 무제한 | 421MB zip |
