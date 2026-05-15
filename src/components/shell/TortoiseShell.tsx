'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Palja, Pillar, Ohaeng } from '@/lib/saju/types';
import { cn } from '@/lib/utils/cn';
import { ShellDetail } from './ShellDetail';

type Position = '시간' | '일간' | '월간' | '연간' | '시지' | '일지' | '월지' | '연지';

interface SegmentMeta {
  position: Position;
  pillar: Pillar | null;
  isGan: boolean;
}

interface Props {
  palja: Palja;
  activePosition?: Position;
  revealCount?: number;
  className?: string;
}

const OHAENG_LABEL: Record<Ohaeng, string> = {
  목: '목',
  화: '화',
  토: '토',
  금: '금',
  수: '수',
};

const SIPSUNG_BY_POSITION: Record<Position, string> = {
  연간: '연주의 천간',
  연지: '연주의 지지',
  월간: '월주의 천간',
  월지: '월주의 지지',
  일간: '나 자신 (일간)',
  일지: '배우자 자리 (일지)',
  시간: '자녀 자리 (시간)',
  시지: '말년의 자리 (시지)',
};

export function TortoiseShell({ palja, activePosition, revealCount = 8, className }: Props) {
  const [selected, setSelected] = useState<SegmentMeta | null>(null);

  // 8 segments arranged 시간→일간→월간→연간 (top row) / 시지→일지→월지→연지 (bottom row)
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
      <div className={cn('relative w-[280px] h-[230px] mx-auto', className)}>
        {/* Dome */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: '48% 52% 45% 55% / 55% 55% 45% 45%',
            background:
              'radial-gradient(circle at 30% 28%, rgba(93,173,226,0.38), transparent 30%), radial-gradient(circle at 72% 62%, rgba(244,208,63,0.32), transparent 26%), linear-gradient(135deg, #79E3D8, #4ECDC4 55%, #37AEA7)',
            border: '5px solid var(--color-navy)',
            boxShadow: 'inset 0 0 0 9px rgba(255,255,255,0.25), 0 20px 36px rgba(44,62,80,0.14)',
          }}
        />
        {/* Inner dashed ring */}
        <div
          className="absolute"
          style={{
            inset: '18px 20px',
            border: '2px dashed rgba(44,62,80,0.2)',
            borderRadius: '46% 54% 42% 58% / 56% 58% 42% 44%',
          }}
        />
        {/* 8-grid */}
        <div
          className="absolute grid grid-cols-4 grid-rows-2 gap-1.5"
          style={{ inset: '26px 30px' }}
        >
          {segments.map((seg, i) => {
            const revealed = i < revealCount;
            const ganOrJi = seg.pillar ? (seg.isGan ? seg.pillar.ganHanja : seg.pillar.jiHanja) : '?';
            const kor = seg.pillar ? (seg.isGan ? seg.pillar.gan : seg.pillar.ji) : '미상';
            const ohaeng = seg.pillar ? (seg.isGan ? seg.pillar.ganOhaeng : seg.pillar.jiOhaeng) : null;
            const active = activePosition === seg.position;
            return (
              <motion.button
                key={seg.position}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: revealed ? 1 : 0.2, scale: revealed ? 1 : 0.9 }}
                transition={{ delay: 0.08 + i * 0.1, type: 'spring' }}
                onClick={() => seg.pillar && setSelected(seg)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-2xl border-2 relative transition',
                  active
                    ? 'bg-gold/70 border-navy shadow-[0_0_0_4px_rgba(244,208,63,0.25),inset_0_0_0_2px_rgba(255,255,255,0.5)] -translate-y-0.5'
                    : 'bg-soft/50 border-navy/40 hover:border-navy/70',
                )}
                style={{ cursor: seg.pillar ? 'pointer' : 'default' }}
                disabled={!seg.pillar}
                type="button"
                aria-label={`${seg.position} ${kor}`}
              >
                <span className="font-hanja font-black text-2xl leading-none text-navy">{ganOrJi}</span>
                <span className="text-[9px] font-extrabold text-navy/70 mt-1">
                  {kor}{ohaeng && ` · ${OHAENG_LABEL[ohaeng]}`}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {selected && selected.pillar && (
        <ShellDetail
          position={selected.position}
          context={SIPSUNG_BY_POSITION[selected.position]}
          pillar={selected.pillar}
          isGan={selected.isGan}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
