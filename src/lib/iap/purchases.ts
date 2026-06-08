'use client';

// RevenueCat 클라이언트 래퍼 (네이티브 전용).
//
// 웹/카톡 인앱브라우저에서는 전부 no-op 이고, 결제는 기존 카카오페이 흐름을 쓴다.
// 네이티브(iOS Capacitor / Android Capacitor)에서만 RevenueCat SDK 가 동작한다.
//
// 핵심: configure 의 appUserID 를 반드시 우리 supabase user id 로 맞춘다.
// 그래야 결제 성공 시 RevenueCat 이 보내는 웹훅의 event.app_user_id 가 우리
// 사용자와 매칭되어 서버가 그 사용자에게 꼬북알을 지급할 수 있다.

import {
  Purchases,
  PRODUCT_CATEGORY,
  LOG_LEVEL,
  type PurchasesStoreProduct,
} from '@revenuecat/purchases-capacitor';
import { isNativeApp, isNativeIOS } from '@/lib/utils/platform';
import { IAP_PRODUCT_IDS, type IapPackageId } from './products';

let configured = false;

function apiKey(): string | null {
  // RevenueCat 의 "public SDK key" 는 플랫폼별로 다르다 (Apple appl_… / Google goog_…).
  if (isNativeIOS()) return process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? null;
  return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ?? null;
}

/**
 * 네이티브에서만 RevenueCat 초기화. 로그인 사용자 진입 시 1회 호출.
 * @returns 초기화 성공 여부 (웹이거나 키 없으면 false)
 */
export async function configurePurchases(appUserId: string): Promise<boolean> {
  if (!isNativeApp()) return false;
  const key = apiKey();
  if (!key) return false;
  if (configured) {
    // 이미 init 됐는데 사용자가 바뀐 경우(익명→로그인 등) 식별자 교체.
    await Purchases.logIn({ appUserID: appUserId });
    return true;
  }
  await Purchases.configure({ apiKey: key, appUserID: appUserId });
  await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
  configured = true;
  return true;
}

export interface NativeProduct {
  packageId: IapPackageId;
  productId: string;
  /** 스토어 현지 통화 표기 (예: "₩12,900"). UI 가격 표시에 사용. */
  priceString: string;
}

async function fetchStoreProducts(
  productIds: string[],
): Promise<PurchasesStoreProduct[]> {
  // 소비성 꼬북알은 NON_SUBSCRIPTION. (기본값 SUBSCRIPTION 이라 안드로이드에서
  // 명시 안 하면 상품을 못 찾는다. iOS 는 이 옵션 무시.)
  const { products } = await Purchases.getProducts({
    productIdentifiers: productIds,
    type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
  });
  return products;
}

/** 스토어에서 전체 꼬북알 상품의 현지 가격을 조회. 네이티브 결제 UI 렌더용. */
export async function getNativeProducts(): Promise<NativeProduct[]> {
  if (!isNativeApp()) return [];
  const products = await fetchStoreProducts(Object.values(IAP_PRODUCT_IDS));
  const byId = new Map(products.map((p) => [p.identifier, p]));
  const out: NativeProduct[] = [];
  for (const [pkg, productId] of Object.entries(IAP_PRODUCT_IDS)) {
    const product = byId.get(productId);
    if (product) {
      out.push({
        packageId: pkg as IapPackageId,
        productId,
        priceString: product.priceString,
      });
    }
  }
  return out;
}

export type PurchaseResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/**
 * 소비성 꼬북알 구매. 성공해도 클라이언트는 잔액을 직접 올리지 않는다 —
 * RevenueCat 이 서버 웹훅으로 통지하고, 웹훅이 addCredits 로 지급한다(위변조 방지).
 * 호출부는 success 후 잠시 뒤 잔액을 refetch 하면 된다.
 */
export async function purchaseCredits(
  packageId: IapPackageId,
): Promise<PurchaseResult> {
  if (!isNativeApp()) return { status: 'error', message: 'not_native' };
  const productId = IAP_PRODUCT_IDS[packageId];
  try {
    const products = await fetchStoreProducts([productId]);
    const product = products[0];
    if (!product) return { status: 'error', message: 'product_not_found' };
    await Purchases.purchaseStoreProduct({ product });
    return { status: 'success' };
  } catch (e) {
    const err = e as { userCancelled?: boolean; message?: string };
    if (err.userCancelled) return { status: 'cancelled' };
    return { status: 'error', message: err.message ?? 'purchase_failed' };
  }
}
