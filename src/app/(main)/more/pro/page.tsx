'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Check,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  ScrollText,
  Heart,
  CalendarCheck,
  Image as ImageIcon,
} from 'lucide-react';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Card, ButtonPrimary, Badge } from '@/components/ui/primitives';
import { BottomActionBar } from '@/components/nav/BottomActionBar';
import { FirstDealBanner } from '@/components/store/FirstDealBanner';
import {
  CREDIT_COSTS,
  CREDIT_PACKAGES,
  CREDIT_UNIT,
  type CreditPackageId,
  formatKrw,
  INTERPRETATION_COST_BY_PERSONA,
  packageBreakdown,
  totalCredits,
} from '@/lib/credits';
import { PREMIUM_SERVICES } from '@/lib/premium-services';
import { isNativeApp } from '@/lib/utils/platform';
import { track, fbqTrack } from '@/lib/analytics/track';

const STORE_PROMISES = [
  '정기결제 없음',
  '결제 즉시 적립',
  '모든 AI 풀이 공통 사용',
];

// 사주 해설은 모드(페르소나)별로 가격이 다름 — 꼬북이(2) ~ 도사(5).
// 가장 싼/비싼 모드를 모두 보여줘 사용자 기대 정렬.
const INTERP_RANGE = `${Math.min(
  ...Object.values(INTERPRETATION_COST_BY_PERSONA),
)}-${Math.max(...Object.values(INTERPRETATION_COST_BY_PERSONA))}`;

const USAGE_ITEMS = [
  ['채팅 1회', CREDIT_COSTS.chat],
  ['사주 해설 (모드별)', INTERP_RANGE],
  ['대운 AI 해설', CREDIT_COSTS.daewoon],
  ['길일 찾기', CREDIT_COSTS.auspicious],
  ['궁합 리포트', CREDIT_COSTS.compatibility],
  // ['부적 이미지', CREDIT_COSTS.talisman], // 부적 만들기 — 임시 숨김
  [
    '프리미엄 운세 상품',
    `${Math.min(...PREMIUM_SERVICES.map((s) => s.cost))}-${Math.max(...PREMIUM_SERVICES.map((s) => s.cost))}`,
  ],
] as const;

const RECOMMENDED_BUNDLES = [
  {
    title: '오늘 궁금증 풀기',
    body: '정밀 리포트 2개 + 채팅 5회',
    cost: 12,
  },
  {
    title: '연애 집중 보기',
    body: '연애 심화 5개 + 궁합 3회 + 채팅 8회',
    cost: 30,
  },
];

