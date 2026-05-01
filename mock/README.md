# Mock — 디자인 시안 보관소

**작성일**: 2026-05-01
**목적**: TW B2B 디자인 시스템 v2 마이그레이션 전 시안 비교군 보존

---

## 시안 4종

| 파일 | 컨셉 | 톤 | 채택 여부 |
|---|---|---|---|
| `concept-c1.html` | C1 Editorial | 클래식 에디토리얼, 라이트 베이스, 세리프 헤딩 | ❌ 미채택 |
| `concept-c2.html` | C2 Premium | 프리미엄 럭셔리, 골드 액센트, 안정감 | ❌ 미채택 |
| `concept-c3.html` | **C3 Aurora Trendy** | **다크 캔버스 + 오로라 그라디언트 + 글래스모피즘** | ✅ **확정** |
| `concept-c4.html` | C4 Bold | 네오브루탈리즘, 강한 대비, 파격적 | ❌ 미채택 |

---

## C3 Aurora Trendy — 채택 사유

대표님 비전: **"글로벌 정복, 새로운 트렌드를 리드. 우리가 곧 유행이고 우리가 곧 트렌드다."**

차별화 포인트:
- 호텔 산업이 본 적 없는 모던함
- Linear · Framer · Vercel · Cursor 톤
- B2B SaaS 글로벌 표준 + 한국 호텔 산업 차별화

---

## 디자인 토큰 (C3 기준 → shared.css v2 마이그레이션 소스)

```css
:root{
  /* Aurora 컬러 6종 */
  --aurora-1:#7C3AED;  /* Purple */
  --aurora-2:#EC4899;  /* Magenta */
  --aurora-3:#06B6D4;  /* Cyan */
  --aurora-4:#22D3EE;  /* Bright Cyan */
  --aurora-5:#F59E0B;  /* Orange */
  --aurora-6:#10B981;  /* Emerald */

  /* 다크 캔버스 */
  --bg:#0A0A0F;
  --bg-2:#13131A;
  --bg-3:#1C1C26;

  /* 글래스 레이어 */
  --glass:rgba(255,255,255,.05);
  --glass-2:rgba(255,255,255,.08);
  --glass-3:rgba(255,255,255,.12);

  /* 텍스트 위계 */
  --ink:#FAFAFA;
  --ink-2:#E5E5EE;
  --ink-3:#A0A0B0;
  --ink-4:#6E6E80;

  /* 시그니처 그라디언트 */
  --aurora:linear-gradient(135deg,#7C3AED 0%,#EC4899 35%,#F59E0B 65%,#06B6D4 100%);

  /* 폰트 */
  --sans:'Inter','SF Pro Text',-apple-system,system-ui,sans-serif;
  --mono:'JetBrains Mono','SF Mono',Menlo,monospace;
}
```

---

## 시그니처 요소

1. **Aurora floating blobs** — 4개의 떠다니는 블롭 (purple, magenta, cyan, orange)
2. **Subtle grid background** — `rgba(255,255,255,.015)` 60×60px 그리드
3. **Glassmorphism cards** — `backdrop-filter:blur(24px)` + 반투명 흰색
4. **Aurora gradient text** — 강조 단어에 그라디언트 적용
5. **Mono font for numbers** — JetBrains Mono로 신뢰감

---

## 활용

- C3은 **shared.css v2의 메인 기준**
- C1/C2/C4는 **참고용** — 추후 특정 페이지에 좋은 요소 차용 가능
  - C1의 에디토리얼 타이포그래피 → 블로그/콘텐츠 페이지에 활용 가능
  - C2의 프리미엄 톤 → 상위 호텔(5성급 등) 전용 카드에 차용 가능
  - C4의 강한 대비 → 프로모션·CTA 섹션에 부분 활용 가능

---

**다음 단계**: `shared.css v2` 작성 → `login.html` 시범 마이그레이션 → 8개 페이지 순차 적용
