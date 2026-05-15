import {
  BAEKHO_PILLARS,
  CHEONEUL_GWIIN,
  GWIGANG_PILLARS,
  SAMHAP_GROUPS,
  YANGIN,
  gongmangForGapja,
  JIJI,
} from './constants';
import { gapjaIdx } from './palja';
import type { Palja, Pillar, SinsalEntry } from './types';

const POSITIONS = ['연주', '월주', '일주', '시주'] as const;
type PositionName = (typeof POSITIONS)[number];

function pillarSlots(palja: Palja): Array<{ pillar: Pillar; pos: PositionName }> {
  const arr: Array<{ pillar: Pillar; pos: PositionName }> = [
    { pillar: palja.year, pos: '연주' },
    { pillar: palja.month, pos: '월주' },
    { pillar: palja.day, pos: '일주' },
  ];
  if (palja.time) arr.push({ pillar: palja.time, pos: '시주' });
  return arr;
}

export function computeSinsal(palja: Palja): SinsalEntry[] {
  const out: SinsalEntry[] = [];
  const ilganIdx = palja.day.ganIdx;
  const iljiIdx = palja.day.jiIdx;

  // 천을귀인
  const gwiPair = CHEONEUL_GWIIN[ilganIdx];
  if (gwiPair) {
    for (const slot of pillarSlots(palja)) {
      if (gwiPair.includes(slot.pillar.jiIdx)) {
        out.push({
          name: '천을귀인',
          position: slot.pos,
          description: '귀인의 도움을 받는 길성. 어려운 상황에서 조력자가 나타나는 기운.',
        });
      }
    }
  }

  // 양인살
  const yanginJiji = YANGIN[ilganIdx];
  if (yanginJiji !== undefined) {
    for (const slot of pillarSlots(palja)) {
      if (slot.pillar.jiIdx === yanginJiji) {
        out.push({
          name: '양인살',
          position: slot.pos,
          description: '강한 에너지와 추진력. 다만 과하면 충돌이나 사고를 부를 수 있는 양면적 기운.',
        });
      }
    }
  }

  // 일지 기반 도화/역마/화개
  const group = SAMHAP_GROUPS.find((g) => g.members.includes(iljiIdx));
  if (group) {
    for (const slot of pillarSlots(palja)) {
      if (slot.pillar.jiIdx === group.dohwa) {
        out.push({
          name: '도화살',
          position: slot.pos,
          description: '매력과 인기를 끄는 기운. 인간관계에서 시선을 받기 쉬움.',
        });
      }
      if (slot.pillar.jiIdx === group.yeokma) {
        out.push({
          name: '역마살',
          position: slot.pos,
          description: '이동·변화·여행의 기운. 한 자리에 오래 머물기 어려움.',
        });
      }
      if (slot.pillar.jiIdx === group.hwagae) {
        out.push({
          name: '화개살',
          position: slot.pos,
          description: '예술·종교·학문 같은 정신적 영역에서 발현되는 기운.',
        });
      }
    }
  }

  // 백호살 (특정 일주)
  if (BAEKHO_PILLARS.some(([g, j]) => g === ilganIdx && j === iljiIdx)) {
    out.push({
      name: '백호살',
      position: '일주',
      description: '강한 외향적 추진력. 격동기에 두각을 나타내나 건강·안전 주의.',
    });
  }

  // 괴강살 (특정 일주)
  if (GWIGANG_PILLARS.some(([g, j]) => g === ilganIdx && j === iljiIdx)) {
    out.push({
      name: '괴강살',
      position: '일주',
      description: '리더십과 카리스마. 극단으로 치우치면 자기 고집이 강해짐.',
    });
  }

  // 공망
  const dayGapja = gapjaIdx(ilganIdx, iljiIdx);
  const [gm1, gm2] = gongmangForGapja(dayGapja);
  for (const slot of pillarSlots(palja)) {
    if (slot.pillar.jiIdx === gm1 || slot.pillar.jiIdx === gm2) {
      out.push({
        name: '공망',
        position: slot.pos,
        description: `${JIJI[slot.pillar.jiIdx]}이 공망. 해당 자리의 기운이 비어 있어 실현이 늦어지거나 방향이 바뀌기 쉬움.`,
      });
    }
  }

  return out;
}
