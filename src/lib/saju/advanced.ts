// Advanced 명리학 layer — the professional-grade indicators that separate a
// real consultant's reading from a generic one:
//   - 십이운성 (十二運星): the 12 energy stages the day-master takes at each branch
//   - 지장간 가중 오행 (hidden-stem weighted five elements, with 월령 weighting)
//   - 득령/득지/득세 (the three pillars of 신강·신약 judgment)
//   - 육친 (六親): sipsung mapped to real relatives (gender-aware)
//   - 궁위 (宮位): what each of the four pillars governs in life
//
// All rule-based; meant to SEED the LLM with structured, citable evidence.

import {
  CHEONGAN,
  CHEONGAN_OHAENG_IDX,
  CHEONGAN_YINYANG,
  JIJANGGAN_BY_JIJI,
  JIJI,
  JIJI_OHAENG_IDX,
  OHAENG,
} from './constants';
import type { Ohaeng, Palja, Pillar, Sipsung } from './types';

const GAN_LIST = CHEONGAN as readonly string[];
const OHAENG_KO = OHAENG as readonly Ohaeng[];

function ganIdxOf(name: string): number {
  return GAN_LIST.indexOf(name);
}

// ───────────────────────────── 십이운성 (十二運星) ─────────────────────────────

export const TWELVE_STAGES = [
  '장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양',
] as const;
export type TwelveStage = (typeof TWELVE_STAGES)[number];

// 일간별 장생(長生) 지지 인덱스. 양간은 순행(+1), 음간은 역행(-1).
// 갑(亥), 을(午), 병(寅), 정(酉), 무(寅), 기(酉), 경(巳), 신(子), 임(申), 계(卯).
const JANGSAENG_JIJI: Record<number, number> = {
  0: 11, 1: 6, 2: 2, 3: 9, 4: 2, 5: 9, 6: 5, 7: 0, 8: 8, 9: 3,
};

const STAGE_MEANING: Record<TwelveStage, string> = {
  장생: '새로 태어나 자라나는 기운, 순수한 시작',
  목욕: '다듬어지는 시기, 변동·기복·매력',
  관대: '사회로 나아가는 청년기, 성장과 패기',
  건록: '자립과 전성기 진입, 안정된 힘',
  제왕: '기운의 정점, 강한 추진력과 자기 주도',
  쇠: '정점을 지나 차분해지는 기운, 노련함',
  병: '쉬어가는 기운, 예민함·내면화',
  사: '활동을 거두는 기운, 정리와 사색',
  묘: '갈무리·저장의 기운, 끈기와 마무리',
  절: '끊기고 비워지는 기운, 단절 후 전환',
  태: '잉태된 가능성, 잠재력과 시작 직전',
  양: '길러지는 기운, 보호 속의 준비',
};

export function twelveStage(ilganIdx: number, jijiIdx: number): TwelveStage {
  const start = JANGSAENG_JIJI[ilganIdx];
  const dir = CHEONGAN_YINYANG[ilganIdx] === 0 ? 1 : -1; // 양간 순행, 음간 역행
  const offset = (((jijiIdx - start) * dir) % 12 + 12) % 12;
  return TWELVE_STAGES[offset];
}

export interface UnseongEntry {
  position: '연지' | '월지' | '일지' | '시지';
  jiji: string;
  stage: TwelveStage;
  meaning: string;
}

export function computeUnseong(palja: Palja): UnseongEntry[] {
  const ilganIdx = palja.day.ganIdx;
  const rows: Array<{ pos: UnseongEntry['position']; p: Pillar }> = [
    { pos: '연지', p: palja.year },
    { pos: '월지', p: palja.month },
    { pos: '일지', p: palja.day },
    ...(palja.time ? [{ pos: '시지' as const, p: palja.time }] : []),
  ];
  return rows.map(({ pos, p }) => {
    const stage = twelveStage(ilganIdx, p.jiIdx);
    return { position: pos, jiji: p.ji, stage, meaning: STAGE_MEANING[stage] };
  });
}

// ───────────────────────── 지장간 가중 오행 (hidden-stem weighting) ─────────────────────────

// 정기(본기)=1.0, 중기=0.5, 여기=0.3. 천간 1.0. 월지는 계절 기운이라 ×1.3 보정.
const HIDDEN_WEIGHTS_BY_COUNT: Record<number, number[]> = {
  // index order matches JIJANGGAN_BY_JIJI (여기, [중기], 정기)
  2: [0.4, 1.0], // 여기, 정기
  3: [0.3, 0.5, 1.0], // 여기, 중기, 정기
};

export interface WeightedOhaeng {
  목: number;
  화: number;
  토: number;
  금: number;
  수: number;
}

export function weightedOhaeng(palja: Palja): WeightedOhaeng {
  const w: WeightedOhaeng = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const add = (ohaengIdx: number, amt: number) => {
    w[OHAENG_KO[ohaengIdx]] += amt;
  };

  const pillars: Array<{ p: Pillar; isMonth: boolean }> = [
    { p: palja.year, isMonth: false },
    { p: palja.month, isMonth: true },
    { p: palja.day, isMonth: false },
    ...(palja.time ? [{ p: palja.time, isMonth: false }] : []),
  ];

  for (const { p, isMonth } of pillars) {
    const seasonMul = isMonth ? 1.3 : 1.0;
    // 천간
    add(CHEONGAN_OHAENG_IDX[p.ganIdx], 1.0 * seasonMul);
    // 지장간
    const hidden = JIJANGGAN_BY_JIJI[p.ji] ?? [];
    const weights = HIDDEN_WEIGHTS_BY_COUNT[hidden.length] ?? hidden.map(() => 1 / hidden.length);
    hidden.forEach((g, i) => {
      const gi = ganIdxOf(g);
      if (gi < 0) return;
      add(CHEONGAN_OHAENG_IDX[gi], weights[i] * seasonMul);
    });
  }

  // round to 1 decimal
  (Object.keys(w) as Ohaeng[]).forEach((k) => {
    w[k] = Math.round(w[k] * 10) / 10;
  });
  return w;
}

