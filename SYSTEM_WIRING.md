# 🔌 시스템 배선도 — 무엇이 무엇과 연결돼 있나

> ⚙️ **이 문서는 `_os/tools/wiring-scan.mjs` 가 코드에서 자동으로 뽑는다. 손으로 고치지 마라 — 다음 실행에 지워진다.**
> 사람이 쓰는 설명·판단은 `SYSTEM_MAP.md` 에. 이 문서는 **사실 관계**만 담는다.
> 마지막 갱신 2026-07-27 · 화면 25 · 창구 73 · 표 55 · 크론 10

**쓰는 법**: 무엇을 고치기 전에 **여기서 그 이름을 찾는다.** 같이 고쳐야 할 곳이 한눈에 나온다.

---

## 1. 표를 바꾸면 어디를 고쳐야 하나 (역인덱스)

> 🔴 **B2B(gohotelwinners)와 스튜디오는 같은 표를 나눠 쓴다. 한쪽만 고치면 다른 쪽이 깨진다.**

| 표 | 읽는 창구 | 쓰는 창구 | 영향받는 화면 | 도는 봇 |
|---|---|---|---|---|
| `access_logs` | — | **`_lib/admin-log.js`** | — | — |
| `action_logs` | `admin.js` | **`admin.js`** | `admin-manager-hub.html` | — |
| `admin_invitations` | `_lib/admin-auth-handlers.js` | **`_lib/admin-auth-handlers.js`** | — | — |
| `admin_notes` | `admin.js` `delete-account.js` | **`admin.js`** | `admin-manager-hub.html` `settings.html` <br>⚠️ **관리자 + 공개·가입 양쪽** | — |
| `admins` | `_lib/admin-auth-handlers.js` `admin-page.js` `admin.js` `auth.js` `content-queue.js` `decision.js` `delete-account.js` `email/hotel-status-notify.js` `invoice.js` `me-lang.js` | **`_lib/admin-auth-handlers.js`** **`auth.js`** **`me-lang.js`** | `admin-manager-hub.html` `manager-dashboard.html` `sales.html` `settings.html` `studio-keyword-preview.html` `studio.html` <br>⚠️ **관리자 + B2B 호텔 매니저 + 공개·가입 + 스튜디오(콘텐츠 운영) 양쪽** | — |
| `agoda_city` | `agoda-search.js` `content-keywords.js` `kw-survey-now.js` | — | `studio-keyword-preview.html` `studio.html` | — |
| `agoda_inventory` | `content-keywords.js` `cron/hotel-closed-check.js` `cron/hotel-district-fill.js` `hotel-review.js` | — | `studio-keyword-preview.html` `studio.html` | `hotel-closed-check.js` `hotel-district-fill.js` |
| `api_cache` | `_lib/api-cache.js` | **`_lib/api-cache.js`** | — | — |
| `api_usage_monthly` | `_lib/hotel-geo.js` | — | — | — |
| `bookings` | `delete-account.js` | — | `settings.html` | — |
| `bookings_agoda` | `admin.js` `channel-perf-detail.js` `content-hotels.js` `content-performance.js` `content-queue.js` `hotel-bookings.js` `hotel-perf-detail.js` `publications.js` | **`admin.js`** **`cron/booking-health.js`** | `admin-hotel-detail.html` `admin-manager-hub.html` `manager-dashboard.html` `marketing.html` `sales.html` `studio-keyword-preview.html` `studio.html` <br>⚠️ **관리자 + B2B 호텔 매니저 + 공개·가입 + 스튜디오(콘텐츠 운영) 양쪽** | `booking-health.js` |
| `bookings_unified` | `hotel-review.js` | — | `studio.html` | — |
| `channel_cid_map` | `admin.js` `channels.js` `publications.js` | **`channels.js`** | `admin-manager-hub.html` `studio.html` <br>⚠️ **관리자 + 스튜디오(콘텐츠 운영) 양쪽** | — |
| `channels` | `channels.js` `content-keywords.js` | **`channels.js`** | `studio-keyword-preview.html` `studio.html` | — |
| `city_alias` | `content-keywords.js` `cron/kw-survey.js` `kw-survey-now.js` | **`kw-survey-now.js`** | `studio-keyword-preview.html` `studio.html` | `kw-survey.js` |
| `company_info` | `admin.js` `invoice.js` | — | `admin-manager-hub.html` `manager-dashboard.html` `sales.html` <br>⚠️ **관리자 + B2B 호텔 매니저 + 공개·가입 양쪽** | — |
| `content_click_log` | `r.js` | **`r.js`** | — | — |
| `content_clicks` | `content-hotels.js` `content-performance.js` `content-queue.js` `publications.js` `r.js` | — | `studio-keyword-preview.html` `studio.html` | — |
| `content_queue` | `content-keywords.js` `content-queue.js` `publications.js` | **`content-queue.js`** **`publications.js`** | `studio-keyword-preview.html` `studio.html` | — |
| `credit_notes` | `invoice.js` `paypal.js` | **`invoice.js`** **`paypal.js`** | `dashboard.html` `manager-dashboard.html` `sales.html` <br>⚠️ **B2B 호텔 매니저 + 공개·가입 양쪽** | — |
| `drive_review` | `cron/drive-watch.js` `drive-review.js` `drive-status.js` | **`cron/drive-watch.js`** | `studio.html` | `drive-watch.js` |
| `fx_snapshots` | `_lib/fx.js` | **`_lib/fx.js`** | — | — |
| `hotel_communications` | `admin.js` | **`admin.js`** | `admin-manager-hub.html` | — |
| `hotel_not_dup` | `hotel-review.js` | **`hotel-review.js`** | `studio.html` | — |
| `hotel_status_history` | `delete-account.js` | — | `settings.html` | — |
| `hotels` | `_lib/hotel-geo.js` `admin.js` `channel-perf-detail.js` `content-hotels.js` `content-keywords.js` `content-performance.js` `cron/booking-health.js` `cron/hotel-closed-check.js` `cron/hotel-district-fill.js` `delete-account.js` `hotel-bookings.js` `hotel-review.js` `invoice.js` `paypal.js` | **`admin.js`** **`cron/hotel-closed-check.js`** **`cron/hotel-district-fill.js`** **`hotel-review.js`** | `admin-hotel-detail.html` `admin-manager-hub.html` `dashboard.html` `manager-dashboard.html` `marketing.html` `sales.html` `settings.html` `studio-keyword-preview.html` `studio.html` <br>⚠️ **관리자 + B2B 호텔 매니저 + 공개·가입 + 스튜디오(콘텐츠 운영) 양쪽** | `booking-health.js` `hotel-closed-check.js` `hotel-district-fill.js` |
| `invoices` | `invoice.js` `paypal.js` | **`invoice.js`** **`paypal.js`** | `dashboard.html` `manager-dashboard.html` `sales.html` <br>⚠️ **B2B 호텔 매니저 + 공개·가입 양쪽** | — |
| `keyword` | `content-keywords.js` `cron/kw-survey.js` `kw-survey-now.js` | **`kw-survey-now.js`** | `studio-keyword-preview.html` `studio.html` | `kw-survey.js` |
| `manager_campaign_log` | `cron/manager-campaign.js` | **`cron/manager-campaign.js`** | — | — |
| `payment_accounts` | `admin.js` `invoice.js` | — | `admin-manager-hub.html` `manager-dashboard.html` `sales.html` <br>⚠️ **관리자 + B2B 호텔 매니저 + 공개·가입 양쪽** | — |
| `payments` | `admin.js` `delete-account.js` `invoice.js` `paypal.js` | **`admin.js`** **`paypal.js`** | `admin-manager-hub.html` `dashboard.html` `manager-dashboard.html` `sales.html` `settings.html` <br>⚠️ **관리자 + B2B 호텔 매니저 + 공개·가입 양쪽** | — |
| `perf_cache` | `content-performance.js` | **`content-performance.js`** | `studio.html` | — |
| `publications` | `content-hotels.js` `content-performance.js` `content-queue.js` `cron/yt-views.js` `publications.js` | **`cron/yt-views.js`** **`publications.js`** | `studio-keyword-preview.html` `studio.html` | `yt-views.js` |
| `recent_admin_activity` | `_lib/admin-log.js` | — | — | — |
| `refund_requests` | `admin.js` | — | `admin-manager-hub.html` | — |
| `role_change_log` | `_lib/admin-auth-handlers.js` | **`_lib/admin-auth-handlers.js`** | — | — |
| `rpc` | `admin.js` `channel-perf-detail.js` `channels.js` `content-hotels.js` `content-keywords.js` `content-performance.js` `content-queue.js` `cron/kw-survey.js` `drive-review.js` `drive-status.js` `hotel-bookings.js` `hotel-perf-detail.js` `hotel-review.js` `invoice.js` `kw-survey-now.js` `me-lang.js` `paypal.js` `publications.js` `r.js` | **`admin.js`** **`channel-perf-detail.js`** **`channels.js`** **`content-hotels.js`** **`content-keywords.js`** **`content-performance.js`** **`content-queue.js`** **`cron/kw-survey.js`** **`drive-review.js`** **`drive-status.js`** **`hotel-bookings.js`** **`hotel-perf-detail.js`** **`hotel-review.js`** **`invoice.js`** **`kw-survey-now.js`** **`me-lang.js`** **`paypal.js`** **`publications.js`** **`r.js`** | `admin-hotel-detail.html` `admin-manager-hub.html` `dashboard.html` `manager-dashboard.html` `marketing.html` `sales.html` `studio-keyword-preview.html` `studio.html` <br>⚠️ **관리자 + B2B 호텔 매니저 + 공개·가입 + 스튜디오(콘텐츠 운영) 양쪽** | `kw-survey.js` |
| `snapshot` | `content-keywords.js` `cron/kw-survey.js` | **`content-keywords.js`** **`cron/kw-survey.js`** | `studio-keyword-preview.html` `studio.html` | `kw-survey.js` |
| `survey_cache` | `content-keywords.js` | **`content-keywords.js`** | `studio-keyword-preview.html` `studio.html` | — |
| `survey_skip` | `cron/kw-survey.js` | **`kw-survey-now.js`** | `studio-keyword-preview.html` `studio.html` | `kw-survey.js` |
| `trend` | `content-keywords.js` `cron/kw-survey.js` | **`cron/kw-survey.js`** | `studio-keyword-preview.html` `studio.html` | `kw-survey.js` |
| `v_channel_stats` | `content-performance.js` `hotel-perf-detail.js` | — | `studio.html` | — |
| `v_cid_bookings` | `channels.js` | — | `studio.html` | — |
| `v_city_hotel_progress` | `content-keywords.js` | — | `studio-keyword-preview.html` `studio.html` | — |
| `v_city_inventory` | `content-keywords.js` `cron/kw-survey.js` `kw-survey-now.js` | — | `studio-keyword-preview.html` `studio.html` | `kw-survey.js` |
| `v_content_hotel_exposure` | `content-performance.js` | — | `studio.html` | — |
| `v_content_hotel_stats` | `content-hotels.js` | — | `studio.html` | — |
| `v_district_hotel` | `content-keywords.js` | — | `studio-keyword-preview.html` `studio.html` | — |
| `v_district_month` | `content-keywords.js` | — | `studio-keyword-preview.html` `studio.html` | — |
| `v_district_pattern` | `content-keywords.js` | — | `studio-keyword-preview.html` `studio.html` | — |
| `v_district_star` | `content-keywords.js` | — | `studio-keyword-preview.html` `studio.html` | — |
| `v_hotel_manager_full` | `admin.js` `cron/manager-campaign.js` | — | `admin-manager-hub.html` | — |
| `v_hotel_past_revenue` | `admin.js` | — | `admin-manager-hub.html` | — |
| `v_manager_payments` | `content-hotels.js` | — | `studio.html` | — |
| `videos` | `delete-account.js` | — | `settings.html` | — |

