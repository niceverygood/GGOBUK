import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('relations')
    .select(
      `
      id,
      compatibility,
      saju_b:saju_profiles!relations_saju_b_id_fkey ( id, name, ilgan, relation_type, relation_label, palja )
    `,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ relations: data });
}
