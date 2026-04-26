#!/usr/bin/env python3
"""
Supabase Auth 설정 자동 적용:
1. 이메일 인증 ON (mailer_autoconfirm = False)
2. Confirm signup 템플릿 영어 + 브랜드 적용
3. Reset password 템플릿 영어 + 브랜드 적용
"""
import json
import urllib.request
import urllib.error

TOKEN = "SUPABASE_PAT_FROM_ENV"
PROJECT_REF = "vjsludfjsphwnumuoqaj"
API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/config/auth"

# ============================================================================
# Confirm signup 템플릿 (영어)
# ============================================================================
CONFIRMATION_SUBJECT = "Verify your TravelWinners account"

CONFIRMATION_HTML = """<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1a1a1a;background:#fff">
  <div style="text-align:center;margin-bottom:32px">
    <div style="display:inline-block;width:56px;height:56px;background:#0F3D2E;color:#C8A552;border-radius:12px;line-height:56px;font-size:22px;font-weight:700;letter-spacing:-0.5px">TW</div>
    <div style="font-size:18px;font-weight:600;margin-top:12px;color:#0F3D2E;letter-spacing:0.3px">TravelWinners</div>
    <div style="font-size:12px;color:#888;margin-top:2px">Hotel Marketing Network</div>
  </div>
  <h2 style="font-size:22px;color:#1a1a1a;margin:0 0 14px 0;font-weight:600">Verify your email</h2>
  <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 24px 0">
    Welcome to TravelWinners. Please confirm your email address to activate your hotel partner account and start reaching travelers worldwide.
  </p>
  <div style="text-align:center;margin:32px 0">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0F3D2E;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px">Verify Email Address</a>
  </div>
  <p style="font-size:13px;line-height:1.7;color:#888;margin:32px 0 0 0">
    Or copy and paste this link into your browser:<br>
    <a href="{{ .ConfirmationURL }}" style="color:#0F3D2E;word-break:break-all;text-decoration:none">{{ .ConfirmationURL }}</a>
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
  <p style="font-size:12px;color:#999;line-height:1.6;margin:0">
    If you didn't sign up for TravelWinners, you can safely ignore this email.<br><br>
    Questions? Contact <a href="mailto:dgmasters01@gmail.com" style="color:#0F3D2E;text-decoration:none">dgmasters01@gmail.com</a><br><br>
    &copy; 2026 TravelWinners Inc. All rights reserved.
  </p>
</div>"""

# ============================================================================
# Reset password 템플릿 (영어)
# ============================================================================
RECOVERY_SUBJECT = "Reset your TravelWinners password"

RECOVERY_HTML = """<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1a1a1a;background:#fff">
  <div style="text-align:center;margin-bottom:32px">
    <div style="display:inline-block;width:56px;height:56px;background:#0F3D2E;color:#C8A552;border-radius:12px;line-height:56px;font-size:22px;font-weight:700;letter-spacing:-0.5px">TW</div>
    <div style="font-size:18px;font-weight:600;margin-top:12px;color:#0F3D2E;letter-spacing:0.3px">TravelWinners</div>
    <div style="font-size:12px;color:#888;margin-top:2px">Hotel Marketing Network</div>
  </div>
  <h2 style="font-size:22px;color:#1a1a1a;margin:0 0 14px 0;font-weight:600">Reset your password</h2>
  <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 24px 0">
    We received a request to reset the password for your TravelWinners account. Click the button below to set a new password.
  </p>
  <div style="text-align:center;margin:32px 0">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0F3D2E;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px">Reset Password</a>
  </div>
  <div style="background:#fff8e8;border:1px solid #f0d8a8;padding:14px 16px;border-radius:8px;font-size:13px;color:#a36d10;line-height:1.6;margin:24px 0">
    <strong>Security notice</strong><br>
    This link expires in <strong>1 hour</strong>. If you didn't request a password reset, please ignore this email &mdash; your password will remain unchanged.
  </div>
  <p style="font-size:13px;line-height:1.7;color:#888;margin:24px 0 0 0">
    Or copy and paste this link into your browser:<br>
    <a href="{{ .ConfirmationURL }}" style="color:#0F3D2E;word-break:break-all;text-decoration:none">{{ .ConfirmationURL }}</a>
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
  <p style="font-size:12px;color:#999;line-height:1.6;margin:0">
    Questions? Contact <a href="mailto:dgmasters01@gmail.com" style="color:#0F3D2E;text-decoration:none">dgmasters01@gmail.com</a><br><br>
    &copy; 2026 TravelWinners Inc. All rights reserved.
  </p>
</div>"""

# ============================================================================
# 적용
# ============================================================================
payload = {
    # 이메일 인증 활성화
    "mailer_autoconfirm": False,
    
    # Confirm signup
    "mailer_subjects_confirmation": CONFIRMATION_SUBJECT,
    "mailer_templates_confirmation_content": CONFIRMATION_HTML,
    
    # Reset password
    "mailer_subjects_recovery": RECOVERY_SUBJECT,
    "mailer_templates_recovery_content": RECOVERY_HTML,
}

req = urllib.request.Request(
    API_URL,
    data=json.dumps(payload).encode('utf-8'),
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
    },
    method="PATCH"
)

try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        print("=== 적용 완료 ===")
        print(f"이메일 인증: {'ON' if result.get('mailer_autoconfirm') == False else 'OFF'}")
        print(f"Confirm signup 제목: {result.get('mailer_subjects_confirmation')}")
        print(f"Confirm signup 본문 길이: {len(result.get('mailer_templates_confirmation_content', ''))}자")
        print(f"Reset password 제목: {result.get('mailer_subjects_recovery')}")
        print(f"Reset password 본문 길이: {len(result.get('mailer_templates_recovery_content', ''))}자")
except urllib.error.HTTPError as e:
    print(f"=== 오류 발생 ===")
    print(f"HTTP {e.code}: {e.reason}")
    print(e.read().decode())
