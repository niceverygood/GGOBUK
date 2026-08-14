'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isKakaoUser } from '@/lib/auth/provider';

const MIN_SPLASH_MS = 1400;

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    async function continueToApp() {
      const supabase = createClient();
      let destination = '/login';

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (isKakaoUser(user)) {
          destination = '/home';
        } else if (user) {
          await supabase.auth.signOut({ scope: 'local' });
        }
      } catch {
        // 네트워크 오류나 세션 없음은 로그인 화면에서 다시 시도한다.
      }

      const remaining = Math.max(0, MIN_SPLASH_MS - (Date.now() - startedAt));
      await new Promise((resolve) => window.setTimeout(resolve, remaining));
      if (cancelled) return;

      router.replace(destination);
      router.refresh();
    }

    void continueToApp();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#A6E2DC] px-6 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(255,255,255,0.82),rgba(255,255,255,0)_56%)]" />
      <div className="relative flex flex-col items-center">
        <Image
          src="/icons/icon-1024.png"
          alt="꼬북점"
          width={1024}
          height={1024}
          priority
          className="h-56 w-56 rounded-[3rem] shadow-[0_24px_55px_rgba(27,74,78,0.18)]"
        />
        <h1 className="logo-brush mt-7 text-6xl leading-none text-navy">
          꼬북점 <span className="text-lg align-top">占</span>
        </h1>
        <p className="mt-3 text-sm font-bold text-[#4C7773]">
          등껍질을 두드리면 답이 나온다
        </p>

        <div className="mt-10 flex gap-2" aria-label="앱을 여는 중">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-navy/70" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-navy/45 [animation-delay:200ms]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-navy/25 [animation-delay:400ms]" />
        </div>
      </div>
    </main>
  );
}
