import { createServerClient } from '@/lib/supabase/server';

export class AiConsentRequiredError extends Error {
  code = 'AI_CONSENT_REQUIRED' as const;
  constructor() {
    super('AI 데이터 사용에 동의해야 풀이를 시작할 수 있어.');
  }
}

/** Throws AiConsentRequiredError if the user has not yet consented to AI data sharing. */
export async function requireAiConsent(userId: string): Promise<void> {
  const supabase = await createServerClient({ admin: true });
  const { data, error } = await supabase
    .from('users')
    .select('ai_consent_at')
    .eq('id', userId)
    .single();
  if (error) throw error;
  if (!data?.ai_consent_at) throw new AiConsentRequiredError();
}

export function isAiConsentRequiredError(e: unknown): e is AiConsentRequiredError {
  return (
    typeof e === 'object' &&
    e !== null &&
    (e as { code?: string }).code === 'AI_CONSENT_REQUIRED'
  );
}

/** Returns true (consented) or false (not). Use when you want to short-circuit
 *  without exception flow — e.g. JSON-returning routes. */
export async function hasAiConsent(userId: string): Promise<boolean> {
  try {
    await requireAiConsent(userId);
    return true;
  } catch (e) {
    if (isAiConsentRequiredError(e)) return false;
    throw e;
  }
}
