# D-096 · 크론(시계) 문지기 — 인증 코드는 한 번에 전 파일을 맞춘다

**날짜** 2026-08-31 · **카테고리** infra · **상태** 확정
**서비스** 블로그(staycurate) — 같은 구조를 쓰는 스튜디오·개인OS 에도 그대로 적용
**관련** GAPS AR(사고 전말) · 08-18 1차 사고

---

## 무엇이 있었나

`bot-agoda-review` 전용 시계(매시 :15)가 24시간 동안 출근부 기록 0. 후기 수집도 :15 묶음 0.
클로드가 두 번 오판했다 — ① 08-30 「시계가 안 돈다」 ② 08-31 「라쿠텐이 멈췄다」. **둘 다 틀렸다.**

**진짜 원인**: Vercel 은 하루도 안 빠지고 매시 :15 에 정확히 호출했고, **우리 코드가 전부 401 로 돌려보냈다.**

```
AUG 31 13:16:32  GET  401  staycurate-e…   /api/bot-agoda-review   ← 시계
AUG 31 12:15:44  GET  401  staycurate-g…   /api/bot-agoda-review
…  매시 :15 가 24시간 내내 · 전부 401
AUG 31 13:35:52  POST 200  www.staycurate.com                      ← cron-collect 가 부른 것만 통과
```

문지기 코드가 헤더 하나만 봤다.
```js
const isCron = req.headers.get('x-vercel-cron') != null;   // ❌
```
Vercel 크론은 `user-agent: vercel-cron/1.0` 로도 자신을 밝힌다.

## 🔴 뿌리 — 08-18 에 같은 사고를 고치면서 일부만 반영했다

`cron.js`·`cron-collect.js` 에 그 흔적이 그대로 있다.
> 🔴 08-18: 헤더만 보다가 크론 요청을 401로 쫓아냈다 — cron.js 와 동일 문지기로 통일

**두 파일만 고치고 아홉 파일을 남겼다.** 그 아홉이 13일 뒤 터졌다.

## 결정

### ① 크론 문지기는 이 형태로 통일한다
```js
const isCron = (req.headers.get('user-agent') || '').includes('vercel-cron')
  || req.headers.get('x-vercel-cron') != null;
```

### ② 인증·권한 코드를 고치면 **같은 패턴을 쓰는 파일을 전부 훑는다**
한 곳만 고치면 나머지가 시한폭탄이 된다.
```
찾는 법:  api/ 전체에서 grep 'x-vercel-cron' · grep '401'
          → 방식이 다른 파일을 목록으로 만들고 한 번에 맞춘다
```

### ③ 「시계가 안 돈다」고 판정하기 전에 **로그를 본다**
출근부(`blog_cron_log`)가 비어 있다는 것은 **「호출이 없었다」가 아니다.**
401 로 쫓겨나면 우리 코드가 기록을 남기기 전에 끝나므로 출근부에 아무것도 안 남는다.
```
① vercel.json 에 등록돼 있나        ← 「등록됨」과 「돈다」는 다르다
② 출근부에 기록이 있나
③ 실제 산출물 시각 (예: 후기 collected_at)
④ 🔴 Vercel Logs — 기간을 먼저 맞춘다. 매시 :15 짜리를 「최근 30분」으로 보면 당연히 비어 있다
```

## 조치 (2026-08-31 완료)

**전수 조사 → 9개 파일 수정**
`bot-agoda-review` `cron-daily` `bot-read` `bot-rakuten` `bot-rakuten-review` `bot-basic` `bot-intro` `bot-jalan` `bot-target`
(+ 이후 `google-reviews` 도 같은 문제로 수정)

**이미 안전했던 것**
`cron` `cron-collect` `cron-price` `cron-build` `cron-google` `cron-photo` `bot-recheck` `bot-plan` `bot-post` `gsc-sync` `worker-audit` `link-guard`

**검증** — 배포 후 첫 정시에 통과
```
08-31 14:15  did = 카인드니스 호텔 - 카오슝 메인 스테이션 27건 | 우알라이 사바이데 28건
             (어제까지 이 시각엔 401 만 있었다) · 처리 대상이 대만·태국 = 막혀 있던 해외 도시
```

## 효과
아고다 후기 수집 **하루 4회 → 24회**. 남은 본문 호텔 373곳이 **31일 → 약 6일**.
