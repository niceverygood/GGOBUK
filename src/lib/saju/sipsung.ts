import {
  CHEONGAN_OHAENG_IDX,
  CHEONGAN_YINYANG,
  JIJANGGAN_BY_JIJI,
  JIJI,
  JIJI_YINYANG,
} from './constants';
import type { Palja, Sipsung, SipsungMap } from './types';

// 상생 (생): 목→화→토→금→수→목
function generates(a: number, b: number): boolean {
  return (a + 1) % 5 === b;
}
// 상극 (극): 목→토→수→화→금→목
function overcomes(a: number, b: number): boolean {
  return (a + 2) % 5 === b;
}

// Compute sipsung label for a target (cheongan or jijanggan-derived) against an 일간.
// Inputs are oheng index (0..4) and yinyang (0=양, 1=음).
export function sipsungOf(
  ilganOheng: number,
  ilganYinyang: number,
  targetOheng: number,
  targetYinyang: number,
): Sipsung {
  const sameSign = ilganYinyang === targetYinyang;
  if (ilganOheng === targetOheng) return sameSign ? '비견' : '겁재';
  if (generates(ilganOheng, targetOheng)) return sameSign ? '식신' : '상관';
  if (overcomes(ilganOheng, targetOheng)) return sameSign ? '편재' : '정재';
  if (overcomes(targetOheng, ilganOheng)) return sameSign ? '편관' : '정관';
  if (generates(targetOheng, ilganOheng)) return sameSign ? '편인' : '정인';
  throw new Error('Unreachable: ohaeng combination not classified');
}

function sipsungForGan(ilganIdx: number, targetGanIdx: number): Sipsung {
  return sipsungOf(
    CHEONGAN_OHAENG_IDX[ilganIdx],
    CHEONGAN_YINYANG[ilganIdx],
    CHEONGAN_OHAENG_IDX[targetGanIdx],
    CHEONGAN_YINYANG[targetGanIdx],
  );
}

// 지지의 십성은 일반적으로 지장간의 정기(본기) 기준으로 판단한다.
function jijiPrimaryGanIdx(jijiIdx: number): number {
  const name = JIJI[jijiIdx];
  const primaryName = JIJANGGAN_BY_JIJI[name][JIJANGGAN_BY_JIJI[name].length - 1];
  const ganList = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  return ganList.indexOf(primaryName);
}

function sipsungForJi(ilganIdx: number, jijiIdx: number): Sipsung {
  return sipsungOf(
    CHEONGAN_OHAENG_IDX[ilganIdx],
    CHEONGAN_YINYANG[ilganIdx],
    CHEONGAN_OHAENG_IDX[jijiPrimaryGanIdx(jijiIdx)],
    JIJI_YINYANG[jijiIdx],
  );
}

export function computeSipsung(palja: Palja): SipsungMap {
  const ilgan = palja.day.ganIdx;
  const out: SipsungMap = {
    yearGan: sipsungForGan(ilgan, palja.year.ganIdx),
    yearJi: sipsungForJi(ilgan, palja.year.jiIdx),
    monthGan: sipsungForGan(ilgan, palja.month.ganIdx),
    monthJi: sipsungForJi(ilgan, palja.month.jiIdx),
    dayJi: sipsungForJi(ilgan, palja.day.jiIdx),
  };
  if (palja.time) {
    out.timeGan = sipsungForGan(ilgan, palja.time.ganIdx);
    out.timeJi = sipsungForJi(ilgan, palja.time.jiIdx);
  }
  return out;
}
