'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown } from 'lucide-react';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import {
  readPersonaMode,
  writePersonaMode,
} from '@/lib/utils/persona-mode';
import type { PersonaKey } from '@/lib/llm/personas';

interface ModeMeta {
  key: PersonaKey;
  name: string;
  blurb: string;
  sprite: 'persona-kkobuk' | 'persona-dosa' | 'persona-mudang' | 'persona-bosal';
  accent: string;
}

const MODES: ModeMeta[] = [
  {
    key: 'kkobuk',
    name: '꼬북이',
    blurb: '쉽고 친근하게',
    sprite: 'persona-kkobuk',
    accent: 'bg-mint/15',
  },
  {
    key: 'dosa',
    name: '꼬북도사',
    blurb: '한학자 정식 풀이',
    sprite: 'persona-dosa',
    accent: 'bg-navy/8',
  },
  {
    key: 'mudang',
    name: '꼬북무당',
    blurb: '단도직입 결단',
    sprite: 'persona-mudang',
    accent: 'bg-red/10',
  },
  {
    key: 'bosal',
    name: '꼬북보살',
    blurb: '따뜻한 위로',
    sprite: 'persona-bosal',
    accent: 'bg-gold/15',
  },
];

/**
 * Floating top-right chip — persistent persona-mode switcher available on every
 * (main) route. Tapping the chip expands a dropdown with the 4 modes;
 * selecting one writes localStorage + cookie and fires router.refresh() so any
 * server component (e.g. /shell/[category]) re-renders with the right cached
 * interpretation for the chosen persona.
 */
export function PersonaModeChip() {
  const router = useRouter();
  const [persona, setPersona] = useState<PersonaKey>('dosa');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPersona(readPersonaMode());
  }, []);

  // Close on outside click / escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Listen for changes from other tabs/components (e.g. home ModePicker).
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'ggobuk_persona_mode') {
        setPersona(readPersonaMode());
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function pick(key: PersonaKey) {
    setPersona(key);
    writePersonaMode(key);
    setOpen(false);
    // Re-render server components (e.g. /shell/[category]) so cookie-aware
    // cache lookup uses the new persona.
    router.refresh();
  }

  const current = MODES.find((m) => m.key === persona) ?? MODES[1];

  return (
    <div
      ref={wrapperRef}
      className="fixed right-3 top-[calc(env(safe-area-inset-top)+8px)] z-40"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`현재 모드: ${current.name}. 탭하여 변경.`}
        className={`relative grid h-9 w-9 place-items-center rounded-full border border-navy/12 bg-white/92 backdrop-blur-md shadow-[0_8px_18px_rgba(44,62,80,0.12)] transition active:scale-95 ${current.accent}`}
      >
        <KkobukSprite variant={current.sprite} size="xs" ariaLabel={current.name} />
        <span
          className={`absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-navy text-white shadow-sm transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <ChevronDown size={9} strokeWidth={3.5} />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] w-[232px] rounded-2xl border border-navy/10 bg-white shadow-[0_18px_38px_rgba(44,62,80,0.18)] p-1.5"
        >
          <p className="px-2.5 py-1.5 text-[10px] font-extrabold text-muted">
            사주풀이 톤 선택
          </p>
          {MODES.map((m) => {
            const isOn = m.key === persona;
            return (
              <button
                key={m.key}
                type="button"
                role="menuitemradio"
                aria-checked={isOn}
                onClick={() => pick(m.key)}
                className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition active:scale-[0.98] ${
                  isOn ? m.accent : 'hover:bg-ivory'
                }`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/85">
                  <KkobukSprite variant={m.sprite} size="xs" ariaLabel={m.name} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-black text-navy leading-tight">
                    {m.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-bold text-muted leading-tight">
                    {m.blurb}
                  </span>
                </span>
                {isOn && (
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-navy text-white">
                    <Check size={10} strokeWidth={3.5} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
