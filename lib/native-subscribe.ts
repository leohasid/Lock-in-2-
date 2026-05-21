/**
 * Mogifi iOS WebView injects window.MogifiNativeSubscribe (StoreKit 2).
 * In a normal browser, these helpers are unavailable — use dev mock only where explicitly allowed.
 */

export type NativeSubscribeResult = {
  ok?: boolean;
  plan?: string;
  active?: boolean;
};

export type NativeProductInfo = {
  id: string;
  displayPrice: string;
  displayName: string;
};

export type NativeProductsResult = {
  ok?: boolean;
  products?: NativeProductInfo[];
};

type MogifiNativeSubscribeAPI = {
  purchase: (plan: string) => Promise<NativeSubscribeResult>;
  restore?: () => Promise<NativeSubscribeResult>;
  sync?: () => Promise<NativeSubscribeResult>;
  getProducts?: () => Promise<NativeProductsResult>;
};

function getApi(): MogifiNativeSubscribeAPI | null {
  if (typeof window === "undefined") return null;
  const s = (window as unknown as { MogifiNativeSubscribe?: MogifiNativeSubscribeAPI }).MogifiNativeSubscribe;
  if (!s || typeof s.purchase !== "function") return null;
  return s;
}

export function isNativeIapAvailable(): boolean {
  return getApi() !== null;
}

export async function purchaseNative(plan: "monthly" | "yearly"): Promise<NativeSubscribeResult> {
  const s = getApi();
  if (!s) throw new Error("Native subscription is not available in this browser.");
  return s.purchase(plan);
}

export async function restoreNativePurchases(): Promise<NativeSubscribeResult> {
  const s = getApi();
  if (!s?.restore) throw new Error("Restore is not available in this browser.");
  return s.restore();
}

/** Syncs StoreKit entitlements into native UserDefaults (read by MogifiNativeStorage). */
export async function syncNativeSubscriptionState(): Promise<NativeSubscribeResult | null> {
  const s = getApi();
  if (!s?.sync) return null;
  return s.sync();
}

/** Fetches localized product info (price, name) from StoreKit for paywall display. */
export async function getProductsNative(): Promise<NativeProductsResult> {
  const s = getApi();
  if (!s?.getProducts) return { ok: false, products: [] };
  return s.getProducts();
}
