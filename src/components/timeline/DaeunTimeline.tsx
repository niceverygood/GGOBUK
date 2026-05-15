'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { DaewoonPeriod } from '@/lib/saju/types';
import { cn } from '@/lib/utils/cn';

const OHAENG_COLOR: Record<string, string> = {
  목: '#5DADE2',
  화: '#E74C3C',
  토: '#F4D03F',
  금: '#ECF0F1',
  수: '#34495E',
};

export function DaeunTimeline({
  periods,
  currentYear,
  onSelect,
}: {
  periods: DaewoonPeriod[];
  currentYear: number;
  onSelect: (p: DaewoonPeriod) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  return (
    <div className="overflow-x-auto no-scrollbar -mx-5 px-5 py-3">
      <div className="flex gap-2 min-w-max">
        {periods.map((p, i) => {
          const isPast = p.startYear + 9 < currentYear;
          const isCurrent = currentYear >= p.startYear && currentYear <= p.startYear + 9;
          const ohaeng = p.pillar.ganOhaeng;
          const selected = selectedIdx === i;
          return (
            <motion.button
              key={p.startYear}
              onClick={() => {
                setSelectedIdx(i);
                onSelect(p);
              }}
              whileTap={{ scale: 0.96 }}
              className={cn(
                'shrink-0 w-24 rounded-2xl p-3 text-center border-2 transition',
                isCurrent
                  ? 'border-[var(--color-shell-dark)] bg-white'
                  : selected
                    ? 'border-[var(--color-ink)] bg-white'
                    : 'border-transparent bg-white/70',
                isPast && !selected && 'opacity-70',
              )}
              style={{ backgroundColor: selected || isCurrent ? undefined : `${OHAENG_COLOR[ohaeng]}1A` }}
            >
              <div className="text-[10px] opacity-60">
                {p.startAge}–{p.startAge + 9}세
              </div>
              <div className="text-xl font-serif mt-1">
                {p.pillar.ganHanja}
                {p.pillar.jiHanja}
              </div>
              <div className="text-[10px] mt-1 opacity-70">{p.sipsung}</div>
              <div className="text-[10px] opacity-60">{p.startYear}–</div>
              {isCurrent && <div className="text-[10px] text-[var(--color-shell-dark)] mt-1 font-semibold">현재</div>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
