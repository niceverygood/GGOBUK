// 대운 길흉 점수 + 세운 + 인생 이벤트 마커.
//
// 캘린더의 dayFortune이 일 단위였다면, 여기는 10년·1년 단위로 같은 로직을
// 확장한다. 점수는 0-100으로 정규화하며, 캘린더와 동일한 grade 분류를 쓴다
// (≥72 길 / 50-71 평 / <50 주의).

import { analyzeSaju } from './analysis';
import { calculatePalja } from './palja';
import { sipsungOf } from './sipsung';
import {
  CHEONGAN_OHAENG_IDX,
  CHEONGAN_YINYANG,
  JIJI_OHAENG_IDX,
  OHAENG,
} from './constants';
import type {
  DaewoonPeriod,
  Ohaeng,
  Pillar,
  SajuResult,
  Sipsung,
} from './types';

const SIPSUNG_EFFECT: Record<Sipsung, { delta: number; note: string }> = {
  정인: { delta: 8, note: '보호·배움·귀인' },
  편인: { delta: 4, note: '직관·공부' },
  식신: { delta: 8, note: '안정적 생산·여유' },
  상관: { delta: 4, note: '창의·자유·말의 힘' },
  정재: { delta: 9, note: '안정적 재물·결실' },
  편재: { delta: 6, note: '활동적 재물·기회' },
  정관: { delta: 7, note: '명분·체면·자리' },
  편관: { delta: -4, note: '책임·압박·검증' },
  비견: { delta: 1, note: '동료·자기 자리' },
  겁재: { delta: -5, note: '경쟁·지출' },
};

