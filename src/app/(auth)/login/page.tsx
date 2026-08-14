'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import { browserAppOrigin } from '@/lib/app-url';
import { track } from '@/lib/analytics/track';
import { isKakaoUser } from '@/lib/auth/provider';

function loginErrorMessage(error: string): string {
  if (error === 'kakao_oauth_failed')
    return '카카오 로그인 연결에 실패했어. 잠시 후 다시 시도해줘.';
  if (error === 'kakao_callback_failed')
    return '카카오 인증은 됐지만 세션 생성에 실패했어. 설정을 다시 확인해줘.';
  if (error === 'kakao_required')
    return '꼬북점은 카카오 로그인만 이용할 수 있어.';
  if (error === 'missing_oauth_code')
    return '로그인 응답이 올바르지 않았어. 다시 시도해줘.';
  return error;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<'kakao' | null>(null);
  const [err, setErr] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    return error ? loginErrorMessage(error) : null;
  });

  // 이미 로그인된 사용자가 /login 에 머무는 경우 자동으로 홈으로 보낸다.
  // OAuth 왕복은 끝나 세션 쿠키는 생겼는데 미들웨어 쿠키 인식 타이밍이나
  // 뒤로가기 등으로 로그인 화면에 다시 떨어지는 케이스를 self-heal 해서
  // "한 번 눌러 안 되고 다시 누르면 됨" 현상을 줄인다. getUser()는 세션이
  // 없으면 네트워크 호출 없이 user=null 을 돌려주므로 로그아웃 상태에선
  // 부작용이 없다. (/home 은 self 프로필 유무에 따라 onboarding 으로 재라우팅)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user) return;
        if (isKakaoUser(user)) {
          router.replace('/home');
          return;
        }

        await supabase.auth.signOut({ scope: 'local' });
        if (!cancelled) setErr(loginErrorMessage('kakao_required'));
      } catch {
        // 세션 없음 — 로그인 화면 그대로 유지.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function signInWithKakao() {
    setErr(null);
    setLoading('kakao');
    track('login_cta_click', { provider: 'kakao' });
    try {
      const supabase = createClient();
      const baseUrl = browserAppOrigin();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: `${baseUrl}/callback?next=/home` },
      });
      if (error) throw error;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '카카오 로그인 실패';
      setErr(msg);
      setLoading(null);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center relative">
      <div className="hanji-overlay" />
      <div className="relative flex flex-col items-center">
        <KkobukSprite variant="hero" size="hero" ariaLabel="꼬북이" />
        <h1 className="logo-brush text-5xl mt-2">
          꼬북점 <span className="text-base align-top">占</span>
        </h1>
        <p className="mt-3 text-sm font-bold text-[#7E7468]">
          등껍질을 두드리면 답이 나온다
        </p>

        <button
          onClick={signInWithKakao}
          disabled={!!loading}
          className="mt-12 w-full max-w-xs rounded-2xl bg-[#FEE500] py-4 text-[#191919] font-black flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_14px_26px_rgba(0,0,0,0.10)]"
        >
          <span aria-hidden>💬</span>
          {loading === 'kakao' ? '카카오로 이동 중…' : '카카오로 로그인'}
        </button>

        {err && (
          <p className="mt-4 max-w-xs text-xs font-bold text-red leading-relaxed">
            {err}
          </p>
        )}

        <p className="mt-6 text-[11px] font-bold text-muted text-center max-w-xs leading-relaxed">
          로그인 시{' '}
          <Link href="/terms" className="text-navy underline underline-offset-2">
            이용약관
          </Link>{' '}
          및{' '}
          <Link
            href="/privacy"
            className="text-navy underline underline-offset-2"
          >
            개인정보 처리방침
          </Link>
          에 동의한 것으로 간주합니다.
        </p>
      </div>
    </main>
  );
}
