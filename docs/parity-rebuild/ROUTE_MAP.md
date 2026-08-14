# ROUTE_MAP — 현재 라우트와 접근 제어 (2026-08-14)

판정 근거: `src/lib/supabase/middleware.ts` 의 `isPublic`/`isPublicApi` + 각 파일의 세션 체크.

## 공개 (비로그인 200)
`/` · `/login` · `/splash` · `/callback` · `/privacy` · `/terms`
· `/saju` `/gunghap` `/today-fortune` `/daewoon` `/taegil` (SEO `[slug]`)
· `/ilju` · `/ilju/[slug]` (60갑자)
· `/robots.txt` · `/sitemap.xml` · `/llms.txt`
· `/api/og/*` · `/api/track` · `/api/payment/kakao/webhook`
· **`/api/daily`** ← Phase 0 에서 추가 (크론용, 핸들러가 자체 인증)

## 인증 필요
`/home` `/shell` `/chat` `/more` `/more/people` `/more/settings` `/store`
· `/onboarding/saju` `/onboarding/result`
· `/api/{me,me/profile,me/ai-consent,me/delete,me/push}`
· `/api/{profiles,profiles/[id],saju/calculate}`
· `/api/{chat,interpretations/regenerate,bread/open,monthly}`
· `/api/payment/{iap/verify,kakao/ready,kakao/approve,kakao/cancel}`

## 관리자
`/admin` — `src/lib/admin.ts` 의 `ADMIN_USER_IDS`.
🔴 `robots.ts` 에 disallow 없고 페이지 robots 메타도 없어 **색인 대상**. Phase 1 수정.

## 좀비 / 드리프트
| 경로 | 상태 |
|---|---|
| `/preview`, `/preview/result` | 파일은 있으나 본문이 `redirect('/home')`. isPublic 에서 제거됨 → 비로그인은 `/login` 307. 사용자 의도(D-1) |
| `/relations` `/timeline` `/library` `/persona` `/sprite-test` | 라우트 없음. `robots.ts` 에 disallow 잔재만 |
| `/gunghap` `/daewoon` `/taegil` | 랜딩은 200 이나 **제품 기능 없음**. llms.txt·(seo) 카피가 계속 광고 중 |

## 인증 흐름 (현재, 카카오 전용)
```
/splash → getUser() → isKakaoUser? /home : (signOut local) /login
/login  → signInWithOAuth(kakao, redirectTo=${origin}/callback?next=/home)
/callback → exchangeCodeForSession → getUser → !isKakaoUser면 signOut+/login?error=kakao_required
          → users upsert(admin) → grantSignupBonusIfNeeded → 신규면 signup+CAPI(after)
          → next==='/home' && self 프로필 없음 → /onboarding/saju
          → redirect(safeNext(next))
```
`safeNext` = `src/lib/auth/safe-next.ts` (origin 대조 방식, Phase 0 에서 교체).

## 크론
`vercel.json` `0 22 * * *`(KST 07:00) → `GET /api/daily`.
Vercel Cron 은 **GET** 이므로 GET 이 `isCronRequest()` 통과 시 `runDailyBulk()` 로 위임한다(Phase 0).
