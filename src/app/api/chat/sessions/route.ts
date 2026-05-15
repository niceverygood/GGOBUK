import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Body = z.object({
  persona: z.enum(['kkobuk', 'dosa', 'mudang', 'bosal']),
  saju_id: z.string().uuid().optional(),
  title: z.string().optional(),
});

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data });
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = Body.parse(await req.json());

  let sajuId = body.saju_id;
  if (!sajuId) {
    const { data: profile } = await supabase
      .from('saju_profiles')
      .select('id')
      .eq('owner_id', user.id)
      .eq('relation_type', 'self')
      .maybeSingle();
    if (!profile) return NextResponse.json({ error: 'no self profile' }, { status: 400 });
    sajuId = profile.id;
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: user.id,
      saju_id: sajuId,
      persona: body.persona,
      title: body.title ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}
