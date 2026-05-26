# 메모리 아카이브: 작업 지휘소 (Command Center)

> **묶음 4 / 5** — 작업 큐·단계·동기화 시스템  
> **출처:** 2단계 압축 전 메모리 26, 27 원문  
> **참조:** `_os/INDEX.md` → admin-status.html / tasks.json / progress.steps

---

## 메모리 26 — Command Center 7원칙

[작업 지휘소(Command Center) 7원칙 - 2026-05-06] ①"직원 가능"=개발 진행 가능 작업, 대표님 결정 불필요, started_by 별도 표시 ②카드 클릭=인계서 클립보드 자동 복사→Claude가 기존/새 채팅 1차 판단 ③작업 완료=ops 알림 발송 시점 자동 감지→tasks.json done 자동 갱신 ④우선순위 5단계 정렬 Claude 책임: 막힘 제외→선행 done→인프라 가중치→의존성 카운트→P0→P1→P2→P3 then small→large ⑤작업 도중 추가 발생 시 tasks.json 자동 추가+5초 폴링 ⑥레이아웃: 결정 대기+자율 큐 화면 최상단 ⑦CCF(Command Center Framework)로 제작—타 프로젝트 한 줄 이식 의무.

---

## 메모리 27 — 그림 일치 OS (progress.steps + commit subject 봇)

[그림 일치 OS — 작업 단계 진행률 + 동기화 시스템 2026-05-06] 모든 작업은 시작 시 progress.steps 박는 의무 (헌법 부칙 7). 단계 1개 = commit 1개 (큰 묶음 push 금지). commit subject에 [step:done:N] 태그 박는다 — 봇 (scripts/auto_detect_task_status.py)이 자동으로 progress.steps[N-1].done=true + percent 재계산. 봇은 commit subject만 검사 (본문 검사 X — 본문 내 "완료" 단어나 작업 ID 언급은 무시). 봇은 done 작업을 자동 리오픈하지 않음. 어드민 admin-status.html은 5초 폴링 + 자동 빌드 감지로 자동 reload — 대표님이 수동 새로고침 의무 0.

---

**아카이브 시각:** 2026-05-27 KST  
**원본 메모리 위치:** 압축 전 메모리 26, 27
