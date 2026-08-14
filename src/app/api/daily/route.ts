import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { hasAiConsent } from '@/lib/privacy/consent';
import { rateLimit, rateLimitKey } from '@/lib/utils/rate-limit';
import { ensureDailyFortune } from '@/lib/daily/ensure';
import { todayKstIso } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import { sendPush, isPushConfigured } from '@/lib/push/send';
import type { SajuProfileRow } from '@/types/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

// On-demand: GET /api/daily?saju_id=...
// Bulk:     POST /api/daily  (cron — generates for all self profiles for today)
/**
 * Vercel Cron 인증. fail-closed — CRON_SECRET 미설정이면 항상 거부한다.
 *
 * ⚠️ Vercel Cron 은 스케줄된 경로를 **GET** 으로 호출한다(vercel.json 에 method 필드가 없다).
 * 벌크 생성 로직은 원래 POST 에만 있어 크론이 GET → 401 로 끝나고 있었다.
 * 그래서 GET 도 크론 인증이 통과하면 같은 벌크 작업을 수행한다.
 */
function isCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (
    req.headers.get('authorization') === `Bearer ${secret}` ||
    req.headers.get('x-cron-secret') === secret
  );
}

export async function GET(req: Request) {
  // 크론(세션 없음)이면 벌크 생성 경로로 위임한다.
  if (isCronRequest(req)) return runDailyBulk();

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rl = rateLimit(rateLimitKey(user.id, 'daily-get'), 12, 60_000);
  if (!rl.allowed)
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const url = new URL(req.url);
  const sajuId = url.searchParams.get('saju_id');
  if (!sajuId) return NextResponse.json({ error: 'saju_id required' }, { status: 400 });

  const today = todayKstIso();

  const { data: existing } = await supabase
    .from('daily_fortunes')
    .select('*')
    .eq('saju_id', sajuId)
    .eq('date', today)
    .maybeSingle();
  if (existing) return NextResponse.json({ daily: existing, cached: true });

  // 캐시 미스 → 새 생성 = AI 호출. 동의 여부 확인.
  if (!(await hasAiConsent(user.id))) {
    return NextResponse.json(
      { daily: null, error: 'ai_consent_required' },
      { status: 412 },
    );
  }

  // IDOR 방지: 본인 소유 프로필만 (admin insert 가 RLS 우회하므로 라우트에서 소유권 강제).
  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('id', sajuId)
    .eq('owner_id', user.id)
    .single<SajuProfileRow>();
  if (!profile) return NextResponse.json({ error: 'profile not found' }, { status: 404 });

  const result = await ensureDailyFortune({ profile, date: today });
  if (!result.ok) {
    if (result.reason === 'llm_not_configured') {
      return NextResponse.json(
        { daily: null, error: 'llm_not_configured' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  return NextResponse.json({ daily: result.daily, cached: result.cached });
}

export async function POST(req: Request) {
  // Cron endpoint. Authenticate via Vercel Cron header or shared secret.
  // fail-closed: CRON_SECRET 미설정이면 거부(누구나 전체 유저 대량 생성 못 하게).
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return runDailyBulk();
}

/** 전체 사용자 일일 운세 생성 + 푸시. GET(크론)·POST 공용. */
async function runDailyBulk() {
  const admin = await createServerClient({ admin: true });
  const today = todayKstIso();

  // 동의한 사용자의 self profile 만 생성. 미동의자는 cron 에서도 LLM 호출 금지.
  const { data: consentedUsers } = await admin
    .from('users')
    .select('id')
    .not('ai_consent_at', 'is', null);
  const consentedIds = new Set((consentedUsers ?? []).map((u) => u.id));

  // 사용자당 **대표프로필 1개**만 생성한다. 예전에는 relation_type='self' 를 전부 긁어
  // 다중 self 사용자에게 중복 생성·중복 푸시가 나갔다.
  const { data: repRows, error: repErr } = await admin
    .from('users')
    .select('id, representative_profile_id')
    .not('representative_profile_id', 'is', null)
    .returns<{ id: string; representative_profile_id: string }[]>();

  const profiles: SajuProfileRow[] = [];

  // ⚠️ migration 20 미적용 환경에서는 representative_profile_id 컬럼이 없다.
  //    그대로 두면 대상이 0건이 되어 **일일 운세가 조용히 아무것도 생성하지 않는다.**
  //    컬럼이 생기기 전까지는 기존 방식(self 프로필)으로 폴백한다.
  const hasRepColumn = !repErr;

  if (hasRepColumn) {
    const repIds = (repRows ?? [])
      .filter((r) => consentedIds.has(r.id))
      .map((r) => r.representative_profile_id);

    // Postgrest in() 인자 길이 제한을 피하려 청크로 나눈다.
    for (let i = 0; i < repIds.length; i += 200) {
      const { data } = await admin
        .from('saju_profiles')
        .select('*')
        .in('id', repIds.slice(i, i + 200))
        .returns<SajuProfileRow[]>();
      if (data) profiles.push(...data);
    }
  } else {
    logger.warn('daily', 'representative_profile_id 없음 — self 프로필로 폴백', {});
    const { data } = await admin
      .from('saju_profiles')
      .select('*')
      .eq('relation_type', 'self')
      .returns<SajuProfileRow[]>();
    // 사용자당 1건만 (다중 self 대비 최초 생성 우선)
    const seen = new Set<string>();
    for (const p of data ?? []) {
      if (!consentedIds.has(p.owner_id) || seen.has(p.owner_id)) continue;
      seen.add(p.owner_id);
      profiles.push(p);
    }
  }

  let generated = 0;
  let failed = 0;

  for (const profile of profiles) {
    // ensureDailyFortune 이 캐시 확인·생성·저장·컬럼 폴백을 모두 처리한다.
    const r = await ensureDailyFortune({ profile, date: today });
    if (!r.ok) {
      failed++;
      logger.error('daily', 'generation failed', {
        profileId: profile.id,
        reason: r.reason,
        error: r.message,
      });
      continue;
    }
    if (!r.cached) generated++;
  }

  // ── 푸시 발송 — push 켠 사용자에게 그날의 한 줄 운세 ──
  let pushed = 0;
  let pushExpired = 0;
  if (isPushConfigured()) {
    const { data: pushUsers } = await admin
      .from('users')
      .select('id, push_token')
      .eq('push_enabled', true)
      .not('push_token', 'is', null);

    // owner_id → self profile id 매핑 (이번에 처리한 profiles 기준)
    const ownerToProfile = new Map(profiles.map((p) => [p.owner_id, p.id]));

    for (const u of pushUsers ?? []) {
      const profileId = ownerToProfile.get(u.id);
      if (!profileId) continue; // 미동의·프로필 없음 → 운세 없어 skip

      const { data: fortune } = await admin
        .from('daily_fortunes')
        .select('one_liner')
        .eq('saju_id', profileId)
        .eq('date', today)
        .maybeSingle();
      if (!fortune?.one_liner) continue;

      const result = await sendPush(u.push_token, {
        title: '🐢 오늘의 한 줄',
        body: fortune.one_liner,
        url: '/home',
        tag: 'ggobuk-daily',
      });
      if (result.ok) {
        pushed += 1;
      } else if (result.expired) {
        // 만료/해지된 구독 정리 — 다음 발송 때 제외.
        pushExpired += 1;
        await admin
          .from('users')
          .update({ push_token: null, push_enabled: false })
          .eq('id', u.id);
      }
    }
  }

  return NextResponse.json({ generated, failed, pushed, pushExpired, date: today });
}
