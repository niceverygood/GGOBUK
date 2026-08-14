import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { resolveRepresentativeProfile } from '@/lib/profiles/resolve';
import { buildSajuResult } from '@/lib/saju';
import {
  READING_CATEGORY,
  READING_PERSONA,
  generateFallbackReading,
  generateFullReading,
} from '@/lib/llm/interpret';
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
import { logger } from '@/lib/utils/logger';
import type { SajuProfileRow } from '@/types/db';

export const runtime = 'nodejs';
export const maxDuration = 90;

/** 내 사주 전체 풀이 생성 (재생성 포함). 바디 없이 POST — 항상 본인 사주 한 편. */
export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

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

  const rl = rateLimit(rateLimitKey(user.id, 'interpretation'), 5, 60_000);
  if (!rl.allowed)
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const resolved = await resolveRepresentativeProfile(supabase, user.id);
  if (!resolved.ok)
    return NextResponse.json({ error: 'no_profile' }, { status: 404 });
  const profile = resolved.profile;

  const saju = buildSajuResult({
    birthDate: profile.birth_date,
    birthTime: profile.birth_time ?? undefined,
    isLunar: profile.is_lunar,
    isLeapMonth: profile.is_leap_month,
    gender: profile.gender,
  });

  let creditsSpent = false;
  try {
    await spendCredits({
      userId: user.id,
      amount: CREDIT_COSTS.reading,
      reason: '사주 전체 풀이 생성',
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
    // fail-closed: 차감이 비-잔액 사유로 실패하면 유료 풀이를 공짜로 주지 않는다.
    logger.error('interpretations/regenerate', 'credit spend failed', {
      userId: user.id,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: 'spend_failed' }, { status: 500 });
  }

  let result;
  try {
    result = await generateFullReading(saju, profile.name);
  } catch (e) {
    logger.error('interpretations/regenerate', 'llm failed; using fallback', {
      userId: user.id,
      message: e instanceof Error ? e.message : String(e),
    });
    if (creditsSpent) {
      await addCredits({
        userId: user.id,
        amount: CREDIT_COSTS.reading,
        reason: '사주 풀이 AI 실패 환불',
        kind: 'refund',
        referenceId: profile.id,
      }).catch(() => undefined);
      creditsSpent = false;
    }
    result = generateFallbackReading(saju, profile.name);
  }

  const admin = await createServerClient({ admin: true });
  const { error } = await admin.from('interpretations').upsert(
    {
      saju_id: profile.id,
      category: READING_CATEGORY,
      persona: READING_PERSONA,
      content: result.content,
      model: result.model,
      tokens_used: result.tokensUsed,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'saju_id,category,persona' },
  );
  if (error) {
    logger.error('interpretations/regenerate', 'cache save failed', {
      userId: user.id,
      message: error.message,
    });
    if (creditsSpent)
      await addCredits({
        userId: user.id,
        amount: CREDIT_COSTS.reading,
        reason: '사주 풀이 저장 실패 환불',
        kind: 'refund',
        referenceId: profile.id,
      }).catch(() => undefined);
  }

  return NextResponse.json({
    content: result.content,
    cached: !error,
    model: result.model,
  });
}
