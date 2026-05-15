'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--color-paper)]/95 backdrop-blur border-t border-black/5">
      <div className="max-w-md mx-auto grid grid-cols-5 px-2 py-1 safe-area-inset-bottom">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center py-2 text-xs gap-1 transition',
                active ? 'text-[var(--color-shell-dark)]' : 'text-[var(--color-ink)]/60',
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
              <span className={cn(active && 'font-semibold')}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
