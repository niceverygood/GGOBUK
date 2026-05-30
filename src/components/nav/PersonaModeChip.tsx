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
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

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

  // 현재 페이지가 "풀이 본문이 노출되는" 페이지인지. 이런 페이지에서 모드를
  // 바꾸면 화면이 다른 모드 본문으로 갈리니, 사용자에게 보관 정책을 안내한다.
  function isInterpretationContext(p: string | null | undefined): boolean {
    if (!p) return false;
    return (
      p.startsWith('/shell/') ||
      p.startsWith('/use-case/') ||
      /^\/relations\/[^/]+$/.test(p)
    );
  }

  function openSelector() {
    if (busy) {
      // Surface a brief inline hint so the user knows why nothing happened.
      setShowLockHint(true);
      window.setTimeout(() => setShowLockHint(false), 2400);
      return;
    }
    // 풀이 본문 화면이면 안내 다이얼로그 → 확인 시 홈으로 이동(현 풀이는 그
    // 모드 row로 보관됨, 보관함에서 재열람 가능).
    if (isInterpretationContext(pathname)) {
      setShowSwitchConfirm(true);
      return;
    }
    // 그 외 화면은 바로 모드 선택으로 (확인 없이).
    router.push(`/mode?from=${encodeURIComponent(pathname ?? '/home')}`);
  }

  function proceedToModeSelect() {
    setShowSwitchConfirm(false);
    // 현재 풀이 화면을 떠나 '사주 초기 화면'(홈)에서 모드 변경.
    router.push(`/mode?from=${encodeURIComponent('/home')}`);
  }

  // 칩을 숨기는 경로:
  // - /mode: 선택지가 본문에 있으므로 중복
  // - /chat/*: 채팅엔 자체 '변신' 버튼이 있음
  // - /persona*: 채팅 페르소나 선택 페이지. 사주풀이 톤과 다른 축이라
  //   같은 화면에 두면 사용자가 혼동
  if (
    pathname === '/mode' ||
    pathname?.startsWith('/chat') ||
    pathname?.startsWith('/persona')
  )
    return null;

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

      {showSwitchConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="모드 변경 안내"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/55 backdrop-blur-sm px-6"
          onClick={() => setShowSwitchConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_20px_44px_rgba(44,62,80,0.28)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <span className="text-3xl" aria-hidden>🐢</span>
              <h2 className="mt-2 text-base font-black text-navy">
                모드를 바꿀까요?
              </h2>
              <p className="mt-3 text-[13px] font-bold leading-relaxed text-[#3C4650]">
                지금 보고 있는 풀이는 사라지고
                <br />
                <b>보관함에 3일 동안 보관</b>돼요.
                <br />
                <span className="text-[12px] font-bold text-muted">
                  보관함에서 언제든 다시 볼 수 있어요.
                </span>
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowSwitchConfirm(false)}
                className="flex-1 rounded-2xl border border-navy/15 bg-white py-3 text-sm font-black text-muted active:scale-[0.98]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={proceedToModeSelect}
                className="flex-1 rounded-2xl bg-navy py-3 text-sm font-black text-white active:scale-[0.98]"
              >
                확인하고 변경
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
