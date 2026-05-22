// 운세 달력 — per-day 길흉 for a month, computed instantly (no LLM).
//
// For each calendar day we take that day's 일진(日辰, day pillar) and score it
// against the user's chart: 일진 천간 → 일간 십성, 일진 지지의 오행이 용신과
// 맞는지, 일진 지지가 본인 일지와 합/충인지. Good for a heatmap-style month view.

import { calculatePalja } from './palja';
import { analyzeSaju } from './analysis';
import { sipsungOf } from './sipsung';
import {
  CHEONGAN_OHAENG_IDX,
  CHEONGAN_YINYANG,
  JIJI_OHAENG_IDX,
  OHAENG,
} from './constants';
import type { Ohaeng, SajuResult, Sipsung } from './types';

const OHAENG_KO = OHAENG as readonly Ohaeng[];

const JI_YUKHAP: Array<[number, number]> = [
  [0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7],
];
const JI_CHUNG: Array<[number, number]> = [
  [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
];

function pairHas(pairs: Array<[number, number]>, a: number, b: number): boolean {
  return pairs.some(([m, n]) => (m === a && n === b) || (m === b && n === a));
}

// sipsung → score delta + a short keyword.
const SIPSUNG_EFFECT: Record<Sipsung, { delta: number; note: string }> = {
  정인: { delta: 10, note: '안정·도움' },
  편인: { delta: 5, note: '몰입·재충전' },
  식신: { delta: 10, note: '표현·생산' },
  상관: { delta: 2, note: '재능·변동' },
  정재: { delta: 10, note: '안정 재물' },
  편재: { delta: 5, note: '기회·확장' },
  정관: { delta: 8, note: '명예·인정' },
  편관: { delta: -8, note: '압박·긴장' },
  비견: { delta: 2, note: '협력·동료' },
  겁재: { delta: -6, note: '경쟁·지출' },
};

export type FortuneGrade = '길' | '평' | '주의';

export interface DayFortune {
  date: string; // YYYY-MM-DD
  day: number; // day of month
  weekday: number; // 0=일
  iljiGan: string;
  iljiJi: string;
  ganHanja: string;
  jiHanja: string;
  sipsung: Sipsung;
  jiOhaeng: Ohaeng;
  hap: boolean;
  chung: boolean;
  score: number; // 25–95
  grade: FortuneGrade;
  note: string;
}

function gradeOf(score: number): FortuneGrade {
  if (score >= 72) return '길';
  if (score >= 50) return '평';
  return '주의';
}

export function dayFortune(saju: SajuResult, dateIso: string): DayFortune {
  const ilganIdx = saju.palja.day.ganIdx;
  const myJiIdx = saju.palja.day.jiIdx;
  const yongsin = analyzeSaju(saju).yongsin.main;

  const dayPillar = calculatePalja({ birthDate: dateIso, isLunar: false, gender: 'M' }).day;

  const sipsung = sipsungOf(
    CHEONGAN_OHAENG_IDX[ilganIdx],
    CHEONGAN_YINYANG[ilganIdx],
    CHEONGAN_OHAENG_IDX[dayPillar.ganIdx],
    CHEONGAN_YINYANG[dayPillar.ganIdx],
  );
  const jiOhaeng = OHAENG_KO[JIJI_OHAENG_IDX[dayPillar.jiIdx]];
  const ganOhaeng = OHAENG_KO[CHEONGAN_OHAENG_IDX[dayPillar.ganIdx]];
  const hap = pairHas(JI_YUKHAP, dayPillar.jiIdx, myJiIdx);
  const chung = pairHas(JI_CHUNG, dayPillar.jiIdx, myJiIdx);

  let score = 58;
  const eff = SIPSUNG_EFFECT[sipsung];
  score += eff.delta;
  let note = eff.note;

  if (jiOhaeng === yongsin) {
    score += 12;
    note = `용신 ${yongsin} 들어옴`;
  } else if (ganOhaeng === yongsin) {
    score += 6;
  }
  if (hap) {
    score += 10;
    note = '일지와 합 — 인연·협조';
  }
  if (chung) {
    score -= 12;
    note = '일지와 충 — 변동·충돌 주의';
  }

  score = Math.max(25, Math.min(95, score));

  const [y, m, d] = dateIso.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  return {
    date: dateIso,
    day: d,
    weekday,
    iljiGan: dayPillar.gan,
    iljiJi: dayPillar.ji,
    ganHanja: dayPillar.ganHanja,
    jiHanja: dayPillar.jiHanja,
    sipsung,
    jiOhaeng,
    hap,
    chung,
    score,
    grade: gradeOf(score),
    note,
  };
}

export interface MonthFortune {
  year: number;
  month: number; // 1-12
  firstWeekday: number; // weekday of day 1 (0=일)
  daysInMonth: number;
  days: DayFortune[];
  best: DayFortune[]; // top 3 길일
  caution: DayFortune[]; // bottom 3 주의일
}

export function monthFortune(saju: SajuResult, year: number, month: number): MonthFortune {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days: DayFortune[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push(dayFortune(saju, iso));
  }
  const sorted = [...days].sort((a, b) => b.score - a.score);
  return {
    year,
    month,
    firstWeekday,
    daysInMonth,
    days,
    best: sorted.slice(0, 3),
    caution: sorted.slice(-3).reverse(),
  };
}
