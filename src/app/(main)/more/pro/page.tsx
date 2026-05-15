'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';

export default function ProPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-sm opacity-60">불러오는 중...</main>}>
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
    <main className="px-5 pt-8 pb-12">
      <h1 className="text-2xl font-bold">꼬북점 Pro</h1>
      <p className="mt-1 text-sm opacity-70">한 잔 커피값으로 모든 풀이를 열어둬</p>

      {success && <p className="mt-3 rounded-xl bg-[var(--color-shell)]/30 p-3 text-sm">결제가 완료됐어!</p>}
      {cancelled && <p className="mt-3 rounded-xl bg-black/5 p-3 text-sm">결제를 취소했어.</p>}
      {failed && <p className="mt-3 rounded-xl bg-red-100 text-red-800 p-3 text-sm">결제에 실패했어. 다시 시도해줘.</p>}

      <section className="mt-6 rounded-3xl bg-white shadow-sm p-5 space-y-3">
        {[
          '12가지 풀이 전부 잠금 해제',
          '4명의 꼬북이와 무제한 채팅',
          '대운 타임라인 + 과거 검증',
          '인연 무제한 등록 + 깊은 궁합',
          '매일 아침 한 줄 운세 푸시',
          '좋은 날짜 (길일) 찾기',
        ].map((line) => (
          <div key={line} className="flex items-center gap-3 text-sm">
            <Check size={18} className="text-[var(--color-shell-dark)] shrink-0" />
            <span>{line}</span>
          </div>
        ))}
      </section>

      {isPro ? (
        <button
          onClick={cancel}
          className="mt-6 w-full rounded-2xl bg-black/5 text-[var(--color-ink)] py-4 text-sm"
        >
          구독 해지
        </button>
      ) : (
        <div className="mt-6 space-y-3">
          <button
            onClick={() => start('yearly')}
            disabled={loading === 'yearly'}
            className="w-full rounded-2xl bg-[var(--color-shell-dark)] text-white py-4 font-semibold disabled:opacity-60 relative"
          >
            연간 79,000원
            <span className="absolute top-2 right-3 text-[10px] bg-[var(--color-gold)] text-[var(--color-ink)] px-2 py-0.5 rounded-full">
              월 6,583원 · 17% 할인
            </span>
          </button>
          <button
            onClick={() => start('monthly')}
            disabled={loading === 'monthly'}
            className="w-full rounded-2xl bg-white border border-black/10 py-4 font-semibold disabled:opacity-60"
          >
            월간 7,900원
          </button>
        </div>
      )}

      <p className="mt-4 text-xs opacity-50 text-center">언제든 해지 가능. 결제 기간 종료까지 Pro 유지.</p>
    </main>
  );
}
