import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Body = z.object({
  enabled: z.boolean(),
  token: z.string().optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = Body.parse(await req.json());
  const update: Record<string, unknown> = { push_enabled: body.enabled };
  if (body.token) update.push_token = body.token;
  if (body.time) update.push_time = body.time;
  if (!body.enabled) update.push_token = null;

  const { error } = await supabase.from('users').update(update).eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
