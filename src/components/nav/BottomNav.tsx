'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Archive, Home, Hexagon, Menu, MessageCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const TABS = [
  { href: '/home', label: '홈', icon: Home },
  { href: '/shell', label: '사주', icon: Hexagon },
  { href: '/chat', label: '채팅', icon: MessageCircle },
  { href: '/relations', label: '인연', icon: Users },
  { href: '/library', label: '보관함', icon: Archive },
  { href: '/more', label: '더보기', icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    for (const tab of TABS) router.prefetch(tab.href);
  }, [router]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="max-w-md mx-auto bg-soft/95 backdrop-blur border border-navy/8 rounded-3xl shadow-[0_-8px_24px_rgba(44,62,80,0.08)] grid grid-cols-6 px-1 py-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              onPointerEnter={() => router.prefetch(href)}
              onFocus={() => router.prefetch(href)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 text-[10px] font-extrabold transition',
                active ? 'text-navy' : 'text-[#9A9388]',
              )}
            >
              {/* active 탭은 아이콘 뒤에 민트 필 — "지금 어디" 한눈에 */}
              <span
                className={cn(
                  'grid place-items-center rounded-full px-3 py-1 transition',
                  active ? 'bg-mint/25' : 'bg-transparent',
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.6 : 1.9} />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
