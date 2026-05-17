'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Card, ButtonPrimary, Badge } from '@/components/ui/primitives';
import { BottomActionBar } from '@/components/nav/BottomActionBar';

export default function ProPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-sm font-bold opacity-60">불러오는 중...</main>}>
      <ProPageInner />
    </Suspense>
  );
}

function ProPageInner() {
  const params = useSearchParams();
  const success = params.get('success');
  const cancelled = params.get('cancelled');
  const failed = params.get('failed');
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    void fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setIsPro(!!d?.user?.is_pro));
  }, [success]);

  async function start(plan: 'monthly' | 'yearly') {
    setLoading(plan);
    try {
      const res = await fetch('/api/payment/kakao/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
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

  async function cancel() {
    if (!confirm('정말 해지할까? 이번 결제 기간이 끝나면 무료로 돌아가.')) return;
    await fetch('/api/payment/kakao/cancel', { method: 'POST' });
    setIsPro(false);
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
            두루마리를 펼치면<br />막힌 풀이가 이어집니다
          </div>
        </Card>

        <h1 className="mt-6 text-2xl font-black text-navy tracking-tight">꼬북 Pro</h1>
        <p className="mt-1 text-sm font-semibold text-[#82786D]">
          무료 운세를 넘어, 등껍질 전체 해석과 무제한 질문을 열어보세요.
        </p>

        {success && <p className="mt-4 rounded-xl bg-mint/30 p-3 text-sm font-bold">결제가 완료됐어!</p>}
        {cancelled && <p className="mt-4 rounded-xl bg-black/5 p-3 text-sm font-bold">결제를 취소했어.</p>}
        {failed && <p className="mt-4 rounded-xl bg-red/15 text-red p-3 text-sm font-bold">결제에 실패했어. 다시 시도해줘.</p>}

        <table className="w-full mt-5 rounded-3xl overflow-hidden bg-soft/90 border border-navy/10 text-xs font-extrabold shadow-[0_12px_30px_rgba(44,62,80,0.08)]">
          <thead>
            <tr className="bg-white">
              <th className="text-left p-3 text-muted">기능</th>
              <th className="p-3 text-muted">무료</th>
              <th className="p-3 text-navy">Pro</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-navy/5">
              <td className="text-left p-3 text-muted">오늘 운세</td>
              <td className="text-center p-3">○</td>
              <td className="text-center p-3">○</td>
            </tr>
            <tr className="border-t border-navy/5">
              <td className="text-left p-3 text-muted">사주 카테고리</td>
              <td className="text-center p-3">3개</td>
              <td className="text-center p-3 text-navy">12개</td>
            </tr>
            <tr className="border-t border-navy/5">
              <td className="text-left p-3 text-muted">꼬북도사 질문</td>
              <td className="text-center p-3">3회</td>
              <td className="text-center p-3 text-navy">무제한</td>
            </tr>
            <tr className="border-t border-navy/5">
              <td className="text-left p-3 text-muted">대운/인연 지도</td>
              <td className="text-center p-3">미리보기</td>
              <td className="text-center p-3 text-navy">전체</td>
            </tr>
          </tbody>
        </table>

        {!isPro && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={() => start('monthly')}
              disabled={loading === 'monthly'}
              className="text-left rounded-3xl bg-white/60 border border-navy/10 p-4 disabled:opacity-60"
            >
              <p className="text-xs font-black text-muted">월간</p>
              <p className="mt-1 text-2xl font-black text-navy tracking-tight">7,900원</p>
              <p className="text-xs font-bold text-muted">가볍게 시작</p>
            </button>
            <button
              onClick={() => start('yearly')}
              disabled={loading === 'yearly'}
              className="text-left rounded-3xl bg-white border-2 border-gold p-4 shadow-[0_14px_34px_rgba(44,62,80,0.11)] disabled:opacity-60 relative"
            >
              <Badge tone="red" className="absolute -top-2 right-3">추천 · 2개월 무료</Badge>
              <p className="text-xs font-black text-muted">연간</p>
              <p className="mt-1 text-2xl font-black text-navy tracking-tight">79,000원</p>
              <p className="text-xs font-bold text-muted">월 6,583원</p>
            </button>
          </div>
        )}

        <Card className="mt-4 p-4 space-y-2 text-sm font-bold text-[#3C4650]">
          <p>✓ 12개 풀이 카테고리 전체 오픈</p>
          <p>✓ 꼬북도사·무당·보살 무제한 채팅</p>
          <p>✓ 대운별 검증 코멘트</p>
          <p>✓ 인연 지도 20명 저장</p>
          <p>✓ 매일 길운 푸시 리포트</p>
          <p>✓ 길일 찾기 (이사·계약·결혼…)</p>
        </Card>
      </div>

      <BottomActionBar>
        {isPro ? (
          <ButtonPrimary onClick={cancel}>구독 해지</ButtonPrimary>
        ) : (
          <ButtonPrimary tone="gold" onClick={() => start('yearly')} disabled={!!loading}>
            Pro로 등껍질 전체 열기
          </ButtonPrimary>
        )}
        <p className="mt-2 text-[11px] font-bold text-muted text-center">언제든 해지 가능. 결제 기간 종료까지 Pro 유지.</p>
      </BottomActionBar>
    </main>
  );
}
