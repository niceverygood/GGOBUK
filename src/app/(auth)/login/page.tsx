'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signInWithKakao() {
    setLoading(true);
    const supabase = createClient();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${baseUrl}/callback?next=/onboarding/saju`,
      },
    });
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center relative">
      <div className="hanji-overlay" />
      <div className="relative flex flex-col items-center">
        <KkobukAvatar size="xl" mood="happy" />
        <h1 className="logo-brush text-5xl mt-2">
          꼬북점 <span className="text-base align-top">占</span>
        </h1>
        <p className="mt-3 text-sm font-bold text-[#7E7468]">
          등껍질을 두드리면 답이 나온다
        </p>

        <button
          onClick={signInWithKakao}
          disabled={loading}
          className="mt-12 w-full max-w-xs rounded-2xl bg-[#FEE500] py-4 text-[#191919] font-black flex items-center justify-center gap-2 disabled:opacity-60 shadow-[0_14px_26px_rgba(0,0,0,0.10)]"
        >
          <span aria-hidden>💬</span>
          {loading ? '이동 중…' : '카카오로 3초 시작'}
        </button>

        <p className="mt-6 text-[11px] font-bold text-muted text-center max-w-xs">
          가입과 동시에 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>

        <a
          href="/preview"
          className="mt-8 text-xs font-extrabold text-muted underline-offset-4 underline"
        >
          로그인 없이 등껍질만 펼쳐보기 →
        </a>
      </div>
    </main>
  );
}
