/**
 * TW B2B 페이지 메타데이터
 * ────────────────────────────────────────────────────────────────────────────
 * 각 페이지의 시각적 갤러리 표시 / 권한 / 작업 상태를 한 곳에서 관리.
 *
 * 사용처:
 *   1. scripts/capture-pages.mjs    - 자동 스크린샷 캡처
 *   2. admin-gallery.html           - 시각 갤러리 렌더링
 *   3. PAGES.md (자동 생성)          - GitHub README용 페이지 맵
 *
 * 페이지 추가 시:
 *   1. 이 파일에 항목 추가
 *   2. `npm run capture-pages` 실행 (또는 다음 git push 시 자동)
 *   3. admin-gallery.html에서 자동 반영됨
 * ────────────────────────────────────────────────────────────────────────────
 */

export const PAGES = [
  // ─── Public 페이지 (로그인 불필요) ───────────────────────────────────────
  {
    path: '/index.html',
    name: '메인 랜딩',
    purpose: '6언어 채널 + $200 가치 어필, 호텔 매니저 첫 진입점',
    audience: 'public',
    capture: true,
    status: 'live',
    visibleWhen: '항상',
  },
  {
    path: '/signup.html',
    name: '회원가입',
    purpose: '매니저 이메일+비번 가입 → 인증 메일 발송',
    audience: 'public',
    capture: true,
    status: 'live',
    visibleWhen: '비로그인',
  },
  {
    path: '/login.html',
    name: '로그인',
    purpose: '매니저/관리자 통합 로그인. role에 따라 다른 페이지로 redirect',
    audience: 'public',
    capture: true,
    status: 'live',
    visibleWhen: '비로그인',
  },
  {
    path: '/forgot-password.html',
    name: '비밀번호 찾기',
    purpose: '비밀번호 재설정 링크 메일 요청',
    audience: 'public',
    capture: true,
    status: 'live',
    visibleWhen: '비로그인',
  },
  {
    path: '/reset-password.html',
    name: '비밀번호 재설정',
    purpose: '메일 링크 클릭 후 새 비밀번호 입력',
    audience: 'public',
    capture: true,
    status: 'live',
    visibleWhen: '재설정 링크 클릭 시',
  },
  {
    path: '/verify-email.html',
    name: '이메일 인증',
    purpose: '가입 후 이메일 인증 링크 클릭 시 도착',
    audience: 'public',
    capture: true,
    status: 'live',
    visibleWhen: '인증 메일 링크 클릭 시',
  },

  // ─── 매니저 페이지 (로그인 필요, manager role) ──────────────────────────
  {
    path: '/dashboard.html',
    name: '매니저 대시보드',
    purpose: '진행 단계 + 호텔 정보 + 결제 상태 + 결제 박스(임시)',
    audience: 'manager',
    capture: true,
    status: 'needs-refactor',
    visibleWhen: '매니저 로그인 후',
    notes: '결제 박스 분리 필요 → sales.html(결제 전) + marketing.html(결제 후)로 이전 예정',
  },
  {
    path: '/hotel-info.html',
    name: '호텔 정보 등록/수정',
    purpose: '호텔 검색 (Google Places) + 자동 채움 + Agoda 매칭',
    audience: 'manager',
    capture: true,
    status: 'live',
    visibleWhen: 'status=pending 또는 Edit Hotel Info 클릭 시',
  },
  {
    path: '/settings.html',
    name: '계정 설정',
    purpose: '비밀번호 변경, 이메일 변경(예정), 회원 탈퇴(예정)',
    audience: 'manager',
    capture: true,
    status: 'partial',
    visibleWhen: '매니저 로그인 후',
    notes: '이메일 변경/탈퇴는 Phase 3 D단계',
  },

  // ─── 관리자 페이지 (admin role) ─────────────────────────────────────────
  {
    path: '/admin.html',
    name: '관리자 콘솔',
    purpose: '호텔 승인/거절, 매니저 관리, Agoda 매칭, Bookings, Analytics',
    audience: 'admin',
    capture: true,
    status: 'live',
    visibleWhen: 'admin role 로그인 후',
  },
  {
    path: '/booking-analytics.html',
    name: '예약 분석',
    purpose: '도시별/국가별 예약 통계, 매출 추이',
    audience: 'admin',
    capture: true,
    status: 'live',
    visibleWhen: 'admin > Analytics 메뉴',
  },
  {
    path: '/admin-gallery.html',
    name: '페이지 갤러리',
    purpose: '모든 페이지 시각적 한눈 보기 + BEFORE/AFTER 비교',
    audience: 'admin',
    capture: true,
    status: 'live',
    visibleWhen: 'admin > Tools > Page Gallery',
    notes: '2026-04-29 신설',
  },
  {
    path: '/admin-business.html',
    name: '비즈니스 문서 뷰어',
    purpose: 'BUSINESS / DECISIONS / FLOW / BACKLOG 문서를 시각적으로 보기',
    audience: 'admin',
    capture: true,
    status: 'new',
    visibleWhen: 'admin > Tools > Business Docs',
    notes: '2026-04-29 신설 — 대표님이 비개발자로서 사업 정책을 직접 보고 변경 결정할 수 있게',
  },

  // ─── BACKLOG: 만들 예정인 페이지 ─────────────────────────────────────────
  {
    path: '/sales.html',
    name: '세일즈 페이지 (결제 유도)',
    purpose: '왜 $200을 투자해야 하는가 — 6언어 채널/1회 투자/영구 노출 가치 어필 + 결제 CTA',
    audience: 'manager',
    capture: false,
    status: 'planned',
    visibleWhen: 'status=approved (결제 전 매니저)',
    notes: 'BACKLOG P0 — 호텔 승인 후 dashboard 대신 이 페이지가 보여야 함',
  },
  {
    path: '/marketing.html',
    name: '매니저 성과 페이지',
    purpose: '영상 제작 진행 / 채널 노출 통계 / 인보이스 다운로드',
    audience: 'manager',
    capture: false,
    status: 'planned',
    visibleWhen: 'status=paid 또는 producing 또는 published',
    notes: 'BACKLOG P0 — 결제 완료 후 매니저가 한눈에 가치 확인할 수 있는 페이지',
  },
];

export const STATUS_BADGES = {
  'live':            { label: '🟢 라이브',      color: '#16a34a' },
  'partial':         { label: '🟡 부분 완성',    color: '#ca8a04' },
  'needs-refactor':  { label: '🟠 리팩터 필요',  color: '#ea580c' },
  'new':             { label: '🔵 신설',        color: '#2563eb' },
  'planned':         { label: '⚪ 예정',         color: '#6b7280' },
  'archived':        { label: '⚫ 보관',         color: '#374151' },
};

export const AUDIENCE_BADGES = {
  'public':  { label: '🌐 공개',     color: '#06b6d4' },
  'manager': { label: '🔐 매니저',   color: '#8b5cf6' },
  'admin':   { label: '👑 관리자',   color: '#dc2626' },
};
