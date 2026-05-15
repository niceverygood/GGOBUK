import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ user: null });
  const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
  return NextResponse.json({ user: data });
}
