"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { Upload, Camera, X, Settings, MessageSquare, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sugar: number;
  sodium: number;
  fiber: number;
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
    sugar: "",
    sodium: "",
    fiber: "",
  });

  const [dailyGoals, setDailyGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fats: 65,
    sugar: 50,
    sodium: 2300,
    fiber: 30,
  });

  const [showMacroSettings, setShowMacroSettings] = useState(false);
  const [macroSettings, setMacroSettings] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fats: 65,
    sugar: 50,
    sodium: 2300,
    fiber: 30,
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
              sugar: 50,
              sodium: 2300,
              fiber: 30,
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

  // Ensure video plays when camera is shown
  useEffect(() => {
    if (showCamera && streamRef.current) {
      const stream = streamRef.current;
      
      console.log("[Camera] useEffect triggered - showCamera:", showCamera);
      console.log("[Camera] Stream active:", stream.active);
      console.log("[Camera] Video tracks:", stream.getVideoTracks().length);
      
      // Check if stream is still active, if not, re-request
      if (!stream.active) {
        console.error("[Camera] Stream is not active!");
        return;
      }
      
      // Verify we have the back camera
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log("[Camera] Video track settings:", settings);
        console.log("[Camera] Facing mode:", settings.facingMode);
        
        // If we have front camera, warn but continue
        if (settings.facingMode === "user") {
          console.warn("[Camera] ⚠️ Using front camera instead of back camera!");
        } else if (settings.facingMode === "environment") {
          console.log("[Camera] ✅ Using back camera (correct)");
        }
      }
      
      // Use requestAnimationFrame for better timing
      const initVideo = () => {
        if (!videoRef.current) {
          console.error("[Camera] Video element not found in DOM, retrying...");
          setTimeout(initVideo, 100);
          return;
        }
        
        const video = videoRef.current;
        console.log("[Camera] Video element found");
        console.log("[Camera] Video readyState:", video.readyState);
        console.log("[Camera] Video srcObject:", video.srcObject ? "SET" : "NOT SET");
        
        // Always set the stream (even if already set, to ensure it's correct)
        console.log("[Camera] Setting video srcObject");
        video.srcObject = stream;
        
        // Force load and play
        video.load();
        
        // Wait for video to be ready, then play
        const playVideo = () => {
          console.log("[Camera] Attempting to play, readyState:", video.readyState);
          
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA
            console.log("[Camera] Video ready, attempting to play");
            const playPromise = video.play();
            
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  console.log("[Camera] ✅ Video playing successfully");
                  console.log("[Camera] Video dimensions:", video.videoWidth, "x", video.videoHeight);
                  console.log("[Camera] Video paused:", video.paused);
                })
                .catch((err) => {
                  console.error("[Camera] ❌ Error playing video:", err);
                  // Retry after a short delay
                  setTimeout(playVideo, 300);
                });
            }
          } else {
            console.log("[Camera] Video not ready yet, readyState:", video.readyState);
            // Wait for loadedmetadata event
            const handler = () => {
              console.log("[Camera] loadedmetadata event fired");
              playVideo();
            };
            video.addEventListener('loadedmetadata', handler, { once: true });
            // Also try after a timeout
            setTimeout(() => {
              video.removeEventListener('loadedmetadata', handler);
              playVideo();
            }, 1000);
          }
        };
        
        // Try to play immediately
        playVideo();
      };
      
      // Use multiple strategies to ensure DOM is ready
      requestAnimationFrame(() => {
        setTimeout(initVideo, 200);
      });
    }
  }, [showCamera]);

  const totals = useMemo(() => {
    return meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + (meal.protein || 0),
      carbs: acc.carbs + (meal.carbs || 0),
      fats: acc.fats + (meal.fats || 0),
      sugar: acc.sugar + (meal.sugar || 0),
      sodium: acc.sodium + (meal.sodium || 0),
      fiber: acc.fiber + (meal.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0, sodium: 0, fiber: 0 }
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
  const sugarPercentage = dailyGoals.sugar > 0 
    ? Math.min(Math.round((totals.sugar / dailyGoals.sugar) * 100), 100) 
    : 0;
  const sodiumPercentage = dailyGoals.sodium > 0 
    ? Math.min(Math.round((totals.sodium / dailyGoals.sodium) * 100), 100) 
    : 0;
  const fiberPercentage = dailyGoals.fiber > 0 
    ? Math.min(Math.round((totals.fiber / dailyGoals.fiber) * 100), 100) 
    : 0;

  // Check if at least one macro target is hit (>= 100%)
  const hasTargetHit = useMemo(() => {
    return caloriesPercentage >= 100 || proteinPercentage >= 100 || carbsPercentage >= 100 || fatsPercentage >= 100;
  }, [caloriesPercentage, proteinPercentage, carbsPercentage, fatsPercentage]);

  const [mealAnalysis, setMealAnalysis] = useState<string | null>(null);
  const [isAnalyzingMeals, setIsAnalyzingMeals] = useState(false);

  // Fetch meal analysis when at least one target is hit
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded || !hasTargetHit || meals.length === 0) return;
    
    const todayStr = new Date().toISOString().split("T")[0];
    const analysisKey = `mealAnalysis_${todayStr}`;
    
    // Check if analysis already exists for today
    const storedAnalysis = localStorage.getItem(analysisKey);
    if (storedAnalysis) {
      setMealAnalysis(storedAnalysis);
      return;
    }

    // Fetch analysis if not already analyzing
    if (!isAnalyzingMeals && mealAnalysis === null) {
      const fetchAnalysis = async () => {
        setIsAnalyzingMeals(true);
        try {
          const response = await fetch("/api/meal-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              meals,
              totals,
              goals: dailyGoals,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.analysis) {
              setMealAnalysis(data.analysis);
              // Store analysis for today
              localStorage.setItem(analysisKey, data.analysis);
            }
          }
        } catch (error) {
          console.error("Error fetching meal analysis:", error);
        } finally {
          setIsAnalyzingMeals(false);
        }
      };

      fetchAnalysis();
    }
  }, [hasTargetHit, meals, totals, dailyGoals, isLoaded, isAnalyzingMeals, mealAnalysis]);

  const handleDeleteMeal = (mealId: string) => {
    setMeals(meals.filter(m => m.id !== mealId));
  };

  const handleManualMealAnalysis = async () => {
    if (meals.length === 0) {
      alert("Please add at least one meal before analyzing.");
      return;
    }

    setIsAnalyzingMeals(true);
    try {
      const response = await fetch("/api/meal-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meals,
          totals,
          goals: dailyGoals,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.analysis) {
          const todayStr = new Date().toISOString().split("T")[0];
          const analysisKey = `mealAnalysis_${todayStr}`;
          setMealAnalysis(data.analysis);
          // Store analysis for today
          localStorage.setItem(analysisKey, data.analysis);
          // Close the AI Coach modal
          setShowAIConsultation(false);
          setAiConsultationResponse("");
          setAiConsultationMessage("");
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to analyze meals. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching meal analysis:", error);
      alert("Failed to analyze meals. Please try again.");
    } finally {
      setIsAnalyzingMeals(false);
    }
  };

  const startCamera = async () => {
    try {
      // Check if permissions API is available and check current permission status
      if (navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: "camera" as PermissionName });
          if (permissionStatus.state === "denied") {
            alert("Camera permission is denied. Please enable camera access in your browser settings and reload the page.");
            return;
          }
        } catch (permError) {
          // Permissions API might not support camera query, continue anyway
          console.log("Permissions API query not supported, continuing...");
        }
      }

      // iOS Safari requires specific constraints for back camera
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" }, // Back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      // Try to get back camera first
      let stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Verify we got the back camera by checking track settings
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log("[Camera] Camera settings:", settings);
      console.log("[Camera] Facing mode:", settings.facingMode);
      
      // If we got front camera, try to get back camera explicitly
      if (settings.facingMode === "user") {
        console.log("[Camera] Got front camera, trying to get back camera...");
        // Stop the front camera stream
        stream.getTracks().forEach(track => track.stop());
        
        // Try with more explicit constraints
        const backCameraConstraints: MediaStreamConstraints = {
          video: {
            facingMode: "environment"
          }
        };
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(backCameraConstraints);
          const newSettings = stream.getVideoTracks()[0].getSettings();
          console.log("[Camera] New camera facing mode:", newSettings.facingMode);
        } catch (backCameraError) {
          console.error("[Camera] Failed to get back camera:", backCameraError);
          // Continue with whatever camera we got
        }
      }
      
      console.log("[Camera] ✅ Stream obtained successfully");
      console.log("[Camera] Stream active:", stream.active);
      console.log("[Camera] Stream id:", stream.id);
      const videoTracks = stream.getVideoTracks();
      console.log("[Camera] Video tracks count:", videoTracks.length);
      if (videoTracks.length > 0) {
        const track = videoTracks[0];
        console.log("[Camera] Track settings:", track.getSettings());
        console.log("[Camera] Track constraints:", track.getConstraints());
        console.log("[Camera] Track readyState:", track.readyState);
      }
      
      streamRef.current = stream;
      
      // Show camera UI first
      setShowCamera(true);
      setShowScanOptions(false);
      setShowScanIntro(false);
      
      // IMMEDIATELY try to set video source (don't wait for useEffect)
      // This is critical for iOS Safari
      setTimeout(() => {
        if (videoRef.current && stream) {
          const video = videoRef.current;
          console.log("[Camera] Setting video srcObject immediately after UI shows");
          video.srcObject = stream;
          
          // Force iOS to recognize the video
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.muted = true;
          
          // Try to play immediately
          video.play()
            .then(() => {
              console.log("[Camera] ✅ Video playing immediately after setting srcObject");
            })
            .catch((err) => {
              console.error("[Camera] Error playing immediately:", err);
            });
        }
      }, 100);
      
      console.log("[Camera] Camera UI shown, waiting for video element to render...");
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        alert("Camera permission was denied. Please allow camera access in your browser settings and try again. On mobile, you may need to enable camera permissions in your device settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        alert("No camera found. Please connect a camera device.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        alert("Camera is already in use by another application. Please close other apps using the camera.");
      } else if (err.name === "OverconstrainedError") {
        alert("Camera doesn't support the requested settings. Trying with default settings...");
        // Retry with simpler constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          streamRef.current = stream;
          setShowCamera(true);
          setShowScanOptions(false);
          setShowScanIntro(false);
          setTimeout(() => {
            if (videoRef.current && stream) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch((err) => {
                console.error("Error playing video:", err);
              });
            }
          }, 100);
        } catch (retryErr: any) {
          alert("Unable to access camera. Please check your browser settings and try again.");
        }
      } else {
        alert("Unable to access camera. Please check your browser settings and try again.");
      }
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
      const video = videoRef.current;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      // Validate video dimensions
      if (!videoWidth || !videoHeight || videoWidth === 0 || videoHeight === 0) {
        console.error("Invalid video dimensions:", videoWidth, videoHeight);
        alert("Camera is not ready. Please wait a moment and try again.");
        return;
      }
      
      const canvas = document.createElement("canvas");
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        console.error("Failed to get canvas context");
        alert("Failed to capture photo. Please try again.");
        return;
      }
      
      try {
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        const imageData = canvas.toDataURL("image/jpeg", 0.9);
        
        // Validate the data URL
        if (!imageData || !imageData.startsWith("data:image/")) {
          console.error("Invalid image data URL generated");
          alert("Failed to capture photo. Please try again.");
          return;
        }
        
        console.log("Photo captured successfully, size:", imageData.length, "bytes");
        setCapturedImage(imageData);
        stopCamera();
        analyzeFood(imageData);
      } catch (error) {
        console.error("Error capturing photo:", error);
        alert("Failed to capture photo. Please try again.");
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
    return new Promise((resolve, reject) => {
      // Validate input
      if (!dataUrl || !dataUrl.startsWith("data:image/")) {
        console.error("Invalid data URL format:", dataUrl?.substring(0, 50));
        reject(new Error("Invalid image data format"));
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        try {
          // Validate image dimensions
          if (img.width === 0 || img.height === 0) {
            console.error("Invalid image dimensions:", img.width, img.height);
            reject(new Error("Invalid image dimensions"));
            return;
          }
          
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          // Ensure minimum dimensions
          if (width < 1 || height < 1) {
            console.error("Compressed dimensions too small:", width, height);
            reject(new Error("Image too small to compress"));
            return;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          
          if (!ctx) {
            console.error("Failed to get canvas context for compression");
            reject(new Error("Failed to compress image"));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", quality);
          
          // Validate compressed output
          if (!compressed || !compressed.startsWith("data:image/jpeg")) {
            console.error("Compression produced invalid data URL");
            reject(new Error("Compression failed"));
            return;
          }
          
          console.log("Image compressed successfully, size:", compressed.length, "bytes");
          resolve(compressed);
        } catch (error) {
          console.error("Error during image compression:", error);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        console.error("Error loading image for compression:", error);
        reject(new Error("Failed to load image"));
      };
      
      img.src = dataUrl;
    });
  };

  const analyzeFood = async (imageData: string) => {
    setIsAnalyzing(true);
    setAiEstimate(null);
    try {
      // Validate input image data
      if (!imageData || !imageData.startsWith("data:image/")) {
        console.error("Invalid image data format in analyzeFood:", imageData?.substring(0, 50));
        alert("Invalid image format. Please try capturing the photo again.");
        setIsAnalyzing(false);
        return;
      }
      
      let compressedImage: string;
      try {
        compressedImage = await compressImage(imageData, 1024, 0.8);
        
        // Validate compressed image
        if (!compressedImage || !compressedImage.startsWith("data:image/jpeg")) {
          console.error("Compression failed, using original image");
          compressedImage = imageData;
        }
      } catch (compressError) {
        console.error("Image compression failed, using original:", compressError);
        // Fallback to original image if compression fails
        compressedImage = imageData;
      }
      
      // Final validation before sending
      if (!compressedImage || !compressedImage.startsWith("data:image/")) {
        console.error("Final validation failed - invalid image format");
        alert("Invalid image format. Please try capturing the photo again.");
        setIsAnalyzing(false);
        return;
      }
      
      console.log("Sending image to API, size:", compressedImage.length, "bytes");
      
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
        sugar: "",
        sodium: "",
        fiber: "",
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
          sugar: parseInt(newMeal.sugar) || 0,
          sodium: parseInt(newMeal.sodium) || 0,
          fiber: parseInt(newMeal.fiber) || 0,
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          imageUrl: capturedImage || undefined,
        },
      ]);
      setNewMeal({ name: "", calories: "", protein: "", carbs: "", fats: "", sugar: "", sodium: "", fiber: "" });
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
      // Build prompt with nutrition context
      const prompt = `You are a helpful nutrition coach. Answer the user's question about nutrition and fitness.

Current nutrition status:
- Calories: ${totals.calories} / ${dailyGoals.calories}
- Protein: ${totals.protein}g / ${dailyGoals.protein}g
- Carbs: ${totals.carbs}g / ${dailyGoals.carbs}g
- Fats: ${totals.fats}g / ${dailyGoals.fats}g

User question: ${aiConsultationMessage}

Provide a helpful, conversational response.`;

      // Use Railway backend if available, otherwise fallback to local API
      // Note: NEXT_PUBLIC_ env vars are embedded at build time, so redeploy after adding!
      let railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_API_URL || '';
      
      // Ensure Railway URL has https:// protocol
      if (railwayUrl && !railwayUrl.startsWith('http://') && !railwayUrl.startsWith('https://')) {
        railwayUrl = `https://${railwayUrl}`;
      }
      
      // Remove trailing slash to avoid double slashes
      railwayUrl = railwayUrl.replace(/\/+$/, '');
      
      const apiUrl = railwayUrl ? `${railwayUrl}/api/ai` : '/api/ai';
      
      // Debug logging
      console.log('[AI Debug] Railway URL from env:', railwayUrl || 'NOT SET - Need to redeploy Vercel!');
      console.log('[AI Debug] Using API URL:', apiUrl);
      console.log('[AI Debug] Request body:', { prompt: prompt.substring(0, 50) + '...' });
      
      let response;
      try {
        response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        
        console.log('[AI Debug] Response status:', response.status, response.statusText);
        console.log('[AI Debug] Response headers:', Object.fromEntries(response.headers.entries()));
      } catch (fetchError: any) {
        console.error('[AI Debug] Fetch error:', fetchError);
        throw new Error(`Network error: ${fetchError.message}. Check Railway URL: ${railwayUrl || 'NOT SET'}`);
      }

      if (!response.ok) {
        let errorData;
        try {
          const text = await response.text();
          console.error('[AI Debug] Error response text:', text);
          errorData = JSON.parse(text);
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.error('[AI Debug] Error details:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          apiUrl
        });
        
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to get AI response`);
      }

      let data;
      try {
        const text = await response.text();
        console.log('[AI Debug] Response text:', text.substring(0, 200));
        data = JSON.parse(text);
      } catch (e) {
        console.error('[AI Debug] Failed to parse response:', e);
        throw new Error('Invalid response from server');
      }
      
      console.log('[AI Debug] Parsed response data:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.response) {
        setAiConsultationResponse(data.response);
      } else {
        throw new Error("No response from AI");
      }
    } catch (error: any) {
      console.error("AI consultation failed", error);
      console.error("Error details:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      
      // More detailed error message with Railway URL info
      const railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_API_URL || '';
      let errorMsg = "Unable to get AI consultation. Please try again.";
      
      if (error?.message) {
        errorMsg = error.message;
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMsg = `Failed to connect to AI service. ${railwayUrl ? `Railway URL: ${railwayUrl}` : 'Railway URL not set - check Vercel env vars and redeploy.'}`;
      }
      
      // Show detailed error in alert
      const fullError = `Error: ${errorMsg}\n\n` +
        `Railway URL: ${railwayUrl || 'NOT SET'}\n` +
        `API URL: ${railwayUrl ? `${railwayUrl}/api/ai` : '/api/ai'}\n\n` +
        `Check:\n` +
        `1. Railway is online\n` +
        `2. Vercel env var NEXT_PUBLIC_RAILWAY_API_URL is set\n` +
        `3. Vercel has been redeployed after adding env var`;
      
      alert(fullError);
    } finally {
      setIsConsultingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0f1a] to-black text-white px-4 pt-4 pb-28">
      {/* HEADER */}
      <div className="mb-5 flex items-start justify-end">
            <div className="flex items-center gap-2">
              <button
            onClick={() => setShowAIConsultation(true)}
            className="px-3 py-1.5 bg-gradient-to-b from-[#0c1422] to-black border border-white/10 text-white rounded-xl text-xs font-medium hover:bg-[rgba(20,30,35,1)] transition-all transform hover:scale-105 flex items-center gap-1.5 shadow-lg"
              >
            <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
            AI Coach
              </button>
              <button
            onClick={() => setShowAddMeal(true)}
            className="px-4 py-2 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black rounded-xl text-xs font-bold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30 flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
            Add/Scan
              </button>
            </div>
      </div>

      {/* CALORIES CIRCLE + MACROS - No box, on hard background */}
      <div className="mb-5 flex items-center gap-6">
        {/* Left Macros - 3 macros */}
        <div className="flex-1 space-y-3">
          {[
            { label: "Protein", value: totals.protein, target: dailyGoals.protein, percent: proteinPercentage, color: "from-blue-400 to-cyan-500", unit: "g" },
            { label: "Carbs", value: totals.carbs, target: dailyGoals.carbs, percent: carbsPercentage, color: "from-purple-400 to-pink-500", unit: "g" },
            { label: "Fats", value: totals.fats, target: dailyGoals.fats, percent: fatsPercentage, color: "from-yellow-400 to-orange-500", unit: "g" },
          ].map((m) => (
            <div key={m.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-300">{m.label}</span>
                <span className="text-[9px] text-gray-400">{m.value}/{m.target}{m.unit}</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden shadow-inner">
                <div
                  className={`h-2.5 rounded-full bg-gradient-to-r ${m.color} transition-all duration-500 shadow-lg`}
                  style={{ width: `${m.percent}%` }}
            />
          </div>
            </div>
          ))}
        </div>

        {/* Calories Circle - Center - Much Bigger */}
        <div className="flex-shrink-0 relative flex flex-col items-center">
          <p className="text-[10px] font-semibold text-gray-300 mb-1.5">Calories</p>
          <div className="w-40 h-40 rounded-full border-4 border-teal-500/30 flex items-center justify-center bg-gradient-to-br from-teal-900/20 to-cyan-900/20 shadow-lg">
            <div className="w-36 h-36 rounded-full border-4 border-transparent flex items-center justify-center relative">
              <svg className="w-36 h-36 transform -rotate-90 absolute inset-0">
                <circle
                  cx="72"
                  cy="72"
                  r="66"
                  fill="none"
                  stroke="rgba(20, 241, 217, 0.2)"
                  strokeWidth="8"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="66"
                  fill="none"
                  stroke="url(#caloriesGradient)"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 66}
                  strokeDashoffset={2 * Math.PI * 66 - (2 * Math.PI * 66 * caloriesPercentage) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
                <defs>
                  <linearGradient id="caloriesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14f1d9" />
                    <stop offset="100%" stopColor="#0ddfc8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="text-center z-10">
                <p className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent leading-none">
                  {totals.calories.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">/{dailyGoals.calories.toLocaleString()}</p>
                <p className="text-sm font-bold text-teal-400 mt-1.5">{caloriesPercentage}%</p>
                </div>
              </div>
            </div>
          </div>

        {/* Right Macros - 3 macros */}
        <div className="flex-1 space-y-3">
          {[
            { label: "Sugar", value: totals.sugar, target: dailyGoals.sugar, percent: sugarPercentage, color: "from-pink-400 to-rose-500", unit: "g" },
            { label: "Sodium", value: totals.sodium, target: dailyGoals.sodium, percent: sodiumPercentage, color: "from-indigo-400 to-purple-500", unit: "mg" },
            { label: "Fiber", value: totals.fiber, target: dailyGoals.fiber, percent: fiberPercentage, color: "from-green-400 to-emerald-500", unit: "g" },
          ].map((m) => (
            <div key={m.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-300">{m.label}</span>
                <span className="text-[9px] text-gray-400">{m.value}/{m.target}{m.unit}</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden shadow-inner">
                <div
                  className={`h-2.5 rounded-full bg-gradient-to-r ${m.color} transition-all duration-500 shadow-lg`}
                  style={{ width: `${m.percent}%` }}
                />
            </div>
          </div>
          ))}
        </div>
      </div>

      {/* Meal Analysis - Show when at least one target is hit */}
      {hasTargetHit && (mealAnalysis || isAnalyzingMeals) && (
        <div className="mb-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-2xl p-4 border-2 border-teal-500/30 shadow-lg shadow-teal-500/10">
          <h3 className="text-base font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent mb-3">
            📊 Daily Meal Analysis
          </h3>
          {isAnalyzingMeals ? (
            <div className="text-gray-400 text-sm">Analyzing your meals...</div>
          ) : mealAnalysis ? (
            <div className="text-gray-300 text-sm whitespace-pre-line leading-relaxed">
              {mealAnalysis}
            </div>
          ) : null}
        </div>
      )}

      {/* MEALS BOX - Fun design */}
      <div className="mb-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-2xl p-4 border-2 border-teal-500/30 shadow-lg shadow-teal-500/10 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">Today's Meals</h2>
              <button
              onClick={() => setShowMacroSettings(true)}
              className="text-[10px] text-teal-400 hover:text-teal-300 transition-colors font-medium"
              >
              Edit Goals
              </button>
            </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {meals.length > 0 ? (
              meals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex justify-between items-start bg-gradient-to-br from-[rgba(10,15,20,0.8)] to-[rgba(5,10,15,0.8)] rounded-xl p-3 border border-teal-500/20 hover:border-teal-400/40 transition-all hover:shadow-lg hover:shadow-teal-500/10"
                >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{meal.name}</p>
                    <span className="text-[10px] text-[#9aa7ad]">{meal.time}</span>
              </div>
                          <div className="flex items-center gap-2 text-[10px] text-[#9aa7ad] flex-wrap">
                            <span className="font-semibold text-white">{meal.calories} kcal</span>
                            <span>•</span>
                            <span>Protein: {meal.protein || 0}g</span>
                            <span>Carbs: {meal.carbs || 0}g</span>
                            <span>Fats: {meal.fats || 0}g</span>
                            {(meal.sugar || meal.sodium || meal.fiber) && (
                              <>
                                {meal.sugar > 0 && <span>Sugar: {meal.sugar}g</span>}
                                {meal.sodium > 0 && <span>Sodium: {meal.sodium}mg</span>}
                                {meal.fiber > 0 && <span>Fiber: {meal.fiber}g</span>}
                              </>
                            )}
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
            <div className="text-center py-6">
              <div className="text-4xl mb-2 animate-bounce">🍽️</div>
              <p className="text-sm text-gray-400">No meals logged today</p>
              <p className="text-xs text-gray-500 mt-1">Start tracking your nutrition!</p>
          </div>
        )}
                </div>
                      </div>
                      </div>

      {/* ADD MEAL MODAL */}
      {showAddMeal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-5 max-w-md w-full border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Add Meal</h2>
                    <button
                      onClick={() => {
                  setShowAddMeal(false);
                  setNewMeal({ name: "", calories: "", protein: "", carbs: "", fats: "", sugar: "", sodium: "", fiber: "" });
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
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Sugar (g)</label>
                    <input
                      type="number"
                      value={newMeal.sugar}
                      onChange={(e) => setNewMeal({ ...newMeal, sugar: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="5"
                    />
                </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Sodium (mg)</label>
                    <input
                      type="number"
                      value={newMeal.sodium}
                      onChange={(e) => setNewMeal({ ...newMeal, sodium: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="500"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Fiber (g)</label>
                    <input
                      type="number"
                      value={newMeal.fiber}
                      onChange={(e) => setNewMeal({ ...newMeal, fiber: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="5"
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
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-5 max-w-md w-full border border-white/10">
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
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-5 max-w-md w-full border border-white/10">
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
              
      {/* CAMERA VIEW - Full Screen Overlay */}
      {showCamera && (
        <div 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#000000',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              objectFit: 'cover',
              backgroundColor: '#000000',
              zIndex: 1,
              WebkitPlaysinline: true,
              playsInline: true
              // NO mirror transform - we want back camera as-is for iOS
            }}
            playsInline={true}
            webkit-playsinline="true"
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              console.log("[Camera] onLoadedMetadata - video dimensions:", video.videoWidth, "x", video.videoHeight);
              console.log("[Camera] onLoadedMetadata - readyState:", video.readyState);
              video.play().catch((err) => {
                console.error("[Camera] Error playing video after metadata:", err);
              });
            }}
            onLoadedData={(e) => {
              const video = e.currentTarget;
              console.log("[Camera] onLoadedData - readyState:", video.readyState);
            }}
            onCanPlay={(e) => {
              const video = e.currentTarget;
              console.log("[Camera] onCanPlay - readyState:", video.readyState);
              video.play().catch((err) => {
                console.error("[Camera] Error playing video on canPlay:", err);
              });
            }}
            onPlaying={(e) => {
              const video = e.currentTarget;
              console.log("[Camera] ✅ Video is now playing!");
              console.log("[Camera] Video dimensions:", video.videoWidth, "x", video.videoHeight);
            }}
            onError={(e) => {
              console.error("[Camera] ❌ Video element error:", e);
            }}
          />
          
          {/* Top Cancel Button */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              paddingTop: 'env(safe-area-inset-top, 20px)',
              paddingBottom: '20px',
              paddingLeft: '20px',
              paddingRight: '20px',
              zIndex: 100000,
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center'
            }}
          >
            <button
              onClick={stopCamera}
              style={{
                backgroundColor: 'rgba(220, 38, 38, 0.9)',
                color: 'white',
                padding: '14px 28px',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                border: 'none',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                cursor: 'pointer'
              }}
            >
              ✕ Cancel
            </button>
          </div>
          
          {/* Bottom Capture Button - CENTERED AND LARGE */}
          <div 
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingTop: '40px',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)',
              paddingLeft: '20px',
              paddingRight: '20px',
              zIndex: 100000,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)'
            }}
          >
            <button
              onClick={capturePhoto}
              style={{
                backgroundColor: '#14f1d9',
                color: '#000000',
                padding: '24px 48px',
                borderRadius: '50px',
                fontSize: '24px',
                fontWeight: 'bold',
                minWidth: '200px',
                border: '4px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 40px rgba(20, 241, 217, 0.4), 0 0 0 8px rgba(20, 241, 217, 0.1)',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              📷 CAPTURE
            </button>
          </div>
        </div>
      )}

      {/* AI ESTIMATE MODAL */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 border border-white/10">
            <p className="text-lg font-semibold mb-2">Analyzing food...</p>
            <p className="text-sm text-[#9aa7ad]">Please wait</p>
        </div>
          </div>
        )}

      {/* AI CONSULTATION MODAL */}
      {showAIConsultation && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-5 max-w-md w-full border border-white/10 max-h-[90vh] overflow-y-auto">
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
                  className="w-full py-2.5 bg-[#14f1d9] text-black rounded-lg text-sm font-medium hover:bg-[#0ddfc8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2"
                >
                  {isConsultingAI ? "Consulting AI..." : "Ask AI"}
                </button>
                <div className="text-xs text-gray-400 text-center mb-2">or</div>
                <button
                  onClick={handleManualMealAnalysis}
                  disabled={isAnalyzingMeals || meals.length === 0}
                  className="w-full py-2.5 bg-[rgba(10,15,20,0.6)] border border-teal-500/50 text-teal-400 rounded-lg text-sm font-medium hover:bg-[rgba(10,15,20,0.8)] hover:border-teal-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAnalyzingMeals ? "Analyzing Meals..." : "Analyze Today's Meals"}
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
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-5 max-w-md w-full border border-white/10 max-h-[90vh] overflow-y-auto">
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
              <div>
                <label className="block text-sm font-medium mb-1.5">Sugar (g)</label>
                <input
                  type="number"
                  value={macroSettings.sugar}
                  onChange={(e) => setMacroSettings({ ...macroSettings, sugar: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
            </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Sodium (mg)</label>
                <input
                  type="number"
                  value={macroSettings.sodium}
                  onChange={(e) => setMacroSettings({ ...macroSettings, sodium: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Fiber (g)</label>
                <input
                  type="number"
                  value={macroSettings.fiber}
                  onChange={(e) => setMacroSettings({ ...macroSettings, fiber: parseInt(e.target.value) || 0 })}
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

      {!showCamera && <BottomNav />}
    </div>
  );
}
