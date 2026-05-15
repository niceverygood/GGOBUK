'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { Pillar } from '@/lib/saju/types';

interface Props {
  position: string;
  pillar: Pillar;
  isGan: boolean;
  context?: string;
  onClose: () => void;
}

const OHAENG_DESC: Record<string, string> = {
  목: '봄, 생장, 시작, 부드러우면서도 굳센 기운',
  화: '여름, 발산, 열정, 빛과 표현의 기운',
  토: '환절기, 중재, 안정, 받아들이는 기운',
  금: '가을, 단단함, 결단, 정리하는 기운',
  수: '겨울, 응축, 지혜, 흐름과 본질의 기운',
};

export function ShellDetail({ position, pillar, isGan, context, onClose }: Props) {
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
        className="bg-soft text-navy rounded-3xl max-w-md w-full p-6 shadow-2xl border border-navy/10"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider opacity-60">{position}</span>
          <button onClick={onClose} className="text-2xl leading-none opacity-60" aria-label="닫기">
            ×
          </button>
        </div>
        {context && <p className="text-xs text-muted font-extrabold mb-3">{context}</p>}

        <div className="text-center my-5">
          <div className="font-hanja text-8xl font-black">{char}</div>
          <div className="mt-2 text-base font-extrabold">
            {kor} · 오행 {ohaeng}
          </div>
        </div>

        <div className="bg-white/60 rounded-2xl p-4 border border-navy/10">
          <div className="text-xs text-muted font-extrabold mb-1">오행 {ohaeng}</div>
          <p className="text-sm leading-relaxed">{OHAENG_DESC[ohaeng]}</p>
        </div>

        <Link
          href="/chat"
          className="mt-4 block text-center w-full rounded-2xl bg-navy text-white py-3 text-sm font-extrabold"
        >
          꼬북도사에게 이 글자 물어보기
        </Link>
      </motion.div>
    </motion.div>
  );
}
