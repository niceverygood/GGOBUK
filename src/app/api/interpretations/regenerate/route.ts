import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { buildSajuResult } from '@/lib/saju';
import {
  INTERPRETATION_CATEGORIES,
  generateFallbackInterpretation,
  generateInterpretation,
} from '@/lib/llm/interpret';
import { CREDIT_COSTS } from '@/lib/credits';
import {
  addCredits,
  isInsufficientCreditsError,
  spendCredits,
} from '@/lib/credits/server';
import type { InterpretationCategory, SajuProfileRow } from '@/types/db';

const Body = z.object({
  category: z.string(),
  focus: z.string().max(300).optional(),
});

export const runtime = 'nodejs';
export const maxDuration = 90;

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { category, focus } = Body.parse(await req.json());
  const cat = INTERPRETATION_CATEGORIES.find((item) => item.key === category);
  if (!cat)
    return NextResponse.json({ error: 'unknown_category' }, { status: 400 });

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle<SajuProfileRow>();
  if (!profile)
    return NextResponse.json({ error: 'no profile' }, { status: 404 });

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
      amount: CREDIT_COSTS.interpretation,
      reason: `사주 해설 ${focus ? '심화 ' : ''}생성:${category}`,
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
    console.warn('[interpretations/regenerate] credit spend skipped', {
      userId: user.id,
      category,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  let result;
  try {
    result = await generateInterpretation(
      saju,
      category as InterpretationCategory,
      profile.name,
      focus,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    console.error('[interpretations/regenerate] llm failed; using fallback', {
      userId: user.id,
      category,
      message: msg,
    });
    if (creditsSpent) {
      await addCredits({
        userId: user.id,
        amount: CREDIT_COSTS.interpretation,
        reason: `사주 해설 AI 실패 환불:${category}`,
        kind: 'refund',
        referenceId: profile.id,
      }).catch(() => undefined);
      creditsSpent = false;
    }
    if (
      msg.includes('OPENROUTER_API_KEY') ||
      msg.includes('ANTHROPIC_API_KEY')
    ) {
      result = generateFallbackInterpretation(
        saju,
        category as InterpretationCategory,
        profile.name,
        focus,
      );
    } else {
      result = generateFallbackInterpretation(
        saju,
        category as InterpretationCategory,
        profile.name,
        focus,
      );
    }
  }

  const admin = await createServerClient({ admin: true });
  const { error } = await admin.from('interpretations').upsert(
    {
      saju_id: profile.id,
      category,
      content: result.content,
      model: result.model,
      tokens_used: result.tokensUsed,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'saju_id,category' },
  );
  if (error) {
    console.error('[interpretations/regenerate] cache save failed', {
      userId: user.id,
      category,
      message: error.message,
    });
  }
  if (error && creditsSpent)
    await addCredits({
      userId: user.id,
      amount: CREDIT_COSTS.interpretation,
      reason: `사주 해설 저장 실패 환불:${category}`,
      kind: 'refund',
      referenceId: profile.id,
    }).catch(() => undefined);

  return NextResponse.json({
    content: result.content,
    cached: !error,
    model: result.model,
  });
}
