// Derived 명리학 analysis used to enrich LLM prompts.
//
// Goal: surface the evidence a human 명리 consultant would lean on so the model
// stops doing generic personality talk and starts citing the actual chart:
// 일간 강약(身強身弱), 격국(格局), 용신 후보(用神), 통근(通根), 원국 내
// 합·충·형·파·회, current 대운/세운.
//
// The analysis is intentionally rule-based and conservative — it is meant to
// SEED the LLM with structured hints, not to ship as a final verdict.

import {
  CHEONGAN,
  CHEONGAN_OHAENG_IDX,
  CHEONGAN_YINYANG,
  JIJI,
  JIJI_OHAENG_IDX,
  JIJANGGAN_BY_JIJI,
  OHAENG,
} from './constants';
import { findInteractionsWithinPalja, type PillarInteraction } from './hapchung';
import { calculatePalja } from './palja';
import { sipsungOf } from './sipsung';
import type {
  DaewoonPeriod,
  Ohaeng,
  Palja,
  Pillar,
  SajuResult,
  Sipsung,
} from './types';

const OHAENG_KO: readonly Ohaeng[] = OHAENG;

function ganIdx(name: string): number {
  return (CHEONGAN as readonly string[]).indexOf(name);
}

function jijiName(i: number): string {
  return JIJI[i];
}

function generates(a: number, b: number): boolean {
  return (a + 1) % 5 === b;
}

function overcomes(a: number, b: number): boolean {
  return (a + 2) % 5 === b;
}

function listPillars(palja: Palja): Pillar[] {
  return [palja.year, palja.month, palja.day, ...(palja.time ? [palja.time] : [])];
}

// ───────────────────────────── 일간 강약 ─────────────────────────────

export interface IlganStrength {
  /** 0–100, 50 = 중화 */
  score: number;
  label: '극신강' | '신강' | '중화' | '신약' | '극신약';
  reasons: string[];
}

function analyzeStrength(palja: Palja): IlganStrength {
  const ilganIdx = palja.day.ganIdx;
  const ilganOhaeng = CHEONGAN_OHAENG_IDX[ilganIdx];
  const reasons: string[] = [];
  let score = 50;

  // 월령 — 가장 강한 영향
  const monthJiOhaeng = JIJI_OHAENG_IDX[palja.month.jiIdx];
  if (monthJiOhaeng === ilganOhaeng) {
    score += 24;
    reasons.push(
      `월지 ${palja.month.ji}가 일간과 같은 ${OHAENG_KO[monthJiOhaeng]} 기운(비겁)이라 강력한 지원`,
    );
  } else if (generates(monthJiOhaeng, ilganOhaeng)) {
    score += 20;
    reasons.push(
      `월지 ${palja.month.ji}의 ${OHAENG_KO[monthJiOhaeng]}가 일간 ${palja.day.gan}을 생하는 인성(印星) 자리`,
    );
  } else if (overcomes(monthJiOhaeng, ilganOhaeng)) {
    score -= 20;
    reasons.push(
      `월지 ${palja.month.ji}의 ${OHAENG_KO[monthJiOhaeng]}가 일간을 극하는 관성(官星) 자리라 부담`,
    );
  } else if (overcomes(ilganOhaeng, monthJiOhaeng)) {
    score -= 12;
    reasons.push(`월지 ${palja.month.ji}는 일간이 극하는 재성(財星) 자리라 기운이 빠짐`);
  } else if (generates(ilganOhaeng, monthJiOhaeng)) {
    score -= 10;
    reasons.push(`월지 ${palja.month.ji}는 일간이 생하는 식상(食傷) 자리라 기운이 설기`);
  }

  // 통근: 다른 지지에 일간과 같은 오행 (지장간 정기) 존재 여부
  let rootedAt = 0;
  for (const p of listPillars(palja)) {
    if (p === palja.month) continue; // already counted as 월령
    if (JIJI_OHAENG_IDX[p.jiIdx] === ilganOhaeng) rootedAt += 1;
  }
  if (rootedAt > 0) {
    score += rootedAt * 8;
    reasons.push(`지지 ${rootedAt}곳에 일간 통근(根)`);
  }

  // 천간 도움 (비겁·인성)
  let helperGans = 0;
  for (const p of listPillars(palja)) {
    if (p === palja.day) continue;
    const o = CHEONGAN_OHAENG_IDX[p.ganIdx];
    if (o === ilganOhaeng || generates(o, ilganOhaeng)) helperGans += 1;
  }
  if (helperGans > 0) {
    score += helperGans * 6;
    reasons.push(`천간 ${helperGans}곳에 비겁·인성 협조`);
  }

  // 천간 견제 (관·재·식상)
  let drainGans = 0;
  for (const p of listPillars(palja)) {
    if (p === palja.day) continue;
    const o = CHEONGAN_OHAENG_IDX[p.ganIdx];
    if (o !== ilganOhaeng && !generates(o, ilganOhaeng)) drainGans += 1;
  }
  if (drainGans > 0) score -= drainGans * 5;

  score = Math.max(5, Math.min(95, score));
  const label: IlganStrength['label'] =
    score >= 75 ? '극신강' : score >= 60 ? '신강' : score >= 40 ? '중화' : score >= 25 ? '신약' : '극신약';
  return { score: Math.round(score), label, reasons };
}

