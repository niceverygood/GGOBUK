'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Card, ButtonPrimary, Badge } from '@/components/ui/primitives';
import { BottomActionBar } from '@/components/nav/BottomActionBar';
import {
  CREDIT_COSTS,
  CREDIT_PACKAGES,
  type CreditPackageId,
  formatKrw,
  totalCredits,
} from '@/lib/credits';

export default function CreditPage() {
  return (
    <Suspense
      fallback={
        <main className="p-8 text-center text-sm font-bold opacity-60">
          불러오는 중...
        </main>
      }
    >
      <CreditPageInner />
    </Suspense>
  );
}

function CreditPageInner() {
  const params = useSearchParams();
  const success = params.get('success');
  const chargedCredits = params.get('credits');
  const cancelled = params.get('cancelled');
  const failed = params.get('failed');
  const [loading, setLoading] = useState<CreditPackageId | null>(null);
  const [balance, setBalance] = useState(0);
  const recommended = useMemo(
    () => CREDIT_PACKAGES.find((pkg) => pkg.recommended) ?? CREDIT_PACKAGES[0],
    [],
  );

  useEffect(() => {
    void fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setBalance(Number(d?.user?.credit_balance ?? 0)));
  }, [success]);

  async function start(packageId: CreditPackageId) {
    setLoading(packageId);
    try {
      const res = await fetch('/api/payment/kakao/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });
      const d = await res.json();
      if (d.redirectMobileUrl) {
        window.location.href = d.redirectMobileUrl;
      } else if (d.redirectUrl) {
        window.location.href = d.redirectUrl;
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="px-5 pt-8 pb-[15rem] relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <Card className="p-5 text-center">
          <div className="flex justify-center">
            <KkobukAvatar variant="dosa" size="lg" />
          </div>
          <div className="mx-auto mt-2 max-w-xs rounded-2xl bg-gold/40 border border-navy/10 py-3 px-4 font-black text-navy leading-snug">
            필요한 만큼 충전하고
            <br />
            보고 싶은 풀이만 열어봐
          </div>
        </Card>

        <div className="mt-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-muted">
              구독 없이 쓰는 AI 풀이
            </p>
            <h1 className="text-2xl font-black text-navy tracking-tight">
              크래딧 충전
            </h1>
          </div>
          <Badge tone="gold">{balance} 크래딧 보유</Badge>
        </div>
        <p className="mt-1 text-sm font-semibold text-[#82786D]">
          매달 자동 결제 없이, AI 해설이 필요할 때만 크래딧을 사용해요.
        </p>

        {success && (
          <p className="mt-4 rounded-xl bg-mint/30 p-3 text-sm font-bold">
            {chargedCredits ?? ''} 크래딧 충전이 완료됐어!
          </p>
        )}
        {cancelled && (
          <p className="mt-4 rounded-xl bg-black/5 p-3 text-sm font-bold">
            결제를 취소했어.
          </p>
        )}
        {failed && (
          <p className="mt-4 rounded-xl bg-red/15 text-red p-3 text-sm font-bold">
            결제에 실패했어. 다시 시도해줘.
          </p>
        )}

        <Card className="mt-5 p-4">
          <p className="text-sm font-black text-navy">크래딧은 이렇게 써요</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#3C4650]">
            <div className="rounded-2xl bg-mint/10 p-3">
              채팅 1회 · {CREDIT_COSTS.chat}개
            </div>
            <div className="rounded-2xl bg-mint/10 p-3">
              사주 해설 · {CREDIT_COSTS.interpretation}개
            </div>
            <div className="rounded-2xl bg-gold/20 p-3">
              궁합 리포트 · {CREDIT_COSTS.compatibility}개
            </div>
            <div className="rounded-2xl bg-gold/20 p-3">
              길일 찾기 · {CREDIT_COSTS.auspicious}개
            </div>
            <div className="col-span-2 rounded-2xl bg-white border border-navy/10 p-3">
              대운 AI 해설 · {CREDIT_COSTS.daewoon}개
            </div>
          </div>
        </Card>

        <div className="mt-4 grid gap-3">
          {CREDIT_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => start(pkg.id)}
              disabled={loading === pkg.id}
              className={`relative text-left rounded-3xl border p-4 disabled:opacity-60 ${
                pkg.recommended
                  ? 'bg-white border-2 border-gold shadow-[0_14px_34px_rgba(44,62,80,0.11)]'
                  : 'bg-white/70 border-navy/10'
              }`}
            >
              {pkg.recommended && (
                <Badge tone="red" className="absolute -top-2 right-3">
                  추천
                </Badge>
              )}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-muted">{pkg.label}</p>
                  <p className="mt-1 text-2xl font-black text-navy tracking-tight">
                    {totalCredits(pkg)} 크래딧
                  </p>
                  <p className="text-xs font-bold text-muted">
                    {pkg.caption}
                    {pkg.bonusCredits > 0
                      ? ` · 보너스 ${pkg.bonusCredits}개`
                      : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-black text-navy">
                    {formatKrw(pkg.priceKrw)}원
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-muted">
                    1회 결제
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <Card className="mt-4 p-4 space-y-2 text-sm font-bold text-[#3C4650]">
          <p>✓ 자동 갱신 없음</p>
          <p>✓ 필요한 AI 해설만 크래딧으로 사용</p>
          <p>✓ 무료 채팅 한도 이후에도 크래딧으로 이어서 질문</p>
          <p>✓ 사주 해설, 궁합, 대운, 길일 찾기 모두 같은 크래딧 사용</p>
        </Card>
      </div>

      <BottomActionBar>
        <ButtonPrimary
          tone="gold"
          onClick={() => start(recommended.id)}
          disabled={!!loading}
        >
          {loading ? '카카오페이로 이동 중...' : '크래딧 충전하기'}
        </ButtonPrimary>
        <p className="mt-2 text-[11px] font-bold text-muted text-center">
          정기결제가 아니며, 충전한 크래딧은 계정에 적립돼요.
        </p>
      </BottomActionBar>
    </main>
  );
}
