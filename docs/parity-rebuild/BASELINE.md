# BASELINE — Phase 0 감사 (2026-08-14)

> 이 문서는 **리빌드 착수 시점의 사실**만 기록한다. 계획은 `MASTER_PLAN.md`, 결정은 `DECISIONS.md`.
> ⚠️ 값(비밀키·토큰·개인정보)은 기록하지 않는다. 변수 **이름**과 설정 여부만 다룬다.

## 1. Git 상태

- 브랜치: `main`, `origin/main` 과 동기 (ahead/behind 0)
- 마지막 커밋: `933107a feat!: v2 simplification — down to 4 core features`
- **worktree 는 dirty 하다.** 아래 두 출처가 섞여 있다.

### 1-A. 사용자 작업 (건드리지 않음)

| 영역 | 파일 |
|---|---|
| Android 네이티브 에셋 | `android/app/build.gradle`, `res/**` splash·ic_launcher 다수, `values/styles.xml` |
| Capacitor | `capacitor.config.ts` — `CAPACITOR_SERVER_URL` env 화, `/splash` 진입, Apple 도메인 제거 |
| 인증 | `(auth)/callback/route.ts`, `login/page.tsx`, `splash/page.tsx`, `onboarding/saju/page.tsx` |
| 신규 모듈 | `src/lib/auth/provider.ts` + `__tests__/provider.test.ts` (카카오 전용 판별) |
| 제거 | `api/test/bootstrap` (−154), `lib/saju/preview.ts`, `lib/saju/quick_compat.ts`, `components/preview/PreviewEntryClient.tsx` |
| 스텁화 | `preview/page.tsx`, `preview/result/page.tsx` → `/home` 리다이렉트 |
| SEO | `(seo)/**`, `sitemap.ts`, `robots.ts`, `llms.txt`, `lib/seo/pages.ts`, `page.tsx` |
| 문서 | `APP_STORE.md`, `docs/apple-signin-setup.md`, `docs/ios-build-guide.md` |
| 기타 | `next.config.ts`, `lib/supabase/middleware.ts`, `api/saju/calculate/route.ts`, `lib/credits/server.ts` |

> **해석**: 사용자는 로그인을 **카카오 전용으로 좁히고**, `/preview` 비로그인 퍼널과 익명 테스트 로그인을
> 제거하는 방향으로 작업 중이었다. 이는 이번 리빌드 명세(§12 추가 로그인 adapter, §6.2 비로그인 진입)와
> 방향이 다를 수 있다 → `DECISIONS.md` D-1 참조.

### 1-B. 직전 세션(어시스턴트)의 미완 v3 작업

`api/bread/open/route.ts`, `components/home/TurtleBread.tsx`, `lib/daily/ensure.ts`,
`lib/llm/monthly.ts`, `migrations/…18_bread_and_monthly.sql`, `(main)/home/page.tsx`,
`api/daily/route.ts`, `lib/credits.ts`, `lib/llm/daily.ts`, `lib/utils/date.ts`,
`components/home/TodayScoreHero.tsx`

→ **이것이 baseline build 실패의 원인이었다.** Phase 0 에서 완성했다(§3).

## 2. Baseline 게이트 (수정 전)

| 게이트 | 결과 |
|---|---|
| `tsc --noEmit --incremental false` | ❌ **2건** — `MonthlyTeaser` 모듈 없음 / `bread_open` 이벤트 타입 불일치 |
| `vitest run` | ✅ 2 files, 9 tests |
| `pnpm build` | ❌ **실패** — `Module not found: '@/components/home/MonthlyTeaser'` |
| `pnpm lint` | ⚠️ 기존 에러 존재 (cordova 번들 산출물, `scripts/verify-daily.ts`, `OfflineGuard`, `logger`) — 이번 작업과 무관 |

**결론: 배포 불가 상태였고, 원인은 전부 1-B(미완 WIP)였다. 사용자 작업(1-A)은 baseline 을 깨지 않았다.**

## 3. Phase 0 에서 수정한 것

### 3-1. 빌드 복구 (WIP 완성 — 삭제하지 않음)

| 파일 | 내용 |
|---|---|
| `src/components/home/MonthlyTeaser.tsx` | **신규.** 무료 3줄 요약 + 유료 상세 진입 카드 |
| `src/app/api/monthly/route.ts` | **신규.** summary(무료)/detail(유료 4알). 캐시 히트 시 재과금 없음, 실패 시 환불 |
| `src/domain/monthly/summary.ts` | **신규.** 순수 파서 — 클라이언트가 `lib/llm/monthly` 를 import 하면 LLM 클라이언트가 번들에 딸려오는 문제 차단 |
| `src/lib/analytics/events.ts` | `bread_open`·`bread_reward`·`push_optin`·`reading_complete` 화이트리스트 추가 |

### 3-2. P0 보안 (§3.1 후보 검증 결과)

