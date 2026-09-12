# 🔴 열쇠 지도 — 「어디에 들어갈 때 무엇을 붙이나」 (정본)

> 신설 2026-09-07 · 대표님 지시: *«열쇠를 분리해야 된다고 해서 개발할때 분리를 햇어요. 열쇠는 다 있어.
> 서비스를 들어갈때 어느 열쇠를 열어야 되는지 정리를 안해 놓은것 같아. 그래서 할때 마다 너가 없다고 하고
> 안된다고 하는것 같애. 이거는 다른창에서도 다른 프로젝트를 작업하면 너가 헤갈려서 없다고 하는 부분이야.»*
>
> 🔴 **이 문서를 읽기 전에 「없다」·「안 된다」·「열쇠가 안 맞는다」고 말하지 않는다.**
> 아래는 전부 2026-09-07 에 **실제로 눌러서 확인한** 값이다. 추측이 아니다.

---

> 🔴🔴 **2026-09-11 사고** — 이 공개 레포의 `_business/shop/SEARCH_REBUILD.md` 에 x-ops-token «값»이 이틀 동안 적혀 있었다(클로드가 붙여넣기 예시로 적음).
> 값은 지웠지만 git 이력에 남으므로 **열쇠를 교체한다**(SHOP_ROLLBACK §68). 🔴 **이 레포의 어떤 문서에도 열쇠 값을 적지 않는다 — 예시에도.**

## 0. 🔴 열쇠는 «사업마다 다르다» (2026-09-12 전면 교체 · SHOP_ROLLBACK §74)

> 🔴 **아래 옛 문구 «열쇠는 하나»는 폐기됐다.** 2026-09-11 공개 레포 노출 사고로 «하나면 하나가 새면 전부 열린다»가 증명됐다.

| 사업 | 문(창구) | 열쇠 이름 | 그 문이 여는 범위 |
|---|---|---|---|
| 스튜디오 | `https://gohotelwinners.com/api/ops/…` | `CLAUDE_OPS_TOKEN` (Vercel tw-b2b · GitHub tw-b2b Actions) | **tw-b2b 레포 · 창고 A** 만 |
| 블로그 | `https://www.staycurate.com/api/ops/…` | `OPS_TOKEN` (Vercel staycurate) | **staycurate 레포 · 창고 A** 만 |
| 개인 | `https://tw-personal-os.vercel.app/api/ops/…` | `CLAUDE_OPS_TOKEN` (Vercel tw-personal-os) | **tw-personal-os 레포 · 창고 B** 만 |
| 여행능력자들 SHOP | `https://travelwinners-shop.vercel.app/api/ops/…` | `x-shop-ops-token` = `SHOP_OPS_TOKEN` | **travelwinners-shop 레포 · 창고 C** 만 · GitHub 열쇠도 레포 전용(`SHOP_GITHUB_PAT`) |

🔴 **네 값이 전부 다르다.** 하나가 새도 나머지 셋은 열리지 않는다 — 2026-09-12 서로 401 확인.
🔴 **열쇠 «값»은 어떤 문서에도 적지 않는다.** 모르면 대표님께 여쭙거나 최근 대화에서 찾는다.
🔴 새 사업을 만들면 **문·열쇠·레포·창고를 처음부터 따로** 만든다(D-111·D-112). 편의로 남의 문에 붙이지 않는다.

## 0-A. 🔴 shop 은 «전용 창구·전용 열쇠»다 (2026-09-12 · SHOP_ROLLBACK §71·§72)

| 무엇 | 주소 | 열쇠(머리말) |
|---|---|---|
| shop 창고(C) SQL | `POST https://travelwinners-shop.vercel.app/api/ops/sql` · `{"query":…}` | `x-shop-ops-token` (Vercel `SHOP_OPS_TOKEN`) |
| shop 레포 읽기/쓰기 | `GET/POST https://travelwinners-shop.vercel.app/api/ops/repo` | 〃 |

