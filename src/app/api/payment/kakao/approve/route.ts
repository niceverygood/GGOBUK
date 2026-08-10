import { NextResponse, after } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { payApprove } from '@/lib/kakao/pay';
import { creditPackageById, totalCredits } from '@/lib/credits';
import { addCredits } from '@/lib/credits/server';
import { recordEvent } from '@/lib/analytics/events';
import { sendFbCapiEvent, parseFbCookies } from '@/lib/analytics/fb';

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
    return NextResponse.redirect(new URL('/store?failed=1', req.url));
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
    return NextResponse.redirect(new URL('/store?failed=1', req.url));
  const pkg = creditPackageById(String(pending.package_id));
  if (!pkg || pkg.id !== requestedPackage.id) {
    return NextResponse.redirect(new URL('/store?failed=1', req.url));
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
      reason: '카카오페이 꼬북알 충전',
      referenceId: pending.id,
      kakaoTid: pending.kakao_tid,
      packageId: pkg.id,
      priceKrw: pkg.priceKrw,
    });

    // 결제 전환 신호 — 매출 이벤트라 가장 중요. 서버 CAPI(유실 적음) + 분석 로그.
    // 같은 event_id(pending.id)를 success 페이지의 브라우저 픽셀에도 넘겨 dedup.
    const cookieHeader = req.headers.get('cookie');
    const userAgent = req.headers.get('user-agent');
    const ip =
      (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      undefined;
    const email = user.email;
    const amount = pending.amount;
    after(async () => {
      await recordEvent({
        event: 'purchase',
        userId: user.id,
        valueKrw: amount,
        props: {
          package_id: pkg.id,
          credits: totalCredits(pkg),
          purchase_id: pending.id,
        },
      });
      await sendFbCapiEvent({
        eventName: 'Purchase',
        eventId: pending.id,
        eventSourceUrl: req.url,
        user: {
          email,
          externalId: user.id,
          clientUserAgent: userAgent,
          clientIpAddress: ip,
          ...parseFbCookies(cookieHeader),
        },
        custom: {
          value: amount,
          currency: 'KRW',
          contentName: pkg.id,
          contentIds: [pkg.id],
          numItems: 1,
        },
      });
    });

    return NextResponse.redirect(
      new URL(
        `/store?success=1&credits=${totalCredits(pkg)}&pid=${pending.id}&amt=${amount}`,
        req.url,
      ),
    );
  } catch {
    await admin
      .from('credit_purchases')
      .update({ status: 'failed' })
      .eq('id', pending.id);
    return NextResponse.redirect(new URL('/store?failed=1', req.url));
  }
}
