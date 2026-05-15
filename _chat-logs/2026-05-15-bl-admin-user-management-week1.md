---
slug: 2026-05-15-bl-admin-user-management-week1
title: BL-ADMIN-USER-MANAGEMENT Week 1 — API 3종 + action_logs + Members 탭 ⋯ 메뉴
date: 2026-05-15
tasks: [BL-ADMIN-USER-MANAGEMENT]
commits: []
decisions: []
---

## 🎯 한 줄 요약

가입자 행 옆 ⋯ 메뉴로 권한 변경·재인증·완전 삭제를 admin이 직접 조작 가능하게 박았다. 모든 조작은 action_logs 통합 audit 테이블에 자동 기록된다. Hotels·Team 탭은 다음 채팅에서 마무리.

## 📍 왜 발생했나

기존 admin 화면은 가입자/호텔/팀 목록을 보여주기만 했다. 권한 변경하거나 사용자 삭제하려면 Supabase Studio에 직접 들어가서 SQL 박아야 했음. 일상 운영에서 사용자 1명 처리하는데 5분~10분 소요 + 실수 시 복구 어려움.

본 BL 메모에 "action_logs 자동 기록"이 명시됐는데 라이브 점검 결과 테이블 자체가 없었음. role_change_log만 있었고 그것도 role 변경 전용 — 일반화된 audit 테이블 신설 필요.

기존 admin.js의 ALLOWED_ACTIONS도 헤더 주석에 'auth-invite', 'auth-change-role'이라 적혀있지만 실제로는 'send-invite'만 박혀있고 change-role은 미구현. 인계서가 "(기존)"으로 표시했지만 라이브 fetch로 정정 — 신설 작업이 맞았다.

## 🛠 어떻게 해결했나

**action_logs 통합 audit 테이블 신설.** id/action/target_type/target_id/target_email/performed_by/before_state/after_state/metadata/notes 컬럼. RLS로 admin만 SELECT 가능. service_role만 INSERT. 모든 admin 조작이 단일 진실원으로 흘러들어가게 박음.

**API 3종 신설.**
- `delete-user`: auth.users DELETE + admins CASCADE 정리. owner 삭제 차단, 본인 삭제 차단. 호텔 정보는 before_state로 백업 기록.
- `change-role`: admins.role 또는 is_active PATCH. owner 변경 차단, 본인 강등 차단. role 화이트리스트(admin/staff/readonly/manager).
- `re-verify`: Supabase Auth Admin API의 generate_link로 magic link 발송. 사용자가 메일 링크 클릭 시 자동 로그인 + 이메일 재인증 효과.

3개 핸들러 모두 logAdminAction 헬퍼로 성공/실패 모두 action_logs에 기록. 메인 응답 차단 안 함 (best-effort logging).

**Members 탭 ⋯ 메뉴.** 행 우측 끝 셀에 ⋯ 버튼 박음. 클릭 시 작업 선택 모달 열림 (행 클릭 vs 메뉴 클릭 stopPropagation으로 분리). 모달 내부 3개 작업 버튼 — 권한 변경/재인증/사용자 삭제. 각 작업마다 디테일 폼(role 선택, 사유 입력, 확인 체크박스) → confirm → API 호출. ESC 또는 배경 클릭으로 닫기.

## ✅ 결과

- action_logs 테이블 라이브 생성 (RLS + 인덱스 4종 박힘)
- /api/admin?action=delete-user 라이브 401 응답 (라우팅 + 인증 정상)
- /api/admin?action=change-role 라이브 401 응답 (라우팅 + 인증 정상)
- /api/admin?action=re-verify 라이브 401 응답 (라우팅 + 인증 정상)
- unknown action(hack-attempt) → 정확한 화이트리스트 응답 (보안 정상)
- admin.html Members 탭에 ⋯ 작업 메뉴 박힘
- 본 BL 60% (3/5 단계). Hotels·Team 탭은 다음 채팅

## ⏱ 다음 결정 필요

