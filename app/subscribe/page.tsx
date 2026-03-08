"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown } from "lucide-react";

export default function SubscribePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { get } = await import("@/lib/persistent-storage");
      const subscriptionStatus = await get("subscriptionStatus");
      if (subscriptionStatus === "active") {
        router.push("/");
      }
    })();
  }, [router]);

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    setLoading(true);

    // TODO: Integrate with actual subscription service
    // For iOS: Use RevenueCat or native In-App Purchase
    // For Android: Use RevenueCat or Google Play Billing
    // For now, we'll simulate a successful subscription

    try {
      // Simulate API call to subscription service
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Store subscription status (persistent storage for iOS/native)
      const { set } = await import("@/lib/persistent-storage");
      await set("subscriptionStatus", "active");
      await set("subscriptionPlan", plan);
      await set("subscriptionDate", new Date().toISOString());

      // Redirect to main app
      router.push("/");
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Failed to process subscription. Please try again.");
      setLoading(false);
    }
  };

  const plans = {
    monthly: {
      price: "£2.99",
      period: "per month after free trial",
      trial: "3 days free",
      savings: null,
    },
    yearly: {
      price: "£29.99",
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
          <p className="text-blue-400/90 font-medium text-sm mt-2">3 days free, then £2.99/month</p>
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

        {/* Pricing Card */}
        <div className="relative overflow-hidden rounded-2xl mb-8 p-6 bg-gradient-to-br from-[#0c1929] via-[#0f1a2e] to-[#0a0f1a] border border-blue-500/30 shadow-xl shadow-blue-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 pointer-events-none" />
          <div className="relative">
            <div className="text-center mb-5">
              <span className="inline-block px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold mb-4">
                {plans[selectedPlan].trial}
              </span>
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
            </div>

            <button
              onClick={() => handleSubscribe(selectedPlan)}
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-cyan-500"
            >
              {loading ? "Processing..." : "Subscribe Now"}
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

        {/* Terms */}
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Cancel anytime. Price may vary by region on App Store.
        </p>
      </div>
    </div>
  );
}

