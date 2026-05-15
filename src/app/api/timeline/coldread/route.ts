import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { buildSajuResult } from '@/lib/saju';
import { generateColdRead } from '@/lib/llm/coldread';

const Body = z.object({
  daewoonStartYear: z.number().int(),
});

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = Body.parse(await req.json());

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: 'no profile' }, { status: 404 });

  const saju = buildSajuResult({
    birthDate: profile.birth_date,
    birthTime: profile.birth_time ?? undefined,
    isLunar: profile.is_lunar,
    isLeapMonth: profile.is_leap_month,
    gender: profile.gender,
  });

  const period = saju.daewoon.find((d) => d.startYear === body.daewoonStartYear);
  if (!period) return NextResponse.json({ error: 'period not found' }, { status: 404 });

  const text = await generateColdRead({ saju, daewoon: period, name: profile.name });

  return NextResponse.json({ text });
}
