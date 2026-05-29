"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  isNativeIapAvailable,
  purchaseNative,
  restoreNativePurchases,
  syncNativeSubscriptionState,
  getProductsNative,
} from "@/lib/native-subscribe";
import { useRequestAIConsent } from "@/components/AIConsentProvider";
import MedicalWellnessDisclaimer from "@/components/MedicalWellnessDisclaimer";

type FitnessGoal = "lose_weight" | "gain_weight" | "build_muscle";
type Equipment = "full_gym" | "home_gym" | "minimal" | "bodyweight_only";
type Aggressiveness = "moderate" | "aggressive" | "very_aggressive";
type AddictionType = "phone" | "vape" | "alcohol" | "other";
type Gender = "male" | "female";

interface AIExercise {
  name: string;
  sets: number;
  reps: string | number;
  rest?: string;
  notes?: string;
}

interface AIWorkoutDay {
  day: string;
  workoutName: string;
  exercises: AIExercise[];
}

interface AIGymPlan {
  planName: string;
  weeklySchedule: AIWorkoutDay[];
  duration: string;
  notes: string;
}

interface OnboardingData {
  fitnessGoal: FitnessGoal | null;
  equipment: Equipment | null;
  height: number | null; // in cm
  age: number | null;
  weight: number | null; // in kg
  aggressiveness: Aggressiveness | null;
  gender: Gender | null;
  workoutExtraNotes: string;
  // AI Plans
  wantsAIWorkoutPlan: boolean | null;
  wantsMacrosPlan: boolean | null;
  // Addiction tracking
  wantsToTrackAddictions: boolean | null;
  selectedAddictions: AddictionType[];
  phoneDailyLimit: number | null; // in hours
  vapeWeeklySpend: number | null;
  alcoholWeeklySpend: number | null;
  otherWeeklySpend: number | null;
  addictionStartDate: string | null; // ISO date string
}

