'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import { browserAppOrigin } from '@/lib/app-url';
import { loadPreviewInput, clearPreviewInput } from '@/lib/saju/preview';

function loginErrorMessage(error: string): string {
  if (error === 'kakao_oauth_failed')
    return '카카오 로그인 연결에 실패했어. 잠시 후 다시 시도해줘.';
  if (error === 'kakao_callback_failed')
    return '카카오 인증은 됐지만 세션 생성에 실패했어. 설정을 다시 확인해줘.';
  if (error === 'missing_oauth_code')
    return '카카오 로그인 응답이 올바르지 않았어. 다시 시도해줘.';
  return error;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<'kakao' | 'test' | null>(null);
  const [err, setErr] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    return error ? loginErrorMessage(error) : null;
  });

  async function signInWithKakao() {
    setErr(null);
    setLoading('kakao');
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

  async function testLogin() {
    setErr(null);
    setLoading('test');
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { nickname: '테스트 꼬북이', test_account: true } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('user not returned');

      const preview = loadPreviewInput();
      const bootstrap = await fetch('/api/test/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: preview
            ? {
                name: preview.name,
                birthDate: preview.input.birthDate,
                birthTime: preview.input.birthTime,
                isLunar: preview.input.isLunar,
                isLeapMonth: preview.input.isLeapMonth,
                gender: preview.input.gender,
              }
            : undefined,
        }),
      });
      if (!bootstrap.ok) {
        const detail = await bootstrap.json().catch(() => null);
        throw new Error(detail?.error ?? '테스트 계정 준비에 실패했어');
      }
      clearPreviewInput();
      router.replace('/home');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '테스트 로그인 실패';
      setErr(
        msg.toLowerCase().includes('anonymous')
          ? 'Supabase Dashboard → Authentication → Sign In / Providers 에서 "Allow anonymous sign-ins"를 켜고 Save changes를 눌러줘.'
          : msg,
      );
    } finally {
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
          {loading === 'kakao' ? '이동 중…' : '카카오로 3초 시작'}
        </button>

        <button
          onClick={testLogin}
          disabled={!!loading}
          className="mt-3 w-full max-w-xs rounded-2xl bg-navy py-4 text-white font-black flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_14px_26px_rgba(44,62,80,0.22)]"
        >
          <KkobukSprite
            variant="persona-kkobuk"
            size="xs"
            ariaLabel="테스트 꼬북이"
          />
          {loading === 'test' ? '꼬북이 깨우는 중…' : '테스트 로그인 (익명)'}
        </button>

        {err && (
          <p className="mt-4 max-w-xs text-xs font-bold text-red leading-relaxed">
            {err}
          </p>
        )}

        <p className="mt-6 text-[11px] font-bold text-muted text-center max-w-xs">
          가입과 동시에 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>

        <Link
          href="/preview"
          className="mt-8 text-xs font-extrabold text-muted underline-offset-4 underline"
        >
          로그인 없이 등껍질만 펼쳐보기 →
        </Link>
      </div>
    </main>
  );
}
