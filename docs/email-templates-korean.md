# Supabase 이메일 템플릿 (한글 + TravelWinners 브랜드)

**적용 위치**: Supabase 대시보드 → Authentication → Email Templates

각 템플릿마다 **Subject (제목)**과 **Message body (본문)** 를 모두 교체하세요.

---

## 1. Confirm signup (가입 확인 메일)

### Subject
```
[TravelWinners] 이메일 인증을 완료해주세요
```

### Message body (Source 모드 / HTML)
```html
<div style="font-family:'Malgun Gothic',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:30px">
    <div style="display:inline-block;width:56px;height:56px;background:#0F3D2E;color:#C8A552;border-radius:12px;line-height:56px;font-size:24px;font-weight:700;letter-spacing:-1px">TW</div>
    <div style="font-size:20px;font-weight:600;margin-top:12px;color:#0F3D2E">TravelWinners</div>
  </div>

  <h2 style="font-size:24px;color:#1a1a1a;margin:0 0 16px 0">이메일 인증</h2>
  
  <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 20px 0">
    안녕하세요, TravelWinners에 가입해주셔서 감사합니다.<br>
    아래 버튼을 클릭하여 이메일 인증을 완료해주세요.
  </p>

  <div style="text-align:center;margin:30px 0">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0F3D2E;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px">
      이메일 인증하기
    </a>
  </div>

  <p style="font-size:13px;line-height:1.7;color:#888;margin:30px 0 0 0">
    버튼이 작동하지 않으면 아래 링크를 복사해서 브라우저에 붙여넣으세요:<br>
    <span style="color:#0F3D2E;word-break:break-all">{{ .ConfirmationURL }}</span>
  </p>

  <hr style="border:none;border-top:1px solid #eee;margin:30px 0">

  <p style="font-size:12px;color:#999;line-height:1.6;margin:0">
    본 메일은 TravelWinners 가입 절차에 따라 자동 발송되었습니다.<br>
    가입 신청을 하지 않으셨다면 이 메일을 무시하셔도 됩니다.
  </p>
  <p style="font-size:12px;color:#999;line-height:1.6;margin:8px 0 0 0">
    © 2026 TravelWinners (주식회사 여행능력자들). All rights reserved.
  </p>
</div>
```

---

## 2. Reset password (비밀번호 재설정 메일)

### Subject
```
[TravelWinners] 비밀번호 재설정 안내
```

### Message body
```html
<div style="font-family:'Malgun Gothic',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:30px">
    <div style="display:inline-block;width:56px;height:56px;background:#0F3D2E;color:#C8A552;border-radius:12px;line-height:56px;font-size:24px;font-weight:700;letter-spacing:-1px">TW</div>
    <div style="font-size:20px;font-weight:600;margin-top:12px;color:#0F3D2E">TravelWinners</div>
  </div>

  <h2 style="font-size:24px;color:#1a1a1a;margin:0 0 16px 0">비밀번호 재설정</h2>

  <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 20px 0">
    비밀번호 재설정 요청을 받았습니다.<br>
    아래 버튼을 클릭하여 새로운 비밀번호를 설정해주세요.
  </p>

  <div style="text-align:center;margin:30px 0">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0F3D2E;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px">
      비밀번호 재설정하기
    </a>
  </div>

  <div style="background:#fff8e8;border:1px solid #f0d8a8;padding:14px 16px;border-radius:8px;font-size:13px;color:#a36d10;line-height:1.6;margin:20px 0">
    <strong>⚠ 보안 안내</strong><br>
    이 링크는 <strong>1시간 후 만료</strong>됩니다.<br>
    본인이 요청하지 않으셨다면 이 메일을 무시해주세요.
  </div>

  <p style="font-size:13px;line-height:1.7;color:#888;margin:30px 0 0 0">
    버튼이 작동하지 않으면 아래 링크를 복사해서 브라우저에 붙여넣으세요:<br>
    <span style="color:#0F3D2E;word-break:break-all">{{ .ConfirmationURL }}</span>
  </p>

  <hr style="border:none;border-top:1px solid #eee;margin:30px 0">

  <p style="font-size:12px;color:#999;line-height:1.6;margin:0">
    문의사항: dgmasters01@gmail.com<br>
    © 2026 TravelWinners (주식회사 여행능력자들). All rights reserved.
  </p>
</div>
```

---

## 3. Magic Link (안 쓰면 건너뛰기)

현재 사용 안 하므로 그대로 두셔도 됩니다.

---

## 4. Change Email Address (이메일 변경 - 추후 사용)

### Subject
```
[TravelWinners] 이메일 변경 확인
```

### Message body
```html
<div style="font-family:'Malgun Gothic',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:30px">
    <div style="display:inline-block;width:56px;height:56px;background:#0F3D2E;color:#C8A552;border-radius:12px;line-height:56px;font-size:24px;font-weight:700;letter-spacing:-1px">TW</div>
    <div style="font-size:20px;font-weight:600;margin-top:12px;color:#0F3D2E">TravelWinners</div>
  </div>

  <h2 style="font-size:24px;color:#1a1a1a;margin:0 0 16px 0">이메일 변경 확인</h2>

  <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 20px 0">
    이메일 주소 변경을 요청하셨습니다.<br>
    아래 버튼을 클릭하여 변경을 완료해주세요.
  </p>

  <div style="text-align:center;margin:30px 0">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0F3D2E;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px">
      이메일 변경 확인
    </a>
  </div>

  <hr style="border:none;border-top:1px solid #eee;margin:30px 0">

  <p style="font-size:12px;color:#999;line-height:1.6;margin:0">
    © 2026 TravelWinners (주식회사 여행능력자들). All rights reserved.
  </p>
</div>
```

---

## 적용 방법

1. Supabase 대시보드 → Authentication → Email Templates
2. 좌측 탭에서 **"Confirm signup"** 클릭
3. **Subject heading** 칸의 영문을 위 한글로 교체
4. **Message body** 영역에서:
   - 우측 상단 **"Source"** 버튼 클릭 (HTML 모드 활성화)
   - 기존 내용 모두 삭제
   - 위 HTML 코드 복사 → 붙여넣기
5. **"Save changes"** 버튼 클릭
6. 다음 템플릿(Reset password)도 같은 방식으로 진행

---

## ⚠️ 주의사항

- `{{ .ConfirmationURL }}` 부분은 **절대 수정하지 마세요**. Supabase가 자동으로 실제 링크로 치환합니다.
- HTML이 깨지지 않게 **전체를 한 번에** 복사·붙여넣기 하세요.
- Subject(제목)는 평문으로 입력 (HTML 안 됨).

---

## 발신자 이름은 어떻게 바꾸나?

기본 발신자: `Supabase Auth <noreply@mail.app.supabase.io>`

**무료로 안 됨.** 다음 두 방법 중 하나로 가능:

### 옵션 A: Resend.com 연동 (추천, 월 무료 3,000통)
1. https://resend.com 가입
2. 도메인 인증 (travelwinners.shop의 DNS 설정)
3. Supabase → Settings → Auth → SMTP Settings
4. Resend SMTP 정보 입력
5. From email: `noreply@travelwinners.shop`
6. From name: `TravelWinners`

### 옵션 B: Gmail SMTP (개인 Gmail로 발송)
- 발송 한도 매일 100~500통
- App Password 생성 필요
- From email: `dgmasters01@gmail.com`

→ 이건 위 1, 2순위 끝난 후 별도로 진행하시면 됩니다.
