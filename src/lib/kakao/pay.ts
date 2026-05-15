// Kakao Pay HTTP client.
// Test CID: TC0SUBSCRIPTION (정기결제 sandbox). Replace with prod CID after Kakao approval.

const BASE = 'https://kapi.kakao.com';

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
}): Promise<{ tid: string; next_redirect_mobile_url: string; next_redirect_pc_url: string }> {
  const form = new URLSearchParams({
    cid: process.env.KAKAO_PAY_CID ?? 'TC0SUBSCRIPTION',
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
  if (!res.ok) throw new Error(`Kakao pay ready failed: ${res.status} ${await res.text()}`);
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
    cid: process.env.KAKAO_PAY_CID ?? 'TC0SUBSCRIPTION',
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
  if (!res.ok) throw new Error(`Kakao pay approve failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function paySubscriptionStatus(sid: string): Promise<{ status: string; last_approved_at: string | null }> {
  const form = new URLSearchParams({
    cid: process.env.KAKAO_PAY_CID ?? 'TC0SUBSCRIPTION',
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
    cid: process.env.KAKAO_PAY_CID ?? 'TC0SUBSCRIPTION',
    sid,
  });
  const res = await fetch(`${BASE}/v1/payment/manage/subscription/inactive`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(`Kakao pay cancel failed: ${res.status}`);
}
