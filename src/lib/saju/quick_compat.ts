// Client-side rough compatibility score based on day-pillar 합/충 detection.
// Used by the /preview page so two-person comparison works without an LLM call.

import { pairwiseSummary } from './hapchung';
import type { Palja } from './types';

export interface QuickCompat {
  score: number;
  hap: string[];
  chung: string[];
}

export function quickCompat(a: Palja, b: Palja): QuickCompat {
  const { hap, chung } = pairwiseSummary(a, b);
  let score = 65;
  score += hap.length * 12;
  score -= chung.length * 14;
  // sameness of ilgan/ilgi nudges
  if (a.day.ganIdx === b.day.ganIdx) score += 4;
  if (a.day.jiIdx === b.day.jiIdx) score += 4;
  score = Math.max(25, Math.min(95, score));
  return { score, hap, chung };
}
