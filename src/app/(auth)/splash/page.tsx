'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';

export default function SplashPage() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace('/login'), 1600);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8 w-[220px] h-[200px] flex items-center justify-center">
        <KkobukAvatar size="xl" />
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/80 border border-navy/10 text-xs font-black text-navy whitespace-nowrap">
          등껍질 로딩 중...
        </div>
      </div>
      <h1 className="logo-brush text-6xl leading-none">
        꼬북점 <span className="text-lg align-top">占</span>
      </h1>
      <p className="mt-3 text-sm font-bold text-[#7E7468]">등껍질을 두드리면 답이 나온다</p>

      <div className="mt-12 flex gap-2">
        <span className="w-3 h-3 rounded-full bg-mint animate-pulse" />
        <span className="w-3 h-3 rounded-full bg-mint/50 animate-pulse [animation-delay:200ms]" />
        <span className="w-3 h-3 rounded-full bg-mint/25 animate-pulse [animation-delay:400ms]" />
      </div>
    </main>
  );
}