// ───────────────────────────── 격국 ─────────────────────────────

export interface Gyeokguk {
  primary: string;
  rationale: string;
  sipsung: Sipsung | null;
}

const GYEOKGUK_LABEL: Record<Sipsung, string> = {
  비견: '건록격(建祿格, 자립과 자존)',
  겁재: '양인격(羊刃格, 강한 추진력과 통제)',
  식신: '식신격(食神格, 표현과 생산)',
  상관: '상관격(傷官格, 재능과 변혁)',
  편재: '편재격(偏財格, 큰 흐름과 결단)',
  정재: '정재격(正財格, 안정과 축적)',
  편관: '편관격(偏官格, 추진과 책임)',
  정관: '정관격(正官格, 규범과 명분)',
  편인: '편인격(偏印格, 깊이와 탐구)',
  정인: '정인격(正印格, 학문과 보호)',
};

function analyzeGyeokguk(palja: Palja): Gyeokguk {
  const hidden = JIJANGGAN_BY_JIJI[palja.month.ji] ?? [];
  const primaryGan = hidden[hidden.length - 1] ?? '';
  if (!primaryGan) {
    return { primary: '미상', rationale: '월지 지장간 정보 부족', sipsung: null };
  }
  const primaryGanIdx = ganIdx(primaryGan);
  if (primaryGanIdx < 0) {
    return { primary: '미상', rationale: '월지 지장간 매핑 실패', sipsung: null };
  }
  const ilganIdx = palja.day.ganIdx;
  const sipsung = sipsungOf(
    CHEONGAN_OHAENG_IDX[ilganIdx],
    CHEONGAN_YINYANG[ilganIdx],
    CHEONGAN_OHAENG_IDX[primaryGanIdx],
    CHEONGAN_YINYANG[primaryGanIdx],
  );
  return {
    primary: GYEOKGUK_LABEL[sipsung],
    rationale: `월지 ${palja.month.ji}의 정기 ${primaryGan}(${sipsung})로 격을 잡음`,
    sipsung,
  };
}

// ───────────────────────────── 용신 후보 ─────────────────────────────

export interface Yongsin {
  main: Ohaeng;
  alt: Ohaeng | null;
  rationale: string;
}

