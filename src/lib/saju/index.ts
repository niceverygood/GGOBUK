export * from './types';
export * from './constants';
export { calculatePalja } from './palja';
export { computeOhaeng } from './ohaeng';
export { computeSipsung } from './sipsung';
export { computeSinsal } from './sinsal';
export { computeDaewoon } from './daewoon';
export { findInteractionsWithinPalja, pairwiseSummary } from './hapchung';
export { findSolarTermDate, solarLongitude } from './solar_terms';

import { calculatePalja } from './palja';
import { computeOhaeng } from './ohaeng';
import { computeSipsung } from './sipsung';
import { computeSinsal } from './sinsal';
import { computeDaewoon } from './daewoon';
import type { SajuInput, SajuResult } from './types';

export function buildSajuResult(input: SajuInput): SajuResult {
  const palja = calculatePalja(input);
  const ohaengCount = computeOhaeng(palja);
  const sipsung = computeSipsung(palja);
  const sinsal = computeSinsal(palja);
  const daewoon = computeDaewoon(palja, input.birthDate, input.gender, input.birthTime);
  return {
    input,
    palja,
    ilgan: palja.day.gan,
    ilgi: palja.day.ji,
    ohaengCount,
    sipsung,
    sinsal,
    daewoon,
  };
}