아래는 **코드로 확인한 판정**이다.

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| 1 | `users` UPDATE 권한상승 | 🔴 **CONFIRMED** | `…02_rls.sql:16` 정책이 `auth.uid() = id` 만 검사. 마이그레이션 전체에 `users` 테이블 `revoke` **없음**. Supabase 기본 grant 와 결합 → 사용자가 REST 로 `credit_balance`·`is_admin`·`is_pro`·`signup_bonus_granted`·`bread_*`·`ai_consent_at` 직접 변경 가능 |
| 2 | `usage_logs` 무료한도 변조 | 🔴 **CONFIRMED** | `…02_rls.sql:63` `for all` → 사용자가 자기 행 UPDATE/DELETE 로 무료 채팅 한도 무한 리셋 |
| 3 | `increment_chat_usage` | 🔴 **CONFIRMED (2건)** | `…03_functions.sql:4-15` SECURITY DEFINER + `authenticated` EXECUTE + **`auth.uid()` 검증 없음** → 타인 한도 소진(griefing). 날짜 키가 `current_date`(UTC)인데 호출부는 KST → KST 00:00~09:00 사용량이 다른 행에 쌓여 카운터가 0으로 읽힘 |
| 4 | `open_bread()` 임의 재화 발행 | 🔴 **CONFIRMED** | 미커밋 migration 18(직전 세션 작성)이 도장수·보상량·월상한·확률·보너스를 **함수 인자**로 받고 `anon`/`authenticated` 에 EXECUTE 부여 → `open_bread(myId, 1, 999, 999999, 1, 999)` 로 무제한 발행 |
| 13 | 유료 결과물 위조 | 🔴 **CONFIRMED** | migration 18 의 `monthly_readings` `for all` 정책 → 사용자가 `tier='detail'` 행을 직접 INSERT 하면 유료 월별 풀이 페이월 우회 |

**조치**

- `migrations/…18_bread_and_monthly.sql` **직접 수정** — 미적용(untracked) WIP 이므로 취약 버전을 남기지 않고 고치는 게 옳다(`DECISIONS.md` D-2)
  - 경제 파라미터 → 함수 내부 `constant` 로 고정, 시그니처 `open_bread(p_user_id uuid)` 로 축소
  - `bread_opens`/`monthly_readings` 정책을 `for all` → **SELECT only**, 쓰기 grant 회수
