// 충/형/파 재발동 시점 자동 계산.
//
// 원국에 박힌 충·형·파는 평소엔 잠재돼 있다가, 운(대운·세운)에서 같은 글자가
// 다시 들어올 때 강하게 재발동된다. 명리 풀이의 "시점 박힌 예언"의 핵심 재료.
//
// 이 모듈은 사주 원국의 4개 지지 각각에 대해, 향후 N년치 대운/세운에서
// 그 글자와 충·형·파 관계인 글자가 들어오는 시점을 사전 계산해 LLM에 박아넣는다.
// LLM이 "올해 OO 들어와요" 같은 막연한 표현 대신 "2027년 자수 세운이 원국
// 일지 오화와 자오충 재발동, 배우자 영역에서 한 번 큰 흔들림" 같은 구체적
// 시점 ↔ 글자 ↔ 영역 연결을 적게 한다.

import { JIJI_CHUNG, JIJI_HYEONG, JIJI_PA } from './hapchung';
import { calculatePalja } from './palja';
import type { SajuResult } from './types';

type ClashType = '충' | '형' | '파';

const POS_LABELS = ['연주', '월주', '일주', '시주'] as const;
type PositionName = (typeof POS_LABELS)[number];

export interface ClashTrigger {
  year: number;
  age: number;
  source: 'daewoon' | 'sewoon';
  triggerJi: string;
  triggerJiHanja: string;
  natalJi: string;
  natalJiHanja: string;
  natalPosition: PositionName;
  clashType: ClashType;
}

