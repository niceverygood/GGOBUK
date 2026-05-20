// Kakao Pay HTTP client.
//
// CID configuration:
//   Test (sandbox):  TC0ONETIME / TC0SUBSCRIPTION — works without Kakao partner approval.
//   Production:      Set KAKAO_PAY_CID_ONETIME and KAKAO_PAY_CID_SUBSCRIPTION
//                    to the CIDs issued in the Kakao partner dashboard.
//
// In production, if CID is still TC0ONETIME, payments will succeed in sandbox mode only.

import { logger } from '@/lib/utils/logger';

const BASE = 'https://kapi.kakao.com';
const ONE_TIME_CID =
  process.env.KAKAO_PAY_CID_ONETIME ??
  (process.env.KAKAO_PAY_CID === 'TC0SUBSCRIPTION'
    ? 'TC0ONETIME'
    : process.env.KAKAO_PAY_CID) ??
  'TC0ONETIME';
const SUBSCRIPTION_CID =
  process.env.KAKAO_PAY_CID_SUBSCRIPTION ??
  process.env.KAKAO_PAY_CID ??
  'TC0SUBSCRIPTION';

if (
  process.env.NODE_ENV === 'production' &&
  (ONE_TIME_CID.startsWith('TC0') || SUBSCRIPTION_CID.startsWith('TC0'))
) {
  logger.warn('kakao/pay', 'Using test CID in production — payments will only work in sandbox mode', {
    oneTimeCid: ONE_TIME_CID,
    subscriptionCid: SUBSCRIPTION_CID,
  });
}

function authHeaders(): HeadersInit {
  const key = process.env.KAKAO_ADMIN_KEY;
  if (!key) throw new Error('KAKAO_ADMIN_KEY missing');
  return {
    Authorization: `KakaoAK ${key}`,
    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
  };
}

export async function payReady(params: {
  partnerOrderId: string;
  partnerUserId: string;
  itemName: string;
  totalAmount: number;
  approvalUrl: string;
  cancelUrl: string;
  failUrl: string;
}): Promise<{
  tid: string;
  next_redirect_mobile_url: string;
  next_redirect_pc_url: string;
}> {
  const form = new URLSearchParams({
    cid: ONE_TIME_CID,
    partner_order_id: params.partnerOrderId,
    partner_user_id: params.partnerUserId,
    item_name: params.itemName,
    quantity: '1',
    total_amount: String(params.totalAmount),
    tax_free_amount: '0',
    approval_url: params.approvalUrl,
    cancel_url: params.cancelUrl,
    fail_url: params.failUrl,
  });
  const res = await fetch(`${BASE}/v1/payment/ready`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok)
    throw new Error(
      `Kakao pay ready failed: ${res.status} ${await res.text()}`,
    );
  return res.json();
}

export async function payApprove(params: {
  tid: string;
  partnerOrderId: string;
  partnerUserId: string;
  pgToken: string;
  totalAmount: number;
}): Promise<{
  sid?: string;
  payment_method_type: string;
  amount: { total: number };
  created_at: string;
}> {
  const form = new URLSearchParams({
    cid: ONE_TIME_CID,
    tid: params.tid,
    partner_order_id: params.partnerOrderId,
    partner_user_id: params.partnerUserId,
    pg_token: params.pgToken,
    total_amount: String(params.totalAmount),
  });
  const res = await fetch(`${BASE}/v1/payment/approve`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok)
    throw new Error(
      `Kakao pay approve failed: ${res.status} ${await res.text()}`,
    );
  return res.json();
}

export async function paySubscriptionStatus(
  sid: string,
): Promise<{ status: string; last_approved_at: string | null }> {
  const form = new URLSearchParams({
    cid: SUBSCRIPTION_CID,
    sid,
  });
  const res = await fetch(`${BASE}/v1/payment/manage/subscription/status`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(`Kakao pay status failed: ${res.status}`);
  return res.json();
}

export async function paySubscriptionInactivate(sid: string): Promise<void> {
  const form = new URLSearchParams({
    cid: SUBSCRIPTION_CID,
    sid,
  });
  const res = await fetch(`${BASE}/v1/payment/manage/subscription/inactive`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(`Kakao pay cancel failed: ${res.status}`);
}
