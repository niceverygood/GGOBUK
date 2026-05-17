import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { buildSajuResult } from '@/lib/saju';
import {
  INTERPRETATION_CATEGORIES,
  generateInterpretation,
} from '@/lib/llm/interpret';
import type { InterpretationCategory, SajuProfileRow } from '@/types/db';

const Body = z.object({
  category: z.string(),
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

  const { data: userRow } = await supabase
    .from('users')
    .select('is_pro')
    .eq('id', user.id)
    .single();
  const catIdx = INTERPRETATION_CATEGORIES.findIndex(
    (item) => item.key === category,
  );
  if (!userRow?.is_pro && catIdx >= 3)
    return NextResponse.json({ error: 'pro_only' }, { status: 402 });

  const saju = buildSajuResult({
    birthDate: profile.birth_date,
    birthTime: profile.birth_time ?? undefined,
    isLunar: profile.is_lunar,
    isLeapMonth: profile.is_leap_month,
    gender: profile.gender,
  });

  let result;
  try {
    result = await generateInterpretation(
      saju,
      category as InterpretationCategory,
      profile.name,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (
      msg.includes('OPENROUTER_API_KEY') ||
      msg.includes('ANTHROPIC_API_KEY')
    ) {
      return NextResponse.json(
        { error: 'llm_not_configured' },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: msg || 'interpretation failed' },
      { status: 500 },
    );
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
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ content: result.content });
}
