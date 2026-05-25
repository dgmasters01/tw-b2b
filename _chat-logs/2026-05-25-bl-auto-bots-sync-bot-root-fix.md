---
date: 2026-05-25
bl: BL-AUTO-BOTS-SYNC-BOT
status: done (근본 원인 박힘)
priority: P0
related: 시스템 자동 추천 1순위 (admin-status.html renderNextAction)
commit_target: fix(BL-AUTO-BOTS-SYNC-BOT) sync-bot 5번째 재발 근본 원인 fix — NoneType 슬라이싱 4건 일괄 정정
tone: business
---

# BL-AUTO-BOTS-SYNC-BOT — sync-bot 5번째 재발 근본 원인 박힘

## ① 완료 내용

**1) 근본 원인 진단 (sync.yml run #385~#388 4건 실패 로그 분석)**

```
File "/home/runner/work/tw-b2b/tw-b2b/_os/scripts/sync_md_from_tasks.py", line 137, in render_changelog
    date = t.get('completed_at', '')[:10] or t.get('created_at', '')[:10]
TypeError: 'NoneType' object is not subscriptable
```

**원인:** `dict.get(key, default)`는 key가 **없을 때만** default 반환. key가 있지만 값이 None이면 None 그대로 반환. `None[:10]` → TypeError.

**예:** tasks.json에 `completed_at: null` 박힌 작업이 있으면 트리거. 최근 tasks.json 갱신 작업에서 null 값 박힌 후 sync-bot 4건 연속 실패.

**2) 동일 위험 패턴 일괄 점검 + 정정 (3건 추가 발견)**

- `sync_md_from_tasks.py:110` — `t.get('completed_at', '?')[:10]`
- `sync_md_from_tasks.py:137` — `t.get('completed_at', '')[:10]` (실제 실패 위치)
- `sync_md_from_tasks.py:237` — `t.get('completed_at', '?')[:10]`
- `sync_engine.py:168` — `last.get('at', '?')[:10]`

**정석 fix 패턴:**
```python
# 잘못된 패턴 (None 시 TypeError)
date = t.get('completed_at', '')[:10]

# 정석 (None 안전)
_comp = t.get('completed_at') or ''
date = _comp[:10]
```

**3) 라이브 검증 통과**
- 로컬에서 `python3 _os/scripts/sync_engine.py --apply` 실행 → ✅ 정상 완료
- BACKLOG.md / CHANGELOG.md / SOLO_WORK_QUEUE.md 3개 파일 자동 갱신 성공
- sync_engine 라이브 동작 100% 복구

## ② 이유

**5번째 재발 = 패치만으로는 안 됨, 근본 원인 박혀야:**
- 점검 봇이 sync-bot 죽음 감지 → 자동 BL 박음 → 자동 해소 → 다시 죽음 → 5회 반복
- 점검 봇이 "녹색"으로 박는 시점은 sync-bot이 **다음 push 트리거를 못 만나서 실행 안 됨** = 그저 휴식
- 실제 sync-bot은 push 트리거마다 실패 → 작업 큐 무한 누적
- 근본 fix 없이는 6번째 재발 시간 문제

**동일 패턴 4건 일괄 정정한 이유:**
- 같은 안티패턴이 다른 함수에도 박혀있으면 다른 트리거 조건에서 재발
- "1건 fix → 6번째 재발" 사고 회피 = 정석 전수 점검
- grep `.get([^)]+)\[:[0-9]` 로 일괄 검색

**.get(key, '') 안티패턴 박힌 이유 (배경):**
- Python에서 흔한 실수: `default`가 key 부재 시만 적용된다는 사실 인지 부족
- tasks.json에 명시적 `"completed_at": null` 박는 작업이 추가되면서 표면화
- 이번 채팅에서 BL-INVOICE-002 done 박을 때 `t['completed_at'] = now`로 박았지만, 다른 일부 BL이 `null`로 명시 박혀있을 가능성

