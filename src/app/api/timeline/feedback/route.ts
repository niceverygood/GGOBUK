import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Body = z.object({
  daewoonStartYear: z.number().int(),
  coldreadText: z.string(),
  feedback: z.enum(['correct', 'wrong', 'partial']),
});

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = Body.parse(await req.json());

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('id')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: 'no profile' }, { status: 404 });

  const { error } = await supabase.from('timeline_feedback').insert({
    user_id: user.id,
    saju_id: profile.id,
    daewoon_start_year: body.daewoonStartYear,
    coldread_text: body.coldreadText,
    feedback: body.feedback,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
