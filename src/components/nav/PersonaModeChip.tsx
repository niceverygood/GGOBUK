'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import { readPersonaMode } from '@/lib/utils/persona-mode';
import type { PersonaKey } from '@/lib/llm/personas';

const SPRITE: Record<
  PersonaKey,
  'persona-kkobuk' | 'persona-dosa' | 'persona-mudang' | 'persona-bosal'
> = {
  kkobuk: 'persona-kkobuk',
  dosa: 'persona-dosa',
  mudang: 'persona-mudang',
  bosal: 'persona-bosal',
};

const ACCENT: Record<PersonaKey, string> = {
  kkobuk: 'bg-mint/15',
  dosa: 'bg-navy/8',
  mudang: 'bg-red/10',
  bosal: 'bg-gold/15',
};

/**
 * Floating top-right chip — persistent persona-mode indicator on every (main)
 * route. Tapping the chip navigates to /mode (the full-screen mode selector
 * with detailed descriptions and per-mode preview) rather than opening an
 * inline dropdown — this gives the user enough context to choose deliberately.
 */
export function PersonaModeChip() {
  const router = useRouter();
  const pathname = usePathname();
  const [persona, setPersona] = useState<PersonaKey>('dosa');

  useEffect(() => {
    setPersona(readPersonaMode());
  }, [pathname]);

  // Live-sync across tabs.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'ggobuk_persona_mode') {
        setPersona(readPersonaMode());
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function openSelector() {
    // 현재 경로를 from에 실어 보내 선택 후 돌아오게 한다.
    // /mode 자체에서는 칩이 그대로 보이되 클릭은 의미 없게 만들 필요 없음 — 그대로 두면 새로고침.
    router.push(`/mode?from=${encodeURIComponent(pathname ?? '/home')}`);
  }

  // /mode 페이지 본인에선 칩 숨기기 (선택지가 본문에 있으므로 중복).
  if (pathname === '/mode') return null;

  return (
    <button
      type="button"
      onClick={openSelector}
      aria-label={`현재 모드. 탭하여 변경.`}
      className={`fixed right-3 top-[calc(env(safe-area-inset-top)+8px)] z-40 grid h-9 w-9 place-items-center rounded-full border border-navy/12 bg-white/92 backdrop-blur-md shadow-[0_8px_18px_rgba(44,62,80,0.12)] transition active:scale-95 ${ACCENT[persona]}`}
    >
      <KkobukSprite variant={SPRITE[persona]} size="xs" ariaLabel="현재 모드" />
      <span
        className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-navy text-white shadow-sm"
        aria-hidden
      >
        <ChevronRight size={9} strokeWidth={3.5} />
      </span>
    </button>
  );
}
