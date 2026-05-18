'use client';

import { useEffect, useState } from 'react';
import type { DaewoonPeriod } from '@/lib/saju/types';

export function ColdReadCard({ period }: { period: DaewoonPeriod }) {
  const [text, setText] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<
    'correct' | 'wrong' | 'partial' | null
  >(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setText(null);
    setFeedback(null);
    setLoading(true);
    void fetch('/api/timeline/coldread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daewoonStartYear: period.startYear }),
    })
      .then((r) => r.json())
      .then((d) => setText(d.text ?? null))
      .finally(() => setLoading(false));
  }, [period.startYear]);

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
      {loading && (
        <div className="mt-3 rounded-2xl bg-ivory px-4 py-4">
          <p className="text-sm font-bold leading-relaxed text-muted">
            선택한 10년을 내 사주와 연결해서 읽는 중이야. 곧 이 시기의 반복되는
            사건, 기회, 조심할 점을 정리해줄게.
          </p>
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
