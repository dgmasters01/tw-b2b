---
slug: 2026-05-13-bl-biz-doc-integrate
title: BL-BIZ-DOC-INTEGRATE — 사업 결정 BUSINESS.md 통합 + 매니저 여정 별도 문서
date: 2026-05-13
tasks: [BL-BIZ-DOC-INTEGRATE]
commits: []
decisions: [D-031, D-032, D-033, D-034, D-035, D-036, D-037, D-038]
---

## 🎯 한 줄 요약

대표님 사업 통찰이 chat-log·DECISIONS에만 흩어져 있어 공유·판단이 어려웠던 문제를 BUSINESS.md 단일 진실원에 통합하고 매니저 여정은 별도 상세 문서로 분리했다.

## 📍 왜 발생했나

대표님이 4번에 걸친 통찰로 약관 검토, 매니저 영업 흐름, 4중 안전 구조까지 완벽한 사업 그림을 만드셨는데, 이게 chat-log 8개와 DECISIONS.md D-031~D-038에만 박혀 있었다. 대표님이 정확히 짚으셨다: "이런 것들이 BUSINESS.md에 정리돼 있어야 같이 공유해서 판단하지." BUSINESS.md를 라이브 확인하니 D-031~D-038 8개 결정 전부 반영 안 됐고, Agoda 약관 검토 결과도 0건이었다. 사업 영역이 깨진 상태.

## 🛠 어떻게 해결했나

BUSINESS.md에 "15-B. 2026-05-13 결정 8개 통합" 섹션을 신설해 사업 본질 명확화(우리는 영상 마케팅 + Agoda는 예약 인프라), Agoda 약관 4중 안전 구조 표, 매니저 여정 9 Stage 표, 결정 8개 통합 표, Claude 학습 사항까지 사업 관점으로 정리했다. 매니저 가입부터 결제 완료까지 실무 상세 흐름은 분량이 크므로 별도 문서 `_os/playbook/service-flow.md`로 분리해서 영업 페이지 메시지 구조, 매니저 자주 묻는 질문 대응, 컴플레인 시나리오까지 모두 담았다. 관련 문서 표와 변경 이력에도 service-flow.md 박았다.

## ✅ 결과

- BUSINESS.md 15-B 섹션 신설 (D-031~D-038 결정 8개 사업 관점 통합)
- `_os/playbook/service-flow.md` 신설 (매니저 여정 9 Stage 상세)
- BUSINESS.md 관련 문서 표에 service-flow.md 박힘
- 사업 진실원 일치 — 결정/시스템/매니저 흐름이 BUSINESS.md 하나로 공유 가능
- 앞으로 사업 영역 결정 박을 때 무조건 BUSINESS.md에도 반영 (Claude 운영 원칙 추가)

## ⏱ 다음 결정 필요

추가 결정 없음. 자율 운영.

---

# 🔧 기술 상세 (개발자용)

## 박은 파일 3개
1. `BUSINESS.md` — 15-B 섹션 신설 (line 819 직후, 약 150줄)
2. `_os/playbook/service-flow.md` — 신규 (~280줄)
3. `BUSINESS.md` 16번 관련 문서 + 17번 변경 이력 — service-flow.md 박음

## BUSINESS.md 15-B 구성

| 하위 섹션 | 내용 |
|---|---|
| 15-B-1 | 사업 본질 명확화 (영상 마케팅 + Agoda 인프라) — 매출 2축 (호텔 $200 + Agoda commission) |
| 15-B-2 | Agoda 약관 4중 안전 구조 (D-038) — 5개 조항 표 + 영업 페이지 4단 메시지 + 절대 금지 3개 |
| 15-B-3 | 매니저 여정 9 Stage 요약 표 — 약관 합치 표시 |
| 15-B-4 | 2026-05-13 결정 통합 표 (D-031~D-038, 영향 BL) |
| 15-B-5 | Claude 학습 사항 (외부 문서는 사업 맥락 먼저) |

## _os/playbook/service-flow.md 구성

| Stage | 상세 박힌 것 |
|---|---|
| 0. 공개 진입 | index.html 집합 자랑 메시지 |
| 1. 회원가입 | signup.html + 가입 모달 + D-032 국가 필수 |
| 2. 호텔 정보 | hotel-info.html + Agoda 매칭 3단계 안전망 |
| 3. 관리자 승인 | admin.html + SQ-G 자동 메일 |
| 4. 영업 페이지 ⭐ | 4중 안전 구조 + D-035 3구간 분기 + 매니저 FAQ 4개 |
| 5. 결제 | PayPal $200 + 영수증 5년 보관 |
| 6. 영상 제작 | 3-7일 + 8개 채널 노출 |
| 7. 월간 리포트 | marketing.html + PDF 매월 |
| 8. D-30 알림 | 재계약 안내 |
| 9. D-Day | 0건 환불 또는 재계약 |

추가 박힘:
- 매니저 컴플레인 대응 3개 시나리오 ("예약 안 났어요" / "Agoda commission 얼마?" / "다른 호텔 보여줘")
- 관련 파일 11개 매핑

## 헌법 영향
헌법 부칙에 추가 후보:
- "사업 영역 결정 박을 때 BUSINESS.md 단일 진실원 갱신 의무" — 차후 별도 BL로 검토

## Claude 운영 원칙 추가
대표님 통찰을 chat-log·DECISIONS에만 박지 말고 사업 영역은 BUSINESS.md, 시스템 흐름은 service-flow.md 식으로 분리 통합. 공유·판단 가능한 단일 진실원 유지.
