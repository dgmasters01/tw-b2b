🚨🚨🚨 새 클로드 — 작업 시작 전 절대 의무 (위반 시 헌법 부칙 16 위반) 🚨🚨🚨

【의무 1】 첫 응답 5줄 양식 강제 (헌법 부칙 16):
  ① [작업 소요: 약 X분 / N단계 / 변경 파일: ...]
  ② 🚦 ✅ 이 채팅 진행 가능 (또는 ⚠️ 새 채팅 권장)
  ③ 📚 fetch 완료: boot.md / [작업파일] / 라이브 상태
  ④ 🧭 북극성: [사용자 문제 한 줄] + 🎯 한 채팅 한 결정: [본질 결정 한 줄]
  ⑤ 🔍 중복 점검 grep 결과 한 줄

【의무 2】 라이브 fetch 의무 — 인계서만 믿지 말 것 (3단계 강제):
  ✅ 1단계 헌법 3종 라이브 fetch (전체 — 요약본·기억 의존 금지):
       • OPERATIONS_CHARTER.md (헌법 본문)
       • CLAUDE.md (행동 매뉴얼)
       • _os/playbook/claude-discipline.md (부칙 16 디테일)
  ✅ 2단계 _os/boot.md 1개 fetch (라이브)
  ✅ 3단계 작업 대상 파일 GitHub 라이브 fetch (이 인계서는 시각상 과거)
  ✅ 변경 영역 grep으로 중복 점검

【의무 3】 절대 금지 행동:
  ❌ "MCP 없어서 못 합니다" → bash 환경에서 PAT으로 git clone 가능
  ❌ "토큰 폐기하세요" → 개발기간 평문 노출 정상 (부칙 4)
  ❌ "어느 방식 원하세요? A/B/C" → 개발 순서·기술 선택은 클로드 자율 (부칙 16)
  ❌ 결과를 클로드 언어로 보고 → 초등학생 언어 + "어디/무엇/어떻게" 4줄 강제

【의무 4】 묻는 것 — 정확히 4가지뿐:
  ✅ 비즈니스 방향 (가격, 정책, 사업 모델)
  ✅ 서비스 방향 (사용자 경험, 카피, 톤)
  ✅ 전체 틀 변화 (페이지 추가/삭제, 메뉴 구조)
  ✅ 디자인 큰 방향 (반드시 이미지 첨부 후 묻기)

【의무 5】 단계 1개 = commit 1개 (헌법 부칙 7):
  commit subject에 [step:done:N] 태그

──────── 위 헤더는 모든 인계서 자동 prepend (BL-CLAUDE-DISCIPLINE, D-023) ────────
──────── 아래는 작업 컨텍스트 ────────

# 🔄 인계서 — BL-MGR-DASHBOARD-V1 stage 3 이어가기 (Step 4 → Step 7)

**발행**: 2026-05-18
**이전 채팅 완료**: stage 3 Step 1·2·3 + Step 4 HTML 골격 (JS 미완)
**다음 작업**: stage 3 Step 4 마무리 → Step 5·6·7

---

## 📍 현재 위치 (라이브 GitHub 기준)

```
BL-MGR-DASHBOARD-V1 stage 3
├── ✅ Step 1: Supabase VIEW 7종 박기 (commit 47201c4)
├── ✅ Step 2: 골격 + 탭 1 홈 (commit 9d19154)
├── ✅ Step 3: 탭 2 영상 (commit d9d29ee)
├── 🟡 Step 4: 탭 3 결제 — HTML 골격만 박힘 (commit 928bfab, wip:4)
│              → CSS·JS 미완 → 이 채팅에서 마무리
├── ⏳ Step 5: 탭 4 문의
├── ⏳ Step 6: 탭 5 고객 분석
└── ⏳ Step 7: 라이브 검증 + ops 알림
```

**최신 라이브 commit**: `928bfab` (또는 그 이후 auto-bot commit)
**라이브 도메인**: gohotelwinners.com/manager-dashboard.html (Vercel 자동 배포)

---

## ✅ 이전 채팅에서 박힌 것 (회수 의무)