function analyzeYongsin(
  palja: Palja,
  strength: IlganStrength,
  ohaengCount: SajuResult['ohaengCount'],
): Yongsin {
  const ilganOhaeng = CHEONGAN_OHAENG_IDX[palja.day.ganIdx];
  const candidates: Ohaeng[] = [];

  if (strength.label === '신강' || strength.label === '극신강') {
    candidates.push(OHAENG_KO[(ilganOhaeng + 1) % 5]); // 식상
    candidates.push(OHAENG_KO[(ilganOhaeng + 2) % 5]); // 재성
    candidates.push(OHAENG_KO[(ilganOhaeng + 4) % 5]); // 관성
  } else if (strength.label === '신약' || strength.label === '극신약') {
    candidates.push(OHAENG_KO[ilganOhaeng]); // 비겁
    candidates.push(OHAENG_KO[(ilganOhaeng + 3) % 5]); // 인성
  } else {
    // 중화 — 조후/통관
    if ((ohaengCount.화 ?? 0) >= 3) candidates.push('수');
    if ((ohaengCount.수 ?? 0) >= 3) candidates.push('화');
    if ((ohaengCount.목 ?? 0) >= 3) candidates.push('금');
    if ((ohaengCount.금 ?? 0) >= 3) candidates.push('화');
    if (candidates.length === 0) candidates.push(OHAENG_KO[(ilganOhaeng + 1) % 5]);
  }

  // 부족한 오행 우선
  const sorted = [...new Set(candidates)].sort(
    (a, b) => (ohaengCount[a] ?? 0) - (ohaengCount[b] ?? 0),
  );
  const main = sorted[0] ?? '토';
  const alt = sorted[1] ?? null;

  let rationale: string;
  if (strength.label === '신강' || strength.label === '극신강') {
    rationale = `${strength.label} 사주는 일간 ${palja.day.gan}을 설기(食傷)·견제(官)·소모(財)할 ${main} 기운을 우선 후보로 본다`;
  } else if (strength.label === '신약' || strength.label === '극신약') {
    rationale = `${strength.label} 사주는 일간을 돕는 ${main} 기운(인성·비겁)을 용신 후보로 잡는다`;
  } else {
    rationale = `중화에 가까워 조후·통관 관점에서 가장 부족한 ${main} 기운으로 균형 잡는다`;
  }
  return { main, alt, rationale };
}

// ───────────────────────────── 통근 / 투출 ─────────────────────────────

export interface TongeunEntry {
  position: '연주' | '월주' | '일주' | '시주';
  gan: string;
  ji: string;
  through: '정기' | '중기' | '여기';
}

function analyzeTongeun(palja: Palja): TongeunEntry[] {
  const items: TongeunEntry[] = [];
  const rows: Array<{ pos: TongeunEntry['position']; p: Pillar }> = [
    { pos: '연주', p: palja.year },
    { pos: '월주', p: palja.month },
    { pos: '일주', p: palja.day },
    ...(palja.time ? [{ pos: '시주' as const, p: palja.time }] : []),
  ];
  for (const { pos, p } of rows) {
    const ganOhaeng = CHEONGAN_OHAENG_IDX[p.ganIdx];
    const hidden = JIJANGGAN_BY_JIJI[p.ji] ?? [];
    for (let i = 0; i < hidden.length; i++) {
      const hgIdx = ganIdx(hidden[i]);
      if (hgIdx < 0) continue;
      if (CHEONGAN_OHAENG_IDX[hgIdx] === ganOhaeng) {
        const through: TongeunEntry['through'] =
          i === hidden.length - 1 ? '정기' : i === 0 ? '여기' : '중기';
        items.push({ position: pos, gan: p.gan, ji: p.ji, through });
        break;
      }
    }
  }
  return items;
}

// ───────────────────────────── 진행 중 대운 / 세운 ─────────────────────────────

export interface CurrentSewoon {
  year: number;
  pillar: Pillar;
  sipsung: Sipsung;
}

function getCurrentSewoon(palja: Palja, year: number): CurrentSewoon {
  // Mid-April is safely past 입춘 for any year in 1900–2100.
  const ref = calculatePalja({
    birthDate: `${year}-04-01`,
    isLunar: false,
    gender: 'M',
  });
  const ilganIdx = palja.day.ganIdx;
  const sipsung = sipsungOf(
    CHEONGAN_OHAENG_IDX[ilganIdx],
    CHEONGAN_YINYANG[ilganIdx],
    CHEONGAN_OHAENG_IDX[ref.year.ganIdx],
    CHEONGAN_YINYANG[ref.year.ganIdx],
  );
  return { year, pillar: ref.year, sipsung };
}

// ───────────────────────────── 합·충 등 원국 내 상호작용 ─────────────────────────────

