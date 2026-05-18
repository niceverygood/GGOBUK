import { createServerClient } from '@/lib/supabase/server';

export class InsufficientCreditsError extends Error {
  constructor() {
    super('insufficient_credits');
    this.name = 'InsufficientCreditsError';
  }
}

function isInsufficientMessage(message: string): boolean {
  return message.toLowerCase().includes('insufficient_credits');
}

export function isInsufficientCreditsError(error: unknown): boolean {
  return (
    error instanceof InsufficientCreditsError ||
    (error instanceof Error && isInsufficientMessage(error.message))
  );
}

export async function spendCredits(params: {
  userId: string;
  amount: number;
  reason: string;
  referenceId?: string;
}): Promise<number> {
  const admin = await createServerClient({ admin: true });
  const { data, error } = await admin.rpc('spend_credits', {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_reason: params.reason,
    p_reference_id: params.referenceId ?? null,
  });

  if (error) {
    if (isInsufficientMessage(error.message))
      throw new InsufficientCreditsError();
    throw new Error(error.message);
  }

  return Number(data ?? 0);
}

export async function addCredits(params: {
  userId: string;
  amount: number;
  reason: string;
  kind?: 'purchase' | 'refund' | 'bonus';
  referenceId?: string;
  kakaoTid?: string;
  packageId?: string;
  priceKrw?: number;
}): Promise<number> {
  const admin = await createServerClient({ admin: true });
  const { data, error } = await admin.rpc('add_credits', {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_reason: params.reason,
    p_kind: params.kind ?? 'purchase',
    p_reference_id: params.referenceId ?? null,
    p_kakao_tid: params.kakaoTid ?? null,
    p_package_id: params.packageId ?? null,
    p_price_krw: params.priceKrw ?? null,
  });

  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}