function clashPartners(jiIdx: number): Array<{ partnerIdx: number; type: ClashType }> {
  const out: Array<{ partnerIdx: number; type: ClashType }> = [];
  const tables: Array<[ReadonlyArray<readonly [number, number]>, ClashType]> = [
    [JIJI_CHUNG, '충'],
    [JIJI_HYEONG, '형'],
    [JIJI_PA, '파'],
  ];
  for (const [pairs, type] of tables) {
    for (const [a, b] of pairs) {
      if (a === jiIdx) out.push({ partnerIdx: b, type });
      else if (b === jiIdx) out.push({ partnerIdx: a, type });
    }
  }
  // dedup
  const seen = new Set<string>();
  return out.filter((o) => {
    const k = `${o.partnerIdx}-${o.type}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function findFutureClashes(
  saju: SajuResult,
  opts?: { yearsAhead?: number; daewoonAhead?: number; baseYear?: number },
): ClashTrigger[] {
  const yearsAhead = opts?.yearsAhead ?? 5;
  const daewoonAhead = opts?.daewoonAhead ?? 3;
  const baseYear = opts?.baseYear ?? new Date().getFullYear();
  const birthYear = Number(saju.input.birthDate.slice(0, 4));

  const palja = saju.palja;
  const natals: Array<{
    position: PositionName;
    jiIdx: number;
    ji: string;
    jiHanja: string;
  }> = [
    {
      position: '연주',
      jiIdx: palja.year.jiIdx,
      ji: palja.year.ji,
      jiHanja: palja.year.jiHanja,
    },
    {
      position: '월주',
      jiIdx: palja.month.jiIdx,
      ji: palja.month.ji,
      jiHanja: palja.month.jiHanja,
    },
    {
      position: '일주',
      jiIdx: palja.day.jiIdx,
      ji: palja.day.ji,
      jiHanja: palja.day.jiHanja,
    },
  ];
  if (palja.time) {
    natals.push({
      position: '시주',
      jiIdx: palja.time.jiIdx,
      ji: palja.time.ji,
      jiHanja: palja.time.jiHanja,
    });
  }

  const out: ClashTrigger[] = [];

  // 1. 진행 중 대운 + 이후 daewoonAhead 개 훑기
  const currentDaewoonIdx = saju.daewoon.findIndex(
    (d) => baseYear >= d.startYear && baseYear <= d.startYear + 9,
  );
  const startIdx = currentDaewoonIdx >= 0 ? currentDaewoonIdx : 0;
  for (
    let i = startIdx;
    i < Math.min(saju.daewoon.length, startIdx + daewoonAhead + 1);
    i++
  ) {
    const d = saju.daewoon[i];
    const dJiIdx = d.pillar.jiIdx;
    for (const natal of natals) {
      const partners = clashPartners(natal.jiIdx);
      for (const p of partners) {
        if (p.partnerIdx === dJiIdx) {
          out.push({
            year: d.startYear,
            age: d.startAge,
            source: 'daewoon',
            triggerJi: d.pillar.ji,
            triggerJiHanja: d.pillar.jiHanja,
            natalJi: natal.ji,
            natalJiHanja: natal.jiHanja,
            natalPosition: natal.position,
            clashType: p.type,
          });
        }
      }
    }
  }

  // 2. 향후 세운 훑기
  for (let dy = 0; dy < yearsAhead; dy++) {
    const year = baseYear + dy;
    try {
      const ref = calculatePalja({
        birthDate: `${year}-04-01`,
        isLunar: false,
        gender: 'M',
      });
      const sJiIdx = ref.year.jiIdx;
      for (const natal of natals) {
        const partners = clashPartners(natal.jiIdx);
        for (const p of partners) {
          if (p.partnerIdx === sJiIdx) {
            out.push({
              year,
              age: year - birthYear,
              source: 'sewoon',
              triggerJi: ref.year.ji,
              triggerJiHanja: ref.year.jiHanja,
              natalJi: natal.ji,
              natalJiHanja: natal.jiHanja,
              natalPosition: natal.position,
              clashType: p.type,
            });
          }
        }
      }
    } catch {
      // out-of-range year — skip
    }
  }

  // dedup by (year, position, type, source) + sort
  const seen = new Set<string>();
  return out
    .filter((c) => {
      const k = `${c.year}-${c.natalPosition}-${c.clashType}-${c.source}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.year - b.year);
}

function positionMeaning(pos: PositionName): string {
  switch (pos) {
    case '연주':
      return '부모·조상·초년 자리';
    case '월주':
      return '부모·형제·직업·사회 자리';
    case '일주':
      return '자기 자신·배우자 자리';
    case '시주':
      return '자녀·말년 자리';
  }
}

/** Filter to triggers relevant to a category. love/family/weakness 등에서 사용. */
export function filterClashesByPosition(
  triggers: ClashTrigger[],
  positions: PositionName[],
): ClashTrigger[] {
  const set = new Set(positions);
  return triggers.filter((c) => set.has(c.natalPosition));
}

/** LLM prompt에 박아 넣을 사람-읽기 좋은 요약. */
export function formatClashTriggers(
  triggers: ClashTrigger[],
  opts?: { maxLines?: number; categoryLabel?: string },
): string {
  if (triggers.length === 0) return '';
  const max = opts?.maxLines ?? 8;
  const visible = triggers.slice(0, max);
  const heading = opts?.categoryLabel
    ? `## ${opts.categoryLabel} 영역 충/형/파 재발동 시점 (자동 계산)`
    : '## 충/형/파 재발동 시점 (자동 계산)';
  const lines: string[] = [heading];
  for (const c of visible) {
    const sourceLabel = c.source === 'daewoon' ? '대운' : '세운';
    lines.push(
      `- ${c.year}년 (${c.age}세) ${sourceLabel} ${c.triggerJiHanja}(${c.triggerJi})이 원국 ${c.natalPosition} ${c.natalJiHanja}(${c.natalJi})과 ${c.clashType} 발동 — ${positionMeaning(c.natalPosition)}`,
    );
  }
  if (triggers.length > max) {
    lines.push(`  · …외 ${triggers.length - max}건`);
  }
  lines.push(
    '',
    '→ 위 시점은 그 자리에서 한 번 흔들림·충돌·전환의 표식. 시점 예언에 구체 글자 ↔ 연도 ↔ 영역으로 직접 인용하라.',
  );
  return lines.join('\n');
}
