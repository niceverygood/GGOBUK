'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Palja, Pillar } from '@/lib/saju/types';
import { cn } from '@/lib/utils/cn';
import { ShellDetail } from './ShellDetail';

const OHAENG_COLORS: Record<string, string> = {
  목: '#5DADE2',
  화: '#E74C3C',
  토: '#F4D03F',
  금: '#ECF0F1',
  수: '#34495E',
};

type SegmentMeta = {
  position: '시간' | '일간' | '월간' | '연간' | '시지' | '일지' | '월지' | '연지';
  pillar: Pillar | null;
  isGan: boolean;
};

interface Props {
  palja: Palja;
  className?: string;
}

export function TortoiseShell({ palja, className }: Props) {
  const [selected, setSelected] = useState<SegmentMeta | null>(null);

  // Ordering: top row 시간-일간-월간-연간 (left to right); bottom row 시지-일지-월지-연지.
  const segments: SegmentMeta[] = [
    { position: '시간', pillar: palja.time, isGan: true },
    { position: '일간', pillar: palja.day, isGan: true },
    { position: '월간', pillar: palja.month, isGan: true },
    { position: '연간', pillar: palja.year, isGan: true },
    { position: '시지', pillar: palja.time, isGan: false },
    { position: '일지', pillar: palja.day, isGan: false },
    { position: '월지', pillar: palja.month, isGan: false },
    { position: '연지', pillar: palja.year, isGan: false },
  ];

  return (
    <>
      <div className={cn('relative w-full max-w-md aspect-square mx-auto', className)}>
        <svg viewBox="0 0 360 360" className="w-full h-full">
          {/* Shell dome outline */}
          <ellipse
            cx="180"
            cy="180"
            rx="170"
            ry="155"
            fill="#4ECDC4"
            stroke="#2C3E50"
            strokeWidth="4"
          />

          {/* 2x4 grid of segments */}
          {segments.map((seg, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const x = 30 + col * 80;
            const y = 70 + row * 110;
            const w = 70;
            const h = 95;
            const ohaeng = seg.pillar ? (seg.isGan ? seg.pillar.ganOhaeng : seg.pillar.jiOhaeng) : null;
            const hanja = seg.pillar ? (seg.isGan ? seg.pillar.ganHanja : seg.pillar.jiHanja) : '?';
            const kor = seg.pillar ? (seg.isGan ? seg.pillar.gan : seg.pillar.ji) : '미상';

            return (
              <motion.g
                key={seg.position}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.12, type: 'spring' }}
                onClick={() => seg.pillar && setSelected(seg)}
                style={{ cursor: seg.pillar ? 'pointer' : 'default' }}
              >
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx="12"
                  ry="12"
                  fill={ohaeng ? OHAENG_COLORS[ohaeng] : '#bbb'}
                  fillOpacity="0.35"
                  stroke="#2C3E50"
                  strokeWidth="2"
                />
                <text
                  x={x + w / 2}
                  y={y + h / 2 + 6}
                  textAnchor="middle"
                  fontSize="44"
                  fontFamily="serif"
                  fill="#2C3E50"
                  fontWeight="600"
                >
                  {hanja}
                </text>
                <text
                  x={x + w / 2}
                  y={y + h - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#2C3E50"
                  opacity="0.7"
                >
                  {kor} · {seg.position}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </div>

      {selected && selected.pillar && (
        <ShellDetail
          position={selected.position}
          pillar={selected.pillar}
          isGan={selected.isGan}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