export type { PillarInteraction };

export interface SajuAnalysis {
  strength: IlganStrength;
  gyeokguk: Gyeokguk;
  yongsin: Yongsin;
  tongeun: TongeunEntry[];
  interactions: PillarInteraction[];
  currentDaewoon: DaewoonPeriod | null;
  currentDaewoonSipsung: Sipsung | null;
  currentSewoon: CurrentSewoon;
  /** 사용자의 현재 만나이 (대운 진행 정도 계산용) */
  currentAge: number;
}

export function analyzeSaju(saju: SajuResult, opts?: { todayYear?: number }): SajuAnalysis {
  const palja = saju.palja;
  const strength = analyzeStrength(palja);
  const gyeokguk = analyzeGyeokguk(palja);
  const yongsin = analyzeYongsin(palja, strength, saju.ohaengCount);
  const tongeun = analyzeTongeun(palja);
  const interactions = findInteractionsWithinPalja(palja);

  const todayYear = opts?.todayYear ?? new Date().getFullYear();
  const currentDaewoon =
    saju.daewoon.find((d) => todayYear >= d.startYear && todayYear <= d.startYear + 9) ?? null;
  const currentDaewoonSipsung = currentDaewoon ? currentDaewoon.sipsung : null;
  const currentSewoon = getCurrentSewoon(palja, todayYear);

  const birthYear = Number(saju.input.birthDate.slice(0, 4));
  const currentAge = todayYear - birthYear;

  return {
    strength,
    gyeokguk,
    yongsin,
    tongeun,
    interactions,
    currentDaewoon,
    currentDaewoonSipsung,
    currentSewoon,
    currentAge,
  };
}

// Helpers exposed for prompt formatters.
export function strongestOhaeng(saju: SajuResult): [Ohaeng, number] {
  const entries = Object.entries(saju.ohaengCount) as Array<[Ohaeng, number]>;
  return entries.sort((a, b) => b[1] - a[1])[0];
}

export function weakestOhaeng(saju: SajuResult): [Ohaeng, number] {
  const entries = Object.entries(saju.ohaengCount) as Array<[Ohaeng, number]>;
  return entries.sort((a, b) => a[1] - b[1])[0];
}

// Daily-ilji <-> ilgan relation, used by the daily prompt enrichment.
export function iljiRelation(
  ilganIdx: number,
  iljiGanIdx: number,
  iljiJiIdx: number,
): {
  ganSipsung: Sipsung;
  jiOhaeng: Ohaeng;
  hap: boolean;
  chung: boolean;
  description: string;
} {
  const ganSipsung = sipsungOf(
    CHEONGAN_OHAENG_IDX[ilganIdx],
    CHEONGAN_YINYANG[ilganIdx],
    CHEONGAN_OHAENG_IDX[iljiGanIdx],
    CHEONGAN_YINYANG[iljiGanIdx],
  );
  const jiOhaeng = OHAENG_KO[JIJI_OHAENG_IDX[iljiJiIdx]];

  // 천간합 / 충 quick check
  const hapPairs: Array<[number, number]> = [
    [0, 5], [1, 6], [2, 7], [3, 8], [4, 9],
  ];
  const chungPairs: Array<[number, number]> = [
    [0, 6], [1, 7], [2, 8], [3, 9],
  ];
  const hap = hapPairs.some(([a, b]) =>
    (a === ilganIdx && b === iljiGanIdx) || (b === ilganIdx && a === iljiGanIdx),
  );
  const chung = chungPairs.some(([a, b]) =>
    (a === ilganIdx && b === iljiGanIdx) || (b === ilganIdx && a === iljiGanIdx),
  );

  const desc = `오늘 일진 천간이 일간과 ${ganSipsung} 관계, 일진 지지는 ${jiOhaeng} 기운${
    hap ? ' (천간합 발동)' : chung ? ' (천간충 발동)' : ''
  }`;
  return { ganSipsung, jiOhaeng, hap, chung, description: desc };
}

// Re-exported helper for callers wanting a pretty jiji name from index.
export { jijiName };