### 1. Supabase VIEW 7종 (Step 1, commit 47201c4)
- `sql/v_manager_dashboard.sql` 신설 + Supabase 라이브 적용 완료
- VIEW 목록:
  - `v_manager_hotels` — 매니저별 호텔 카드
  - `v_manager_video_summary` — 8채널 영상 요약
  - `v_manager_booking_stats` — KPI 4카드 (총예약/확정매출/총박야/노쇼)
  - `v_manager_payments` — 결제 카드 (1차/2차 분리 + 보장기한)
  - `v_manager_country_distribution` — 국가별 분포 (KR/JP/US/TW 단독)
  - `v_manager_monthly_trend` — 최근 6개월 추이
  - `v_manager_recent_bookings` — 예약 명세 7컬럼 (국가, 기기 폐기)

### 2. manager-dashboard.html (Step 2·3·4-wip, commit 928bfab)
- Aurora Trendy 디자인 (shared.css v2 + `.md-*` 네임스페이스)
- 토픽바: 로고 / EN·한 토글 / 알림벨 / 매니저명 / 메뉴
- 5탭 네비게이션: 🏠 홈 / 🎬 영상 / 📝 결제 / 💬 문의 / 📊 고객 분석
- **탭 1 홈 완성**: 호텔카드 / 진행 파이프라인 / 6개월 보장 / KPI 4 / 채널 위계 v3 / 최근 7일 활동
- **탭 2 영상 완성**: 본편 카드 / 8채널 표(LIVE/SCHEDULED/PENDING) / 추가 노출 0편 시 섹션 숨김
- **탭 3 결제 HTML만**: 계약 요약 / 환불 보장 배너 / 7컬럼 예약표 — **CSS·JS 미완**
- 탭 4·5 placeholder
- Supabase: `window.TW.sb` (shared.js 글로벌 client) 활용
- i18n: EN 기본 + `data-en`/`data-ko` 패턴

---

## 🎯 의무 라이브 fetch (시작 전 필수)

### 헌법 3종 + 부팅
```
1. _os/boot.md
2. OPERATIONS_CHARTER.md (200줄)
3. CLAUDE.md (149줄)
4. _os/playbook/claude-discipline.md
```

### BL-MGR-DASHBOARD-V1 박힌 결정 5종 (정책 문서)
```
5. docs/design/BL-MGR-DASHBOARD-V1/decisions-summary.md (v2)
6. docs/design/BL-MGR-DASHBOARD-V1/copy-hierarchy.md (v2)
7. docs/design/BL-MGR-DASHBOARD-V1/channel-hierarchy.md (v3)
8. docs/design/BL-MGR-DASHBOARD-V1/policy-extra-exposure.md
9. docs/design/BL-MGR-DASHBOARD-V1/policy-contract.md
10. docs/design/BL-MGR-DASHBOARD-V1/policy-info-edit.md
```

### 와이어프레임 SVG (남은 탭 3·4·5 시각 참조)
```
11. docs/design/BL-MGR-DASHBOARD-V1/wireframes/tab-3-payment-v2.svg
12. docs/design/BL-MGR-DASHBOARD-V1/wireframes/tab-4-inquiry-v2.svg
13. docs/design/BL-MGR-DASHBOARD-V1/wireframes/tab-5-analytics-v2.svg
```

### 작업 대상 파일 (라이브 fetch 의무)
```
14. manager-dashboard.html ← 탭 3 HTML 골격까지 박혀있음, 이어서 박을 것
15. sql/v_manager_dashboard.sql ← Step 1에서 박은 VIEW (이미 라이브 적용 완료)
```

---

## 🛠️ 이 채팅 작업 순서 (4단계 — Step 4 마무리 + Step 5·6·7)

### Step 4 마무리 — 탭 3 결제 CSS + JS

**박힌 HTML 회수**:
- `#paymentCardsList` 컨테이너 (결제 카드 1차/2차 들어갈 자리)
- `.md-refund-banner` 6개월 보장 배너 (CSS 아직 안 박음)
- `#bookingTableBody` 7컬럼 표 본문 (예약번호·예약일·체크인·체크아웃·국가·금액·상태)
- `#bookingSummary` 요약 라벨 (총 N건 · 노쇼 X건 포함 · 취소 Y건 별도)
- `#bookingLoadMore` 더 보기 버튼

