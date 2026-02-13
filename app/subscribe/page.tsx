"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown } from "lucide-react";

export default function SubscribePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user already subscribed
    const subscriptionStatus = localStorage.getItem("subscriptionStatus");
    if (subscriptionStatus === "active") {
      router.push("/");
    }
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

      // Store subscription status
      localStorage.setItem("subscriptionStatus", "active");
      localStorage.setItem("subscriptionPlan", plan);
      localStorage.setItem("subscriptionDate", new Date().toISOString());

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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500/20 rounded-full mb-4">
            <Crown className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Unlock Your Potential</h1>
          <p className="text-gray-400">
            Your personalized plan is ready. Subscribe to get started. 3 days free, then £2.99/month.
          </p>
        </div>

        {/* Plan Selector */}
        <div className="flex gap-2 mb-6 p-1 bg-gray-900 rounded-xl">
          <button
            onClick={() => setSelectedPlan("monthly")}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              selectedPlan === "monthly"
                ? "bg-orange-500 text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSelectedPlan("yearly")}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              selectedPlan === "yearly"
                ? "bg-orange-500 text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Yearly
          </button>
        </div>

        {/* Pricing Card */}
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-2 border-orange-500/50 rounded-2xl p-6 mb-6">
          <div className="text-center mb-4">
            <p className="text-orange-400 font-semibold text-sm mb-1">{plans[selectedPlan].trial}</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-bold">{plans[selectedPlan].price}</span>
              <span className="text-gray-400 text-lg">
                {selectedPlan === "monthly" ? "/mo" : "/yr"}
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-2">{plans[selectedPlan].period}</p>
            {plans[selectedPlan].savings && (
              <span className="inline-block mt-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                {plans[selectedPlan].savings}
              </span>
            )}
          </div>

          <button
            onClick={() => handleSubscribe(selectedPlan)}
            disabled={loading}
            className="w-full py-4 bg-orange-500 text-black rounded-xl font-bold text-lg hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Subscribe Now"}
          </button>
        </div>

        {/* Features List */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">What&apos;s Included:</h2>
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Terms */}
        <p className="text-xs text-gray-500 text-center">
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Cancel anytime. Price may vary by region on App Store.
        </p>
      </div>
    </div>
  );
}

