# BL 등록 시 progress.steps 표준 (BL-AUTO-DETECT-BOT-STEP-TAG-FIX, 2026-05-14)

새 BL을 tasks.json에 박을 때 `progress.steps` 의 각 step에 **반드시 `label`과 `title` 두 키 모두** 박는다.

## 표준 형식

```json
{
  "n": 1,
  "label": "단계 설명 (간결, 표시용)",
  "title": "단계 설명 (간결, 표시용)",
  "status": "pending",
  "done": false
}
```

## 왜 두 키 다 박는가

봇 스크립트(`_os/scripts/auto_detect_task_status.py`)는 `label`을 기본 키로 사용한다.
어드민 UI 일부는 `title`을 기본 키로 사용한다.
둘 다 박으면 어느 쪽도 깨지지 않는다.

## 자동 동기화 (2026-05-14부터)

봇이 매 실행 시 자동으로 한쪽만 있으면 다른 쪽도 채운다. 그래도 BL 등록 시점에 둘 다 박는 게 정석 — 봇 첫 실행 전에 화면 렌더링되면 한쪽만 보이는 BL이 나올 수 있음.

## 결함 사례 (재발 방지용 기록)

2026-05-13 매니저 허브 시리즈 BL 5개를 박을 때 `title`만 박고 `label` 누락. 결과:
- 봇 라인 370 `all(s.get("label") for s in steps)` 조건 False
- percent=100 도달했는데 status=in_progress 잔존
- admin-status 화면이 "이어가기" 라벨로 5개 BL 모두 진행 중 박스에 잘못 표시

2026-05-14 BL-AUTO-DETECT-BOT-STEP-TAG-FIX에서 봇을 `label OR title` 둘 다 인식하도록 수정 + 자동 동기화 백필 박음.

## tasks.json 신규 등록 헬퍼 (Python)

```python
def make_step(n, label):
    return {
        "n": n,
        "label": label,
        "title": label,  # 봇·UI 양쪽 호환
        "status": "pending",
        "done": False,
    }

steps = [
    make_step(1, "VIEW 박기 (Supabase)"),
    make_step(2, "페이지 좌우 분할 골격"),
    ...
]
```