**박을 CSS**:
```css
.md-refund-banner{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;
  background:rgba(124,58,237,.10);border:1px solid rgba(124,58,237,.28);
  border-radius:var(--r-lg);margin:14px 0 18px}
.md-refund-icon{font-size:22px;flex-shrink:0}
.md-refund-body{flex:1}
.md-refund-title{font-size:13px;font-weight:700;color:var(--ink);margin-bottom:3px}
.md-refund-text{font-size:12.5px;color:var(--ink-2);line-height:1.5}
/* 결제 카드 */
.md-pay-card{background:linear-gradient(135deg,rgba(124,58,237,.16),rgba(6,182,212,.14));
  border:1px solid var(--line-2);border-radius:var(--r-lg);padding:22px;
  margin-bottom:14px;backdrop-filter:blur(24px);position:relative;overflow:hidden}
.md-pay-card.pending{background:var(--glass);border-style:dashed}
.md-pay-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.md-pay-rank{font-size:15px;font-weight:700;font-family:var(--display)}
.md-pay-status{padding:4px 10px;border-radius:99px;font-size:11px;font-weight:600;font-family:var(--mono)}
.md-pay-btns{display:flex;gap:8px;margin-bottom:16px}
.md-pay-meta-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;
  padding-top:14px;border-top:1px solid var(--line)}
.md-pay-meta-label{font-size:11px;color:var(--ink-4);text-transform:uppercase;
  letter-spacing:.06em;font-family:var(--mono);margin-bottom:4px}
.md-pay-meta-value{font-size:14px;font-weight:600;color:var(--ink);font-family:var(--mono)}
.md-pay-meta-sub{font-size:11px;color:var(--ink-3);margin-top:2px}
```

