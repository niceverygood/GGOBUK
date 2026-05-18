import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { serverAppOrigin } from '@/lib/app-url';
import { payReady } from '@/lib/kakao/pay';
import { creditPackageById, totalCredits } from '@/lib/credits';

const Body = z.object({
  packageId: z.enum(['starter', 'focus', 'deep', 'master']),
});

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { packageId } = Body.parse(await req.json());
  const pkg = creditPackageById(packageId);
  if (!pkg)
    return NextResponse.json({ error: 'unknown_package' }, { status: 400 });

  const partnerOrderId = `kkobuk_credit_${user.id.slice(0, 8)}_${Date.now()}`;
  const baseUrl = serverAppOrigin();

  const data = await payReady({
    partnerOrderId,
    partnerUserId: user.id,
    itemName: `꼬북점 꼬북알 ${totalCredits(pkg)}개`,
    totalAmount: pkg.priceKrw,
    approvalUrl: `${baseUrl}/api/payment/kakao/approve?order=${partnerOrderId}&package=${pkg.id}`,
    cancelUrl: `${baseUrl}/more/pro?cancelled=1`,
    failUrl: `${baseUrl}/more/pro?failed=1`,
  });

  const admin = await createServerClient({ admin: true });
  await admin.from('credit_purchases').insert({
    user_id: user.id,
    partner_order_id: partnerOrderId,
    kakao_tid: data.tid,
    package_id: pkg.id,
    credits: pkg.credits,
    bonus_credits: pkg.bonusCredits,
    status: 'pending',
    amount: pkg.priceKrw,
  });

  return NextResponse.json({
    redirectUrl: data.next_redirect_pc_url,
    redirectMobileUrl: data.next_redirect_mobile_url,
    tid: data.tid,
  });
}