---

## 2. 화면이 부르는 창구

### B2B 호텔 매니저

| 화면 | 부르는 창구 |
|---|---|
| `booking-analytics.html` | — (창구 없음) |
| `dashboard.html` | `/api/paypal` |
| `hotel-info.html` | — (창구 없음) |
| `manager-appeal.html` | — (창구 없음) |
| `manager-dashboard.html` | `/api/hotel-bookings` `/api/invoice` |

### 공개·가입

| 화면 | 부르는 창구 |
|---|---|
| `forgot-password.html` | — (창구 없음) |
| `index.html` | — (창구 없음) |
| `login.html` | — (창구 없음) |
| `marketing.html` | `/api/hotel-bookings` |
| `reset-password.html` | — (창구 없음) |
| `sales.html` | `/api/hotel-bookings` `/api/invoice` `/api/paypal` |
| `settings.html` | `/api/delete-account` |
| `signup.html` | — (창구 없음) |
| `verify-email.html` | — (창구 없음) |

### 관리자

| 화면 | 부르는 창구 |
|---|---|
| `admin-accept-invite.html` | `/api/admin/accept-invite` |
| `admin-hotel-detail.html` | `/api/hotel-bookings` |
| `admin-login.html` | `/api/auth/session` |
| `admin-manager-hub.html` | `/api/admin` |

