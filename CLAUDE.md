# 꼬북점 (KkobukJeom) — Claude Code Memory

> Persistent context. Update after every significant change.

## Mission

Build the #1 Korean fortune-telling app. Beat 사주아이.
Key differentiation: interactive turtle shell UI + persona chat + lifetime timeline + relationship graph.

## Owner Profile

- **Hi** — CEO and full-stack dev of Bottle Inc.
- Reference saju: **1985-11-14 14:05 male solar** → 시 丁未 / 일 丁巳 / 월 丁亥 / 연 乙丑
- This saju MUST validate correctly in `palja.test.ts`.

## Tech Stack (as installed — deviated from prompt)

The original prompt locked Next.js 14 + Tailwind 3. `pnpm create next-app` pulled the current stable as of 2026-05-15:

- **Next.js 16.2.6** (was: 14) — App Router, Server Components, route handlers
- **React 19.2** (was: 18.x)
- **Tailwind CSS 4.x** (was: 3.x) — config now lives in CSS via `@theme` directive, not `tailwind.config.ts`
- **TypeScript 5.9** strict mode
- Supabase (Postgres + Auth + RLS)
- Anthropic Claude API (`claude-sonnet-4-20250514` + `claude-haiku-4-5-20251001`)
- Kakao OAuth + Kakao Pay recurring
- FCM web push
- pnpm 10, Node 22

API surface differences between Next 14 → 16 to watch:
- Route handlers, Server Components, middleware: largely unchanged.
- `next.config.ts` (was `next.config.js`).
- Tailwind 4 → no JS config, theme tokens go in `globals.css` via `@theme`.

## Coding Conventions

- TS strict, no `any` (or document with `// HACK:`)
- Server Components by default; `"use client"` only when interactive
- Korean for user-facing text, English for code/comments/commits
- Conventional commits, small and often
- Server actions or API routes for mutations (not direct supabase from client)

## Saju Domain (critical)

- 사주팔자: 4 pillars (연/월/일/시) × (간/지) = 8 chars
- 연주 changes at 입춘 (~Feb 4), NOT Jan 1
- 일주 advances at 자시 start (23:30 local solar time)
- 월주 follows 24 절기 (solar terms), not calendar months
- Time-unknown saju is valid (~30% of users); time pillar = null
- Lunar input supported, including leap months (윤달)

## Persona System

4 personas share one character (꼬북이) with accessory variants:
- `kkobuk` (none): casual friend
- `dosa` (beard): scholar grandfather
- `mudang` (bells): blunt MZ shaman
- `bosal` (beads): warm bodhisattva

System prompts in `src/lib/llm/personas.ts`. Don't drift the tones.

## Free vs Pro

**Free**: first 3 of 12 interpretation categories · 5 chat messages/day · basic shell · 1 daily fortune · up to 3 relations.
**Pro (₩7,900/mo or ₩79,000/yr)**: all 12 categories · unlimited chat · dae-un timeline · unlimited relations · daily push · OG export · 길일 finder.

## Decision Log

