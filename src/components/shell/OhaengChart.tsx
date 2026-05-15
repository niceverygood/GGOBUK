import type { OhaengCount } from '@/lib/saju/types';

const COLORS: Record<keyof OhaengCount, string> = {
  목: '#5DADE2',
  화: '#E74C3C',
  토: '#F4D03F',
  금: '#ECF0F1',
  수: '#34495E',
};

export function OhaengChart({ counts, total = 8 }: { counts: OhaengCount; total?: number }) {
  const entries = (Object.keys(counts) as Array<keyof OhaengCount>).map((k) => ({
    name: k,
    count: counts[k],
  }));

  return (
    <div className="grid grid-cols-5 gap-1.5 w-full">
      {entries.map((e) => {
        const pct = Math.round((e.count / total) * 100);
        return (
          <div key={e.name} className="flex flex-col items-center min-w-0">
            <div className="h-20 w-full rounded-xl bg-black/5 flex items-end overflow-hidden">
              <div
                className="w-full transition-all"
                style={{ height: `${Math.max(8, pct)}%`, backgroundColor: COLORS[e.name] }}
              />
            </div>
            <div className="mt-1.5 text-sm font-bold text-navy">{e.name}</div>
            <div className="text-[11px] font-bold opacity-60">{e.count}</div>
          </div>
        );
      })}
    </div>
  );
}
