# BL-FLOW-2-SALES-COPY-5TIER — 이어받기 인계서

**작성**: 2026-05-23
**선행 작업**: BL-FLOW-1-AGODA-AUTO-APPROVE ✅ 완료 (commit `7c27268`)
**현재 상태**: 🔄 50% 박힘 — sales.html에 1·2·3·4단 카피만 박힘, **GitHub에 commit 안 됨** (이전 채팅 컨테이너 휘발)

---

## 🚨 새 채팅 클로드 — 작업 시작 전 의무

### 의무 1: 첫 응답 5줄 양식 (헌법 부칙 16)
```
① [작업 소요: 약 X분 / N단계 / 변경 파일: ...]
② 🚦 ✅ 이 채팅 진행 가능 (또는 ⚠️ 새 채팅 권장)
③ 📚 fetch 완료: OPERATIONS_CHARTER.md / CLAUDE.md / 이 인계서 / sales.html / copy-hierarchy.md
④ 🧭 북극성: sales.html 5단 카피로 결제 전환율 상승 + 🎯 한 결정: 5단 Guarantee 박기
⑤ 🔍 중복 점검 grep 결과 한 줄
```

### 의무 2: 라이브 fetch (요약본 의존 금지)
1. `OPERATIONS_CHARTER.md`
2. `CLAUDE.md`
3. **`sales.html`** (현재 commit 안 된 변경 → 라이브에는 1·2·3·4단 카피 없음)
4. **`docs/design/BL-MGR-DASHBOARD-V1/copy-hierarchy.md`** (5단 카피 원본)

### 의무 3: PAT
- **GitHub PAT**: 대표님께 요청 (직전 채팅에서 박혀있던 PAT 동일 사용 가능 — 대표님이 메시지에 다시 박아주심)
- **Supabase PAT**: 이번 작업엔 SQL 변경 없음, 참고용. 필요 시 대표님께 요청.

### 의무 4: 묻는 것 4가지만
- 사업 정책 / 서비스 방향 / 전체 틀 / 디자인 큰 방향
- 개발·기술·순서는 자율

---

## 📋 작업 정의

### 목적
매니저가 sales.html에서 "왜 $200 내야 하는지" 5단계로 설득당해서 결제 누름 → 결제 전환율 상승

### 5단 카피 소스
**`docs/design/BL-MGR-DASHBOARD-V1/copy-hierarchy.md`** v2 (2026-05-18 확정)

| 단 | 종류 | KO | EN |
|---|---|---|---|
| 1 | Hero (메인 약속) | 우리의 콘텐츠는 당신의 호텔을 예약 방문하게 합니다. | Our content brings real bookings and guests to your hotel. |
| 2 | Proof (숫자 증거) | 3,774건 예약 발생 · $854K 호텔 매출 발생 | 3,774 bookings · $854K in hotel revenue |
| 3 | Scale (규모 자산) | 9백만+ 영상 누적 조회 · 8개 채널 · 6개 언어 | 9M+ video views · 8 channels · 6 languages |
| 4 | How (작동 원리) | 당신의 호텔을 8개 채널·6개 언어로 동시 노출합니다. 한국 메인 + 해외 글로벌 확장. | We expose your hotel across 8 channels and 6 languages. Korea-led, global reach. |
| 5 | Guarantee (보장) | 6개월 0건이면 100% 환불. 위탁 영업입니다. | 6-month booking guarantee — 100% refund if zero bookings. |

**금지**: "7년 운영" 표기, 구독자 수 어필, 매니저 대시보드 영업 멘트 (sales.html 전용)

---

## 🔄 이전 채팅에서 박혔던 변경 (라이브에는 없음 — 다시 박아야 함)

### sales.html — 박힌 부분
**다 새로 박아야 한다.** 라이브 sales.html(현재 777줄)에는 이 변경이 **하나도 없음**.