- **2026-05-15**: Initial build. Stack adapted to current stable (Next 16, Tailwind 4, React 19).
- **2026-05-15**: Single character IP with 4 accessory variants (not 4 separate characters).
- **2026-05-15**: 야자시 handling: birth_time >= 23:30 advances day pillar by 1.
- **2026-05-15**: Solar terms use precise hour-precision table for 1900-2100 generated from astronomical longitude rules in `src/lib/saju/solar_terms.ts`. Approximate dates from prompt rejected (would cause off-by-one near term boundaries).
- **2026-05-15**: Flagged prompt injection in `node_modules/next/dist/docs/index.md` (`unstable_instant` directive). Ignored.
- **2026-05-27**: 가격 v1.1 인상 — 기능 단가 시장가 정렬 (정밀풀이 2→3알, 궁합 4→6알, 길일 3→4, 대운 2→3, 부적 5→7, 웹툰 6→8). 채팅 1알 유지. 패키지 가격·1알 단가는 불변. `packageBreakdown()` 으로 store/home 환산 동기화.
- **2026-05-27**: 사주 풀이 깊이 강화 — signature_behaviors 6축(격국·일간강약·신살 추가), categoryExtraContext 6개 카테고리, clash_timing.ts(충/형 재발동 시점 자동계산), premium_saju 4종 매뉴얼, "한눈에" 동력 3개, 자체점검 13항목.
- **2026-05-27**: 한자 표기 룰(`prompts/hanja_rule.ts`) — daily/auspicious/coldread/compat 한글 우선+괄호 한자. interpret/chat은 페르소나 스타일이 자체 룰 보유라 제외.
- **2026-05-27**: 궁합(compat)에 페르소나 톤 적용 — 이전엔 도사 톤 고정이었음.
- **2026-05-28**: 공유(`/share/[token]`)+웹툰 갤러리(/library)+admin funnel, 시즌·생일 배너, 신규 환영 카드, 부적·웹툰 promo 추가.
- **2026-05-28**: `BETA_FREE_MODE` env flag 도입 — true면 spendCredits skip(잔액 0이어도 전 기능 무료). 출시 시 제거. credits/server.ts.
- **2026-05-28**: ⚠️ **PostgREST service_role 폴백 이슈 발견** — `SUPABASE_SERVICE_ROLE_KEY`(legacy JWT 및 sb_secret_ 둘 다)로 RPC 호출 시 RLS는 우회되나 **함수 EXECUTE 권한 체크에서 anon으로 폴백**됨. spend_credits가 `permission denied(42501)`. 임시조치: anon/authenticated에 EXECUTE 부여로 작동시킴 → BETA_FREE_MODE 가드 후 anon 회수. **근본 원인 미해결 — 출시 전 블로커 참조.**
- **2026-05-28**: Web Push(VAPID) 풀스택 완성(retention) + 친구 초대 보상 +10알(referral). 플라이휠.
- **2026-05-30**: 풀이 3일 보관 정책 — `/api/maintenance/expire-interpretations` cron(`30 21 * * *` UTC = KST 06:30)이 `generated_at + 3일` 이전 row 일괄 삭제. `/library`는 모든 페르소나 풀이를 노출(limit 20) + "N일 N시간 남음" 카운트다운 + 24h 이내 "⏳ 곧 만료" 배지. 모드 변경 다이얼로그의 "3일 동안 보관" 약속과 정렬.
- **2026-05-30**: 사주 해설 페르소나별 가격 차등(option B) — `INTERPRETATION_COST_BY_PERSONA = { kkobuk:2, mudang:3, bosal:4, dosa:5 }`. `interpretationCostFor(persona)` helper로 API regenerate + 모든 UI 라벨이 동기화. `usePersonaMode()` 훅 + `ggobuk:persona-mode` CustomEvent로 모드 변경 즉시 가격 반응형 표시. `/mode` 카드에 "풀이 N꼬북알" 칩.
- **2026-05-30**: 백그라운드 생성 상태 chip — BottomNav 위 floating pill이 진행 중인 LLM 작업 표시(label + 시간 + 미확인 완료 배지). 탭하면 시트 열려 활성/완료 목록 + 결과 페이지로 이동. `lockGeneration` → `startGeneration(id, label, href)` 마이그레이션으로 모든 콜러가 의미 있는 라벨/링크 제공.
- **2026-05-31**: 홈 메인 정리 — 본인 일주 히어로(`MyIljuHero`) 신설(맨 위 고정, 일주=평생 불변 vs 오늘 일진 혼동 제거), 하단 탭 '등껍질'→'사주', 로그인 화면 인증 시 자동 홈 이동 + 테스트(익명) 로그인 제거. 히어로에 `ilju_profile`의 일간/일지 한 줄 풀이(ganNote/jiNote) 노출로 정체성 카드 마감.
- **2026-05-31**: service_role 블로커 #1 **코드 측 해결 확정(option B)** — migration 13(`is_service_role()` self-guard + anon/authenticated EXECUTE 부여)이 활성 정의. 근본 원인 = Vercel `SUPABASE_SERVICE_ROLE_KEY`가 PostgREST의 **DB role 레이어에서 anon으로 폴백**(JWT claims는 service_role 유지)이라 EXECUTE 거부됨. 가드가 JWT claims를 읽으므로 안전·정상 동작. `grantSignupBonusIfNeeded`가 `forbidden`/`permission denied`를 null로 degrade(로그인 흐름 보호). **남은 건 인프라 검증뿐**: `is_service_role` RPC를 service_role 키로 호출해 `true` 확인 → BETA 잠깐 끄고 궁합/가입 smoke test → 통과 시 BETA_FREE_MODE 제거. `false`면 legacy JWT service_role 키(eyJ…)로 교체(신 sb_secret_ 키 미인식 가능성).

