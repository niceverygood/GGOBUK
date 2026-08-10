'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Gift, X } from 'lucide-react';
import {
  CREDIT_COSTS,
  CREDIT_UNIT,
  SIGNUP_BONUS_CREDITS,
  packageBreakdown,
} from '@/lib/credits';

const STORAGE_KEY = 'ggobuk_welcome_dismissed_v1';
const DISMISS_EVENT = 'ggobuk:welcome-dismissed';

function subscribeDismissed(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(DISMISS_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(DISMISS_EVENT, onStoreChange);
  };
}

function isDismissed() {
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

/**
 * 신규 가입자에게 보너스 30알의 화폐 가치를 환산해 보여주는 카드.
 *
 * 표시 조건 (둘 다 만족):
 *  1. localStorage에 dismiss 기록 없음
 *  2. credit_balance가 SIGNUP_BONUS_CREDITS 절반 이상 (보너스 받고 거의 안 씀)
 *
 * dismiss 버튼으로 닫으면 그 디바이스에선 다시 안 보임.
 * 다른 디바이스에선 다시 보일 수 있는데, 그것도 자연스러운 UX (한 번 더 강조).
 */
export function WelcomeBonusCard() {
  const [balance, setBalance] = useState<number | null>(null);
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    isDismissed,
    () => true,
  );

  useEffect(() => {
    if (dismissed) return;
    void fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setBalance(Number(d?.user?.credit_balance ?? 0)))
      .catch(() => setBalance(0));
  }, [dismissed]);

  if (dismissed) return null;
  if (balance === null) return null;
  if (balance < SIGNUP_BONUS_CREDITS / 2) return null; // 이미 쓰기 시작

  const b = packageBreakdown(SIGNUP_BONUS_CREDITS);

  function handleDismiss() {
    window.localStorage.setItem(STORAGE_KEY, '1');
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  return (
    <div className="relative mt-4 overflow-hidden rounded-3xl border border-gold/40 bg-gold/8 p-4 shadow-[0_8px_22px_rgba(44,62,80,0.06)]">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="닫기"
        className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-white/80 text-navy/60 active:scale-95"
      >
        <X size={14} strokeWidth={2.5} />
      </button>

      <div className="flex items-start gap-3 pr-7">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/90 shadow-sm">
          <Gift size={22} strokeWidth={2.5} className="text-[#B58A00]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold text-[#B58A00]">
            🎁 가입 축하 선물
          </p>
          <p className="mt-0.5 text-base font-black leading-snug text-navy">
            {SIGNUP_BONUS_CREDITS} {CREDIT_UNIT} 즉시 충전 완료
          </p>
          <p className="mt-1 text-[11.5px] font-bold leading-relaxed text-navy/85">
            전체 풀이 <b>{b.readings}편</b>과 채팅 추가 질문까지 넉넉하게 쓸 수
            있어요.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-white/85 px-1 py-1.5">
          <p className="text-[9px] font-extrabold text-muted leading-none">
            전체 풀이
          </p>
          <p className="mt-1 text-sm font-black text-navy leading-none">
            {b.readings}
            <span className="ml-0.5 text-[9px] font-bold">편</span>
          </p>
          <p className="mt-0.5 text-[8px] font-bold text-muted leading-none">
            {CREDIT_COSTS.reading}알/편
          </p>
        </div>
        <div className="rounded-xl bg-white/85 px-1 py-1.5">
          <p className="text-[9px] font-extrabold text-muted leading-none">
            채팅 추가 질문
          </p>
          <p className="mt-1 text-sm font-black text-navy leading-none">
            {b.chats}
            <span className="ml-0.5 text-[9px] font-bold">회</span>
          </p>
          <p className="mt-0.5 text-[8px] font-bold text-muted leading-none">
            {CREDIT_COSTS.chat}알/회 · 하루 5회 무료
          </p>
        </div>
      </div>

      <Link
        href="/shell"
        className="mt-3 block w-full rounded-2xl bg-navy py-2.5 text-center text-[13px] font-black text-white active:scale-[0.99]"
      >
        지금 첫 풀이 시작하기 →
      </Link>
    </div>
  );
}