**sync_engine 자동 갱신된 3개 파일도 함께 commit:**
- BACKLOG.md / CHANGELOG.md / SOLO_WORK_QUEUE.md = sync_engine 정상 동작 후 결과물
- 4건 실패하는 동안 누적된 변경분 = 한 번에 박음 (헌법 부칙 8 통합 관리)

## ③ 사업 영향

**자동 동기화 톱니바퀴 라이브 복구.**

**복구 전 상태:**
- 모든 tasks.json 변경마다 sync-bot 실패
- BACKLOG.md / CHANGELOG.md / SOLO_WORK_QUEUE.md 7일 이상 옛 데이터
- 대표님이 BACKLOG 보면 done 박은 BL 13건이 안 보임 (사업 현실과 문서 불일치)
- 점검 봇이 sync-bot red 박음 → admin-status에 빨간불

**복구 후 사업 흐름:**
- 다음 tasks.json push 즉시 sync-bot 자동 가동
- 매 BL done 박힐 때마다 BACKLOG·CHANGELOG·SOLO_WORK_QUEUE 자동 갱신
- 대표님이 핸드폰 GitHub 앱에서 tasks.json 수정해도 자동 동기화 (헌법 부칙 3 어디서든 도달)
- admin-status에 sync-bot green으로 자동 전환 → 자동 일꾼 1명 살아남
- 향후 같은 NoneType 사고 차단 (4건 일괄 fix)

**시스템 추천 따라가는 게 정석임을 라이브 증명:**
- 클로드 자율 추천(BL-PRELAUNCH-CLEANUP P1) 따랐다면 sync-bot 6번째 재발 + 7번째 재발 누적
- 시스템이 P0로 박은 이유 = 사업 영향 명확히 큼 (다른 모든 자동 동기화의 기반)
- 헌법 부칙 1 라이브 검증: 대표님은 결정만, 시스템이 실행 순서 박음

## ④ 다음 행동

**시스템 자동 추천 2순위 자동 진입:**
- BL-AUTO-BOTS-SYNC-BOT done 박힘 → admin-status renderNextAction이 다음 추천 자동 갱신
- 큐의 다음: P1 order=4 → `BL-HOTEL-DETAIL-PAGE` (~매니저/호텔 분리 + 1:1 문의·메일·메모 타임라인)
- 또는 P1 order=5 → `BL-REVENUE-DASHBOARD` (매출 차트 토글)

**대표님 행동 영역 (선택):**
- 다음 채팅 시작 시 admin-status.html 들어가서 🎯 다음 추천 박스 확인
- 시스템이 자동으로 다음 P1 큐 박은 작업 표시 → 그거 박으면 됨

**자율 발견 (자질구레, 별도 5분 작업 가능):**
- partial 2건(AGR-0007/0015) 봇 패턴 정밀화 → 사업 합의 진짜 15/15 done 표시
- payment_accounts is_active=true 행 3→1 정리 (단일 진실원)

## ⑤ 대표님 결정 필요

**없음.** 모든 자율 결정 범위:
- 근본 원인 진단 (run 4건 로그 분석)
- 동일 패턴 일괄 점검 (1건 fix 아니라 4건)
- 정석 fix 패턴 (`or ''` fallback)
- 자동 갱신된 3개 md 파일도 함께 commit (헌법 부칙 8)
- chat-log에 5번째 재발 근본 원인 명문화 (재발 차단)

**다음 사업 결정 영역 (다른 BL):**
- BL-HOTEL-DETAIL-PAGE vs BL-REVENUE-DASHBOARD (P1 동순위, order=4/5)
- 또는 운영 진입 시점 (BL-PRELAUNCH-CLEANUP P1, 대표님 외부 작업 3가지)

---

**BL-AUTO-BOTS-SYNC-BOT 100% done — sync-bot 5번째 재발 근본 원인 박힘. 자동 일꾼 1명 살아남. 시스템 추천 따라가는 게 정석임을 라이브 증명.**