#### 변경 1: `renderSales(hotel, status)` 함수 시작부 (라이브 line 580~583)
**BEFORE** (현재 라이브):
```javascript
  function renderSales(hotel, status) {
    var html = '';
    html += '<h1 class="sl-h1">Activate your <em>listing</em></h1>';
    html += '<p class="sl-sub">One $200 payment puts your hotel on 8 YouTube channels covering 6 languages — backed by a 6-month booking guarantee or full refund.</p>';
```

**AFTER** (박을 내용 — 1단 Hero + 4단 How):
```javascript
  function renderSales(hotel, status) {
    var html = '';
    // [BL-FLOW-2-SALES-COPY-5TIER 2026-05-23] 5단 카피 (copy-hierarchy.md v2)
    // 1단 — Hero (메인 약속): "예약 방문하게 합니다"
    var lang = (T.lang === 'ko') ? 'ko' : 'en';
    var heroCopy = (lang === 'ko')
      ? '우리의 콘텐츠는 당신의 호텔을 <em>예약 방문</em>하게 합니다.'
      : 'Our content brings <em>real bookings</em> and guests to your hotel.';
    html += '<h1 class="sl-h1">' + heroCopy + '</h1>';
    // 4단 — How (작동 원리): "8개 채널·6개 언어로 동시 노출"
    var howCopy = (lang === 'ko')
      ? '당신의 호텔을 8개 채널·6개 언어로 동시 노출합니다. 한국 메인 + 해외 글로벌 확장.'
      : 'We expose your hotel across 8 channels and 6 languages. Korea-led, global reach.';
    html += '<p class="sl-sub">' + howCopy + '</p>';
```

#### 변경 2: `renderTrust()` 함수 전체 교체 (라이브 line 462~482)
**BEFORE** (현재 라이브):
```javascript
  function renderTrust() {
    // 3축: Views / Videos / Bookings (memory rule 32 — 구독자 수 어필 금지)
    return ''
      + '<div class="sl-trust">'
      +   '<div class="sl-trust-cell">'
      +     '<div class="sl-trust-num">9M+</div>'
      +     '<div class="sl-trust-lbl">Total Views</div>'
      +     '<div class="sl-trust-sub">Cumulative impressions across channels</div>'
      +   '</div>'
      +   '<div class="sl-trust-cell">'
      +     '<div class="sl-trust-num">3,774</div>'
      +     '<div class="sl-trust-lbl">Videos Produced</div>'
      +     '<div class="sl-trust-sub">Hotel reviews shipped to date</div>'
      +   '</div>'
      +   '<div class="sl-trust-cell">'
      +     '<div class="sl-trust-num">$854K</div>'
      +     '<div class="sl-trust-lbl">Bookings Generated</div>'
      +     '<div class="sl-trust-sub">Verified affiliate revenue</div>'
      +   '</div>'
      + '</div>';
  }
```

