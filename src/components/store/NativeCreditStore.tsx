'use client';

// 네이티브(iOS/Android) 인앱결제 스토어 — RevenueCat 경유.
//
// 웹에서는 카카오페이 그리드를 쓰고, 네이티브에서만 이 컴포넌트를 렌더한다.
// 결제 성공 시 잔액은 클라가 못 올리고 서버 웹훅이 addCredits 로 올린다.
// 따라서 success 후 onPurchased() 로 부모가 잔액을 폴링해 반영한다.

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/primitives';
import {
  CREDIT_PACKAGES,
  CREDIT_UNIT,
  formatKrw,
  totalCredits,
} from '@/lib/credits';
import {
  configurePurchases,
  getNativeProducts,
  purchaseCredits,
} from '@/lib/iap/purchases';
import type { IapPackageId } from '@/lib/iap/products';
import { track } from '@/lib/analytics/track';

export function NativeCreditStore({ onPurchased }: { onPurchased: () => void }) {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<IapPackageId | null>(null);
  const [error, setError] = useState('');

  // 마운트 시: 내 user id 로 RevenueCat 초기화(웹훅 매칭용) → 스토어 가격 조회.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const me = await fetch('/api/me').then((r) => r.json());
        const userId = me?.user?.id;
        if (userId) await configurePurchases(String(userId));
        const products = await getNativeProducts();
        if (!active) return;
        const map: Record<string, string> = {};
        for (const p of products) map[p.packageId] = p.priceString;
        setPrices(map);
      } catch {
        // 가격 못 불러와도 KRW 폴백으로 노출 — 결제 자체는 가능.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function buy(packageId: IapPackageId) {
    setLoading(packageId);
    setError('');
    track('checkout_start', { package_id: packageId, channel: 'iap' });
    const result = await purchaseCredits(packageId);
    setLoading(null);
    if (result.status === 'success') {
      onPurchased();
    } else if (result.status === 'error') {
      setError('결제에 실패했어. 잠시 후 다시 시도해줘.');
    }
    // cancelled → 조용히 무시
  }

  return (
    <div className="mt-4 grid gap-3">
      {CREDIT_PACKAGES.map((pkg) => (
        <button
          key={pkg.id}
          onClick={() => buy(pkg.id)}
          disabled={loading !== null}
          className={`relative overflow-hidden rounded-3xl border p-4 text-left disabled:opacity-60 ${
            pkg.recommended
              ? 'bg-white border-2 border-gold shadow-[0_14px_34px_rgba(44,62,80,0.11)]'
              : pkg.bestValue
                ? 'border-mint bg-white shadow-[0_12px_30px_rgba(78,205,196,0.14)]'
                : 'bg-white/70 border-navy/10'
          }`}
        >
          {pkg.badge && (
            <Badge
              tone={pkg.recommended ? 'red' : pkg.bestValue ? 'mint' : 'gold'}
              className="absolute right-3 top-3"
            >
              {pkg.badge}
            </Badge>
          )}
          <div className="flex items-end justify-between gap-3 pr-16">
            <div>
              <p className="text-xs font-black text-muted">{pkg.label}</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-navy">
                {totalCredits(pkg)}
                <span className="ml-1 text-base">{CREDIT_UNIT}</span>
              </p>
              <p className="mt-1 text-xs font-bold text-muted">
                {pkg.caption}
                {pkg.bonusCredits > 0 ? ` · 보너스 ${pkg.bonusCredits}알` : ''}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xl font-black text-navy">
                {prices[pkg.id] ?? `${formatKrw(pkg.priceKrw)}원`}
              </p>
              {loading === pkg.id && (
                <p className="mt-1 text-[11px] font-bold text-mint-dark">
                  결제 중...
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 grid gap-1.5">
            {pkg.perks.map((perk) => (
              <span
                key={perk}
                className="flex items-center gap-2 text-xs font-bold text-[#3C4650]"
              >
                <Check size={14} strokeWidth={3} className="text-mint-dark" />
                {perk}
              </span>
            ))}
          </div>
        </button>
      ))}

      {error && (
        <p className="text-center text-xs font-bold text-red">{error}</p>
      )}

      <p className="mt-1 text-center text-[11px] font-bold leading-relaxed text-muted">
        결제는 App Store / Google Play를 통해 안전하게 처리돼요.
        <br />
        충전한 {CREDIT_UNIT}은 결제 직후 잠시 뒤 계정에 반영돼요.
      </p>
    </div>
  );
}
