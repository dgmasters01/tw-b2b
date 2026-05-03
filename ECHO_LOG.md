# ECHO LOG — 대화 즉시 기록

**제정일:** 2026-05-03
**용도:** 대표님 + Claude 대화 중 결정·통찰이 휘발되지 않고 즉시 박히는 자동 기록 시스템
**근거:** 헌법 4조 (전수 추적) 자동화 / 헌법 부칙 5 (Task & Status 카테고리)

---

## ⚠️ 자동 기록 규칙 (Claude의 행동 규범)

Claude는 매 응답 시 다음 신호를 감지하면 **즉시 이 파일에 항목을 추가하고 push**한다.

### 감지 트리거 (대표님 발언)
- "이렇게 하자"
- "이게 좋네"
- "그렇게 가자"
- "확정"
- "결정"
- "이거로 간다"
- "맞다 / 맞네"
- "좋아 그걸로"

### 감지 시 자동 행동
1. ECHO_LOG.md 하단에 **타임스탬프 + 결정 요약 + 맥락** 1행 추가
2. 결정 강도 분류 (`[INSIGHT]` / `[DECISION]` / `[POLICY]` / `[BLOCKER]`)
3. 같은 응답 내에서 git push (별도 커밋 또는 묶어서)
4. 30분 이내에 **`DECISIONS.md` / `DECISIONS_INDEX.md` 정식 등록 여부 판단**:
   - `[DECISION]` 또는 `[POLICY]` → 정식 등록 의무
   - `[INSIGHT]` → 누적 후 주간 정리

### 자동화 방식 (헌법 1조 — 대표님 손 안 댐)
- ❌ GitHub Actions 자동화 (workflow 스코프 차단)
- ✅ **Claude가 매 응답 시 직접 push 처리** (헌법 부칙 4 — 권한 활용)
- 결과적으로 대표님 입장에서는 100% 자동 (Claude가 시스템 역할)

---

## 📋 형식

```
### YYYY-MM-DD HH:MM [TAG] 한 줄 요약
- **맥락**: 어떤 대화에서 나왔는지
- **결정 강도**: INSIGHT / DECISION / POLICY / BLOCKER
- **연관 문서**: DECISIONS.md / BUSINESS.md / 등
- **후속 작업**: 정식 등록 여부, BL-ID
```

---

## 📅 기록

### 2026-05-03 [POLICY] Charter v2 통합 — 부칙 5·6 신설 + 통찰 7개 영구 보존
- **맥락**: 6시간 집중 대화에서 도출된 사업 모델 핵심 결정들
- **결정 강도**: POLICY (헌법 변경 + 사업 정책 동시 확정)
- **연관 문서**: OPERATIONS_CHARTER.md (부칙 5·6), BUSINESS.md (15-A), DECISIONS.md (D-004~D-009), DECISIONS_INDEX.md, JOURNEY.md
- **후속 작업**: 본 작업이 정식 등록 자체. tasks.json BL-AURORA-MIGRATION / BL-MANAGER-DASH-001 / BL-TRACK-001 / BL-INVOICE-001 / BL-JOURNEY-DOC / BL-DECISIONS-INDEX 6개 등록 완료.

### 2026-05-03 [DECISION] ECHO_LOG.md 자동화는 Claude push 방식으로 (GitHub Actions 우회)
- **맥락**: workflow 스코프 차단 상황에서 자동화 구현 방법 결정
- **결정 강도**: DECISIONS (인프라 결정)
- **연관 문서**: ECHO_LOG.md (이 파일), CLAUDE.md L76 (workflow 차단 명시)
- **후속 작업**: BL-DECISIONS-INDEX 작업 시 sync_engine.py 보강과 함께 처리.
