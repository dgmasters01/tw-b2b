---
slug: 2026-05-20-bl-admin-user-management-week2-5-d015-discovery
title: BL-ADMIN-USER-MANAGEMENT Week 2.5 — D-015 불일치 발견 + 단계 5 sub-step 정렬
date: 2026-05-20
tasks: [BL-ADMIN-USER-MANAGEMENT]
commits: []
decisions: [D-041]
---

## 🎯 한 줄 요약

단계 5(Team 탭 + Add Team Member 흐름) 시작 전 라이브 fetch 했더니, **D-015(2026-05-05)가 admin은 초대 전용으로 결정**했는데 admin.html UI는 그걸 안 따르고 admins 테이블에 직접 insert 중이었다. 2주 동안 그림 불일치 방치된 상태 발견. 결정·해소 방향 박고(D-041), 단계 5를 sub-step 6개로 정렬해서 새 채팅으로 인계.

## 📍 무엇을 발견했나

대표님이 단계 5 "Team(Admins) 탭 + Add Team Member 흐름 + ⋯ 메뉴" 시작하기 전, 사업가 V2 컨텍스트(`biz_context_v2`)에 "admin_invitations 테이블 비어있음 — 실제 작동 안 함"이라고 박혀있어서, Claude가 이게 정말 작동 안 하는지 확인 차원에서 D-015(BL-ADMIN-AUTH-V2)와 라이브 코드 둘 다 fetch.

결과:

| 영역 | D-015 결정 | 라이브 박힘 여부 |
|---|---|---|
| SQL: admin_invitations + RLS | "초대 전용" | ✅ `sql/bl-admin-auth-v2.sql`에 박힘 |
| 초대 메일 발송 API | 박혀있어야 | ✅ `api/admin.js ?action=auth-invite` |
| 초대 토큰 검증 + 가입 API | 박혀있어야 | ✅ `?action=auth-accept-invite` |
| 권한 변경 API | 박혀있어야 | ✅ `?action=auth-change-role` |
| 통합 조회 API | 박혀있어야 | ✅ `?action=auth-users-list` |
| 수락 페이지 | 박혀있어야 | ✅ `/admin-accept-invite.html` |
| 권한 관리 페이지 | 박혀있어야 | ✅ `/_admin/admin-permissions.html` |
| **admin.html Team 탭이 위 API 호출** | "초대 전용" 명시 | ❌ **line 2645에서 `T.sb.from('admins').insert()` 직접 박는 중** |

즉 백엔드·DB·수락 페이지는 D-015대로 다 박혀있는데, **admin.html UI 한 곳만 D-015 결정 무시하고 직접 insert 흐름**으로 작동. 2주 동안 아무도 안 잡았다.

## 🛠 어떻게 결정했나

대표님 결정 (정석 = A):

1. **단계 5에서 둘 다 박는다** — ⋯ 메뉴 신설 + Team 탭 UI를 D-015 결정대로 정렬(초대장 흐름으로). 그림 불일치 한 번에 해소.
2. **⋯ 메뉴 = 기본 4개** (활성/비활성 토글, 권한 변경, 제거, 이력 보기). Claude 자율 판단 — 정석은 D-015의 `role_change_log 무제한 영구 보존`이 UI에서 죽지 않게 이력 보기 박는 것. 패스워드 초기화는 직원 5명+ 영역이라 지금 단계엔 과함.
3. **단계 5는 sub-step 6개로 정렬**(분량 정직 끊기 — 인계서 노트 따라).

### 단계 5 sub-step 분할

| n | 작업 | commit 태그 |
|---|---|---|
| 5-1 | tasks.json sub-steps 박기 + D-041 결정 박기 + 이 chat-log 박기 (인계서 준비) | `[step:done:5-1]` |
| 5-2 | `_admin/admin.html renderAdmins()` 재작성 — Remove 단일 → ⋯ 메뉴 (활성/비활성/권한변경/제거/이력) | `[step:done:5-2]` |
| 5-3 | `_admin/admin.html` Add Team Member 모달 — 직접 insert 폐기 → `?action=auth-invite` 호출 | `[step:done:5-3]` |
| 5-4 | `_admin/admin.html` Team 탭에 "초대 대기" 섹션 신설 (`admin_invitations.status='pending'` 표시 + 재발송 + 취소) | `[step:done:5-4]` |
| 5-5 | `am-modal` (admin 작업 모달) 박기 — `um-modal`/`hm-modal`과 동일 디자인 패턴 | `[step:done:5-5]` |
| 5-6 | 라이브 검증(Vercel 배포 후 실제 초대 메일 1통 발송 테스트) + chat-log Week3 박기 + tasks.json done | `[step:done:5][step:done:5-6]` |

5-1은 이 채팅에서 박는다(인계서 준비). 5-2~5-6은 새 채팅에서.

## 🚨 사고 원인 분석 (헌법 6조 — 다음에 안 반복하게)

**근본 원인**: BL-ADMIN-AUTH-V2가 한 commit에 통합 박혔지만, admin.html UI 정합성 검증이 빠졌다. D-015 박은 후 Team 탭 UI를 봤다면 즉시 발견했을 사고.

**왜 2주 동안 안 잡혔나**:
- admin.html Team 탭이 실제로 안 쓰임 (직원 0명 단계). 사용 안 하니까 누구도 "초대 메일 안 오네?" 발견 못 함.
- BL-ADMIN-USER-MANAGEMENT가 시작될 때까지 Team 탭은 손 안 댐.
- 헌법 12조 "그림 일치" 강제 봇이 결정→UI 일치 검사하지 않음.

**예방책 (별도 BL 후보)**:
- `decision-ui-sync-bot` — 새 결정 박힐 때 영향 페이지 목록 박고, 그 페이지가 실제로 결정 따르는지 라이브 검증.
- 이번 BL은 사람이 발견했지만 봇이 잡아야 정석.

## ✅ 결과 (이 채팅에서 박은 것)

- tasks.json — BL-ADMIN-USER-MANAGEMENT 단계 5에 sub_steps 6개 + 결정 메모 박힘
- DECISIONS.md — D-041 (UI/API 불일치 해소 결정) 최상단 추가
- _chat-logs/ — 이 파일 (Week 2.5 디스커버리)

## ➡️ 다음 행동 (새 채팅에서)

대표님이 admin-status.html → ⚡ 진행 중 박스 → BL-ADMIN-USER-MANAGEMENT 카드 클릭하시면, 자동 생성된 인계서에 위 sub-step 6개가 박혀있고, 새 채팅 Claude가 5-2부터 즉시 시작.

5-2~5-6은 한 채팅에서 다 못 끝날 가능성 있음(2시간+). 새 채팅 Claude가 분량 압박 감지 시 5-3 또는 5-4쯤에서 추가 인계 권장.
