'use client';

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, MessageCircle, ScrollText, ShieldCheck, Sparkles } from 'lucide-react';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Card, ButtonPrimary, Badge } from '@/components/ui/primitives';
import { BottomActionBar } from '@/components/nav/BottomActionBar';
import { NativeCreditStore } from '@/components/store/NativeCreditStore';
import {
  CREDIT_COSTS,
  CREDIT_PACKAGES,
  CREDIT_UNIT,
  type CreditPackageId,
  formatKrw,
  packageBreakdown,
  totalCredits,
} from '@/lib/credits';
import { isNativeApp } from '@/lib/utils/platform';
import { track, fbqTrack } from '@/lib/analytics/track';

const STORE_PROMISES = [
  '정기결제 없음',
  '결제 즉시 적립',
  '실패 시 자동 환불',
];

// SSR에선 항상 false, 클라이언트에서 isNativeApp() 1회 판정 (hydration 안전).
const subscribeStatic = () => () => undefined;

export default function StorePage() {
  return (
    <Suspense
      fallback={
        <main className="p-8 text-center text-sm font-bold opacity-60">
          불러오는 중...
        </main>
      }
    >
      <StorePageInner />
    </Suspense>
  );
}

function StorePageInner() {
  const params = useSearchParams();
  const success = params.get('success');
  const chargedCredits = params.get('credits');
  const cancelled = params.get('cancelled');
  const failed = params.get('failed');
  const purchaseId = params.get('pid');
  const purchaseAmt = params.get('amt');
  const [loading, setLoading] = useState<CreditPackageId | null>(null);
  const [balance, setBalance] = useState(0);
  const [iapDone, setIapDone] = useState(false);
  const nativeApp = useSyncExternalStore(
    subscribeStatic,
    isNativeApp,
    () => false,
  );
  const recommended = useMemo(
    () => CREDIT_PACKAGES.find((pkg) => pkg.recommended) ?? CREDIT_PACKAGES[0],
    [],
  );

  // 결제 화면 진입 — 수익 퍼널 상단. 마운트 1회.
  useEffect(() => {
    track('view_pricing');
    fbqTrack('ViewContent', { content_type: 'product', content_category: 'credits' });
  }, []);

  // 결제 완료 복귀 — 브라우저 Purchase 픽셀을 서버 CAPI 와 같은 event_id(pid)로
  // 발사해 중복 제거한다. 광고 차단/ATT 로 픽셀이 막히면 CAPI 만 집계된다.
  useEffect(() => {
    if (!success || !purchaseId) return;
    fbqTrack(
      'Purchase',
      { value: purchaseAmt ? Number(purchaseAmt) : undefined, currency: 'KRW' },
      purchaseId,
    );
  }, [success, purchaseId, purchaseAmt]);

  useEffect(() => {
    void fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setBalance(Number(d?.user?.credit_balance ?? 0)));
  }, [success]);

  async function start(packageId: CreditPackageId) {
    setLoading(packageId);
    // 결제 시작 — 카카오페이로 떠나기 전 전환 의도 신호.
    track('checkout_start', { package_id: packageId });
    fbqTrack('InitiateCheckout', { content_ids: [packageId], currency: 'KRW' });
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

  // 네이티브 IAP 결제 성공 후 — 잔액은 웹훅이 비동기로 올리므로
  // /api/me 를 몇 번 폴링해 반영되는 즉시 표시한다.
  function handleIapPurchased() {
    setIapDone(true);
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      void fetch('/api/me')
        .then((r) => r.json())
        .then((d) => setBalance(Number(d?.user?.credit_balance ?? 0)));
      if (tries >= 8) window.clearInterval(id);
    }, 2000);
  }

  return (
    <main className="px-5 pt-8 pb-[15rem] relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-muted">
              {nativeApp ? '보유 현황' : '꼬북알 충전'}
            </p>
            <h1 className="text-3xl font-black tracking-tight text-navy">
              {nativeApp ? '내 꼬북알' : '꼬북상점'}
            </h1>
          </div>
          <Badge tone="gold">
            {balance} {CREDIT_UNIT} 보유
          </Badge>
        </div>

        <Card className="mt-5 overflow-hidden p-5">
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <KkobukAvatar size="lg" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-mint-dark">
                꼬북알은 딱 두 곳에 써요
              </p>
              <div className="mt-2 space-y-1.5 text-sm font-black text-navy">
                <p className="flex items-center gap-2">
                  <ScrollText size={16} strokeWidth={2.6} className="text-mint-dark" />
                  사주 전체 풀이 · {CREDIT_COSTS.reading}알
                </p>
                <p className="flex items-center gap-2">
                  <MessageCircle size={16} strokeWidth={2.6} className="text-[#B58A00]" />
                  채팅 추가 질문 · {CREDIT_COSTS.chat}알
                  <span className="text-[11px] font-bold text-muted">
                    (하루 5회 무료)
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {STORE_PROMISES.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-mint/10 px-2 py-3 text-center text-[11px] font-black text-navy"
              >
                <ShieldCheck
                  size={15}
                  strokeWidth={2.5}
                  className="mx-auto mb-1 text-mint-dark"
                />
                {item}
              </div>
            ))}
          </div>
        </Card>

        {success && (
          <p className="mt-4 rounded-2xl bg-mint/30 p-3 text-sm font-bold text-navy">
            {chargedCredits ?? ''} {CREDIT_UNIT} 충전이 완료됐어!
          </p>
        )}
        {cancelled && (
          <p className="mt-4 rounded-2xl bg-black/5 p-3 text-sm font-bold">
            결제를 취소했어.
          </p>
        )}
        {failed && (
          <p className="mt-4 rounded-2xl bg-red/15 p-3 text-sm font-bold text-red">
            결제에 실패했어. 다시 시도해줘.
          </p>
        )}

        {nativeApp && (
          <>
            {iapDone && (
              <p className="mt-4 rounded-2xl bg-mint/30 p-3 text-sm font-bold text-navy">
                결제 완료! 곧 꼬북알이 계정에 반영돼요.
              </p>
            )}
            <NativeCreditStore onPurchased={handleIapPurchased} />
          </>
        )}

        {!nativeApp && (
          <div className="mt-4 grid gap-3">
            {CREDIT_PACKAGES.map((pkg) => {
              const breakdown = packageBreakdown(totalCredits(pkg));
              return (
                <button
                  key={pkg.id}
                  onClick={() => start(pkg.id)}
                  disabled={loading === pkg.id}
                  className={`relative overflow-hidden rounded-3xl border p-4 text-left disabled:opacity-60 ${
                    pkg.recommended
                      ? 'bg-white border-2 border-gold shadow-[0_14px_34px_rgba(44,62,80,0.11)]'
                      : pkg.bestValue
                        ? 'border-mint bg-white shadow-[0_12px_30px_rgba(78,205,196,0.14)]'
                        : 'bg-white/70 border-navy/10'
                  }`}
                >
                  {(pkg.badge || pkg.recommended || pkg.bestValue) && (
                    <Badge
                      tone={
                        pkg.recommended ? 'red' : pkg.bestValue ? 'mint' : 'gold'
                      }
                      className="absolute right-3 top-3"
                    >
                      {pkg.badge ?? (pkg.recommended ? '추천' : '효율')}
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
                        {pkg.bonusCredits > 0
                          ? ` · 보너스 ${pkg.bonusCredits}알`
                          : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-black text-navy">
                        {formatKrw(pkg.priceKrw)}원
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-muted">
                        알당{' '}
                        {formatKrw(Math.round(pkg.priceKrw / totalCredits(pkg)))}
                        원
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-1.5">
                    {pkg.perks.map((perk) => (
                      <span
                        key={perk}
                        className="flex items-center gap-2 text-xs font-bold text-[#3C4650]"
                      >
                        <Check
                          size={14}
                          strokeWidth={3}
                          className="text-mint-dark"
                        />
                        {perk}
                      </span>
                    ))}
                    {breakdown.readings > 0 && (
                      <span className="flex items-center gap-2 text-xs font-bold text-muted">
                        <Check size={14} strokeWidth={3} className="text-mint-dark" />
                        전체 풀이 {breakdown.readings}편 또는 채팅{' '}
                        {breakdown.chats}회
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!nativeApp && (
          <Card className="mt-4 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold/35 text-navy">
                <Sparkles size={19} strokeWidth={2.6} />
              </span>
              <div className="space-y-1.5 text-sm font-bold leading-relaxed text-[#3C4650]">
                <p>자동 갱신 없이 1회 결제만 진행돼요.</p>
                <p>
                  남은 {CREDIT_UNIT}은 계정에 적립되고 다음 풀이에 이어 쓸 수
                  있어요.
                </p>
                <p>AI 생성 실패 시 사용한 {CREDIT_UNIT}은 자동으로 돌려줘요.</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {!nativeApp && (
        <BottomActionBar>
          <ButtonPrimary
            tone="gold"
            onClick={() => start(recommended.id)}
            disabled={!!loading}
          >
            {loading
              ? '카카오페이로 이동 중...'
              : `${recommended.label} 충전하기`}
          </ButtonPrimary>
          <p className="mt-2 text-[11px] font-bold text-muted text-center leading-relaxed">
            정기결제가 아니며, 충전한 {CREDIT_UNIT}은 계정에 적립돼요.
            <br />
            결제 후 7일 이내 미사용분만 환불 가능 (사용 시 청약철회 제한).
            <br />
            결제 시{' '}
            <a href="/terms" className="underline">
              이용약관
            </a>
            {' · '}
            <a href="/privacy" className="underline">
              개인정보 처리방침
            </a>
            에 동의하게 됩니다.
          </p>
        </BottomActionBar>
      )}
    </main>
  );
}
