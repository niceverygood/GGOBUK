'use client';

import { useState } from 'react';
import { LifeRoad } from '@/components/timeline/LifeRoad';
import { ColdReadCard } from '@/components/timeline/ColdReadCard';
import { Badge, Card } from '@/components/ui/primitives';
import type { DaewoonPeriod } from '@/lib/saju/types';

interface TimelineClientProps {
  daewoon: DaewoonPeriod[];
}

export function TimelineClient({ daewoon }: TimelineClientProps) {
  const currentYear = new Date().getFullYear();
  const [selected, setSelected] = useState<DaewoonPeriod | null>(() => {
    return daewoon.find((p) => currentYear >= p.startYear && currentYear <= p.startYear + 9) ?? daewoon[0] ?? null;
  });

  const currentAge = selected ? currentYear - selected.startYear + selected.startAge : 0;

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-muted">10년 단위 인생 흐름</p>
            <h1 className="text-2xl font-black tracking-tight text-navy">대운 타임라인</h1>
          </div>
          <Badge tone="mint">현재 {currentAge}세</Badge>
        </div>

        <Card className="mt-5 pl-2 pr-2 py-2">
          <LifeRoad
            periods={daewoon}
            currentYear={currentYear}
            selectedStartYear={selected?.startYear ?? null}
            onSelect={setSelected}
          />
        </Card>

        {selected && (
          <>
            <Card className="mt-4 p-4">
              <p className="text-sm font-black text-navy">
                현재 <span className="font-hanja">{selected.pillar.ganHanja}{selected.pillar.jiHanja}</span> 대운 ({selected.sipsung})
              </p>
              <p className="mt-1 text-sm font-semibold text-[#82786D]">
                관계망과 브랜드가 커지는 시기. 단, 돈보다 신뢰를 먼저 쌓아야 오래 갑니다.
              </p>
            </Card>
            <ColdReadCard period={selected} />
          </>
        )}
      </div>
    </main>
  );
}