### 기타

| 화면 | 부르는 창구 |
|---|---|
| `mockup-status.html` | `/api/email/ops/notify-claude-work` |

### 스튜디오(콘텐츠 운영)

| 화면 | 부르는 창구 |
|---|---|
| `studio-channel-preview.html` | — (창구 없음) |
| `studio-keyword-preview.html` | `/api/content-keywords` `/api/content-queue` `/api/kw-survey-now` |
| `studio-perf-preview.html` | — (창구 없음) |
| `studio-strategy-preview.html` | — (창구 없음) |
| `studio-upload-published-preview.html` | — (창구 없음) |
| `studio.html` | `/api/channel-perf-detail` `/api/channels` `/api/content-hotels` `/api/content-keywords` `/api/content-performance` `/api/content-queue` `/api/drive-review` `/api/drive-status` `/api/hotel-perf-detail` `/api/hotel-review` `/api/kw-survey-now` `/api/me-lang` `/api/publications` |

---

## 3. 자동으로 도는 봇 — 무엇을 만지나

| 시각(UTC) | 봇 | 읽는 표 | **쓰는 표** |
|---|---|---|---|
| `0 2,7,12,21 * * *` | `/api/cron/drive-watch` | `drive_review` | **`drive_review`** |
| `0 8,12,16 * * *` | `/api/cron/hotel-geo-fill` | — | — |
| `0 22 * * *` | `/api/ops/handoff-verify` | — | — |
| `0 19 * * *` | `/api/cron/db-backup` | — | — |
| `0 * * * *` | `/api/cron/yt-views` | `publications` | **`publications`** |
| `0 * * * *` | `/api/cron/kw-survey` | `city_alias` `keyword` `rpc` `snapshot` `survey_skip` `trend` `v_city_inventory` | **`rpc`** **`snapshot`** **`trend`** |
| `0 3 * * *` | `/api/cron/hotel-district-fill` | `agoda_inventory` `hotels` | **`hotels`** |
| `0 4 * * 1` | `/api/cron/hotel-closed-check` | `agoda_inventory` `hotels` | **`hotels`** |
| `0 0 * * *` | `/api/cron/booking-health` | `hotels` | **`bookings_agoda`** |
| `0 1 * * *` | `/api/cron/wiring-check` | — | — |

