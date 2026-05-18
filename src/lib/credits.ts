export type CreditPackageId = 'starter' | 'plus' | 'deep';

export interface CreditPackage {
  id: CreditPackageId;
  label: string;
  credits: number;
  bonusCredits: number;
  priceKrw: number;
  caption: string;
  recommended?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    label: '가볍게 충전',
    credits: 10,
    bonusCredits: 0,
    priceKrw: 4900,
    caption: '궁금할 때 조금씩',
  },
  {
    id: 'plus',
    label: '넉넉한 충전',
    credits: 30,
    bonusCredits: 5,
    priceKrw: 12900,
    caption: '채팅과 궁합까지 여유롭게',
    recommended: true,
  },
  {
    id: 'deep',
    label: '깊게 보기',
    credits: 80,
    bonusCredits: 20,
    priceKrw: 29900,
    caption: '사주·궁합·길일을 자주 볼 때',
  },
];

export const CREDIT_COSTS = {
  chat: 1,
  interpretation: 2,
  compatibility: 4,
  daewoon: 2,
  auspicious: 3,
} as const;

export function creditPackageById(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === id);
}

export function totalCredits(pkg: CreditPackage): number {
  return pkg.credits + pkg.bonusCredits;
}

export function formatKrw(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}
