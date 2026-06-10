'use client';
// 전역 CdvPurchase 타입은 src/types/cdv-purchase.d.ts 가 연결한다.

// 네이티브 인앱결제 — 직접 구현(cordova-plugin-purchase). 외부 결제 SaaS 미사용.
//
// 흐름: order() → 스토어 결제창 → approved 이벤트 → 우리 서버에 영수증 검증
// (/api/payment/iap/verify: 구글 Play Developer API / 애플 verifyReceipt) →
// 서버가 멱등하게 꼬북알 지급 → 성공 시 finish()(소비 처리) → UI resolve.
//
// 클라이언트는 잔액을 직접 올리지 않는다 — 서버 검증을 통과해야만 지급(위변조 방지).
// 검증 실패 시 finish()하지 않으므로 미소비 구매로 남아 다음 init 때 approved 가
// 다시 발화해 재시도된다(지급은 서버 멱등 lock 으로 1회 보장).
//
// 플러그인 JS 는 Capacitor 가 네이티브에서 주입한다(window.CdvPurchase). 웹에선
// 존재하지 않으므로 모든 진입점이 no-op 이다.

import { isNativeApp, isNativeIOS } from '@/lib/utils/platform';
import { IAP_PRODUCT_IDS, type IapPackageId } from './products';

type Cdv = typeof CdvPurchase;

function cdv(): Cdv | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { CdvPurchase?: Cdv }).CdvPurchase ?? null;
}

let initialized = false;
let initializing: Promise<boolean> | null = null;

export type PurchaseResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

// 진행 중 구매의 resolver. UI 가 동시에 여러 결제를 못 열므로 productId당 1건.
const pendingByProduct = new Map<string, (r: PurchaseResult) => void>();

function settle(tx: CdvPurchase.Transaction, result: PurchaseResult) {
  for (const p of tx.products) {
    const resolve = pendingByProduct.get(p.id);
    if (resolve) {
      pendingByProduct.delete(p.id);
      resolve(result);
    }
  }
}

/** 스토어 영수증을 우리 서버로 보내 검증+지급. 성공 여부만 반환. */
async function verifyOnServer(tx: CdvPurchase.Transaction): Promise<boolean> {
  const CP = cdv();
  if (!CP) return false;
  const productId = tx.products[0]?.id ?? '';
  let body: Record<string, unknown>;
  if (tx.platform === CP.Platform.GOOGLE_PLAY) {
    const receipt = tx.parentReceipt as CdvPurchase.GooglePlay.Receipt;
    body = {
      platform: 'google',
      productId,
      purchaseToken: receipt.purchaseToken,
      orderId: tx.transactionId,
    };
  } else {
    const appReceipt = (
      tx.parentReceipt as CdvPurchase.AppleAppStore.SKApplicationReceipt
    ).nativeData?.appStoreReceipt;
    body = {
      platform: 'apple',
      productId,
      transactionId: tx.transactionId,
      receipt: appReceipt,
    };
  }
  const res = await fetch('/api/payment/iap/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.ok;
}

async function handleApproved(tx: CdvPurchase.Transaction) {
  try {
    const ok = await verifyOnServer(tx);
    if (ok) {
      // finished 이벤트에서 settle(success). 소비(consume) 처리까지 플러그인이 수행.
      await tx.finish();
    } else {
      settle(tx, { status: 'error', message: 'verify_failed' });
    }
  } catch {
    settle(tx, { status: 'error', message: 'verify_network' });
  }
}

/**
 * 네이티브에서만 스토어 초기화. 로그인 사용자 진입 시 1회 호출.
 * @returns 초기화 성공 여부 (웹이거나 플러그인 없으면 false)
 */
export async function configurePurchases(appUserId: string): Promise<boolean> {
  if (!isNativeApp()) return false;
  const CP = cdv();
  if (!CP) return false;
  if (initialized) return true;
  if (initializing) return initializing;

  initializing = (async () => {
    try {
      const { store, ProductType, Platform, LogLevel } = CP;
      const platform = isNativeIOS()
        ? Platform.APPLE_APPSTORE
        : Platform.GOOGLE_PLAY;
      store.verbosity = LogLevel.WARNING;
      store.applicationUsername = appUserId;
      store.register(
        Object.values(IAP_PRODUCT_IDS).map((id) => ({
          id,
          type: ProductType.CONSUMABLE,
          platform,
        })),
      );
      store
        .when()
        .approved((tx) => {
          void handleApproved(tx);
        })
        .finished((tx) => {
          settle(tx, { status: 'success' });
        });
      await store.initialize([platform]);
      initialized = true;
      return true;
    } catch {
      initializing = null;
      return false;
    }
  })();
  return initializing;
}

export interface NativeProduct {
  packageId: IapPackageId;
  productId: string;
  /** 스토어 현지 통화 표기 (예: "₩12,900"). UI 가격 표시에 사용. */
  priceString: string;
}

/** 스토어에서 전체 꼬북알 상품의 현지 가격을 조회. 네이티브 결제 UI 렌더용. */
export async function getNativeProducts(): Promise<NativeProduct[]> {
  const CP = cdv();
  if (!CP || !initialized) return [];
  await CP.store.update();
  const out: NativeProduct[] = [];
  for (const [pkg, productId] of Object.entries(IAP_PRODUCT_IDS)) {
    const price = CP.store.get(productId)?.pricing?.price;
    if (price) {
      out.push({ packageId: pkg as IapPackageId, productId, priceString: price });
    }
  }
  return out;
}

/**
 * 소비성 꼬북알 구매. resolve 시점은 "서버 검증+지급까지 완료" 후라서,
 * 호출부는 success 를 받으면 잔액 refetch 만 하면 된다.
 */
export async function purchaseCredits(
  packageId: IapPackageId,
): Promise<PurchaseResult> {
  const CP = cdv();
  if (!CP || !initialized) return { status: 'error', message: 'not_native' };
  const productId = IAP_PRODUCT_IDS[packageId];
  const offer = CP.store.get(productId)?.getOffer();
  if (!offer) return { status: 'error', message: 'product_not_found' };

  return new Promise<PurchaseResult>((resolve) => {
    pendingByProduct.set(productId, resolve);
    void CP.store.order(offer).then((err) => {
      if (err) {
        pendingByProduct.delete(productId);
        if (err.code === CP.ErrorCode.PAYMENT_CANCELLED) {
          resolve({ status: 'cancelled' });
        } else {
          resolve({ status: 'error', message: err.message ?? 'order_failed' });
        }
      }
    });
  });
}
