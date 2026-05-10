# 작업 인계서 (Handoff) — BL-ADMIN-LIGHTMODE step 5 admin-status 정확 매핑

> 직전 채팅: step5a (link fix) + step5b (admin-tasks 통과) + step5c-partial (admin-status 부분 fix)
> 갱신: 2026-05-10 (Claude, 끊김 위험 감지 — 정확 매핑 새 채팅에서)

---

## 🚨 새 클로드 — 작업 시작 전 절대 의무

위 자동 prepend 헤더(BL-CLAUDE-DISCIPLINE) 그대로 따를 것. 추가:

**🔥 헌법 라이브 fetch 의무 강화**: 인계서만 믿지 말 것. OPERATIONS_CHARTER.md / CLAUDE.md / _os/playbook/claude-discipline.md 3개 라이브 fetch 강제.

---

## 직전 채팅에서 완료된 일

### ✅ step 5a — link 누락 fix (commit `e4c9e37`)

- `_admin/admin-status.html` head에 `<link rel="stylesheet" href="/shared.css">` 박음
- `_admin/admin-permissions.html` head에 동일 link 박음 (라이브 grep으로 추가 발견 — 대표님 A안 결정)
- 13개 페이지 중 admin-hub.html(폐기 대상) 제외 11개 모두 link 박힘 검증

### ✅ step 5b — admin-tasks 본문 통과 (commit `79c30bd`)

- 80건 변경, 헤더/CTA/탭/필터/카드/pill/owner pill/모달/버튼 모두 토큰화
- `[data-theme="light"]` 분기로 pill 9종 + danger 버튼 + 안내 노트 카드
- **재캡처 4종 통과**: admin-tasks 다크/라이트 모두 또렷, 글자 가독, pill 컬러 정상
- CSS 중괄호 165쌍 균형 OK

### 🟡 step 5c-partial — admin-status 부분 fix (commit `13e141a`)

- 237건 다크 전용 색에 대해 광범위 `[data-theme="light"]` 분기 박음
- 사이드바(.os-sidebar 전체 클래스) 라이트 분기 → 흰 배경 + 어두운 글자 검증
- 인라인 어두운 배경 11종 + 인라인 글자색 11종 라이트 반전 박음
- code/kbd/pre 라이트 분기

**미해결 (재캡처 검증 결과)**:

| # | 영역 | 증상 |
|---|------|------|
| 1 | 헤더 (.header-content 외 다른 클래스) | 여전히 어두운 청보라 + 글자 안 보임 |
| 2 | "💎 진행 중 BL" 영역 | 보라 그라디언트 어두움 |
| 3 | "⛔ 카테고리 빠진 작업" 빨간 박스 | 어두움, 글자 묻힘 |
| 4 | "🚀 관리자 페이지 TOP 10" | 다크 영역 잔재 |
| 5 | 푸터 | 어두움 |

**원인 분석**: admin-status는 admin-tasks(62건)와 달리 237건이고, 클래스 이름이 제 추측(`.urgent-card`, `.in-progress-card`, `.next-action-card`...)과 다를 가능성이 큼. 광범위 분기로는 한계 — **클래스 단위 1:1 매핑 필요**.

---

## 🎯 다음 시작 단계 — step 5c 정확 매핑

**현재 진행률**: 4/6 (66%) — step 5는 admin-tasks만 통과, admin-status는 미완

### 작업 순서 (Claude 자율 — 정석 5기준)

1. **클래스 식별** — admin-status.html 본문에서 실제 사용 중인 카드/박스 클래스 grep
   ```bash
   grep -oE 'class="[^"]+"' _admin/admin-status.html | sort -u | head -100
   ```
2. **다크 전용 색 사용 클래스 식별** — 위 클래스 중 본문 :root alias가 안 닿는 것
3. **각 클래스별 라이트 톤 매핑** — 헤더/카드 5종 (위 미해결 1~5번)에 직접 분기 박기
4. **재캡처** — Playwright + 로컬 정적 서버 (포트 8765) + data-theme 강제 토글
5. **통과 시 step 5 done** — `[step:done:5]` 박고 commit
6. **step 6** — 사이드바 하단 토글 박기 + localStorage

### 참고: shared.css 라이트 토큰 표 (재발견 안 해도 됨)

```
다크 → 라이트 매핑
--bg:    #0A0A0F → #F8FAFC
--bg-2:  #13131A → #FFFFFF
--bg-3:  #1C1C26 → #F1F5F9
--bg-4:  #25252F → #E2E8F0
--ink:   #FAFAFA → #1E293B
--ink-2: #E5E5EE → #334155
--ink-3: #A0A0B0 → #475569
--ink-4: #6E6E80 → #64748B
--line:  rgba(255,255,255,.08) → rgba(15,23,42,.08)
--line-2: rgba(255,255,255,.14) → rgba(15,23,42,.14)
--glass:  rgba(255,255,255,.05) → rgba(15,23,42,.04)
--glass-2: rgba(255,255,255,.08) → rgba(15,23,42,.06)
```

---

## 🔧 핵심 라이브 상태

- **헌법**: `OPERATIONS_CHARTER.md` (200줄 이하 강제, 부칙 16 박힘)
- **결정**: D-022 (BL-ADMIN-LIGHTMODE 5결정)
- **shared.css**: `[data-theme="light"]` 블록 150~243줄 + OS 자동 적용 245~277줄 — **확정, 손대지 말 것**
- **admin-tasks.html**: step5b로 통과 검증됨 — 손대지 말 것
- **admin-status.html**: step5c-partial로 부분 fix, 본문 미완 — 다음 채팅 작업 대상
- **admin-skin.css**: `body[data-skin]` 셀렉터, body에 속성 없으면 매칭 안 됨 → 별도 시스템, 무시 가능

---

## 🚨 핵심 의무 (헌법 부칙 16)

- 첫 응답 5줄 양식 강제
- 단계 1개 = commit 1개 + `[step:done:N]` 태그
- 디자인 변경 시 BEFORE/AFTER 스크린샷 의무
- 보고는 "어디 가서 무엇을 누르면 무엇이 보이는지" 4줄
- 묻는 것 = 4가지(비즈니스/서비스/틀/디자인 큰 방향)뿐
