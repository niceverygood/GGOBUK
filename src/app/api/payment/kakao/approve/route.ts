import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { payApprove } from '@/lib/kakao/pay';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const url = new URL(req.url);
  const partnerOrderId = url.searchParams.get('order');
  const plan = (url.searchParams.get('plan') ?? 'monthly') as 'monthly' | 'yearly';
  const pgToken = url.searchParams.get('pg_token');
  if (!partnerOrderId || !pgToken) {
    return NextResponse.redirect(new URL('/more/pro?failed=1', req.url));
  }

  const admin = await createServerClient({ admin: true });

  const { data: pending } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!pending) return NextResponse.redirect(new URL('/more/pro?failed=1', req.url));

  try {
    const result = await payApprove({
      tid: pending.kakao_sid,
      partnerOrderId,
      partnerUserId: user.id,
      pgToken,
      totalAmount: pending.amount,
    });

    const now = new Date();
    const expires = new Date(now);
    if (plan === 'monthly') expires.setMonth(expires.getMonth() + 1);
    else expires.setFullYear(expires.getFullYear() + 1);

    await admin
      .from('subscriptions')
      .update({
        kakao_sid: result.sid ?? pending.kakao_sid,
        status: 'active',
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
        next_billing_at: expires.toISOString(),
      })
      .eq('id', pending.id);

    await admin.from('users').update({ is_pro: true, pro_expires_at: expires.toISOString() }).eq('id', user.id);

    return NextResponse.redirect(new URL('/more/pro?success=1', req.url));
  } catch {
    await admin.from('subscriptions').update({ status: 'failed' }).eq('id', pending.id);
    return NextResponse.redirect(new URL('/more/pro?failed=1', req.url));
  }
}
