-- =============================================================
-- BL-REFUND-FLOW (D-033) — 환불 신청·승인·이력 테이블
-- 매니저 본인 신청 → admin 환불 탭 등장 → 대표님 확인 → PayPal Refund API
-- 보관: 5년 영구 보관 (회계 의무) — TTL/자동삭제 없음 (절대 DELETE 금지)
-- 적용: Supabase SQL Editor에 이 파일 전체 1회 실행
-- =============================================================

create table if not exists public.refund_requests (
  id                  uuid primary key default gen_random_uuid(),

  -- 대상 결제 (원 결제 추적)
  hotel_id            uuid        references public.hotels(id),
  payment_id          uuid        references public.payments(id),
  paypal_capture_id   text,                         -- PayPal Refund API 호출 키

  -- 신청자 (매니저 본인 신청)
  manager_user_id     uuid,
  manager_email       text        not null,

  -- 환불 내역
  amount              numeric(12,2),                -- 미지정 = 전액 환불
  currency            text        not null default 'USD',
  reason              text,                         -- 매니저가 적은 신청 사유

  -- 상태 머신: pending → approved → refunded  /  pending → rejected  /  approved → failed
  status              text        not null default 'pending'
                      check (status in ('pending','approved','rejected','refunded','failed')),

  -- 대표님 판단 기록 (전수 추적 — 헌법 원칙 4)
  decided_by          text,                         -- 확인/거절한 admin 이메일
  decided_at          timestamptz,
  decision_note       text,                         -- 거절 사유 또는 승인 메모

  -- PayPal Refund API 결과
  paypal_refund_id    text,
  paypal_raw          jsonb,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.refund_requests is
  'BL-REFUND-FLOW(D-033) 환불 신청·승인·이력. 5년 영구 보관(회계 의무) — 행 삭제 금지.';

-- 조회 인덱스: 대기 목록(admin 탭) + 신청자별 + 최신순
create index if not exists idx_refund_requests_status     on public.refund_requests (status);
create index if not exists idx_refund_requests_manager    on public.refund_requests (manager_email);
create index if not exists idx_refund_requests_created    on public.refund_requests (created_at desc);
create index if not exists idx_refund_requests_capture    on public.refund_requests (paypal_capture_id);

-- updated_at 자동 갱신 트리거 (기존 set_updated_at 함수 재사용; 없으면 생성)
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'set_updated_at') then
    create function public.set_updated_at() returns trigger as $fn$
    begin new.updated_at = now(); return new; end;
    $fn$ language plpgsql;
  end if;
end $$;

drop trigger if exists trg_refund_requests_updated on public.refund_requests;
create trigger trg_refund_requests_updated
  before update on public.refund_requests
  for each row execute function public.set_updated_at();

-- =============================================================
-- RLS — 매니저는 본인 신청만 조회/생성, 운영(service_role)은 전체
-- service_role 키는 RLS 우회하므로 admin API(api/admin.js)는 별도 정책 불필요
-- =============================================================
alter table public.refund_requests enable row level security;

-- 매니저: 본인 신청 조회
drop policy if exists rr_select_own on public.refund_requests;
create policy rr_select_own on public.refund_requests
  for select using (auth.uid() = manager_user_id);

-- 매니저: 본인 명의로 신청 생성 (status는 항상 pending로만)
drop policy if exists rr_insert_own on public.refund_requests;
create policy rr_insert_own on public.refund_requests
  for insert with check (auth.uid() = manager_user_id and status = 'pending');

-- 승인/거절/PayPal 처리(상태 변경)는 service_role 전용 → 매니저 update/delete 정책 없음 (차단)
