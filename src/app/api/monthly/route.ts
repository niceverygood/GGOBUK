import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { resolveRepresentativeProfile } from '@/lib/profiles/resolve';
import { buildSajuResult } from '@/lib/saju';
import {
  fallbackMonthlySummary,
  generateMonthlyDetail,
  generateMonthlySummary,
} from '@/lib/llm/monthly';
import { CREDIT_COSTS } from '@/lib/credits';
import {
  addCredits,
  isInsufficientCreditsError,
  spendCredits,
} from '@/lib/credits/server';
import {
  isAiConsentRequiredError,
  requireAiConsent,
} from '@/lib/privacy/consent';
import { rateLimit, rateLimitKey } from '@/lib/utils/rate-limit';
import { currentYearMonthKst } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import type { SajuProfileRow } from '@/types/db';

export const runtime = 'nodejs';
export const maxDuration = 90;

const Body = z.object({
  tier: z.enum(['summary', 'detail']),
  /** KST 기준 'YYYY-MM'. 생략하면 이번 달. */
  yearMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

/**
 * 월별 사주풀이 생성.
 *
 * - summary: 무료 3줄. 과금하지 않는다.
 * - detail: CREDIT_COSTS.monthly 차감. 이미 구매한 달은 재생성 없이 캐시를 돌려준다.
 *
 * 대상 월은 서버가 확정한다 — 클라이언트가 보낸 yearMonth 는 "이번 달"만 허용해
 * 과거·미래 달을 임의로 생성하지 못하게 한다(가격 우회·비용 폭증 방지).
 */
export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const thisMonth = currentYearMonthKst();
  if (body.yearMonth && body.yearMonth !== thisMonth) {
    return NextResponse.json({ error: 'unsupported_month' }, { status: 400 });
  }
  const yearMonth = thisMonth;

  try {
    await requireAiConsent(user.id);
  } catch (e) {
    if (isAiConsentRequiredError(e)) {
      return NextResponse.json(
        { error: 'ai_consent_required' },
        { status: 412 },
      );
    }
    throw e;
  }

  const rl = rateLimit(rateLimitKey(user.id, `monthly-${body.tier}`), 5, 60_000);
  if (!rl.allowed)
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const resolved = await resolveRepresentativeProfile(supabase, user.id);
  if (!resolved.ok)
    return NextResponse.json({ error: 'no_profile' }, { status: 404 });
  const profile = resolved.profile;

  // 이미 있으면 재생성/재과금하지 않는다.
  const { data: cached } = await supabase
    .from('monthly_readings')
    .select('content, generated_at')
    .eq('saju_id', profile.id)
    .eq('year_month', yearMonth)
    .eq('tier', body.tier)
    .maybeSingle();
  if (cached) {
    return NextResponse.json({ content: cached.content, cached: true });
  }

  const saju = buildSajuResult({
    birthDate: profile.birth_date,
    birthTime: profile.birth_time ?? undefined,
    isLunar: profile.is_lunar,
    isLeapMonth: profile.is_leap_month,
    gender: profile.gender,
  });

  const isPaid = body.tier === 'detail';
  let creditsSpent = false;

  if (isPaid) {
    try {
      await spendCredits({
        userId: user.id,
        amount: CREDIT_COSTS.monthly,
        reason: `월별 상세 풀이:${yearMonth}`,
        referenceId: profile.id,
      });
      creditsSpent = true;
    } catch (e) {
      if (isInsufficientCreditsError(e)) {
        return NextResponse.json(
          { error: 'insufficient_credits' },
          { status: 402 },
        );
      }
      // fail-closed: 잔액 외 사유로 차감이 실패하면 유료 결과를 공짜로 주지 않는다.
      logger.error('monthly', 'credit spend failed', {
        userId: user.id,
        yearMonth,
        message: e instanceof Error ? e.message : String(e),
      });
      return NextResponse.json({ error: 'spend_failed' }, { status: 500 });
    }
  }

  const refund = async (reason: string) => {
    if (!creditsSpent) return;
    await addCredits({
      userId: user.id,
      amount: CREDIT_COSTS.monthly,
      reason,
      kind: 'refund',
      referenceId: profile.id,
    }).catch(() => undefined);
    creditsSpent = false;
  };

  let result: { content: string; tokensUsed: number; model: string };
  try {
    result = isPaid
      ? await generateMonthlyDetail({ saju, yearMonth, name: profile.name })
      : await generateMonthlySummary({ saju, yearMonth, name: profile.name });
  } catch (e) {
    logger.error('monthly', 'llm failed', {
      userId: user.id,
      tier: body.tier,
      message: e instanceof Error ? e.message : String(e),
    });
    if (isPaid) {
      await refund(`월별 상세 풀이 AI 실패 환불:${yearMonth}`);
      return NextResponse.json({ error: 'generation_failed' }, { status: 500 });
    }
    // 무료 요약은 폴백으로 대체 (과금이 없어 사용자 손실이 없다).
    result = {
      content: fallbackMonthlySummary(yearMonth),
      tokensUsed: 0,
      model: 'local-fallback',
    };
  }

  const admin = await createServerClient({ admin: true });
  const { error } = await admin.from('monthly_readings').upsert(
    {
      saju_id: profile.id,
      year_month: yearMonth,
      tier: body.tier,
      content: result.content,
      model: result.model,
      tokens_used: result.tokensUsed,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'saju_id,year_month,tier' },
  );

  if (error) {
    logger.error('monthly', 'save failed', {
      userId: user.id,
      yearMonth,
      message: error.message,
    });
    if (isPaid) {
      await refund(`월별 상세 풀이 저장 실패 환불:${yearMonth}`);
      return NextResponse.json({ error: 'save_failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ content: result.content, cached: false });
}
