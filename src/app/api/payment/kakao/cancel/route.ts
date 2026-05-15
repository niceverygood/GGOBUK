import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { paySubscriptionInactivate } from '@/lib/kakao/pay';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = await createServerClient({ admin: true });
  const { data: sub } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) return NextResponse.json({ error: 'no active subscription' }, { status: 404 });

  try {
    await paySubscriptionInactivate(sub.kakao_sid);
  } catch (e) {
    return NextResponse.json({ error: 'kakao_cancel_failed', detail: String(e) }, { status: 500 });
  }

  await admin
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', sub.id);

  // Pro access continues until expires_at.
  return NextResponse.json({ ok: true });
}