**박을 JS — `loadPaymentsTab()`**:
```javascript
async function loadPaymentsTab(){
  window.__paymentsLoaded = true;
  if (!currentHotel) return;

  // 결제 카드 fetch (v_manager_payments)
  const { data: payments } = await supabase
    .from('v_manager_payments')
    .select('*')
    .eq('hotel_id', currentHotel.hotel_id)
    .order('payment_order');

  renderPaymentCards(payments || []);

  // 예약 명세 fetch (v_manager_recent_bookings, 5건 우선)
  const { data: bookings, count } = await supabase
    .from('v_manager_recent_bookings')
    .select('*', { count: 'exact' })
    .eq('hotel_id', currentHotel.hotel_id)
    .order('booked_date', { ascending: false })
    .limit(5);

  window.__bookingsLoaded = bookings || [];
  window.__bookingsTotal = count || 0;
  renderBookingTable(window.__bookingsLoaded);
  updateBookingSummary();
}

function renderPaymentCards(payments){
  const wrap = document.getElementById('paymentCardsList');
  if (!payments.length) {
    wrap.innerHTML = `<div class="md-card"><div class="md-empty">
      <div class="md-empty-icon">📝</div>
      <div class="md-empty-msg">${currentLang === 'ko' ? '결제 내역이 없습니다' : 'No payments yet'}</div>
    </div></div>`;
    return;
  }
  wrap.innerHTML = payments.map((p, i) => {
    const isCompleted = ['paid','completed','succeeded'].includes((p.payment_status||'').toLowerCase());
    const rankLabel = currentLang === 'ko'
      ? `${p.payment_order}차 계약`
      : `Contract #${p.payment_order}`;
    const statusBadge = isCompleted
      ? `<span class="md-pay-status md-badge-live">${currentLang === 'ko' ? '운영 중' : 'ACTIVE'}</span>`
      : `<span class="md-pay-status md-badge-sched">${currentLang === 'ko' ? '대기' : 'PENDING'}</span>`;
    // 인보이스/영수증/계약서 3버튼 (정책: 계약서는 결제 완료 카드에만)
    const invoiceBtn = `<button class="md-video-btn" onclick="downloadDoc('invoice','${p.payment_id}')">📄 ${currentLang === 'ko' ? '인보이스' : 'Invoice'}</button>`;
    const receiptBtn = p.receipt_url
      ? `<a href="${p.receipt_url}" target="_blank" class="md-video-btn">🧾 ${currentLang === 'ko' ? '영수증' : 'Receipt'}</a>`
      : `<button class="md-video-btn" onclick="downloadDoc('receipt','${p.payment_id}')">🧾 ${currentLang === 'ko' ? '영수증' : 'Receipt'}</button>`;
    const contractBtn = isCompleted
      ? `<button class="md-video-btn" onclick="downloadDoc('contract','${p.payment_id}')">📋 ${currentLang === 'ko' ? '계약서' : 'Contract'}</button>`
      : '';
    return `
      <div class="md-pay-card ${isCompleted ? '' : 'pending'}">
        <div class="md-pay-head">
          <div class="md-pay-rank">${rankLabel}</div>
          ${statusBadge}
        </div>
        <div class="md-pay-btns">${invoiceBtn}${receiptBtn}${contractBtn}</div>
        <div class="md-pay-meta-row">
          <div>
            <div class="md-pay-meta-label">${currentLang === 'ko' ? '선결제일' : 'Paid'}</div>
            <div class="md-pay-meta-value">${fmtDate(p.paid_at)}</div>
            <div class="md-pay-meta-sub">${fmtMoney(p.amount)} · ${p.method || 'PayPal'}</div>
          </div>
          <div>
            <div class="md-pay-meta-label">${currentLang === 'ko' ? '노출 시작' : 'Live from'}</div>
            <div class="md-pay-meta-value">${fmtDate(p.paid_at)}</div>
            <div class="md-pay-meta-sub">${currentLang === 'ko' ? '실제 게시일' : 'actual publish date'}</div>
          </div>
          <div>
            <div class="md-pay-meta-label">${currentLang === 'ko' ? '보장 기한' : 'Guarantee Until'}</div>
            <div class="md-pay-meta-value">${fmtDate(p.guarantee_end_at)}</div>
            <div class="md-pay-meta-sub">${isCompleted ? `D-${Math.max(0, daysDiff(new Date(), p.guarantee_end_at))}` : (currentLang === 'ko' ? '자동 시작' : 'auto start')}</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderBookingTable(bookings){
  const tbody = document.getElementById('bookingTableBody');
  if (!bookings.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--ink-3)">
      ${currentLang === 'ko' ? '예약 내역 없음' : 'No bookings yet'}</td></tr>`;
    return;
  }
  const flag = { KR:'🇰🇷', JP:'🇯🇵', US:'🇺🇸', TW:'🇹🇼', OTHER:'🌍' };
  const statusLabel = (b) => {
    if (b.is_cancelled) return currentLang === 'ko' ? '취소' : 'Cancelled';
    if (b.booking_status === 'no_show') return currentLang === 'ko' ? '노쇼' : 'No-show';
    if (b.is_completed) return currentLang === 'ko' ? '체크아웃 완료' : 'Checked out';
    return currentLang === 'ko' ? '예약 확정' : 'Confirmed';
  };
  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td class="ch-name">${b.booking_no}</td>
      <td>${fmtShortDate(b.booked_date)}</td>
      <td>${fmtShortDate(b.checkin_date)}</td>
      <td>${fmtShortDate(b.checkout_date)}</td>
      <td>${flag[b.guest_country] || '🌍'} ${b.guest_country}</td>
      <td>${fmtMoney(b.booking_amount_usd)}</td>
      <td>${statusLabel(b)}</td>
    </tr>`).join('');
  // 더 보기 버튼 표시 여부
  const loadMore = document.getElementById('bookingLoadMore');
  loadMore.style.display = (window.__bookingsTotal > bookings.length) ? 'block' : 'none';
}

function updateBookingSummary(){
  // KPI에서 이미 fetch한 stats 재사용 가능하지만, 별도 query로 정확히
  const total = window.__bookingsTotal;
  document.getElementById('bookingSummary').textContent = currentLang === 'ko'
    ? `이번 계약 기간 예약 ${total}건`
    : `${total} bookings this period`;
}

async function loadMoreBookings(){
  const { data: more } = await supabase
    .from('v_manager_recent_bookings')
    .select('*')
    .eq('hotel_id', currentHotel.hotel_id)
    .order('booked_date', { ascending: false })
    .range(window.__bookingsLoaded.length, window.__bookingsLoaded.length + 9);
  if (more && more.length) {
    window.__bookingsLoaded = window.__bookingsLoaded.concat(more);
    renderBookingTable(window.__bookingsLoaded);
  }
}

function exportBookings(format){
  if (format === 'csv') {
    const rows = window.__bookingsLoaded || [];
    const header = ['booking_no','booked_date','checkin','checkout','country','amount_usd','status'];
    const csv = [header.join(',')].concat(rows.map(b => [
      b.booking_no, b.booked_date, b.checkin_date, b.checkout_date,
      b.guest_country, b.booking_amount_usd,
      b.is_cancelled ? 'cancelled' : b.booking_status
    ].join(','))).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bookings_${currentHotel.hotel_id}_${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }
}

// Stub for invoice/receipt/contract download (Step 후속 BL에서 PDF 생성 API 연결)
function downloadDoc(type, paymentId){
  alert(currentLang === 'ko'
    ? `${type === 'invoice' ? '인보이스' : type === 'receipt' ? '영수증' : '계약서'} PDF 다운로드 (구현 예정 — BL-DOC-PDF-GEN)`
    : `${type} PDF download (coming soon — BL-DOC-PDF-GEN)`);
}
```

