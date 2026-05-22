# Claude 사업가 언어 + 갤러리 우선 점검 (부칙 18 디테일)

**신설**: 2026-05-21 (BL-CLAUDE-PLAIN-LANG)
**왜**: Claude가 자기 언어(기술 용어)로 선택지를 박아서 대표님이 "못 알아듣는다"고 지적함. 또한 admin-gallery에 이미 등록된 페이지를 안 보고 dashboard.html을 따로 만들어버려 중복이 생김.

---

## ⓐ 사업가 언어 강제

### 절대 금지 단어 (선택지·결정 요청에서)
- 마이그레이션 → "옮기기"
- 라우팅 → "어디로 보내기"
- 리팩토링 → "코드 다시 정리"
- 단일화 / 통합 / 흡수 → "합치기"
- 핫픽스 / 패치 → "급한 고침"
- 롤백 → "되돌리기"
- 아키텍처 / 인스턴스 / 인터페이스 → 풀어쓰기
- 정석 / 베스트 프랙티스 → "원래 방법"
- 폐기 → "버리기 / 없애기"
- 트랜지션 → "넘어가기"
- 컴포넌트 → "조각"

### 선택지 형식 강제
각 선택지 끝에 `→ 결과: ~` 한 줄로 사업가 결과 표시.

**❌ 나쁨**:
- "A. 페이지 단일화 마이그레이션"
- "B. 라우팅 변경 후 폐기"

**✅ 좋음**:
- "A. dashboard 없애고 manager-dashboard 하나만 쓰기 → 결과: 매니저가 들어오면 진짜 데이터 페이지로 바로 감"
- "B. dashboard 살리고 manager-dashboard 내용을 옮기기 → 결과: 같은 URL이지만 안 내용물이 바뀜"

### 결과 보고도 같은 규칙
"무엇을 했나 / 어디 가서 / 무엇을 누르면 / 무엇이 보이는지" 4줄 — 모든 단어를 일상어로.

---

## ⓑ 갤러리 우선 점검 (필수)

### 새 페이지·새 기능 만들기 전 — 무조건 점검할 곳

1. **`/scripts/pages-meta.mjs`의 PAGES 배열** — 19개 페이지 메타데이터 단일 진실원
2. **`_admin/admin-gallery.html`** — 페이지 일람 + status (live/planned/needs-refactor/retired/partial/new)
3. **`BUSINESS_FLOW.md`** — Stage 0~6 흐름

### 점검 코드 (라이브 fetch, 매 채팅 1회 의무)
```bash
node -e "import('./scripts/pages-meta.mjs').then(m => {
  const byFlow = {};
  m.PAGES.forEach(p => {
    const k = p.flow || 'extra';
    (byFlow[k] = byFlow[k] || []).push(p);
  });
  for (const k of ['stage0','stage1','stage2','stage3','stage4','stage5','stage6','extra','admin-tools','retired']) {
    if (!byFlow[k]) continue;
    console.log('[' + k + ']');
    byFlow[k].forEach(p => console.log('  ' + (p.path||'?').padEnd(36) + p.name + ' (' + p.status + ')'));
  }
});"
```

### status 의미 (이것이 단일 진실)
- `live` → 라이브 정상 작동
- `planned` → 만들어야 함 (없는 페이지)
- `needs-refactor` → 있긴 한데 손봐야 함
- `partial` → 일부만 완성
- `new` → 막 만든 페이지
- `retired` → 버린 페이지 (라우팅 차단됨)

### 위반 사례 — 학습용
**2026-05-21**: Claude가 manager-dashboard.html(Stage 4 매니저 본진, 1964줄)을 모르고 dashboard.html(620줄, 빈 카드만)을 따로 만듦. 결제 완료 매니저가 빈 페이지를 보게 됨. 대표님 "검토를 안 하고 없다고 해서 내가 다시 만들었다" 지적. 갤러리에 manager-dashboard 등록 누락이 원인의 일부였음 — 갤러리 우선 점검이 의무로 박힌 계기.

---

## ⓒ 위반 감지·정정

대표님 한 마디로 정정:
- **"헌법 확인"** → Claude 즉시 정지, 자가 진단 ("내가 어디서 일상어 아닌 단어 박았나?", "내가 갤러리 점검 안 했나?")
- **"갤러리 봤어?"** → 갤러리 라이브 fetch 결과 보여주고 다시 시작
- **"못 알아듣겠어"** → 마지막 응답을 일상어로 다시 박음
