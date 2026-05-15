import { CHEONGAN_OHAENG_IDX, JIJI_OHAENG_IDX, OHAENG } from './constants';
import type { OhaengCount, Palja } from './types';

export function computeOhaeng(palja: Palja): OhaengCount {
  const counts: OhaengCount = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const inc = (idx: number) => {
    counts[OHAENG[idx]]++;
  };

  inc(CHEONGAN_OHAENG_IDX[palja.year.ganIdx]);
  inc(JIJI_OHAENG_IDX[palja.year.jiIdx]);
  inc(CHEONGAN_OHAENG_IDX[palja.month.ganIdx]);
  inc(JIJI_OHAENG_IDX[palja.month.jiIdx]);
  inc(CHEONGAN_OHAENG_IDX[palja.day.ganIdx]);
  inc(JIJI_OHAENG_IDX[palja.day.jiIdx]);

  if (palja.time) {
    inc(CHEONGAN_OHAENG_IDX[palja.time.ganIdx]);
    inc(JIJI_OHAENG_IDX[palja.time.jiIdx]);
  }

  return counts;
}
