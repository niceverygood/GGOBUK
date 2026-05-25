'use client';

import {
  daewoonFortune,
  GRADE_COLOR,
  OHAENG_COLOR,
} from '@/lib/saju/daewoon_fortune';
import type { DaewoonPeriod, SajuResult } from '@/lib/saju/types';

/**
 * 현재 대운의 진행률 progress bar + 길흉 점수 + 다음 대운 D-day.
 * 사용자가 "내가 지금 어디 위치"와 "언제 다음 대운에 들어가는지"를 즉시 본다.
 */
export function CurrentDaewoonProgress({
  saju,
  daewoon,
}: {
  saju: SajuResult;
  daewoon: DaewoonPeriod[];
}) {
  const currentYear = new Date().getFullYear();
  const currentIdx = daewoon.findIndex(
    (p) => currentYear >= p.startYear && currentYear <= p.startYear + 9,
  );
  const current = currentIdx >= 0 ? daewoon[currentIdx] : null;
  const next = currentIdx >= 0 ? daewoon[currentIdx + 1] : null;

  if (!current) return null;

  const fortune = daewoonFortune(saju, current);
  const yearsIn = currentYear - current.startYear; // 0..9
  const progress = Math.min(100, Math.max(0, (yearsIn / 10) * 100));
  const yearsLeft = 10 - yearsIn;
  const oh = OHAENG_COLOR[fortune.jiOhaeng];
  const grade = GRADE_COLOR[fortune.grade];

  return (
    <div
      className={`mt-4 rounded-3xl border ${oh.border} ${oh.bg} p-4 shadow-[0_8px_18px_rgba(44,62,80,0.06)]`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold text-muted">
            현재 들어와 있는 10년
          </p>
          <h3 className="mt-0.5 text-lg font-black leading-tight text-navy">
            <span className="font-hanja">
              {current.pillar.ganHanja}
              {current.pillar.jiHanja}
            </span>{' '}
            대운 · {current.sipsung}
          </h3>
          <p className="mt-0.5 text-[11px] font-bold text-muted">
            {current.startYear}–{current.startYear + 9} · {current.startAge}–
            {current.startAge + 9}세 · 지지 오행 {fortune.jiOhaeng}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${grade.chip}`}
        >
          {fortune.grade} {fortune.score}점
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] font-extrabold text-muted">
          <span>시작 {current.startAge}세</span>
          <span className="text-navy">
            현재 {yearsIn + 1}년 차 · 남은 {yearsLeft}년
          </span>
          <span>마감 {current.startAge + 9}세</span>
        </div>
        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-white/60 border border-navy/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-mint via-mint-dark to-navy transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-[11px] font-bold leading-relaxed text-navy">
        💡 {fortune.note}
        {fortune.matchesYongsin && ' · 용신 일치 시기'}
        {fortune.hap && ' · 일지 합'}
        {fortune.chung && ' · 일지 충'}
      </p>

      {next && (
        <div className="mt-3 rounded-2xl bg-white/70 border border-navy/8 p-2.5">
          <p className="text-[10px] font-extrabold text-mint-dark">
            다음 대운까지
          </p>
          <p className="mt-0.5 text-[11.5px] font-black text-navy leading-snug">
            <span className="font-hanja">
              {next.pillar.ganHanja}
              {next.pillar.jiHanja}
            </span>{' '}
            대운({next.sipsung}) — {next.startYear}년({next.startAge}세) 진입,
            약 {next.startYear - currentYear}년 후
          </p>
        </div>
      )}
    </div>
  );
}
