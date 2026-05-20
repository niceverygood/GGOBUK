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

/**
 * Grant the new-user signup bonus (PRICING.md §4). Idempotent: relies on
 * grant_signup_bonus() in migration 5 which uses users.signup_bonus_granted
 * as a once-only flag. Safe to call from /api/test/bootstrap and from the
 * kakao OAuth callback — at most one of them will actually credit the
 * account. Falls back to a no-op (returns null) when the RPC is not yet
 * deployed on the connected Supabase project so production stays alive.
 */
export async function grantSignupBonusIfNeeded(
  userId: string,
): Promise<number | null> {
  const admin = await createServerClient({ admin: true });
  const { data, error } = await admin.rpc('grant_signup_bonus', {
    p_user_id: userId,
  });
  if (error) {
    if (
      /function .*grant_signup_bonus.* does not exist/i.test(error.message) ||
      /could not find the function/i.test(error.message)
    ) {
      console.warn(
        '[credits] grant_signup_bonus RPC missing — apply migration 5',
      );
      return null;
    }
    if (/user_not_found/i.test(error.message)) {
      // Race: users row not yet created. Caller should retry after upsert.
      return null;
    }
    throw new Error(error.message);
  }
  return Number(data ?? 0);
}
