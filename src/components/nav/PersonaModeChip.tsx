'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, Loader2, Lock } from 'lucide-react';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import { readPersonaMode } from '@/lib/utils/persona-mode';
import {
  isAnyGenerationLocked,
  subscribeGenerationLock,
} from '@/lib/utils/generation-lock';
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
  const [busy, setBusy] = useState(false);
  const [showLockHint, setShowLockHint] = useState(false);

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

  // Track in-flight LLM generations across the app. While any are running,
  // disable the chip so the user can't swap mode mid-generation (which would
  // orphan the request and produce mode-mismatched output in the cache).
  useEffect(() => {
    setBusy(isAnyGenerationLocked());
    return subscribeGenerationLock(() => {
      setBusy(isAnyGenerationLocked());
    });
  }, []);

  function openSelector() {
    if (busy) {
      // Surface a brief inline hint so the user knows why nothing happened.
      setShowLockHint(true);
      window.setTimeout(() => setShowLockHint(false), 2400);
      return;
    }
    // 현재 경로를 from에 실어 보내 선택 후 돌아오게 한다.
    router.push(`/mode?from=${encodeURIComponent(pathname ?? '/home')}`);
  }

  // 칩을 숨기는 경로:
  // - /mode: 선택지가 본문에 있으므로 중복
  // - /chat/*: 채팅엔 자체 '변신' 버튼이 있고, 사주풀이 모드와 다른 축이라
  //   같은 화면에 두면 사용자가 헷갈림
  if (pathname === '/mode' || pathname?.startsWith('/chat')) return null;

  return (
    <>
      <button
        type="button"
        onClick={openSelector}
        aria-disabled={busy}
        aria-label={
          busy
            ? '리포트 생성 중이라 모드를 바꿀 수 없어요'
            : '모드 선택. 탭하여 변경.'
        }
        className={`fixed right-3 top-[calc(env(safe-area-inset-top)+8px)] z-40 inline-flex items-center gap-1.5 rounded-full border border-navy/12 bg-white/92 backdrop-blur-md shadow-[0_8px_18px_rgba(44,62,80,0.12)] pl-1 pr-2.5 py-1 transition active:scale-95 ${ACCENT[persona]} ${
          busy ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/85">
          <KkobukSprite
            variant={SPRITE[persona]}
            size="xs"
            ariaLabel="현재 모드"
          />
        </span>
        <span className="text-[11px] font-black text-navy">모드 선택</span>
        <span
          className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-navy text-white shadow-sm"
          aria-hidden
        >
          {busy ? (
            <Loader2 size={9} strokeWidth={3.5} className="animate-spin" />
          ) : (
            <ChevronRight size={9} strokeWidth={3.5} />
          )}
        </span>
      </button>

      {showLockHint && (
        <div
          role="status"
          className="fixed right-3 top-[calc(env(safe-area-inset-top)+52px)] z-40 max-w-[78vw] rounded-2xl bg-navy px-3 py-2 text-[11px] font-black text-white shadow-[0_12px_24px_rgba(44,62,80,0.24)]"
        >
          <span className="inline-flex items-center gap-1.5">
            <Lock size={11} strokeWidth={3} />
            리포트 생성 중이라 모드를 바꿀 수 없어요
          </span>
        </div>
      )}
    </>
  );
}
