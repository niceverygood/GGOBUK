import type { User } from '@supabase/supabase-js';

type AuthUser = Pick<User, 'app_metadata' | 'identities'>;

/** 꼬북점의 유일한 로그인 수단인 카카오 계정인지 확인한다. */
export function isKakaoUser(
  user: AuthUser | null | undefined,
): user is AuthUser {
  if (!user) return false;

  const providers = user.app_metadata?.providers;
  return (
    user.app_metadata?.provider === 'kakao' ||
    (Array.isArray(providers) && providers.includes('kakao')) ||
    user.identities?.some((identity) => identity.provider === 'kakao') === true
  );
}
