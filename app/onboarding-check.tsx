"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Only run in browser (localStorage exists)
    if (typeof window === "undefined") return;

    // Skip check for onboarding and subscribe pages
    if (pathname === "/onboarding" || pathname === "/subscribe") {
      setIsChecking(false);
      return;
    }

    // IMPORTANT: Check subscription first - if subscribed, grant access immediately
    const subscriptionStatus = localStorage.getItem("subscriptionStatus");
    if (subscriptionStatus === "active") {
      setIsChecking(false);
      return;
    }

    // If not subscribed, check if onboarding is completed
    const onboardingCompleted = localStorage.getItem("onboardingCompleted");
    if (!onboardingCompleted) {
      router.push("/onboarding");
      return;
    }

    // Onboarding completed but not subscribed - redirect to subscription
    router.push("/subscribe");
  }, [pathname, router]);

  // Fallback: stop showing loading after 2s in case something gets stuck
  useEffect(() => {
    const t = setTimeout(() => setIsChecking(false), 2000);
    return () => clearTimeout(t);
  }, []);

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

