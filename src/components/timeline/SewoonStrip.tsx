'use client';

import { useMemo } from 'react';
import {
  sewoonOfDaewoon,
  GRADE_COLOR,
} from '@/lib/saju/daewoon_fortune';
import type { DaewoonPeriod, SajuResult } from '@/lib/saju/types';

/**
 * 선택된 대운 안의 10년치 세운(年運) 가로 스트립.
 *
 * 사용자가 가장 궁금해하는 "올해/내년 어떤 해" 단위 답을 즉시 제공.
 * 각 해마다 십성·길흉 점수·길흉 dot + 일지 합/충 표시.
 */
export function SewoonStrip({
  saju,
  period,
}: {
  saju: SajuResult;
  period: DaewoonPeriod;
}) {
  const sewoon = useMemo(() => sewoonOfDaewoon(saju, period), [saju, period]);
  const currentYear = new Date().getFullYear();

  return (
    <div className="mt-4 rounded-3xl border border-navy/8 bg-white/80 p-4 shadow-[0_8px_18px_rgba(44,62,80,0.05)]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-extrabold text-mint-dark">
            이 대운 안의 10년 흐름
          </p>
          <h3 className="text-sm font-black text-navy">세운(年運) 한눈에</h3>
        </div>
        <span className="text-[10px] font-extrabold text-muted">
          {period.startYear}–{period.startYear + 9}
        </span>
      </div>

      <div className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
        {sewoon.map((s) => {
          const isThisYear = s.year === currentYear;
          const grade = GRADE_COLOR[s.grade];
          return (
            <div
              key={s.year}
              className={`min-w-[68px] shrink-0 rounded-2xl border p-2 text-center ${
                isThisYear
                  ? 'border-navy bg-navy/5 shadow-[0_6px_14px_rgba(44,62,80,0.12)]'
                  : 'border-navy/8 bg-ivory/65'
              }`}
            >
              <p
                className={`text-[10px] font-extrabold ${
                  isThisYear ? 'text-navy' : 'text-muted'
                }`}
              >
                {s.year}
              </p>
              <p
                className={`mt-0.5 font-hanja text-[15px] font-black leading-none text-navy`}
              >
                {s.pillar.ganHanja}
                {s.pillar.jiHanja}
              </p>
              <p className="mt-1 text-[9px] font-black text-muted">
                {s.sipsung}
              </p>
              <div className="mt-1.5 flex items-center justify-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${grade.dot}`} />
                <span className="text-[9px] font-black tabular-nums text-navy">
                  {s.score}
                </span>
              </div>
              {(s.hap || s.chung) && (
                <p
                  className={`mt-0.5 text-[8px] font-black ${
                    s.chung ? 'text-red' : 'text-[#16706B]'
                  }`}
                >
                  {s.chung ? '충' : '합'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {(() => {
        const best = [...sewoon].sort((a, b) => b.score - a.score)[0];
        const worst = [...sewoon].sort((a, b) => a.score - b.score)[0];
        return (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-mint/12 p-2.5">
              <p className="text-[10px] font-extrabold text-mint-dark">
                🌿 이 10년의 베스트해
              </p>
              <p className="mt-0.5 text-xs font-black text-navy">
                {best.year}년 · {best.score}점
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-muted leading-snug">
                {best.note}
              </p>
            </div>
            <div className="rounded-2xl bg-red/10 p-2.5">
              <p className="text-[10px] font-extrabold text-red">
                ⚠️ 조심할 해
              </p>
              <p className="mt-0.5 text-xs font-black text-navy">
                {worst.year}년 · {worst.score}점
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-muted leading-snug">
                {worst.note}
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
