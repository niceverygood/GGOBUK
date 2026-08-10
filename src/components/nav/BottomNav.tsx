'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const TABS = [
  { href: '/home', label: '홈', icon: Home },
  { href: '/more', label: '내 정보', icon: UserRound },
];

function isTabActive(pathname: string, href: string) {
  if (href === '/home') {
    return (
      pathname.startsWith('/home') ||
      pathname.startsWith('/shell') ||
      pathname.startsWith('/chat')
    );
  }
  // 내 정보 탭: 계정/상점 하위 화면 전부.
  return pathname.startsWith('/more') || pathname.startsWith('/store');
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    for (const tab of TABS) router.prefetch(tab.href);
  }, [router]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto grid max-w-md grid-cols-2 rounded-3xl border border-navy/8 bg-soft/95 px-2 py-2 shadow-[0_-8px_24px_rgba(44,62,80,0.08)] backdrop-blur">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isTabActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              onMouseEnter={() => router.prefetch(href)}
              onFocus={() => router.prefetch(href)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-12 flex-col items-center justify-center gap-0.5 text-xs font-extrabold transition',
                active ? 'text-navy' : 'text-[#9A9388]',
              )}
            >
              {/* active 탭은 아이콘 뒤에 민트 필 — "지금 어디" 한눈에 */}
              <span
                className={cn(
                  'grid place-items-center rounded-full px-4 py-1 transition',
                  active ? 'bg-mint/25' : 'bg-transparent',
                )}
              >
                <Icon size={20} strokeWidth={2.6} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
