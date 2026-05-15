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
