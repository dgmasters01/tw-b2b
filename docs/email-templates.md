# Supabase Email Templates — TravelWinners B2B (English-first)

**Target audience**: Global hotel partners (English-speaking, primarily APAC + Europe + Americas)  
**Tone**: Professional, concise, business-friendly  
**Apply at**: Supabase dashboard → Authentication → Email Templates

---

## 1. Confirm signup

### Subject heading
```
Verify your TravelWinners account
```

### Message body (Source / HTML mode)
```html
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1a1a1a;background:#fff">
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
    Questions? Reply to this email or contact <a href="mailto:dgmasters01@gmail.com" style="color:#0F3D2E;text-decoration:none">dgmasters01@gmail.com</a><br><br>
    © 2026 TravelWinners Inc. All rights reserved.
  </p>
</div>
```

---

## 2. Reset password

### Subject heading
```
Reset your TravelWinners password
```

### Message body (Source / HTML mode)
```html
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1a1a1a;background:#fff">
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
    This link expires in <strong>1 hour</strong>. If you didn't request a password reset, please ignore this email — your password will remain unchanged.
  </div>

  <p style="font-size:13px;line-height:1.7;color:#888;margin:24px 0 0 0">
    Or copy and paste this link into your browser:<br>
    <a href="{{ .ConfirmationURL }}" style="color:#0F3D2E;word-break:break-all;text-decoration:none">{{ .ConfirmationURL }}</a>
  </p>

  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">

  <p style="font-size:12px;color:#999;line-height:1.6;margin:0">
    Questions? Contact <a href="mailto:dgmasters01@gmail.com" style="color:#0F3D2E;text-decoration:none">dgmasters01@gmail.com</a><br><br>
    © 2026 TravelWinners Inc. All rights reserved.
  </p>
</div>
```

---

## 3. Magic Link (skip — not used)

Currently not used in the system. Leave default.

---

## 4. Change Email Address (for future use)

### Subject heading
```
Confirm your new email address
```

### Message body
```html
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1a1a1a;background:#fff">
  <div style="text-align:center;margin-bottom:32px">
    <div style="display:inline-block;width:56px;height:56px;background:#0F3D2E;color:#C8A552;border-radius:12px;line-height:56px;font-size:22px;font-weight:700;letter-spacing:-0.5px">TW</div>
    <div style="font-size:18px;font-weight:600;margin-top:12px;color:#0F3D2E;letter-spacing:0.3px">TravelWinners</div>
  </div>

  <h2 style="font-size:22px;color:#1a1a1a;margin:0 0 14px 0;font-weight:600">Confirm email change</h2>

  <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 24px 0">
    You requested to change the email address on your TravelWinners account. Please confirm by clicking the button below.
  </p>

  <div style="text-align:center;margin:32px 0">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0F3D2E;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px">Confirm New Email</a>
  </div>

  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">

  <p style="font-size:12px;color:#999;line-height:1.6;margin:0">
    © 2026 TravelWinners Inc. All rights reserved.
  </p>
</div>
```

---

## How to apply

1. Supabase dashboard → **Authentication** → **Email Templates**
2. Click **"Confirm sign up"** row to expand
3. Replace **Subject heading** with the English version above
4. In **Message body** area:
   - Click **"Source"** toggle (top-right) to switch to HTML mode
   - Delete all existing content
   - Copy the HTML block above and paste
5. Click **"Save changes"**
6. Repeat for **"Reset password"**
7. (Optional) Repeat for **"Change email address"** when you build that feature

---

## ⚠️ Important: Do NOT modify

- `{{ .ConfirmationURL }}` — Supabase replaces this with the actual link
- Other template variables that may be visible

---

## Why English-first?

- **Target market**: Global hotel partners (Sri Lanka, Vietnam, Thailand, Europe, Americas)
- **Industry standard**: Hospitality industry uses English globally
- **Bilingual UI**: Web pages have EN/한국어 toggle for the small Korean partner segment

---

## Future: Localized templates per region

When user base grows, Supabase can route templates by user locale. Currently using single English template for simplicity.

If specific high-value markets emerge (e.g., 30%+ Korean partners, or French market expansion), we can:
1. Create regional templates
2. Use Supabase's `user_metadata.locale` field
3. Trigger correct template via Edge Function

This is **future work** — not needed now.

---

## Custom domain email (3순위 future task)

Current sender: `Supabase Auth <noreply@mail.app.supabase.io>`  
Target sender: `TravelWinners <noreply@travelwinners.shop>`

Requires SMTP setup with one of:
- **Resend.com** (recommended): 3,000 emails/month free, easy DNS
- **SendGrid**: 100 emails/day free
- **Amazon SES**: $0.10 per 1,000 emails, requires verification

This is a separate setup project — not needed for initial launch.