- GitHub 열쇠는 shop 서버 안의 `SHOP_GITHUB_PAT` — **travelwinners-shop 레포만** 권한(fine-grained · 2027-09-11 만료)
- 일꾼 창구는 `CRON_SECRET` — Vercel 크론만 부를 수 있다
- 🔴 **아래 «열쇠는 하나»는 스튜디오·블로그·개인 이야기다. shop 에는 적용되지 않는다.**
- 🔴 모든 호출(거절 포함)이 `shop_ops_log` 에 남는다

## 0. 한 줄 요약 — 열쇠는 «하나»다

**분리된 것은 «문·레포·창고»이지 열쇠가 아니다.**
`x-ops-token` 하나로 **레포 4개 · 창고 3개 전부**에 들어간다. 대상은 열쇠가 아니라 **몸통에 적는 이름**(`repo=` · `project_ref=`)으로 고른다.

```
헤더  x-ops-token: <대표님이 채팅 시작 때 주시는 값>     ← 늘 같다
      x-ops-client: claude                              ← 한도 차선 구분용, 조회 때 붙인다
몸통  "repo": "..."          ← 어느 레포인가
      "project_ref": "..."   ← 어느 창고인가   🔴 안 적으면 «엉뚱한 창고»로 간다
```

---

## 1. 문 (창구가 열려 있는 주소)

| 문 | 쓸 수 있는 것 | 한도 |
|---|---|---|
| **`gohotelwinners.com/api/ops/…`** | `github-read` · `github-commit` · `db-query` **(창고 3개 전부)** | commit 30/h · read 120/h |
| **`www.staycurate.com/api/ops/db-query`** | 창고 A 만 (기본값 고정) | 시간당 1,200 · 분당 60 |

🔴 **한도는 문마다 «따로»다** — 한쪽이 막혀도 다른 쪽은 산다 (2026-09-03 실측 정정).

---

## 2. 레포 4개 — `repo=` 에 적는 이름

| 사업 | `repo=` | 무엇 |
|---|---|---|
| 스튜디오 · B2B · OS 문서 | **`tw-b2b`** | 헌법·결정·일꾼 명부·shop 정본 문서가 전부 여기 |
| 블로그 | **`staycurate`** | staycurate.com |
| 개인 업무 시스템 | **`tw-personal-os`** | 1hogi.gohotelwinners.com |
| 여행능력자들 샵 | **`travelwinners-shop`** | travelwinners-shop.vercel.app |

- 읽기 `GET gohotelwinners.com/api/ops/github-read?repo={위}&path={경로}` (폴더는 응답 `entries`)
- 저장 `POST gohotelwinners.com/api/ops/github-commit` body `{repo, path, content, message}` — **content 는 그냥 글자**(base64 금지)
- 🔴 `repo` 를 **안 적으면 `tw-b2b`** 로 간다. 샵 파일을 찾다가 「없다」가 나오면 대개 이것이다.
- 🔴 저장 결과가 `created` 면 **잘못된 자리에 새로 만든 것**이다 — 즉시 되돌린다.

## 3. 창고 3개 — `project_ref=` 에 적는 값

| 창고 | `project_ref` | 쓰는 서비스 |
|---|---|---|
| **A** | `vjsludfjsphwnumuoqaj` | 블로그 + 스튜디오 **(공유)** · 표 106 |
| **B** | `fifsuiwsgdounlpialqx` | 개인 업무 시스템 · 표 41 |
| **C** | `jyjcdxdezjfcikqndxeo` | **여행능력자들 샵** (도쿄) · 완전 분리 |

`POST gohotelwinners.com/api/ops/db-query` body `{"query": "...", "project_ref": "위 값"}` — UPDATE·DDL 도 통과.

🔴 **가장 흔한 사고 — `project_ref` 를 안 적으면 창고 A 로 간다.**
샵 작업 중에 안 적으면 **스튜디오 창고를 열고 「그런 표는 없다」**고 하게 된다. 표가 없는 게 아니라 **다른 집을 연 것**이다.