// ───────────────────────── 득령/득지/득세 (신강·신약 3요소) ─────────────────────────

function generates(a: number, b: number): boolean {
  return (a + 1) % 5 === b;
}

export interface Rootedness {
  deukRyeong: boolean; // 득령 — 월령이 일간을 돕는가
  deukJi: boolean; // 득지 — 지지(특히 일지)에 통근
  deukSe: boolean; // 득세 — 천간·지지 전체 세력이 일간 편인가
  detail: string[];
}

export function analyzeRootedness(palja: Palja): Rootedness {
  const ilganO = CHEONGAN_OHAENG_IDX[palja.day.ganIdx];
  const detail: string[] = [];

  // 득령: 월지 오행이 일간과 같거나(비겁) 일간을 생하면(인성)
  const monthO = JIJI_OHAENG_IDX[palja.month.jiIdx];
  const deukRyeong = monthO === ilganO || generates(monthO, ilganO);
  detail.push(
    deukRyeong
      ? `득령(得令): 월지 ${palja.month.ji}가 일간을 돕는 ${OHAENG_KO[monthO]} 기운`
      : `실령(失令): 월지 ${palja.month.ji}(${OHAENG_KO[monthO]})가 일간을 돕지 않음`,
  );

  // 득지: 지지(연·일·시) 중 일간과 같은 오행(통근) 존재
  let rooted = 0;
  for (const p of [palja.year, palja.day, ...(palja.time ? [palja.time] : [])]) {
    if (JIJI_OHAENG_IDX[p.jiIdx] === ilganO) rooted += 1;
  }
  const deukJi = rooted > 0;
  detail.push(
    deukJi ? `득지(得地): 지지 ${rooted}곳에 통근` : '실지(失地): 지지 통근 없음',
  );

  // 득세: 천간·지지 전체에서 일간 편(비겁·인성) 개수 vs 그 외
  let allies = 0;
  let foes = 0;
  const tally = (o: number) => {
    if (o === ilganO || generates(o, ilganO)) allies += 1;
    else foes += 1;
  };
  for (const p of [palja.year, palja.month, palja.day, ...(palja.time ? [palja.time] : [])]) {
    if (p !== palja.day) tally(CHEONGAN_OHAENG_IDX[p.ganIdx]);
    tally(JIJI_OHAENG_IDX[p.jiIdx]);
  }
  const deukSe = allies >= foes;
  detail.push(
    `${deukSe ? '득세(得勢)' : '실세(失勢)'}: 일간 편 ${allies} vs 그 외 ${foes}`,
  );

  return { deukRyeong, deukJi, deukSe, detail };
}

// ───────────────────────────── 육친 (六親) ─────────────────────────────

export function yukchin(sipsung: Sipsung, gender: 'M' | 'F'): string {
  const common: Record<Sipsung, string> = {
    비견: '형제·동료·친구(나와 대등한 사람)',
    겁재: '형제·경쟁자(때로 이성 형제)',
    식신: gender === 'F' ? '자녀(딸 성향)·후배' : '장모·손주·후배',
    상관: gender === 'F' ? '자녀(아들 성향)·아랫사람' : '조모·손녀·아랫사람',
    편재: gender === 'M' ? '아버지·애인(여자)·유동 재물' : '아버지·시어머니',
    정재: gender === 'M' ? '아내·고정 재물' : '아버지·재물',
    편관: gender === 'F' ? '애인·이성 인연' : '자녀(아들 성향)·직책·압박',
    정관: gender === 'F' ? '남편·이성 인연' : '자녀(딸 성향)·명예·직책',
    편인: '계모·이모·편모(치우친 보살핌)',
    정인: '어머니·후원자·문서',
  };
  return common[sipsung];
}

// ───────────────────────────── 궁위 (宮位) ─────────────────────────────

export interface PalaceMeaning {
  position: '연주' | '월주' | '일주' | '시주';
  governs: string;
  ageRange: string;
}

export const PALACES: PalaceMeaning[] = [
  { position: '연주', governs: '조상·부모·뿌리·사회적 배경', ageRange: '초년 (~15세)' },
  { position: '월주', governs: '부모·형제·직업·사회궁', ageRange: '청년 (16~30세)' },
  { position: '일주', governs: '자기 자신 / 일지=배우자궁', ageRange: '중년 (31~45세)' },
  { position: '시주', governs: '자녀·아랫사람·말년·결실', ageRange: '말년 (46세~)' },
];

// ───────────────────────────── 통합 ─────────────────────────────

export interface AdvancedAnalysis {
  unseong: UnseongEntry[];
  weighted: WeightedOhaeng;
  rootedness: Rootedness;
  palaces: PalaceMeaning[];
  /** 일간이 자기 일지에서 갖는 십이운성 — 자존감·배우자 관계의 핵심 */
  dayStage: TwelveStage;
}

export function computeAdvanced(palja: Palja): AdvancedAnalysis {
  return {
    unseong: computeUnseong(palja),
    weighted: weightedOhaeng(palja),
    rootedness: analyzeRootedness(palja),
    palaces: PALACES,
    dayStage: twelveStage(palja.day.ganIdx, palja.day.jiIdx),
  };
}
