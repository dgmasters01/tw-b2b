---
slug: 2026-05-21-bl-admin-user-management-week3-step5-done
title: BL-ADMIN-USER-MANAGEMENT Week 3 — 단계 5 완료 (Team 탭 + 초대 흐름 + 메일 정렬)
date: 2026-05-21
tasks: [BL-ADMIN-USER-MANAGEMENT]
commits: [bbf4d86, 6291e3a, 261287c, 3b570a2]
decisions: [D-042, D-043]
---

## 🎯 한 줄 요약

단계 5 sub_steps 6개 중 5-2 + 5-3 + 5-4를 한 채팅에서 다 박고, 중간에 사고 2건(super_admin 잔재 + 메일 카피 개인화) 핫픽스하고, 대표님 실 메일 수신 검증까지 완료. BL-ADMIN-USER-MANAGEMENT 100% done.

## 📍 무엇을 박았나 (단계별)

### 단계 5-2: renderAdmins() ⋯ 메뉴 + am-modal (commit `bbf4d86`)

- `loadAdmins()`: `T.sb.from('admins').select` 직접 호출 폐기 → `?action=auth-users-list` 호출 (admins + invitations + recent_log 통합 조회)
- `renderAdmins()`: Remove 단일 버튼 → ⋯ 메뉴 (활성/비활성 토글, 권한 변경, 제거, 이력 보기)
- `am-action-modal` 신설: um-modal 패턴 그대로 따라 박음 (검은 보라, 작업 4종 + 디테일 폼 + 뒤로가기)
- 호출 페이로드를 백엔드 계약(`action='change_role'/'revoke'/'restore'`)에 맞춤
- Owner 행은 🔒 owner 보호 표시
- **단계 5-5(am-modal 박기)는 이 작업에 흡수**됨 — 5-2에서 모달 없이 ⋯ 메뉴만 박으면 죽은 코드 commit이 되므로

### 단계 5-3: Add Team Member 초대장 흐름 (commit `bbf4d86`)

- `T.sb.from('admins').insert()` 직접 박는 흐름 폐기 → `?action=auth-invite` 호출
- 카피 정정: 잘못된 안내 "They must already have a TravelWinners account" → "An invitation email will be sent. Link valid for 7 days."
- Role 옵션 D-015 표준으로 정렬: admin/staff/readonly
- Owner role 안내 추가: "Owner role can only be set via SQL (D-015 protection)"

### D-042: 재발송 시 A 정책 박음 (commit `bbf4d86`)

- 백엔드 `handleInvite`: 같은 email pending 있으면 옛 동작 = 409 차단
- 새 동작 = 자동 `cancelled_at` 박고 새 토큰 발급 + 새 메일 발송
- 응답에 `resend_of` 박음 (재발송 추적용)
- `role_change_log.action='reinvited'` 박음 (첫 발송 'invited'와 구분)
- 한 사람당 활성 초대 링크 1개 보장 — Slack/Notion/Linear 표준 패턴

### 핫픽스 1: super_admin 잔재 정렬 (commit `6291e3a`)

**사고**: 대표님 화면에 "+ Add Team Member" 버튼 안 보임.

**원인**: 단계 5-2에서 `renderAdmins`만 정렬하고 다른 곳에 박힌 옛 권한 단어 `super_admin` 3건 안 찾음. 대표님 권한 `owner`인데 옛 조건 `role !== 'super_admin'`이 owner를 막음.

**핫픽스**:
- Line 1171: 주석 정렬 (owner/admin/staff/readonly D-015)
- Line 1192: Invite 버튼 표시 조건 `owner OR admin`
- Line 3362: bself 삭제 버튼 표시 조건 동일 정렬

**예방책 (개인 룰)**: D-### 변경 시 옛 키워드(`super_admin`/`support` 등) grep 마지막 필수.

### 단계 5-4: Pending invitations 섹션 + cancel-invite (commit `261287c`)

- `_admin/admin.html`:
  - Team 탭 하단에 `#admins-pending-card` 카드 신설 (count 배지 + 안내 + 테이블)
  - `renderPendingInvitations()` 본격 구현 (5-2 placeholder → 풀 코드)
  - 만료일 D-day 표시: 1일 이하 빨강, 3일 이하 주황, 그 외 회색
  - 📧 Resend 버튼: `invite` 재호출 (D-042 A 정책으로 옛 거 자동 cancel)
  - ✕ Cancel 버튼: `auth-cancel-invite` 호출
  - Team 안내 카피 정정 (옛 'Super Admins' → 'owner and admin')
- `api/_lib/admin-auth-handlers.js`:
  - `cancel-invite` 액션 라우터 추가
  - `handleCancelInvite` 함수 신설 (검증: 존재/이미 accepted/이미 cancelled, 처리: cancelled_at + role_change_log)

### 핫픽스 2 + D-043: 메일 카피 GOHOTELWINNERS 사업가 정렬 (commit `3b570a2`)

