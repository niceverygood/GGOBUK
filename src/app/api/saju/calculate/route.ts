import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { buildSajuResult } from '@/lib/saju';

const Body = z.object({
  name: z.string().min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isLunar: z.boolean(),
  isLeapMonth: z.boolean().optional(),
  gender: z.enum(['M', 'F']),
  relationType: z.enum(['self', 'family', 'friend', 'lover', 'colleague', 'other']).default('self'),
  relationLabel: z.string().optional(),
});

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'invalid_body', detail: String(e) }, { status: 400 });
  }

  const saju = buildSajuResult({
    birthDate: body.birthDate,
    birthTime: body.birthTime,
    isLunar: body.isLunar,
    isLeapMonth: body.isLeapMonth,
    gender: body.gender,
  });

  const { data, error } = await supabase
    .from('saju_profiles')
    .insert({
      owner_id: user.id,
      name: body.name,
      birth_date: body.birthDate,
      birth_time: body.birthTime ?? null,
      is_lunar: body.isLunar,
      is_leap_month: body.isLeapMonth ?? false,
      gender: body.gender,
      relation_type: body.relationType,
      relation_label: body.relationLabel ?? null,
      palja: saju.palja,
      ohaeng_count: saju.ohaengCount,
      sipsung: saju.sipsung,
      sinsal: saju.sinsal,
      daewoon: saju.daewoon,
      ilgan: saju.ilgan,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saju: data });
}
