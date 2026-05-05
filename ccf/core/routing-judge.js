// ============================================================
// ccf/core/routing-judge.js
// ============================================================
//
// "기존 채팅에서 진행" vs "새 채팅 권장" 1차 판단 (CCF 7원칙 2번 후속)
//
// 흐름:
//   대표님이 인계서를 채팅에 붙여넣음 → Claude가 본 모듈 로직으로 1차 판단
//
// 판단 기준 (보수적 — 의심 시 새 채팅 권장):
//   1) 추정 시간 ≥ 3시간이면 새 채팅 권장 (단일 응답 토큰 한계)
//   2) 직전 작업과 카테고리/태그가 완전 다르면 새 채팅 권장 (컨텍스트 분리)
//   3) 직전 채팅에서 토큰 한계 메시지가 있었으면 무조건 새 채팅
//   4) size=large면 새 채팅 권장
//   5) 그 외 = 기존 채팅 진행 가능
//
// 본 모듈은 판단만 하고 실제 분기는 admin-status.html UI / Claude가 수행.
// ============================================================

/**
 * 새 채팅 권장 여부 판단
 *
 * @param {Object} task — 다음 진행할 task
 * @param {Object} ctx — { lastTask, lastMessageHadTokenLimit, currentSessionStartedAt }
 * @returns {{
 *   recommendNewChat: boolean,
 *   reasons: string[],
 *   confidence: 'high'|'medium'|'low'
 * }}
 */
export function judgeRouting(task, ctx = {}) {
  const reasons = [];
  let recommendNewChat = false;

  // 1) 추정 시간 ≥ 3시간
  const hours = task.autonomous?.estimated_hours ?? 0;
  if (hours >= 3) {
    recommendNewChat = true;
    reasons.push(`예상 시간 ${hours}h — 단일 채팅 토큰 한계 위험`);
  }

  // 2) 카테고리 변화
  const lastCat = ctx.lastTask?.category;
  if (lastCat && task.category && lastCat !== task.category) {
    // 컨텍스트 전환 비용 — 카테고리 다름은 medium-confidence 신호
    reasons.push(`직전 작업 카테고리(${lastCat}) → 이번(${task.category}) 컨텍스트 전환`);
    if (hours >= 1.5) recommendNewChat = true;
  }

  // 3) 직전 메시지에서 토큰 한계
  if (ctx.lastMessageHadTokenLimit) {
    recommendNewChat = true;
    reasons.push('직전 응답에서 토큰 한계 감지');
  }

  // 4) size=large
  if (task.size === 'large') {
    recommendNewChat = true;
    reasons.push('size=large — 큰 리팩토링은 새 채팅 권장 (CLAUDE.md 6조)');
  }

  // 5) 의존성 결정 미완
  const reqs = Array.isArray(task.autonomous?.requires_decisions_first) ? task.autonomous.requires_decisions_first : [];
  if (reqs.length > 0) {
    reasons.push(`선행 결정 ${reqs.length}건 필요 — 진행 전 결정 확인 의무`);
  }

  // 신뢰도 산정
  let confidence = 'medium';
  if (reasons.length === 0) confidence = 'high';   // 명확히 진행 가능
  if (reasons.length >= 2) confidence = 'high';    // 명확히 새 채팅

  return { recommendNewChat, reasons, confidence };
}

/**
 * 판단 결과를 사람이 읽을 수 있는 메시지로 변환
 */
export function formatJudgement(j) {
  if (j.recommendNewChat) {
    return `🆕 새 채팅 권장\n사유:\n${j.reasons.map(r => `  - ${r}`).join('\n')}`;
  }
  return `▶ 기존 채팅에서 진행 가능${j.reasons.length ? `\n참고:\n${j.reasons.map(r => `  - ${r}`).join('\n')}` : ''}`;
}

if (typeof window !== 'undefined') {
  window.CCF = window.CCF || {};
  window.CCF.routingJudge = { judgeRouting, formatJudgement };
}

export default { judgeRouting, formatJudgement };
