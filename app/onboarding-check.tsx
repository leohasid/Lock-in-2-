"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { get, migrateFromLocalStorage } from "@/lib/persistent-storage";

export default function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const isPublicRoute =
    pathname === "/onboarding" ||
    pathname === "/subscribe" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/sources" ||
    pathname === "/ai-data-use";

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isPublicRoute) {
      setIsChecking(false);
      return;
    }

    (async () => {
      await migrateFromLocalStorage();
      try {
        const { syncNativeSubscriptionState } = await import("@/lib/native-subscribe");
        await syncNativeSubscriptionState();
      } catch {
        /* non-iOS or sync unavailable */
      }

      const subscriptionStatus = await get("subscriptionStatus");
      if (subscriptionStatus === "active") {
        setIsChecking(false);
        return;
      }

      const onboardingCompleted = await get("onboardingCompleted");
      if (!onboardingCompleted) {
        router.push("/onboarding");
        return;
      }

      router.push("/subscribe");
    })();
  }, [isPublicRoute, pathname, router]);

  // Fallback: stop showing loading after 2s in case something gets stuck
  useEffect(() => {
    const t = setTimeout(() => setIsChecking(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // Show loading state while checking
  if (isChecking && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

