import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { buildSajuResult } from '@/lib/saju';
import { generateCompat } from '@/lib/llm/compat';
import type { SajuProfileRow } from '@/types/db';

const Body = z.object({
  saju_b_id: z.string().uuid(),
  relation_label: z.string().optional(),
});

export const runtime = 'nodejs';
export const maxDuration = 60;

function rowToSajuInput(row: SajuProfileRow) {
  return buildSajuResult({
    birthDate: row.birth_date,
    birthTime: row.birth_time ?? undefined,
    isLunar: row.is_lunar,
    isLeapMonth: row.is_leap_month,
    gender: row.gender,
  });
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = Body.parse(await req.json());

  const { data: selfProfile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle<SajuProfileRow>();
  if (!selfProfile) return NextResponse.json({ error: 'no self profile' }, { status: 404 });

  const { data: otherProfile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('id', body.saju_b_id)
    .eq('owner_id', user.id)
    .maybeSingle<SajuProfileRow>();
  if (!otherProfile) return NextResponse.json({ error: 'other not found' }, { status: 404 });

  const sajuA = rowToSajuInput(selfProfile);
  const sajuB = rowToSajuInput(otherProfile);

  const result = await generateCompat({
    sajuA,
    sajuB,
    nameA: selfProfile.name,
    nameB: otherProfile.name,
    relationLabel: body.relation_label ?? otherProfile.relation_label ?? undefined,
  });

  // Upsert the relation edge
  const { data: existing } = await supabase
    .from('relations')
    .select('id')
    .eq('saju_a_id', selfProfile.id)
    .eq('saju_b_id', otherProfile.id)
    .maybeSingle();
  if (existing) {
    await supabase.from('relations').update({ compatibility: result }).eq('id', existing.id);
  } else {
    await supabase.from('relations').insert({
      user_id: user.id,
      saju_a_id: selfProfile.id,
      saju_b_id: otherProfile.id,
      compatibility: result,
    });
  }

  return NextResponse.json({ result });
}