**AFTER** (박을 내용 — 2단 Proof, 다국어):
```javascript
  function renderTrust() {
    // [BL-FLOW-2-SALES-COPY-5TIER 2026-05-23]
    // 2단 — Proof: "3,774건 예약 발생 · $854K 호텔 매출 발생"
    // 3단 — Scale: "9백만+ 영상 누적 조회"
    // 메모리 규칙: 구독자 수 어필 금지 / "7년 운영" 표기 금지
    var lang = (T.lang === 'ko') ? 'ko' : 'en';
    var L = {
      ko: {
        bookingsNum: '3,774', bookingsLbl: '예약 발생',     bookingsSub: '제휴 데이터로 검증된 실예약',
        revenueNum:  '$854K',  revenueLbl:  '호텔 매출 발생', revenueSub:  '제휴 데이터로 검증된 매출',
        viewsNum:    '9M+',    viewsLbl:    '누적 조회',     viewsSub:    '8개 채널 합산 영상 노출',
        proofHead:   '🥈 숫자가 말합니다'
      },
      en: {
        bookingsNum: '3,774', bookingsLbl: 'Bookings',        bookingsSub: 'Verified affiliate-confirmed reservations',
        revenueNum:  '$854K',  revenueLbl:  'Hotel revenue',   revenueSub:  'Affiliate-tracked revenue generated',
        viewsNum:    '9M+',    viewsLbl:    'Total views',     viewsSub:    'Cumulative impressions across 8 channels',
        proofHead:   '🥈 The numbers speak'
      }
    };
    var c = L[lang];
    return ''
      + '<div class="sl-tier-head">' + c.proofHead + '</div>'
      + '<div class="sl-trust">'
      +   '<div class="sl-trust-cell">'
      +     '<div class="sl-trust-num">' + c.bookingsNum + '</div>'
      +     '<div class="sl-trust-lbl">' + c.bookingsLbl + '</div>'
      +     '<div class="sl-trust-sub">' + c.bookingsSub + '</div>'
      +   '</div>'
      +   '<div class="sl-trust-cell">'
      +     '<div class="sl-trust-num">' + c.revenueNum + '</div>'
      +     '<div class="sl-trust-lbl">' + c.revenueLbl + '</div>'
      +     '<div class="sl-trust-sub">' + c.revenueSub + '</div>'
      +   '</div>'
      +   '<div class="sl-trust-cell">'
      +     '<div class="sl-trust-num">' + c.viewsNum + '</div>'
      +     '<div class="sl-trust-lbl">' + c.viewsLbl + '</div>'
      +     '<div class="sl-trust-sub">' + c.viewsSub + '</div>'
      +   '</div>'
      + '</div>';
  }
```

#### 변경 3: `renderChannels()` 함수 (라이브 line 484~497)
**BEFORE**:
```javascript
  function renderChannels() {
    var chips = '';
    for (var i = 0; i < CHANNELS.length; i++) {
      var c = CHANNELS[i];
      chips += '<span class="sl-chip"><span class="sl-chip-flag">' + c.flag + '</span>'
            +  '<span>' + c.name + '</span>'
            +  '<span class="sl-chip-lang">' + c.lang + '</span></span>';
    }
    return ''
      + '<div class="sl-channels-wrap">'
      +   '<div class="sl-channels-title">Your hotel goes live across <em>8 channels</em> in <em>6 languages</em></div>'
      +   '<div class="sl-channels">' + chips + '</div>'
      + '</div>';
  }
```

**AFTER** (3단 Scale 다국어):
```javascript
  function renderChannels() {
    var chips = '';
    for (var i = 0; i < CHANNELS.length; i++) {
      var c = CHANNELS[i];
      chips += '<span class="sl-chip"><span class="sl-chip-flag">' + c.flag + '</span>'
            +  '<span>' + c.name + '</span>'
            +  '<span class="sl-chip-lang">' + c.lang + '</span></span>';
    }
    // [BL-FLOW-2-SALES-COPY-5TIER 2026-05-23] 3단 Scale 카피 (8개 채널·6개 언어)
    var lang = (T.lang === 'ko') ? 'ko' : 'en';
    var title = (lang === 'ko')
      ? '당신의 호텔이 <em>8개 채널</em>·<em>6개 언어</em>로 동시 노출됩니다'
      : 'Your hotel goes live across <em>8 channels</em> in <em>6 languages</em>';
    return ''
      + '<div class="sl-channels-wrap">'
      +   '<div class="sl-channels-title">' + title + '</div>'
      +   '<div class="sl-channels">' + chips + '</div>'
      + '</div>';
  }
```

---

## 🆕 아직 안 박은 것 (다음 채팅에서 마저 박을 것)

### A. 5단 Guarantee 카피 + approved 결제 박스 다국어
**위치**: 라이브 sales.html line 639~648 (approved 분기)

**BEFORE**:
```javascript
    } else if (status === 'approved') {
      html += '<div class="sl-pay-card">';
      html += '  <div class="sl-pay-glow"></div>';
      html += '  <h3>Approved — ready to publish</h3>';
      html += '  <p class="sl-pay-tag">Complete the one-time payment to launch your video across all 8 channels in 6 languages.</p>';
      html += '  <div class="sl-pay-amount">$200</div>';
      html += '  <div class="sl-pay-meta"><span>One-time payment</span><span>6-month booking guarantee</span><span>100% refund if zero bookings</span></div>';
      html += '  <div id="paypal-button-container"></div>';
      html += '  <div id="pay-status"></div>';
      html += '</div>';
```

