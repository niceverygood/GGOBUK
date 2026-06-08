// 네이티브 인앱결제(IAP) 상품 ID ↔ 꼬북알 패키지 매핑.
//
// App Store Connect · Google Play Console · RevenueCat 세 곳에 아래 product id 를
// "정확히 동일하게" 소비성(consumable) 상품으로 생성해야 한다.
//
// ⚠️ 지급되는 꼬북알 수는 결제 "가격"이 아니라 "product id"로 결정된다.
//    스토어 가격은 국가·환율·티어로 달라질 수 있지만, 지급 알 수는 여기 매핑이
//    유일한 기준이다(서버 웹훅이 이 매핑으로 addCredits 한다).

import {
  creditPackageById,
  totalCredits,
  type CreditPackageId,
  type FirstDealId,
} from '@/lib/credits';

export type IapPackageId = CreditPackageId | FirstDealId;

/** 꼬북알 패키지 → 스토어/RevenueCat product id (소비성 consumable). */
export const IAP_PRODUCT_IDS: Record<IapPackageId, string> = {
  firstdeal: 'ggobuk.credits.firstdeal',
  mini: 'ggobuk.credits.mini',
  entry: 'ggobuk.credits.entry',
  focus: 'ggobuk.credits.focus',
  deep: 'ggobuk.credits.deep',
  master: 'ggobuk.credits.master',
};

/** 역매핑: product id → 패키지 id. 웹훅에서 지급 알 수 계산에 사용. */
export const PACKAGE_ID_BY_PRODUCT: Record<string, IapPackageId> =
  Object.fromEntries(
    Object.entries(IAP_PRODUCT_IDS).map(([pkg, productId]) => [
      productId,
      pkg as IapPackageId,
    ]),
  ) as Record<string, IapPackageId>;

export interface IapGrant {
  packageId: IapPackageId;
  /** 지급할 총 꼬북알 (credits + bonus 합산). */
  totalCredits: number;
  priceKrw: number;
  label: string;
}

/** product id 로부터 지급해야 할 꼬북알 정보 조회. 모르는 id 면 null. */
export function iapGrantForProduct(productId: string): IapGrant | null {
  const packageId = PACKAGE_ID_BY_PRODUCT[productId];
  if (!packageId) return null;
  const pkg = creditPackageById(packageId);
  if (!pkg) return null;
  return {
    packageId,
    totalCredits: totalCredits(pkg),
    priceKrw: pkg.priceKrw,
    label: pkg.label,
  };
}
