import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { payReady } from '@/lib/kakao/pay';

const Body = z.object({ plan: z.enum(['monthly', 'yearly']) });

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { plan } = Body.parse(await req.json());
  const amount = plan === 'monthly' ? 7900 : 79000;
  const partnerOrderId = `kkobuk_${user.id.slice(0, 8)}_${Date.now()}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  const data = await payReady({
    partnerOrderId,
    partnerUserId: user.id,
    itemName: plan === 'monthly' ? '꼬북점 Pro 월간' : '꼬북점 Pro 연간',
    totalAmount: amount,
    approvalUrl: `${baseUrl}/api/payment/kakao/approve?order=${partnerOrderId}&plan=${plan}&tid_placeholder=true`,
    cancelUrl: `${baseUrl}/more/pro?cancelled=1`,
    failUrl: `${baseUrl}/more/pro?failed=1`,
  });

  const admin = await createServerClient({ admin: true });
  await admin.from('subscriptions').insert({
    user_id: user.id,
    kakao_sid: data.tid,
    plan,
    status: 'pending',
    amount,
  });

  return NextResponse.json({
    redirectUrl: data.next_redirect_pc_url,
    redirectMobileUrl: data.next_redirect_mobile_url,
    tid: data.tid,
  });
}
