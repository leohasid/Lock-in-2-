"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Skip check for onboarding and subscribe pages
    if (pathname === "/onboarding" || pathname === "/subscribe") {
      // Use setTimeout to avoid setState in effect
      setTimeout(() => setIsChecking(false), 0);
      return;
    }

    // IMPORTANT: Check subscription first - if subscribed, grant access immediately
    // (they've already completed onboarding, so skip it)
    const subscriptionStatus = localStorage.getItem("subscriptionStatus");
    if (subscriptionStatus === "active") {
      setTimeout(() => setIsChecking(false), 0);
      return;
    }

    // If not subscribed, check if onboarding is completed
    const onboardingCompleted = localStorage.getItem("onboardingCompleted");
    if (!onboardingCompleted) {
      // New user - redirect to onboarding questions
      router.push("/onboarding");
      return;
    }

    // Onboarding completed but not subscribed - redirect to subscription
    router.push("/subscribe");
  }, [pathname, router]);

  // Show loading state while checking
  if (isChecking && pathname !== "/onboarding" && pathname !== "/subscribe") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

