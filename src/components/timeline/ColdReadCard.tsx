'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DaewoonPeriod } from '@/lib/saju/types';
import { CREDIT_COSTS } from '@/lib/credits';

export function ColdReadCard({ period }: { period: DaewoonPeriod }) {
  const [text, setText] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<
    'correct' | 'wrong' | 'partial' | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/timeline/coldread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daewoonStartYear: period.startYear }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'unknown',
        );
      }
      setText(data.text ?? null);
    } catch (e) {
      const code = e instanceof Error ? e.message : 'unknown';
      setError(
        code === 'insufficient_credits'
          ? '꼬북알이 부족해. 충전 후 다시 눌러줘.'
          : '대운 해설을 생성하지 못했어. 잠시 후 다시 시도해줘.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback(fb: 'correct' | 'wrong' | 'partial') {
    if (!text) return;
    setFeedback(fb);
    await fetch('/api/timeline/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daewoonStartYear: period.startYear,
        coldreadText: text,
        feedback: fb,
      }),
    });
  }

  return (
    <div className="rounded-3xl bg-white shadow-sm p-5 mt-4">
      <p className="text-xs font-black text-muted">꼬북도사 AI 해설</p>
      <div className="mt-1 text-xs opacity-60 mb-1">
        {period.startYear}–{period.startYear + 9} · {period.startAge}–
        {period.startAge + 9}세 · {period.pillar.ganHanja}
        {period.pillar.jiHanja} ({period.sipsung})
      </div>
      {!text && !loading && (
        <button
          onClick={generate}
          className="mt-3 w-full rounded-2xl bg-navy py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(44,62,80,0.18)]"
        >
          {CREDIT_COSTS.daewoon}꼬북알로 대운 AI 해설 보기
        </button>
      )}
      {loading && (
        <div className="mt-3 rounded-2xl bg-ivory px-4 py-4">
          <p className="text-sm font-bold leading-relaxed text-muted">
            선택한 10년을 내 사주와 연결해서 읽는 중이야. 곧 이 시기의 반복되는
            사건, 기회, 조심할 점을 정리해줄게.
          </p>
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-2xl bg-red/10 px-4 py-3 text-sm font-bold text-red">
          {error}{' '}
          {error.includes('부족') && (
            <Link href="/more/pro" className="underline underline-offset-4">
              충전하기
            </Link>
          )}
        </div>
      )}
      {text && <p className="mt-2 leading-relaxed text-[15px]">{text}</p>}
      {text && (
        <div className="mt-4 flex gap-2">
          <button
            disabled={!!feedback}
            onClick={() => submitFeedback('correct')}
            className={`flex-1 rounded-xl py-2 text-sm border ${
              feedback === 'correct'
                ? 'bg-[var(--color-shell-dark)] text-white border-[var(--color-shell-dark)]'
                : 'border-black/10'
            }`}
          >
            맞았어
          </button>
          <button
            disabled={!!feedback}
            onClick={() => submitFeedback('partial')}
            className={`flex-1 rounded-xl py-2 text-sm border ${
              feedback === 'partial'
                ? 'bg-[var(--color-gold)] text-[var(--color-ink)] border-[var(--color-gold)]'
                : 'border-black/10'
            }`}
          >
            반쯤
          </button>
          <button
            disabled={!!feedback}
            onClick={() => submitFeedback('wrong')}
            className={`flex-1 rounded-xl py-2 text-sm border ${
              feedback === 'wrong'
                ? 'bg-[#E74C3C] text-white border-[#E74C3C]'
                : 'border-black/10'
            }`}
          >
            틀렸어
          </button>
        </div>
      )}
    </div>
  );
}
