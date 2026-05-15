// Saju (사주) calculation constants.
// Index conventions:
//   cheongan (天干) index 0..9 = 갑 을 병 정 무 기 경 신 임 계
//   jiji (地支)    index 0..11 = 자 축 인 묘 진 사 오 미 신 유 술 해
//   ohaeng       index 0..4  = 목 화 토 금 수

export const CHEONGAN = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
export const CHEONGAN_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

export const JIJI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;
export const JIJI_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export const OHAENG = ['목', '화', '토', '금', '수'] as const;

// 천간 → 오행 index. 갑을=목, 병정=화, 무기=토, 경신=금, 임계=수.
export const CHEONGAN_OHAENG_IDX = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4] as const;

// 지지 → 오행 index. 자=수, 축=토, 인=목, 묘=목, 진=토, 사=화, 오=화, 미=토, 신=금, 유=금, 술=토, 해=수.
export const JIJI_OHAENG_IDX = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4] as const;

// 음양: 양=0, 음=1. 갑(0)양, 을(1)음, 병(2)양, 정(3)음, ...
export const CHEONGAN_YINYANG = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] as const;
// 자(0)양, 축(1)음, 인(2)양, 묘(3)음, 진(4)양, 사(5)음, 오(6)양, 미(7)음, 신(8)양, 유(9)음, 술(10)양, 해(11)음.
// 사주 명리에서는 지지의 체용을 따로 보기도 하나, MVP에서는 위 표(자-양, 축-음, …)를 채택한다.
export const JIJI_YINYANG = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1] as const;

// 지장간 (hidden stems): 지지 안에 숨어있는 천간들. 정기/중기/여기 순.
// MVP에서는 표면 오행만 사용하지만 정보용으로 유지.
export const JIJANGGAN_BY_JIJI: Record<string, string[]> = {
  자: ['임', '계'],
  축: ['계', '신', '기'],
  인: ['무', '병', '갑'],
  묘: ['갑', '을'],
  진: ['을', '계', '무'],
  사: ['무', '경', '병'],
  오: ['병', '기', '정'],
  미: ['정', '을', '기'],
  신: ['무', '임', '경'],
  유: ['경', '신'],
  술: ['신', '정', '무'],
  해: ['무', '갑', '임'],
};

// 五虎遁(오호둔) — 연간으로 월간을 구하는 표. 각 행은 인월부터 축월까지의 월간.
// 갑/기년 → 병인부터, 을/경년 → 무인부터, 병/신년 → 경인부터,
// 정/임년 → 임인부터, 무/계년 → 갑인부터.
// 인(2)부터 시작해 12지지 순서. 인=index 0, 묘=index 1, ..., 축=index 11.
export const WOLGUN_START_BY_NYEONGAN_GROUP: Record<number, number> = {
  // 천간 index → 인월의 천간 index
  0: 2, // 갑 → 병인
  5: 2, // 기 → 병인
  1: 4, // 을 → 무인
  6: 4, // 경 → 무인
  2: 6, // 병 → 경인
  7: 6, // 신 → 경인
  3: 8, // 정 → 임인
  8: 8, // 임 → 임인
  4: 0, // 무 → 갑인
  9: 0, // 계 → 갑인
};

// 五鼠遁(오서둔) — 일간으로 자시 시간을 구하는 표.
// 갑/기일 → 갑자, 을/경일 → 병자, 병/신일 → 무자, 정/임일 → 경자, 무/계일 → 임자.
export const SIGAN_START_BY_ILGAN: Record<number, number> = {
  0: 0, // 갑 → 갑자
  5: 0, // 기 → 갑자
  1: 2, // 을 → 병자
  6: 2, // 경 → 병자
  2: 4, // 병 → 무자
  7: 4, // 신 → 무자
  3: 6, // 정 → 경자
  8: 6, // 임 → 경자
  4: 8, // 무 → 임자
  9: 8, // 계 → 임자
};

