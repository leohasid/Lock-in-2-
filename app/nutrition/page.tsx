"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Upload, Camera, X, Settings, ArrowRight, ChevronRight } from "lucide-react";
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
  const [showAllMeals, setShowAllMeals] = useState(false);
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
          // If no date, assume it's today (for backward compatibility)
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
  }, [meals, isLoaded]);

  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fats: acc.fats + meal.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera on mobile
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
          resolve(dataUrl); // Fallback to original if canvas fails
        }
      };
      img.onerror = () => resolve(dataUrl); // Fallback to original on error
      img.src = dataUrl;
    });
  };

  const analyzeFood = async (imageData: string) => {
    setIsAnalyzing(true);
    setAiEstimate(null);
    try {
      // Compress image before sending to reduce size
      const compressedImage = await compressImage(imageData, 1024, 0.8);
      
      const response = await fetch("/api/food-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: compressedImage,
          label: foodToScan || "Unknown meal",
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response from API:", text.substring(0, 200));
        
        // Check for common error scenarios
        if (text.includes("OPENAI_API_KEY") || text.includes("API key")) {
          throw new Error("OpenAI API key is not configured. Please add OPENAI_API_KEY to your Vercel environment variables.");
        } else if (text.includes("404") || text.includes("Not Found")) {
          throw new Error("API endpoint not found. Please check your deployment.");
        } else if (text.includes("500") || text.includes("Internal Server Error")) {
          throw new Error("Server error. Please check your API configuration and try again.");
        } else {
          throw new Error("Server returned an invalid response. Please check your API configuration.");
        }
      }

      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data.error || "Unable to analyze food";
        console.error("Food estimate API error:", errorMsg);
        alert(errorMsg);
        setCapturedImage(null);
        setAiEstimate(null);
        return;
      }
      
      if (!data.estimate) {
        throw new Error("No estimate data received");
      }
      
      setAiEstimate(data.estimate);
    } catch (error: any) {
      console.error("AI food analysis failed", error);
      const errorMsg = error?.message || "Unable to analyze this photo right now. Please try again.";
      alert(errorMsg);
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
          time: new Date().toLocaleTimeString(),
          imageUrl: capturedImage || undefined,
        },
      ]);
      setNewMeal({ name: "", calories: "", protein: "", carbs: "", fats: "" });
      setShowAddMeal(false);
      setCapturedImage(null);
      setAiEstimate(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-3">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-white">🥗 Nutrition & Calories</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMacroSettings(dailyGoals);
                  setShowMacroSettings(true);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Macros</span>
              </button>
              <button
                onClick={() => {
                  setFoodToScan("");
                  setShowScanIntro(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan Food</span>
              </button>
              <button
                onClick={() => setShowAddMeal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                + Add Meal
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

        {/* Scan Intro Modal */}
        {showScanIntro && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-800">
              <h2 className="text-2xl font-bold text-white mb-2">⚠️ Confirm Food</h2>
              <p className="text-gray-400 text-sm mb-4">
                Let me know what food you&apos;re about to scan so I can label it correctly.
              </p>
              <input
                type="text"
                value={foodToScan}
                onChange={(e) => setFoodToScan(e.target.value)}
                placeholder="e.g., Grilled chicken salad"
                className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 mb-4"
              />
              {foodToScan.trim().length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-300 mb-4">
                  <p className="text-orange-400 font-semibold mb-1">About to scan:</p>
                  <p>{foodToScan}</p>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    if (!foodToScan.trim()) {
                      alert("Please enter a food description before scanning.");
                      return;
                    }
                    setShowScanIntro(false);
                    setShowScanOptions(true);
                  }}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-black px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Continue
                </button>
                <button
                  onClick={() => {
                    setShowScanIntro(false);
                    setFoodToScan("");
                  }}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scan Options Modal */}
        {showScanOptions && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-800">
              <h2 className="text-2xl font-bold text-white mb-2">Scan Your Food</h2>
              {foodToScan.trim().length > 0 && (
                <p className="text-sm text-gray-400 mb-4">
                  Scanning: <span className="text-white font-semibold">{foodToScan}</span>
                </p>
              )}
              <div className="space-y-4">
                <button
                  onClick={startCamera}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-black px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3"
                >
                  <Camera className="w-6 h-6" />
                  Take Photo
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowScanOptions(false);
                    setShowScanIntro(false);
                  }}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3"
                >
                  <Upload className="w-6 h-6" />
                  Upload from Gallery
                </button>
                <button
                  onClick={() => {
                    setShowScanOptions(false);
                    setShowScanIntro(false);
                  }}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex-1 relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <button
                onClick={stopCamera}
                className="absolute top-4 right-4 bg-gray-900/80 text-white p-3 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-gray-900 p-6 border-t border-gray-800">
              <button
                onClick={capturePhoto}
                className="w-full bg-orange-500 hover:bg-orange-600 text-black py-4 rounded-lg font-semibold text-lg mb-3"
              >
                Capture Photo
              </button>
              <button
                onClick={() => {
                  stopCamera();
                  setShowScanOptions(true);
                }}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold"
              >
                Back to Options
              </button>
            </div>
          </div>
        )}

        {/* AI Analysis Result */}
        {capturedImage && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-800">
              {isAnalyzing ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-white text-lg">Analyzing food with AI...</p>
                  <p className="text-gray-400 text-sm mt-2">Estimating macros...</p>
                </div>
              ) : aiEstimate ? (
                <div>
                  <div className="mb-4">
                    <img
                      src={capturedImage}
                      alt="Captured food"
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                    <h3 className="text-xl font-bold text-white mb-2">AI Analysis</h3>
                    <p className="text-gray-300 mb-4">{aiEstimate.name}</p>
                    <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-gray-300">
                        <span>Calories:</span>
                        <span className="text-white font-semibold">{aiEstimate.calories} kcal</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Protein:</span>
                        <span className="text-white font-semibold">{aiEstimate.protein}g</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Carbs:</span>
                        <span className="text-white font-semibold">{aiEstimate.carbs}g</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Fats:</span>
                        <span className="text-white font-semibold">{aiEstimate.fats}g</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={useAiEstimate}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Use Estimate
                    </button>
                    <button
                      onClick={() => {
                        setCapturedImage(null);
                        setAiEstimate(null);
                      }}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Retake
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Add Meal Modal */}
        {showAddMeal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-800">
              <h2 className="text-2xl font-bold text-white mb-6">Add Meal</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Meal Name</label>
                  <input
                    type="text"
                    value={newMeal.name}
                    onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                    placeholder="e.g., Grilled Chicken Breast"
                    className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Calories</label>
                  <input
                    type="number"
                    value={newMeal.calories}
                    onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
                    placeholder="0"
                    className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2 text-sm">Protein (g)</label>
                    <input
                      type="number"
                      value={newMeal.protein}
                      onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })}
                      placeholder="0"
                      className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 text-sm">Carbs (g)</label>
                    <input
                      type="number"
                      value={newMeal.carbs}
                      onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })}
                      placeholder="0"
                      className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 text-sm">Fats (g)</label>
                    <input
                      type="number"
                      value={newMeal.fats}
                      onChange={(e) => setNewMeal({ ...newMeal, fats: e.target.value })}
                      placeholder="0"
                      className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleAddMeal}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Add Meal
                  </button>
                  <button
                    onClick={() => {
                      setShowAddMeal(false);
                      setNewMeal({ name: "", calories: "", protein: "", carbs: "", fats: "" });
                    }}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-sm text-gray-400 text-center">
                  💡 Tip: Use the camera to scan your food for automatic macro estimation
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Daily Goals & Progress - All macros visible */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <button
            onClick={() => {
              setMacroSettings(dailyGoals);
              setShowMacroSettings(true);
            }}
            className="bg-gray-900 rounded-lg p-3 border border-gray-800 hover:border-orange-500/50 transition-colors text-left"
          >
            <div className="text-[10px] text-gray-400 mb-0.5">Calories</div>
            <div className="text-lg font-bold text-white mb-1">
              {totals.calories} / {dailyGoals.calories}
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1">
              <div
                className="bg-orange-500 h-1 rounded-full"
                style={{ width: `${Math.min((totals.calories / dailyGoals.calories) * 100, 100)}%` }}
              />
            </div>
          </button>
          <button
            onClick={() => {
              setMacroSettings(dailyGoals);
              setShowMacroSettings(true);
            }}
            className="bg-gray-900 rounded-lg p-3 border border-gray-800 hover:border-blue-500/50 transition-colors text-left"
          >
            <div className="text-[10px] text-gray-400 mb-0.5">Protein</div>
            <div className="text-lg font-bold text-white mb-1">
              {totals.protein}g / {dailyGoals.protein}g
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full"
                style={{ width: `${Math.min((totals.protein / dailyGoals.protein) * 100, 100)}%` }}
              />
            </div>
          </button>
          <button
            onClick={() => {
              setMacroSettings(dailyGoals);
              setShowMacroSettings(true);
            }}
            className="bg-gray-900 rounded-lg p-3 border border-gray-800 hover:border-green-500/50 transition-colors text-left"
          >
            <div className="text-[10px] text-gray-400 mb-0.5">Carbs</div>
            <div className="text-lg font-bold text-white mb-1">
              {totals.carbs}g / {dailyGoals.carbs}g
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1">
              <div
                className="bg-green-600 h-1 rounded-full"
                style={{ width: `${Math.min((totals.carbs / dailyGoals.carbs) * 100, 100)}%` }}
              />
            </div>
          </button>
          <button
            onClick={() => {
              setMacroSettings(dailyGoals);
              setShowMacroSettings(true);
            }}
            className="bg-gray-900 rounded-lg p-3 border border-gray-800 hover:border-yellow-500/50 transition-colors text-left"
          >
            <div className="text-[10px] text-gray-400 mb-0.5">Fats</div>
            <div className="text-lg font-bold text-white mb-1">
              {totals.fats}g / {dailyGoals.fats}g
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1">
              <div
                className="bg-yellow-600 h-1 rounded-full"
                style={{ width: `${Math.min((totals.fats / dailyGoals.fats) * 100, 100)}%` }}
              />
            </div>
          </button>
        </div>

        {/* Meals List */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Today&apos;s Meals</h2>
            {meals.length > 2 && (
              <button
                onClick={() => setShowAllMeals(true)}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                View All
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {meals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm mb-3">No meals logged today</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    setFoodToScan("");
                    setShowScanIntro(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  Scan Food
                </button>
                <button
                  onClick={() => setShowAddMeal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  Add Manually
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {(showAllMeals ? meals : meals.slice(0, 2)).map((meal) => (
                <div key={meal.id} className="bg-gray-800 rounded-lg p-3">
                  {meal.imageUrl && (
                    <img
                      src={meal.imageUrl}
                      alt={meal.name}
                      className="w-full h-24 object-cover rounded-lg mb-2"
                    />
                  )}
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <h3 className="text-white font-semibold text-sm">{meal.name}</h3>
                      <p className="text-gray-400 text-xs">{meal.time}</p>
                    </div>
                    <button
                      onClick={() => setMeals(meals.filter((m) => m.id !== meal.id))}
                      className="text-red-400 hover:text-red-300 text-lg"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-300">
                    <span>{meal.calories} cal</span>
                    <span>P: {meal.protein}g</span>
                    <span>C: {meal.carbs}g</span>
                    <span>F: {meal.fats}g</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View All Meals Modal */}
        {showAllMeals && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl p-4 max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Today&apos;s Meals</h2>
                <button
                  onClick={() => setShowAllMeals(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                {meals.map((meal) => (
                  <div key={meal.id} className="bg-gray-800 rounded-lg p-3">
                    {meal.imageUrl && (
                      <img
                        src={meal.imageUrl}
                        alt={meal.name}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-white font-semibold">{meal.name}</h3>
                        <p className="text-gray-400 text-sm">{meal.time}</p>
                      </div>
                      <button
                        onClick={() => {
                          setMeals(meals.filter((m) => m.id !== meal.id));
                          if (meals.length === 1) setShowAllMeals(false);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-300">
                      <span>{meal.calories} cal</span>
                      <span>P: {meal.protein}g</span>
                      <span>C: {meal.carbs}g</span>
                      <span>F: {meal.fats}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="pb-20">
        {/* Spacer for bottom navigation */}
      </div>
      <BottomNav />

      {/* Macro Settings Modal */}
      {showMacroSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Edit Macro Targets</h2>
              <button
                onClick={() => setShowMacroSettings(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Daily Calories</label>
                <input
                  type="number"
                  value={macroSettings.calories}
                  onChange={(e) =>
                    setMacroSettings({
                      ...macroSettings,
                      calories: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Protein (grams)</label>
                <input
                  type="number"
                  value={macroSettings.protein}
                  onChange={(e) =>
                    setMacroSettings({
                      ...macroSettings,
                      protein: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Carbs (grams)</label>
                <input
                  type="number"
                  value={macroSettings.carbs}
                  onChange={(e) =>
                    setMacroSettings({
                      ...macroSettings,
                      carbs: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Fats (grams)</label>
                <input
                  type="number"
                  value={macroSettings.fats}
                  onChange={(e) =>
                    setMacroSettings({
                      ...macroSettings,
                      fats: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMacroSettings(false)}
                className="flex-1 p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setDailyGoals(macroSettings);
                  localStorage.setItem("macroGoals", JSON.stringify(macroSettings));
                  setShowMacroSettings(false);
                }}
                className="flex-1 p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