/** 패키지로 살 수 있는 기능별 회수 시각화 — CREDIT_COSTS와 자동 동기화. */
function PackageBreakdownGrid({ total }: { total: number }) {
  const b = packageBreakdown(total);
  // 가장 가치 큰 4개만 (정밀 풀이 / 궁합 / 부적 / 채팅).
  // 채팅은 회수가 많아 마지막에 배치.
  const rows: Array<{ icon: typeof ScrollText; label: string; count: number; color: string }> = [
    { icon: ScrollText, label: '정밀 풀이', count: b.interpretations, color: 'text-mint-dark' },
    { icon: Heart, label: '궁합', count: b.compats, color: 'text-red' },
    { icon: ImageIcon, label: '부적/웹툰', count: Math.max(b.talismans, b.comics), color: 'text-[#B58A00]' },
    { icon: CalendarCheck, label: '길일', count: b.auspicious, color: 'text-navy' },
  ];
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-navy/12 bg-ivory/45 p-2.5">
      <p className="px-1 text-[10px] font-extrabold text-muted">
        이걸로 살 수 있는 것
      </p>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {rows.map(({ icon: Icon, label, count, color }) => (
          <div
            key={label}
            className="rounded-xl bg-white/85 px-1.5 py-2 text-center"
          >
            <Icon size={14} strokeWidth={2.6} className={`mx-auto ${color}`} />
            <p className="mt-1 text-[10px] font-extrabold text-muted leading-none">
              {label}
            </p>
            <p className="mt-0.5 text-sm font-black text-navy leading-none">
              {count}
              <span className="ml-0.5 text-[10px] font-bold">
                {label === '정밀 풀이' || label === '길일' ? '개' : '회'}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const purchaseId = params.get('pid');
  const purchaseAmt = params.get('amt');
  const [loading, setLoading] = useState<CreditPackageId | 'firstdeal' | null>(null);
  const [balance, setBalance] = useState(0);
  const [nativeApp, setNativeApp] = useState(false);
  const recommended = useMemo(
    () => CREDIT_PACKAGES.find((pkg) => pkg.recommended) ?? CREDIT_PACKAGES[0],
    [],
  );

  useEffect(() => {
    setNativeApp(isNativeApp());
  }, []);

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

  async function start(packageId: CreditPackageId | 'firstdeal') {
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

  return (
    <main className="px-5 pt-8 pb-[15rem] relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-muted">
              {nativeApp ? '보유 현황' : '꼬북점 유료 콘텐츠 상점'}
            </p>
            <h1 className="text-3xl font-black tracking-tight text-navy">
              {nativeApp ? '내 꼬북알' : '꼬북상점'}
            </h1>
          </div>
          <Badge tone="gold">
            {balance} {CREDIT_UNIT} 보유
          </Badge>
        </div>

        {!nativeApp && (
          <div className="mt-5">
            <FirstDealBanner />
          </div>
        )}

        <Card className="mt-5 overflow-hidden p-5">
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <KkobukAvatar variant="dosa" size="lg" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-mint-dark">
                풀이를 여는 꼬북알
              </p>
              <p className="mt-1 text-xl font-black leading-snug text-navy">
                필요한 순간마다
                <br />
                보고 싶은 운세만 열어봐
              </p>
              <p className="mt-2 text-xs font-bold leading-relaxed text-muted">
                꼬북알은 AI 정밀 리포트, 궁합, 길일에 모두 쓰는 꼬북점 전용
                포인트예요.
              </p>
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

        <Card className="mt-5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-navy">{CREDIT_UNIT} 사용처</p>
            <ShoppingBag size={18} strokeWidth={2.5} className="text-muted" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#3C4650]">
            {USAGE_ITEMS.map(([label, cost], index) => (
              <div
                key={label}
                className={`rounded-2xl p-3 ${
                  index < 2
                    ? 'bg-mint/10'
                    : index < 4
                      ? 'bg-gold/20'
                      : 'border border-navy/10 bg-white'
                }`}
              >
                {label} · {cost}알
              </div>
            ))}
          </div>
        </Card>

        {!nativeApp && (
          <div className="mt-4 grid gap-2">
            {RECOMMENDED_BUNDLES.map((bundle) => (
              <div
                key={bundle.title}
                className="rounded-3xl border border-navy/10 bg-white/75 p-4 shadow-[0_9px_22px_rgba(44,62,80,0.06)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-navy">
                      {bundle.title}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-muted">
                      {bundle.body}
                    </p>
                  </div>
                  <Badge tone="mint">
                    {bundle.cost}
                    {CREDIT_UNIT}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {!nativeApp && (
          <div className="mt-4 grid gap-3">
            {CREDIT_PACKAGES.map((pkg) => (
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
                      {formatKrw(Math.round(pkg.priceKrw / totalCredits(pkg)))}원
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
                </div>

                {/* 환산 사용 가능 횟수 — CREDIT_COSTS 변경 시 자동 동기화.
                    너무 작은 팩(예: 2알)은 전부 0이라 그리드를 숨김. */}
                {totalCredits(pkg) >= CREDIT_COSTS.interpretation && (
                  <PackageBreakdownGrid total={totalCredits(pkg)} />
                )}
              </button>
            ))}
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
                <p>
                  AI 생성 실패 시 사용한 {CREDIT_UNIT}은 자동으로 돌려줘요.
                </p>
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
            <a href="/terms" className="underline">이용약관</a>
            {' · '}
            <a href="/privacy" className="underline">개인정보 처리방침</a>에 동의하게 됩니다.
          </p>
        </BottomActionBar>
      )}
    </main>
  );
}
