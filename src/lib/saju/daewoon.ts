import { CHEONGAN_YINYANG } from './constants';
import { ganJiFromGapja, gapjaIdx } from './palja';
import { findSolarTermDate } from './solar_terms';
import { sipsungOf } from './sipsung';
import { CHEONGAN_OHAENG_IDX, JIJI_OHAENG_IDX, JIJI_YINYANG } from './constants';
import type { DaewoonPeriod, Palja, Pillar } from './types';
import {
  CHEONGAN,
  CHEONGAN_HANJA,
  JIJI,
  JIJI_HANJA,
  OHAENG,
} from './constants';

function buildPillar(ganIdx: number, jiIdx: number): Pillar {
  return {
    gan: CHEONGAN[ganIdx],
    ji: JIJI[jiIdx],
    ganHanja: CHEONGAN_HANJA[ganIdx],
    jiHanja: JIJI_HANJA[jiIdx],
    ganIdx,
    jiIdx,
    ganOhaeng: OHAENG[CHEONGAN_OHAENG_IDX[ganIdx]],
    jiOhaeng: OHAENG[JIJI_OHAENG_IDX[jiIdx]],
  };
}

// Find previous and next monthly solar terms surrounding the birth datetime.
// Returns the term boundaries in KST.
function surroundingTerms(birthKst: Date): { prev: Date; next: Date } {
  // Build a candidate list across the birth year and adjacent years.
  const y = birthKst.getFullYear();
  const candidates: Date[] = [];
  for (let yr = y - 1; yr <= y + 1; yr++) {
    for (const lon of [285, 315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255]) {
      candidates.push(findSolarTermDate(yr, lon));
    }
  }
  candidates.sort((a, b) => a.getTime() - b.getTime());
  let prev = candidates[0];
  let next = candidates[candidates.length - 1];
  for (const d of candidates) {
    if (d <= birthKst) prev = d;
    if (d > birthKst) {
      next = d;
      break;
    }
  }
  return { prev, next };
}

// 대운수 (starting age) computation.
// Difference in days between birth and the appropriate solar term boundary,
// divided by 3 (1 day = 4 months in 대운 reckoning).
function computeDaewoonSu(birthKst: Date, isForward: boolean): number {
  const { prev, next } = surroundingTerms(birthKst);
  const targetMs = isForward ? next.getTime() - birthKst.getTime() : birthKst.getTime() - prev.getTime();
  const days = targetMs / 86400000;
  // 1 day = 4 months → 3 days = 1 year. Round to one decimal then int.
  return Math.max(1, Math.round(days / 3));
}

// Build daewoon periods. 8 periods (covers ~80 years).
export function computeDaewoon(
  palja: Palja,
  birthDateIso: string,
  gender: 'M' | 'F',
  birthTime?: string,
): DaewoonPeriod[] {
  const [by, bm, bd] = birthDateIso.split('-').map(Number);
  const [bh, bmm] = birthTime ? birthTime.split(':').map(Number) : [12, 0];
  const birthKst = new Date(Date.UTC(by, bm - 1, bd, bh, bmm, 0));

  // 순행 (forward): 양남 또는 음녀. 역행 (reverse): 음남 또는 양녀.
  // 양년: year-gan yinyang = 0 (양). 음년: 1 (음).
  const yearYinyang = CHEONGAN_YINYANG[palja.year.ganIdx];
  const isYangYear = yearYinyang === 0;
  const isMale = gender === 'M';
  const isForward = (isYangYear && isMale) || (!isYangYear && !isMale);

  const startAge = computeDaewoonSu(birthKst, isForward);

  // 월주 gapja index is the starting point.
  const monthGapja = gapjaIdx(palja.month.ganIdx, palja.month.jiIdx);

  const periods: DaewoonPeriod[] = [];
  for (let i = 0; i < 8; i++) {
    const offset = isForward ? i + 1 : -(i + 1);
    const idx = (((monthGapja + offset) % 60) + 60) % 60;
    const { ganIdx, jiIdx } = ganJiFromGapja(idx);
    const pillar = buildPillar(ganIdx, jiIdx);

    // sipsung against ilgan
    const sipsung = sipsungOf(
      CHEONGAN_OHAENG_IDX[palja.day.ganIdx],
      CHEONGAN_YINYANG[palja.day.ganIdx],
      CHEONGAN_OHAENG_IDX[ganIdx],
      CHEONGAN_YINYANG[ganIdx],
    );

    const ageStart = startAge + i * 10;
    periods.push({
      startAge: ageStart,
      startYear: by + ageStart,
      pillar,
      sipsung,
    });
  }
  return periods;
}

// Re-export jiji yinyang for callers that pass yin/yang at the jiji.
export { JIJI_YINYANG };
