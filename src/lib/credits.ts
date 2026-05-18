export type CreditPackageId = 'starter' | 'focus' | 'plus' | 'deep' | 'master';

export interface CreditPackage {
  id: CreditPackageId;
  label: string;
  credits: number;
  bonusCredits: number;
  priceKrw: number;
  caption: string;
  badge?: string;
  perks: string[];
  recommended?: boolean;
  bestValue?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    label: '입문알 한 줌',
    credits: 12,
    bonusCredits: 0,
    priceKrw: 4900,
    caption: '가볍게 맛보고 싶을 때',
    badge: '첫 충전',
    perks: ['정밀 리포트 6개', '또는 궁합 3회'],
  },
  {
    id: 'focus',
    label: '정밀풀이 알주머니',
    credits: 36,
    bonusCredits: 6,
    priceKrw: 12900,
    caption: '사주·궁합·채팅을 같이 볼 때',
    badge: '인기',
    perks: ['정밀 리포트 21개', '부적 8장까지 가능'],
    recommended: true,
  },
  {
    id: 'deep',
    label: '꼬북도사 금고',
    credits: 90,
    bonusCredits: 30,
    priceKrw: 29900,
    caption: '깊게 자주 보는 유저용',
    badge: '효율',
    perks: ['궁합 30회', 'AI 부적 24장까지 가능'],
    bestValue: true,
  },
  {
    id: 'master',
    label: '운세 마스터 상자',
    credits: 180,
    bonusCredits: 80,
    priceKrw: 59000,
    caption: '친구·가족까지 함께 볼 때',
    badge: '최대 보너스',
    perks: ['보너스 80알 포함', '대운·궁합·부적 넉넉히'],
  },
];

export const CREDIT_UNIT = '꼬북알';

export const CREDIT_COSTS = {
  chat: 1,
  interpretation: 2,
  compatibility: 4,
  daewoon: 2,
  auspicious: 3,
  talisman: 5,
} as const;

export function creditPackageById(id: string): CreditPackage | undefined {
  if (id === 'plus') return CREDIT_PACKAGES.find((pkg) => pkg.id === 'focus');
  return CREDIT_PACKAGES.find((pkg) => pkg.id === id);
}

export function totalCredits(pkg: CreditPackage): number {
  return pkg.credits + pkg.bonusCredits;
}

export function formatKrw(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}
