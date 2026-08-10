'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Egg, ShoppingBag } from 'lucide-react';
import { CREDIT_UNIT } from '@/lib/credits';
import { isNativeApp } from '@/lib/utils/platform';

export function MoreStoreLink({ credits }: { credits: number }) {
  const [nativeApp, setNativeApp] = useState(false);

  useEffect(() => {
    setNativeApp(isNativeApp());
  }, []);

  return (
    <Link
      href="/store"
      className="flex items-center gap-3 rounded-2xl bg-white border border-navy/10 p-4 shadow-[0_9px_22px_rgba(44,62,80,0.06)]"
    >
      <span className="flex h-8 w-8 items-center justify-center text-xl">
        {nativeApp ? (
          <Egg size={22} strokeWidth={2.5} />
        ) : (
          <ShoppingBag size={22} strokeWidth={2.5} />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black text-navy">
          {nativeApp ? '내 꼬북알' : '꼬북알 충전'}
        </div>
        <div className="text-xs font-bold text-muted mt-0.5">
          보유 {credits} {CREDIT_UNIT} · 풀이와 채팅에 사용
        </div>
      </div>
      <span className="text-muted">→</span>
    </Link>
  );
}
