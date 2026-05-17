'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Hexagon, MessageCircle, Users, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const TABS = [
  { href: '/home', label: '홈', icon: Home },
  { href: '/shell', label: '등껍질', icon: Hexagon },
  { href: '/chat', label: '채팅', icon: MessageCircle },
  { href: '/relations', label: '인연', icon: Users },
  { href: '/more', label: '더보기', icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    for (const tab of TABS) router.prefetch(tab.href);
  }, [router]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="max-w-md mx-auto bg-soft/95 backdrop-blur border border-navy/8 rounded-3xl shadow-[0_-8px_24px_rgba(44,62,80,0.08)] grid grid-cols-5 px-1 py-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              onPointerEnter={() => router.prefetch(href)}
              onFocus={() => router.prefetch(href)}
              className={cn(
                'flex flex-col items-center py-1 gap-0.5 text-[10px] font-extrabold transition',
                active ? 'text-navy' : 'text-[#9A9388]',
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