본 BL 다음 채팅에서 마무리:
- **단계 4**: Hotels 탭 ⋯ 메뉴 — 호텔 행에서 매니저로 점프 + 매니저 작업
- **단계 5**: Team(Admins) 탭 — '+ Add Team Member' 실제 작동 + 팀원 행 ⋯ 메뉴

또는 별도 BL 후보:
- 가입자 탭에서 admins.role/is_active 컬럼이 안 보임 → 표시 컬럼 추가 (BL-MEMBERS-TAB-ROLE-DISPLAY)
- action_logs 조회 페이지 신설 (BL-AUDIT-LOG-VIEW)

---

# 🔧 기술 상세 (개발자용)

## 박은 파일 3개

1. `sql/action-logs-table.sql` (신규) — action_logs 테이블 + RLS + 인덱스
2. `api/admin.js` (수정) — ALLOWED_ACTIONS 3개 추가 + 3 핸들러 + logAdminAction 헬퍼
3. `_admin/admin.html` (수정) — Members 탭 ⋯ 메뉴 + 작업 모달 + 3종 액션 핸들러

## API 명세

### POST /api/admin?action=delete-user
```json
Request: { "user_id": "uuid", "reason": "텍스트" }
Response: {
  "success": true,
  "deleted_user_id": "uuid",
  "deleted_email": "email",
  "affected_hotels": 0
}
보안: owner 삭제 차단(403), 본인 삭제 차단(400)
```

### POST /api/admin?action=change-role
```json
Request: { "user_id": "uuid", "new_role": "admin|staff|readonly|manager", "is_active": true|false, "reason": "..." }
Response: { "success": true, "before": {...}, "after": {...} }
보안: owner 변경 차단(403), 본인 강등 차단(400), role 화이트리스트
```

### POST /api/admin?action=re-verify
```json
Request: { "user_id": "uuid", "reason": "..." }
Response: { "success": true, "email": "...", "message": "Magic link sent" }
효과: Supabase generate_link(magiclink) → 사용자 이메일로 발송
```

## logAdminAction 헬퍼

```javascript
await logAdminAction(serviceKey, {
  action: 'delete-user',           // 또는 'change-role' / 're-verify' 등
  targetType: 'user',
  targetId: targetUserId,
  targetEmail: targetAdmin?.email,
  performedBy: admin.id,
  performedByEmail: admin.email,
  status: 'success' | 'failed',
  beforeState: { ... },           // 조작 전 상태
  afterState: { ... },            // 조작 후 상태
  metadata: { reason, ip, ... },  // 부가 정보
});
```

실패해도 메인 응답 안 막음 (catch → console.warn). 감사 기록 누락보다 사용자 응답 보장 우선.

## 보안 가드

| 보호 항목 | 차단 메커니즘 |
|---|---|
| owner 삭제 | DB 조회 후 role === 'owner' → 403 |
| owner 권한 변경 | 동일 |
| 본인 삭제 | targetUserId === admin.id → 400 |
| 본인 강등 | 동일 |
| 비-admin 조작 | requireAdmin 미들웨어 통과 못 함 |
| 임의 role 박기 | ALLOWED_ROLES 화이트리스트 |
| 메인 응답 막힘 | logAdminAction try-catch |

## 라이브 검증 결과

```
1. /api/admin?action=delete-user (no auth) → 401 ✅
2. /api/admin?action=change-role (no auth) → 401 ✅
3. /api/admin?action=re-verify (no auth)   → 401 ✅
4. /api/admin?action=hack-attempt          → 400 unknown_action ✅
5. action_logs 테이블                       → rows=0 (정상 대기) ✅
6. JS 문법 자체 검증 (admin.html + api)     → PASS ✅
```

## 헌법 점검

- 부칙 5 (거짓 진행률 금지): 60%만 박고 done 안 함. Hotels/Team 탭 미완 명시.
- 부칙 7 (단계 = commit): 3단계 모두 step:done 박음
- 부칙 9 (가역성): action_logs로 모든 변경 추적, role/active 변경은 PATCH로 즉시 복원 가능
- 부칙 12 (Self-QA): node 문법 검증 + 라이브 5종 응답 검증
- 부칙 16 (자율): API 설계·UI 모달 구조·audit 스키마 100% 자율