export default function OnboardingPage() {
  const requestAIConsent = useRequestAIConsent();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [selectedModalPlan, setSelectedModalPlan] = useState<"monthly" | "yearly">("monthly");
  const [modalMonthlyPrice, setModalMonthlyPrice] = useState<string | null>(null);
  const [modalYearlyPrice, setModalYearlyPrice] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [planGenerationPhase, setPlanGenerationPhase] = useState<
    "idle" | "progress" | "subscribe_gate" | "generating"
  >("idle");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    fitnessGoal: null,
    equipment: null,
    height: null,
    age: null,
    weight: null,
    aggressiveness: null,
    gender: null,
    workoutExtraNotes: "",
    wantsAIWorkoutPlan: null,
    wantsMacrosPlan: null,
    wantsToTrackAddictions: null,
    selectedAddictions: [],
    phoneDailyLimit: null,
    vapeWeeklySpend: null,
    alcoholWeeklySpend: null,
    otherWeeklySpend: null,
    addictionStartDate: null,
  });

  // Redirect if user is already subscribed (they shouldn't see onboarding)
  useEffect(() => {
    (async () => {
      try {
        await syncNativeSubscriptionState();
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

  // Fetch StoreKit prices for subscribe modal (iOS only)
  useEffect(() => {
    if (!isNativeIapAvailable()) return;
    getProductsNative().then((result) => {
      const mp = result.products?.find((p) => p.id === "com.mogifiai.Mogifi_Ai.subscription.monthly");
      const yp = result.products?.find((p) => p.id === "com.mogifiai.Mogifi_Ai.subscription.yearly");
      if (mp) setModalMonthlyPrice(mp.displayPrice);
      if (yp) setModalYearlyPrice(yp.displayPrice);
    }).catch(() => { /* fallback to hardcoded */ });
  }, []);

  const getStepInfo = (currentStep: number) => {
    if (currentStep <= 6) {
      return { step: currentStep, isLast: false };
    }
    
    if (currentStep === 7) {
      return { step: currentStep, isLast: false };
    }
    
    if (currentStep === 8) {
      return { step: currentStep, isLast: false };
    }

    if (currentStep === 9) {
      return { step: currentStep, isLast: false };
    }

    if (currentStep === 10) {
      if (data.wantsToTrackAddictions === null) {
        return { step: currentStep, isLast: false };
      }
      if (data.wantsToTrackAddictions === false) {
        return { step: currentStep, isLast: true };
      }
      return { step: currentStep, isLast: false };
    }
    
    if (currentStep === 11) {
      if (data.wantsToTrackAddictions === false) {
        return { step: currentStep, isLast: true };
      }
      return { step: currentStep, isLast: false };
    }
    
    if (currentStep === 12) {
      return { step: currentStep, isLast: false };
    }
    
    if (currentStep === 13) {
      if (!data.selectedAddictions.includes("phone")) {
        return getStepInfo(14);
      }
      const hasSpendStep = data.selectedAddictions.some((a) =>
        ["vape", "alcohol", "other"].includes(a)
      );
      return { step: currentStep, isLast: !hasSpendStep && !data.addictionStartDate };
    }
    
    if (currentStep === 14) {
      if (!data.selectedAddictions.some((a) => ["vape", "alcohol", "other"].includes(a))) {
        return getStepInfo(15);
      }
      return { step: currentStep, isLast: !data.addictionStartDate };
    }
    
    if (currentStep === 15) {
      return { step: currentStep, isLast: true };
    }
    
    return { step: currentStep, isLast: false };
  };

  /** Max onboarding step index (1-based); progress bar denominator */
  const getTotalSteps = () => 15;

  const handleNext = () => {
    const stepInfo = getStepInfo(step);
    
    if (stepInfo.isLast) {
      handleSubmit();
      return;
    }

    if (step === 7 && data.wantsAIWorkoutPlan === false) {
      setStep(10);
      return;
    }

      let nextStep = step + 1;
    while (nextStep <= 15) {
        const nextStepInfo = getStepInfo(nextStep);
        if (nextStepInfo.step === nextStep) {
          setStep(nextStep);
          return;
        }
        nextStep++;
      }
      handleSubmit();
  };

  const handleBack = () => {
    if (step <= 1) return;
    if (step === 10 && data.wantsAIWorkoutPlan !== true) {
      setStep(7);
      return;
    }
    setStep(step - 1);
  };

  /** Runs after subscription — calls AI then saves gym + nutrition + workoutPlan */
  const generateAndPersistPlans = useCallback(async () => {
    let gymPlan: AIGymPlan | null = null;
    let nutritionPlan: Record<string, unknown> | null = null;

    if (data.wantsAIWorkoutPlan || data.wantsMacrosPlan) {
      await requestAIConsent(async () => {
        try {
          const response = await fetch("/api/generate-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fitnessGoal: data.fitnessGoal,
              equipment: data.equipment,
              height: data.height,
              age: data.age,
              weight: data.weight,
              aggressiveness: data.aggressiveness,
              gender: data.gender,
              workoutExtraNotes: data.workoutExtraNotes?.trim() || undefined,
              wantsAIWorkoutPlan: data.wantsAIWorkoutPlan,
              wantsMacrosPlan: data.wantsMacrosPlan,
            }),
          });

          if (response.ok) {
            const planData = await response.json();
            gymPlan = planData.gymPlan;
            nutritionPlan = planData.nutritionPlan;
          } else {
            console.error("Failed to generate AI plan, using placeholder");
          }
        } catch (error) {
          console.error("Error generating AI plan:", error);
        }
      });
    }

      if (!gymPlan) {
        gymPlan = {
          planName: "Custom Workout Plan",
          weeklySchedule: [],
          duration: "12 weeks",
          notes: data.wantsAIWorkoutPlan 
          ? "Your personalized workout plan will load here."
          : "Create your own workout plan in the gym section.",
        };
      }

      if (!nutritionPlan) {
        let calculatedCalories = 2000;
        let calculatedProtein = 150;
        let calculatedCarbs = 200;
        let calculatedFats = 65;

        if (data.weight && data.height && data.age) {
        const bmrConst = data.gender === "female" ? -161 : 5;
        const bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + bmrConst;
          
        let activityMultiplier = 1.4;
          if (data.aggressiveness === "aggressive") activityMultiplier = 1.6;
          if (data.aggressiveness === "very_aggressive") activityMultiplier = 1.8;

          if (data.fitnessGoal === "lose_weight") {
            calculatedCalories = Math.round(bmr * activityMultiplier - 500);
          calculatedProtein = Math.round(data.weight * 2.2);
          calculatedCarbs = Math.round(calculatedCalories * 0.35 / 4);
          calculatedFats = Math.round(calculatedCalories * 0.25 / 9);
          } else if (data.fitnessGoal === "gain_weight") {
            calculatedCalories = Math.round(bmr * activityMultiplier + 500);
            calculatedProtein = Math.round(data.weight * 2.2);
          calculatedCarbs = Math.round(calculatedCalories * 0.45 / 4);
          calculatedFats = Math.round(calculatedCalories * 0.25 / 9);
          } else if (data.fitnessGoal === "build_muscle") {
            calculatedCalories = Math.round(bmr * activityMultiplier + 300);
          calculatedProtein = Math.round(data.weight * 2.5);
          calculatedCarbs = Math.round(calculatedCalories * 0.4 / 4);
          calculatedFats = Math.round(calculatedCalories * 0.25 / 9);
          } else {
            calculatedCalories = Math.round(bmr * activityMultiplier);
            calculatedProtein = Math.round(data.weight * 2.0);
          calculatedCarbs = Math.round(calculatedCalories * 0.4 / 4);
            calculatedFats = Math.round(calculatedCalories * 0.25 / 9);
          }
        }

        nutritionPlan = {
          dailyCalories: data.wantsMacrosPlan ? calculatedCalories : 2000,
          macros: {
            protein: data.wantsMacrosPlan ? calculatedProtein : 150,
            carbs: data.wantsMacrosPlan ? calculatedCarbs : 200,
          fats: data.wantsMacrosPlan ? calculatedFats : 65,
          },
          mealsPerDay: 3,
          mealTiming: "Spread meals throughout the day",
          hydration: "2-3 liters of water daily",
          supplements: [],
          notes: data.wantsMacrosPlan 
            ? "Your personalized macros plan based on your goals."
          : "Set your own macro targets in the nutrition section.",
        };
      }

      localStorage.setItem("customGymPlan", JSON.stringify(gymPlan));
      localStorage.setItem("customNutritionPlan", JSON.stringify(nutritionPlan));

    if (
      data.wantsAIWorkoutPlan &&
      gymPlan &&
      gymPlan.weeklySchedule &&
      gymPlan.weeklySchedule.length > 0
    ) {
      const workoutPlanByDay: {
        pushDay: Array<{
          id: string;
          name: string;
          goalSets: number;
          goalReps: number;
          goalWeight: number;
          sets: never[];
        }>;
        pullDay: Array<{
          id: string;
          name: string;
          goalSets: number;
          goalReps: number;
          goalWeight: number;
          sets: never[];
        }>;
        legsDay: Array<{
          id: string;
          name: string;
          goalSets: number;
          goalReps: number;
          goalWeight: number;
          sets: never[];
        }>;
      } = {
          pushDay: [],
          pullDay: [],
          legsDay: [],
        };

      gymPlan.weeklySchedule.forEach((day: AIWorkoutDay) => {
          const workoutName = day.workoutName?.toLowerCase() || "";
          const exercises = (day.exercises || []).map((ex: AIExercise) => ({
            id: `${ex.name}-${Date.now()}-${Math.random()}`,
            name: ex.name,
            goalSets: ex.sets || 3,
          goalReps:
            typeof ex.reps === "string"
              ? parseInt(ex.reps.replace(/[^0-9]/g, ""), 10) || 10
              : ex.reps || 10,
            goalWeight: 0,
            sets: [],
          }));

          if (workoutName.includes("push")) {
            workoutPlanByDay.pushDay.push(...exercises);
          } else if (workoutName.includes("pull")) {
            workoutPlanByDay.pullDay.push(...exercises);
          } else if (workoutName.includes("leg") || workoutName.includes("lower")) {
            workoutPlanByDay.legsDay.push(...exercises);
          }
        });

      if (
        workoutPlanByDay.pushDay.length === 0 &&
            workoutPlanByDay.pullDay.length === 0 && 
        workoutPlanByDay.legsDay.length === 0
      ) {
        gymPlan.weeklySchedule.forEach((day: AIWorkoutDay) => {
            const exercises = (day.exercises || []).map((ex: AIExercise) => ({
              id: `${ex.name}-${Date.now()}-${Math.random()}`,
              name: ex.name,
              goalSets: ex.sets || 3,
            goalReps:
              typeof ex.reps === "string"
                ? parseInt(ex.reps.replace(/[^0-9]/g, ""), 10) || 10
                : ex.reps || 10,
              goalWeight: 0,
              sets: [],
            }));

            exercises.forEach((ex) => {
              const name = ex.name.toLowerCase();
            if (
              name.includes("bench") ||
              name.includes("press") ||
              name.includes("push") ||
              name.includes("chest") ||
              name.includes("shoulder") ||
              name.includes("tricep")
            ) {
                workoutPlanByDay.pushDay.push(ex);
            } else if (
              name.includes("pull") ||
              name.includes("row") ||
              name.includes("lat") ||
              name.includes("bicep") ||
              name.includes("back")
            ) {
                workoutPlanByDay.pullDay.push(ex);
            } else if (
              name.includes("squat") ||
              name.includes("leg") ||
              name.includes("deadlift") ||
              name.includes("calf") ||
              name.includes("quad") ||
              name.includes("hamstring")
            ) {
                workoutPlanByDay.legsDay.push(ex);
              } else {
                workoutPlanByDay.pushDay.push(ex);
              }
            });
          });
        }

        localStorage.setItem("workoutPlan", JSON.stringify(workoutPlanByDay));
      }
  }, [data, requestAIConsent]);

  useEffect(() => {
    if (!showSubscribeModal || planGenerationPhase !== "progress") return;
    setGenerationProgress(0);
    const start = Date.now();
    const durationMs = 3400;
    const cap = 75;
    const id = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(cap, (elapsed / durationMs) * cap);
      setGenerationProgress(p);
      if (p >= cap - 0.5) {
        window.clearInterval(id);
        setGenerationProgress(cap);
        setPlanGenerationPhase("subscribe_gate");
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [showSubscribeModal, planGenerationPhase]);

  const handleSubscribeInModal = async () => {
    setSubscribing(true);
    setGenerationError(null);
    try {
      if (isNativeIapAvailable()) {
        await purchaseNative(selectedModalPlan);
        // Write active status immediately — same pattern as /subscribe page
        const { set } = await import("@/lib/persistent-storage");
        await set("subscriptionStatus", "active");
        await set("subscriptionPlan", selectedModalPlan);
        await set("subscriptionDate", new Date().toISOString());
        syncNativeSubscriptionState().catch(() => {});
      } else {
        await new Promise((r) => setTimeout(r, 1200));
        const { set } = await import("@/lib/persistent-storage");
        await set("subscriptionStatus", "active");
        await set("subscriptionPlan", selectedModalPlan);
        await set("subscriptionDate", new Date().toISOString());
      }

      setPlanGenerationPhase("generating");
      setGenerationProgress(Math.max(generationProgress, 76));

      await generateAndPersistPlans();

      setGenerationProgress(100);
      setShowSubscribeModal(false);
      setPlanGenerationPhase("idle");
      setPlanReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg && !msg.toLowerCase().includes("cancel")) {
        alert(msg);
      }
      setGenerationError(msg || "Could not complete checkout.");
    } finally {
      setSubscribing(false);
    }
  };

  const handleRestoreInModal = async () => {
    if (!isNativeIapAvailable()) return;
    setSubscribing(true);
    setGenerationError(null);
    try {
      await restoreNativePurchases();
      const { get } = await import("@/lib/persistent-storage");
      const status = await get("subscriptionStatus");
      if (status !== "active") {
        alert("No active subscription found.");
        return;
      }

      setPlanGenerationPhase("generating");
      setGenerationProgress(82);

      await generateAndPersistPlans();

      setGenerationProgress(100);
      setShowSubscribeModal(false);
      setPlanGenerationPhase("idle");
      setPlanReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Restore failed.";
      alert(msg);
    } finally {
      setSubscribing(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setGenerationError(null);
    const needsCustomPlan = data.wantsAIWorkoutPlan || data.wantsMacrosPlan;

    try {
      // Store onboarding data (persistent storage for iOS/native)
      const { set } = await import("@/lib/persistent-storage");
      await set("onboardingData", JSON.stringify(data));
      await set("onboardingCompleted", "true");

      // Create initial addictions if user wants to track them
      if (data.wantsToTrackAddictions && data.selectedAddictions.length > 0) {
        const existingAddictions = JSON.parse(localStorage.getItem("addictions") || "[]");
        const startDate = data.addictionStartDate || new Date().toISOString();
        const startTime = new Date(startDate).getTime();
        const timestamp = startTime; // Use startTime as stable ID base

        // Create phone addiction if selected
        if (data.selectedAddictions.includes("phone")) {
          const phoneAddiction = {
            id: `phone-${timestamp}`,
            name: "Phone & Social Media",
            startDate: new Date(startDate).toISOString().split("T")[0],
            apps: [],
            totalDailyLimit: (data.phoneDailyLimit || 2) * 60, // Convert hours to minutes
            totalCurrentUsage: 0,
            blocked: false,
          };
          existingAddictions.push(phoneAddiction);
        }

        // Create vape addiction if selected
        if (data.selectedAddictions.includes("vape")) {
          const vapeAddiction = {
            id: `vape-${timestamp}`,
            type: "vape",
            name: "Vaping",
            startDate: new Date(startDate).toISOString().split("T")[0],
            startTime: startTime.toString(),
            weeklySpend: data.vapeWeeklySpend || 0,
          };
          existingAddictions.push(vapeAddiction);
        }

        // Create alcohol addiction if selected
        if (data.selectedAddictions.includes("alcohol")) {
          const alcoholAddiction = {
            id: `alcohol-${timestamp}`,
            type: "goon", // Using "goon" as per the addictions page
            name: "Alcohol",
            startDate: new Date(startDate).toISOString().split("T")[0],
            startTime: startTime.toString(),
            weeklySpend: data.alcoholWeeklySpend || 0,
          };
          existingAddictions.push(alcoholAddiction);
        }

        // Create other addiction if selected
        if (data.selectedAddictions.includes("other")) {
          const otherAddiction = {
            id: `other-${timestamp}`,
            type: "other",
            name: "Other Addiction",
            startDate: new Date(startDate).toISOString().split("T")[0],
            startTime: startTime.toString(),
            weeklySpend: data.otherWeeklySpend || 0,
          };
          existingAddictions.push(otherAddiction);
        }

        localStorage.setItem("addictions", JSON.stringify(existingAddictions));
      }

      if (needsCustomPlan) {
        setLoading(false);
        setShowSubscribeModal(true);
        setPlanGenerationPhase("progress");
        setGenerationProgress(0);
        setGenerationError(null);
        return;
      }

      await generateAndPersistPlans();
      setLoading(false);
      router.push("/subscribe");
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to save your information: ${errorMessage}. Please try again.`);
      setLoading(false);
    }
  };

  const updateData = (
    key: keyof OnboardingData,
    value: FitnessGoal | Equipment | number | Aggressiveness | boolean | AddictionType[] | string | null | Gender
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAddiction = (addiction: AddictionType) => {
    setData((prev) => {
      const current = prev.selectedAddictions;
      if (current.includes(addiction)) {
        return { ...prev, selectedAddictions: current.filter(a => a !== addiction) };
      } else {
        return { ...prev, selectedAddictions: [...current, addiction] };
      }
    });
  };

  // Plan ready - show success and AI Coach CTA
  if (planReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0f1a] to-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="text-6xl mb-2">✨</div>
          <h1 className="text-2xl font-bold text-white">Your custom plan is ready!</h1>
          <p className="text-gray-400">
            For further assistance, speak to the AI Coach to modify workouts, change training days, or get support.
          </p>
          <div className="flex flex-col gap-3 mt-8">
            <Link
              href="/gym/ai-coach"
              className="w-full py-4 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-xl transition-colors"
            >
              Speak to AI Coach
            </Link>
            <Link
              href="/"
              className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors border border-white/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0f1a] to-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Subscribe Modal - during plan generation */}
        {showSubscribeModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 max-w-sm w-full border border-teal-500/30">
              <div className="mb-5">
                <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-white/10">
                  <div
                    className="bg-gradient-to-r from-teal-400 to-cyan-500 h-3 rounded-full transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.min(100, generationProgress)}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-2 text-center tabular-nums">
                  {Math.round(Math.min(100, generationProgress))}% —{" "}
                  {planGenerationPhase === "generating"
                    ? "Generating & saving…"
                    : planGenerationPhase === "subscribe_gate"
                      ? "Subscribe to continue"
                      : "Preparing your plan…"}
                </p>
              </div>

              <h2 className="text-xl font-bold text-white mb-2 text-center">
                {planGenerationPhase === "generating"
                  ? "Almost there"
                  : planGenerationPhase === "subscribe_gate"
                    ? "Subscribe to unlock your plan"
                    : "Building your plan"}
              </h2>
              <p className="text-gray-400 text-sm mb-4 text-center leading-relaxed">
                {planGenerationPhase === "progress"
                  ? "We’re tailoring workouts and nutrition to your answers. At 75% you’ll unlock the next step."
                  : planGenerationPhase === "subscribe_gate"
                    ? "Subscribe to generate and save your personalized workout & macros plan."
                    : planGenerationPhase === "generating"
                      ? "Hang tight — finishing generation and saving to your account."
                      : ""}
              </p>

              {generationError && (
                <p className="text-red-400/90 text-xs mb-3 text-center">{generationError}</p>
              )}

              {(planGenerationPhase === "subscribe_gate" || planGenerationPhase === "progress") && (
                <div className="space-y-4">
                  {/* Plan selector */}
                  <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setSelectedModalPlan("monthly")}
                      className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                        selectedModalPlan === "monthly"
                          ? "bg-teal-500 text-black shadow"
                          : "text-gray-400"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedModalPlan("yearly")}
                      className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                        selectedModalPlan === "yearly"
                          ? "bg-teal-500 text-black shadow"
                          : "text-gray-400"
                      }`}
                    >
                      Yearly <span className="text-xs opacity-75">· Save 17%</span>
                    </button>
                  </div>
                  <div className="bg-teal-500/10 border border-teal-400/30 rounded-xl p-4">
                    <p className="text-teal-300 font-semibold">3 days free</p>
                    {selectedModalPlan === "monthly" ? (
                      <p className="text-2xl font-bold text-white mt-1">
                        {modalMonthlyPrice ?? "$3.99"}<span className="text-sm font-normal text-gray-400">/month after</span>
                      </p>
                    ) : (
                      <p className="text-2xl font-bold text-white mt-1">
                        {modalYearlyPrice ?? "$39.99"}<span className="text-sm font-normal text-gray-400">/year after</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Price may vary by region on App Store</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubscribeInModal}
                    disabled={
                      subscribing ||
                      planGenerationPhase === "progress" ||
                      loading
                    }
                    className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-colors"
                  >
                    {subscribing
                      ? "Processing..."
                      : planGenerationPhase === "progress"
                        ? "Reach 75% to continue…"
                        : "Subscribe & unlock"}
                  </button>
                  {planGenerationPhase === "subscribe_gate" && isNativeIapAvailable() && (
                    <button
                      type="button"
                      onClick={handleRestoreInModal}
                      disabled={subscribing}
                      className="w-full py-2 text-sm font-semibold text-teal-300/90 hover:text-teal-200 disabled:opacity-50"
                    >
                      Restore purchases
                    </button>
                  )}
                  <p className="text-[10px] text-gray-600 text-center leading-relaxed pt-1">
                    Auto-renewable subscription. By subscribing you agree to our{" "}
                    <Link href="/terms" className="text-blue-400/80 underline underline-offset-2">Terms of Use</Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="text-blue-400/80 underline underline-offset-2">Privacy Policy</Link>
                    . Manage or cancel in App Store account settings.
                  </p>
                </div>
              )}

              {planGenerationPhase === "generating" && (
                <div className="flex justify-center py-4">
                  <div className="inline-block w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gradient-to-b from-[#0c1422] to-black rounded-full h-2.5 border border-white/10 shadow-inner">
            <div
              className="bg-gradient-to-r from-teal-400 to-cyan-500 h-2.5 rounded-full transition-all duration-500 shadow-lg shadow-teal-500/30"
              style={{ width: `${(step / getTotalSteps()) * 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-300 mt-2 text-center font-semibold">
            Step {step} of {getTotalSteps()}
          </p>
        </div>

        {/* Step 1: Fitness Goal */}
        {step === 1 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              What&apos;s your fitness goal?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              Choose the primary goal you want to achieve
            </p>
            <div className="space-y-3">
              {[
                { value: "lose_weight", label: "Lose Weight", emoji: "🔥" },
                { value: "gain_weight", label: "Gain Weight", emoji: "💪" },
                { value: "build_muscle", label: "Build Muscle", emoji: "🏋️" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateData("fitnessGoal", option.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all transform hover:scale-105 text-left shadow-lg ${
                    data.fitnessGoal === option.value
                      ? "border-teal-400 bg-gradient-to-br from-teal-500/20 via-cyan-500/20 to-teal-500/10 shadow-teal-500/30"
                      : "border-white/10 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black hover:border-teal-400/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.emoji}</span>
                    <span className={`text-lg font-bold ${data.fitnessGoal === option.value ? "text-white" : "text-gray-200"}`}>{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Equipment */}
        {step === 2 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              What equipment do you have access to?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              This helps us create the perfect workout plan for you
            </p>
            <div className="space-y-3">
              {[
                { value: "full_gym", label: "Full Gym", emoji: "🏋️" },
                { value: "home_gym", label: "Home Gym", emoji: "🏠" },
                { value: "minimal", label: "Minimal Equipment", emoji: "🧘" },
                { value: "bodyweight_only", label: "Bodyweight Only", emoji: "🤸" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateData("equipment", option.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all transform hover:scale-105 text-left shadow-lg ${
                    data.equipment === option.value
                      ? "border-teal-400 bg-gradient-to-br from-teal-500/20 via-cyan-500/20 to-teal-500/10 shadow-teal-500/30"
                      : "border-white/10 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black hover:border-teal-400/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.emoji}</span>
                    <span className={`text-lg font-bold ${data.equipment === option.value ? "text-white" : "text-gray-200"}`}>{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Height */}
        {step === 3 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              How tall are you?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              Enter your height in centimeters
            </p>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="e.g., 175"
                value={data.height || ""}
                onChange={(e) => updateData("height", parseInt(e.target.value) || null)}
                className="w-full p-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border-2 border-white/10 rounded-xl text-white text-center text-2xl font-bold focus:border-teal-400 focus:outline-none shadow-lg transition-all"
                min="100"
                max="250"
              />
              <p className="text-sm text-gray-400 text-center">
                Enter height in cm (100-250)
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Age */}
        {step === 4 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              How old are you?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              This helps us calculate your optimal calorie intake
            </p>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="e.g., 25"
                value={data.age || ""}
                onChange={(e) => updateData("age", parseInt(e.target.value) || null)}
                className="w-full p-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border-2 border-white/10 rounded-xl text-white text-center text-2xl font-bold focus:border-teal-400 focus:outline-none shadow-lg transition-all"
                min="13"
                max="100"
              />
              <p className="text-sm text-gray-400 text-center">
                Enter your age (13-100)
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Weight */}
        {step === 5 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              What&apos;s your current weight?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              Enter your weight in kilograms
            </p>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="e.g., 75"
                value={data.weight || ""}
                onChange={(e) => updateData("weight", parseInt(e.target.value) || null)}
                className="w-full p-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border-2 border-white/10 rounded-xl text-white text-center text-2xl font-bold focus:border-teal-400 focus:outline-none shadow-lg transition-all"
                min="30"
                max="300"
              />
              <p className="text-sm text-gray-400 text-center">
                Enter weight in kg (30-300)
              </p>
            </div>
          </div>
        )}

        {/* Step 6: Aggressiveness */}
        {step === 6 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              How aggressive do you want to hit your target?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              Choose your intensity level
            </p>
            <div className="space-y-3">
              {[
                { value: "moderate", label: "Moderate", desc: "Steady progress, sustainable", emoji: "🚶" },
                { value: "aggressive", label: "Aggressive", desc: "Faster results, more commitment", emoji: "🏃" },
                { value: "very_aggressive", label: "Very Aggressive", desc: "Maximum intensity, rapid results", emoji: "⚡" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateData("aggressiveness", option.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all transform hover:scale-105 text-left shadow-lg ${
                    data.aggressiveness === option.value
                      ? "border-teal-400 bg-gradient-to-br from-teal-500/20 via-cyan-500/20 to-teal-500/10 shadow-teal-500/30"
                      : "border-white/10 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black hover:border-teal-400/50"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl">{option.emoji}</span>
                    <div>
                      <div className={`text-lg font-bold ${data.aggressiveness === option.value ? "text-white" : "text-gray-200"}`}>{option.label}</div>
                      <div className={`text-sm ${data.aggressiveness === option.value ? "text-teal-300" : "text-gray-400"}`}>{option.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 7: AI Workout Plan */}
        {step === 7 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              Want an AI-built workout plan?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              Our AI coach will create a personalized workout plan based on your goals and equipment
            </p>
            <MedicalWellnessDisclaimer className="mb-4" />
            <div className="space-y-3">
              {[
                { value: true, label: "Yes, create my workout plan", emoji: "🤖" },
                { value: false, label: "No, skip for now", emoji: "✋" },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  onClick={() => updateData("wantsAIWorkoutPlan", option.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all transform hover:scale-105 text-left shadow-lg ${
                    data.wantsAIWorkoutPlan === option.value
                      ? "border-teal-400 bg-gradient-to-br from-teal-500/20 via-cyan-500/20 to-teal-500/10 shadow-teal-500/30"
                      : "border-white/10 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black hover:border-teal-400/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.emoji}</span>
                    <span className={`text-lg font-bold ${data.wantsAIWorkoutPlan === option.value ? "text-white" : "text-gray-200"}`}>{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 8: Sex — before AI plan generation */}
        {step === 8 && data.wantsAIWorkoutPlan === true && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              Which best describes you?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              We use this only to estimate daily energy needs for your plan (wellness / educational, not medical
              advice).
            </p>
            <MedicalWellnessDisclaimer className="mb-4" />
            <div className="space-y-3">
              {[
                { value: "male" as Gender, label: "Male", emoji: "♂️" },
                { value: "female" as Gender, label: "Female", emoji: "♀️" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateData("gender", option.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all transform hover:scale-105 text-left shadow-lg ${
                    data.gender === option.value
                      ? "border-teal-400 bg-gradient-to-br from-teal-500/20 via-cyan-500/20 to-teal-500/10 shadow-teal-500/30"
                      : "border-white/10 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black hover:border-teal-400/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.emoji}</span>
                    <span
                      className={`text-lg font-bold ${data.gender === option.value ? "text-white" : "text-gray-200"}`}
                    >
                      {option.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 9: Optional notes for AI workout */}
        {step === 9 && data.wantsAIWorkoutPlan === true && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              Anything else we should know?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              Optional — injuries, schedule limits, exercises you love or hate. Helps the AI shape your workouts.
            </p>
            <textarea
              value={data.workoutExtraNotes}
              onChange={(e) => updateData("workoutExtraNotes", e.target.value)}
              placeholder="e.g. bad left shoulder, prefer 45 min sessions, no barbell squats…"
              rows={5}
              className="w-full p-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border-2 border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:border-teal-400 focus:outline-none text-sm leading-relaxed resize-none"
            />
            <p className="text-xs text-gray-500 text-center">You can leave this blank — tap Next when ready.</p>
          </div>
        )}

        {/* Step 10: Macros Plan */}
        {step === 10 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              Want a personalized macros plan?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              Get custom daily calorie and macro targets (protein, carbs, fats) tailored to your goals
            </p>
            <MedicalWellnessDisclaimer className="mb-4" />
            <div className="space-y-3">
              {[
                { value: true, label: "Yes, create my macros plan", emoji: "📊" },
                { value: false, label: "No, skip for now", emoji: "✋" },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  onClick={() => updateData("wantsMacrosPlan", option.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all transform hover:scale-105 text-left shadow-lg ${
                    data.wantsMacrosPlan === option.value
                      ? "border-teal-400 bg-gradient-to-br from-teal-500/20 via-cyan-500/20 to-teal-500/10 shadow-teal-500/30"
                      : "border-white/10 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black hover:border-teal-400/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.emoji}</span>
                    <span className={`text-lg font-bold ${data.wantsMacrosPlan === option.value ? "text-white" : "text-gray-200"}`}>{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 11: Track Addictions? */}
        {step === 11 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              Do you want to track any addictions?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              We can help you monitor and overcome habits like phone usage, vaping, alcohol, and more
            </p>
            <div className="space-y-3">
              {[
                { value: true, label: "Yes, I want to track addictions", emoji: "✅" },
                { value: false, label: "No, skip this section", emoji: "➡️" },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  onClick={() => {
                    updateData("wantsToTrackAddictions", option.value);
                    if (option.value === false) {
                      // If they say no, skip to submit
                      setTimeout(() => handleSubmit(), 100);
                    }
                  }}
                  className={`w-full p-4 rounded-xl border-2 transition-all transform hover:scale-105 text-left shadow-lg ${
                    data.wantsToTrackAddictions === option.value
                      ? "border-teal-400 bg-gradient-to-br from-teal-500/20 via-cyan-500/20 to-teal-500/10 shadow-teal-500/30"
                      : "border-white/10 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black hover:border-teal-400/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.emoji}</span>
                    <span className={`text-lg font-bold ${data.wantsToTrackAddictions === option.value ? "text-white" : "text-gray-200"}`}>{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 12: Which Addictions */}
        {step === 12 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              Which addictions would you like to track?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              Select all that apply
            </p>
            <div className="space-y-3">
              {[
                { value: "phone", label: "Phone & Social Media", emoji: "📱", desc: "Track screen time and app usage" },
                { value: "vape", label: "Vaping", emoji: "💨", desc: "Monitor vaping habits and savings" },
                { value: "alcohol", label: "Alcohol", emoji: "🍺", desc: "Track alcohol consumption and savings" },
                { value: "other", label: "Other Addiction", emoji: "🎯", desc: "Track any other habit you want to overcome" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleAddiction(option.value as AddictionType)}
                  className={`w-full p-4 rounded-xl border-2 transition-all transform hover:scale-105 text-left shadow-lg ${
                    data.selectedAddictions.includes(option.value as AddictionType)
                      ? "border-teal-400 bg-gradient-to-br from-teal-500/20 via-cyan-500/20 to-teal-500/10 shadow-teal-500/30"
                      : "border-white/10 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black hover:border-teal-400/50"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl">{option.emoji}</span>
                    <div className="flex-1">
                      <div className={`text-lg font-bold ${data.selectedAddictions.includes(option.value as AddictionType) ? "text-white" : "text-gray-200"}`}>{option.label}</div>
                      <div className={`text-sm ${data.selectedAddictions.includes(option.value as AddictionType) ? "text-teal-300" : "text-gray-400"}`}>{option.desc}</div>
                    </div>
                    {data.selectedAddictions.includes(option.value as AddictionType) && (
                      <span className="text-teal-400 text-xl font-bold">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 13: Phone Daily Limit */}
        {step === 13 && data.selectedAddictions.includes("phone") && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              What&apos;s your daily phone limit?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              How many hours per day do you want to limit your phone usage?
            </p>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="e.g., 2"
                value={data.phoneDailyLimit || ""}
                onChange={(e) => updateData("phoneDailyLimit", parseFloat(e.target.value) || null)}
                className="w-full p-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border-2 border-white/10 rounded-xl text-white text-center text-2xl font-bold focus:border-teal-400 focus:outline-none shadow-lg transition-all"
                min="0.5"
                max="24"
                step="0.5"
              />
              <p className="text-sm text-gray-400 text-center">
                Enter hours per day (0.5-24)
              </p>
            </div>
          </div>
        )}

        {/* Step 14: Weekly Spend for Vape/Alcohol/Other */}
        {step === 14 && data.selectedAddictions.some(a => ["vape", "alcohol", "other"].includes(a)) && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              How much do you spend weekly?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              This helps us calculate how much money you&apos;ll save
            </p>
            <div className="space-y-4">
              {data.selectedAddictions.includes("vape") && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2 font-semibold">Vaping (per week)</label>
                  <input
                    type="number"
                    placeholder="e.g., 50"
                    value={data.vapeWeeklySpend || ""}
                    onChange={(e) => updateData("vapeWeeklySpend", parseFloat(e.target.value) || null)}
                    className="w-full p-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border-2 border-white/10 rounded-xl text-white text-center text-xl font-bold focus:border-teal-400 focus:outline-none shadow-lg transition-all"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
              {data.selectedAddictions.includes("alcohol") && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2 font-semibold">Alcohol (per week)</label>
                  <input
                    type="number"
                    placeholder="e.g., 75"
                    value={data.alcoholWeeklySpend || ""}
                    onChange={(e) => updateData("alcoholWeeklySpend", parseFloat(e.target.value) || null)}
                    className="w-full p-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border-2 border-white/10 rounded-xl text-white text-center text-xl font-bold focus:border-teal-400 focus:outline-none shadow-lg transition-all"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
              {data.selectedAddictions.includes("other") && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2 font-semibold">Other Addiction (per week)</label>
                  <input
                    type="number"
                    placeholder="e.g., 30"
                    value={data.otherWeeklySpend || ""}
                    onChange={(e) => updateData("otherWeeklySpend", parseFloat(e.target.value) || null)}
                    className="w-full p-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border-2 border-white/10 rounded-xl text-white text-center text-xl font-bold focus:border-teal-400 focus:outline-none shadow-lg transition-all"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 15: Start Date */}
        {step === 15 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              When did you start your journey?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              Choose when you began or want to begin overcoming these addictions
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  updateData("addictionStartDate", new Date().toISOString());
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all transform hover:scale-105 text-left shadow-lg ${
                  data.addictionStartDate === new Date().toISOString().split("T")[0] + "T00:00:00.000Z" || 
                  (data.addictionStartDate && new Date(data.addictionStartDate).toDateString() === new Date().toDateString())
                    ? "border-teal-400 bg-gradient-to-br from-teal-500/20 via-cyan-500/20 to-teal-500/10 shadow-teal-500/30"
                    : "border-white/10 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black hover:border-teal-400/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  <span className={`text-lg font-bold ${(data.addictionStartDate === new Date().toISOString().split("T")[0] + "T00:00:00.000Z" || (data.addictionStartDate && new Date(data.addictionStartDate).toDateString() === new Date().toDateString())) ? "text-white" : "text-gray-200"}`}>Today</span>
                </div>
              </button>
              <div>
                <label className="block text-sm text-gray-300 mb-2 font-semibold">Or choose a specific date</label>
                <input
                  type="date"
                  value={data.addictionStartDate ? new Date(data.addictionStartDate).toISOString().split("T")[0] : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      const date = new Date(e.target.value);
                      date.setHours(0, 0, 0, 0);
                      updateData("addictionStartDate", date.toISOString());
                    }
                  }}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full p-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border-2 border-white/10 rounded-xl text-white font-bold focus:border-teal-400 focus:outline-none shadow-lg transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 p-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border-2 border-white/10 rounded-xl font-bold text-gray-200 hover:border-teal-400/50 hover:scale-105 transition-all transform shadow-lg"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={
              loading ||
              showSubscribeModal ||
              (step === 1 && !data.fitnessGoal) ||
              (step === 2 && !data.equipment) ||
              (step === 3 && !data.height) ||
              (step === 4 && !data.age) ||
              (step === 5 && !data.weight) ||
              (step === 6 && !data.aggressiveness) ||
              (step === 7 && data.wantsAIWorkoutPlan === null) ||
              (step === 8 && data.wantsAIWorkoutPlan === true && !data.gender) ||
              (step === 10 && data.wantsMacrosPlan === null) ||
              (step === 11 && data.wantsToTrackAddictions === null) ||
              (step === 12 && data.selectedAddictions.length === 0) ||
              (step === 13 && (!data.phoneDailyLimit || data.phoneDailyLimit <= 0)) ||
              (step === 14 &&
                data.selectedAddictions.some((a) => ["vape", "alcohol", "other"].includes(a)) &&
                ((data.selectedAddictions.includes("vape") && !data.vapeWeeklySpend) ||
                 (data.selectedAddictions.includes("alcohol") && !data.alcoholWeeklySpend) ||
                 (data.selectedAddictions.includes("other") && !data.otherWeeklySpend))) ||
              (step === 15 && !data.addictionStartDate)
            }
            className="flex-1 p-4 bg-gradient-to-r from-teal-400 to-cyan-500 text-white rounded-xl font-bold hover:from-teal-500 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg shadow-teal-500/30 disabled:hover:scale-100"
          >
            {loading ? "Saving..." : getStepInfo(step).isLast ? "Continue" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