---

## 4. 서비스별 «한 줄 요약» — 이것만 보고 시작해도 된다

| 무슨 일을 하려는가 | 붙이는 것 |
|---|---|
| 샵 코드를 읽는다 | `repo=travelwinners-shop` |
| 샵 창고를 연다 | `project_ref=jyjcdxdezjfcikqndxeo` |
| 샵 «문서»(정본·결정·일꾼 명부)를 읽는다 | 🔴 `repo=tw-b2b` — **문서는 shop 레포가 아니라 tw-b2b 에 있다** |
| 블로그 코드 | `repo=staycurate` |
| 블로그·스튜디오 창고 | `project_ref=vjsludfjsphwnumuoqaj` (또는 staycurate 문에서 생략) |
| 스튜디오 발행 기록(`publications`) | 창고 A |
| 개인 업무 시스템 | `repo=tw-personal-os` · `project_ref=fifsuiwsgdounlpialqx` |

## 5. 각 서비스 «안»에서 쓰는 열쇠 (Vercel 환경변수 — 값은 문서에 적지 않는다)

| 어디 | 이름 |
|---|---|
| 공통 창구 | `CLAUDE_OPS_TOKEN`(=x-ops-token) · `SUPABASE_ACCESS_TOKEN`(sbp_… Management API) · `GITHUB_PAT` |
| 스튜디오에만 | `AGODA_API_KEY` · `AGODA_SITE_ID` · `GOOGLE_PLACES_API_KEY` |
| 블로그 13개 | `OPS_TOKEN` · `SUPABASE_URL` · `SUPABASE_SERVICE_KEY` · `ADMIN_USER/PASS` · `RAKUTEN_*` · `GSC_*` |
| 샵 | `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `AGODA_API_KEY` · 🔴 `SHOP_HOOK_TOKEN`(**2026-09-12 기본값 삭제 — 없으면 발행 창구가 닫힌다.** shop·tw-b2b 두 곳에 같은 값) · `SITE_URL` |

🔴 **값은 절대 문서에 적지 않는다.** 이름과 «어디에 있는지»만 적는다.
🔴 **열쇠가 안 맞으면 「없다」가 아니라 「옛 값을 집은 것」이다** — 최근 값을 스스로 찾아 쓴다 (대표님 2026-09-02).

---

## 6. 🔴 「없다」고 적혀 있었지만 실제로는 되는 것 (2026-09-07 실측 정정)

| 문서에 적혀 있던 말 | 실측 |
|---|---|
| `state.json` 「개인업무시스템 — DB 창구는 열쇠 값이 달라 클로드가 못 본다」 | **틀렸다.** `gohotelwinners` 문 + `project_ref=fifsuiwsgdounlpialqx` 로 **열린다**(표 41개 확인) |
| 「github-read 가 shop 레포를 못 읽는다」 | 2026-09-05 에 이미 해소됨. 4개 레포 전부 읽힌다 |

**이 표가 이 문서의 존재 이유다.** 한 번 「없다」고 적히면 다음 채팅의 클로드가 그걸 사실로 믿고 또 「없다」고 한다.
🔴 **「없다」를 적기 전에 반드시 한 번 눌러 본다. 눌러 보지 않은 「없다」는 적지 않는다.**

## 7. 실측 기록 (2026-09-07)

```
레포 읽기   staycurate OK · tw-personal-os OK · travelwinners-shop OK
            tw-b2b 은 README.md 가 없어 not_found — 레포 자체는 정상(다른 경로는 읽힘)
            허용 밖 이름은 400 «repo not allowed» + 허용 목록을 함께 알려준다
창고 조회   A OK · B OK(표 41) · C OK   — 세 창고 전부 한 열쇠로 열림
staycurate 문   기본값 A 고정 · project_ref 를 적어도 A 로 간다
```