// 절기 (12 monthly solar terms used for 월주 boundary). Solar longitudes in degrees.
// 입춘=315° → 인월 시작 등.
// SOLAR_TERMS[i] = { name, longitude, monthJijiIdx }
export const MONTHLY_SOLAR_TERMS = [
  { name: '입춘', longitude: 315, jijiIdx: 2 }, // 인
  { name: '경칩', longitude: 345, jijiIdx: 3 }, // 묘
  { name: '청명', longitude: 15, jijiIdx: 4 }, // 진
  { name: '입하', longitude: 45, jijiIdx: 5 }, // 사
  { name: '망종', longitude: 75, jijiIdx: 6 }, // 오
  { name: '소서', longitude: 105, jijiIdx: 7 }, // 미
  { name: '입추', longitude: 135, jijiIdx: 8 }, // 신
  { name: '백로', longitude: 165, jijiIdx: 9 }, // 유
  { name: '한로', longitude: 195, jijiIdx: 10 }, // 술
  { name: '입동', longitude: 225, jijiIdx: 11 }, // 해
  { name: '대설', longitude: 255, jijiIdx: 0 }, // 자
  { name: '소한', longitude: 285, jijiIdx: 1 }, // 축
] as const;

// 일간별 천을귀인 두 지지 인덱스
export const CHEONEUL_GWIIN: Record<number, [number, number]> = {
  0: [1, 7], // 갑 → 축, 미
  4: [1, 7], // 무 → 축, 미
  6: [1, 7], // 경 → 축, 미
  1: [0, 8], // 을 → 자, 신
  5: [0, 8], // 기 → 자, 신
  2: [9, 11], // 병 → 유, 해
  3: [9, 11], // 정 → 유, 해
  7: [2, 6], // 신 → 인, 오
  8: [3, 5], // 임 → 묘, 사
  9: [3, 5], // 계 → 묘, 사
};

// 일간별 양인살 지지 인덱스 (양 일간만 적용; 음 일간은 별도)
export const YANGIN: Record<number, number> = {
  0: 3, // 갑 → 묘
  2: 6, // 병 → 오
  4: 6, // 무 → 오
  6: 9, // 경 → 유
  8: 0, // 임 → 자
};

// 일지 기준 도화/역마/화개. 삼합 그룹 단위.
// 인오술 → 도화 묘, 역마 신, 화개 술
// 사유축 → 도화 오, 역마 해, 화개 축
// 신자진 → 도화 유, 역마 인, 화개 진
// 해묘미 → 도화 자, 역마 사, 화개 미
export const SAMHAP_GROUPS: ReadonlyArray<{
  members: readonly number[];
  dohwa: number;
  yeokma: number;
  hwagae: number;
}> = [
  { members: [2, 6, 10], dohwa: 3, yeokma: 8, hwagae: 10 }, // 인오술
  { members: [5, 9, 1], dohwa: 6, yeokma: 11, hwagae: 1 }, // 사유축
  { members: [8, 0, 4], dohwa: 9, yeokma: 2, hwagae: 4 }, // 신자진
  { members: [11, 3, 7], dohwa: 0, yeokma: 5, hwagae: 7 }, // 해묘미
];

// 백호살 (특정 일주)
export const BAEKHO_PILLARS: Array<[number, number]> = [
  [0, 4], // 갑진
  [1, 7], // 을미
  [2, 10], // 병술
  [3, 1], // 정축
  [4, 4], // 무진
  [8, 10], // 임술
  [9, 1], // 계축
];

// 괴강살
export const GWIGANG_PILLARS: Array<[number, number]> = [
  [6, 4], // 경진
  [6, 10], // 경술
  [8, 4], // 임진
  [8, 10], // 임술
  [4, 10], // 무술
];

// 60갑자 공망 (일주 갑자순중 비어있는 두 지지). Index by 일주 60갑자 index.
// 갑자 순중 (0-9): 공망 술, 해
// 갑술 순중 (10-19): 공망 신, 유
// 갑신 순중 (20-29): 공망 오, 미
// 갑오 순중 (30-39): 공망 진, 사
// 갑진 순중 (40-49): 공망 인, 묘
// 갑인 순중 (50-59): 공망 자, 축
export function gongmangForGapja(gapjaIdx: number): [number, number] {
  const seoun = Math.floor(gapjaIdx / 10);
  const map: Array<[number, number]> = [
    [10, 11], // 갑자순 공망 술, 해
    [8, 9], // 갑술순 공망 신, 유
    [6, 7], // 갑신순 공망 오, 미
    [4, 5], // 갑오순 공망 진, 사
    [2, 3], // 갑진순 공망 인, 묘
    [0, 1], // 갑인순 공망 자, 축
  ];
  return map[seoun];
}
