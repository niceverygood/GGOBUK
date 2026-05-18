import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CREDIT_COSTS } from '@/lib/credits';
import {
  addCredits,
  isInsufficientCreditsError,
  spendCredits,
} from '@/lib/credits/server';
import { generateTalismanImage } from '@/lib/llm/talisman';
import { buildSajuResult } from '@/lib/saju';
import { createServerClient } from '@/lib/supabase/server';
import { INTERPRETATION_CATEGORIES } from '@/lib/llm/interpret';
import type { InterpretationCategory, SajuProfileRow } from '@/types/db';

const Body = z.object({
  category: z.string(),
});

export const runtime = 'nodejs';
export const maxDuration = 90;

function errorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'openai_not_configured') return 'openai_not_configured';
  if (message === 'openai_image_empty') return 'openai_image_empty';
  return 'openai_image_failed';
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { category } = Body.parse(await req.json());
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

  try {
    await spendCredits({
      userId: user.id,
      amount: CREDIT_COSTS.talisman,
      reason: `부적 이미지 생성:${category}`,
      referenceId: profile.id,
    });
  } catch (e) {
    if (isInsufficientCreditsError(e)) {
      return NextResponse.json(
        { error: 'insufficient_credits' },
        { status: 402 },
      );
    }
    throw e;
  }

  try {
    const result = await generateTalismanImage({
      saju,
      category: category as InterpretationCategory,
      name: profile.name,
    });
    return NextResponse.json(result);
  } catch (e) {
    await addCredits({
      userId: user.id,
      amount: CREDIT_COSTS.talisman,
      reason: `부적 이미지 생성 실패 환불:${category}`,
      kind: 'refund',
      referenceId: profile.id,
    }).catch(() => undefined);

    console.error('[talismans/generate] failed', {
      userId: user.id,
      category,
      message: e instanceof Error ? e.message : String(e),
    });

    return NextResponse.json({ error: errorCode(e) }, { status: 500 });
  }
}