**박을 내용** (5단 Guarantee + Step 3 축하 헤더 + 다국어):
- KO: 헤더 `🎉 가입 완료! 결제하면 즉시 영상 제작 시작합니다`
- KO: 5단 Guarantee 박스 `🎯 6개월 0건이면 100% 환불 — 위탁 영업입니다`
- EN: 헤더 `🎉 You're approved! Pay now to start production`
- EN: 5단 Guarantee `🎯 6-month booking guarantee — 100% refund if zero bookings`

### B. CSS 추가 — `sl-tier-head` + `sl-pay-guarantee` 클래스
**위치**: 라이브 sales.html `<style>` 블록 내 (대략 line 140~245 영역)
**박을 내용**:
```css
/* [BL-FLOW-2-SALES-COPY-5TIER] 5단 카피 위계 헤더 */
.sl-tier-head{
  font-size:13px;color:var(--ink-3);letter-spacing:.02em;
  font-weight:600;margin:24px 0 10px;
}
.sl-pay-guarantee{
  margin-top:14px;padding:12px 16px;
  background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.25);
  border-radius:var(--r);
  font-size:13.5px;color:#34D9A4;font-weight:600;text-align:center;
}
```

### C. 검증 + commit
- `node --check` 인라인 JS 문법
- gohotelwinners.com/sales.html 라이브 확인 (배포 후 2분)
- commit subject: `feat(BL-FLOW-2-SALES-COPY-5TIER): sales.html 5단 카피 박음 [step:done:1][step:done:2][step:done:3][step:done:4][step:done:5]`

### D. tasks.json done 마킹 + chat-log

---

## 📦 진행 순서 (5단계)

| Step | 작업 | 비고 |
|---|---|---|
| 1 | copy-hierarchy.md fetch | ✅ 이전 채팅에서 했음, 다시 fetch만 |
| 2 | sales.html에 1·2·3·4단 카피 박기 (위 변경 1·2·3) | 위 BEFORE/AFTER 그대로 박기 |
| 3 | 5단 Guarantee + Step 3 축하 헤더 + CSS 박기 (변경 A·B) | **신규 작업** |
| 4 | JS 문법 검증 + 라이브 확인 | `node --check` + curl |
| 5 | commit + push + tasks.json done + chat-log | `[step:done:1]~[5]` 태그 |

---

## 🎯 BL-FLOW-2 끝나면 다음

**BL-FLOW-3-DASHBOARD-ROUTING-FIX** (P0, order=2)
- dashboard.html → manager-dashboard.html 라우팅 (결제 후만 진입)
- 인계서: 별도 작성 필요 시 BL-FLOW-2 완료 후 박음

---

## ⚠️ 봇 충돌 주의

- commit subject에 BL ID 박을 때 `[step:done:N]` 누락 시 `auto-detect-bot`이 in_progress 자동 박음
- BL 상태 정정 commit엔 `[status:keep]` 태그 필수
- `tasks.json` 수정 시 stats 재계산 의무 (부칙 11)

---

## 📌 이전 채팅 결정 요약

- **BL-FLOW-1**: Agoda 자동 approved + 중복 호텔 차단 + RPC 함수 완료 (commit `7c27268`)
- **Supabase RPC `check_hotel_duplicate(bigint, text)`**: 라이브 DB에 적용 완료 (수정 불필요)
- **중복 호텔 안내 모달**: 매니저가 "이미 등록된 호텔" 시도 시 호텔명 명시한 alert + toast 띄움
- **dashboard.html `stageGateRedirect`** (D-044): approved → sales.html 자동 라우팅 이미 박혀있음 (BL-FLOW-2/3에서 활용)
