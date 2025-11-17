"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResetPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear all onboarding and subscription data
    localStorage.removeItem("onboardingData");
    localStorage.removeItem("onboardingCompleted");
    localStorage.removeItem("customGymPlan");
    localStorage.removeItem("customNutritionPlan");
    localStorage.removeItem("subscriptionStatus");
    localStorage.removeItem("subscriptionPlan");
    localStorage.removeItem("subscriptionDate");

    // Redirect to onboarding
    router.push("/onboarding");
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <p>Clearing data and redirecting to onboarding...</p>
      </div>
    </div>
  );
}