**사고**: 단계 5-4 실 메일 수신 검증 결과, 옛 메일이 "개인(dgmasters01)이 부른 것"처럼 보임.

| 위치 | 옛 카피 | 새 카피 |
|---|---|---|
| 발신자명 | `여행능력자들` / `TravelWinners` | **`GOHOTELWINNERS`** (대문자 통일) |
| 한국어 제목 | `[여행능력자들] staff 권한 초대 — dgmasters01@gmail.com님이 보내셨습니다` | **`[GOHOTELWINNERS] STAFF 권한으로 초대되셨습니다`** |
| 영어 제목 | `[TravelWinners] You're invited as staff by dgmasters01@gmail.com` | **`[GOHOTELWINNERS] You're invited as STAFF`** |
| 본문 H2 | `여행능력자들 관리자 초대` | **`GOHOTELWINNERS 호텔 서비스 초대`** |
| 본문 안내 | `XXX님이 회원님을 staff 권한으로 초대하셨습니다` | **`GOHOTELWINNERS 호텔 서비스에 STAFF 권한으로 초대되셨습니다`** |
| 인사 | `안녕하세요, Jun님` (displayName 잘못 박힘) | **`안녕하세요`** |
| 푸터 | 없음 | **`— GOHOTELWINNERS 팀 / 문의: info@gohotelwinners.com`** |
| role 표시 | `staff` 소문자 | **`STAFF`** 대문자 |

**원칙 박힘**:
- 이 admin은 gohotelwinners(B2B 호텔영업 브랜드) 사이트 — 발신자도 그 정체성과 100% 일치
- "어드민 콘솔"은 개발 언어 — 사업가 언어 "호텔 서비스"로 정렬
- inviterEmail(dgmasters01)은 메일 본문/제목에서 완전 제거. 추적은 `role_change_log`에 영구 기록 (사용자 메일에 박을 필요 없음)
- displayName 파라미터는 받지만 미사용 (잘못 박힐 위험 제거)

## ✅ 라이브 검증 결과 (대표님 실 메일 수신)

대표님 본인 다른 이메일 `globalhoteltravel@gmail.com`로 staff 권한 초대 발송:

| 검증 | 결과 |
|---|---|
| "+ Add Team Member" 버튼 표시 (핫픽스 1 검증) | ✅ |
| Invite 모달 정상 (Role 선택 + Owner 안내) | ✅ |
| 발송 성공 알림 ("Invitation sent to ...") | ✅ |
| Gmail inbox 미리보기: **GOHOTELWINNERS** 발신자 + `[GOHOTELWINNERS] STAFF 권한으로 초대되...` 제목 | ✅ |
| 본문: GOHOTELWINNERS 호텔 서비스 초대 / 안녕하세요. / GOHOTELWINNERS 호텔 서비스에 STAFF 권한으로 초대되셨습니다 | ✅ |
| dgmasters01 어디에도 안 나옴 | ✅ |
| 푸터: `— GOHOTELWINNERS 팀 / 문의: info@gohotelwinners.com` | ✅ |
| Pending invitations 섹션 카드 등장 (5-4 검증) | ✅ |

## 📊 BL 통계

- **시작**: 2026-05-13 (P0 박힘) → 2026-05-15 (단계 1~4 완료) → 2026-05-20 (D-041 발견 + 단계 5 sub_steps 분할) → 2026-05-21 (단계 5 완료)
- **총 commit**: 약 12개 (단계 1~4 + 5-2/5-3/5-4 + 핫픽스 2건 + 봇 자동 갱신)
- **신규 결정**: D-041, D-042, D-043
- **사고 2건**: super_admin 잔재 (5-2 검증 누락) / 메일 카피 개인화 (D-015에서 메일 카피 정렬 누락)

## 🚨 다음에 안 반복하게 (헌법 6조)

### 사고 1: super_admin 잔재

**원인**: D-### 변경 시 옛 권한 단어 잔재 grep 안 함.

**예방**: 새 BL 시작 시 자체 검증 11번 + 추가 1번 신설 — **"옛 키워드(전 결정 단어들) 잔재 grep 0건 확인"**.

### 사고 2: 메일 카피 개인 정보 노출

**원인**: BL-ADMIN-AUTH-V2(D-015) 박을 때 백엔드·DB·페이지는 다 정렬했지만, **메일 카피 검토 누락**. 메일 카피가 곧 사용자가 받는 첫 인상 = 사업 정체성 그 자체인데 개발 영역으로 분류해서 검토 패스.

**예방 후보 (별도 BL)**: 시스템 메일 5종(가입/비밀번호 리셋/초대/호텔 등록/예약 알림) 카피 가이드 박고 봇이 commit 검사.

## ➡️ BL-ADMIN-USER-MANAGEMENT 종료

- tasks.json: status=done, percent=100, 단계 5 + sub_steps 6개 모두 done
- 다음 우선순위는 admin-status.html 라이브 현황표에서 확인
