import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createServerClient } from '@/lib/supabase/server';
import { serverAppOrigin } from '@/lib/app-url';

export const runtime = 'nodejs';

// Create a 궁합 초대 link tied to the host's self saju.
export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: self } = await supabase
    .from('saju_profiles')
    .select('id, name')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle();
  if (!self) return NextResponse.json({ error: 'no_self_profile' }, { status: 400 });

  // Reuse a recent pending invite if one exists (avoid token spam).
  const { data: existing } = await supabase
    .from('relation_invites')
    .select('token, expires_at')
    .eq('host_user_id', user.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let token = existing?.token;
  if (!token) {
    token = randomBytes(12).toString('base64url');
    const { error } = await supabase.from('relation_invites').insert({
      token,
      host_user_id: user.id,
      host_saju_id: self.id,
      status: 'pending',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const url = `${serverAppOrigin()}/invite/${token}`;
  return NextResponse.json({ token, url, hostName: self.name });
}

// List host's invites (for the relations screen).
export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('relation_invites')
    .select('token, status, guest_name, created_at, completed_at')
    .eq('host_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  return NextResponse.json({ invites: data ?? [] });
}
