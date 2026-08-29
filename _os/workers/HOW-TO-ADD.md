# HOW-TO-ADD — 새 서비스·새 일꾼을 이 명부에 넣는 법

> 목적: 앞으로 서비스를 몇 개를 만들든 **같은 틀로 파악되고, 같은 자리에 추가되게** 한다.
> 정본은 `registry.json` 하나뿐이다. 사람용 문서(`WORKERS.md`)는 거기서 자동으로 만들어진다.

## 1. 구조 (왜 이렇게 나눴나)

```
_os/workers/
  registry.json    ← 🔴 정본. 여기만 고친다 (기계가 읽는 판)
  build.py         ← registry.json 을 읽어 WORKERS.md 를 다시 만든다
  WORKERS.md       ← 사람이 읽는 판. 손으로 고치지 않는다 (고쳐도 다음 실행 때 덮인다)
  HOW-TO-ADD.md    ← 이 문서
```
**왜 두 벌인가** — 사람은 «쉬운 말 표»가 필요하고, 클로드는 «정해진 칸이 있는 자료»가 필요하다.
한 벌만 두면 둘 중 하나가 반드시 불편해지고, 두 벌을 손으로 관리하면 반드시 어긋난다.
→ **자료 한 벌 + 자동 생성**이 정석이다.

## 2. 일꾼 한 명 추가하기

`registry.json` 의 `workers` 배열에 한 줄 넣는다. 칸은 **아홉 개, 전부 채운다.**

```json
{
  "id":          "blog.bot-example",        // 서비스키.일꾼이름 (겹치면 안 됨)
  "service":     "blog",                    // services 에 있는 key 중 하나
  "group":       "후기 모으기",              // 역할 묶음. 화면에서 이 단위로 묶여 보인다
  "name_ko":     "예시 후기 일꾼",            // 사람 말 이름
  "where":       "cron-collect 가 부름",     // 누가 깨우나
  "when":        "4시간마다",                // 얼마나 자주
  "does":        "○○에서 후기를 받아온다",    // 🔴 초등학생 한 문장. 전문용어 금지
  "makes":       "blog_review_corpus",      // 결과가 어디 남나
  "check_where": "/admin/#health",          // 대표님이 어느 화면에서 보나 (없으면 ⚪)
  "status":      "돎",                      // 돎·수동·쉼·대기·조용·은퇴·확인 필요·미파악
  "last_seen":   "08-29 18:00",             // 마지막으로 일한 게 확인된 시각
  "note":        ""                         // 특이사항 (남은 일감·주의)
}
```
그리고 `python3 _os/workers/build.py` 를 돌린다. 끝.

## 3. 새 서비스 추가하기 (예: 일본어 블로그)

① `registry.json` 의 `services` 에 한 줄
```json
{ "key":"blog-ja", "name":"블로그(일본어)", "site":"○○.com", "repo":"○○",
  "what":"일본어 호텔 추천 글을 만드는 곳", "dashboard":"/admin/#health" }
```
② 그 서비스의 일꾼들을 `workers` 에 넣는다 (2번 형식)
③ `build.py` 실행 → `WORKERS.md` 에 그 서비스 장(章)이 저절로 생긴다
④ `_os/status-targets.json` 에도 한 줄 넣는다 → 신호등이 하나 더 생긴다

## 4. 새 서비스를 만들 때 «일꾼을 파악하는 순서» (체크리스트)

```
1  시계 목록을 뽑는다        vercel.json 의 crons + .github/workflows 의 schedule
2  누가 누구를 부르는지 본다   시계 파일 안에서 fetch/호출되는 이름을 모은다
3  결과가 어디 남는지 본다     그 일꾼이 쓰는 표 이름 (없으면 🔴 기록 없음 으로 적는다)
4  마지막 실행을 잰다          기록표의 max(시각) 또는 git log 의 마지막 commit
5  «부르는 곳이 없는» 일꾼은   🔴 고장이 아니라 «은퇴»일 수 있다.
   명부의 state·note 를 먼저 본다 (2026-08-29 클로드가 여기서 오판했다)
6  registry.json 에 넣고 build.py
```

## 5. 지키는 것

```
· does 칸은 초등학생 한 문장. 표 이름·영어는 makes 칸에만
· 일꾼을 새로 만들면 그 자리에서 registry 에 넣는다 (나중에 = 안 함)
· 은퇴시킬 때는 지우지 말고 status="은퇴" + note 에 이유·날짜 (되살리는 사고를 막는다)
· 기록이 안 남는 일꾼은 makes 에 "⚪ 기록 없음" 이라고 정직하게 적는다. 빈칸으로 두지 않는다
```

---

**작성**: 2026-08-29 · **관련**: `WORKERS.md`(사람용) · `registry.json`(정본) · staycurate `docs/WIRING-MAP.md`(누가 누구를 부르나)
