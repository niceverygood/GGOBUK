import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Kakao Pay sends subscription billing events here.
// Signature verification: in production, verify HMAC using the secret key Kakao provides.
// For now we accept payloads and update subscription expiry on success.
interface KakaoSubsEvent {
  sid: string;
  status: 'SUCCESS' | 'FAIL' | 'CANCELLED' | string;
  approved_at?: string;
  amount?: { total: number };
}

export async function POST(req: Request) {
  const body = (await req.json()) as KakaoSubsEvent;
  if (!body?.sid) return NextResponse.json({ error: 'bad_payload' }, { status: 400 });

  const admin = await createServerClient({ admin: true });

  const { data: sub } = await admin.from('subscriptions').select('*').eq('kakao_sid', body.sid).maybeSingle();
  if (!sub) return NextResponse.json({ ok: true, skipped: 'sid not tracked' });

  if (body.status === 'SUCCESS') {
    const now = new Date();
    const expires = new Date(now);
    if (sub.plan === 'monthly') expires.setMonth(expires.getMonth() + 1);
    else expires.setFullYear(expires.getFullYear() + 1);

    await admin
      .from('subscriptions')
      .update({
        status: 'active',
        expires_at: expires.toISOString(),
        next_billing_at: expires.toISOString(),
      })
      .eq('id', sub.id);

    await admin.from('users').update({ is_pro: true, pro_expires_at: expires.toISOString() }).eq('id', sub.user_id);
  } else if (body.status === 'FAIL' || body.status === 'CANCELLED') {
    await admin.from('subscriptions').update({ status: body.status === 'FAIL' ? 'failed' : 'cancelled' }).eq('id', sub.id);
    if (body.status === 'CANCELLED') {
      await admin.from('users').update({ is_pro: false }).eq('id', sub.user_id);
    }
  }

  return NextResponse.json({ ok: true });
}
