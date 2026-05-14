# CRON_SECRET 등록 가이드 (BL-MANAGER-AUTO-CAMPAIGN)

자동 캠페인 봇이 매일 09:00 KST에 매니저들에게 D-0/7/30/150/170 메일을 자동 발송하려면 이 토큰을 두 곳에 등록해야 합니다.

## 왜 필요한가

`gohotelwinners.com/api/cron/manager-campaign` 엔드포인트는 외부에서 누가 호출하든 인증을 거칩니다. 토큰이 맞아야만 메일 발송 가능. 토큰이 없거나 잘못되면 401 unauthorized 반환 → 안전.

## 추천 토큰

```
twcron_d153fedcb236183ebcfddfd6c87a30eed19ee9db4e1427ee3c8dd96c5a067240
```

256-bit 엔트로피, 절대 예측 불가. 이 값을 그대로 두 곳에 박으셔도 되고, 직접 새로 만드셔도 됩니다 (대표님이 만드시면 영문+숫자 32자 이상 권장).

## 등록 절차 (두 곳에 같은 값)

### Step 1: Vercel Environment Variables

1. https://vercel.com/dashboard 접속
2. **tw-b2b** 프로젝트 클릭
3. 상단 **Settings** 탭 → 좌측 **Environment Variables**
4. 새 변수 추가:
   - **Name**: `CRON_SECRET`
   - **Value**: (위 추천 토큰 또는 직접 만든 값)
   - **Environments**: Production / Preview / Development 모두 ✓ 체크
5. **Save** 클릭
6. 우측 상단 **Deployments** 탭으로 가서 가장 최근 배포의 ⋯ 메뉴 → **Redeploy** 1번 누름 (환경변수 새로 박힌 거 적용)

### Step 2: GitHub Repository Secrets

1. https://github.com/dgmasters01/tw-b2b/settings/secrets/actions 접속
2. **New repository secret** 버튼 클릭
3. 입력:
   - **Name**: `CRON_SECRET`
   - **Secret**: (Step 1과 **완전히 같은 값**)
4. **Add secret** 클릭

## 등록 검증 (테스트 발송)

1. https://github.com/dgmasters01/tw-b2b/actions
2. 좌측 목록에서 **Manager Auto Campaign** 클릭
3. 우측 **Run workflow** 버튼 → 드롭다운 열림
4. **dry_run** 옵션을 `true`로 토글 (실제 발송 안 함, 시뮬레이트만)
5. **Run workflow** 녹색 버튼 클릭
6. 1~2분 대기 → 작업 목록에 새 entry 등장
7. entry 클릭해서 로그 확인:
   - 성공: **✅ Campaign sent: 0** 출력 (결제 매니저 0명이라 0건, 정상)
   - 실패: 401 또는 secret 오류 → Step 1 또는 2 토큰 값 확인

## 실제 가동 시점

테스트 PASS 후 별도 작업 불필요. 매일 KST 09:00 자동 실행. workflow가 알아서 돕니다.

## 동작 흐름 한번에

```
매일 09:00 KST (UTC 00:00)
  ↓
GitHub Actions cron 트리거
  ↓
curl -X POST https://gohotelwinners.com/api/cron/manager-campaign
  with header x-cron-token: $CRON_SECRET
  ↓
Vercel 함수 실행
  → 환경변수 CRON_SECRET과 헤더값 비교
  → 일치하면 통과
  ↓
Supabase에서 v_hotel_manager_full VIEW 조회
  → lifecycle_stage 5단계별 대상 매니저 추출
  ↓
manager_campaign_log 테이블에서 이미 발송한 사람 제외
  ↓
Resend로 stage별 메일 발송
  ↓
발송 결과 manager_campaign_log에 기록 (UNIQUE 제약으로 재발송 차단)
```

## 보안 가드

- 토큰이 노출되면 누구나 cron endpoint 호출 가능 → 메일 폭주 위험
- GitHub Secrets / Vercel Environment Variables 둘 다 평문 노출 안 됨 (로그에도 마스킹)
- 의심되면 새 토큰 생성 → 두 곳 같은 값으로 재등록 → 끝
