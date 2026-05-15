'use client';

import { motion } from 'framer-motion';
import type { Pillar } from '@/lib/saju/types';

interface Props {
  position: string;
  pillar: Pillar;
  isGan: boolean;
  onClose: () => void;
}

const OHAENG_DESC: Record<string, string> = {
  목: '봄, 생장, 시작, 부드러우면서도 굳센 기운',
  화: '여름, 발산, 열정, 빛과 표현의 기운',
  토: '환절기, 중재, 안정, 받아들이는 기운',
  금: '가을, 단단함, 결단, 정리하는 기운',
  수: '겨울, 응축, 지혜, 흐름과 본질의 기운',
};

export function ShellDetail({ position, pillar, isGan, onClose }: Props) {
  const char = isGan ? pillar.ganHanja : pillar.jiHanja;
  const kor = isGan ? pillar.gan : pillar.ji;
  const ohaeng = isGan ? pillar.ganOhaeng : pillar.jiOhaeng;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--color-paper)] text-[var(--color-ink)] rounded-3xl max-w-md w-full p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs uppercase tracking-wider opacity-60">{position}</span>
          <button onClick={onClose} className="text-2xl leading-none opacity-60">
            ×
          </button>
        </div>

        <div className="text-center my-6">
          <div className="text-8xl font-serif">{char}</div>
          <div className="mt-2 text-lg">
            {kor} · {ohaeng}
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="bg-white/60 rounded-2xl p-4">
            <div className="font-semibold mb-1">오행 {ohaeng}</div>
            <p className="opacity-80">{OHAENG_DESC[ohaeng]}</p>
          </div>

          <button className="w-full rounded-2xl bg-[var(--color-ink)] text-white py-3 text-sm">
            꼬북도사에게 이 글자 물어보기
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
