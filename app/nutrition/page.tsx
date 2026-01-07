"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { Upload, Camera, X, Settings, MessageSquare } from "lucide-react";
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
  const [showAIConsultation, setShowAIConsultation] = useState(false);
  const [aiConsultationMessage, setAiConsultationMessage] = useState("");
  const [aiConsultationResponse, setAiConsultationResponse] = useState("");
  const [isConsultingAI, setIsConsultingAI] = useState(false);
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

  // Save meals to localStorage whenever meals change
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;
    const today = new Date().toISOString().split("T")[0];
    const mealsWithDate = meals.map(meal => ({ ...meal, date: today }));
    
    const storedMeals = localStorage.getItem("meals");
    let allMeals: (Meal & { date: string })[] = [];
    if (storedMeals) {
      try {
        allMeals = JSON.parse(storedMeals);
      } catch (e) {}
    }
    
    allMeals = allMeals.filter((m: Meal & { date?: string }) => m.date !== today);
    allMeals = [...allMeals, ...mealsWithDate];
    
    localStorage.setItem("meals", JSON.stringify(allMeals));
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

  const handleAIConsultation = async () => {
    if (!aiConsultationMessage.trim()) return;
    setIsConsultingAI(true);
    setAiConsultationResponse("");
    
    try {
      const response = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: aiConsultationMessage,
          context: {
            currentCalories: totals.calories,
            currentGoals: dailyGoals,
            currentMacros: {
              protein: totals.protein,
              carbs: totals.carbs,
              fats: totals.fats,
            },
          },
        }),
      });

      const data = await response.json();
      if (response.ok && data.response) {
        setAiConsultationResponse(data.response);
      } else {
        throw new Error(data.error || "Failed to get AI response");
      }
    } catch (error: any) {
      console.error("AI consultation failed", error);
      alert(error?.message || "Unable to get AI consultation. Please try again.");
    } finally {
      setIsConsultingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050607] text-white px-4 pt-4 pb-28">
      {/* HEADER */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Calories</h1>
          <p className="text-xs text-[#9aa7ad]">Today • AI tracked</p>
        </div>
            <div className="flex items-center gap-2">
              <button
            onClick={() => setShowAIConsultation(true)}
            className="px-3 py-1.5 bg-[rgba(20,30,35,0.85)] border border-white/10 text-white rounded-lg text-xs font-medium hover:bg-[rgba(20,30,35,1)] transition-colors flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            AI Coach
              </button>
              <button
            onClick={() => setShowAddMeal(true)}
            className="px-3 py-1.5 bg-[#14f1d9] text-black rounded-lg text-xs font-medium hover:bg-[#0ddfc8] transition-colors flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
            Add/Scan
              </button>
            </div>
      </div>

      {/* CALORIES CIRCLE + MACROS - Compact horizontal layout */}
      <div className="mb-4 flex items-center gap-4">
        {/* Small Calories Circle - Top Left */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 rounded-full border-[6px] border-[#0ddfc8]/20 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-[6px] border-[#14f1d9] flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-bold leading-none">{totals.calories.toLocaleString()}</p>
                <p className="text-[9px] text-[#9aa7ad] mt-0.5">/{dailyGoals.calories.toLocaleString()}</p>
                <p className="text-[8px] text-[#14f1d9] mt-0.5">{caloriesPercentage}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Macros Progress Bars - Next to circle */}
        <div className="flex-1 space-y-2">
          {[
            { label: "P", value: totals.protein, target: dailyGoals.protein, percent: proteinPercentage },
            { label: "C", value: totals.carbs, target: dailyGoals.carbs, percent: carbsPercentage },
            { label: "F", value: totals.fats, target: dailyGoals.fats, percent: fatsPercentage },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-2">
              <span className="text-[10px] text-[#9aa7ad] w-3">{m.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#14f1d9]"
                  style={{ width: `${m.percent}%` }}
                />
                </div>
              <span className="text-[9px] text-[#9aa7ad] w-12 text-right">
                {m.value}/{m.target}g
              </span>
              </div>
          ))}
            </div>
          </div>

      {/* MEALS BOX - Compact */}
      <div className="mb-4 bg-[rgba(20,30,35,0.85)] rounded-xl p-3 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Today's Meals</h2>
                <button
            onClick={() => setShowMacroSettings(true)}
            className="text-[10px] text-[#9aa7ad] hover:text-[#14f1d9] transition-colors"
                >
            Edit Goals
                </button>
        </div>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {meals.length > 0 ? (
            meals.map((meal) => (
              <div
                key={meal.id}
                className="flex justify-between items-start bg-[rgba(10,15,20,0.6)] rounded-lg p-2.5 border border-white/5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{meal.name}</p>
                    <span className="text-[10px] text-[#9aa7ad]">{meal.time}</span>
              </div>
                  <div className="flex items-center gap-2 text-[10px] text-[#9aa7ad]">
                    <span className="font-semibold text-white">{meal.calories} kcal</span>
                    <span>•</span>
                    <span>P{meal.protein}g</span>
                    <span>C{meal.carbs}g</span>
                    <span>F{meal.fats}g</span>
            </div>
          </div>
              <button
                  onClick={() => handleDeleteMeal(meal.id)}
                  className="text-white/30 hover:text-white transition-colors ml-2 flex-shrink-0"
              >
                  <X className="w-4 h-4" />
              </button>
            </div>
            ))
          ) : (
            <p className="text-xs text-[#9aa7ad] text-center py-3">No meals logged today</p>
          )}
            </div>
          </div>


      {/* ADD MEAL MODAL */}
      {showAddMeal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141e23] rounded-2xl p-5 max-w-md w-full border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Add Meal</h2>
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

            <div className="space-y-3">
                <div>
                <label className="block text-sm font-medium mb-1.5">Food Name</label>
                  <input
                    type="text"
                    value={newMeal.name}
                    onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                  placeholder="e.g., Grilled chicken"
                  />
                </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Calories</label>
                  <input
                    type="number"
                    value={newMeal.calories}
                    onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="200"
                  />
                </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Protein (g)</label>
                    <input
                      type="number"
                      value={newMeal.protein}
                      onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="20"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Carbs (g)</label>
                    <input
                      type="number"
                      value={newMeal.carbs}
                      onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="30"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Fats (g)</label>
                    <input
                      type="number"
                      value={newMeal.fats}
                      onChange={(e) => setNewMeal({ ...newMeal, fats: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="10"
                    />
                  </div>
                </div>
              <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                    setFoodToScan("");
                    setShowScanIntro(true);
                      setShowAddMeal(false);
                  }}
                  className="flex-1 py-2.5 bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg font-medium hover:bg-[rgba(20,30,35,1)] transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Camera className="w-4 h-4" />
                  Scan
                </button>
                <button
                  onClick={handleAddMeal}
                  className="flex-1 py-2.5 bg-[#14f1d9] text-black rounded-lg font-medium hover:bg-[#0ddfc8] transition-colors text-sm"
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
          <div className="bg-[#141e23] rounded-2xl p-5 max-w-md w-full border border-white/10">
            <h2 className="text-lg font-semibold mb-2">Confirm Food</h2>
            <p className="text-sm text-[#9aa7ad] mb-4">
              Let me know what food you're about to scan so I can label it correctly.
            </p>
            <input
              type="text"
              value={foodToScan}
              onChange={(e) => setFoodToScan(e.target.value)}
              placeholder="e.g., Grilled chicken salad"
              className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm mb-4 focus:outline-none focus:border-[#14f1d9]"
            />
            <div className="flex gap-2">
          <button
            onClick={() => {
                  setShowScanIntro(false);
                  setFoodToScan("");
                }}
                className="flex-1 py-2.5 bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg font-medium hover:bg-[rgba(20,30,35,1)] transition-colors text-sm"
              >
                Cancel
          </button>
          <button
            onClick={() => {
                  setShowScanOptions(true);
                  setShowScanIntro(false);
                }}
                className="flex-1 py-2.5 bg-[#14f1d9] text-black rounded-lg font-medium hover:bg-[#0ddfc8] transition-colors text-sm"
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
          <div className="bg-[#141e23] rounded-2xl p-5 max-w-md w-full border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Scan Food</h2>
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
            <div className="space-y-2">
                <button
                onClick={startCamera}
                className="w-full py-3 bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg font-medium hover:bg-[rgba(20,30,35,1)] transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Camera className="w-4 h-4" />
                Use Camera
                </button>
                <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg font-medium hover:bg-[rgba(20,30,35,1)] transition-colors flex items-center justify-center gap-2 text-sm"
                >
                <Upload className="w-4 h-4" />
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
                className="px-6 py-3 bg-red-600 rounded-lg font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="px-6 py-3 bg-[#14f1d9] text-black rounded-lg font-medium text-sm"
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

      {/* AI CONSULTATION MODAL */}
      {showAIConsultation && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141e23] rounded-2xl p-5 max-w-md w-full border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#14f1d9]" />
                <h2 className="text-lg font-semibold">AI Nutrition Coach</h2>
              </div>
                <button
                onClick={() => {
                  setShowAIConsultation(false);
                  setAiConsultationResponse("");
                  setAiConsultationMessage("");
                }}
                className="text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            {!aiConsultationResponse ? (
                    <div>
                <textarea
                  value={aiConsultationMessage}
                  onChange={(e) => setAiConsultationMessage(e.target.value)}
                  placeholder="Ask: How should I change my calorie plan now that I've lost weight?"
                  className="w-full bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg p-3 text-sm mb-3 focus:outline-none focus:border-[#14f1d9] resize-none"
                  rows={4}
                />
                <button
                  onClick={handleAIConsultation}
                  disabled={isConsultingAI || !aiConsultationMessage.trim()}
                  className="w-full py-2.5 bg-[#14f1d9] text-black rounded-lg text-sm font-medium hover:bg-[#0ddfc8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConsultingAI ? "Consulting AI..." : "Ask AI"}
                </button>
                  </div>
                ) : (
                        <div>
                <p className="text-sm text-[#9aa7ad] mb-4 whitespace-pre-wrap">{aiConsultationResponse}</p>
                        <button
                          onClick={() => {
                    setAiConsultationResponse("");
                    setAiConsultationMessage("");
                          }}
                  className="w-full py-2.5 bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg text-sm font-medium hover:bg-[rgba(10,15,20,0.8)] transition-colors"
                        >
                  New Question
                        </button>
                      </div>
            )}
            </div>
          </div>
        )}

      {/* MACRO SETTINGS MODAL */}
      {showMacroSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141e23] rounded-2xl p-5 max-w-md w-full border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Edit Macro Goals</h2>
              <button
                onClick={() => setShowMacroSettings(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Calories</label>
                <input
                  type="number"
                  value={macroSettings.calories}
                  onChange={(e) => setMacroSettings({ ...macroSettings, calories: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Protein (g)</label>
                <input
                  type="number"
                  value={macroSettings.protein}
                  onChange={(e) => setMacroSettings({ ...macroSettings, protein: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Carbs (g)</label>
                <input
                  type="number"
                  value={macroSettings.carbs}
                  onChange={(e) => setMacroSettings({ ...macroSettings, carbs: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Fats (g)</label>
                <input
                  type="number"
                  value={macroSettings.fats}
                  onChange={(e) => setMacroSettings({ ...macroSettings, fats: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <button
                onClick={() => {
                  setDailyGoals(macroSettings);
                  localStorage.setItem("macroGoals", JSON.stringify(macroSettings));
                  setShowMacroSettings(false);
                }}
                className="w-full py-2.5 bg-[#14f1d9] text-black rounded-lg font-medium hover:bg-[#0ddfc8] transition-colors text-sm"
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
