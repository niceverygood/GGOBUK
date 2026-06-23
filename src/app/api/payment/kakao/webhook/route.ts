import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface KakaoSubsEvent {
  sid: string;
  status: 'SUCCESS' | 'FAIL' | 'CANCELLED' | string;
  approved_at?: string;
  amount?: { total: number };
}

/**
 * Verify Kakao Pay webhook HMAC-SHA256 signature.
 * Kakao sends the signature in the `Kakao-Signature` header.
 * The secret key is provided per CID in the Kakao partner dashboard.
 */
async function verifySignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  const secret = process.env.KAKAO_PAY_SECRET_KEY;
  // fail-closed: 시크릿 미설정이면 환경 무관하게 거부 (dev/preview 위조 웹훅으로 Pro 무단 부여 방지).
  if (!secret) return false;
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const computed = Buffer.from(sig).toString('base64');
  // Constant-time comparison
  if (computed.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('Kakao-Signature');

  if (!(await verifySignature(rawBody, signature))) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 403 });
  }

  const body = JSON.parse(rawBody) as KakaoSubsEvent;
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
