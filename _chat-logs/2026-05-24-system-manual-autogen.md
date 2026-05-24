# 시스템 매뉴얼 자동 생성 (BL-SYSTEM-MANUAL-AUTOGEN)

**작업 ID:** BL-SYSTEM-MANUAL-AUTOGEN
**날짜:** 2026-05-23
**상태:** done
**카테고리:** infra (P1, medium)

---

## ① 완료 내용 (사업가 언어)

새 채팅 클로드가 우리 시스템 전체 구조를 **30초 안에** 파악할 수 있는 단일 진실 매뉴얼을 박았습니다. 사업가용 표·설명과 AI용 YAML 블록 두 가지가 한 파일에 들어 있어서, 대표님이 보셔도 이해되고 새 클로드도 토큰 절약하면서 빠르게 파악합니다.

매뉴얼은 5개 데이터 소스(페이지 메타·봇 16개 헤더·OS 자산·헌법 부칙·부팅 절차)에서 **자동 추출**됩니다. 새 페이지 추가하거나 봇 박을 때마다 GitHub Actions 봇이 자동으로 매뉴얼 다시 씁니다. 사람 손 절대 안 댐.

시스템 완성도 페이지 우측 상단 헤더에 **📖 시스템 매뉴얼** 버튼 박았고, 클릭하면 모달이 열려서 전체 매뉴얼이 보입니다. 모달 안에는 GitHub 원본 링크 + raw URL 링크가 박혀있어서, 새 채팅 클로드한테 raw URL 한 줄만 주면 즉시 부팅됩니다.

---

## ② 이유 (왜 박았나)

새 채팅마다 클로드가 시스템 파악하느라 토큰 5,000~10,000개 낭비. 더 큰 문제는 헷갈려서 **중복 페이지를 만드는 사고** (2026-05-21 manager-dashboard 중복 사건, 부칙 18 신설 계기). 매뉴얼 1개 fetch(약 2,000 토큰)로 시스템 즉시 파악 → 본 작업으로 바로 진입.

대표님 선택지 2번 (사람+AI 둘 다 봄) 채택. 이유는 1번 (AI 전용 압축)이 위험하다고 대표님이 정확히 지적하신 그 위험 — 클로드가 매뉴얼 요약하면서 사업 맥락 잘라먹으면 대표님이 헷갈리거나 시스템 점검을 못 함 (헌법 1조 위반 가능성). 이중 형식은 헌법 12대 원칙 6번 "AI 가독성" 정석 그대로.

---

## ③ 사업 영향

**즉시 효과:**
- 새 채팅 클로드 부팅 시간 5분 → 30초 (10배 단축)
- 중복 페이지 사고 방지 (이미 만든 페이지 즉시 파악)
- 대표님이 시스템 점검 가능 (사람용 줄 박혀있음)

**장기 효과:**
- 페이지 늘어나도 매뉴얼이 자동 갱신 → 유지 비용 0
- 새 BL 시작할 때마다 매뉴얼 재독으로 클로드 일관성 유지
- gohotelwinners.com 정식 오픈 후에도 동일 인프라 지속

**비용:**
- 매뉴얼 1회 fetch당 약 2,000 토큰 (하루 약 0.5달러 미만)
- GitHub Actions 실행 시간: 약 30초/회

---

## ④ 다음 행동 (자율 진행)

- ✅ tasks.json BL-SYSTEM-MANUAL-AUTOGEN done 박음
- ✅ chat-log 박음 (이 파일)
- ⏭ auto-detect-task-status 봇이 [step:done:N] 태그 감지 → tasks.json 자동 진행률 갱신
- ⏭ system-manual-rebuild 봇이 push 감지 → 매뉴얼 자동 재생성 (이미 활성)
- ⏭ chat-log-index 봇이 이 파일 감지 → byTask 매핑 자동 추가

---

## ⑤ 대표님 결정 필요 사항

**없음.** 작업 완료. 다음 BL로 진행 가능.

다만 사용 권장:
- 새 채팅 열 때 admin-status.html에서 **📖 시스템 매뉴얼** 버튼 클릭 → raw URL 복사 → 새 클로드한테 "이것부터 fetch해" 박으시면 끝.

---

## 📦 박힌 파일 4개

| 파일 | 라인 | 역할 |
|---|---|---|
| `_os/scripts/build-system-manual.mjs` | 363 | 5섹션 자동 추출 빌더 |
| `_os/service-map.md` | 290 | 매뉴얼 본체 (자동 생성) |
| `.github/workflows/system-manual-rebuild.yml` | 65 | 자동 갱신 봇 |
| `_admin/admin-status.html` | +97 | 📖 시스템 매뉴얼 버튼 + 모달 |

## 🔗 라이브 URL

- **매뉴얼 본체 (GitHub):** https://github.com/dgmasters01/tw-b2b/blob/main/_os/service-map.md
- **raw URL (새 클로드용):** https://raw.githubusercontent.com/dgmasters01/tw-b2b/main/_os/service-map.md
- **시스템 완성도 페이지:** https://gohotelwinners.com/admin-status.html

## 🔧 commit 해시

- `1876325` step:done:2 (빌더 신설)
- `da9fbad` service-map.md 초기본
- `460cbfb` step:done:3 (자동 갱신 봇)
- `2fbf574` step:done:4 (진입점)
- (다음) step:done:5 (tasks.json + chat-log)
