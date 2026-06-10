import { NextResponse } from 'next/server';
import { JWT } from 'google-auth-library';
import { createServerClient } from '@/lib/supabase/server';
import { addCredits } from '@/lib/credits/server';
import { iapGrantForProduct } from '@/lib/iap/products';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

// 네이티브 인앱결제 영수증 검증 + 꼬북알 지급 (직접 구현, 외부 SaaS 미사용).
//
// 클라이언트(cordova-plugin-purchase)가 결제 승인 직후 영수증을 보내면:
//  1. 세션 사용자 확인(지급 대상은 항상 "로그인된 본인" — 클라가 지정 불가)
//  2. 스토어에 영수증 진위 검증
//     - Google: Play Developer API purchases.products.get (서비스 계정)
//     - Apple : verifyReceipt (프로덕션 → 21007 시 샌드박스 폴백)
//  3. 스토어 트랜잭션 단위 멱등 lock(credit_purchases.partner_order_id unique)
//  4. addCredits 지급
// 클라이언트는 이 응답이 ok 일 때만 finish()(소비)한다.
//
// 필요 env:
//  - GOOGLE_PLAY_SA_KEY_BASE64: Play Developer API 권한 있는 GCP 서비스 계정
//    JSON 키를 base64 인코딩한 값
//  - APPLE_SHARED_SECRET: App Store Connect → 앱 내 구입 공유 암호 (선택이지만 권장)

const PACKAGE_NAME = 'com.niceverygood.ggobuk';

interface VerifyBody {
  platform?: 'google' | 'apple';
  productId?: string;
  /** Google: Play Billing purchaseToken */
  purchaseToken?: string;
  /** Google: GPA.XXXX 주문번호 (멱등키 보조) */
  orderId?: string;
  /** Apple: StoreKit transactionIdentifier */
  transactionId?: string;
  /** Apple: base64 app store receipt */
  receipt?: string;
}

async function verifyGoogle(
  productId: string,
  purchaseToken: string,
): Promise<{ ok: boolean; reason?: string; orderId?: string }> {
  const b64 = process.env.GOOGLE_PLAY_SA_KEY_BASE64;
  if (!b64) return { ok: false, reason: 'sa_key_not_configured' };
  const key = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as {
    client_email: string;
    private_key: string;
  };
  const jwt = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const { token } = await jwt.getAccessToken();
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}` +
    `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { ok: false, reason: `google_http_${res.status}` };
  const data = (await res.json()) as {
    purchaseState?: number;
    orderId?: string;
  };
  // purchaseState: 0=구매완료, 1=취소, 2=보류
  if (data.purchaseState !== 0) return { ok: false, reason: 'not_purchased' };
  return { ok: true, orderId: data.orderId };
}

interface AppleInApp {
  product_id?: string;
  transaction_id?: string;
}

async function appleVerifyCall(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as {
    status: number;
    receipt?: { in_app?: AppleInApp[] };
  };
}

async function verifyApple(
  receipt: string,
  transactionId: string,
  productId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const body = {
    'receipt-data': receipt,
    password: process.env.APPLE_SHARED_SECRET,
    'exclude-old-transactions': false,
  };
  let data = await appleVerifyCall(
    'https://buy.itunes.apple.com/verifyReceipt',
    body,
  );
  // 21007 = 샌드박스 영수증을 프로덕션에 보냄 → 샌드박스로 재시도 (심사관 결제 포함)
  if (data.status === 21007) {
    data = await appleVerifyCall(
      'https://sandbox.itunes.apple.com/verifyReceipt',
      body,
    );
  }
  if (data.status !== 0) return { ok: false, reason: `apple_${data.status}` };
  const found = (data.receipt?.in_app ?? []).some(
    (t) => t.transaction_id === transactionId && t.product_id === productId,
  );
  if (!found) return { ok: false, reason: 'tx_not_in_receipt' };
  return { ok: true };
}

export async function POST(req: Request) {
  // 지급 대상은 항상 세션 사용자 — 요청 body 의 어떤 값도 대상 결정에 못 쓴다.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const productId = body.productId ?? '';
  const grant = iapGrantForProduct(productId);
  if (!grant) {
    return NextResponse.json({ error: 'unknown_product' }, { status: 400 });
  }

  let dedupKey: string;
  let methodType: string;
  if (body.platform === 'google') {
    if (!body.purchaseToken) {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 });
    }
    const v = await verifyGoogle(productId, body.purchaseToken);
    if (!v.ok) {
      logger.warn('iap/verify', 'google verify failed', { reason: v.reason });
      return NextResponse.json({ error: v.reason }, { status: 400 });
    }
    // orderId 우선(사람이 추적 가능), 없으면 purchaseToken 으로 멱등.
    dedupKey = `gp_${v.orderId ?? body.orderId ?? body.purchaseToken.slice(0, 64)}`;
    methodType = 'GOOGLE_IAP';
  } else if (body.platform === 'apple') {
    if (!body.receipt || !body.transactionId) {
      return NextResponse.json({ error: 'missing_receipt' }, { status: 400 });
    }
    const v = await verifyApple(body.receipt, body.transactionId, productId);
    if (!v.ok) {
      logger.warn('iap/verify', 'apple verify failed', { reason: v.reason });
      return NextResponse.json({ error: v.reason }, { status: 400 });
    }
    dedupKey = `as_${body.transactionId}`;
    methodType = 'APPLE_IAP';
  } else {
    return NextResponse.json({ error: 'bad_platform' }, { status: 400 });
  }

  // 멱등 lock: 같은 스토어 트랜잭션이면(unique 충돌) 재지급 없이 ok 반환 —
  // 클라이언트가 안심하고 finish()(소비) 재시도할 수 있게 한다.
  const admin = await createServerClient({ admin: true });
  const { error: insertErr } = await admin.from('credit_purchases').insert({
    user_id: user.id,
    partner_order_id: dedupKey,
    // credit_purchases.kakao_tid 는 레거시 KakaoPay 기준 NOT NULL. IAP 결제엔 스토어
    // 트랜잭션 id(dedupKey: gp_/as_)를 넣어 제약을 만족(컬럼 nullable 여부와 무관하게 통과).
    kakao_tid: dedupKey,
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
      return NextResponse.json({ ok: true, deduped: true });
    }
    logger.error('iap/verify', 'purchase insert failed', {
      message: insertErr.message,
    });
    return NextResponse.json({ error: 'db' }, { status: 500 });
  }

  try {
    await addCredits({
      userId: user.id,
      amount: grant.totalCredits,
      reason: `인앱결제 꼬북알 충전:${grant.label}`,
      kind: 'purchase',
      referenceId: dedupKey,
      packageId: grant.packageId,
      priceKrw: grant.priceKrw,
    });
  } catch (e) {
    // 지급 실패 → lock 해제해 클라이언트 재시도가 깨끗하게 재처리되게.
    await admin
      .from('credit_purchases')
      .delete()
      .eq('partner_order_id', dedupKey);
    logger.error('iap/verify', 'addCredits failed', {
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: 'grant_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, credited: grant.totalCredits });
}
