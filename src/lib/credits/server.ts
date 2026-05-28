import { createServerClient } from '@/lib/supabase/server';
import { hasServiceRoleKey } from '@/lib/supabase/env';
import { logger } from '@/lib/utils/logger';

/**
 * 베타 무료 모드 — 출시 전 단계에서 모든 크레딧 차감을 skip.
 *
 * 활성화: Vercel env에 BETA_FREE_MODE=true 설정 + Redeploy.
 * 비활성화: env 제거 또는 다른 값으로 변경 + Redeploy (정상 결제 동작 복귀).
 *
 * skip 대상: spendCredits만. addCredits/grant_signup_bonus는 그대로
 * (충전·가입 보너스는 정상 동작해야 잔액 표시가 자연스러움).
 *
 * UI 영향: 잔액 표시·"N꼬북알" 문구 등 그대로 노출 (출시 후 정책 그대로 유지).
 * 단지 spend 시점에만 차감 안 함 → 잔액 0이어도 모든 기능 사용 가능.
 */
function isBetaFreeMode(): boolean {
  return process.env.BETA_FREE_MODE?.trim().toLowerCase() === 'true';
}

export function isBetaFreeModeActive(): boolean {
  return isBetaFreeMode();
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super('insufficient_credits');
    this.name = 'InsufficientCreditsError';
  }
}

export class ServiceRoleMissingError extends Error {
  constructor(funcName: string) {
    super(
      `SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않아 ${funcName} 함수를 호출할 수 없어요. Vercel Project Settings → Environment Variables에 추가 후 재배포해주세요.`,
    );
    this.name = 'ServiceRoleMissingError';
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
  // BETA 무료 모드 — 차감 skip, 현재 잔액만 조회해 반환.
  if (isBetaFreeMode()) {
    logger.warn('credits', 'BETA_FREE_MODE: spend skipped', {
      userId: params.userId,
      amount: params.amount,
      reason: params.reason,
    });
    try {
      const admin = await createServerClient({ admin: true });
      const { data } = await admin
        .from('users')
        .select('credit_balance')
        .eq('id', params.userId)
        .maybeSingle();
      return Number(data?.credit_balance ?? 0);
    } catch {
      // 잔액 조회 실패해도 무료 모드라 0 반환으로 흐름 유지.
      return 0;
    }
  }

  if (!hasServiceRoleKey()) {
    logger.error('credits', 'spend_credits called without SUPABASE_SERVICE_ROLE_KEY', {
      userId: params.userId,
      amount: params.amount,
    });
    throw new ServiceRoleMissingError('spend_credits');
  }
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
    // 'permission denied for function spend_credits' 형태 → 명확한 에러로 승격
    if (error.message?.includes('permission denied')) {
      throw new ServiceRoleMissingError('spend_credits');
    }
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
  if (!hasServiceRoleKey()) {
    throw new ServiceRoleMissingError('add_credits');
  }
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

  if (error) {
    if (error.message?.includes('permission denied')) {
      throw new ServiceRoleMissingError('add_credits');
    }
    throw new Error(error.message);
  }
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
      logger.warn('credits', 'grant_signup_bonus RPC missing — apply migration 5');
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