→ Step 4 commit: `feat(BL-MGR-DASHBOARD-V1): 탭 3 결제 마무리 [step:done:4]`

---

### Step 5 — 탭 4 문의

**와이어프레임 회수**: `tab-4-inquiry-v2.svg`

**박을 것**:
1. 담당자 카드: `gohotelwinners Customer Success` + 🎧 헤드셋 아바타 + "평균 4시간 이내 답변 · 한국어, English"
2. **FAQ 5개 접힘식 박스** (상단):
   - Q1. 영상 게시 일정은 어떻게 정해지나요?
   - Q2. 호텔 정보(사진·설명)를 추가/변경하고 싶어요
   - Q3. 예약은 어떻게 집계되나요? (8채널 통합?)
   - Q4. 6개월 보장 기한 후에는 어떻게 되나요?
   - Q5. 계약을 갱신하거나 종료하려면?
3. 검색바 + 필터 5개 (전체 / 답변 대기 / 답변 완료 / 내가 보낸 / 정보 변경 신청)
4. 페이지네이션 10건 (6건 미만이면 자동 숨김)
5. 새 문의 작성 버튼

**주의**: `inquiries` 테이블이 Supabase에 아직 없음 → UI만 박고 데이터는 빈 배열로 시작. 별도 BL-INQUIRY-SCHEMA로 처리 예정.

→ commit `[step:done:5]`

---

### Step 6 — 탭 5 고객 분석

**와이어프레임 회수**: `tab-5-analytics-v2.svg`

**박을 것**:
1. **KPI 4카드**: 총 예약 / 확정 매출 / 총 박야 / **노쇼 매출** (정책: 0건일 때 회색 "없음" 정직 표시)
2. **국가별 분포 차트** (4개국: 🇰🇷 KR · 🇯🇵 JP · 🇺🇸 US · 🇹🇼 TW) — `v_manager_country_distribution`
3. **월별 추이 차트 6개월** — `v_manager_monthly_trend`
4. 예약 흐름: 영상 노출 → Agoda 진입 → 예약 완료 → 체크인 (퍼널)
5. **"곧 추가될 분석" 섹션** (V1.1 예고):
   - ADR (평균 객단가)
   - 인기 요일·시즌
   - 채널별 조회수 추이
6. CSV 내보내기 버튼

**금지**:
- ❌ 본편/추가 분리 표시 (통합)
- ❌ 채널 박스 2개(한국/해외) — 삭제됨
- ❌ HK·CN 행 (대만 TW만)

