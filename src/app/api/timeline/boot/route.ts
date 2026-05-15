import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { DaewoonPeriod } from '@/lib/saju/types';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: userRow } = await supabase.from('users').select('is_pro').eq('id', user.id).single();
  if (!userRow?.is_pro) return NextResponse.json({ error: 'pro_only' }, { status: 402 });

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('daewoon')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: 'no profile' }, { status: 404 });

  return NextResponse.json({ isPro: true, daewoon: (profile.daewoon ?? []) as DaewoonPeriod[] });
}
