'use client';

import { useRef, useEffect } from 'react';
import type { DaewoonPeriod } from '@/lib/saju/types';
import { cn } from '@/lib/utils/cn';

const EMOJI_BY_SIPSUNG: Record<string, string> = {
  비견: '🐢',
  겁재: '🔥',
  식신: '📘',
  상관: '🎤',
  편재: '💰',
  정재: '💼',
  편관: '⚔',
  정관: '🏛',
  편인: '🌱',
  정인: '📜',
};

export function LifeRoad({
  periods,
  currentYear,
  selectedStartYear,
  onSelect,
}: {
  periods: DaewoonPeriod[];
  currentYear: number;
  selectedStartYear: number | null;
  onSelect: (p: DaewoonPeriod) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-center the current period on first paint.
  useEffect(() => {
    if (!scrollRef.current) return;
    const currIdx = periods.findIndex(
      (p) => currentYear >= p.startYear && currentYear <= p.startYear + 9,
    );
    if (currIdx >= 0) {
      const target = currIdx * 92 - 100;
      scrollRef.current.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }
  }, [periods, currentYear]);

  return (
    <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden no-scrollbar pt-8 pb-2">
      <div className="relative" style={{ width: `${periods.length * 92 + 60}px`, height: '260px' }}>
        {/* horizontal road */}
        <div
          className="absolute top-[110px] h-[18px] rounded-full"
          style={{
            left: '25px',
            right: '30px',
            background:
              'linear-gradient(90deg, #6FD8D0, #F4D03F, rgba(44,62,80,0.18))',
          }}
        />
        {periods.map((p, i) => {
          const isPast = p.startYear + 9 < currentYear;
          const isCurrent = currentYear >= p.startYear && currentYear <= p.startYear + 9;
          const isSelected = selectedStartYear === p.startYear;
          const emoji = EMOJI_BY_SIPSUNG[p.sipsung] ?? '✦';
          return (
            <button
              key={p.startYear}
              onClick={() => onSelect(p)}
              className={cn(
                'absolute w-[86px] text-center top-12 -translate-y-1/2',
                !isPast && !isCurrent && 'opacity-40 blur-[0.2px]',
              )}
              style={{ left: `${8 + i * 92}px` }}
            >
              {isCurrent && (
                <div className="text-red font-black text-xs mb-1 leading-tight">
                  현재<br />▼
                </div>
              )}
              <div
                className={cn(
                  'mx-auto w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-[0_8px_18px_rgba(44,62,80,0.1)] border-[4px]',
                  isCurrent
                    ? 'border-mint'
                    : isSelected
                      ? 'border-gold'
                      : 'border-mint/60',
                )}
              >
                {emoji}
              </div>
              <div className="font-hanja font-black text-navy mt-2 text-lg leading-none">
                {p.pillar.ganHanja}{p.pillar.jiHanja}
              </div>
              <p className="text-[10px] font-bold text-muted mt-1">
                {p.startAge}~{p.startAge + 9}세
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
