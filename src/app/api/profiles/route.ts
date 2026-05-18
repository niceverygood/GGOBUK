import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildSajuProfilePayload } from '@/lib/saju/profile_payload';
import { createServerClient } from '@/lib/supabase/server';
import type { SajuProfileRow } from '@/types/db';

const ProfileBody = z.object({
  name: z.string().min(1).max(40),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  isLunar: z.boolean(),
  isLeapMonth: z.boolean().optional().nullable(),
  gender: z.enum(['M', 'F']),
  relationType: z
    .enum(['self', 'family', 'friend', 'lover', 'colleague', 'other'])
    .default('other'),
  relationLabel: z.string().max(40).optional().nullable(),
});

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('saju_profiles')
    .select(
      'id, name, birth_date, birth_time, is_lunar, is_leap_month, gender, relation_type, relation_label, created_at, updated_at, ilgan, palja',
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .returns<SajuProfileRow[]>();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const profiles = [...(data ?? [])].sort((a, b) => {
    if (a.relation_type === 'self') return -1;
    if (b.relation_type === 'self') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return NextResponse.json({ profiles });
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof ProfileBody>;
  try {
    body = ProfileBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid_body', detail: String(e) },
      { status: 400 },
    );
  }

  const { data: selfProfile } = await supabase
    .from('saju_profiles')
    .select('id')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle<{ id: string }>();

  if (body.relationType === 'self' && selfProfile) {
    return NextResponse.json({ error: 'self_exists' }, { status: 409 });
  }

  const { data: profile, error } = await supabase
    .from('saju_profiles')
    .insert({
      owner_id: user.id,
      ...buildSajuProfilePayload(body),
    })
    .select()
    .single<SajuProfileRow>();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  if (profile.relation_type !== 'self' && selfProfile) {
    const { error: relationError } = await supabase.from('relations').upsert(
      {
        user_id: user.id,
        saju_a_id: selfProfile.id,
        saju_b_id: profile.id,
        compatibility: null,
      },
      { onConflict: 'saju_a_id,saju_b_id' },
    );

    if (relationError)
      return NextResponse.json(
        { error: relationError.message },
        { status: 500 },
      );
  }

  return NextResponse.json({ profile });
}
