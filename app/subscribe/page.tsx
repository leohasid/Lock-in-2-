"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Crown } from "lucide-react";
import {
  isNativeIapAvailable,
  purchaseNative,
  restoreNativePurchases,
  syncNativeSubscriptionState,
  getProductsNative,
} from "@/lib/native-subscribe";


const MONTHLY_ID = "com.mogifiai.Mogifi_Ai.subscription.monthly";
const YEARLY_ID  = "com.mogifiai.Mogifi_Ai.subscription.yearly";

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name || "Error (no message)";
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export default function SubscribePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  // StoreKit dynamic pricing
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);
  const [yearlyPrice, setYearlyPrice] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsLoadFailed, setProductsLoadFailed] = useState(false);

  // Redirect already-subscribed users
  useEffect(() => {
    (async () => {
      try {
        const syncResult = await syncNativeSubscriptionState();
        if (syncResult?.active) { router.push("/"); return; }
      } catch {
        /* ignore */
      }
      const { get } = await import("@/lib/persistent-storage");
      const subscriptionStatus = await get("subscriptionStatus");
      if (subscriptionStatus === "active") {
        router.push("/");
      }
    })();
  }, [router]);

  // Fetch StoreKit product prices (iOS only)
  useEffect(() => {
    if (!isNativeIapAvailable()) return;
    setProductsLoading(true);
    getProductsNative()
      .then((result) => {
        if (result.ok && result.products?.length) {
          const mp = result.products.find((p) => p.id === MONTHLY_ID);
          const yp = result.products.find((p) => p.id === YEARLY_ID);
          console.log(
            "[Mogifi IAP] Products loaded:",
            result.products.map((p) => `${p.id} → ${p.displayPrice}`).join(", ")
          );
          if (!mp) console.warn("[Mogifi IAP] Missing product:", MONTHLY_ID);
          if (!yp) console.warn("[Mogifi IAP] Missing product:", YEARLY_ID);
          if (mp) setMonthlyPrice(mp.displayPrice);
          if (yp) setYearlyPrice(yp.displayPrice);
          if (!mp && !yp) setProductsLoadFailed(true);
        } else {
          console.warn("[Mogifi IAP] getProducts returned no products:", JSON.stringify(result));
          setProductsLoadFailed(true);
        }
      })
      .catch((err) => {
        console.error("[Mogifi IAP] getProducts error:", err);
        setProductsLoadFailed(true);
      })
      .finally(() => setProductsLoading(false));
  }, []);

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    setLoading(true);
    setSubscribeError(null);
    const productId = plan === "yearly" ? YEARLY_ID : MONTHLY_ID;
    console.log(`[Mogifi IAP] Purchase attempt: plan=${plan}, productId=${productId}`);

    try {
      if (isNativeIapAvailable()) {
        await purchaseNative(plan);
        // Purchase succeeded — write active status immediately so the subscription
        // gate always lets the user through on next launch, regardless of sync timing.
        const { set } = await import("@/lib/persistent-storage");
        await set("subscriptionStatus", "active");
        await set("subscriptionPlan", plan);
        await set("subscriptionDate", new Date().toISOString());
        // Kick off a background sync so native storage is also up to date.
        syncNativeSubscriptionState().catch(() => {});
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const { set } = await import("@/lib/persistent-storage");
        await set("subscriptionStatus", "active");
        await set("subscriptionPlan", plan);
        await set("subscriptionDate", new Date().toISOString());
      }

      router.push("/");
    } catch (error) {
      console.error("[Mogifi IAP] Purchase error:", error);
      const msg = formatUnknownError(error);
      if (msg.toLowerCase().includes("cancel")) return;
      let detail = msg;
      if (
        /not available|couldn.?t find|invalid product|no products|storekit|product/i.test(msg) &&
        !/app store connect|sandbox|xcode|storekit file/i.test(msg)
      ) {
        detail +=
          " If this persists: check App Store Connect (product ID match, complete metadata) and a Sandbox test account on device.";
      }
      setSubscribeError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!isNativeIapAvailable()) {
      alert("Restore purchases is only available in the Mogifi iOS app.");
      return;
    }
    console.log("[Mogifi IAP] Restore purchases initiated");
    setRestoring(true);
    try {
      await restoreNativePurchases();
      const { get } = await import("@/lib/persistent-storage");
      const subscriptionStatus = await get("subscriptionStatus");
      if (subscriptionStatus === "active") {
        console.log("[Mogifi IAP] Restore succeeded");
        router.push("/");
      } else {
        console.warn("[Mogifi IAP] Restore: no active subscription found");
        alert("No active subscription found for this Apple ID.");
      }
    } catch (error) {
      console.error("[Mogifi IAP] Restore error:", error);
      const msg = error instanceof Error ? error.message : "Restore failed.";
      alert(msg);
    } finally {
      setRestoring(false);
    }
  };

  // Use StoreKit prices when available, fall back to hardcoded
  const displayMonthly = monthlyPrice ?? "£2.99";
  const displayYearly  = yearlyPrice  ?? "£29.99";

  const plans = {
    monthly: {
      price: displayMonthly,
      period: "per month after free trial",
      trial: "3 days free",
      savings: null,
    },
    yearly: {
      price: displayYearly,
      period: "per year",
      trial: "3 days free",
      savings: "Save 17%",
    },
  };

  const features = [
    "Custom workout plan tailored to your goals",
    "Personalized nutrition plan with macros",
    "AI-powered fitness consultation",
    "Food scanning and calorie tracking",
    "Addiction tracking and phone usage monitoring",
    "Progress tracking and analytics",
    "Unlimited workout plan modifications",
  ];

  const subscribeDisabled = loading || productsLoading;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-6 bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/25">
            <Crown className="w-12 h-12 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            Unlock Your Potential
          </h1>
          <p className="text-gray-400 text-base leading-relaxed max-w-sm mx-auto">
            Your personalized plan is ready. Subscribe to get started.
          </p>
          <p className="text-blue-400/90 font-medium text-sm mt-2">
            3 days free, then {displayMonthly}/month
          </p>
        </div>

        {/* Plan Selector */}
        <div className="flex gap-2 mb-6 p-1.5 bg-[#0f1419] border border-[#1f2937] rounded-xl">
          <button
            onClick={() => setSelectedPlan("monthly")}
            className={`flex-1 py-3.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
              selectedPlan === "monthly"
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSelectedPlan("yearly")}
            className={`flex-1 py-3.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
              selectedPlan === "yearly"
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Yearly
          </button>
        </div>

        {/* Products failed to load (iOS only) */}
        {productsLoadFailed && isNativeIapAvailable() && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs text-gray-400"
          >
            Showing offline prices. Tap Subscribe Now to continue — prices are confirmed before payment.
          </div>
        )}

        {subscribeError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-400/50 bg-red-950/80 p-4 text-left text-sm text-red-100"
          >
            <p className="font-semibold text-red-200 mb-1">Subscription didn&apos;t finish</p>
            <p className="whitespace-pre-wrap break-words text-red-100/95">{subscribeError}</p>
            <button
              type="button"
              onClick={() => setSubscribeError(null)}
              className="mt-3 text-xs font-bold text-red-300 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Pricing Card */}
        <div className="relative overflow-hidden rounded-2xl mb-8 p-6 bg-gradient-to-br from-[#0c1929] via-[#0f1a2e] to-[#0a0f1a] border border-blue-500/30 shadow-xl shadow-blue-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 pointer-events-none" />
          <div className="relative">
            <div className="text-center mb-5">
              <span className="inline-block px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold mb-4">
                {plans[selectedPlan].trial}
              </span>
              {productsLoading ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-gray-500 text-sm">Loading prices…</p>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-white">{plans[selectedPlan].price}</span>
                    <span className="text-gray-400 text-lg">
                      {selectedPlan === "monthly" ? "/mo" : "/yr"}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-2">{plans[selectedPlan].period}</p>
                  {plans[selectedPlan].savings && (
                    <span className="inline-block mt-3 px-4 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-semibold">
                      {plans[selectedPlan].savings}
                    </span>
                  )}
                </>
              )}
            </div>

            <button
              onClick={() => handleSubscribe(selectedPlan)}
              disabled={subscribeDisabled}
              className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-cyan-500"
            >
              {productsLoading ? "Loading…" : loading ? "Processing..." : "Subscribe Now"}
            </button>
          </div>
        </div>

        {/* Features List */}
        <div className="rounded-2xl p-6 mb-6 bg-[#0f1419] border border-[#1f2937]">
          <h2 className="text-lg font-semibold mb-4 text-white">What&apos;s Included</h2>
          <ul className="space-y-3.5">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-400" strokeWidth={3} />
                </div>
                <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {isNativeIapAvailable() && (
          <button
            type="button"
            onClick={handleRestore}
            disabled={restoring || loading}
            className="w-full mb-4 py-3 text-sm font-semibold text-blue-300/90 hover:text-blue-200 disabled:opacity-50 transition-colors"
          >
            {restoring ? "Restoring…" : "Restore purchases"}
          </button>
        )}

        {/* Subscription legal info - required by Apple guideline 3.1.2(c) */}
        <div className="space-y-3 text-center">
          <p className="text-xs text-gray-400 leading-relaxed">
            <span className="font-semibold text-white">Mogifi AI Pro</span> — auto-renewable subscription.
            Monthly: {displayMonthly}/month · Yearly: {displayYearly}/year. Includes 3-day free trial.
            Payment charged to your Apple ID at confirmation. Renews automatically unless cancelled
            at least 24 hours before the end of the current period. Manage or cancel in App Store
            account settings. Price may vary by region.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            By subscribing you agree to our{" "}
            <Link href="/terms" className="text-blue-400 underline underline-offset-2">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-blue-400 underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
