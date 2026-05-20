'use client';

import { useEffect, useState } from 'react';
import { formatKrw, CREDIT_UNIT } from '@/lib/credits';

interface FirstDeal {
  eligible: boolean;
  expiresAt: string | null;
  package: {
    label: string;
    priceKrw: number;
    totalCredits: number;
    bonusCredits: number;
    caption: string;
    perks: string[];
  };
}

function useCountdown(expiresAt: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function FirstDealBanner() {
  const [deal, setDeal] = useState<FirstDeal | null>(null);
  const [loading, setLoading] = useState(false);
  const countdown = useCountdown(deal?.expiresAt ?? null);

  useEffect(() => {
    void fetch('/api/credits/first-deal')
      .then((r) => r.json())
      .then((d) => {
        if (d.eligible) setDeal(d as FirstDeal);
      })
      .catch(() => {});
  }, []);

  // Hide once eligibility lapses (window passed mid-session).
  if (!deal || !deal.eligible || countdown === null) return null;

  const p = deal.package;

  async function buy() {
    setLoading(true);
    try {
      const res = await fetch('/api/payment/kakao/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: 'firstdeal' }),
      });
      const d = await res.json();
      if (d.redirectMobileUrl || d.redirectUrl) {
        window.location.href = d.redirectMobileUrl ?? d.redirectUrl;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl p-5 mb-5 text-white shadow-[0_16px_36px_rgba(231,76,60,0.28)] relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #E74C3C, #F4733E 55%, #F4D03F)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-3 py-1 text-[11px] font-black backdrop-blur">
          🎁 첫 충전 한정
        </span>
        <span className="font-mono font-black text-base tabular-nums bg-black/20 rounded-lg px-2 py-1">
          {countdown}
        </span>
      </div>

      <h3 className="mt-3 text-xl font-black leading-tight">{p.label}</h3>
      <p className="mt-1 text-sm font-bold text-white/90">{p.caption}</p>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-black">₩{formatKrw(p.priceKrw)}</span>
        <span className="mb-1 text-sm font-bold text-white/90">
          → {p.totalCredits}{CREDIT_UNIT}
          <span className="ml-1 rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-black">
            +{p.bonusCredits} 보너스
          </span>
        </span>
      </div>

      <ul className="mt-3 space-y-1 text-[13px] font-bold text-white/95">
        {p.perks.map((perk) => (
          <li key={perk} className="flex gap-1.5">
            <span>✓</span>
            {perk}
          </li>
        ))}
      </ul>

      <button
        onClick={buy}
        disabled={loading}
        className="mt-4 w-full rounded-2xl bg-white py-3.5 font-black text-[#E74C3C] disabled:opacity-60"
      >
        {loading ? '결제창 여는 중...' : `지금 ₩${formatKrw(p.priceKrw)}로 받기`}
      </button>
      <p className="mt-2 text-center text-[11px] font-bold text-white/80">
        가입 24시간 이내 1회만 · 시간이 지나면 사라져요
      </p>
    </div>
  );
}
