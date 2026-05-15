'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DaeunTimeline } from '@/components/timeline/DaeunTimeline';
import { ColdReadCard } from '@/components/timeline/ColdReadCard';
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
    void fetch('/api/timeline/boot')
      .then((r) => {
        if (r.status === 401) router.push('/login');
        if (r.status === 402) router.push('/more/pro');
        return r.json();
      })
      .then((d) => setData(d));
  }, [router]);

  if (!data) return <main className="p-8 text-center text-sm opacity-60">대운 불러오는 중...</main>;

  return (
    <main className="px-5 pt-8 pb-12">
      <h1 className="text-2xl font-bold">대운 타임라인</h1>
      <p className="text-xs opacity-60 mt-1">큰 기운이 바뀌는 10년 단위. 과거를 짚으면 정확도를 검증할 수 있어.</p>

      <div className="mt-6">
        <DaeunTimeline periods={data.daewoon} currentYear={currentYear} onSelect={setSelected} />
      </div>

      {selected && <ColdReadCard period={selected} />}

      {!selected && <p className="mt-8 text-center text-sm opacity-60">기간을 탭해서 풀이를 받아봐</p>}
    </main>
  );
}
