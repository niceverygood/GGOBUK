'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { ButtonPrimary } from '@/components/ui/primitives';
import { isNativeApp } from '@/lib/utils/platform';

const GENERIC_HOOK =
  '네 사주에서 이 주제는 의외의 지점이 하나 있어 — 전체 풀이에서 콕 집어 풀어줄게.';

/**
 * 호기심 갭 페이월. 잠긴 유료 풀이의 "훅"(무료 미끼) 1블록을 위에,
 * 그 아래 블러 처리된 본문 더미 + 자물쇠 + 해제 CTA를 둔다.
 * onUnlock은 기존 generate() 경로를 그대로 호출(= 결제 게이트는 서버 spendCredits).
 */
export function LockedPreview({
  hook,
  loading,
  cost,
  onUnlock,
  error,
}: {
  hook: string | null;
  loading: boolean;
  cost: number;
  onUnlock: () => void;
  error?: string;
}) {
  return (
    <div className="space-y-4">
      {/* 무료 훅(미끼) */}
      <div className="rounded-2xl bg-mint/10 px-4 py-3.5">
        {loading ? (
          <div className="space-y-2" aria-hidden>
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-navy/10" />
            <div className="h-3.5 w-5/6 animate-pulse rounded bg-navy/10" />
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-navy/10" />
          </div>
        ) : (
          <p className="text-[15px] font-black leading-relaxed text-navy">
            {hook && hook.length > 0 ? hook : GENERIC_HOOK}
          </p>
        )}
      </div>

      {/* 블러 본문 미리보기 + 자물쇠 */}
      <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white">
        <div className="select-none px-4 py-4 blur-[6px]" aria-hidden>
          <div className="space-y-2.5">
            <div className="h-3 w-full rounded bg-navy/12" />
            <div className="h-3 w-[92%] rounded bg-navy/12" />
            <div className="h-3 w-[97%] rounded bg-navy/12" />
            <div className="h-3 w-[80%] rounded bg-navy/12" />
            <div className="mt-3 h-3 w-[88%] rounded bg-navy/12" />
            <div className="h-3 w-[95%] rounded bg-navy/12" />
            <div className="h-3 w-[72%] rounded bg-navy/12" />
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-white" />
        <div className="absolute inset-0 grid place-items-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-navy text-white shadow-[0_10px_20px_rgba(44,62,80,0.25)]">
            <Lock size={20} strokeWidth={2.6} />
          </span>
        </div>
      </div>

      <ButtonPrimary tone="mint" onClick={onUnlock} disabled={loading}>
        {cost}꼬북알로 전체 풀이 열기
      </ButtonPrimary>

      {error && (
        <p className="text-center text-xs font-bold text-red">
          {error}{' '}
          {error.includes('꼬북알') && !isNativeApp() && (
            <Link href="/more/pro" className="underline underline-offset-4">
              충전하기
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