---

## 4. 🔴 위험 신호 (스캐너가 찾은 것)

### 4-1. 1,000줄 잘림 위험

> Supabase·PostgREST 는 **아무 말 없이 1,000줄에서 잘라서** 준다. 표가 1,000줄을 넘으면 조용히 틀린 답이 나온다.
> 실제 사고: `hotels`(3,185줄)를 그냥 읽어 **성급이 틀리게 표시**됐고, 예약 79건이 호텔에 안 붙었다 (D-074·D-075).

**지금 실제로 터지는 것: 0곳** (표가 이미 1,000줄을 넘었다) · 전체 21곳

| 위험 | 표 (행수) | 창구 | 어떻게 |
|---|---|---|---|
| 🟢 여유 | `v_city_hotel_progress` (172) | `api/content-keywords.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `snapshot` (24) | `api/content-keywords.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `channel_cid_map` (14) | `api/channels.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `v_cid_bookings` (12) | `api/channels.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `v_content_hotel_exposure` (9) | `api/content-performance.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `content_clicks` (9) | `api/content-performance.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `content_clicks` (9) | `api/publications.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `channels` (8) | `api/channels.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `v_channel_stats` (8) | `api/content-performance.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `v_channel_stats` (8) | `api/hotel-perf-detail.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `v_content_hotel_stats` (6) | `api/content-hotels.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `payment_accounts` (3) | `api/admin.js` | limit 없이 REST 로 읽음 |
| 🟢 여유 | `publications` (3) | `api/content-hotels.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `publications` (3) | `api/content-performance.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `content_queue` (3) | `api/content-queue.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `publications` (3) | `api/publications.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `admins` (2) | `api/_lib/admin-auth-handlers.js` | limit/range 없이 통째로 읽음 |
| 🟢 여유 | `admins` (2) | `api/admin.js` | limit 없이 REST 로 읽음 |
| 🟢 여유 | `refund_requests` (0) | `api/admin.js` | limit 없이 REST 로 읽음 |
| 🟢 여유 | `drive_review` (0) | `api/drive-status.js` | limit 없이 REST 로 읽음 |
| 🟢 여유 | `hotel_not_dup` (0) | `api/hotel-review.js` | limit/range 없이 통째로 읽음 |

> 🟢 여유라도 **표가 자라면 언젠가 터진다.** 새로 쓰는 코드는 처음부터 `range` 로 끊어 읽는다.

### 4-2. 아무도 안 부르는 창구

> 화면도 안 부르고 크론도 아니다. 다른 창구가 내부에서 부르거나, **죽은 코드**다.

- `api/admin-page.js`
- `api/agoda-hotel.js`
- `api/agoda-search.js`
- `api/auth.js`
- `api/chat-log.js`
- `api/cron/invoice-expire.js`
- `api/cron/invoice-retention.js`
- `api/cron/manager-campaign.js`
- `api/cron/receipt-overdue.js`
- `api/decision.js`
- `api/email/hotel-status-notify.js`
- `api/google-places.js`
- `api/hotel-geo-fill.js`
- `api/ops/agoda-inventory.js`
- `api/ops/db-query.js`
- `api/ops/district-alias.js`
- `api/ops/github-commit.js`
- `api/ops/trends-probe.js`
- `api/ops/yt-probe.js`
- `api/process-hotel.js`
- `api/r.js`
- `api/youtube-book.js`
- `api/youtube.js`

---

## 5. 이 문서를 다시 만드는 법

```bash
node _os/tools/wiring-scan.mjs          # 새로 쓴다
node _os/tools/wiring-scan.mjs --check  # 낡았는지만 확인 (고치지 않음)
```

**언제 돌리나**: 창구를 새로 만들거나 지웠을 때 · 화면이 부르는 창구를 바꿨을 때 · 봇을 추가했을 때.
작업 끝에 `--check` 가 「낡음」이라고 하면 그냥 다시 돌려서 같이 커밋한다.
