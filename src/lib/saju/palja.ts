import KoreanLunarCalendar from 'korean-lunar-calendar';
import {
  CHEONGAN,
  CHEONGAN_HANJA,
  CHEONGAN_OHAENG_IDX,
  JIJI,
  JIJI_HANJA,
  JIJI_OHAENG_IDX,
  OHAENG,
  SIGAN_START_BY_ILGAN,
  WOLGUN_START_BY_NYEONGAN_GROUP,
} from './constants';
import { findSolarTermDate, resolveYearAndMonthPillar } from './solar_terms';
import type { Pillar, Palja, SajuInput, Ohaeng } from './types';

function pillar(ganIdx: number, jiIdx: number): Pillar {
  return {
    gan: CHEONGAN[ganIdx],
    ji: JIJI[jiIdx],
    ganHanja: CHEONGAN_HANJA[ganIdx],
    jiHanja: JIJI_HANJA[jiIdx],
    ganIdx,
    jiIdx,
    ganOhaeng: OHAENG[CHEONGAN_OHAENG_IDX[ganIdx]] as Ohaeng,
    jiOhaeng: OHAENG[JIJI_OHAENG_IDX[jiIdx]] as Ohaeng,
  };
}

// 60갑자 index helpers
function gapjaIdx(ganIdx: number, jiIdx: number): number {
  // Find n in [0..59] such that n%10==ganIdx and n%12==jiIdx.
  for (let n = 0; n < 60; n++) {
    if (n % 10 === ganIdx && n % 12 === jiIdx) return n;
  }
  throw new Error(`No 60갑자 index for gan=${ganIdx} ji=${jiIdx}`);
}

function ganJiFromGapja(idx: number): { ganIdx: number; jiIdx: number } {
  const norm = ((idx % 60) + 60) % 60;
  return { ganIdx: norm % 10, jiIdx: norm % 12 };
}

export { gapjaIdx, ganJiFromGapja };

// Parse 'HH:MM' → minutes since 00:00.
function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

// Determine 시지 (time branch) index from birth hour-minute.
// Standard saju: 자시 = 23:30~01:29, 축시 = 01:30~03:29, ... (2-hour blocks).
function sijiFromHm(minutes: number): number {
  // Shift so that 자시 base is "minutes since 23:30".
  const shifted = (minutes + 30) % 1440; // 23:30 → 0, 00:00 → 30, etc.
  const block = Math.floor(shifted / 120); // 0..11
  // block 0 = 자(0), 1 = 축(1), ..., 11 = 해(11).
  return block;
}

// Day-pillar 60갑자 index from a calendar date (no time).
// Uses korean-lunar-calendar, which is reliable for the day pillar boundary at calendar
// day rollover. We apply 야자시 (23:30+ → next day) separately before calling this.
function dayGapjaIdxFromSolar(y: number, m: number, d: number): number {
  const klc = new KoreanLunarCalendar();
  const ok = klc.setSolarDate(y, m, d);
  if (!ok) throw new Error(`Invalid solar date ${y}-${m}-${d}`);
  const { cheongan, ganji } = klc.getGapJaIndex();
  return gapjaIdx(cheongan.day, ganji.day);
}

// Convert lunar input → solar Date (year, month, day).
function lunarToSolar(y: number, m: number, d: number, leap: boolean): { y: number; m: number; d: number } {
  const klc = new KoreanLunarCalendar();
  const ok = klc.setLunarDate(y, m, d, leap);
  if (!ok) throw new Error(`Invalid lunar date ${y}-${m}-${d} leap=${leap}`);
  const cal = klc.getSolarCalendar();
  return { y: cal.year, m: cal.month, d: cal.day };
}

export function calculatePalja(input: SajuInput): Palja {
  // 1. Normalize to solar calendar date.
  const [byRaw, bmRaw, bdRaw] = input.birthDate.split('-').map(Number);
  let by = byRaw;
  let bm = bmRaw;
  let bd = bdRaw;
  if (input.isLunar) {
    ({ y: by, m: bm, d: bd } = lunarToSolar(by, bm, bd, input.isLeapMonth ?? false));
  }

  // 2. Determine birth hour and minute.
  const hasTime = !!input.birthTime;
  const tm = hasTime ? parseHm(input.birthTime as string) : 12 * 60; // noon for boundary calcs only
  const bh = Math.floor(tm / 60);
  const bmm = tm % 60;

  // 3. Build KST birth Date (solar terms compare against this).
  // Use Date.UTC + shift back to KST to avoid local-tz drift.
  const birthKst = new Date(Date.UTC(by, bm - 1, bd, bh, bmm, 0));
  // birthKst is a UTC-stamped Date whose wall-clock fields equal the KST values.

  // 4. Day pillar — start with calendar-day, then advance by one if birth time >= 23:30 (야자시).
  let dayGapja = dayGapjaIdxFromSolar(by, bm, bd);
  if (hasTime && tm >= 23 * 60 + 30) {
    dayGapja = (dayGapja + 1) % 60;
  }
  const { ganIdx: dayGanIdx, jiIdx: dayJiIdx } = ganJiFromGapja(dayGapja);

  // 5. Year & month pillar — based on solar term boundaries.
  // Year pillar gan/ji from 60갑자 of (yearForPillar):
  //   갑자(0) = 1984. So index = (year - 1984) mod 60.
  const { yearForPillar, monthJijiIdx } = resolveYearAndMonthPillar(birthKst);
  const yearGapja = (((yearForPillar - 1984) % 60) + 60) % 60;
  const { ganIdx: yearGanIdx, jiIdx: yearJiIdx } = ganJiFromGapja(yearGapja);

  // Month gan from 五虎遁: 인월의 천간 시작 = WOLGUN_START_BY_NYEONGAN_GROUP[yearGan]
  const monthStartGanIdx = WOLGUN_START_BY_NYEONGAN_GROUP[yearGanIdx];
  // 월간 advances by (monthJijiIdx - 인(2) + 12) % 12 from monthStartGanIdx.
  const monthSlot = (monthJijiIdx - 2 + 12) % 12;
  const monthGanIdx = (monthStartGanIdx + monthSlot) % 10;

  // 6. Time pillar — from 五鼠遁 + 시지.
  let timePillar: Pillar | null = null;
  if (hasTime) {
    const siji = sijiFromHm(tm);
    const sijiStartGanIdx = SIGAN_START_BY_ILGAN[dayGanIdx];
    const timeGanIdx = (sijiStartGanIdx + siji) % 10;
    timePillar = pillar(timeGanIdx, siji);
  }

  return {
    year: pillar(yearGanIdx, yearJiIdx),
    month: pillar(monthGanIdx, monthJijiIdx),
    day: pillar(dayGanIdx, dayJiIdx),
    time: timePillar,
  };
}

export { findSolarTermDate };
