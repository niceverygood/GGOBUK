import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ profile: null });
  const { data } = await supabase
    .from('saju_profiles')
    .select('id, name, ilgan, palja, ohaeng_count')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle();
  return NextResponse.json({ profile: data });
}
