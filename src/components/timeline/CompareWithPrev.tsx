'use client';

import { useMemo } from 'react';
import { daewoonFortune } from '@/lib/saju/daewoon_fortune';
import type { DaewoonPeriod, SajuResult } from '@/lib/saju/types';

/**
 * 선택된 대운과 이전 대운을 비교. 점수·십성 그룹·오행 변화를 한 줄로.
 */
export function CompareWithPrev({
  saju,
  daewoon,
  selected,
}: {
  saju: SajuResult;
  daewoon: DaewoonPeriod[];
  selected: DaewoonPeriod;
}) {
  const idx = daewoon.findIndex((p) => p.startYear === selected.startYear);
  const prev = idx > 0 ? daewoon[idx - 1] : null;

  const data = useMemo(() => {
    const thisF = daewoonFortune(saju, selected);
    const prevF = prev ? daewoonFortune(saju, prev) : null;
    return { thisF, prevF };
  }, [saju, selected, prev]);

  if (!prev || !data.prevF) return null;

  const diff = data.thisF.score - data.prevF.score;
  const direction = diff > 5 ? 'up' : diff < -5 ? 'down' : 'flat';
  const sipsungGroupChange = sipsungGroup(prev.sipsung) !== sipsungGroup(selected.sipsung);
  const ohaengChange = data.prevF.jiOhaeng !== data.thisF.jiOhaeng;

  return (
    <div className="mt-3 rounded-2xl border border-navy/8 bg-white/75 p-3">
      <p className="text-[10px] font-extrabold text-mint-dark">
        이전 대운 대비 변화
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="font-hanja text-sm font-black text-navy">
          {prev.pillar.ganHanja}{prev.pillar.jiHanja}
        </span>
        <span className="text-[10px] font-extrabold text-muted">
          {prev.sipsung} {data.prevF.score}점
        </span>
        <span className="text-muted">→</span>
        <span className="font-hanja text-sm font-black text-navy">
          {selected.pillar.ganHanja}{selected.pillar.jiHanja}
        </span>
        <span className="text-[10px] font-extrabold text-muted">
          {selected.sipsung} {data.thisF.score}점
        </span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-black ${
            direction === 'up'
              ? 'bg-mint/22 text-[#16706B]'
              : direction === 'down'
                ? 'bg-red/15 text-red'
                : 'bg-navy/8 text-navy'
          }`}
        >
          {direction === 'up' ? `▲ ${diff}` : direction === 'down' ? `▼ ${Math.abs(diff)}` : '변동 미미'}
        </span>
      </div>
      <ul className="mt-2 space-y-0.5 text-[11px] font-bold leading-snug text-navy">
        {sipsungGroupChange && (
          <li>
            · 십성 그룹: {sipsungGroup(prev.sipsung)} → {sipsungGroup(selected.sipsung)}
          </li>
        )}
        {ohaengChange && (
          <li>
            · 지지 오행: {data.prevF.jiOhaeng} → {data.thisF.jiOhaeng}
          </li>
        )}
        {data.thisF.matchesYongsin && !data.prevF.matchesYongsin && (
          <li className="text-mint-dark">· 이번 대운에 용신 진입</li>
        )}
        {!data.thisF.matchesYongsin && data.prevF.matchesYongsin && (
          <li className="text-red">· 이전 용신 시기가 끝남</li>
        )}
      </ul>
    </div>
  );
}

function sipsungGroup(s: string): string {
  const map: Record<string, string> = {
    비견: '비겁', 겁재: '비겁',
    식신: '식상', 상관: '식상',
    편재: '재성', 정재: '재성',
    편관: '관성', 정관: '관성',
    편인: '인성', 정인: '인성',
  };
  return map[s] ?? s;
}
