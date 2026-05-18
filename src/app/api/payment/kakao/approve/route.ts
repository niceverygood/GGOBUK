import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { payApprove } from '@/lib/kakao/pay';
import { creditPackageById, totalCredits } from '@/lib/credits';
import { addCredits } from '@/lib/credits/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const url = new URL(req.url);
  const partnerOrderId = url.searchParams.get('order');
  const packageId = url.searchParams.get('package') ?? '';
  const requestedPackage = creditPackageById(packageId);
  const pgToken = url.searchParams.get('pg_token');
  if (!partnerOrderId || !pgToken || !requestedPackage) {
    return NextResponse.redirect(new URL('/more/pro?failed=1', req.url));
  }

  const admin = await createServerClient({ admin: true });

  const { data: pending } = await admin
    .from('credit_purchases')
    .select('*')
    .eq('user_id', user.id)
    .eq('partner_order_id', partnerOrderId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!pending)
    return NextResponse.redirect(new URL('/more/pro?failed=1', req.url));
  const pkg = creditPackageById(String(pending.package_id));
  if (!pkg || pkg.id !== requestedPackage.id) {
    return NextResponse.redirect(new URL('/more/pro?failed=1', req.url));
  }

  try {
    const result = await payApprove({
      tid: pending.kakao_tid,
      partnerOrderId,
      partnerUserId: user.id,
      pgToken,
      totalAmount: pending.amount,
    });

    await admin
      .from('credit_purchases')
      .update({
        status: 'paid',
        approved_at: new Date().toISOString(),
        payment_method_type: result.payment_method_type,
      })
      .eq('id', pending.id);

    await addCredits({
      userId: user.id,
      amount: totalCredits(pkg),
      reason: '카카오페이 크래딧 충전',
      referenceId: pending.id,
      kakaoTid: pending.kakao_tid,
      packageId: pkg.id,
      priceKrw: pkg.priceKrw,
    });

    return NextResponse.redirect(
      new URL(`/more/pro?success=1&credits=${totalCredits(pkg)}`, req.url),
    );
  } catch {
    await admin
      .from('credit_purchases')
      .update({ status: 'failed' })
      .eq('id', pending.id);
    return NextResponse.redirect(new URL('/more/pro?failed=1', req.url));
  }
}
