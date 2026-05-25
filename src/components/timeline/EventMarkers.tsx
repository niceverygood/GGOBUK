'use client';

import { useMemo } from 'react';
import { lifeEventMarkers } from '@/lib/saju/daewoon_fortune';
import type { SajuResult } from '@/lib/saju/types';

/**
 * 자동 추정된 인생 이벤트 마커들을 카드 리스트로 보여준다.
 * 결혼·이직·재물·공부·이사·건강·전환점 등.
 */
export function EventMarkers({ saju }: { saju: SajuResult }) {
  const markers = useMemo(() => lifeEventMarkers(saju), [saju]);
  const currentYear = new Date().getFullYear();

  if (markers.length === 0) return null;

  // 미래 마커 우선 정렬, 그 다음 과거.
  const sorted = [...markers].sort((a, b) => {
    const aFuture = a.year >= currentYear;
    const bFuture = b.year >= currentYear;
    if (aFuture && !bFuture) return -1;
    if (!aFuture && bFuture) return 1;
    return a.year - b.year;
  });

  return (
    <div className="mt-4 rounded-3xl border border-navy/8 bg-white/80 p-4 shadow-[0_8px_18px_rgba(44,62,80,0.05)]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-extrabold text-mint-dark">
            사주가 가리키는 인생 이벤트
          </p>
          <h3 className="text-sm font-black text-navy">자동 추정 마커</h3>
        </div>
        <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-black text-[#7C5A0E]">
          {markers.length}개
        </span>
      </div>
      <p className="mt-1 text-[10px] font-bold leading-snug text-muted">
        대운·세운·신살 데이터를 종합해 자동 추정한 마일스톤이에요. 단정이
        아니라 "이 시기에 이 영역이 활성화될 가능성이 높다"는 신호로 보세요.
      </p>

      <div className="mt-3 space-y-2 max-h-[320px] overflow-y-auto pr-1 no-scrollbar">
        {sorted.slice(0, 12).map((m) => {
          const isPast = m.year < currentYear;
          const isThisYear = m.year === currentYear;
          return (
            <div
              key={`${m.year}-${m.type}-${m.label}`}
              className={`flex items-start gap-2 rounded-2xl border p-2.5 ${
                isThisYear
                  ? 'border-navy/30 bg-navy/5'
                  : isPast
                    ? 'border-navy/8 bg-ivory/55 opacity-75'
                    : 'border-navy/10 bg-ivory/85'
              }`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white text-xl">
                {m.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-navy text-white px-1.5 py-0.5 text-[9px] font-black tabular-nums">
                    {m.year}
                  </span>
                  <span className="text-[10px] font-extrabold text-muted">
                    {m.age}세
                  </span>
                  {isThisYear && (
                    <span className="rounded-full bg-mint/30 px-1.5 py-0.5 text-[9px] font-black text-[#16706B]">
                      올해
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12.5px] font-black leading-snug text-navy">
                  {m.label}
                </p>
                <p className="mt-0.5 text-[10px] font-bold leading-snug text-muted">
                  {m.reason}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
