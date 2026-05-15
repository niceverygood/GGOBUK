export type Cheongan = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계';
export type Jiji = '자' | '축' | '인' | '묘' | '진' | '사' | '오' | '미' | '신' | '유' | '술' | '해';
export type Ohaeng = '목' | '화' | '토' | '금' | '수';
export type Sipsung =
  | '비견'
  | '겁재'
  | '식신'
  | '상관'
  | '편재'
  | '정재'
  | '편관'
  | '정관'
  | '편인'
  | '정인';

export interface Pillar {
  gan: Cheongan;
  ji: Jiji;
  ganHanja: string;
  jiHanja: string;
  ganIdx: number;
  jiIdx: number;
  ganOhaeng: Ohaeng;
  jiOhaeng: Ohaeng;
}

export interface Palja {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  time: Pillar | null;
}

export interface OhaengCount {
  목: number;
  화: number;
  토: number;
  금: number;
  수: number;
}

export interface SipsungMap {
  yearGan: Sipsung;
  yearJi: Sipsung;
  monthGan: Sipsung;
  monthJi: Sipsung;
  dayJi: Sipsung;
  timeGan?: Sipsung;
  timeJi?: Sipsung;
}

export interface SinsalEntry {
  name: string;
  position: '연주' | '월주' | '일주' | '시주';
  description: string;
}

export interface DaewoonPeriod {
  startAge: number;
  startYear: number;
  pillar: Pillar;
  sipsung: Sipsung;
}

export interface SajuInput {
  birthDate: string; // 'YYYY-MM-DD'
  birthTime?: string; // 'HH:MM' or undefined
  isLunar: boolean;
  isLeapMonth?: boolean;
  gender: 'M' | 'F';
}

export interface SajuResult {
  input: SajuInput;
  palja: Palja;
  ilgan: Cheongan;
  ilgi: Jiji;
  ohaengCount: OhaengCount;
  sipsung: SipsungMap;
  sinsal: SinsalEntry[];
  daewoon: DaewoonPeriod[];
}
