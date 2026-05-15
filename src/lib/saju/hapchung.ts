// 합/충/형/파 — interactions between two pillars or two saju charts.

import type { Palja, Pillar } from './types';

// 천간합: 갑기/을경/병신/정임/무계
const CHEONGAN_HAP: Array<[number, number]> = [
  [0, 5],
  [1, 6],
  [2, 7],
  [3, 8],
  [4, 9],
];

// 천간충: 갑경 / 을신 / 병임 / 정계 (무기는 토라 충 없음)
const CHEONGAN_CHUNG: Array<[number, number]> = [
  [0, 6],
  [1, 7],
  [2, 8],
  [3, 9],
];

// 지지육합: 자축, 인해, 묘술, 진유, 사신, 오미
const JIJI_YUKHAP: Array<[number, number]> = [
  [0, 1],
  [2, 11],
  [3, 10],
  [4, 9],
  [5, 8],
  [6, 7],
];

// 지지삼합: 신자진(수), 사유축(금), 인오술(화), 해묘미(목)
const JIJI_SAMHAP: number[][] = [
  [8, 0, 4],
  [5, 9, 1],
  [2, 6, 10],
  [11, 3, 7],
];

// 지지충: 자오, 축미, 인신, 묘유, 진술, 사해
const JIJI_CHUNG: Array<[number, number]> = [
  [0, 6],
  [1, 7],
  [2, 8],
  [3, 9],
  [4, 10],
  [5, 11],
];

// 지지형: 인사신, 축술미, 자묘, 진오유해 자형
const JIJI_HYEONG: Array<[number, number]> = [
  [2, 5],
  [5, 8],
  [2, 8],
  [1, 10],
  [10, 7],
  [1, 7],
  [0, 3],
];

// 지지파: 자유, 인해, 묘오, 사신, 진축, 술미
const JIJI_PA: Array<[number, number]> = [
  [0, 9],
  [2, 11],
  [3, 6],
  [5, 8],
  [4, 1],
  [10, 7],
];

function pairIncludes(pairs: Array<[number, number]>, a: number, b: number): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export interface PillarInteraction {
  type: '천간합' | '천간충' | '지지육합' | '지지삼합' | '지지충' | '지지형' | '지지파';
  positions: string[];
  detail: string;
}

const POS_LABEL = ['연', '월', '일', '시'] as const;

function pillarList(p: Palja): Pillar[] {
  return [p.year, p.month, p.day, ...(p.time ? [p.time] : [])];
}

export function findInteractionsWithinPalja(palja: Palja): PillarInteraction[] {
  const pillars = pillarList(palja);
  const out: PillarInteraction[] = [];
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const a = pillars[i];
      const b = pillars[j];
      // 천간
      if (pairIncludes(CHEONGAN_HAP, a.ganIdx, b.ganIdx)) {
        out.push({
          type: '천간합',
          positions: [POS_LABEL[i] + '간', POS_LABEL[j] + '간'],
          detail: `${a.ganHanja}${b.ganHanja} 합`,
        });
      }
      if (pairIncludes(CHEONGAN_CHUNG, a.ganIdx, b.ganIdx)) {
        out.push({
          type: '천간충',
          positions: [POS_LABEL[i] + '간', POS_LABEL[j] + '간'],
          detail: `${a.ganHanja}${b.ganHanja} 충`,
        });
      }
      // 지지
      if (pairIncludes(JIJI_YUKHAP, a.jiIdx, b.jiIdx)) {
        out.push({
          type: '지지육합',
          positions: [POS_LABEL[i] + '지', POS_LABEL[j] + '지'],
          detail: `${a.jiHanja}${b.jiHanja} 육합`,
        });
      }
      if (pairIncludes(JIJI_CHUNG, a.jiIdx, b.jiIdx)) {
        out.push({
          type: '지지충',
          positions: [POS_LABEL[i] + '지', POS_LABEL[j] + '지'],
          detail: `${a.jiHanja}${b.jiHanja} 충`,
        });
      }
      if (pairIncludes(JIJI_HYEONG, a.jiIdx, b.jiIdx)) {
        out.push({
          type: '지지형',
          positions: [POS_LABEL[i] + '지', POS_LABEL[j] + '지'],
          detail: `${a.jiHanja}${b.jiHanja} 형`,
        });
      }
      if (pairIncludes(JIJI_PA, a.jiIdx, b.jiIdx)) {
        out.push({
          type: '지지파',
          positions: [POS_LABEL[i] + '지', POS_LABEL[j] + '지'],
          detail: `${a.jiHanja}${b.jiHanja} 파`,
        });
      }
    }
  }
  // 지지삼합 — full triple match
  for (const triple of JIJI_SAMHAP) {
    const indices = pillars
      .map((p, i) => ({ jiIdx: p.jiIdx, label: POS_LABEL[i] }))
      .filter((p) => triple.includes(p.jiIdx));
    const uniqueJi = new Set(indices.map((p) => p.jiIdx));
    if (uniqueJi.size === 3) {
      out.push({
        type: '지지삼합',
        positions: indices.map((i) => i.label + '지'),
        detail: '삼합 완성',
      });
    }
  }
  return out;
}

// Pair-level summary between two saju charts (for compatibility scoring).
export function pairwiseSummary(a: Palja, b: Palja): {
  hap: string[];
  chung: string[];
} {
  const hap: string[] = [];
  const chung: string[] = [];

  const dayA = a.day;
  const dayB = b.day;

  if (pairIncludes(CHEONGAN_HAP, dayA.ganIdx, dayB.ganIdx)) {
    hap.push(`일간 ${dayA.ganHanja}${dayB.ganHanja} 합`);
  }
  if (pairIncludes(CHEONGAN_CHUNG, dayA.ganIdx, dayB.ganIdx)) {
    chung.push(`일간 ${dayA.ganHanja}${dayB.ganHanja} 충`);
  }
  if (pairIncludes(JIJI_YUKHAP, dayA.jiIdx, dayB.jiIdx)) {
    hap.push(`일지 ${dayA.jiHanja}${dayB.jiHanja} 육합`);
  }
  if (pairIncludes(JIJI_CHUNG, dayA.jiIdx, dayB.jiIdx)) {
    chung.push(`일지 ${dayA.jiHanja}${dayB.jiHanja} 충`);
  }
  return { hap, chung };
}
