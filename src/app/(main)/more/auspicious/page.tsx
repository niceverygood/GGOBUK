'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CREDIT_COSTS } from '@/lib/credits';

interface Suggestion {
  date: string;
  reason: string;
  score: number;
}

export default function AuspiciousPage() {
  const router = useRouter();
  const [purpose, setPurpose] = useState('이사');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [needsCredit, setNeedsCredit] = useState(false);

  async function search() {
    setLoading(true);
    setResults([]);
    setNeedsCredit(false);
    try {
      const res = await fetch('/api/auspicious', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose, start, end }),
      });
      if (res.status === 402) {
        setNeedsCredit(true);
        return;
      }
      const d = await res.json();
      setResults(d.suggestions ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="px-5 pt-8 pb-32">
      <h1 className="text-2xl font-bold">길일 찾기</h1>
      <p className="text-xs opacity-60 mt-1">
        중요한 날, 사주에 맞는 좋은 날짜를 골라줄게
      </p>

      <div className="mt-6 space-y-3">
        <input
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="목적 (예: 이사, 계약, 결혼, 출장)"
          className="w-full rounded-2xl bg-white px-4 py-3 shadow-sm"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="flex-1 rounded-2xl bg-white px-4 py-3 shadow-sm"
          />
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="flex-1 rounded-2xl bg-white px-4 py-3 shadow-sm"
          />
        </div>
        <button
          onClick={search}
          disabled={loading || !start || !end}
          className="w-full rounded-2xl bg-[var(--color-shell-dark)] text-white py-3 font-semibold disabled:opacity-60"
        >
          {loading ? '꼬북도사가 살펴보는 중...' : '좋은 날 찾기'}
        </button>
        <p className="text-center text-[11px] font-bold opacity-60">
          검색 1회에 {CREDIT_COSTS.auspicious}꼬북알을 사용해.
        </p>
      </div>

      {needsCredit && (
        <div className="mt-6 rounded-2xl bg-[var(--color-gold)]/30 p-4 text-sm">
          꼬북알이 부족해.
          <button
            onClick={() => router.push('/more/pro')}
            className="ml-2 underline font-semibold"
          >
            충전하기
          </button>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {results.map((r) => (
          <li key={r.date} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{r.date}</div>
              <div className="text-[var(--color-shell-dark)] font-bold">
                {r.score}점
              </div>
            </div>
            <p className="mt-1 text-sm opacity-80">{r.reason}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