- `migrations/…19_privilege_hardening.sql` **신규** — 기존 구멍(#1·#2·#3) 차단
  - `users`: UPDATE/INSERT 회수 후 `nickname, push_enabled, push_token, push_time` 만 컬럼 단위 재부여
  - `usage_logs`: `for all` → SELECT only + 쓰기 회수
  - `increment_chat_usage` / `increment_interp_views`: 호출자 검증 + KST 날짜 키
  - `interpretations`/`daily_fortunes`: 사용자 롤 쓰기 회수
  - **preflight/rollback SQL 을 파일 상단 주석에 포함**
- `src/app/(auth)/callback/route.ts`: `users` upsert 를 admin client 로 전환 (migration 19 와 호환. 미전환 시 신규 가입이 깨진다)
- `src/lib/db/__tests__/migration-security.test.ts` **신규** — 위 불변식 12건 정적 회귀 테스트

### 3-3. 수정 후 게이트

| 게이트 | 결과 |
|---|---|
| `tsc --noEmit --incremental false` | ✅ 0 errors |
| `vitest run` | ✅ **3 files, 21 tests** (기존 9 + 신규 12) |
| `pnpm build` | ✅ Compiled successfully |

## 4. 불변 식별자 (변경 금지)

- 번들 ID: `com.niceverygood.ggobuk`
- 배포 URL: `https://ggobuk.vercel.app`
- 소비성 IAP: `ggobuk.credits.mini` / `.entry` / `.focus` / `.deep` / `.master`
  - `ggobuk.credits.firstdeal` — 판매 중단, **과거 구매 해석용으로 매핑 유지 필수**
- 마이그레이션 1~17 (적용됨 추정) — 수정 금지. 18은 미적용 WIP, 19는 신규.

## 5. 미해결 / UNKNOWN

| 항목 | 상태 |
|---|---|
| 라이브 Supabase 스키마 vs 마이그레이션 파일 드리프트 | **UNKNOWN** — 읽기 전용 접근 권한 없음. migration 19 상단 preflight SQL 을 사람이 실행해야 확인 가능. `CLAUDE.md` 에 2026-06-10 드리프트 이력(mig 5·9·11·12·13·16 누락) 있음 → 추정 금지 |
| `BETA_FREE_MODE` 프로덕션 값 | **UNKNOWN** — `.env.local` 에 키 없음(로컬은 정상 과금). Vercel 값은 코드로 확인 불가 |
| 네이티브 푸시 | ❌ 미구현 확인 — `@capacitor/push-notifications` 없음, `google-services.json` 없음, iOS `.entitlements` 없음. `web-push`(VAPID) 단일. Capacitor WebView 라 **iOS 에 `PushManager` 없음** = 앱 설치 유저 푸시 도달 0 |
| Meta Pixel | ❌ 무력 — `next.config.ts` CSP `script-src` 에 facebook 도메인 없음 |
| App Store 리스팅 드리프트 | 🔴 `APP_STORE.md` 가 궁합·달력·모드선택(`/relations`·`/calendar`·`/mode`)을 광고하나 라우트 전부 없음. 4.3(b) 리젝 이력(2026-05-22) 있는 앱이라 2.3 리스크 |
| 나머지 §3.1 후보 (5~12, 14~21) | 감사 완료 — 아래 §7 참조 |

## 6. 다음 단계

`MASTER_PLAN.md` Phase 1(Foundation) — 대표프로필, reports/report_jobs, 꼬북잎/entitlement.
단, **migration 18·19 의 프로덕션 적용은 사용자 승인 게이트**다(§19).


## 7. 감사 워크플로우 추가 발견 (4-agent 병렬, 전부 파일:라인 근거 확보)

### 7-1. Phase 0 에서 **즉시 수정한** 신규 발견

| # | 발견 | 판정 | 조치 |
|---|---|---|---|
| A | **크론이 완전히 죽어 있었다** | 🔴 CONFIRMED | 사용자 변경(`middleware.ts` `path.startsWith('/api/')` → `isPublicApi` allowlist)으로 `/api/daily` 가 핸들러 도달 전 401. 게다가 Vercel Cron 은 **GET** 인데 벌크 로직은 POST 에만 있었다 → 일일 운세 벌크 생성·푸시가 통째로 미동작. **조치**: `/api/daily` 를 `isPublicApi` 에 추가(핸들러가 GET=세션·POST=CRON_SECRET 자체 인증), `isCronRequest()` 추출 후 GET 이 크론 인증 시 `runDailyBulk()` 위임 |
| B | **페르소나 systemPrompt 전문이 브라우저로 배포** | 🔴 CONFIRMED | `ChatThread.tsx`('use client')가 `lib/llm/personas` 를 import → SHARED_GUARD(자해 대응·몰입 규칙)와 4개 프롬프트 전문이 클라이언트 번들에 포함. 가드 우회 설계가 쉬워짐. **조치**: `src/domain/persona/display.ts`(표시용 이름만) 신설 후 교체 |
| C | **OAuth open-redirect 우회** | 🔴 CONFIRMED (실측) | `safeNext` 가 접두사만 검사 → `new URL('/\\evil.com', base)` = `https://evil.com/`, `/\t/evil.com` 도 동일. WHATWG 파서가 백슬래시·제어문자를 정규화하기 때문. **조치**: `src/lib/auth/safe-next.ts` 로 추출하고 **origin 동일성 검사**로 교체 + 회귀 테스트 7건 |

### 7-2. 확인만 하고 **Phase 1 이후로 넘긴** 발견

| 발견 | 근거 | 비고 |
|---|---|---|
| `/admin` 이 색인 대상 | `robots.ts:18-34` 에 `/admin` disallow 없음 + `admin/page.tsx` 에 페이지 robots 메타 없음 → 루트 `index:true` 상속. `(main)`·`(auth)` 는 noindex 인데 `/admin` 만 누락 | Phase 1 |
| `SUPERADMIN_EMAILS` 하드코딩 | `src/lib/admin.ts:17` `['dev@bottlecorp.kr']` — env/DB 무관하게 항상 관리자인 백도어성 상수가 소스에 평문 | Phase 1 (§11 감사로그와 함께) |
| CSP 가 Meta Pixel 을 완전 차단 | `next.config.ts:34` `script-src` 에 `connect.facebook.net` 없음, `connect-src` 에 `www.facebook.com` 없음 → 픽셀 이벤트 0건. `t1.kakaocdn.net` 은 반대로 죽은 허용치(Kakao JS SDK 미사용) | Phase 8 (분석 동의 정리와 함께) |
| `NEXT_PUBLIC_POSTHOG_KEY` 네이밍 오류 | `logger.ts:42` 에서 서버 전용으로만 쓰이는데 `NEXT_PUBLIC_` 접두 → 클라이언트 번들에 인라인 | Phase 1 (env Zod 검증과 함께) |
| 미들웨어 접두사 매칭 느슨 | `middleware.ts:73-76` `startsWith('/login')` → `/loginX` 도 공개 판정. 현재 해당 라우트 없어 실해 없음 | Phase 1 |
| `sitemap.ts` 가 `/privacy`·`/terms` 누락 | 둘 다 공개 + canonical 선언됨 | Phase 8 |
| `robots.ts` 가 삭제된 라우트 disallow | `/relations`, `/timeline`, `/library`, `/persona`, `/sprite-test` | Phase 8 |
| APP_STORE.md 빌드 메타 불일치 | 문서 build 5 vs 실제 iOS `project.pbxproj` = 7. Android versionCode 축은 문서에 없음 | Phase 8 |
| APP_STORE.md 결제 서술 구버전 | "네이티브에선 충전 UI 숨김" 이라 쓰여 있으나 실제로는 IAP 구현 완료(`cordova-plugin-purchase`, `iap/verify`, `NativeCreditStore`) | Phase 8 |
