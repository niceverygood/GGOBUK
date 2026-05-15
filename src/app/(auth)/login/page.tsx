'use client';

import { createClient } from '@/lib/supabase/client';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { useState } from 'react';

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
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-[var(--color-paper)] text-[var(--color-ink)]">
      <KkobukAvatar size="xl" />
      <h1 className="mt-6 text-4xl font-bold">꼬북점</h1>
      <p className="mt-3 text-base text-center text-[var(--color-ink)]/70">
        거북이 도사가 풀어주는 친근한 사주
      </p>

      <button
        onClick={signInWithKakao}
        disabled={loading}
        className="mt-12 w-full max-w-xs rounded-2xl bg-[#FEE500] py-4 text-[#191919] font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <span aria-hidden>💬</span>
        {loading ? '이동 중…' : '카카오로 3초 시작'}
      </button>

      <p className="mt-6 text-xs text-[var(--color-ink)]/50 text-center max-w-xs">
        가입과 동시에 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
      </p>
    </div>
  );
}
