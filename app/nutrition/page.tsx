"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { Upload, Camera, X, Settings } from "lucide-react";
import BottomNav from "@/components/BottomNav";

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  time: string;
  imageUrl?: string;
}

export default function NutritionPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showScanIntro, setShowScanIntro] = useState(false);
  const [showScanOptions, setShowScanOptions] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [foodToScan, setFoodToScan] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newMeal, setNewMeal] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  });

  const [dailyGoals, setDailyGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fats: 65,
  });

  const [showMacroSettings, setShowMacroSettings] = useState(false);
  const [macroSettings, setMacroSettings] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fats: 65,
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load meals and macro goals from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Load meals
    const storedMeals = localStorage.getItem("meals");
    if (storedMeals) {
      try {
        const parsedMeals = JSON.parse(storedMeals);
        // Filter meals for today
        const today = new Date().toISOString().split("T")[0];
        const todayMeals = parsedMeals.filter((m: Meal & { date?: string }) => {
          if (m.date) return m.date === today;
          return true;
        });
        setMeals(todayMeals);
      } catch (e) {
        console.error("Error loading meals:", e);
      }
    }

    // Load macro goals
    const storedGoals = localStorage.getItem("macroGoals");
    if (storedGoals) {
      try {
        const goals = JSON.parse(storedGoals);
        setDailyGoals(goals);
        setMacroSettings(goals);
      } catch (e) {
        console.error("Error loading macro goals:", e);
      }
    } else {
      // Check if there's a custom nutrition plan from onboarding
      const nutritionPlan = localStorage.getItem("customNutritionPlan");
      if (nutritionPlan) {
        try {
          const plan = JSON.parse(nutritionPlan);
          if (plan.dailyCalories && plan.macros) {
            const goals = {
              calories: plan.dailyCalories,
              protein: plan.macros.protein || 150,
              carbs: plan.macros.carbs || 250,
              fats: plan.macros.fats || 65,
            };
            setDailyGoals(goals);
            setMacroSettings(goals);
            localStorage.setItem("macroGoals", JSON.stringify(goals));
          }
        } catch (e) {
          console.error("Error loading nutrition plan:", e);
        }
      }
    }
    
    setIsLoaded(true);
  }, []);

  // Save meals to localStorage whenever meals change (but only after initial load)
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;
    const today = new Date().toISOString().split("T")[0];
    const mealsWithDate = meals.map(meal => ({ ...meal, date: today }));
    
    // Get all meals from localStorage
    const storedMeals = localStorage.getItem("meals");
    let allMeals: (Meal & { date: string })[] = [];
    if (storedMeals) {
      try {
        allMeals = JSON.parse(storedMeals);
      } catch (e) {
        // If parsing fails, start fresh
      }
    }
    
    // Remove today's meals and add new ones
    allMeals = allMeals.filter((m: Meal & { date?: string }) => m.date !== today);
    allMeals = [...allMeals, ...mealsWithDate];
    
    localStorage.setItem("meals", JSON.stringify(allMeals));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent("mealsUpdated"));
  }, [meals, isLoaded]);

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fats: acc.fats + meal.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [meals]);

  // Calculate average calories (for display)
  const averageCalories = useMemo(() => {
    if (meals.length === 0) return 0;
    const storedMeals = localStorage.getItem("meals");
    if (!storedMeals) return 0;
    try {
      const allMeals = JSON.parse(storedMeals);
      const last10Days = allMeals.slice(-10);
      const sum = last10Days.reduce((acc: number, meal: Meal) => acc + (meal.calories || 0), 0);
      return Math.round(sum / Math.max(last10Days.length, 1));
    } catch (e) {
      return 0;
    }
  }, [meals]);

  const handleDeleteMeal = (mealId: string) => {
    setMeals(meals.filter(m => m.id !== mealId));
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
      setShowScanOptions(false);
      setShowScanIntro(false);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg");
        setCapturedImage(imageData);
        stopCamera();
        analyzeFood(imageData);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setCapturedImage(imageData);
        setShowScanOptions(false);
        analyzeFood(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const compressImage = (dataUrl: string, maxWidth: number = 1024, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", quality);
          resolve(compressed);
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const analyzeFood = async (imageData: string) => {
    setIsAnalyzing(true);
    setAiEstimate(null);
    try {
      const compressedImage = await compressImage(imageData, 1024, 0.8);
      
      const response = await fetch("/api/food-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: compressedImage,
          label: foodToScan || "Unknown meal",
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        if (text.includes("OPENAI_API_KEY") || text.includes("API key")) {
          throw new Error("OpenAI API key is not configured.");
        }
        throw new Error("Server returned an invalid response.");
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to analyze food");
      }
      
      if (!data.estimate) {
        throw new Error("No estimate data received");
      }
      
      setAiEstimate(data.estimate);
    } catch (error: any) {
      console.error("AI food analysis failed", error);
      alert(error?.message || "Unable to analyze this photo right now. Please try again.");
      setCapturedImage(null);
      setAiEstimate(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const useAiEstimate = () => {
    if (aiEstimate) {
      setNewMeal({
        name: aiEstimate.name,
        calories: aiEstimate.calories.toString(),
        protein: aiEstimate.protein.toString(),
        carbs: aiEstimate.carbs.toString(),
        fats: aiEstimate.fats.toString(),
      });
      setCapturedImage(null);
      setAiEstimate(null);
      setShowAddMeal(true);
    }
  };

  const handleAddMeal = () => {
    if (newMeal.name && newMeal.calories) {
      setMeals([
        ...meals,
        {
          id: Date.now().toString(),
          name: newMeal.name,
          calories: parseInt(newMeal.calories),
          protein: parseInt(newMeal.protein) || 0,
          carbs: parseInt(newMeal.carbs) || 0,
          fats: parseInt(newMeal.fats) || 0,
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          imageUrl: capturedImage || undefined,
        },
      ]);
      setNewMeal({ name: "", calories: "", protein: "", carbs: "", fats: "" });
      setShowAddMeal(false);
      setCapturedImage(null);
      setAiEstimate(null);
    }
  };

  const caloriesPercentage = dailyGoals.calories > 0 
    ? Math.min(Math.round((totals.calories / dailyGoals.calories) * 100), 100) 
    : 0;
  const proteinPercentage = dailyGoals.protein > 0 
    ? Math.min(Math.round((totals.protein / dailyGoals.protein) * 100), 100) 
    : 0;
  const carbsPercentage = dailyGoals.carbs > 0 
    ? Math.min(Math.round((totals.carbs / dailyGoals.carbs) * 100), 100) 
    : 0;
  const fatsPercentage = dailyGoals.fats > 0 
    ? Math.min(Math.round((totals.fats / dailyGoals.fats) * 100), 100) 
    : 0;

  const remainingCalories = Math.max(0, dailyGoals.calories - totals.calories);

  return (
    <div className="min-h-screen bg-[#050607] text-white px-5 pt-6 pb-28">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Calories</h1>
        <p className="text-sm text-[#9aa7ad]">Today • AI tracked</p>
      </div>

      {/* HERO CALORIES RING */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="w-56 h-56 rounded-full border-[10px] border-[#0ddfc8]/20 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full border-[10px] border-[#14f1d9] flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl font-bold">{totals.calories.toLocaleString()}</p>
              <p className="text-sm text-[#9aa7ad]">of {dailyGoals.calories.toLocaleString()} kcal</p>
              <p className="text-xs mt-1 text-[#14f1d9]">
                {averageCalories > totals.calories ? "↑" : "↓"} {Math.abs(averageCalories - totals.calories)} avg
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MACROS INLINE */}
      <div className="space-y-4 mb-8">
        {[
          { 
            label: "Protein", 
            value: `${totals.protein} / ${dailyGoals.protein}g`, 
            percent: `${proteinPercentage}%`,
            current: totals.protein,
            target: dailyGoals.protein
          },
          { 
            label: "Carbs", 
            value: `${totals.carbs} / ${dailyGoals.carbs}g`, 
            percent: `${carbsPercentage}%`,
            current: totals.carbs,
            target: dailyGoals.carbs
          },
          { 
            label: "Fats", 
            value: `${totals.fats} / ${dailyGoals.fats}g`, 
            percent: `${fatsPercentage}%`,
            current: totals.fats,
            target: dailyGoals.fats
          }
        ].map((m) => (
          <div key={m.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#9aa7ad]">{m.label}</span>
              <span>{m.value}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#14f1d9]"
                style={{ width: m.percent }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* MEALS TIMELINE */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Today's Meals</h2>

        <div className="space-y-4">
          {meals.length > 0 ? (
            meals.map((meal) => (
              <div
                key={meal.id}
                className="flex justify-between items-center bg-[rgba(20,30,35,0.85)] rounded-xl p-4 border border-white/5"
              >
                <div>
                  <p className="font-medium">{meal.name}</p>
                  <p className="text-xs text-[#9aa7ad]">{meal.time}</p>
                  <p className="text-sm mt-1">{meal.calories} kcal</p>
                  <p className="text-xs text-[#9aa7ad]">
                    P{meal.protein}g • C{meal.carbs}g • F{meal.fats}g
                  </p>
                </div>
                <button 
                  onClick={() => handleDeleteMeal(meal.id)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#9aa7ad] text-center py-4">No meals logged today</p>
          )}
        </div>
      </div>

      {/* AI PLAN */}
      <div className="bg-[rgba(20,30,35,0.6)] rounded-2xl p-5 border border-white/5">
        <p className="text-sm text-[#9aa7ad] mb-1">AI Plan</p>
        <p className="text-lg font-semibold mb-2">
          {remainingCalories.toLocaleString()} kcal remaining
        </p>
        <p className="text-sm text-[#9aa7ad]">
          Suggested: High-protein dinner + carb-based snack post workout
        </p>
        <button 
          onClick={() => setShowAddMeal(true)}
          className="mt-4 w-full rounded-xl bg-[#14f1d9] text-black py-3 font-medium hover:bg-[#0ddfc8] transition-colors"
        >
          Log AI Suggestion
        </button>
      </div>

      {/* FLOATING ADD BUTTON */}
      <button 
        onClick={() => setShowAddMeal(true)}
        className="fixed bottom-24 right-6 w-16 h-16 rounded-full bg-[#14f1d9] text-black text-3xl shadow-lg shadow-[#14f1d9]/30 hover:bg-[#0ddfc8] transition-colors flex items-center justify-center"
      >
        +
      </button>

      {/* ADD MEAL MODAL */}
      {showAddMeal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141e23] rounded-2xl p-6 max-w-md w-full border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add Meal</h2>
              <button
                onClick={() => {
                  setShowAddMeal(false);
                  setNewMeal({ name: "", calories: "", protein: "", carbs: "", fats: "" });
                  setCapturedImage(null);
                  setAiEstimate(null);
                }}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiEstimate && (
              <div className="mb-4 p-3 bg-[#0ddfc8]/10 rounded-lg border border-[#14f1d9]/20">
                <p className="text-sm text-[#14f1d9] mb-2">AI Estimate Available</p>
                <button
                  onClick={useAiEstimate}
                  className="text-sm text-[#14f1d9] hover:underline"
                >
                  Use AI Estimate →
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Food Name</label>
                <input
                  type="text"
                  value={newMeal.name}
                  onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#14f1d9]"
                  placeholder="e.g., Grilled chicken"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Calories</label>
                  <input
                    type="number"
                    value={newMeal.calories}
                    onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Protein (g)</label>
                  <input
                    type="number"
                    value={newMeal.protein}
                    onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Carbs (g)</label>
                  <input
                    type="number"
                    value={newMeal.carbs}
                    onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fats (g)</label>
                  <input
                    type="number"
                    value={newMeal.fats}
                    onChange={(e) => setNewMeal({ ...newMeal, fats: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="10"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setFoodToScan("");
                    setShowScanIntro(true);
                    setShowAddMeal(false);
                  }}
                  className="flex-1 py-3 bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg font-medium hover:bg-[rgba(20,30,35,1)] transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Scan
                </button>
                <button
                  onClick={handleAddMeal}
                  className="flex-1 py-3 bg-[#14f1d9] text-black rounded-lg font-medium hover:bg-[#0ddfc8] transition-colors"
                >
                  Add Meal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCAN INTRO MODAL */}
      {showScanIntro && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141e23] rounded-2xl p-6 max-w-md w-full border border-white/10">
            <h2 className="text-xl font-semibold mb-2">Confirm Food</h2>
            <p className="text-sm text-[#9aa7ad] mb-4">
              Let me know what food you're about to scan so I can label it correctly.
            </p>
            <input
              type="text"
              value={foodToScan}
              onChange={(e) => setFoodToScan(e.target.value)}
              placeholder="e.g., Grilled chicken salad"
              className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-3 text-sm mb-4 focus:outline-none focus:border-[#14f1d9]"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowScanIntro(false);
                  setFoodToScan("");
                }}
                className="flex-1 py-3 bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg font-medium hover:bg-[rgba(20,30,35,1)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowScanOptions(true);
                  setShowScanIntro(false);
                }}
                className="flex-1 py-3 bg-[#14f1d9] text-black rounded-lg font-medium hover:bg-[#0ddfc8] transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCAN OPTIONS MODAL */}
      {showScanOptions && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141e23] rounded-2xl p-6 max-w-md w-full border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Scan Food</h2>
              <button
                onClick={() => {
                  setShowScanOptions(false);
                  setFoodToScan("");
                }}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={startCamera}
                className="w-full py-4 bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg font-medium hover:bg-[rgba(20,30,35,1)] transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Use Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg font-medium hover:bg-[rgba(20,30,35,1)] transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Photo
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* CAMERA VIEW */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50">
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
              <button
                onClick={stopCamera}
                className="px-6 py-3 bg-red-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="px-6 py-3 bg-[#14f1d9] text-black rounded-lg font-medium"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI ESTIMATE MODAL */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#141e23] rounded-2xl p-6 border border-white/10">
            <p className="text-lg font-semibold mb-2">Analyzing food...</p>
            <p className="text-sm text-[#9aa7ad]">Please wait</p>
          </div>
        </div>
      )}

      {/* MACRO SETTINGS MODAL */}
      {showMacroSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141e23] rounded-2xl p-6 max-w-md w-full border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Macro Goals</h2>
              <button
                onClick={() => setShowMacroSettings(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Calories</label>
                <input
                  type="number"
                  value={macroSettings.calories}
                  onChange={(e) => setMacroSettings({ ...macroSettings, calories: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Protein (g)</label>
                <input
                  type="number"
                  value={macroSettings.protein}
                  onChange={(e) => setMacroSettings({ ...macroSettings, protein: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Carbs (g)</label>
                <input
                  type="number"
                  value={macroSettings.carbs}
                  onChange={(e) => setMacroSettings({ ...macroSettings, carbs: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fats (g)</label>
                <input
                  type="number"
                  value={macroSettings.fats}
                  onChange={(e) => setMacroSettings({ ...macroSettings, fats: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <button
                onClick={() => {
                  setDailyGoals(macroSettings);
                  localStorage.setItem("macroGoals", JSON.stringify(macroSettings));
                  setShowMacroSettings(false);
                }}
                className="w-full py-3 bg-[#14f1d9] text-black rounded-lg font-medium hover:bg-[#0ddfc8] transition-colors"
              >
                Save Goals
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
