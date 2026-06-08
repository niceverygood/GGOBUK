import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { addCredits } from '@/lib/credits/server';
import { iapGrantForProduct } from '@/lib/iap/products';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

// RevenueCat → 우리 서버 웹훅.
//
// 결제·영수증 검증은 RevenueCat 이 애플/구글과 직접 끝낸 뒤 이벤트로 통지한다.
// 우리는 (1) Authorization 헤더로 발신자 인증, (2) 소비성 구매
// (NON_RENEWING_PURCHASE) 이벤트에서 product id → 꼬북알 환산,
// (3) 스토어 transaction 단위 멱등 보장 후 addCredits 로 지급한다.
//
// 클라이언트가 잔액을 직접 못 올리고 반드시 이 웹훅을 거치게 해서 위변조를 막는다.
// RevenueCat 대시보드: Project → Integrations → Webhooks 에 이 URL 과
// Authorization header 값(= REVENUECAT_WEBHOOK_AUTH)을 등록한다.

// RevenueCat webhook event 의 우리가 쓰는 필드만 추린 최소 타입.
interface RevenueCatEvent {
  type?: string;
  app_user_id?: string;
  product_id?: string;
  store?: string;
  transaction_id?: string;
  id?: string;
  environment?: string;
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected || auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let event: RevenueCatEvent | undefined;
  try {
    const payload = (await req.json()) as { event?: RevenueCatEvent };
    event = payload?.event;
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }
  if (!event) return NextResponse.json({ ok: true, skipped: 'no_event' });

  const type = event.type ?? '';
  // 소비성 꼬북알만 처리한다(구독은 추후 INITIAL_PURCHASE/RENEWAL 로 확장).
  if (type !== 'NON_RENEWING_PURCHASE') {
    return NextResponse.json({ ok: true, skipped: type || 'unknown_type' });
  }

  const appUserId = event.app_user_id;
  const productId = event.product_id;
  const store = event.store ?? 'UNKNOWN';
  const txId = event.transaction_id ?? event.id;

  if (!appUserId || !productId || !txId) {
    logger.warn('revenuecat/webhook', 'missing fields', {
      appUserId,
      productId,
      txId,
    });
    return NextResponse.json({ ok: true, skipped: 'missing_fields' });
  }

  const grant = iapGrantForProduct(productId);
  if (!grant) {
    logger.warn('revenuecat/webhook', 'unknown product', { productId });
    return NextResponse.json({ ok: true, skipped: 'unknown_product' });
  }

  const admin = await createServerClient({ admin: true });
  const orderId = `rc_${store}_${txId}`;
  const methodType =
    store === 'APP_STORE'
      ? 'APPLE_IAP'
      : store === 'PLAY_STORE'
        ? 'GOOGLE_IAP'
        : 'IAP';

  // 멱등 lock: 같은 transaction 으로 이미 처리됐으면(unique 충돌) 재지급 금지.
  const { error: insertErr } = await admin.from('credit_purchases').insert({
    user_id: appUserId,
    partner_order_id: orderId,
    package_id: grant.packageId,
    credits: grant.totalCredits,
    bonus_credits: 0,
    amount: grant.priceKrw,
    status: 'paid',
    approved_at: new Date().toISOString(),
    payment_method_type: methodType,
  });

  if (insertErr) {
    if (insertErr.code === '23505') {
      // unique_violation = 중복 웹훅(재시도). 이미 지급됨.
      return NextResponse.json({ ok: true, deduped: true });
    }
    logger.error('revenuecat/webhook', 'purchase insert failed', {
      message: insertErr.message,
    });
    return NextResponse.json({ error: 'db' }, { status: 500 });
  }

  try {
    await addCredits({
      userId: appUserId,
      amount: grant.totalCredits,
      reason: `인앱결제 꼬북알 충전:${grant.label}`,
      kind: 'purchase',
      referenceId: orderId,
      packageId: grant.packageId,
      priceKrw: grant.priceKrw,
    });
  } catch (e) {
    // 지급 실패 → lock row 삭제해 RevenueCat 웹훅 재시도가 깨끗하게 재처리되게.
    await admin
      .from('credit_purchases')
      .delete()
      .eq('partner_order_id', orderId);
    logger.error('revenuecat/webhook', 'addCredits failed', {
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: 'grant_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, credited: grant.totalCredits });
}
