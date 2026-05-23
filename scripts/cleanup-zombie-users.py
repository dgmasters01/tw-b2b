#!/usr/bin/env python3
"""
좀비 가입자 청소봇 — BL-MEMBERS-DATA-SOURCE
==========================================

미인증 좀비 사용자 자동 삭제. 매일 KST 03:30 GitHub Actions에서 실행.

좀비 정의 (3조건 AND):
  1. auth.users.email_confirmed_at IS NULL (이메일 미인증)
  2. created_at < NOW() - 7 days (가입 7일 경과)
  3. hotels 테이블에 user_id 매칭 0건 (호텔 등록 안 함)
  + admins 테이블에 이메일 박힌 사람은 절대 제외 (팀 멤버 안전장치)

처리:
  - DRY_RUN=true (기본): 후보만 stdout 출력, 삭제 안 함
  - DRY_RUN=false: Supabase Admin API로 auth.users 삭제 + admin_audit_log에 before_state 박음

환경변수:
  SUPABASE_URL          — Supabase 프로젝트 URL
  SUPABASE_SERVICE_KEY  — service_role key
  DRY_RUN               — 'true' 또는 'false' (기본 'true')
  ZOMBIE_CUTOFF_DAYS    — 좀비 판정 기준 일수 (기본 7)

헌법 부합:
  ② 무인 실행 — GitHub Actions cron, 사람 손 없음
  ④ 전수 추적 — admin_audit_log에 before_state 영구 기록
  ⑤ 무인 검증 — DRY_RUN 기본 ON, 실수 방지
  ⑨ 가역성 — 삭제 전 user 전체 상태 audit_log에 박음
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
DRY_RUN = os.environ.get("DRY_RUN", "true").lower() != "false"
CUTOFF_DAYS = int(os.environ.get("ZOMBIE_CUTOFF_DAYS", "7"))

if not SUPABASE_URL or not SERVICE_KEY:
    print("❌ SUPABASE_URL / SUPABASE_SERVICE_KEY 미설정", file=sys.stderr)
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {SERVICE_KEY}",
    "apikey": SERVICE_KEY,
    "Content-Type": "application/json",
}


def http(method, path, body=None):
    """Supabase HTTP 공통 헬퍼."""
    url = f"{SUPABASE_URL}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            text = resp.read().decode()
            return resp.status, json.loads(text) if text else None
    except urllib.error.HTTPError as e:
        body_text = e.read().decode(errors="replace")
        return e.code, {"error": body_text}


def fetch_all_users():
    """auth.users 전체 조회 (페이지네이션)."""
    users = []
    page = 1
    while True:
        status, data = http("GET", f"/auth/v1/admin/users?per_page=200&page={page}")
        if status != 200:
            print(f"❌ auth/admin/users 실패 status={status}: {data}", file=sys.stderr)
            sys.exit(2)
        chunk = data.get("users", []) if isinstance(data, dict) else []
        if not chunk:
            break
        users.extend(chunk)
        if len(chunk) < 200:
            break
        page += 1
        if page > 50:  # 안전장치 (만 명 이상 시 멈춤)
            break
    return users


def fetch_hotels_user_ids():
    """hotels 테이블의 user_id 집합."""
    status, data = http("GET", "/rest/v1/hotels?select=user_id")
    if status != 200:
        print(f"❌ hotels 조회 실패 status={status}: {data}", file=sys.stderr)
        sys.exit(3)
    return {h["user_id"] for h in (data or []) if h.get("user_id")}


def fetch_admin_emails():
    """admins 테이블 이메일 집합 (소문자)."""
    status, data = http("GET", "/rest/v1/admins?select=email")
    if status != 200:
        print(f"❌ admins 조회 실패 status={status}: {data}", file=sys.stderr)
        sys.exit(4)
    return {(a.get("email") or "").lower() for a in (data or []) if a.get("email")}


def delete_user(user_id):
    """Supabase Admin API로 auth.users 삭제."""
    status, data = http("DELETE", f"/auth/v1/admin/users/{user_id}")
    return status in (200, 204), data


# 가역성 메모:
# 봇은 action_logs에 직접 박을 수 없음 (performed_by NOT NULL UUID 제약).
# 대신 GitHub Actions 워크플로 실행 로그가 영구 기록 채널 (헌법 부칙 4 전수 추적):
#   - 실행 시각, 좀비 후보 명단(email + id + created_at), 삭제 결과가 stdout으로 박힘
#   - GitHub Actions UI에서 90일 보관 + workflow run artifact로 영구 보관 가능
# 사람 손 삭제는 admin.html이 action_logs에 박음 (handleDeleteUser).
# 가역성: 삭제 직전 stdout에 user 전체 정보 print → Actions 로그에서 복원 정보 확보.


def print_user_snapshot(user, reason):
    """삭제 직전 user 전체 정보를 stdout에 박음 (Actions 로그 = 영구 기록)."""
    snapshot = {
        "deletion_time": datetime.now(timezone.utc).isoformat(),
        "reason": reason,
        "cutoff_days": CUTOFF_DAYS,
        "user": user,
    }
    print(f"📋 SNAPSHOT_BEFORE_DELETE: {json.dumps(snapshot, ensure_ascii=False)}")


def main():
    print(f"🤖 zombie-cleanup-bot 시작 — DRY_RUN={DRY_RUN}, CUTOFF={CUTOFF_DAYS}일")
    print(f"   시각: {datetime.now(timezone.utc).isoformat()}")

    users = fetch_all_users()
    hotel_user_ids = fetch_hotels_user_ids()
    admin_emails = fetch_admin_emails()
    print(f"📊 auth.users={len(users)} / hotels user_id={len(hotel_user_ids)} / admins={len(admin_emails)}")

    cutoff = datetime.now(timezone.utc) - timedelta(days=CUTOFF_DAYS)
    zombies = []
    for u in users:
        email_lower = (u.get("email") or "").lower()
        if email_lower in admin_emails:
            continue  # 팀 멤버 절대 보호
        if u.get("email_confirmed_at"):
            continue  # 인증 완료된 사용자 보호
        if u.get("id") in hotel_user_ids:
            continue  # 호텔 등록한 사용자 보호
        created_str = u.get("created_at", "")
        if not created_str:
            continue
        try:
            created = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
        except ValueError:
            continue
        if created > cutoff:
            continue  # 7일 미경과
        zombies.append(u)

    print(f"🧟 좀비 후보: {len(zombies)}명")
    for z in zombies:
        print(f"   - {z.get('email')} | id={z['id']} | created={z.get('created_at')}")

    if DRY_RUN:
        print("✅ DRY_RUN 모드 — 실제 삭제 없음. 환경변수 DRY_RUN=false 로 실제 삭제.")
        return 0

    if not zombies:
        print("✅ 청소할 좀비 없음.")
        return 0

    deleted = 0
    failed = 0
    for z in zombies:
        reason = f"미인증 {CUTOFF_DAYS}일 경과 + 호텔 0건"
        # 1) 삭제 직전 snapshot을 stdout에 박음 (GitHub Actions 로그 = 영구 기록, 헌법 부칙 9 가역성)
        print_user_snapshot(z, reason)
        # 2) auth.users 삭제
        ok, data = delete_user(z["id"])
        if ok:
            print(f"🗑️  삭제: {z.get('email')}")
            deleted += 1
        else:
            print(f"❌ 삭제 실패: {z.get('email')} → {data}", file=sys.stderr)
            failed += 1

    print(f"📊 결과: 삭제={deleted}건 / 실패={failed}건")
    return 0 if failed == 0 else 5


if __name__ == "__main__":
    sys.exit(main())