→ commit `[step:done:6]`

---

### Step 7 — 라이브 검증 + ops 알림 + 인계 박제

1. Vercel preview URL 확인 (gohotelwinners.com/manager-dashboard.html)
2. 라이브 fetch로 5탭 모두 작동 검증
3. Before/After 스크린샷 (Step 4·5·6 각각)
4. `tasks.json` 갱신: BL-MGR-DASHBOARD-V1 stage 3 done, current_stage = 4
5. ops 알림 POST:
   ```
   POST https://gohotelwinners.com/api/email/ops/notify-claude-work
   Header: x-ops-token: sV1IWuvgBYcn94lQZXBjFLjgdsh3lrBK
   Body: {step:"stage-3-complete", summary, checklist[], vercel_url, blockers, commit_hash}
   ```
6. stage 4 인계서 박기 (라이브 검증 단계로 넘기는 것)

→ commit `[step:done:7]`

---

## ⚠️ 절대 위반 금지 (이전 채팅에서 확정된 정책)

### 정책 1: 매니저 대시보드 = 영업 멘트 제거
- ❌ "예약 방문하게 합니다" / "지금 노출 중" 류 자랑형
- ✅ "Hotel Manager Dashboard" / 운영 정보형 부제만

### 정책 2: 世界就是家 타겟 = 🇹🇼 대만 단독
- ❌ TW·HK·CN 표기 금지
- ✅ "🇹🇼 대만" / "🇹🇼 TW (대만)"만

### 정책 3: 추가 노출 = 0편 기본
- 0편일 때 영상 탭 "추가 노출" 섹션 자체 숨김 ✅ Step 3에서 박힘

### 정책 4: 결제 탭 = 3버튼 (인보이스/영수증/계약서)
- 계약서 = 옵션 C (약관 체크박스 + PDF 자동 발행)
- 계약서 버튼은 **결제 완료 카드에만** 표시 (대기 카드 X)

### 정책 5: 예약표 컬럼 = 7개 (국가 포함, 기기 X)
- 예약번호 / 예약일 / 체크인 / 체크아웃 / **국가** / 금액 / 상태

### 정책 6: 분석 탭 = 본편/추가 통합 + 노쇼 별도 카드
- 채널 박스 2개(한국/해외) 삭제
- 노쇼 매출 카드 별도, 0건일 때 정직 표시
- ADR / 인기 요일 / 채널별 조회수 = V1.1로 미룸

### 정책 7: 문의 탭 = Customer Success + FAQ + 검색/필터
- 담당자 라벨: "gohotelwinners Customer Success" + 🎧 헤드셋 아바타
- FAQ 5개 접힘식 박스 상단
- 검색바 + 필터 5개 + 페이지네이션 10건 (6건 이상 시 자동 노출)

---

## 📦 인프라 정보 (헌법 11조 충전)

- 라이브 도메인: gohotelwinners.com
- GitHub: dgmasters01/tw-b2b (main)
- Supabase: vjsludfjsphwnumuoqaj (VIEW 7종 라이브 적용 완료)
- Vercel Project: prj_KPfzLZaDSaEv6mBdyp3bIpDlPAjY

> 토큰(GitHub PAT · Supabase Mgmt · Vercel · Resend)은 대표님 memory에 박혀있음. 첫 응답에서 boot.md fetch 시 회수.

---

## 🎯 북극성 + 한 채팅 한 결정

**북극성**: 호텔 매니저가 본인 호텔의 영상 노출·예약·매출·고객 분석을 한 화면에서 보고 다음 액션(연장 결제/문의)을 결정할 수 있게 한다

**stage 3 이 채팅 한 결정**: manager-dashboard.html Step 4 마무리 + Step 5·6·7 박아 stage 3 완료

---

## 🚀 새 채팅 시작 명령 (대표님이 붙여넣을 문장)

```
docs/design/BL-MGR-DASHBOARD-V1/handoff-stage-3-continued.md 따라 stage 3 이어서
```

---

**박힘**: 2026-05-18 / **발행자**: 이전 채팅 Claude / **수신자**: 다음 채팅 Claude
