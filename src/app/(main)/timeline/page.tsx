'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LifeRoad } from '@/components/timeline/LifeRoad';
import { ColdReadCard } from '@/components/timeline/ColdReadCard';
import { Badge, Card } from '@/components/ui/primitives';
import type { DaewoonPeriod } from '@/lib/saju/types';

interface BootData {
  isPro: boolean;
  daewoon: DaewoonPeriod[];
}

export default function TimelinePage() {
  const router = useRouter();
  const [data, setData] = useState<BootData | null>(null);
  const [selected, setSelected] = useState<DaewoonPeriod | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    void (async () => {
      const r = await fetch('/api/timeline/boot');
      if (r.status === 401) {
        router.push('/login');
        return;
      }
      if (r.status === 402) {
        router.push('/more/pro');
        return;
      }
      if (!r.ok) return;
      const d = (await r.json()) as BootData;
      if (!Array.isArray(d.daewoon)) return;
      setData(d);
      const curr = d.daewoon.find(
        (p: DaewoonPeriod) => currentYear >= p.startYear && currentYear <= p.startYear + 9,
      );
      if (curr) setSelected(curr);
    })();
  }, [router, currentYear]);

  if (!data) return <main className="p-8 text-center text-sm font-bold opacity-60">대운 불러오는 중...</main>;

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
            periods={data.daewoon}
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
