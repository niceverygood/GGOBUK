'use client';

import { useMemo, useState } from 'react';
import { monthFortune, type DayFortune } from '@/lib/saju/fortune_calendar';
import { buildSajuResult } from '@/lib/saju';
import type { SajuInput } from '@/lib/saju/types';
import { Card, Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const GRADE_STYLE: Record<string, { dot: string; chip: string }> = {
  길: { dot: 'bg-mint', chip: 'bg-mint/20 text-[#163438]' },
  평: { dot: 'bg-navy/25', chip: 'bg-navy/10 text-navy' },
  주의: { dot: 'bg-red', chip: 'bg-red/15 text-red' },
};

function todayKstIso(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + (540 + now.getTimezoneOffset()) * 60000);
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
}

export function FortuneCalendar({
  input,
  name,
}: {
  input: SajuInput;
  name: string;
}) {
  const saju = useMemo(() => buildSajuResult(input), [input]);
  const today = todayKstIso();
  const [ym, setYm] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { y, m };
  });
  const data = useMemo(() => monthFortune(saju, ym.y, ym.m), [saju, ym]);
  const [selected, setSelected] = useState<DayFortune | null>(
    () => data.days.find((d) => d.date === today) ?? null,
  );

  function move(delta: number) {
    setSelected(null);
    setYm((cur) => {
      const m0 = cur.m - 1 + delta;
      const y = cur.y + Math.floor(m0 / 12);
      const m = ((m0 % 12) + 12) % 12 + 1;
      return { y, m };
    });
  }

  const blanks = Array.from({ length: data.firstWeekday });

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => move(-1)}
          className="h-9 w-9 rounded-full bg-white border border-navy/10 text-navy font-black"
          aria-label="이전 달"
        >
          ‹
        </button>
        <h2 className="text-lg font-black text-navy">
          {ym.y}년 {ym.m}월
        </h2>
        <button
          onClick={() => move(1)}
          className="h-9 w-9 rounded-full bg-white border border-navy/10 text-navy font-black"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="mt-3 flex gap-3 text-[11px] font-bold text-muted">
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-mint inline-block" />길일</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-navy/25 inline-block" />평이</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-red inline-block" />주의</span>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={cn('text-[11px] font-extrabold py-1', i === 0 ? 'text-red' : i === 6 ? 'text-ohaeng-wood' : 'text-muted')}>
            {w}
          </div>
        ))}
        {blanks.map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {data.days.map((d) => {
          const isToday = d.date === today;
          const isSel = selected?.date === d.date;
          const gs = GRADE_STYLE[d.grade];
          return (
            <button
              key={d.date}
              onClick={() => setSelected(d)}
              className={cn(
                'aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border transition active:scale-95',
                isSel ? 'border-navy bg-navy/5' : 'border-transparent',
                isToday && !isSel ? 'ring-2 ring-mint' : '',
              )}
            >
              <span className={cn('text-sm font-bold', d.weekday === 0 ? 'text-red' : 'text-navy')}>
                {d.day}
              </span>
              <span className={cn('h-1.5 w-1.5 rounded-full', gs.dot)} />
            </button>
          );
        })}
      </div>

      {/* Best / caution summary */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs font-extrabold text-mint-dark">이달의 길일</p>
          <ul className="mt-2 space-y-1 text-sm font-bold text-navy">
            {data.best.map((d) => (
              <li key={d.date}>
                {d.day}일 <span className="font-hanja text-xs">{d.ganHanja}{d.jiHanja}</span> · {d.score}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-extrabold text-red">조심할 날</p>
          <ul className="mt-2 space-y-1 text-sm font-bold text-navy">
            {data.caution.map((d) => (
              <li key={d.date}>
                {d.day}일 <span className="font-hanja text-xs">{d.ganHanja}{d.jiHanja}</span> · {d.score}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Selected day detail */}
      {selected && (
        <Card className="mt-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-muted">
                {ym.y}.{String(ym.m).padStart(2, '0')}.{String(selected.day).padStart(2, '0')} ({WEEKDAYS[selected.weekday]})
              </p>
              <p className="mt-1 text-lg font-black text-navy">
                일진 <span className="font-hanja">{selected.ganHanja}{selected.jiHanja}</span>
                <span className="ml-1 text-sm font-bold text-muted">
                  {selected.iljiGan}{selected.iljiJi}
                </span>
              </p>
            </div>
            <Badge tone={selected.grade === '길' ? 'mint' : selected.grade === '주의' ? 'red' : 'navy'}>
              {selected.grade} {selected.score}
            </Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            <span className={cn('px-2.5 py-1 rounded-full', GRADE_STYLE[selected.grade].chip)}>
              {selected.note}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-navy/5 text-navy">
              {name} 일간과 {selected.sipsung}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-navy/5 text-navy">
              지지 {selected.jiOhaeng} 기운
            </span>
            {selected.hap && <span className="px-2.5 py-1 rounded-full bg-mint/20 text-[#163438]">일지 합</span>}
            {selected.chung && <span className="px-2.5 py-1 rounded-full bg-red/15 text-red">일지 충</span>}
          </div>
        </Card>
      )}
    </div>
  );
}
