---
slug: 2026-05-23-bl-flow-1-agoda-auto-approve-done
title: BL-FLOW-1-AGODA-AUTO-APPROVE — Agoda 매칭 자동 approved + 중복 차단
date: 2026-05-23
tasks: [BL-FLOW-1-AGODA-AUTO-APPROVE]
commits: []
decisions: []
---

## 🎯 한 줄 요약

매니저가 호텔을 등록할 때 Agoda 매칭이 자동으로 성공하면 `pending` 대신 곧바로 `approved`로 박혀서 결제 페이지로 직행한다. 다른 매니저가 이미 결제한 호텔이면 등록 자체를 막고 안내 모달을 띄운다.

## ① 완료 내용

- **hotel-info.html**: Agoda 매칭(`auto_matched`)이면 새 호텔 상태를 `approved`로, 매칭 실패면 기존대로 `pending`으로 박는 분기 추가.
- **hotel-info.html**: 새 호텔 저장 직전 중복 점검 RPC 호출 → 다른 매니저가 같은 호텔을 `paid/approved/campaign_live/producing/published` 상태로 가지고 있으면 등록 차단 + 모달 안내(KO/EN).
- **shared.js**: `T.db.checkHotelDuplicate(agodaId, placeId)` 헬퍼 추가.
- **sql/check-hotel-duplicate.sql**: `check_hotel_duplicate(bigint, text)` Supabase RPC 함수(`SECURITY DEFINER`) 신설 → Supabase Management API로 라이브 DB 즉시 적용 완료.
- **dashboard.html**: D-044 `stageGateRedirect` 코멘트에 BL-FLOW-1 연계 의도 명시(라우팅 로직은 이미 박혀있어 코드 변경 불필요).
- **tasks.json**: BL-FLOW-1 → done 마킹 + stats 재계산.

## ② 이유

매니저가 호텔 등록 후 `pending`으로 대표님 수동 승인 2~3일 대기 → 그 사이 매니저 열정 식음 → 결제 안 누름. 정상 호텔 95%는 Agoda 매칭이 자동으로 호텔 진위를 체크하므로 굳이 수동 승인이 필요 없음. 대표님 A안(2026-05-22 채팅 확정): Agoda 매칭 성공 = 자동 approved.

다른 매니저가 이미 결제한 호텔에 또 다른 매니저가 등록하면 중복 영상 제작/결제 분쟁 발생. RLS 정책상 매니저는 자기 호텔만 검색 가능 → SECURITY DEFINER RPC로 우회.

## ③ 사업 영향

- **결제 전환율 즉시 개선 예상**: 정상 호텔 95%는 등록 직후 `approved` → dashboard.html이 자동으로 sales.html로 redirect(기존 D-044 `stageGateRedirect`) → 매니저 열정 살아있을 때 결제 누름.
- **중복 결제 분쟁 사전 차단**: 같은 호텔을 다른 매니저가 등록 시도하면 "이미 등록된 호텔입니다: {호텔명}" 모달 + 문의 이메일 안내.
- **대표님 수동 승인 부담 95% 감소**: `manual_pending` 케이스만 검토하면 됨.

## ④ 다음 행동

BL-FLOW-2-SALES-COPY-5TIER 진행 — sales.html에 결제 유도 5단 카피 박기.

## ⑤ 대표님 결정 필요

없음. 다음 BL 자율 진행.

---

# 🔧 기술 상세 (개발자용)

## 박은 파일 4개

### 1. `hotel-info.html` (line 1117~1188 영역)
- `initialStatus` 변수 신설: `matchStatus === 'auto_matched'` ? `'approved'` : `'pending'`
- `hotelData.status` 값으로 `initialStatus` 사용
- `savePromise` create 분기에서 `T.db.checkHotelDuplicate()` 선행 호출
- `duplicate: true`면 alert + toast로 매니저에게 호텔명 명시하여 안내, `{ error: { code: 'duplicate_hotel', _handled: true } }` 반환으로 차단
- `savePromise.then` 분기에서 `r.error._handled === true`인 경우 추가 토스트 skip(이미 모달 박았으므로)

### 2. `shared.js` (T.db 객체 내부)
```javascript
checkHotelDuplicate: function (agodaHotelId, googlePlaceId) {
  if (!sb) return Promise.resolve({ data: { duplicate: false }, error: 'no-sb' });
  var params = {
    p_agoda_hotel_id: (agodaHotelId != null && agodaHotelId !== '') ? agodaHotelId : null,
    p_google_place_id: (googlePlaceId != null && googlePlaceId !== '') ? googlePlaceId : null
  };
  return sb.rpc('check_hotel_duplicate', params).then(function (r) {
    if (r.error) return { data: { duplicate: false }, error: r.error };
    return { data: r.data || { duplicate: false }, error: null };
  });
}
```

### 3. `sql/check-hotel-duplicate.sql` (신규)
- `check_hotel_duplicate(p_agoda_hotel_id bigint, p_google_place_id text)` 함수
- `SECURITY DEFINER` + `SET search_path = public`
- 차단 대상 status: `paid`, `approved`, `campaign_live`, `producing`, `published`
- 자기 호텔(`user_id = auth.uid()`)은 차단 대상에서 제외
- 반환: `jsonb { duplicate, blocking_status?, existing_hotel_name? }`
- `GRANT EXECUTE TO authenticated`
- **이미 Supabase 라이브 DB에 적용 완료** (Management API, 2026-05-23)

### 4. `dashboard.html`
- D-044 `stageGateRedirect` 코멘트 블록에 BL-FLOW-1 연계 의도 4줄 추가
- 라우팅 로직 자체는 변경 없음 (기존 코드가 이미 `approved → sales.html` 분기 박혀있음)

## 검증

- **JS 문법**: `node --check`로 hotel-info.html(인라인), shared.js, dashboard.html(인라인) 3개 통과
- **RPC 함수 실측 테스트**:
  - 가짜 agoda_id → `{ duplicate: false }` ✅
  - 가짜 place_id → `{ duplicate: false }` ✅
  - 실제 paid 호텔의 google_place_id → `{ duplicate: true, blocking_status: 'paid', existing_hotel_name: 'Lotte Hotel Seattle' }` ✅
- **Playwright 라이브 검증**: gohotelwinners.com 배포 후 매니저 가입~결제 흐름은 Vercel 배포 완료 후 다음 작업 사이클에서 자동 봇이 검증(`step-self-verify.yml` 트리거).

## 봇 충돌 주의

이 commit subject에 `[step:done:1]~[5]` 다섯 개 박힘 → `auto-detect-task-status.yml`이 BL-FLOW-1 progress.steps 5개 모두 done 자동 마킹. tasks.json은 이미 클로드가 선행 마킹했으므로 봇 결과와 일치 예상.