const JI_YUKHAP: Array<[number, number]> = [
  [0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7],
];
const JI_CHUNG: Array<[number, number]> = [
  [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
];
const JI_HYEONG: Array<[number, number]> = [
  [2, 5], [5, 8], [2, 8], [1, 10], [10, 7], [1, 7], [0, 3],
];

function pairHas(pairs: Array<[number, number]>, a: number, b: number) {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export type FortuneGrade = '길' | '평' | '주의';

function gradeOf(score: number): FortuneGrade {
  if (score >= 72) return '길';
  if (score >= 50) return '평';
  return '주의';
}

export interface DaewoonFortune {
  startAge: number;
  startYear: number;
  endYear: number;
  pillar: Pillar;
  sipsung: Sipsung;
  jiOhaeng: Ohaeng;
  /** 0-100 점수 */
  score: number;
  grade: FortuneGrade;
  /** 한 줄 노트 */
  note: string;
  /** 일지와 합/충 여부 */
  hap: boolean;
  chung: boolean;
  /** 용신·격국 결합 신호 */
  matchesYongsin: boolean;
}

/**
 * 한 대운의 길흉 점수 계산.
 *
 * 점수 = 50(기본) + 십성 효과 + 용신 일치 + 합/충 + 신살 결합.
 * 사용자 일주를 기준으로 그 대운의 천간/지지가 어떻게 작용하는지 계산.
 */
export function daewoonFortune(
  saju: SajuResult,
  period: DaewoonPeriod,
): DaewoonFortune {
  const ilganIdx = saju.palja.day.ganIdx;
  const myJiIdx = saju.palja.day.jiIdx;
  const analysis = analyzeSaju(saju);
  const yongsin = analysis.yongsin.main;

  const jiOhaeng = OHAENG[JIJI_OHAENG_IDX[period.pillar.jiIdx]];
  const ganOhaeng = OHAENG[CHEONGAN_OHAENG_IDX[period.pillar.ganIdx]];
  const hap = pairHas(JI_YUKHAP, period.pillar.jiIdx, myJiIdx);
  const chung = pairHas(JI_CHUNG, period.pillar.jiIdx, myJiIdx);
  const hyeong = pairHas(JI_HYEONG, period.pillar.jiIdx, myJiIdx);

  let score = 55;
  const eff = SIPSUNG_EFFECT[period.sipsung];
  score += eff.delta;
  let note = eff.note;

  let matchesYongsin = false;
  if (jiOhaeng === yongsin) {
    score += 16;
    matchesYongsin = true;
    note = `용신 ${yongsin} 들어옴`;
  } else if (ganOhaeng === yongsin) {
    score += 10;
    matchesYongsin = true;
    note = `용신 ${yongsin} 천간 동조`;
  }

  // 일지 합 — 인연·협조 / 일지 충 — 변동·이동
  if (hap) {
    score += 10;
    note = '일지와 합 — 인연·결속';
  }
  if (chung) {
    score -= 14;
    note = '일지와 충 — 변동·이동';
  }
  if (hyeong) {
    score -= 6;
    note = '일지와 형 — 마찰·정리';
  }

  // 일간 강약에 따른 효과 보정 — 신강이면 식상·재성 더 좋고, 신약이면 인성·비겁 더 좋음
  const isStrong = analysis.strength.score >= 60;
  if (isStrong && (period.sipsung === '편재' || period.sipsung === '식신')) {
    score += 4;
  }
  if (!isStrong && (period.sipsung === '정인' || period.sipsung === '비견')) {
    score += 4;
  }

  score = Math.max(20, Math.min(95, score));

  return {
    startAge: period.startAge,
    startYear: period.startYear,
    endYear: period.startYear + 9,
    pillar: period.pillar,
    sipsung: period.sipsung,
    jiOhaeng,
    score,
    grade: gradeOf(score),
    note,
    hap,
    chung,
    matchesYongsin,
  };
}

export interface SewoonFortune {
  year: number;
  ageAtYearStart: number;
  pillar: Pillar;
  sipsung: Sipsung;
  jiOhaeng: Ohaeng;
  score: number;
  grade: FortuneGrade;
  note: string;
  hap: boolean;
  chung: boolean;
}

/**
 * 한 해의 세운(연운) 풀이.
 *
 * 세운은 그 해의 연주(年柱)를 일간 기준으로 본다. 점수는 대운과 비슷한
 * 가중치지만, 진행 중 대운과의 시너지·갈등도 함께 반영.
 */
export function sewoonFortune(
  saju: SajuResult,
  year: number,
  currentDaewoon: DaewoonPeriod | null,
): SewoonFortune {
  const ilganIdx = saju.palja.day.ganIdx;
  const myJiIdx = saju.palja.day.jiIdx;
  const analysis = analyzeSaju(saju);
  const yongsin = analysis.yongsin.main;

  // 그 해의 연주. 입춘 이후 기준이므로 4월 1일을 사용 (간단).
  const yearPillar = calculatePalja({
    birthDate: `${year}-04-01`,
    isLunar: false,
    gender: 'M',
  }).year;

  const sipsung = sipsungOf(
    CHEONGAN_OHAENG_IDX[ilganIdx],
    CHEONGAN_YINYANG[ilganIdx],
    CHEONGAN_OHAENG_IDX[yearPillar.ganIdx],
    CHEONGAN_YINYANG[yearPillar.ganIdx],
  );
  const jiOhaeng = OHAENG[JIJI_OHAENG_IDX[yearPillar.jiIdx]];
  const ganOhaeng = OHAENG[CHEONGAN_OHAENG_IDX[yearPillar.ganIdx]];
  const hap = pairHas(JI_YUKHAP, yearPillar.jiIdx, myJiIdx);
  const chung = pairHas(JI_CHUNG, yearPillar.jiIdx, myJiIdx);

  let score = 55;
  const eff = SIPSUNG_EFFECT[sipsung];
  score += eff.delta;
  let note = eff.note;

  if (jiOhaeng === yongsin) {
    score += 14;
    note = `용신 ${yongsin} 진입`;
  } else if (ganOhaeng === yongsin) {
    score += 8;
  }
  if (hap) {
    score += 8;
    note = '일지 합 — 인연·결속';
  }
  if (chung) {
    score -= 12;
    note = '일지 충 — 변동·이동';
  }

  // 진행 중 대운과의 시너지: 같은 십성이면 +6, 다르면 0.
  if (currentDaewoon && currentDaewoon.sipsung === sipsung) {
    score += 6;
  }

  score = Math.max(20, Math.min(95, score));

  // 출생연도 기준 그 해 나이 (생일 전 기준 한국 나이)
  const birthYear = Number(saju.input.birthDate.slice(0, 4));
  const age = year - birthYear + 1;

  return {
    year,
    ageAtYearStart: age,
    pillar: yearPillar,
    sipsung,
    jiOhaeng,
    score,
    grade: gradeOf(score),
    note,
    hap,
    chung,
  };
}

/** korean-lunar-calendar 패키지가 지원하는 마지막 해. 이후는 사주 계산 불가. */
const SOLAR_TERMS_MAX_YEAR = 2050;

/**
 * 대운 안의 10년치 세운 한 번에 계산. 라이브러리 미지원 연도는 스킵.
 */
export function sewoonOfDaewoon(
  saju: SajuResult,
  period: DaewoonPeriod,
): SewoonFortune[] {
  const years: SewoonFortune[] = [];
  for (let y = period.startYear; y < period.startYear + 10; y += 1) {
    if (y > SOLAR_TERMS_MAX_YEAR) break;
    try {
      years.push(sewoonFortune(saju, y, period));
    } catch {
      // Library 범위 밖이면 그 해는 건너뛴다.
      break;
    }
  }
  return years;
}

// ─── 인생 이벤트 마커 ─────────────────────────────────────────────────────
//
// 사주 분석 결과로 통계적으로 fit하는 인생 이벤트 시점을 자동 추정.
// 단정이 아니라 "이 시기에 이런 영역이 활성화될 가능성이 높음" 신호.

export type EventMarkerType =
  | 'marriage'
  | 'career'
  | 'wealth'
  | 'study'
  | 'move'
  | 'health'
  | 'turning';

export interface EventMarker {
  year: number;
  age: number;
  type: EventMarkerType;
  label: string;
  emoji: string;
  reason: string;
}

const EVENT_EMOJI: Record<EventMarkerType, string> = {
  marriage: '💞',
  career: '💼',
  wealth: '💰',
  study: '📚',
  move: '🧳',
  health: '🩺',
  turning: '🔄',
};

/**
 * 인생 흐름에서 두드러진 이벤트 시점을 추정.
 *
 * 입력 사주의 대운·세운 전체를 훑어 다음 패턴이 강하게 잡히는 해를 마커로 표시:
 * - 배우자성 + 일지 합 진입 → 결혼 가능
 * - 식상·재성 동시 강화 → 사업/창업
 * - 정관·편관 강 진입 → 직장 변화
 * - 정인 강 진입 + 화개 → 공부·자격
 * - 역마 충 → 이사·이동
 * - 양인·백호 + 충 → 건강 주의
 * - 큰 십성 전환 (이전 대운 십성 그룹 → 다른 그룹) → 인생 전환점
 */
export function lifeEventMarkers(saju: SajuResult): EventMarker[] {
  const markers: EventMarker[] = [];
  // ilganIdx/ilganYinyang는 향후 일지 합 정밀 계산용으로 남겨둠.
  // const ilganIdx = saju.palja.day.ganIdx;
  // const ilganYinyang = CHEONGAN_YINYANG[ilganIdx];
  const isMale = saju.input.gender === 'M';
  const birthYear = Number(saju.input.birthDate.slice(0, 4));

  // 배우자성: 남=재성, 여=관성
  const marriageSipsung: Sipsung[] = isMale
    ? ['정재', '편재']
    : ['정관', '편관'];

  // 진행 중 대운 식별 (오늘 기준)
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < saju.daewoon.length; i += 1) {
    const d = saju.daewoon[i];
    const prev = i > 0 ? saju.daewoon[i - 1] : null;

    // 결혼: 배우자성 대운 진입 + 그 안의 일지 합 세운
    if (marriageSipsung.includes(d.sipsung)) {
      // sewoonOfDaewoon 자체가 라이브러리 범위 초과를 안전하게 처리
      const sewoon = sewoonOfDaewoon(saju, d);
      const candidate = sewoon.find((y) => y.hap && y.score >= 60);
      if (candidate) {
        markers.push({
          year: candidate.year,
          age: candidate.ageAtYearStart,
          type: 'marriage',
          label: '결혼·인연 가능',
          emoji: EVENT_EMOJI.marriage,
          reason: `${d.sipsung} 대운(${isMale ? '재성' : '관성'}=배우자) + 일지 합 ${candidate.pillar.jiHanja}`,
        });
      }
    }

    // 큰 인생 전환점: 십성 그룹이 바뀌는 대운
    if (prev) {
      const prevGroup = groupOf(prev.sipsung);
      const thisGroup = groupOf(d.sipsung);
      if (prevGroup !== thisGroup) {
        markers.push({
          year: d.startYear,
          age: d.startAge,
          type: 'turning',
          label: `인생 흐름 전환 (${prev.sipsung} → ${d.sipsung})`,
          emoji: EVENT_EMOJI.turning,
          reason: `${prevGroup} 흐름에서 ${thisGroup} 흐름으로 무게 중심 이동`,
        });
      }
    }

    // 직장 변화: 관성 진입 또는 이탈
    if (d.sipsung === '정관' || d.sipsung === '편관') {
      markers.push({
        year: d.startYear,
        age: d.startAge,
        type: 'career',
        label: `${d.sipsung === '편관' ? '책임·도전' : '명예·자리'} 시기`,
        emoji: EVENT_EMOJI.career,
        reason: `${d.sipsung} 대운 — 직장·역할이 ${d.sipsung === '편관' ? '검증' : '정돈'}되는 흐름`,
      });
    }

    // 재물: 재성 + 식상 같이 활성화
    if (d.sipsung === '편재' || d.sipsung === '정재') {
      markers.push({
        year: d.startYear,
        age: d.startAge,
        type: 'wealth',
        label: `재물 활성 시기`,
        emoji: EVENT_EMOJI.wealth,
        reason: `${d.sipsung} 대운 — ${d.sipsung === '편재' ? '활동적 기회' : '안정적 결실'}`,
      });
    }

    // 공부·자격: 정인 진입
    if (d.sipsung === '정인' || d.sipsung === '편인') {
      markers.push({
        year: d.startYear,
        age: d.startAge,
        type: 'study',
        label: '공부·자격·귀인 시기',
        emoji: EVENT_EMOJI.study,
        reason: `${d.sipsung} 대운 — 배움·보호·기록의 시기`,
      });
    }

    // 이동: 역마 신살 + 대운 충
    const hasYeokma = saju.sinsal.some((s) => s.name?.includes('역마'));
    if (
      hasYeokma &&
      pairHas(JI_CHUNG, d.pillar.jiIdx, saju.palja.day.jiIdx)
    ) {
      markers.push({
        year: d.startYear,
        age: d.startAge,
        type: 'move',
        label: '이사·이동 시기',
        emoji: EVENT_EMOJI.move,
        reason: '원국 역마 + 대운 일지 충 — 환경 변화',
      });
    }

    // 건강 주의: 편관 + 양인/백호 신살
    const hasYangin = saju.sinsal.some((s) => s.name?.includes('양인'));
    const hasBaekho = saju.sinsal.some((s) => s.name?.includes('백호'));
    if (
      d.sipsung === '편관' &&
      (hasYangin || hasBaekho) &&
      pairHas(JI_CHUNG, d.pillar.jiIdx, saju.palja.day.jiIdx)
    ) {
      markers.push({
        year: d.startYear,
        age: d.startAge,
        type: 'health',
        label: '건강·과로 조심',
        emoji: EVENT_EMOJI.health,
        reason: '편관 대운 + 양인/백호 + 일지 충',
      });
    }
  }

  // 중복 제거 (같은 year+type) + 정렬
  const seen = new Set<string>();
  return markers
    .filter((m) => {
      const key = `${m.year}-${m.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.year - b.year)
    .filter((m) => m.year >= birthYear && m.year <= currentYear + 60);
}

function groupOf(s: Sipsung): string {
  const map: Record<string, string> = {
    비견: '비겁',
    겁재: '비겁',
    식신: '식상',
    상관: '식상',
    편재: '재성',
    정재: '재성',
    편관: '관성',
    정관: '관성',
    편인: '인성',
    정인: '인성',
  };
  return map[s];
}

// ─── 시각화 헬퍼 ─────────────────────────────────────────────────────────

export const OHAENG_COLOR: Record<
  Ohaeng,
  { bg: string; border: string; text: string; dot: string }
> = {
  목: {
    bg: 'bg-[#E3F4FB]',
    border: 'border-[#5DADE2]/40',
    text: 'text-[#1C5A7C]',
    dot: 'bg-[#5DADE2]',
  },
  화: {
    bg: 'bg-[#FFE8E3]',
    border: 'border-[#E74C3C]/40',
    text: 'text-[#A33C32]',
    dot: 'bg-[#E74C3C]',
  },
  토: {
    bg: 'bg-[#FFF6C8]',
    border: 'border-[#D7B62E]/45',
    text: 'text-[#715D18]',
    dot: 'bg-[#D7B62E]',
  },
  금: {
    bg: 'bg-[#F2F4F5]',
    border: 'border-[#AEB9BA]/45',
    text: 'text-[#5A6770]',
    dot: 'bg-[#AEB9BA]',
  },
  수: {
    bg: 'bg-[#EDF4F8]',
    border: 'border-[#34495E]/40',
    text: 'text-[#2F3E50]',
    dot: 'bg-[#34495E]',
  },
};

export const GRADE_COLOR: Record<FortuneGrade, { dot: string; chip: string }> = {
  길: { dot: 'bg-mint', chip: 'bg-mint/22 text-[#16706B]' },
  평: { dot: 'bg-gold', chip: 'bg-gold/30 text-[#7C5A0E]' },
  주의: { dot: 'bg-red', chip: 'bg-red/18 text-red' },
};
