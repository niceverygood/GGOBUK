'use client';

import Link from 'next/link';

export interface GraphNode {
  id: string;
  name: string;
  relationLabel: string | null;
  ohaeng: string | null;
  score: number | null;
}

const OHAENG_COLOR: Record<string, string> = {
  목: '#5DADE2',
  화: '#E74C3C',
  토: '#F4D03F',
  금: '#ECF0F1',
  수: '#34495E',
};

const OHAENG_TEXT: Record<string, string> = {
  목: '#143537',
  화: 'white',
  토: '#3F3420',
  금: '#2C3E50',
  수: 'white',
};

const ICON_BY_RELATION: Record<string, string> = {
  family: '👪',
  friend: '👤',
  lover: '💛',
  colleague: '💼',
  other: '✦',
};

const SLOTS: Array<{ x: number; y: number }> = [
  { x: 50, y: 15 },
  { x: 82, y: 30 },
  { x: 82, y: 70 },
  { x: 50, y: 85 },
  { x: 18, y: 70 },
  { x: 18, y: 30 },
  { x: 84, y: 50 },
  { x: 16, y: 50 },
];

function ohaengAtMidpoint(score: number | null): 'green' | 'red' | 'neutral' {
  if (score == null) return 'neutral';
  if (score >= 70) return 'green';
  if (score <= 45) return 'red';
  return 'neutral';
}

export function RelationGraph({
  selfOhaeng,
  nodes,
}: {
  selfOhaeng: string | null;
  nodes: GraphNode[];
}) {
  const cap = nodes.slice(0, 8);
  return (
    <div className="bg-white border border-navy/10 rounded-3xl p-4 shadow-[0_12px_30px_rgba(44,62,80,0.08)]">
      <div className="relative mx-auto aspect-square min-h-[260px] max-h-[340px] max-w-[340px] overflow-hidden rounded-3xl bg-mint/5">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {cap.map((n, i) => {
            const slot = SLOTS[i % SLOTS.length];
            const tone = ohaengAtMidpoint(n.score);
            const color = tone === 'green' ? '#27AE60' : tone === 'red' ? '#E74C3C' : '#9CA3AF';
            return (
              <line
                key={n.id}
                x1="50"
                y1="50"
                x2={slot.x}
                y2={slot.y}
                stroke={color}
                strokeWidth="0.6"
                strokeLinecap="round"
                opacity="0.7"
                strokeDasharray={tone === 'neutral' ? '1,1.5' : undefined}
              />
            );
          })}
        </svg>

        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-3xl flex flex-col items-center justify-center text-xl font-black shadow-[0_12px_28px_rgba(44,62,80,0.18)] border-[3px] border-white"
          style={{
            left: '50%',
            top: '50%',
            background: OHAENG_COLOR[selfOhaeng ?? ''] ?? '#4ECDC4',
            color: OHAENG_TEXT[selfOhaeng ?? ''] ?? '#143537',
          }}
        >
          🐢
          <span className="text-[9px] mt-0.5 font-black opacity-90">
            나 {selfOhaeng ?? ''}
          </span>
        </div>

        {cap.map((n, i) => {
          const slot = SLOTS[i % SLOTS.length];
          const ohaeng = n.ohaeng ?? '토';
          const icon = ICON_BY_RELATION[n.relationLabel ?? 'other'] ?? '✦';
          return (
            <Link
              key={n.id}
              href={`/relations/${n.id}`}
              aria-label={`${n.name} 궁합 상세 보기`}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shadow-[0_10px_24px_rgba(44,62,80,0.12)] border-[3px] border-white transition hover:scale-105"
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                background: OHAENG_COLOR[ohaeng] ?? '#4ECDC4',
                color: OHAENG_TEXT[ohaeng] ?? '#143537',
              }}
            >
              <span className="text-base leading-none">{icon}</span>
              <span className="text-[9px] mt-0.5 font-black opacity-90">
                {n.score ?? '-'}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-black">
        <div className="rounded-xl bg-mint/10 border border-navy/10 px-3 py-2">
          <span className="text-[#27AE60]">● 합</span> <span className="text-muted font-bold">도움 주는 관계</span>
        </div>
        <div className="rounded-xl bg-red/10 border border-navy/10 px-3 py-2">
          <span className="text-red">● 충</span> <span className="text-muted font-bold">에너지 쓰는 관계</span>
        </div>
      </div>
    </div>
  );
}