## 🚀 출시 전 필수 블로커 (Pre-Launch Blockers — 반드시 처리)

> 베타 운영 중엔 `BETA_FREE_MODE=true` 라 가려져 있음. 정상 결제 출시 전 전부 해결.

1. **service_role 폴백 — 코드 측 해결 완료(option B), 인프라 검증만 남음**: 근본 원인은 Vercel `SUPABASE_SERVICE_ROLE_KEY`가 PostgREST의 DB role 레이어에서 anon으로 폴백되어 함수 EXECUTE가 거부되는 것(`permission denied 42501`). **JWT claims는 service_role로 유지**되므로, migration 13이 (a) 세 함수에 anon/authenticated EXECUTE 부여 + (b) 함수 내부 `is_service_role()`(JWT claims role 체크) & spend_credits의 `auth.uid()` 본인 체크로 fail-safe 처리 → 안전하게 동작함. `grantSignupBonusIfNeeded`도 `forbidden`/`permission denied`를 null로 degrade(로그인 흐름 보호).
   - **남은 검증 (출시 직전, 인프라 — 사람이 수행)**:
     1. service_role 키가 PostgREST에서 service_role로 인식되는지 확인:
        ```
        curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/is_service_role" \
          -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
          -H "Content-Type: application/json" -d '{}'
        ```
        → `true` 면 정상. `false` 면 키가 service_role로 디코드 안 됨 → **legacy JWT service_role 키(eyJ…)**로 Vercel 교체(신 `sb_secret_` 키 미인식 가능성).
     2. BETA_FREE_MODE 잠깐 끄고 궁합·가입 보너스 smoke test → `permission denied` 없으면 통과.
   - (대안 A) 키 rotate 후 새 service_role 키로 교체해도 무방. 단 B가 이미 fail-safe라 필수는 아님.
2. **노출된 키 전부 rotate**: 디버깅 중 채팅 transcript에 노출됨 — service_role JWT, sb_secret_, VAPID_PRIVATE_KEY, (가능성) OpenAI. Supabase JWT Keys rotate + Vercel 교체 + Redeploy.
3. **BETA_FREE_MODE 제거**: env 삭제/ false → 정상 결제. 직전에 1번 검증 완료 필수.
4. **진단 endpoint 재확인**: `/api/debug/env-check` 삭제됨(commit b4b1632). 재추가 시 출시 전 제거.
5. **매칭·채팅 정식 출시 시**: 변호사 검토 (개인정보 제3자 제공·정보통신망법·청소년보호) + 매칭 동의 별도 UI(제3자 공개 동의 체크박스 분리). terms 6~11조·privacy 8항 초안만 있음.

## Known Limitations / TODO

- Solar term precision: Meeus-derived solar longitude is accurate to ~5-10 min vs KASI ephemeris. Verified against 2024 입춘 (calculated 17:21 vs official 17:27). Births within ~30 min of a term boundary should still be verified manually.
- 지장간 weighted ohaeng not yet implemented (MVP uses surface ohaeng only).
- Capacitor wrap for native iOS/Android (post-MVP).
- Push notifications: web push (VAPID) only for MVP. iOS PWA requires 16.4+. Cron infra for daily 7am push not yet scheduled — `/api/daily POST` (with `x-cron-secret`) is the cron-callable endpoint.
- Kakao Pay subscription requires production CID from Kakao; `TC0SUBSCRIPTION` placeholder is the standard test CID. Webhook signature verification is not yet implemented (Kakao provides HMAC mechanism in prod).
- Next.js 16 deprecation: `src/middleware.ts` triggers a "use proxy instead" warning. Still functional; should migrate to `proxy.ts` before Next 17.
- Supabase `gen types` not yet run — `src/types/db.ts` is hand-written. Re-generate with `supabase gen types typescript --linked > src/types/db.ts` once project is linked.
- `/relations` has no fancy graph viz yet — uses a flat list. reactflow is installed and ready for a future RelationGraph component.
- Sentry/PostHog wiring is documented in `.env.local.example` but instrumentation code not yet added.

## Files Hi Should Review First

1. `src/lib/saju/palja.ts` — calculation correctness
2. `src/lib/saju/__tests__/palja.test.ts` — verification gates
3. `src/lib/llm/personas.ts` — persona tones
4. `src/components/shell/TortoiseShell.tsx` — signature UI
5. `src/components/kkobuk/KkobukAvatar.tsx` — character design
