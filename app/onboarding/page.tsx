"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type FitnessGoal = "lose_weight" | "gain_weight" | "build_muscle";
type Equipment = "full_gym" | "home_gym" | "minimal" | "bodyweight_only";
type Aggressiveness = "moderate" | "aggressive" | "very_aggressive";
type AddictionType = "phone" | "vape" | "alcohol" | "other";

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
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    fitnessGoal: null,
    equipment: null,
    height: null,
    age: null,
    weight: null,
    aggressiveness: null,
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
      const { get } = await import("@/lib/persistent-storage");
      const subscriptionStatus = await get("subscriptionStatus");
      if (subscriptionStatus === "active") {
        router.push("/");
      }
    })();
  }, [router]);

  const getStepInfo = (currentStep: number) => {
    // Steps 1-6 are fitness questions
    if (currentStep <= 6) {
      return { step: currentStep, isLast: false };
    }
    
    // Step 7: AI Workout Plan
    if (currentStep === 7) {
      return { step: currentStep, isLast: false };
    }
    
    // Step 8: Macros Plan
    if (currentStep === 8) {
      // Check if we have addiction questions
      if (data.wantsToTrackAddictions === null) {
        return { step: currentStep, isLast: false };
      }
      if (data.wantsToTrackAddictions === false) {
        return { step: currentStep, isLast: true };
      }
      return { step: currentStep, isLast: false };
    }
    
    // Step 9: Track addictions?
    if (currentStep === 9) {
      if (data.wantsToTrackAddictions === false) {
        return { step: currentStep, isLast: true };
      }
      return { step: currentStep, isLast: false };
    }
    
    // Step 10: Which addictions
    if (currentStep === 10) {
      return { step: currentStep, isLast: false };
    }
    
    // Step 11: Phone limit (only if phone selected)
    if (currentStep === 11) {
      if (!data.selectedAddictions.includes("phone")) {
        // Skip this step, go to next
        return getStepInfo(12);
      }
      const hasSpendStep = data.selectedAddictions.some(a => ["vape", "alcohol", "other"].includes(a));
      return { step: currentStep, isLast: !hasSpendStep && !data.addictionStartDate };
    }
    
    // Step 12: Weekly spend (only if vape/alcohol/other selected)
    if (currentStep === 12) {
      if (!data.selectedAddictions.some(a => ["vape", "alcohol", "other"].includes(a))) {
        // Skip this step, go to next
        return getStepInfo(13);
      }
      return { step: currentStep, isLast: !data.addictionStartDate };
    }
    
    // Step 13: Start date (always last if tracking addictions)
    if (currentStep === 13) {
      return { step: currentStep, isLast: true };
    }
    
    return { step: currentStep, isLast: false };
  };

  const getTotalSteps = () => {
    let total = 6; // Base fitness questions
    
    // AI Plan questions (steps 7-8)
    total += 1; // Step 7: AI Workout Plan
    total += 1; // Step 8: Macros Plan
    
    // Addiction questions
    if (data.wantsToTrackAddictions === true) {
      total += 1; // Step 9: Track addictions?
      total += 1; // Step 10: Which addictions
      if (data.selectedAddictions.includes("phone")) {
        total += 1; // Step 11: Phone limit
      }
      if (data.selectedAddictions.some(a => ["vape", "alcohol", "other"].includes(a))) {
        total += 1; // Step 12: Weekly spend
      }
      total += 1; // Step 13: Start date
    } else if (data.wantsToTrackAddictions === null) {
      total += 1; // Step 9: Track addictions? (not answered yet)
    }
    
    return total;
  };

  const handleNext = () => {
    const stepInfo = getStepInfo(step);
    
    if (stepInfo.isLast) {
      handleSubmit();
    } else {
      // Find next valid step
      let nextStep = step + 1;
      while (nextStep <= 11) {
        const nextStepInfo = getStepInfo(nextStep);
        if (nextStepInfo.step === nextStep) {
          setStep(nextStep);
          return;
        }
        nextStep++;
      }
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubscribeInModal = async () => {
    setSubscribing(true);
    try {
      const nativeSub = typeof window !== "undefined"
        ? (window as Window & { MogifiNativeSubscribe?: { purchase: (p: string) => Promise<unknown> } }).MogifiNativeSubscribe
        : undefined;
      if (nativeSub?.purchase) {
        await nativeSub.purchase("monthly");
      } else {
        await new Promise((r) => setTimeout(r, 1200));
        const { set } = await import("@/lib/persistent-storage");
        await set("subscriptionStatus", "active");
        await set("subscriptionPlan", "monthly");
        await set("subscriptionDate", new Date().toISOString());
      }
      setShowSubscribeModal(false);
      setPlanReady(true);
    } catch {
      // User cancelled StoreKit sheet or purchase failed — keep modal open
    } finally {
      setSubscribing(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setGenerationError(null);
    const needsCustomPlan = data.wantsAIWorkoutPlan || data.wantsMacrosPlan;
    if (needsCustomPlan) setShowSubscribeModal(true);

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

      // Generate or create plans based on user preferences
      let gymPlan = null;
      let nutritionPlan = null;

      // Generate AI workout plan if requested
      if (data.wantsAIWorkoutPlan) {
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
            }),
          });

          if (response.ok) {
            const planData = await response.json();
            gymPlan = planData.gymPlan;
            nutritionPlan = planData.nutritionPlan;
          } else {
            // Fallback to placeholder if API fails
            console.error("Failed to generate AI plan, using placeholder");
          }
        } catch (error) {
          console.error("Error generating AI plan:", error);
          // Fallback to placeholder
        }
      }

      // Create workout plan (AI-generated or placeholder)
      if (!gymPlan) {
        gymPlan = {
          planName: "Custom Workout Plan",
          weeklySchedule: [],
          duration: "12 weeks",
          notes: data.wantsAIWorkoutPlan 
            ? "Your personalized workout plan will be generated after subscription."
            : "Create your own workout plan in the gym section."
        };
      }

      // Create nutrition plan (AI-generated or calculated)
      if (!nutritionPlan) {
        // Calculate basic macros based on user data if available
        let calculatedCalories = 2000;
        let calculatedProtein = 150;
        let calculatedCarbs = 200;
        let calculatedFats = 65;

        if (data.weight && data.height && data.age) {
          // Calculate BMR using Mifflin-St Jeor equation
          const bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + 5;
          
          // Adjust based on goal and aggressiveness
          let activityMultiplier = 1.4; // Moderate activity
          if (data.aggressiveness === "aggressive") activityMultiplier = 1.6;
          if (data.aggressiveness === "very_aggressive") activityMultiplier = 1.8;

          if (data.fitnessGoal === "lose_weight") {
            calculatedCalories = Math.round(bmr * activityMultiplier - 500);
            calculatedProtein = Math.round(data.weight * 2.2); // 1g per lb of bodyweight
            calculatedCarbs = Math.round(calculatedCalories * 0.35 / 4); // 35% of calories
            calculatedFats = Math.round(calculatedCalories * 0.25 / 9); // 25% of calories
          } else if (data.fitnessGoal === "gain_weight") {
            calculatedCalories = Math.round(bmr * activityMultiplier + 500);
            calculatedProtein = Math.round(data.weight * 2.2);
            calculatedCarbs = Math.round(calculatedCalories * 0.45 / 4); // 45% of calories
            calculatedFats = Math.round(calculatedCalories * 0.25 / 9); // 25% of calories
          } else if (data.fitnessGoal === "build_muscle") {
            calculatedCalories = Math.round(bmr * activityMultiplier + 300);
            calculatedProtein = Math.round(data.weight * 2.5); // Higher protein for muscle building
            calculatedCarbs = Math.round(calculatedCalories * 0.40 / 4); // 40% of calories
            calculatedFats = Math.round(calculatedCalories * 0.25 / 9); // 25% of calories
          } else {
            calculatedCalories = Math.round(bmr * activityMultiplier);
            calculatedProtein = Math.round(data.weight * 2.0);
            calculatedCarbs = Math.round(calculatedCalories * 0.40 / 4);
            calculatedFats = Math.round(calculatedCalories * 0.25 / 9);
          }
        }

        nutritionPlan = {
          dailyCalories: data.wantsMacrosPlan ? calculatedCalories : 2000,
          macros: {
            protein: data.wantsMacrosPlan ? calculatedProtein : 150,
            carbs: data.wantsMacrosPlan ? calculatedCarbs : 200,
            fats: data.wantsMacrosPlan ? calculatedFats : 65
          },
          mealsPerDay: 3,
          mealTiming: "Spread meals throughout the day",
          hydration: "2-3 liters of water daily",
          supplements: [],
          notes: data.wantsMacrosPlan 
            ? "Your personalized macros plan based on your goals."
            : "Set your own macro targets in the nutrition section."
        };
      }

      // Store plans
      localStorage.setItem("customGymPlan", JSON.stringify(gymPlan));
      localStorage.setItem("customNutritionPlan", JSON.stringify(nutritionPlan));

      // Convert and store workout plan in gym page format
      if (gymPlan && gymPlan.weeklySchedule && gymPlan.weeklySchedule.length > 0) {
        const workoutPlanByDay: { pushDay: Array<{ id: string; name: string; goalSets: number; goalReps: number; goalWeight: number; sets: never[] }>; pullDay: Array<{ id: string; name: string; goalSets: number; goalReps: number; goalWeight: number; sets: never[] }>; legsDay: Array<{ id: string; name: string; goalSets: number; goalReps: number; goalWeight: number; sets: never[] }> } = {
          pushDay: [],
          pullDay: [],
          legsDay: [],
        };

        // Convert AI plan format to gym page format
        (gymPlan as AIGymPlan).weeklySchedule.forEach((day: AIWorkoutDay) => {
          const workoutName = day.workoutName?.toLowerCase() || "";
          const exercises = (day.exercises || []).map((ex: AIExercise) => ({
            id: `${ex.name}-${Date.now()}-${Math.random()}`,
            name: ex.name,
            goalSets: ex.sets || 3,
            goalReps: typeof ex.reps === "string" ? parseInt(ex.reps.replace(/[^0-9]/g, "")) || 10 : ex.reps || 10,
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

        // If no exercises were categorized, distribute them
        if (workoutPlanByDay.pushDay.length === 0 && 
            workoutPlanByDay.pullDay.length === 0 && 
            workoutPlanByDay.legsDay.length === 0) {
          // Try to categorize by exercise names
          (gymPlan as AIGymPlan).weeklySchedule.forEach((day: AIWorkoutDay) => {
            const exercises = (day.exercises || []).map((ex: AIExercise) => ({
              id: `${ex.name}-${Date.now()}-${Math.random()}`,
              name: ex.name,
              goalSets: ex.sets || 3,
              goalReps: typeof ex.reps === "string" ? parseInt(ex.reps.replace(/[^0-9]/g, "")) || 10 : ex.reps || 10,
              goalWeight: 0,
              sets: [],
            }));

            exercises.forEach((ex) => {
              const name = ex.name.toLowerCase();
              if (name.includes("bench") || name.includes("press") || name.includes("push") || name.includes("chest") || name.includes("shoulder") || name.includes("tricep")) {
                workoutPlanByDay.pushDay.push(ex);
              } else if (name.includes("pull") || name.includes("row") || name.includes("lat") || name.includes("bicep") || name.includes("back")) {
                workoutPlanByDay.pullDay.push(ex);
              } else if (name.includes("squat") || name.includes("leg") || name.includes("deadlift") || name.includes("calf") || name.includes("quad") || name.includes("hamstring")) {
                workoutPlanByDay.legsDay.push(ex);
              } else {
                // Default to push day
                workoutPlanByDay.pushDay.push(ex);
              }
            });
          });
        }

        localStorage.setItem("workoutPlan", JSON.stringify(workoutPlanByDay));
      }

      if (needsCustomPlan) {
        setLoading(false);
        // Modal stays open; user subscribes → planReady
      } else {
        router.push("/subscribe");
      }
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to save your information: ${errorMessage}. Please try again.`);
      setLoading(false);
    }
  };

  const updateData = (key: keyof OnboardingData, value: FitnessGoal | Equipment | number | Aggressiveness | boolean | AddictionType[] | string | null) => {
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
              {loading ? (
                <>
                  <div className="text-center mb-6">
                    <div className="inline-block w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Creating your custom plan...</h2>
                    <p className="text-gray-400 text-sm">Subscribe to unlock your workout and diet plan</p>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-teal-500/10 border border-teal-400/30 rounded-xl p-4">
                      <p className="text-teal-300 font-semibold">3 days free</p>
                      <p className="text-2xl font-bold text-white mt-1">£2.99<span className="text-sm font-normal text-gray-400">/month after</span></p>
                      <p className="text-xs text-gray-500 mt-1">Price may vary by region on App Store</p>
                    </div>
                    <button
                      onClick={handleSubscribeInModal}
                      disabled={subscribing || loading}
                      className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-black font-bold rounded-xl transition-colors"
                    >
                      {subscribing ? "Processing..." : loading ? "Creating plan..." : "Subscribe"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-white mb-2">Plan ready</h2>
                  <p className="text-gray-400 text-sm mb-4">Subscribe to access your custom plan</p>
                  <div className="space-y-4">
                    <div className="bg-teal-500/10 border border-teal-400/30 rounded-xl p-4">
                      <p className="text-teal-300 font-semibold">3 days free</p>
                      <p className="text-2xl font-bold text-white mt-1">£2.99<span className="text-sm font-normal text-gray-400">/month after</span></p>
                    </div>
                    <button
                      onClick={handleSubscribeInModal}
                      disabled={subscribing}
                      className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-black font-bold rounded-xl transition-colors"
                    >
                      {subscribing ? "Processing..." : "Subscribe"}
                    </button>
                  </div>
                </>
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

        {/* Step 8: Macros Plan */}
        {step === 8 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center mb-2">
              Want a personalized macros plan?
            </h1>
            <p className="text-gray-300 text-center mb-6">
              Get custom daily calorie and macro targets (protein, carbs, fats) tailored to your goals
            </p>
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

        {/* Step 9: Track Addictions? */}
        {step === 9 && (
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

        {/* Step 10: Which Addictions */}
        {step === 10 && (
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

        {/* Step 11: Phone Daily Limit */}
        {step === 11 && data.selectedAddictions.includes("phone") && (
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

        {/* Step 12: Weekly Spend for Vape/Alcohol/Other */}
        {step === 12 && data.selectedAddictions.some(a => ["vape", "alcohol", "other"].includes(a)) && (
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

        {/* Step 13: Start Date */}
        {step === 13 && (
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
              (step === 1 && !data.fitnessGoal) ||
              (step === 2 && !data.equipment) ||
              (step === 3 && !data.height) ||
              (step === 4 && !data.age) ||
              (step === 5 && !data.weight) ||
              (step === 6 && !data.aggressiveness) ||
              (step === 7 && data.wantsAIWorkoutPlan === null) ||
              (step === 8 && data.wantsMacrosPlan === null) ||
              (step === 9 && data.wantsToTrackAddictions === null) ||
              (step === 10 && data.selectedAddictions.length === 0) ||
              (step === 11 && (!data.phoneDailyLimit || data.phoneDailyLimit <= 0)) ||
              (step === 12 && data.selectedAddictions.some(a => ["vape", "alcohol", "other"].includes(a)) && 
                ((data.selectedAddictions.includes("vape") && !data.vapeWeeklySpend) ||
                 (data.selectedAddictions.includes("alcohol") && !data.alcoholWeeklySpend) ||
                 (data.selectedAddictions.includes("other") && !data.otherWeeklySpend))) ||
              (step === 13 && !data.addictionStartDate)
            }
            className="flex-1 p-4 bg-gradient-to-r from-teal-400 to-cyan-500 text-white rounded-xl font-bold hover:from-teal-500 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg shadow-teal-500/30 disabled:hover:scale-100"
          >
            {loading ? "Saving..." : step === getTotalSteps() ? "Continue" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

